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
        padding: 32px 0 48px;
      }

      .hero {
        display: grid;
        gap: 8px;
        margin-bottom: 20px;
      }

      h1 {
        margin: 0;
        font-size: clamp(28px, 4vw, 40px);
        line-height: 1.08;
      }

      .lede {
        max-width: 70ch;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.6;
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
        padding: 18px;
      }

      .section-title {
        margin: 0 0 10px;
        font-size: 16px;
        font-weight: 600;
      }

      .subtle {
        color: var(--muted);
        font-size: 13px;
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
        min-height: 152px;
        margin: 12px 0 14px;
      }

      .spec-input {
        min-height: 460px;
        margin-top: 12px;
        font-family: "IBM Plex Mono", "SFMono-Regular", "Menlo", monospace;
        font-size: 13px;
        line-height: 1.6;
      }

      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      button {
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 10px 14px;
        font-weight: 600;
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
        gap: 16px;
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
        padding: 14px;
      }

      .meta-label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--muted);
        margin-bottom: 6px;
      }

      .meta-value {
        font-size: 14px;
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
        gap: 10px;
        margin-top: 12px;
      }

      .run-button {
        width: 100%;
        text-align: left;
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 12px 14px;
      }

      .run-button strong {
        display: block;
        margin-bottom: 4px;
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
        <div class="lede">
          Submit a deployment request, inspect the normalized spec, adjust it if needed, and save the result back through the gateway.
        </div>
      </section>

      <section class="layout">
        <aside class="panel">
          <div class="panel-inner">
            <h2 class="section-title">Prompt Input</h2>
            <div class="subtle">The gateway forwards this request to the generator service and stores the returned run locally.</div>
            <textarea id="promptInput" class="prompt-input">Deploy a scalable Node.js API with PostgreSQL, CI/CD, monitoring, logging, and cost estimation</textarea>
            <div class="actions">
              <button id="submitPromptButton" class="primary">Generate Spec</button>
              <button id="refreshRunsButton" class="secondary">Refresh Runs</button>
            </div>
            <div id="statusMessage" class="status">Idle.</div>

            <h2 class="section-title" style="margin-top: 26px;">Saved Runs</h2>
            <div class="subtle">Select a saved run to reload it into the review panel.</div>
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
              <h2 class="section-title">Editable Spec</h2>
              <div class="subtle">Edit the JSON directly, then save the updated spec back through the gateway.</div>
              <textarea id="specEditor" class="spec-input" spellcheck="false">{}</textarea>
              <div class="actions" style="margin-top: 12px;">
                <button id="saveSpecButton" class="primary">Save Spec Changes</button>
                <button id="reloadRunButton" class="secondary">Reload Current Run</button>
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
          button.innerHTML = \`<strong>\${run.id}</strong><div>\${run.sourcePrompt}</div>\`;
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

      document.getElementById("reloadRunButton").addEventListener("click", async () => {
        if (!state.currentRunId) {
          setStatus("No run selected yet.");
          return;
        }

        try {
          await loadRun(state.currentRunId);
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Failed to reload run.", "error");
        }
      });

      document.getElementById("refreshRunsButton").addEventListener("click", async () => {
        try {
          setStatus("Refreshing saved runs...");
          await refreshRuns();
          setStatus("Saved runs refreshed.", "ok");
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Failed to refresh runs.", "error");
        }
      });

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
