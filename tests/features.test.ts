import { describe, it, expect } from 'vitest';
import { RemediationPatchEngine } from '../src/remediation/patch-engine.js';
import { SarifExporter } from '../src/security/sarif-exporter.js';
import { BlastRadiusAnalyzer } from '../src/graph/blast-radius.js';
import { PolicyEngine } from '../src/policy/policy-engine.js';
import { ModelArenaBenchmark } from '../src/ai/model-arena.js';
import { ReviewFinding, PRReviewResult } from '../src/types/index.js';

describe('DevSecAI Enterprise Features Suite', () => {
  const mockFinding: ReviewFinding = {
    id: 'sec-101',
    file: 'src/routes/users.ts',
    line: 14,
    severity: 'critical',
    category: 'security',
    title: 'SQL Injection in User Search',
    description: 'Unparameterized query string',
    cwe: 'CWE-89: SQL Injection',
    codeSnippet: 'const query = `SELECT * FROM users WHERE email = \'${req.body.email}\'`;',
    suggestedFix: 'const query = `SELECT * FROM users WHERE email = $1`;',
    confidence: 0.98,
    agentSource: 'security_agent',
  };

  it('should generate automated remediation patches and unified diffs', () => {
    const patches = RemediationPatchEngine.generatePatches([mockFinding], 'PR-402', []);
    expect(patches).toHaveLength(1);
    expect(patches[0].branchName).toContain('devsecai/auto-fix');
    expect(patches[0].unifiedDiffPatch).toContain('diff --git a/src/routes/users.ts');
    expect(patches[0].unifiedDiffPatch).toContain('+const query = `SELECT * FROM users WHERE email = $1`;');
  });

  it('should export valid OASIS SARIF v2.1.0 JSON format for GitHub Security tab', () => {
    const mockResult: PRReviewResult = {
      prId: 'PR-402',
      repoName: 'my-org/backend',
      decision: 'REQUEST_CHANGES',
      overallRiskScore: 85,
      summary: 'Audit report',
      findings: [mockFinding],
      unitTests: [],
      metrics: {
        totalFindings: 1,
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        totalTokens: 1200,
        totalCostUsd: 0.002,
        totalDurationMs: 15,
        agentMetrics: [],
      },
    };

    const sarif = SarifExporter.exportToSarif(mockResult);
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs[0].tool.driver.name).toContain('DevSecAI');
    expect(sarif.runs[0].results).toHaveLength(1);
    expect(sarif.runs[0].results[0].level).toBe('error');
    expect(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe('src/routes/users.ts');
  });

  it('should calculate blast-radius and component dependencies', () => {
    const blast = BlastRadiusAnalyzer.analyze([mockFinding]);
    expect(blast.rootVulnerabilitiesCount).toBe(1);
    expect(blast.totalImpactedComponents).toBeGreaterThan(1);
    expect(blast.overallBlastRadiusScore).toBeGreaterThanOrEqual(35);
    expect(blast.nodes.some(n => n.type === 'database_table')).toBe(true);
  });

  it('should manage and toggle custom team policies in Policy Studio', () => {
    const initialPolicies = PolicyEngine.getPolicies();
    expect(initialPolicies.length).toBeGreaterThan(0);

    const newPolicy = PolicyEngine.addPolicy({
      category: 'compliance',
      title: 'Mandatory Audit Logging',
      rule: 'All sensitive user mutations must trigger an audit log event.',
      severity: 'high',
      enabled: true,
    });

    expect(newPolicy.id).toBeDefined();
    expect(PolicyEngine.getPolicies().some(p => p.title === 'Mandatory Audit Logging')).toBe(true);
  });

  it('should run multi-model arena benchmarks', async () => {
    const benchmarks = await ModelArenaBenchmark.runBenchmark('');
    expect(benchmarks.length).toBe(4);
    expect(benchmarks.some(b => b.modelName.includes('Claude'))).toBe(true);
    expect(benchmarks.some(b => b.modelName.includes('GPT-4o'))).toBe(true);
  });
});
