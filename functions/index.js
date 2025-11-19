/* eslint-disable require-jsdoc */
const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const {MongoClient, ObjectId} = require("mongodb");
const bcrypt = require("bcryptjs");

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
  memory: "512MiB",
  timeoutSeconds: 30,
});

const {
  MONGODB_URI = "mongodb+srv://Xavi:Xavi2712@moval.vfm7zzp.mongodb.net/",
  MONGODB_DB = "moval",
  RECORDS_COLLECTION = "registros",
  USERS_COLLECTION = "usuarios",
  ALLOWED_ORIGINS = "*",
  ADMIN_SETUP_TOKEN = "",
} = process.env;

let cachedClient;
let cachedDb;

async function getDb() {
  if (!MONGODB_URI) {
    throw new Error("Missing MongoDB connection string");
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
      retryReads: true,
      retryWrites: true,
    });
  }

  if (!cachedDb) {
    await cachedClient.connect();
    cachedDb = cachedClient.db(MONGODB_DB);
  }

  return cachedDb;
}

function withCors(handler) {
  return async (req, res) => {
    res.set("Access-Control-Allow-Origin", ALLOWED_ORIGINS);
    res.set("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      await handler(req, res);
    } catch (error) {
      logger.error("Unhandled error", {error: error.message});
      res.status(500).json({error: "INTERNAL", message: error.message});
    }
  };
}

function normalizeBody(body) {
  if (!body) return {};
  if (typeof body === "object") return body;
  try {
    return JSON.parse(body);
  } catch (error) {
    return {};
  }
}

function sanitizeUser(userDoc) {
  const username = userDoc.usuario || userDoc.username;
  const normalizedUsername =
    typeof username === "string" ? username.toLowerCase() : "";
  const derivedRole =
    userDoc.rol ||
    userDoc.role ||
    (normalizedUsername === "admin" ? "admin" : "user");

  return {
    id: userDoc._id,
    usuario: username,
    nombre: userDoc.nombre || userDoc.name || username,
    rol: derivedRole,
  };
}

exports.healthCheck = onRequest(withCors(async (_req, res) => {
  res.json({status: "ok", timestamp: new Date().toISOString()});
}));

exports.createEntry = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = (
    payload.employee_id ||
    payload.employeeId ||
    payload.usuario
  );
  const note = payload.notes || payload.note || "";
  if (!employeeId) {
    res.status(400).json({error: "EMPLOYEE_REQUIRED"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(RECORDS_COLLECTION);
  const now = new Date();
  const normalizedId = String(employeeId).trim();
  const doc = {
    employee_id: normalizedId,
    date: now.toISOString().slice(0, 10),
    check_in: now,
    check_out: null,
    worked_hours: null,
    status: "incompleto",
    notes: note,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  logger.info("Entry created", {employeeId, entryId: result.insertedId});

  res.status(201).json({
    id: result.insertedId,
    ...doc,
  });
}));

exports.completeEntry = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const employeeId = (
    payload.employee_id ||
    payload.employeeId ||
    payload.usuario
  );
  if (!employeeId) {
    res.status(400).json({error: "EMPLOYEE_REQUIRED"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(RECORDS_COLLECTION);

  const normalizedId = String(employeeId).trim();
  const existing = await collection.findOne(
      {
        $and: [
          {
            $or: [
              {employee_id: normalizedId},
              {employee_id: employeeId},
            ],
          },
          {
            $or: [
              {status: "incompleto"},
              {check_out: null},
              {check_out: {$exists: false}},
            ],
          },
        ],
      },
      {sort: {check_in: -1}},
  );
  if (!existing) {
    logger.warn("Entry not found for complete", {
      employeeId,
      normalizedId,
    });
    res.status(404).json({error: "ENTRY_NOT_FOUND"});
    return;
  }

  const endTime = new Date();
  const hours = Math.max(
      0,
      (endTime.getTime() - new Date(existing.check_in).getTime()) / 3_600_000,
  );
  const workedHours = Math.round(hours * 100) / 100;

  const update = await collection.findOneAndUpdate(
      {_id: new ObjectId(existing._id)},
      {
        $set: {
          check_out: endTime,
          worked_hours: workedHours,
          status: "completo",
          updatedAt: endTime,
        },
      },
      {returnDocument: "after"},
  );

  if (!update || !update.value) {
    logger.warn("Update returned no value, verifying manually", {
      entryId: existing._id,
    });
    const verified = await collection.findOne({
      _id: new ObjectId(existing._id),
    });
    if (!verified || !verified.check_out) {
      res.status(500).json({error: "UPDATE_FAILED"});
      return;
    }
    res.json({
      id: verified._id,
      employee_id: verified.employee_id,
      date: verified.date,
      check_in: verified.check_in,
      check_out: verified.check_out,
      worked_hours: verified.worked_hours,
      status: verified.status,
      notes: verified.notes,
    });
    return;
  }

  res.json({
    id: update.value._id,
    employee_id: update.value.employee_id,
    date: update.value.date,
    check_in: update.value.check_in,
    check_out: update.value.check_out,
    worked_hours: update.value.worked_hours,
    status: update.value.status,
    notes: update.value.notes,
  });
}));

exports.listEntries = onRequest(withCors(async (req, res) => {
  const {employeeId, limit = "20"} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 20, 100);

  const db = await getDb();
  const collection = db.collection(RECORDS_COLLECTION);
  const filter = employeeId ? {employee_id: employeeId} : {};

  const records = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  res.json(records.map((record) => ({
    id: record._id,
    employee_id: record.employee_id,
    date: record.date,
    check_in: record.check_in,
    check_out: record.check_out,
    worked_hours: record.worked_hours,
    status: record.status,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  })));
}));

