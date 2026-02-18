const API_BASE = '/api/rooms';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (_err) {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }

  return payload;
}

function createRoom(hostUserId) {
  return request('', {
    method: 'POST',
    body: JSON.stringify({ hostUserId }),
  });
}

function joinRoom(code, participantId, displayName) {
  return request(`/${encodeURIComponent(code)}/join`, {
    method: 'POST',
    body: JSON.stringify({ participantId, displayName }),
  });
}

function saveVotes(code, participantId, displayName, votes) {
  return request(`/${encodeURIComponent(code)}/votes`, {
    method: 'PUT',
    body: JSON.stringify({ participantId, displayName, votes }),
  });
}

function getVotes(code, participantId) {
  return request(`/${encodeURIComponent(code)}/votes/${encodeURIComponent(participantId)}`);
}

function getTotals(code) {
  return request(`/${encodeURIComponent(code)}/totals`);
}

window.api = {
  createRoom,
  joinRoom,
  saveVotes,
  getVotes,
  getTotals,
};
