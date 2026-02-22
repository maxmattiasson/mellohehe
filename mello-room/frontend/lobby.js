(() => {
  const {
    buildDefaultEntries,
    escapeHtml,
    getCategories,
    getPageSession,
    normalizeBidragCount,
    normalizeEntries,
    setStatus,
  } = window.melloCommon;

  function hasSavedVote(voteRow, categories) {
    return categories.some(({ key }) => Number.isInteger(voteRow?.[key]));
  }

  function renderParticipantVotes(container, votes, entries, bidragCount) {
    const categories = getCategories();
    const count = normalizeBidragCount(bidragCount, entries.length || 6);
    const labels = normalizeEntries(entries, count);
    const bidragRows = [];

    for (let i = 1; i <= count; i += 1) {
      const bidragId = `bidrag-${i}`;
      const voteRow = votes?.[bidragId];
      if (!hasSavedVote(voteRow, categories)) continue;
      bidragRows.push({ bidragId, voteRow });
    }

    if (!bidragRows.length) {
      container.innerHTML = '<p class="muted">No saved votes yet.</p>';
      return;
    }

    const headerCells = categories
      .map(({ label }) => `<th>${escapeHtml(label)}</th>`)
      .join("");

    const bodyRows = bidragRows
      .map(({ bidragId, voteRow }) => {
        const bidragNumber = Number(bidragId.split("-")[1]);
        const bidragLabel =
          labels[bidragNumber - 1] || `Bidrag ${bidragNumber}`;
        const categoryCells = categories
          .map(({ key }) => {
            const value = Number(voteRow?.[key]);
            return `<td>${Number.isInteger(value) ? value : "-"}</td>`;
          })
          .join("");
        const total = categories.reduce((sum, { key }) => {
          const value = Number(voteRow?.[key]);
          return Number.isInteger(value) ? sum + value : sum;
        }, 0);

        return `<tr>
          <th>${escapeHtml(bidragLabel)}</th>
          ${categoryCells}
          <td><strong>${total}</strong></td>
        </tr>`;
      })
      .join("");

    container.innerHTML = `<div class="table-wrap">
      <table class="votes-peek-table">
        <thead>
          <tr>
            <th>Bidrag</th>
            ${headerCells}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
  }

  function initLobbyPage() {
    const metaEl = document.querySelector("#lobbyMeta");
    const statusEl = document.querySelector("#lobbyStatus");
    const listEl = document.querySelector("#participantsList");
    const peekTitleEl = document.querySelector("#peekTitle");
    const peekContentEl = document.querySelector("#peekContent");
    const toVoteEl = document.querySelector("#lobbyToVote");
    const toResultsEl = document.querySelector("#lobbyToResults");

    const session = getPageSession();
    if (!session) {
      metaEl.textContent = "Missing room context. Go back to Home.";
      setStatus(statusEl, "No room selected.", true);
      peekContentEl.innerHTML =
        '<p class="status error">Open Lobby from a room link.</p>';
      return;
    }

    const { roomCode } = session;
    metaEl.textContent = `Room ${roomCode}. Klicka för att se varandras röster`;
    toVoteEl.href = `/vote?code=${encodeURIComponent(roomCode)}`;
    toResultsEl.href = `/results?code=${encodeURIComponent(roomCode)}`;

    const state = {
      roomCode,
      participants: [],
      selectedParticipantId: null,
      bidragCount: 6,
      entries: buildDefaultEntries(),
    };

    window.api
      .getRoom(roomCode)
      .then(({ bidragCount, entries }) => {
        state.bidragCount = normalizeBidragCount(bidragCount, 6);
        state.entries = normalizeEntries(entries, state.bidragCount);
      })
      .catch(() => {
        // Keep default labels if room metadata is unavailable.
      });

    function renderParticipants() {
      listEl.innerHTML = "";

      if (!state.participants.length) {
        listEl.innerHTML = '<li class="muted">No participants yet.</li>';
        return;
      }

      state.participants.forEach((participant) => {
        const item = document.createElement("li");

        const button = document.createElement("button");
        button.type = "button";
        button.className = "participant-btn";
        if (participant.participantId === state.selectedParticipantId) {
          button.classList.add("selected");
        }
        button.textContent = participant.displayName;
        button.addEventListener("click", () => {
          state.selectedParticipantId = participant.participantId;
          peekTitleEl.textContent = `${participant.displayName}`;
          renderParticipants();
          loadVotes(participant.participantId);
        });

        item.append(button);
        listEl.append(item);
      });
    }

    async function loadVotes(participantId) {
      try {
        const payload = await window.api.getVotes(roomCode, participantId);
        renderParticipantVotes(
          peekContentEl,
          payload.votes || {},
          state.entries,
          state.bidragCount,
        );
        setStatus(statusEl, "");
      } catch (error) {
        peekContentEl.innerHTML = `<p class="status error">${escapeHtml(error.message)}</p>`;
        setStatus(statusEl, "Failed to load votes.", true);
      }
    }

    async function loadParticipants() {
      try {
        const payload = await window.api.getParticipants(roomCode);
        state.participants = payload.participants || [];

        if (
          !state.selectedParticipantId ||
          !state.participants.some(
            (participant) =>
              participant.participantId === state.selectedParticipantId,
          )
        ) {
          state.selectedParticipantId =
            state.participants[0]?.participantId || null;
        }

        renderParticipants();

        const selected = state.participants.find(
          (participant) =>
            participant.participantId === state.selectedParticipantId,
        );

        if (!selected) {
          peekTitleEl.textContent = "Saved Votes";
          peekContentEl.innerHTML =
            '<p class="muted">Select a participant to inspect saved votes.</p>';
          setStatus(statusEl, "");
          return;
        }

        peekTitleEl.textContent = `${selected.displayName}`;
        await loadVotes(selected.participantId);
      } catch (error) {
        listEl.innerHTML = "";
        peekContentEl.innerHTML = "";
        setStatus(statusEl, error.message, true);
      }
    }

    loadParticipants();
    setInterval(loadParticipants, 3000);
  }

  initLobbyPage();
})();
