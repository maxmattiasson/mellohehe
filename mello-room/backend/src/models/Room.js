class Room {
  constructor({ code, createdAt = new Date() }) {
    this.code = code;
    this.createdAt = createdAt;
  }
}

module.exports = Room;
