/* eslint-disable require-jsdoc */
// Módulo de conexión a MongoDB

const {MongoClient} = require("mongodb");
const {MONGODB_URI, MONGODB_DB} = require("./config");

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

module.exports = {getDb};

