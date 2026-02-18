# Mello Room Voting — Live Version (MVP)

## Goal

A logged-in host creates a room.

Participants (guest or logged-in) join the room.

Each participant can submit and update their votes at any time during the show.

Everyone can view live aggregated totals and leaderboard-style results.

No locking. No reveal ceremony. Just live fun voting.

---

## Core Concept

- Votes are editable.
- Totals update continuously.
- One page for voting.
- One page for room totals.

---

## Identity Rules

### Host

- Must be logged in to create a room.
- Stored as `hostUserId`.

### Participants

- Can be:
  - Logged in → `participantId = "user:<authUserId>"`
  - Guest → `participantId = "guest:<guestId>"`
- `guestId` is generated once and stored in `localStorage`.

---

## Data Model (MongoDB)

### Room

- `code`: string (6 uppercase letters/digits, unique)
- `hostUserId`: string
- `createdAt`: Date

---

### Participant

- `roomCode`: string
- `participantId`: string
- `displayName`: string
- `joinedAt`: Date

---

### Submission

- `roomCode`: string
- `participantId`: string
- `displayName`: string
- `votes`: object
- `updatedAt`: Date

**Notes:**

- One submission per participant per room.
- Submissions are updated (upsert), not duplicated.

---

## Vote Format

`Submission.votes` is shaped like:

```json
{
  "bidrag-1": { "slay": 7, "utseende": 6, "lat": 8, "sangrost": 9 },
  "bidrag-2": { "slay": 5, "utseende": 7, "lat": 6, "sangrost": 6 }
}
Constraints
Each value is integer 1–10

Categories: slay, utseende, lat, sangrost

Bidrag keys are strings like "bidrag-1".."bidrag-5"

API (Express)
1. Create Room (HOST ONLY)
POST /api/rooms

Body

{
  "hostUserId": "string"
}
Response

{
  "code": "ABC123"
}
Rules

hostUserId required

Generate unique 6-character code

Create Room

2. Join Room (ANYONE)
POST /api/rooms/:code/join

Body

{
  "participantId": "string",
  "displayName": "string"
}
Response

{
  "ok": true
}
Rules

Room must exist

Upsert Participant

3. Save / Update My Votes (ANYONE)
PUT /api/rooms/:code/votes

Body

{
  "participantId": "string",
  "displayName": "string",
  "votes": {}
}
Response

{
  "ok": true
}
Rules

Room must exist

Validate vote format (1–10 integers)

Upsert Submission by (roomCode + participantId)

Update updatedAt

4. Get My Current Votes (Optional)
GET /api/rooms/:code/votes/:participantId

Response

{
  "votes": {}
}
Used to preload sliders with saved values.

5. Get Live Totals
GET /api/rooms/:code/totals

Response

{
  "bidragResults": [
    {
      "bidragId": "bidrag-1",
      "averages": {
        "slay": 6.2,
        "utseende": 7.1,
        "lat": 8.0,
        "sangrost": 5.9
      },
      "totalAvg": 27.2,
      "votesCount": 14
    }
  ]
}
Rules

Aggregate all Submissions in the room

Compute average per category per bidrag

totalAvg = sum of category averages

votesCount = number of submissions

Frontend Pages (MVP)
Home
Input: displayName

Buttons:

Create room (requires hostUserId locally)

Join room (enter code)

My Vote Page
Slider UI

Save button OR autosave (recommended)

Load existing votes on page load

Show small "Saved ✅" indicator

Room Totals Page
Fetch /totals

Poll every 2–5 seconds

Show:

Leaderboard sorted by totalAvg

Category averages

Number of voters

Optional fun extras

Highlight highest category score

Show recently updated participants

Non-Goals (MVP)
No WebSockets

No lock/reveal ceremony

No production-grade authentication

No advanced room management

Architecture Philosophy
Simple

Live and editable

Fun and social

Minimal ceremony


---

Now it’s fully valid Markdown from top to bottom.

No half formatting.

No weird sections.

Clean for GitHub preview and clean for AI ingestion.

---

If you want next:
I can give you the **exact 5-step implementation order** so your backend doesn’t become spaghe
```
