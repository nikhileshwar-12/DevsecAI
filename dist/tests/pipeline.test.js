import { describe, it, expect } from 'vitest';
import { parseGitDiff, extractAddedCodeBlocks } from '../src/parser/diff-parser.js';
import { ArbiterAgent } from '../src/agents/arbiter-agent.js';
import { GitHubWebhookHandler } from '../src/github/webhook-handler.js';
import { ReviewPipelineOrchestrator } from '../src/orchestrator/pipeline.js';
describe('DevSecAI Core Unit & Integration Suite', () => {
    describe('Diff Parser', () => {
        it('should accurately parse multi-file git diff hunks and line counts', () => {
            const sampleDiff = `diff --git a/src/app.ts b/src/app.ts
index 1234567..89abcdef 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -10,4 +10,6 @@ export function start() {
   console.log('booting');
+  const x = 10;
+  const y = 20;
   return true;
 }`;
            const parsed = parseGitDiff(sampleDiff);
            expect(parsed.fileCount).toBe(1);
            expect(parsed.totalAdditions).toBe(2);
            expect(parsed.totalDeletions).toBe(0);
            expect(parsed.files[0].newPath).toBe('src/app.ts');
            const blocks = extractAddedCodeBlocks(parsed.files[0]);
            expect(blocks).toHaveLength(1);
            expect(blocks[0].code).toContain('const x = 10;');
            expect(blocks[0].startLine).toBe(11);
        });
    });
    describe('Arbiter Agent & Deduplication', () => {
        it('should deduplicate overlapping findings on the same line', () => {
            const findingA = {
                id: '1',
                file: 'src/routes/users.ts',
                line: 14,
                severity: 'critical',
                category: 'security',
                title: 'SQL Injection',
                description: 'Unescaped input',
                codeSnippet: 'query(...)',
                suggestedFix: 'fix(...)',
                confidence: 0.95,
                agentSource: 'security_agent',
            };
            const findingB = {
                id: '2',
                file: 'src/routes/users.ts',
                line: 14, // Same file & line
                severity: 'critical',
                category: 'security',
                title: 'Duplicate SQL Injection',
                description: 'Unescaped input duplicate',
                codeSnippet: 'query(...)',
                suggestedFix: 'fix(...)',
                confidence: 0.90,
                agentSource: 'security_agent',
            };
            const { result } = ArbiterAgent.synthesize('PR-1', 'test/repo', [findingA], [findingB], [], []);
            expect(result.findings).toHaveLength(1);
            expect(result.overallRiskScore).toBeGreaterThanOrEqual(35);
            expect(result.decision).toBe('REQUEST_CHANGES');
        });
        it('should approve clean diffs with zero risk score', () => {
            const { result } = ArbiterAgent.synthesize('PR-2', 'test/repo', [], [], [], []);
            expect(result.findings).toHaveLength(0);
            expect(result.overallRiskScore).toBe(0);
            expect(result.decision).toBe('APPROVED');
        });
    });
    describe('GitHub Webhook HMAC Signature Validation', () => {
        it('should reject invalid or missing signatures safely', () => {
            const isValid = GitHubWebhookHandler.verifySignature('{"test": true}', 'sha256=invalidhex');
            expect(isValid).toBe(false);
        });
    });
    describe('Autonomous Review Orchestrator End-to-End', () => {
        it('should run full multi-agent pipeline and flag SQL Injection diff', async () => {
            const vulnerableDiff = `diff --git a/src/routes/users.ts b/src/routes/users.ts
index 123..456 100644
--- a/src/routes/users.ts
+++ b/src/routes/users.ts
@@ -10,3 +10,5 @@ export async function search(db: any, query: string) {
+  const sql = \`SELECT * FROM users WHERE email LIKE '\${query}%'\`;
+  return await db.query(sql);
 }`;
            const result = await ReviewPipelineOrchestrator.execute(vulnerableDiff, {
                prId: 'PR-99',
                repoName: 'my-org/auth-service',
            });
            expect(result.findings.length).toBeGreaterThan(0);
            expect(result.decision).toBe('REQUEST_CHANGES');
            expect(result.overallRiskScore).toBeGreaterThan(0);
            expect(result.summary).toContain('DevSecAI Security & Architecture Audit Report');
        });
    });
});
