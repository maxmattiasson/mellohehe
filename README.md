# mellohehe# Mello Room Voting — Spec (MVP)

## Goal

A logged-in host can create a room.
Others can join the room as guest (no login required) or logged in.
Each participant submits one set of votes.
Host can lock voting and reveal results.
Results show aggregated scores per bidrag.

---

## Definitions

### Identity

- Host must be logged in (hostUserId exists).
- Joiners may be:
  - Logged in: participantId = "user:<authUserId>"
  - Guest: participantId = "guest:<guestId>" (guestId stored in localStorage)

### Room status

- "open": can submit/edit votes
- "locked": no more submissions/edits
- "revealed": results can be fetched

---

## Data Model (MongoDB)

### Room

- code: string (6 chars, uppercase letters+digits, unique)
- hostUserId: string
- status: "open" | "locked" | "revealed" (default "open")
- createdAt: Date

### Participant

- roomCode: string
- participantId: string (user:<id> or guest:<id>)
- displayName: string
- joinedAt: Date

### Submission

- roomCode: string
- participantId: string
- displayName: string
- votes: object (see format below)
- submittedAt: Date

---

## Vote format (Submission.votes)

votes is a JSON object shaped like:

{
"bidrag-1": { "slay": 7, "utseende": 6, "lat": 8, "sangrost": 9 },
"bidrag-2": { "slay": 5, "utseende": 7, "lat": 6, "sangrost": 6 }
}

Constraints:

- Each value is integer 1..10
- Categories: slay, utseende, lat, sangrost
- bidrag keys are strings like "bidrag-1".."bidrag-5" (or variable count later)

---

## API (Express)

### Create room (HOST ONLY)

POST /api/rooms
Body: { hostUserId: string }
Returns: { code: string, status: string }

Rules:

- hostUserId required
- generate unique 6-char code
- create Room + return it

### Join room (ANYONE)

POST /api/rooms/:code/join
Body: { participantId: string, displayName: string }
Returns: { ok: true }

Rules:

- room must exist
- upsert Participant (same participantId in same room updates displayName)

### Get room info (ANYONE)

GET /api/rooms/:code
Returns:
{
code,
status,
submittedCount,
participants: [{ participantId, displayName }]
}

Rules:

- submittedCount = number of Submissions in room

### Submit votes (ANYONE, only if open)

POST /api/rooms/:code/submit
Body: { participantId: string, displayName: string, votes: object }
Returns: { ok: true }

Rules:

- room must exist
- room.status must be "open"
- validate votes format + 1..10 ints
- upsert Submission by (roomCode + participantId)

### Lock room (HOST ONLY)

POST /api/rooms/:code/lock
Body: { hostUserId: string }
Returns: { status: "locked" }

Rules:

- room.hostUserId must match hostUserId

### Reveal results (HOST ONLY)

POST /api/rooms/:code/reveal
Body: { hostUserId: string }
Returns: { status: "revealed" }

Rules:

- room.hostUserId must match hostUserId

### Get results (ANYONE, only if revealed)

GET /api/rooms/:code/results
Returns:
{
bidragResults: [
{
bidragId: "bidrag-1",
averages: { slay: 6.2, utseende: 7.1, lat: 8.0, sangrost: 5.9 },
totalAvg: 27.2,
votesCount: 14
}
]
}

Rules:

- only allowed if room.status === "revealed"
- compute averages across all submissions per bidrag per category
- totalAvg = sum of category averages

---

## Non-goals (MVP)

- No websockets/realtime
- No proper auth system yet (hostUserId is trusted input for now)
- No fancy UI, only functional pages

---

## Frontend pages (MVP)

### Home

- Input: displayName
- Buttons:
  - Create room (requires hostUserId exists locally)
  - Join room (enter code)

### Lobby

- Shows room code + status + participant list + submittedCount
- Poll GET /api/rooms/:code every 3 seconds
- Buttons:
  - Go vote
  - Host: Lock, Reveal

### Vote

- Your existing slider UI
- Submit votes to /submit
- Show "Submitted ✅"

### Results

- Fetch /results and render list
