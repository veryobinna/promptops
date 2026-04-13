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
        --ink: #19212b;
        --accent: #1f5fbf;
        --border: #d6dde7;
        --surface: #f3f5f8;
        --panel: #ffffff;
        --panel-muted: #f8fafc;
        --muted: #617285;
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
        width: min(1120px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0 40px;
      }

      .hero {
        display: grid;
        gap: 4px;
        margin-bottom: 14px;
      }

      h1 {
        margin: 0;
        font-size: clamp(24px, 3vw, 32px);
        line-height: 1.12;
      }

      .lede {
        max-width: 52ch;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.5;
      }

      .layout {
        display: grid;
        grid-template-columns: 340px minmax(0, 1fr);
        gap: 16px;
        align-items: start;
      }

      .panel {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 18px;
        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
      }

      .panel-inner {
        padding: 16px;
      }

      .section-title {
        margin: 0 0 10px;
        font-size: 16px;
        font-weight: 600;
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
        border-radius: 12px;
        background: var(--panel-muted);
        color: var(--ink);
        padding: 12px 14px;
        resize: vertical;
      }

      .prompt-input {
        min-height: 128px;
        margin: 10px 0 12px;
      }

      .spec-input {
        min-height: 420px;
        margin-top: 10px;
        font-family: "IBM Plex Mono", "SFMono-Regular", "Menlo", monospace;
        font-size: 13px;
        line-height: 1.6;
      }

      .actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      button {
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 8px 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 120ms ease, border-color 120ms ease;
      }

      .primary {
        background: var(--accent);
        border-color: var(--accent);
        color: #fff;
      }

      .secondary {
        background: #fff;
        color: var(--ink);
      }

      .danger {
        background: #fff;
        color: var(--danger);
      }

      .status {
        margin-top: 12px;
        min-height: 24px;
        color: var(--muted);
        font-size: 14px;
      }

      .status.ok {
        color: var(--success);
      }

      .status.error {
        color: var(--danger);
      }

      .stack {
        display: grid;
        gap: 14px;
      }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .meta-card {
        border: 1px solid var(--border);
        border-radius: 14px;
        background: var(--panel-muted);
        padding: 12px;
      }

      .meta-label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--muted);
        margin-bottom: 6px;
      }

      .meta-value {
        font-size: 13px;
        line-height: 1.45;
        word-break: break-word;
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
        margin-top: 10px;
      }

      .run-button {
        width: 100%;
        text-align: left;
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 10px 12px;
      }

      .run-button strong {
        display: block;
        margin-bottom: 2px;
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

      @media (max-width: 900px) {
        .layout {
          grid-template-columns: 1fr;
        }

        .meta-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <h1>PromptOps review console</h1>
        <div class="lede">Submit a prompt, review the spec, keep or delete the run.</div>
      </section>

      <section class="layout">
        <aside class="panel">
          <div class="panel-inner">
            <h2 class="section-title">Prompt Input</h2>
            <textarea id="promptInput" class="prompt-input">Deploy a scalable Node.js API with PostgreSQL, CI/CD, monitoring, logging, and cost estimation</textarea>
            <div class="actions">
              <button id="submitPromptButton" class="primary">Generate Spec</button>
            </div>
            <div id="statusMessage" class="status">Idle.</div>

            <h2 class="section-title" style="margin-top: 22px;">Saved Runs</h2>
            <div id="savedRuns" class="runs"></div>
          </div>
        </aside>

        <section class="panel">
          <div class="panel-inner stack">
            <div>
              <h2 class="section-title">Run Summary</h2>
              <div id="runMeta" class="meta-grid">
                <div class="meta-card"><div class="meta-label">Status</div><div id="runStatus" class="meta-value">No run selected</div></div>
                <div class="meta-card"><div class="meta-label">Run ID</div><div id="runId" class="meta-value">-</div></div>
                <div class="meta-card"><div class="meta-label">Created</div><div id="runCreatedAt" class="meta-value">-</div></div>
                <div class="meta-card"><div class="meta-label">Updated</div><div id="runUpdatedAt" class="meta-value">-</div></div>
              </div>
            </div>

            <div>
              <h2 class="section-title">Assumptions</h2>
              <ul id="assumptionsList" class="subtle"><li>No run selected yet.</li></ul>
            </div>

            <div>
              <h2 class="section-title">Warnings</h2>
              <ul id="warningsList" class="subtle"><li>No warnings yet.</li></ul>
            </div>

            <div>
              <h2 class="section-title">Spec</h2>
              <textarea id="specEditor" class="spec-input" spellcheck="false">{}</textarea>
              <div class="actions" style="margin-top: 12px;">
                <button id="saveSpecButton" class="primary">Save</button>
                <button id="deleteRunButton" class="danger">Delete</button>
              </div>
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
      const assumptionsList = document.getElementById("assumptionsList");
      const warningsList = document.getElementById("warningsList");
      const runStatus = document.getElementById("runStatus");
      const runId = document.getElementById("runId");
      const runCreatedAt = document.getElementById("runCreatedAt");
      const runUpdatedAt = document.getElementById("runUpdatedAt");

      function clearRun() {
        state.currentRunId = null;
        runStatus.textContent = "No run selected";
        runId.textContent = "-";
        runCreatedAt.textContent = "-";
        runUpdatedAt.textContent = "-";
        specEditor.value = "{}";
        renderList(assumptionsList, [], "No run selected yet.");
        renderList(warningsList, [], "No warnings yet.");
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

      function renderRun(run) {
        state.currentRunId = run.id;
        runStatus.textContent = run.status;
        runId.textContent = run.id;
        runCreatedAt.textContent = new Date(run.createdAt).toLocaleString();
        runUpdatedAt.textContent = new Date(run.updatedAt).toLocaleString();
        specEditor.value = JSON.stringify(run.spec, null, 2);
        renderList(assumptionsList, run.assumptions, "No assumptions recorded.");
        renderList(warningsList, run.warnings, "No warnings recorded.");
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
