(() => {
  const {
    loadIdentity,
    saveIdentity,
    saveSession,
    setStatus,
    toParticipantId,
  } = window.melloCommon;

  function initHomePage() {
    const displayNameInput = document.querySelector("#displayName");
    const joinCodeInput = document.querySelector("#joinCode");
    const createBtn = document.querySelector("#createRoomBtn");
    const joinBtn = document.querySelector("#joinRoomBtn");
    const statusEl = document.querySelector("#homeStatus");

    const identity = loadIdentity();
    displayNameInput.value = identity.displayName || "";

    displayNameInput.addEventListener("input", () => {
      const next = {
        ...loadIdentity(),
        displayName: displayNameInput.value.trim(),
      };
      saveIdentity(next);
    });

    createBtn.addEventListener("click", async () => {
      try {
        const current = loadIdentity();
        const displayName =
          current.displayName || displayNameInput.value.trim();
        const authUserId = current.authUserId;

        if (!displayName) throw new Error("Display name is required");

        setStatus(statusEl, "Creating room...");
        const { code } = await window.api.createRoom();

        const participantId = toParticipantId(authUserId);
        await window.api.joinRoom(code, participantId, displayName);

        saveIdentity({ displayName, authUserId });
        saveSession({ roomCode: code, participantId, displayName });

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
