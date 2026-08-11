import { RemediationPatchEngine } from '../src/remediation/patch-engine.js';
import { SarifExporter } from '../src/security/sarif-exporter.js';
import { BlastRadiusAnalyzer } from '../src/graph/blast-radius.js';
import { PolicyEngine } from '../src/policy/policy-engine.js';
import { ModelArenaBenchmark } from '../src/ai/model-arena.js';
import { ReviewFinding, PRReviewResult } from '../src/types/index.js';

async function executeAllFeatures() {
  console.log('\n===============================================================');
  console.log('🛡️   DevSecAI: Executing All 5 Enterprise Modules in Terminal');
  console.log('===============================================================\n');

  // Sample Finding for execution
  const sampleFinding: ReviewFinding = {
    id: 'sec-801',
    file: 'src/routes/users.ts',
    line: 14,
    severity: 'critical',
    category: 'security',
    title: 'Unparameterized Raw SQL Query (SQL Injection)',
    description: 'User input is interpolated directly into a SQL query string.',
    cwe: 'CWE-89: SQL Injection',
    codeSnippet: 'const query = `SELECT * FROM users WHERE email = \'${emailQuery}\'`;',
    suggestedFix: 'const query = \'SELECT * FROM users WHERE email = $1\';\nawait db.query(query, [emailQuery]);',
    confidence: 0.98,
    agentSource: 'security_agent',
  };

  const sampleResult: PRReviewResult = {
    prId: 'PR-801',
    repoName: 'acme/core-service',
    decision: 'REQUEST_CHANGES',
    overallRiskScore: 85,
    summary: 'Security review report',
    findings: [sampleFinding],
    unitTests: [],
    metrics: {
      totalFindings: 1,
      criticalCount: 1,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      totalTokens: 1450,
      totalCostUsd: 0.003,
      totalDurationMs: 12,
      agentMetrics: [],
    },
  };

  // 1. EXECUTE: Patch Engine (src/remediation/patch-engine.ts)
  console.log('---------------------------------------------------------------');
  console.log('1️⃣   EXECUTING: Patch Engine (src/remediation/patch-engine.ts)');
  console.log('---------------------------------------------------------------');
  const patches = RemediationPatchEngine.generatePatches([sampleFinding], 'PR-801');
  console.log(`Generated ${patches.length} auto-remediation patch(es):`);
  console.log(`Branch Name:     ${patches[0].branchName}`);
  console.log(`Commit Message:  ${patches[0].commitMessage}`);
  console.log(`Unified Patch:\n${patches[0].unifiedDiffPatch}\n`);

  // 2. EXECUTE: SARIF Exporter (src/security/sarif-exporter.ts)
  console.log('---------------------------------------------------------------');
  console.log('2️⃣   EXECUTING: SARIF Exporter (src/security/sarif-exporter.ts)');
  console.log('---------------------------------------------------------------');
  const sarif = SarifExporter.exportToSarif(sampleResult);
  console.log(`SARIF Standard Schema: ${sarif.$schema}`);
  console.log(`SARIF Version:         ${sarif.version}`);
  console.log(`Tool Driver Name:      ${sarif.runs[0].tool.driver.name}`);
  console.log(`Total Rules Exported:  ${sarif.runs[0].tool.driver.rules.length}`);
  console.log(`Total Results:         ${sarif.runs[0].results.length} alert(s) mapped for GitHub Security tab\n`);

  // 3. EXECUTE: Blast Radius Analyzer (src/graph/blast-radius.ts)
  console.log('---------------------------------------------------------------');
  console.log('3️⃣   EXECUTING: Blast Radius Analyzer (src/graph/blast-radius.ts)');
  console.log('---------------------------------------------------------------');
  const blast = BlastRadiusAnalyzer.analyze([sampleFinding]);
  console.log(`Overall Blast Exposure Score: ${blast.overallBlastRadiusScore}%`);
  console.log(`Impacted System Components:   ${blast.totalImpactedComponents}`);
  console.log('Impacted Nodes:');
  blast.nodes.forEach(n => console.log(`  • [${n.type.toUpperCase()}] ${n.label} (Impact: ${n.impactScore}/100)`));
  console.log('');

  // 4. EXECUTE: Policy Studio Engine (src/policy/policy-engine.ts)
  console.log('---------------------------------------------------------------');
  console.log('4️⃣   EXECUTING: Policy Studio (src/policy/policy-engine.ts)');
  console.log('---------------------------------------------------------------');
  const activePolicies = PolicyEngine.getActivePolicies();
  console.log(`Total Active Team Policies: ${activePolicies.length}`);
  activePolicies.forEach((p, idx) => {
    console.log(`  [${idx + 1}] [${p.severity.toUpperCase()}] ${p.title} (${p.category})`);
    console.log(`      Rule: ${p.rule.substring(0, 75)}...`);
  });
  console.log('');

  // 5. EXECUTE: Model Arena Benchmark (src/ai/model-arena.ts)
  console.log('---------------------------------------------------------------');
  console.log('5️⃣   EXECUTING: Model Arena (src/ai/model-arena.ts)');
  console.log('---------------------------------------------------------------');
  const benchmarks = await ModelArenaBenchmark.runBenchmark('');
  console.log('Foundation Model Benchmark Comparison:');
  console.table(benchmarks.map(b => ({
    'Model': b.modelName,
    'Provider': b.provider,
    'Recall': `${b.detectionRecall}%`,
    'Latency': `${b.latencyMs}ms`,
    'Tokens': b.totalTokens,
    'Cost ($)': `$${b.costUsd.toFixed(5)}`,
  })));

  console.log('\n✅ All 5 enterprise modules executed successfully!\n');
}

executeAllFeatures().catch(console.error);
