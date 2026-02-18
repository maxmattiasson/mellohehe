(() => {
  const BIDRAG_COUNT = 5;
  const CATEGORIES = [
    { key: 'slay', label: 'Slay' },
    { key: 'utseende', label: 'Utseende' },
    { key: 'lat', label: 'Låt' },
    { key: 'sangrost', label: 'Sångröst' },
  ];
  const SCORE_MIN = 1;
  const SCORE_MAX = 10;

  const STORAGE_KEYS = {
    guestId: 'mello:guestId',
    identity: 'mello:identity',
    session: 'mello:session',
  };

  const page = document.body.dataset.page;

  if (page === 'home') initHomePage();
  if (page === 'vote') initVotePage();
  if (page === 'results') initResultsPage();

  function initHomePage() {
    const displayNameInput = document.querySelector('#displayName');
    const joinCodeInput = document.querySelector('#joinCode');
    const createBtn = document.querySelector('#createRoomBtn');
    const joinBtn = document.querySelector('#joinRoomBtn');
    const statusEl = document.querySelector('#homeStatus');

    const identity = loadIdentity();
    displayNameInput.value = identity.displayName || '';

    displayNameInput.addEventListener('input', () => {
      const next = { ...loadIdentity(), displayName: displayNameInput.value.trim() };
      saveIdentity(next);
    });

    createBtn.addEventListener('click', async () => {
      try {
        const current = loadIdentity();
        const displayName = current.displayName || displayNameInput.value.trim();
        const authUserId = current.authUserId;
        const hostUserId = getHostUserId();

        if (!displayName) throw new Error('Display name is required');
        if (!hostUserId) {
          throw new Error('Host user ID missing. Set localStorage key "mello:hostUserId".');
        }

        setStatus(statusEl, 'Creating room...');
        const { code } = await window.api.createRoom(hostUserId);

        const participantId = toParticipantId(authUserId);
        await window.api.joinRoom(code, participantId, displayName);

        saveIdentity({ displayName, authUserId, hostUserId });
        saveSession({ roomCode: code, participantId, displayName });

        location.href = `/vote?code=${encodeURIComponent(code)}`;
      } catch (error) {
        setStatus(statusEl, error.message, true);
      }
    });

    joinBtn.addEventListener('click', async () => {
      try {
        const current = loadIdentity();
        const displayName = current.displayName || displayNameInput.value.trim();
        const authUserId = current.authUserId;
        const code = joinCodeInput.value.trim().toUpperCase();

        if (!displayName) throw new Error('Display name is required');
        if (!code) throw new Error('Room code is required');

        const participantId = toParticipantId(authUserId);

        setStatus(statusEl, 'Joining room...');
        await window.api.joinRoom(code, participantId, displayName);

        saveIdentity({ ...current, displayName });
        saveSession({ roomCode: code, participantId, displayName });

        location.href = `/vote?code=${encodeURIComponent(code)}`;
      } catch (error) {
        setStatus(statusEl, error.message, true);
      }
    });
  }

  function initVotePage() {
    const gridEl = document.querySelector('#voteGrid');
    const saveBtn = document.querySelector('#saveVotesBtn');
    const statusEl = document.querySelector('#saveStatus');
    const metaEl = document.querySelector('#voteMeta');
    const resultsLink = document.querySelector('#resultsLink');

    const session = getPageSession();
    if (!session) {
      setStatus(statusEl, 'Missing room context. Go back to Home.', true);
      saveBtn.disabled = true;
      return;
    }

    const { roomCode, participantId, displayName } = session;
    metaEl.textContent = `${displayName} in room ${roomCode}`;
    resultsLink.href = `/results?code=${encodeURIComponent(roomCode)}`;

    const state = {
      roomCode,
      participantId,
      displayName,
      votes: buildDefaultVotes(),
      saveTimer: null,
      saveInFlight: false,
    };

    renderVoteGrid(gridEl, state.votes);

    window.api
      .getVotes(roomCode, participantId)
      .then(({ votes }) => {
        state.votes = mergeVotes(votes);
        renderVoteGrid(gridEl, state.votes);
      })
      .catch(() => {
        // Keep defaults if no prior submission exists.
      });

    gridEl.addEventListener('input', (event) => {
      if (!event.target.classList.contains('vote-slider')) return;

      const slider = event.target;
      const bidragId = slider.dataset.bidrag;
      const category = slider.dataset.category;
      const value = Number(slider.value);

      state.votes[bidragId][category] = value;
      updateSliderRow(slider, value);
      updateBidragTotal(gridEl, bidragId, state.votes[bidragId]);

      queueAutosave(state, statusEl);
    });

    saveBtn.addEventListener('click', async () => {
      try {
        await persistVotes(state, statusEl);
      } catch (_error) {
        // Error status handled in persistVotes.
      }
    });
  }

  function initResultsPage() {
    const listEl = document.querySelector('#resultsList');
    const metaEl = document.querySelector('#resultsMeta');
    const backLink = document.querySelector('#backToVote');

    const session = getPageSession();
    if (!session) {
      listEl.innerHTML = '<article class="card"><p class="status error">Missing room context. Go back to Home.</p></article>';
      return;
    }

    const { roomCode } = session;
    metaEl.textContent = `Live totals for room ${roomCode}. Refresh every 3s.`;
    backLink.href = `/vote?code=${encodeURIComponent(roomCode)}`;

    async function fetchAndRender() {
      try {
        const payload = await window.api.getTotals(roomCode);
        renderTotals(listEl, payload.bidragResults || []);
      } catch (error) {
        listEl.innerHTML = `<article class="card"><p class="status error">${escapeHtml(error.message)}</p></article>`;
      }
    }

    fetchAndRender();
    setInterval(fetchAndRender, 3000);
  }

  function renderVoteGrid(container, votes) {
    container.innerHTML = '';

    for (let i = 1; i <= BIDRAG_COUNT; i += 1) {
      const bidragId = `bidrag-${i}`;
      const card = document.createElement('article');
      card.className = 'card vote-card';
      card.dataset.bidrag = bidragId;

      const title = document.createElement('h2');
      title.textContent = `Bidrag ${i}`;
      card.append(title);

      const rows = document.createElement('div');
      rows.className = 'rows';

      CATEGORIES.forEach(({ key, label }, index) => {
        const sliderId = `${bidragId}-${index}`;
        const value = Number(votes[bidragId][key]);

        const row = document.createElement('label');
        row.className = 'slider-row';
        row.htmlFor = sliderId;

        const labelEl = document.createElement('span');
        labelEl.className = 'slider-label';
        labelEl.textContent = label;

        const slider = document.createElement('input');
        slider.className = 'vote-slider';
        slider.id = sliderId;
        slider.type = 'range';
        slider.min = String(SCORE_MIN);
        slider.max = String(SCORE_MAX);
        slider.value = String(value);
        slider.dataset.bidrag = bidragId;
        slider.dataset.category = key;
        setSliderProgress(slider, value);

        const valueEl = document.createElement('output');
        valueEl.className = 'value-chip';
        valueEl.textContent = String(value);

        row.append(labelEl, slider, valueEl);
        rows.append(row);
      });

      card.append(rows);

      const total = document.createElement('p');
      total.className = 'total';
      total.dataset.totalFor = bidragId;
      total.textContent = `Total: ${sumBidrag(votes[bidragId])}`;
      card.append(total);

      container.append(card);
    }
  }

  function renderTotals(container, bidragResults) {
    container.innerHTML = '';

    if (!bidragResults.length) {
      container.innerHTML = '<article class="card"><p class="muted">No submissions yet.</p></article>';
      return;
    }

    bidragResults.forEach((result, idx) => {
      const bestCategory = getBestCategory(result.averages);
      const categoryHtml = CATEGORIES.map(({ key, label }) => {
        return `<li><strong>${label}:</strong> ${toDisplayNumber(result.averages[key])}</li>`;
      }).join('');

      const medalClass = idx < 3 ? ` rank-${idx + 1}` : '';

      container.insertAdjacentHTML(
        'beforeend',
        `<article class="card result-card${medalClass}">
          <h2>${escapeHtml(result.bidragId.replace('bidrag-', 'Bidrag '))}</h2>
          <p><strong>Total Avg:</strong> ${toDisplayNumber(result.totalAvg)}</p>
          <p><strong>Votes Count:</strong> ${result.votesCount}</p>
          <p class="muted">Top category: ${escapeHtml(bestCategory.label)} (${toDisplayNumber(bestCategory.value)})</p>
          <ul class="category-list">${categoryHtml}</ul>
        </article>`,
      );
    });
  }

  function updateSliderRow(slider, value) {
    const row = slider.closest('.slider-row');
    const chip = row?.querySelector('.value-chip');
    if (chip) {
      chip.textContent = String(value);
      chip.classList.remove('pulse');
      void chip.offsetWidth;
      chip.classList.add('pulse');
    }

    setSliderProgress(slider, value);
  }

  function setSliderProgress(slider, value) {
    const percent = ((value - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100;
    slider.style.setProperty('--progress', `${percent}%`);
  }

  function updateBidragTotal(container, bidragId, bidragVotes) {
    const total = container.querySelector(`[data-total-for="${bidragId}"]`);
    if (!total) return;
    total.textContent = `Total: ${sumBidrag(bidragVotes)}`;
  }

  function queueAutosave(state, statusEl) {
    setStatus(statusEl, 'Saving...');
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => {
      persistVotes(state, statusEl).catch(() => {});
    }, 500);
  }

  async function persistVotes(state, statusEl) {
    if (state.saveInFlight) return;

    try {
      state.saveInFlight = true;
      await window.api.saveVotes(
        state.roomCode,
        state.participantId,
        state.displayName,
        state.votes,
      );
      setStatus(statusEl, `Saved at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      setStatus(statusEl, error.message, true);
      throw error;
    } finally {
      state.saveInFlight = false;
    }
  }

  function buildDefaultVotes() {
    const votes = {};

    for (let i = 1; i <= BIDRAG_COUNT; i += 1) {
      const bidragId = `bidrag-${i}`;
      votes[bidragId] = {};
      CATEGORIES.forEach(({ key }) => {
        votes[bidragId][key] = 5;
      });
    }

    return votes;
  }

  function mergeVotes(votes) {
    const merged = buildDefaultVotes();

    Object.keys(votes || {}).forEach((bidragId) => {
      if (!merged[bidragId]) return;

      CATEGORIES.forEach(({ key }) => {
        const value = Number(votes[bidragId]?.[key]);
        if (Number.isInteger(value) && value >= SCORE_MIN && value <= SCORE_MAX) {
          merged[bidragId][key] = value;
        }
      });
    });

    return merged;
  }

  function sumBidrag(bidragVotes) {
    return CATEGORIES.reduce((sum, { key }) => sum + Number(bidragVotes[key]), 0);
  }

  function getBestCategory(averages) {
    let best = { key: CATEGORIES[0].key, label: CATEGORIES[0].label, value: -1 };

    CATEGORIES.forEach((category) => {
      const value = Number(averages?.[category.key] || 0);
      if (value > best.value) {
        best = { ...category, value };
      }
    });

    return best;
  }

  function loadIdentity() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.identity);
      return raw ? JSON.parse(raw) : {};
    } catch (_error) {
      return {};
    }
  }

  function saveIdentity(identity) {
    localStorage.setItem(STORAGE_KEYS.identity, JSON.stringify(identity));
  }

  function saveSession(session) {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.session);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function getPageSession() {
    const params = new URLSearchParams(location.search);
    const roomCodeFromQuery = params.get('code')?.trim().toUpperCase();
    const stored = loadSession();

    if (roomCodeFromQuery && stored) {
      return { ...stored, roomCode: roomCodeFromQuery };
    }

    if (roomCodeFromQuery && !stored) {
      const identity = loadIdentity();
      if (!identity.displayName) return null;
      return {
        roomCode: roomCodeFromQuery,
        participantId: toParticipantId(identity.authUserId),
        displayName: identity.displayName,
      };
    }

    return stored;
  }

  function toParticipantId(authUserId) {
    const auth = String(authUserId || '').trim();
    if (auth) return `user:${auth}`;

    const guestId = getOrCreateGuestId();
    return `guest:${guestId}`;
  }

  function getOrCreateGuestId() {
    const existing = localStorage.getItem(STORAGE_KEYS.guestId);
    if (existing) return existing;

    const next =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    localStorage.setItem(STORAGE_KEYS.guestId, next);
    return next;
  }

  function getHostUserId() {
    const local = localStorage.getItem('mello:hostUserId');
    return String(local || '').trim();
  }

  function setStatus(el, message, isError = false) {
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('error', isError);
  }

  function toDisplayNumber(value) {
    return Number(value || 0).toFixed(1);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
})();
