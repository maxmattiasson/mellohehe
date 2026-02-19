(() => {
  const DEFAULT_BIDRAG_COUNT = 6;
  const MAX_BIDRAG_COUNT = 12;

  const {
    buildDefaultEntries,
    loadIdentity,
    saveIdentity,
    saveSession,
    setStatus,
    toParticipantId,
  } = window.melloCommon;

  function initHomePage() {
    const displayNameInput = document.querySelector("#displayName");
    const joinCodeInput = document.querySelector("#joinCode");
    const createRoomModal = document.querySelector("#createRoomModal");
    const bidragCountSelect = document.querySelector("#bidragCountSelect");
    const entriesGrid = document.querySelector("#entriesGrid");
    const cancelCreateRoomBtn = document.querySelector("#cancelCreateRoomBtn");
    const confirmCreateRoomBtn = document.querySelector("#confirmCreateRoomBtn");
    const createBtn = document.querySelector("#createRoomBtn");
    const joinBtn = document.querySelector("#joinRoomBtn");
    const statusEl = document.querySelector("#homeStatus");

    const entryValues = buildDefaultEntries(MAX_BIDRAG_COUNT);

    const identity = loadIdentity();
    displayNameInput.value = identity.displayName || "";

    for (let count = DEFAULT_BIDRAG_COUNT; count <= MAX_BIDRAG_COUNT; count += 1) {
      const option = document.createElement("option");
      option.value = String(count);
      option.textContent = String(count);
      bidragCountSelect.append(option);
    }
    bidragCountSelect.value = String(DEFAULT_BIDRAG_COUNT);

    function renderEntryInputs() {
      const bidragCount = Number(bidragCountSelect.value) || DEFAULT_BIDRAG_COUNT;
      entriesGrid.innerHTML = "";

      for (let i = 0; i < bidragCount; i += 1) {
        const label = document.createElement("label");
        label.className = "field";

        const labelText = document.createElement("span");
        labelText.textContent = `Bidrag ${i + 1}`;

        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = 40;
        input.placeholder = `Bidrag ${i + 1}`;
        input.value = entryValues[i] || "";
        input.addEventListener("input", () => {
          entryValues[i] = input.value;
        });

        label.append(labelText, input);
        entriesGrid.append(label);
      }
    }

    function openCreateModal() {
      createRoomModal.classList.remove("hidden");
    }

    function closeCreateModal() {
      createRoomModal.classList.add("hidden");
    }

    bidragCountSelect.addEventListener("change", renderEntryInputs);
    renderEntryInputs();

    displayNameInput.addEventListener("input", () => {
      const next = {
        ...loadIdentity(),
        displayName: displayNameInput.value.trim(),
      };
      saveIdentity(next);
    });

    createBtn.addEventListener("click", () => {
      openCreateModal();
    });

    cancelCreateRoomBtn.addEventListener("click", () => {
      closeCreateModal();
    });

    createRoomModal.addEventListener("click", (event) => {
      if (event.target === createRoomModal) closeCreateModal();
    });

    confirmCreateRoomBtn.addEventListener("click", async () => {
      try {
        const current = loadIdentity();
        const displayName =
          current.displayName || displayNameInput.value.trim();
        const authUserId = current.authUserId;

        if (!displayName) throw new Error("Display name is required");

        setStatus(statusEl, "Creating room...");
        const bidragCount =
          Number(bidragCountSelect.value) || DEFAULT_BIDRAG_COUNT;
        const entries = entryValues.slice(0, bidragCount);
        const { code } = await window.api.createRoom(entries, bidragCount);

        const participantId = toParticipantId(authUserId);
        await window.api.joinRoom(code, participantId, displayName);

        saveIdentity({ displayName, authUserId });
        saveSession({ roomCode: code, participantId, displayName });
        closeCreateModal();

        location.href = `/vote?code=${encodeURIComponent(code)}`;
      } catch (error) {
        setStatus(statusEl, error.message, true);
      }
    });

    joinBtn.addEventListener("click", async () => {
      try {
        const current = loadIdentity();
        const displayName =
          current.displayName || displayNameInput.value.trim();
        const authUserId = current.authUserId;
        const code = joinCodeInput.value.trim().toUpperCase();

        if (!displayName) throw new Error("Display name is required");
        if (!code) throw new Error("Room code is required");

        const participantId = toParticipantId(authUserId);

        setStatus(statusEl, "Joining room...");
        await window.api.joinRoom(code, participantId, displayName);

        saveIdentity({ ...current, displayName });
        saveSession({ roomCode: code, participantId, displayName });

        location.href = `/vote?code=${encodeURIComponent(code)}`;
      } catch (error) {
        setStatus(statusEl, error.message, true);
      }
    });
  }

  initHomePage();
})();
