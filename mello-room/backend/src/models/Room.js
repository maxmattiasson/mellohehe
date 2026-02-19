class Room {
  constructor({ code, bidragCount, entries, createdAt = new Date() }) {
    this.code = code;
    this.bidragCount = bidragCount;
    this.entries = entries;
    this.createdAt = createdAt;
  }
}

module.exports = Room;
