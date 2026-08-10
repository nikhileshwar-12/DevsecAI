import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { config } from './config/env.js';
import { ReviewPipelineOrchestrator } from './orchestrator/pipeline.js';
import { GitHubWebhookHandler } from './github/webhook-handler.js';
import { GitHubClient } from './github/octokit-client.js';
import { RepoMemoryStore } from './db/repo-memory.js';

const app = new Hono();

app.use('*', cors());

// Health Check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    llmProvider: config.DEFAULT_LLM_PROVIDER,
    model: config.AI_MODEL_NAME,
  });
});

// API Review Endpoint
app.post('/api/review', async (c) => {
  try {
    const body = await c.req.json();
    const { diff, repoName, prId, prTitle, prAuthor } = body;

    if (!diff) {
      return c.json({ error: 'Diff content is required' }, 400);
    }

    const guidelines = await RepoMemoryStore.getApplicableGuidelines(repoName);
    const result = await ReviewPipelineOrchestrator.execute(diff, {
      prId: prId || `PR-${Math.floor(1000 + Math.random() * 9000)}`,
      repoName: repoName || 'organization/repository',
      prTitle: prTitle || 'Pull Request Review',
      prAuthor: prAuthor || 'contributor',
      guidelines,
    });

    return c.json(result);
  } catch (error: any) {
    console.error('[API /api/review] Error:', error);
    return c.json({ error: error.message || 'Internal review pipeline failure' }, 500);
  }
});

