import { createServer } from "node:http";

export const webAppManifest = {
  name: "web",
  responsibility: "Frontend for prompt entry, spec review, and deployment visibility.",
} as const;

const DEFAULT_PORT = 3000;
const DEFAULT_API_GATEWAY_URL = "http://127.0.0.1:4000";

function readPort(): number {
  const rawPort = process.env.PORT;

  if (!rawPort) {
    return DEFAULT_PORT;
  }

  const parsed = Number(rawPort);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function apiGatewayUrl(): string {
  return process.env.API_GATEWAY_URL ?? DEFAULT_API_GATEWAY_URL;
}

function escapeForScript(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("`", "\\`");
}

function renderHtml(): string {
  const apiUrl = escapeForScript(apiGatewayUrl());

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PromptOps Review</title>
    <style>
      :root {
        --ink: #18212b;
        --accent: #22344a;
        --border: #dde3ea;
        --surface: #f6f7f9;
        --panel: #ffffff;
        --panel-muted: #fafbfc;
        --muted: #6a7889;
        --success: #13714d;
        --danger: #a43737;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
        color: var(--ink);
        background: var(--surface);
      }

      .page {
        width: min(1080px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 20px 0 32px;
      }

      .topbar {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }

      .brand {
        margin: 0;
        font-size: 14px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .status {
        color: var(--muted);
        font-size: 12px;
        min-height: 18px;
      }

      .layout {
        display: grid;
        grid-template-columns: 300px minmax(0, 1fr);
        gap: 14px;
        align-items: start;
      }

      .panel {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 14px;
        box-shadow: 0 1px 1px rgba(16, 24, 40, 0.03);
      }

      .panel-inner {
        padding: 14px;
      }

      .section-title {
        margin: 0 0 8px;
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--muted);
      }

      .subtle {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.5;
      }

      textarea,
      input,
      button {
        font: inherit;
      }

      textarea {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--panel-muted);
        color: var(--ink);
        padding: 11px 12px;
        resize: vertical;
      }

      .prompt-input {
        min-height: 112px;
        margin: 8px 0 10px;
      }

      .spec-input {
        min-height: 300px;
        margin-top: 8px;
        font-family: "IBM Plex Mono", "SFMono-Regular", "Menlo", monospace;
        font-size: 13px;
        line-height: 1.6;
      }

      .artifact-input {
        min-height: 220px;
        margin-top: 8px;
        font-family: "IBM Plex Mono", "SFMono-Regular", "Menlo", monospace;
        font-size: 12px;
        line-height: 1.6;
      }

      .actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      button {
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 7px 11px;
        font-weight: 400;
        cursor: pointer;
        background: #fff;
        color: var(--ink);
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
      }

      .primary {
        background: var(--ink);
        border-color: var(--ink);
        color: #fff;
      }

      .secondary {
        background: transparent;
      }

      .danger {
        background: transparent;
        color: var(--danger);
      }

      .status.ok {
        color: var(--success);
      }

      .status.error {
        color: var(--danger);
      }

      .stack {
        display: grid;
        gap: 12px;
      }

      .run-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 14px;
        font-size: 12px;
        color: var(--muted);
      }

      .run-meta strong {
        color: var(--ink);
        font-weight: 500;
      }

      .detail-block {
        display: none;
        border-top: 1px solid var(--border);
        padding-top: 10px;
      }

      .detail-block.visible {
        display: block;
      }

      ul {
        margin: 0;
        padding-left: 18px;
      }

      li + li {
        margin-top: 6px;
      }

      .runs {
        display: grid;
        gap: 8px;
        margin-top: 8px;
      }

      .run-button {
        width: 100%;
        text-align: left;
        border-radius: 10px;
        padding: 10px;
      }

      .run-button strong {
        display: block;
        margin-bottom: 2px;
        font-weight: 500;
      }

      .run-prompt {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.4;
      }

      .empty {
        color: var(--muted);
        font-size: 14px;
      }

      .artifact-list {
        display: grid;
        gap: 8px;
      }

      .artifact-button {
        width: 100%;
        text-align: left;
        border-radius: 10px;
        padding: 8px 10px;
      }

      .artifact-path {
        font-family: "IBM Plex Mono", "SFMono-Regular", "Menlo", monospace;
        font-size: 12px;
      }

      .artifact-type {
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      @media (max-width: 900px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="topbar">
        <h1 class="brand">PromptOps</h1>
        <div id="statusMessage" class="status">Idle.</div>
      </header>

      <section class="layout">
        <aside class="panel">
          <div class="panel-inner">
            <h2 class="section-title">New Run</h2>
            <textarea id="promptInput" class="prompt-input">Deploy a scalable Node.js API with PostgreSQL, CI/CD, monitoring, logging, and cost estimation</textarea>
            <div class="actions">
              <button id="submitPromptButton" class="primary">Generate</button>
            </div>

            <h2 class="section-title" style="margin-top: 18px;">Runs</h2>
            <div id="savedRuns" class="runs"></div>
          </div>
        </aside>

        <section class="panel">
          <div class="panel-inner stack">
            <div>
              <h2 class="section-title">Selected Run</h2>
              <div id="runMeta" class="run-meta">
                <span>Status <strong id="runStatus">No run selected</strong></span>
                <span>ID <strong id="runId">-</strong></span>
                <span>Updated <strong id="runUpdatedAt">-</strong></span>
              </div>
            </div>

            <div id="notesBlock" class="detail-block">
              <h2 class="section-title">Notes</h2>
              <ul id="notesList" class="subtle"><li>No notes.</li></ul>
            </div>

            <div>
              <h2 class="section-title">Spec</h2>
              <textarea id="specEditor" class="spec-input" spellcheck="false">{}</textarea>
              <div class="actions" style="margin-top: 12px;">
                <button id="saveSpecButton" class="primary">Save</button>
                <button id="generateArtifactsButton" class="secondary">Artifacts</button>
                <button id="deleteRunButton" class="danger">Delete</button>
              </div>
            </div>

            <div>
              <h2 class="section-title">Artifacts</h2>
              <div id="artifactList" class="artifact-list"></div>
              <textarea id="artifactViewer" class="artifact-input" spellcheck="false" readonly>No artifacts generated yet.</textarea>
            </div>
          </div>
        </section>
      </section>
    </main>

    <script>
      const apiGatewayUrl = "${apiUrl}";
      const state = {
        currentRunId: null,
      };

      const promptInput = document.getElementById("promptInput");
      const specEditor = document.getElementById("specEditor");
      const statusMessage = document.getElementById("statusMessage");
      const savedRuns = document.getElementById("savedRuns");
      const notesBlock = document.getElementById("notesBlock");
      const notesList = document.getElementById("notesList");
      const runStatus = document.getElementById("runStatus");
      const runId = document.getElementById("runId");
      const runUpdatedAt = document.getElementById("runUpdatedAt");
      const artifactList = document.getElementById("artifactList");
      const artifactViewer = document.getElementById("artifactViewer");

      function clearRun() {
        state.currentRunId = null;
        runStatus.textContent = "No run selected";
        runId.textContent = "-";
        runUpdatedAt.textContent = "-";
        specEditor.value = "{}";
        renderNotes([], []);
        renderArtifacts(null);
      }

      function setStatus(message, tone = "neutral") {
        statusMessage.textContent = message;
        statusMessage.className = tone === "ok" ? "status ok" : tone === "error" ? "status error" : "status";
      }

      function renderList(target, items, emptyMessage) {
        target.innerHTML = "";

        if (!items.length) {
          const li = document.createElement("li");
          li.textContent = emptyMessage;
          target.appendChild(li);
          return;
        }

        for (const item of items) {
          const li = document.createElement("li");
          li.textContent = item;
          target.appendChild(li);
        }
      }

      function renderNotes(assumptions, warnings) {
        const notes = [
          ...warnings.map((item) => "Warning: " + item),
          ...assumptions.map((item) => "Assumption: " + item),
        ];

        if (!notes.length) {
          notesBlock.className = "detail-block";
          notesList.innerHTML = "";
          return;
        }

        notesBlock.className = "detail-block visible";
        renderList(notesList, notes, "No notes.");
      }

      function renderRun(run) {
        state.currentRunId = run.id;
        runStatus.textContent = run.status;
        runId.textContent = run.id;
        runUpdatedAt.textContent = new Date(run.updatedAt).toLocaleString();
        specEditor.value = JSON.stringify(run.spec, null, 2);
        renderNotes(run.assumptions, run.warnings);
      }

      function renderArtifacts(artifacts) {
        artifactList.innerHTML = "";

        if (!artifacts || !artifacts.files.length) {
          artifactList.innerHTML = '<div class="empty">No artifacts generated yet.</div>';
          artifactViewer.value = "No artifacts generated yet.";
          return;
        }

        artifactViewer.value = artifacts.files[0].content;

        for (const file of artifacts.files) {
          const button = document.createElement("button");
          button.className = "artifact-button";
          button.innerHTML =
            \`<div class="artifact-path">\${file.path}</div><div class="artifact-type">\${file.type}</div>\`;
          button.addEventListener("click", () => {
            artifactViewer.value = file.content;
          });
          artifactList.appendChild(button);
        }
      }

      function renderSavedRuns(runs) {
        savedRuns.innerHTML = "";

        if (!runs.length) {
          savedRuns.innerHTML = '<div class="empty">No saved runs yet.</div>';
          return;
        }

        for (const run of runs) {
          const button = document.createElement("button");
          button.className = "run-button";
          button.innerHTML = \`<strong>\${run.id}</strong><div class="run-prompt">\${run.sourcePrompt}</div>\`;
          button.addEventListener("click", async () => {
            await loadRun(run.id);
          });
          savedRuns.appendChild(button);
        }
      }

      async function fetchJson(url, options) {
        const response = await fetch(url, options);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Request failed.");
        }

        return payload;
      }

      async function refreshRuns() {
        const payload = await fetchJson(\`\${apiGatewayUrl}/api/prompt-runs\`);
        renderSavedRuns(payload.runs);
      }

      async function loadRun(id) {
        setStatus("Loading saved run...");
        const payload = await fetchJson(\`\${apiGatewayUrl}/api/prompt-runs/\${encodeURIComponent(id)}\`);
        renderRun(payload.run);
        await loadArtifacts(id);
        setStatus("Loaded saved run.", "ok");
      }

      async function submitPrompt() {
        setStatus("Generating deployment spec...");
        const payload = await fetchJson(\`\${apiGatewayUrl}/api/prompts/parse\`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: promptInput.value,
          }),
        });

        renderRun(payload.run);
        await refreshRuns();
        setStatus("Spec generated and saved.", "ok");
      }

      async function loadArtifacts(id, failSilently = true) {
        try {
          const payload = await fetchJson(\`\${apiGatewayUrl}/api/prompt-runs/\${encodeURIComponent(id)}/artifacts\`);
          renderArtifacts(payload.artifacts);
        } catch (error) {
          if (!failSilently) {
            throw error;
          }

          renderArtifacts(null);
        }
      }

      async function generateArtifacts() {
        if (!state.currentRunId) {
          setStatus("No run selected yet.");
          return;
        }

        setStatus("Generating artifacts...");
        const payload = await fetchJson(\`\${apiGatewayUrl}/api/prompt-runs/\${encodeURIComponent(state.currentRunId)}/artifacts\`, {
          method: "POST",
        });

        renderArtifacts(payload.artifacts);
        setStatus("Artifacts generated.", "ok");
      }

      async function saveSpec() {
        if (!state.currentRunId) {
          setStatus("Generate or load a run before saving spec changes.");
          return;
        }

        let parsedSpec;

        try {
          parsedSpec = JSON.parse(specEditor.value);
        } catch (error) {
          setStatus("Spec JSON is invalid. Fix the syntax before saving.");
          return;
        }

        setStatus("Saving edited spec...");
        const payload = await fetchJson(\`\${apiGatewayUrl}/api/prompt-runs/\${encodeURIComponent(state.currentRunId)}\`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            spec: parsedSpec,
          }),
        });

        renderRun(payload.run);
        await refreshRuns();
        setStatus("Spec changes saved.", "ok");
      }

      async function deleteRun() {
        if (!state.currentRunId) {
          setStatus("No run selected yet.");
          return;
        }

        setStatus("Deleting run...");
        await fetchJson(\`\${apiGatewayUrl}/api/prompt-runs/\${encodeURIComponent(state.currentRunId)}\`, {
          method: "DELETE",
        });

        clearRun();
        await refreshRuns();
        setStatus("Run deleted.", "ok");
      }

      document.getElementById("submitPromptButton").addEventListener("click", async () => {
        try {
          await submitPrompt();
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Failed to generate spec.", "error");
        }
      });

      document.getElementById("saveSpecButton").addEventListener("click", async () => {
        try {
          await saveSpec();
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Failed to save spec changes.", "error");
        }
      });

      document.getElementById("generateArtifactsButton").addEventListener("click", async () => {
        try {
          await generateArtifacts();
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Failed to generate artifacts.", "error");
        }
      });

      document.getElementById("deleteRunButton").addEventListener("click", async () => {
        try {
          await deleteRun();
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Failed to delete run.", "error");
        }
      });

      clearRun();
      refreshRuns().catch((error) => {
        setStatus(error instanceof Error ? error.message : "Failed to load saved runs.", "error");
      });
    </script>
  </body>
</html>`;
}

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, {
      "content-type": "application/json",
    });
    response.end(
      JSON.stringify({
        service: webAppManifest.name,
        status: "ok",
      }),
    );
    return;
  }

  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
    });
    response.end(renderHtml());
    return;
  }

  response.writeHead(404, {
    "content-type": "application/json",
  });
  response.end(
    JSON.stringify({
      error: "Route not found.",
    }),
  );
});

const port = readPort();

server.listen(port, () => {
  console.log(`[web] listening on port ${port}`);
});
