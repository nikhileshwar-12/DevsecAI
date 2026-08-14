# 🛡️ DevSecAI v2.0 – Autonomous Multi-Agent GitHub PR Reviewer & Security Auditing Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-devsecai--nikhil.onrender.com-brightgreen.svg?logo=render)](https://devsecai-nikhil.onrender.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg?logo=node.js)](https://nodejs.org/)
[![Vitest](https://img.shields.io/badge/Vitest-2.x-yellow.svg?logo=vitest)](https://vitest.dev/)
[![Hono](https://img.shields.io/badge/Hono-Fast_Web_Framework-e36002.svg?logo=hono)](https://hono.dev/)
[![SARIF v2.1.0](https://img.shields.io/badge/SARIF-OASIS_Standard-purple.svg)](https://sarifweb.azurewebsites.net/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

> An enterprise-grade, distributed AI agent platform in **TypeScript** that intercepts GitHub Pull Requests, performs AST-level code diff chunking, detects OWASP Top 10 security vulnerabilities and N+1 performance bottlenecks, autonomously synthesizes regression unit test suites, auto-generates 1-click git remediation patches, exports OASIS SARIF v2.1.0 reports, and benchmarks multi-model LLM accuracy.

🌐 **Live Web Application:** [https://devsecai-nikhil.onrender.com](https://devsecai-nikhil.onrender.com)

---

## 🏗️ System Architecture

\\\	ext
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
        ┌────────────────────────┬──────────────┴──────────────┬────────────────────────┐
        ▼                        ▼                             ▼                        ▼
┌─────────────────┐    ┌─────────────────┐           ┌─────────────────┐      ┌─────────────────┐
│ 🔧 1-Click Auto-│    │ 💾 SARIF v2.1.0 │           │ 🕸️ Blast-Radius │      │ ⚡ Multi-Model  │
│  Remediation &  │    │  Code Scanning  │           │   Dependency    │      │   LLM Arena     │
│  Git Patch Gen  │    │ (GitHub Security│           │ Graph Visualizer│      │ Benchmark (4o/  │
│ (devsecai/fix-*)│    │  Tab Export)    │           │ (APIs & DBs)    │      │  Claude/DeepSeek│
└─────────────────┘    └─────────────────┘           └─────────────────┘      └─────────────────┘
\\\

---

## 🌟 5 Enterprise Upgrades (v2.0)

1. **Autonomous Auto-Remediation & 1-Click Patch Engine:**
   - Automatically rewrites vulnerable code blocks into secure AST replacements.
   - Generates standard Git \.patch\ files and simulated remediation branches (\devsecai/auto-fix-pr-*\) verified against synthesized Vitest test suites.

2. **OASIS Standard SARIF v2.1.0 Export:**
   - Outputs GitHub-compliant SARIF format for native integration into **GitHub Advanced Security -> Code Scanning Alerts** tab.

3. **Security Blast-Radius & Dependency Graph:**
   - Maps downstream vulnerability propagation to API endpoints, database entities, and authentication middleware with interactive SVG visualizers.

4. **Team Policy Studio & Dynamic Ruleset Engine:**
   - Allows engineering leads to create and toggle custom architectural/security rules (e.g. *"Mandatory Zod validation"*, *"Strict JWT 15m expiry"*) enforced dynamically in agent prompts.

5. **Multi-Model LLM Arena (GPT-4o vs Claude 3.5 vs DeepSeek):**
   - Side-by-side comparative benchmarking measuring Detection Recall %, Latency (ms), Token Usage, and Cost ($/review).

---

## 🚀 Quick Start

### 1. Install & Test
\\\ash
npm install
npm test
\\\

### 2. Run CLI Demo
\\\ash
npm run review:demo
\\\

### 3. Launch Interactive Enterprise Dashboard
\\\ash
npm start
\\\
Open **\http://localhost:3000\** in your browser to access all 5 interactive tabs!

---

## 📄 License
MIT License. Free for open-source and commercial use.