exports.getStats = onRequest(withCors(async (_req, res) => {
  const db = await getDb();
  const recordsCollection = db.collection(RECORDS_COLLECTION);
  const usersCollection = db.collection(USERS_COLLECTION);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayFilter = {
    $or: [
      {date: today.toISOString().split("T")[0]},
      {check_in: {$gte: today, $lt: tomorrow}},
    ],
  };

  const [allUsers, todayRecords, pendingRecords] = await Promise.all([
    usersCollection.countDocuments({}),
    recordsCollection
        .find({...todayFilter, status: "completo"})
        .toArray(),
    recordsCollection.countDocuments({
      $or: [
        {check_out: null},
        {check_out: {$exists: false}},
      ],
    }),
  ]);

  const totalHoursToday = todayRecords.reduce(
      (sum, record) => sum + (record.worked_hours || 0),
      0,
  );

  res.json({
    activeEmployees: allUsers,
    hoursToday: Math.round(totalHoursToday * 100) / 100,
    pending: pendingRecords,
  });
}));

exports.login = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const username = payload.usuario || payload.username;
  const password = payload["contraseña"] || payload.password;
  if (!username || !password) {
    res.status(400).json({
      error: "MISSING_FIELDS",
      message: "Usuario y contraseña son requeridos",
    });
    return;
  }

  const db = await getDb();
  const collection = db.collection(USERS_COLLECTION);
  const userDoc = await collection.findOne({
    $or: [{usuario: username}, {username}],
  });

  if (!userDoc) {
    res.status(401).json({error: "INVALID_CREDENTIALS"});
    return;
  }

  let isValid = false;
  if (userDoc.passwordHash) {
    isValid = await bcrypt.compare(password, userDoc.passwordHash);
  } else if (typeof userDoc["contraseña"] === "string") {
    isValid = userDoc["contraseña"] === password;
  } else if (typeof userDoc.password === "string") {
    isValid = userDoc.password === password;
  }

  if (!isValid) {
    res.status(401).json({error: "INVALID_CREDENTIALS"});
    return;
  }

  res.json({user: sanitizeUser(userDoc)});
}));

exports.createUser = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  if (!ADMIN_SETUP_TOKEN) {
    res.status(500).json({
      error: "CONFIG",
      message: "ADMIN_SETUP_TOKEN no configurado",
    });
    return;
  }

  const token = req.get("x-setup-token");
  if (token !== ADMIN_SETUP_TOKEN) {
    res.status(403).json({error: "UNAUTHORIZED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const username = payload.usuario || payload.username;
  const password = payload["contraseña"] || payload.password;
  const nombre = payload.nombre || payload.name || "";
  const rol = payload.rol || payload.role || "user";

  if (!username || !password) {
    res.status(400).json({error: "MISSING_FIELDS"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(USERS_COLLECTION);
  const exists = await collection.findOne({
    $or: [{usuario: username}, {username}],
  });
  if (exists) {
    res.status(409).json({error: "USER_EXISTS"});
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await collection.insertOne({
    usuario: username,
    passwordHash,
    nombre,
    rol,
    createdAt: new Date(),
  });

  logger.info("User created", {username});
  res.status(201).json({
    user: sanitizeUser({
      _id: result.insertedId,
      usuario: username,
      nombre,
      rol,
    }),
  });
}));
