(() => {
  const {
    buildDefaultEntries,
    buildDefaultVotes,
    getPageSession,
    mergeVotes,
    normalizeBidragCount,
    normalizeEntries,
    renderVoteGrid,
    setStatus,
    updateBidragTotal,
    updateSliderRow,
  } = window.melloCommon;

  function queueAutosave(state, statusEl) {
    setStatus(statusEl, "Saving...");
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

  function initVotePage() {
    const gridEl = document.querySelector("#voteGrid");
    const saveBtn = document.querySelector("#saveVotesBtn");
    const statusEl = document.querySelector("#saveStatus");
    const metaEl = document.querySelector("#voteMeta");
    const resultsLink = document.querySelector("#resultsLink");

    const session = getPageSession();
    if (!session) {
      setStatus(statusEl, "Missing room context. Go back to Home.", true);
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
      bidragCount: 6,
      entries: buildDefaultEntries(),
      votes: buildDefaultVotes(),
      saveTimer: null,
      saveInFlight: false,
    };

    renderVoteGrid(gridEl, state.votes, state.entries, state.bidragCount);

    Promise.allSettled([
      window.api.getRoom(roomCode),
      window.api.getVotes(roomCode, participantId),
    ]).then(([roomResult, votesResult]) => {
      if (roomResult.status === "fulfilled") {
        const room = roomResult.value || {};
        state.bidragCount = normalizeBidragCount(room.bidragCount, 6);
        state.entries = normalizeEntries(room.entries, state.bidragCount);
      }

      const incomingVotes =
        votesResult.status === "fulfilled" ? votesResult.value?.votes : {};
      state.votes = mergeVotes(incomingVotes, state.bidragCount);
      renderVoteGrid(gridEl, state.votes, state.entries, state.bidragCount);
    });

    gridEl.addEventListener("input", (event) => {
      if (!event.target.classList.contains("vote-slider")) return;

      const slider = event.target;
      const bidragId = slider.dataset.bidrag;
      const category = slider.dataset.category;
      const value = Number(slider.value);

      state.votes[bidragId][category] = value;
      updateSliderRow(slider, value);
      updateBidragTotal(gridEl, bidragId, state.votes[bidragId]);

      queueAutosave(state, statusEl);
    });

    saveBtn.addEventListener("click", async () => {
      try {
        await persistVotes(state, statusEl);
      } catch (_error) {
        // Error status handled in persistVotes.
      }
    });
  }

  initVotePage();
})();
