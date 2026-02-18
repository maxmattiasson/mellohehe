class Room {
  constructor({ id, code, participants = [] }) {
    this.id = id;
    this.code = code;
    this.participants = participants;
  }
}

module.exports = Room;
