/* eslint-disable require-jsdoc */
const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const {MongoClient, ObjectId} = require("mongodb");

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
  memory: "512MiB",
  timeoutSeconds: 30,
});

const {
  MONGODB_URI = "mongodb+srv://Xavi:Xavi2712@moval.vfm7zzp.mongodb.net/",
  MONGODB_DB = "moval",
  HOURS_COLLECTION = "hourEntries",
  ALLOWED_ORIGINS = "*",
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

exports.healthCheck = onRequest(withCors(async (_req, res) => {
  res.json({status: "ok", timestamp: new Date().toISOString()});
}));

exports.createEntry = onRequest(withCors(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "METHOD_NOT_ALLOWED"});
    return;
  }

  const payload = normalizeBody(req.body);
  const {employeeId, note = "", startedAt} = payload;
  if (!employeeId) {
    res.status(400).json({error: "EMPLOYEE_REQUIRED"});
    return;
  }

  const startTime = startedAt ? new Date(startedAt) : new Date();
  if (isNaN(startTime.getTime())) {
    res.status(400).json({error: "INVALID_START"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(HOURS_COLLECTION);
  const doc = {
    employeeId,
    note,
    startedAt: startTime,
    endedAt: null,
    durationMinutes: null,
    status: "IN_PROGRESS",
    createdAt: new Date(),
    updatedAt: new Date(),
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
  const {entryId, endedAt} = payload;
  if (!entryId) {
    res.status(400).json({error: "ENTRY_ID_REQUIRED"});
    return;
  }

  const endTime = endedAt ? new Date(endedAt) : new Date();
  if (isNaN(endTime.getTime())) {
    res.status(400).json({error: "INVALID_END"});
    return;
  }

  const db = await getDb();
  const collection = db.collection(HOURS_COLLECTION);

  const existing = await collection.findOne({_id: new ObjectId(entryId)});
  if (!existing) {
    res.status(404).json({error: "ENTRY_NOT_FOUND"});
    return;
  }

  const durationMinutes = Math.max(
      1,
      Math.ceil((endTime.getTime() - existing.startedAt.getTime()) / 60000),
  );

  const update = await collection.findOneAndUpdate(
      {_id: existing._id},
      {
        $set: {
          endedAt: endTime,
          durationMinutes,
          status: "COMPLETED",
          updatedAt: new Date(),
        },
      },
      {returnDocument: "after"},
  );

  res.json({
    id: update.value._id,
    ...update.value,
  });
}));

exports.listEntries = onRequest(withCors(async (req, res) => {
  const {employeeId, limit = "20"} = req.query;
  const numericLimit = Math.min(parseInt(limit, 10) || 20, 100);

  const db = await getDb();
  const collection = db.collection(HOURS_COLLECTION);
  const filter = employeeId ? {employeeId} : {};

  const records = await collection
      .find(filter)
      .sort({createdAt: -1})
      .limit(numericLimit)
      .toArray();

  res.json(records.map((record) => ({
    id: record._id,
    employeeId: record.employeeId,
    note: record.note,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    durationMinutes: record.durationMinutes,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  })));
}));
