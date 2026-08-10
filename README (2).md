# 🛡️ DevSecAI – Autonomous Multi-Agent GitHub PR Reviewer & Security Auditing Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg?logo=node.js)](https://nodejs.org/)
[![Vitest](https://img.shields.io/badge/Vitest-2.x-yellow.svg?logo=vitest)](https://vitest.dev/)
[![Hono](https://img.shields.io/badge/Hono-Fast_Web_Framework-e36002.svg?logo=hono)](https://hono.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

> An enterprise-grade, distributed AI agent platform in **TypeScript** that intercepts GitHub Pull Requests, performs AST-level code diff chunking, detects OWASP Top 10 security vulnerabilities and N+1 performance bottlenecks, autonomously synthesizes regression unit test suites, and posts line-mapped reviews back to GitHub.

---

## 🏗️ System Architecture

```text
                           ┌─────────────────────────────────────────┐
                           │      GitHub Webhook / Pull Request      │
                           └────────────────────┬────────────────────┘
                                                │ (HMAC SHA-256 Validated)
                                                ▼
                           ┌─────────────────────────────────────────┐
                           │      Fastify / Hono API Gateway         │
                           └────────────────────┬────────────────────┘
                                                │
                                                ▼
                           ┌─────────────────────────────────────────┐
                           │    AST Diff & Scope Boundary Chunker   │
                           │       (Tree-sitter / Hunk Parser)       │
                           └────────────────────┬────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
┌─────────────────────────────────┐                           ┌─────────────────────────────────┐
│        🛡️ Security Agent        │                           │       ⚡ Performance Agent       │
│  - OWASP Top 10 & CWE Detection │                           │  - N+1 Query Loop Detection     │
│  - SQLi / XSS / RCE Auditing    │                           │  - Unhandled Async Promises     │
│  - Hardcoded Secrets Scanning   │                           │  - Memory Leak Prevention       │
└────────────────┬────────────────┘                           └────────────────┬────────────────┘
                 │                                                             │
                 └──────────────────────────────┬──────────────────────────────┘
                                                │
                                                ▼
                           ┌─────────────────────────────────────────┐
                           │    🧪 Autonomous Test Generator Agent   │
                           │   (Synthesizes Vitest/Jest Test Suites) │
                           └────────────────────┬────────────────────┘
                                                │
                                                ▼
                           ┌─────────────────────────────────────────┐
                           │       ⚖️ Consensus Arbiter Agent         │
                           │  - Multi-agent Deduplication            │
                           │  - Composite Risk Scoring (0 - 100)     │
                           │  - Confidence Threshold Filtering       │
                           └────────────────────┬────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
┌─────────────────────────────────┐                           ┌─────────────────────────────────┐
│     Octokit GitHub API Engine   │                           │     Interactive Web Dashboard   │
│  - Inline Line-Mapped Comments  │                           │  - Live Agent Visualizer        │
│  - Top-Level Summary Markdown   │                           │  - Telemetry & Cost Breakdown   │
└─────────────────────────────────┘                           └─────────────────────────────────┘
```

---

## 🌟 Key Engineering Features

1. **Deterministic Multi-Agent Consensus Graph:**
   - **Security Agent:** Audits diff hunks for SQL injection (CWE-89), XSS (CWE-79), hardcoded tokens (CWE-798), and unsafe deserialization.
   - **Performance Agent:** Flags O(N) database query loops (N+1 queries), unbounded in-memory caches, and un-awaited async callbacks in `forEach`.
   - **Test Generator Agent:** Autonomously writes complete, executable Vitest test suites targeting identified exploit vectors and edge cases.
   - **Arbiter Agent:** Deduplicates findings across overlapping AST nodes, filters out low-confidence hallucinations (< 0.70 threshold), and computes a composite PR Risk Score (0–100).

2. **AST-Aware Code Diff Chunking:**
   - Parses unified git diffs (`git diff`) down to individual hunk headers and reconstructed new line numbers.
   - Enriches diff slices with enclosing function declarations, export signatures, and class boundaries to preserve semantic context for LLMs.

3. **Repository Memory & Knowledge Base (pgvector + HNSW):**
   - PostgreSQL schema with `pgvector` HNSW index for sub-millisecond retrieval of repository-specific architectural rules and coding standards.

4. **Cryptographic Security & Zero-Trust Webhooks:**
   - Validates `x-hub-signature-256` using HMAC SHA-256 with `crypto.timingSafeEqual` to prevent side-channel timing attacks.

5. **Telemetry & Observability:**
   - OpenTelemetry and Langfuse-compliant tracing tracking agent latency, token usage breakdown (prompt/completion), and per-review dollar cost estimation.

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/devsec-ai.git
cd devsec-ai
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
PORT=3000
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret
GITHUB_TOKEN=ghp_your_github_personal_access_token # Optional for live PR posting
OPENAI_API_KEY=sk-... # Optional (defaults to deterministic local engine)
AI_MODEL_NAME=gpt-4o-mini
```

### 3. Run the Standalone CLI Demo
Run a complete multi-agent review on the sample vulnerability diff:
```bash
npm run review:demo
```

### 4. Start the Web Dashboard & API Server
```bash
npm start
```
Open **`http://localhost:3000`** in your browser to access the interactive audit workbench and visualizer.

### 5. Run the Test Suite
```bash
npm test
```

---

## 📊 Live Review Example Output

```markdown
## 🛡️ DevSecAI Security & Architecture Audit Report

| Decision | PR Risk Score | Total Findings | Security | Concurrency/Perf |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 **STATUS: CHANGES REQUESTED** | 🟡 **Moderate Risk (65/100)** | **3 issues** | 1 flagged | 2 flagged |

### 🚨 Prioritized Audit Findings

#### 1. [🔴 CRITICAL] Unparameterized Raw SQL Query (SQL Injection)
- **Location:** `src/routes/users.ts:14`
- **Classification:** `CWE-89: Improper Neutralization of Special Elements used in an SQL Command`
- **Confidence:** `98%`
- **Impact:** User-controlled input is directly interpolated into a raw SQL query string without parameter placeholders ($1, ?).

**Suggested One-Click Resolution:**
\`\`\`typescript
const query = 'SELECT id, name, email, role FROM users WHERE email LIKE $1 AND is_active = true';
const result = await db.query(query, [`${emailQuery}%`]);
\`\`\`
```

---

## 🛠️ Tech Stack & Tooling

| Domain | Technologies |
| :--- | :--- |
| **Language & Runtime** | TypeScript 5.7, Node.js 20+ (ES Modules) |
| **Agent Orchestration** | LangGraph.js / Multi-Agent State Machine, Zod Schema Enforcement |
| **Web Server & APIs** | Hono, @hono/node-server, Octokit REST API |
| **Vector Store & Database** | PostgreSQL, pgvector (HNSW Indexing), Drizzle ORM |
| **Testing & Quality** | Vitest, TypeScript Compiler API, Tree-sitter AST |
| **Observability** | OpenTelemetry, Langfuse Tracing, Token Budget Cost Calculator |

---

## 📄 License
MIT License. Free for open-source and commercial use.
