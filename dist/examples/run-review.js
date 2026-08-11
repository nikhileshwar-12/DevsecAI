import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ReviewPipelineOrchestrator } from '../src/orchestrator/pipeline.js';
import { RepoMemoryStore } from '../src/db/repo-memory.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function runDemo() {
    console.log('\n===============================================================');
    console.log('🛡️   DevSecAI: Autonomous Multi-Agent PR Review Demo Runner');
    console.log('===============================================================\n');
    const diffPath = path.join(__dirname, 'sample-pr.diff');
    if (!fs.existsSync(diffPath)) {
        console.error(`Diff file not found at ${diffPath}`);
        process.exit(1);
    }
    const rawDiff = fs.readFileSync(diffPath, 'utf-8');
    console.log(`Loaded sample diff (${rawDiff.split('\n').length} lines).`);
    const guidelines = await RepoMemoryStore.getApplicableGuidelines();
    const startTime = Date.now();
    const result = await ReviewPipelineOrchestrator.execute(rawDiff, {
        prId: 'PR-402',
        repoName: 'acme-corp/fintech-payment-engine',
        prTitle: 'feat: add user search and monthly invoice batch processor',
        prAuthor: 'dev-contributor',
        guidelines,
    });
    const totalDuration = Date.now() - startTime;
    console.log('\n---------------------------------------------------------------');
    console.log('📊   REVIEW RESULTS SUMMARY');
    console.log('---------------------------------------------------------------');
    console.log(`Decision:          ${result.decision === 'REQUEST_CHANGES' ? '🔴 REQUEST CHANGES' : result.decision}`);
    console.log(`Risk Score:        ${result.overallRiskScore}/100`);
    console.log(`Total Findings:    ${result.findings.length}`);
    console.log(`Critical Issues:   ${result.metrics.criticalCount}`);
    console.log(`High Issues:       ${result.metrics.highCount}`);
    console.log(`Execution Time:    ${totalDuration}ms`);
    console.log(`Estimated Tokens:  ${result.metrics.totalTokens}`);
    console.log(`Estimated Cost:    $${result.metrics.totalCostUsd.toFixed(6)}`);
    console.log('\n---------------------------------------------------------------');
    console.log('🚨   FLAGGED VULNERABILITIES & BOTTLENECKS');
    console.log('---------------------------------------------------------------');
    result.findings.forEach((f, idx) => {
        console.log(`\n[${idx + 1}] ${f.severity.toUpperCase()} - ${f.title}`);
        console.log(`    Location:   ${f.file}:${f.line}`);
        if (f.cwe)
            console.log(`    CWE:        ${f.cwe}`);
        console.log(`    Confidence: ${(f.confidence * 100).toFixed(0)}% (${f.agentSource})`);
        console.log(`    Fix:        ${f.suggestedFix.split('\n')[0]}...`);
    });
    if (result.unitTests.length > 0) {
        console.log('\n---------------------------------------------------------------');
        console.log('🧪   AUTONOMOUSLY GENERATED REGRESSION TEST SUITE');
        console.log('---------------------------------------------------------------');
        result.unitTests.forEach(test => {
            console.log(`Target: ${test.targetFile} -> ${test.targetFunction}() [${test.testFramework}]`);
            console.log(`Rationale: ${test.rationale}\n`);
            console.log(test.testCode);
        });
    }
    // Save the full GitHub markdown output
    const outputPath = path.join(__dirname, 'output-review.md');
    fs.writeFileSync(outputPath, result.summary, 'utf-8');
    console.log(`\n✅ Generated GitHub PR Review Markdown written to: ${outputPath}\n`);
}
runDemo().catch(console.error);