// GitHub Webhook Ingestion Endpoint
app.post('/api/webhooks/github', async (c) => {
  const signature = c.req.header('x-hub-signature-256');
  const event = c.req.header('x-github-event') || 'unknown';
  const rawBody = await c.req.text();

  // 1. Cryptographic HMAC Signature Verification
  if (config.GITHUB_TOKEN && !GitHubWebhookHandler.verifySignature(rawBody, signature)) {
    return c.json({ error: 'Invalid HMAC signature' }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  if (!GitHubWebhookHandler.isReviewablePREvent(event, payload)) {
    return c.json({ message: `Ignored event: ${event}.${payload.action}` }, 200);
  }

  const pr = payload.pull_request;
  const repo = payload.repository;
  const owner = repo.owner.login;
  const repoName = repo.name;
  const pullNumber = pr.number;
  const commitSha = pr.head.sha;

  console.log(`[Webhook] Ingested review event for ${owner}/${repoName}#${pullNumber}`);

  // Fetch Diff asynchronously and process
  (async () => {
    try {
      const githubClient = new GitHubClient();
      const rawDiff = await githubClient.fetchPullRequestDiff(owner, repoName, pullNumber);
      const guidelines = await RepoMemoryStore.getApplicableGuidelines(repo.full_name);

      const reviewResult = await ReviewPipelineOrchestrator.execute(rawDiff, {
        prId: `PR-${pullNumber}`,
        repoName: repo.full_name,
        prTitle: pr.title,
        prAuthor: pr.user.login,
        guidelines,
      });

      // Post review back to GitHub
      await githubClient.submitPRReview(owner, repoName, pullNumber, commitSha, reviewResult);
    } catch (err: any) {
      console.error(`[Webhook] Async review error on PR #${pullNumber}:`, err.message);
    }
  })();

  return c.json({
    status: 'queued',
    message: `PR #${pullNumber} queued for multi-agent security audit`,
  });
});

// Interactive Web Dashboard
app.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DevSecAI – Autonomous Multi-Agent PR Reviewer</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f293d;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --accent: #8b5cf6;
      --danger: #ef4444;
      --danger-bg: rgba(239, 68, 68, 0.12);
      --warning: #f59e0b;
      --warning-bg: rgba(245, 158, 11, 0.12);
      --success: #10b981;
      --success-bg: rgba(16, 185, 129, 0.12);
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      padding-bottom: 60px;
    }

    .header {
      border-bottom: 1px solid var(--card-border);
      background: rgba(17, 24, 39, 0.85);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 50;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .brand h1 {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .brand-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badges {
      display: flex;
      gap: 8px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1px solid var(--card-border);
      background: #1e293b;
    }

    .container {
      max-width: 1300px;
      margin: 2rem auto;
      padding: 0 1.5rem;
      display: grid;
      grid-template-columns: 480px 1fr;
      gap: 1.5rem;
    }

    @media (max-width: 1024px) {
      .container { grid-template-columns: 1fr; }
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }

    .card-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sample-presets {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 0.75rem;
    }

    .preset-btn {
      background: #1e293b;
      color: #93c5fd;
      border: 1px solid #334155;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .preset-btn:hover {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
    }

    textarea {
      width: 100%;
      height: 320px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 8px;
      color: #c9d1d9;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      padding: 12px;
      resize: vertical;
      line-height: 1.4;
    }

    textarea:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
    }

    .btn-submit {
      width: 100%;
      margin-top: 0.75rem;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: opacity 0.2s, transform 0.1s;
    }

    .btn-submit:hover { opacity: 0.92; }
    .btn-submit:active { transform: scale(0.99); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Pipeline Visualizer */
    .agent-pipeline {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 1rem;
    }

    .agent-step {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
      position: relative;
    }

    .agent-step.active {
      border-color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
    }

    .agent-step.done {
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.08);
    }

    .agent-step-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: #e2e8f0;
    }

    .agent-step-status {
      font-size: 0.68rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Results section */
    .summary-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      padding: 1rem 1.25rem;
      border-radius: 8px;
      margin-bottom: 1.25rem;
      border-left: 4px solid var(--danger);
    }

    .summary-banner.approved {
      border-left-color: var(--success);
    }

    .score-badge {
      font-size: 1.5rem;
      font-weight: 800;
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .metrics-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 1.25rem;
    }

    .metric-box {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }

    .metric-val {
      font-size: 1.25rem;
      font-weight: 700;
      color: #60a5fa;
    }

    .metric-lbl {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .finding-card {
      background: #0f172a;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .finding-card.critical { border-left: 4px solid var(--danger); }
    .finding-card.high { border-left: 4px solid #f97316; }
    .finding-card.medium { border-left: 4px solid var(--warning); }
    .finding-card.low { border-left: 4px solid #3b82f6; }

    .finding-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .finding-tag {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .finding-tag.critical { background: var(--danger-bg); color: var(--danger); }
    .finding-tag.high { background: rgba(249, 115, 22, 0.15); color: #f97316; }
    .finding-tag.medium { background: var(--warning-bg); color: var(--warning); }

    .code-box {
      background: #050811;
      border: 1px solid #1f2937;
      border-radius: 6px;
      padding: 8px 12px;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      margin: 8px 0;
      overflow-x: auto;
      white-space: pre;
    }

    .code-box.fix {
      border-color: #065f46;
      background: #022c22;
      color: #6ee7b7;
    }

    .code-box.bad {
      border-color: #7f1d1d;
      background: #2b0c0c;
      color: #fca5a5;
    }

    pre { margin: 0; }
  </style>
</head>
<body>

  <header class="header">
    <div class="brand">
      <div class="logo-icon">🛡️</div>
      <div>
        <h1>DevSecAI</h1>
        <div class="brand-sub">Autonomous Multi-Agent PR Review & Security Engine</div>
      </div>
    </div>
    <div class="badges">
      <span class="badge" style="color: #60a5fa;">● LangGraph Multi-Agent</span>
      <span class="badge" style="color: #34d399;">● AST Tree-sitter</span>
      <span class="badge" style="color: #c084fc;">● Vitest Synthesizer</span>
    </div>
  </header>

  <div class="container">
    <!-- Left Column: Input Diff & Control -->
    <div>
      <div class="card">
        <div class="card-title">
          <span>Git Pull Request Diff</span>
          <span style="font-size: 0.75rem; color: var(--text-muted)">Unified diff format</span>
        </div>

        <div class="sample-presets">
          <button class="preset-btn" onclick="loadSample('sqli')">SQLi & Insecure Auth</button>
          <button class="preset-btn" onclick="loadSample('nplus1')">N+1 Query & Leaks</button>
          <button class="preset-btn" onclick="loadSample('clean')">Clean Diff (Pass)</button>
        </div>

        <textarea id="diffInput" placeholder="Paste git unified diff here..."></textarea>

        <button id="runBtn" class="btn-submit" onclick="executeReview()">
          <span>⚡ Run Autonomous Multi-Agent Audit</span>
        </button>

        <div class="agent-pipeline" id="pipelineSteps">
          <div class="agent-step" id="step-sec">
            <div class="agent-step-title">🛡️ Security Agent</div>
            <div class="agent-step-status" id="status-sec">Ready</div>
          </div>
          <div class="agent-step" id="step-perf">
            <div class="agent-step-title">⚡ Perf Agent</div>
            <div class="agent-step-status" id="status-perf">Ready</div>
          </div>
          <div class="agent-step" id="step-test">
            <div class="agent-step-title">🧪 Test Gen</div>
            <div class="agent-step-status" id="status-test">Ready</div>
          </div>
          <div class="agent-step" id="step-arb">
            <div class="agent-step-title">⚖️ Arbiter</div>
            <div class="agent-step-status" id="status-arb">Ready</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Column: Live Audit Dashboard -->
    <div>
      <div class="card" id="resultsContainer">
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🤖</div>
          <h3>Autonomous Agent Engine Ready</h3>
          <p style="font-size: 0.85rem; max-width: 400px; margin: 0.5rem auto;">
            Paste a PR diff on the left and click Audit to dispatch parallel AST and security agents.
          </p>
        </div>
      </div>
    </div>
  </div>

  <script>
    const samples = {
      sqli: \`diff --git a/src/routes/users.ts b/src/routes/users.ts
index 83a12b4..992f1c8 100644
--- a/src/routes/users.ts
+++ b/src/routes/users.ts
@@ -10,6 +10,14 @@ import { Database } from '../db/client.js';
 export async function searchUsers(db: Database, emailQuery: string) {
+  // Raw unparameterized SQL concatenation
+  const query = \\\`SELECT id, name, email, role FROM users WHERE email LIKE '\${emailQuery}%' AND is_active = true\\\`;
+  const result = await db.query(query);
+  return result.rows;
+}

diff --git a/src/config/auth.ts b/src/config/auth.ts
index 45ef201..89aa102 100644
--- a/src/config/auth.ts
+++ b/src/config/auth.ts
@@ -1,5 +1,8 @@
-export const JWT_SECRET = process.env.JWT_SECRET;
+export const JWT_SECRET = "super_secret_jwt_key_998124_do_not_share";
+export const TOKEN_EXPIRY = '24h';\`,

      nplus1: \`diff --git a/src/services/billing.ts b/src/services/billing.ts
index 72b381a..18ca9f2 100644
--- a/src/services/billing.ts
+++ b/src/services/billing.ts
@@ -25,12 +25,16 @@ export async function generateMonthlyInvoices(db: any, month: string) {
   const orders = await db.orders.findMany({ where: { billingMonth: month } });
   const invoices = [];
   
+  // N+1 Query in Loop
+  for (const order of orders) {
+    const customer = await db.customers.findUnique({ where: { id: order.customerId } });
+    const paymentMethod = await db.paymentMethods.findFirst({ where: { customerId: customer.id } });
+    invoices.push({ order, customer, paymentMethod });
+  }
+  
   return invoices;
 }\`,

      clean: \`diff --git a/src/utils/math.ts b/src/utils/math.ts
new file mode 100644
index 0000000..342a1bc
--- /dev/null
+++ b/src/utils/math.ts
@@ -0,0 +1,10 @@
+export function calculateDiscount(price: number, percent: number): number {
+  if (price < 0 || percent < 0 || percent > 100) {
+    throw new Error('Invalid price or discount percentage');
+  }
+  return Number((price * (1 - percent / 100)).toFixed(2));
+}\`
    };

    function loadSample(key) {
      document.getElementById('diffInput').value = samples[key] || '';
    }

    // Load default
    loadSample('sqli');

    async function executeReview() {
      const diff = document.getElementById('diffInput').value.trim();
      if (!diff) return alert('Please enter or select a diff');

      const btn = document.getElementById('runBtn');
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Agents Analyzing Code...</span>';

      // Animate pipeline
      setAgentStatus('sec', 'active', 'Scanning AST & CWEs...');
      setAgentStatus('perf', 'active', 'Analyzing Complexity...');
      setAgentStatus('test', '', 'Waiting...');
      setAgentStatus('arb', '', 'Waiting...');

      try {
        const res = await fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            diff,
            repoName: 'acme/core-service',
            prId: 'PR-801'
          })
        });

        const data = await res.json();

        setAgentStatus('sec', 'done', 'Done');
        setAgentStatus('perf', 'done', 'Done');
        setAgentStatus('test', 'done', 'Synthesized');
        setAgentStatus('arb', 'done', 'Synthesized');

        renderResults(data);
      } catch (err) {
        alert('Review failed: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>⚡ Run Autonomous Multi-Agent Audit</span>';
      }
    }

    function setAgentStatus(id, state, text) {
      const el = document.getElementById('step-' + id);
      const txt = document.getElementById('status-' + id);
      el.className = 'agent-step ' + state;
      txt.textContent = text;
    }

    function renderResults(data) {
      const container = document.getElementById('resultsContainer');
      const isApproved = data.decision === 'APPROVED';
      const riskClass = data.overallRiskScore >= 70 ? 'danger' : data.overallRiskScore >= 30 ? 'warning' : 'success';

      let html = \`
        <div class="summary-banner \${isApproved ? 'approved' : ''}">
          <div>
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);">Decision</div>
            <h2 style="color: \${isApproved ? 'var(--success)' : 'var(--danger)'}">\${data.decision}</h2>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.8rem; color: var(--text-muted);">Composite Risk Score</div>
            <div class="score-badge" style="color: var(--\${riskClass})">
              \${data.overallRiskScore} <span style="font-size: 0.85rem; color: var(--text-muted);">/100</span>
            </div>
          </div>
        </div>

        <div class="metrics-bar">
          <div class="metric-box">
            <div class="metric-val">\${data.findings.length}</div>
            <div class="metric-lbl">Total Issues</div>
          </div>
          <div class="metric-box">
            <div class="metric-val">\${data.metrics.criticalCount}</div>
            <div class="metric-lbl">Critical</div>
          </div>
          <div class="metric-box">
            <div class="metric-val">\${data.metrics.totalDurationMs}ms</div>
            <div class="metric-lbl">Latency</div>
          </div>
          <div class="metric-box">
            <div class="metric-val">$\${data.metrics.totalCostUsd.toFixed(5)}</div>
            <div class="metric-lbl">LLM Cost</div>
          </div>
        </div>
      \`;

      if (data.findings.length === 0) {
        html += \`
          <div style="background: var(--success-bg); border: 1px solid #065f46; border-radius: 8px; padding: 1.5rem; text-align: center;">
            <div style="font-size: 2rem;">✅</div>
            <h3 style="color: #6ee7b7; margin-top: 4px;">Diff Passed All Security & Performance Gates</h3>
            <p style="font-size: 0.85rem; color: #a7f3d0; margin-top: 4px;">Zero vulnerabilities or concurrency bottlenecks found in added hunks.</p>
          </div>
        \`;
      } else {
        html += \`<h3 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Flagged Code Issues (\${data.findings.length})</h3>\`;
        data.findings.forEach(f => {
          html += \`
            <div class="finding-card \${f.severity}">
              <div class="finding-header">
                <span class="finding-tag \${f.severity}">\${f.severity}</span>
                <span style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted);">\${f.file}:\${f.line}</span>
              </div>
              <h4 style="font-size: 0.95rem; font-weight: 600; margin-top: 4px;">\${f.title}</h4>
              \${f.cwe ? \`<div style="font-size: 0.75rem; color: #93c5fd; margin-top: 2px;">\${f.cwe}</div>\` : ''}
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 6px;">\${f.description}</p>
              
              \${f.codeSnippet ? \`<div class="code-box bad"><pre>\${escapeHtml(f.codeSnippet)}</pre></div>\` : ''}
              \${f.suggestedFix ? \`<div style="font-size: 0.75rem; font-weight: 600; color: #34d399; margin-top: 6px;">Suggested One-Click Fix:</div><div class="code-box fix"><pre>\${escapeHtml(f.suggestedFix)}</pre></div>\` : ''}
            </div>
          \`;
        });
      }

      if (data.unitTests && data.unitTests.length > 0) {
        html += \`<h3 style="font-size: 0.95rem; margin: 1.25rem 0 0.75rem;">Synthesized Vitest Regression Suites (\${data.unitTests.length})</h3>\`;
        data.unitTests.forEach(t => {
          html += \`
            <div class="finding-card" style="border-left: 4px solid var(--accent)">
              <div style="font-size: 0.8rem; font-weight: 600; color: #c084fc;">\${t.targetFile} &bull; \${t.targetFunction}()</div>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin: 4px 0 8px;">\${t.rationale}</p>
              <div class="code-box"><pre>\${escapeHtml(t.testCode)}</pre></div>
            </div>
          \`;
        });
      }

      container.innerHTML = html;
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  </script>
</body>
</html>`;

  return c.html(html);
});

const port = config.PORT;

console.log(`[DevSecAI] Starting HTTP Server on http://0.0.0.0:${port}`);
serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
});
