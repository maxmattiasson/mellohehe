class Room {
  constructor({ code, hostUserId, createdAt = new Date() }) {
    this.code = code;
    this.hostUserId = hostUserId;
    this.createdAt = createdAt;
  }
}

module.exports = Room;
