// db.js
const { MongoClient } = require("mongodb");

let client;
let db;

async function connectDb() {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  client = new MongoClient(uri);
  await client.connect();

  db = client.db(process.env.MONGODB_DB || "mello");

  // collections
  const rooms = db.collection("rooms");
  const participants = db.collection("participants");
  const submissions = db.collection("submissions");

  // indexes
  await rooms.createIndex({ code: 1 }, { unique: true });
  await participants.createIndex(
    { roomCode: 1, participantId: 1 },
    { unique: true },
  );
  await submissions.createIndex(
    { roomCode: 1, participantId: 1 },
    { unique: true },
  );

  return db;
}

function col(name) {
  if (!db) throw new Error("DB not connected. Call connectDb() first.");
  return db.collection(name);
}

async function getRoom(code) {
  return col("rooms").findOne({ code });
}

async function saveRoom(room) {
  // ensure plain object
  const doc = { ...room, createdAt: room.createdAt || new Date() };
  await col("rooms").insertOne(doc);
  return doc;
}

async function upsertParticipant(roomCode, participant) {
  const doc = {
    roomCode,
    participantId: participant.participantId,
    displayName: participant.displayName,
  };

  const result = await col("participants").findOneAndUpdate(
    { roomCode, participantId: doc.participantId },
    {
      $set: { displayName: doc.displayName },
      $setOnInsert: { joinedAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  return result.value;
}

async function upsertSubmission(roomCode, submission) {
  const doc = {
    roomCode,
    participantId: submission.participantId,
    displayName: submission.displayName,
    votes: submission.votes,
  };

  const result = await col("submissions").findOneAndUpdate(
    { roomCode, participantId: doc.participantId },
    { $set: { ...doc, updatedAt: new Date() } },
    { upsert: true, returnDocument: "after" },
  );

  return result.value;
}

async function getSubmission(roomCode, participantId) {
  return col("submissions").findOne({ roomCode, participantId });
}

async function listSubmissions(roomCode) {
  return col("submissions").find({ roomCode }).toArray();
}

module.exports = {
  connectDb,
  getRoom,
  saveRoom,
  upsertParticipant,
  upsertSubmission,
  getSubmission,
  listSubmissions,
};
