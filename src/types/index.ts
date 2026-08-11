/**
 * DevSecAI Core Type Definitions (Extended for Enterprise Capabilities)
 * Strict TypeScript interfaces for multi-agent code analysis, auto-remediation,
 * SARIF export, blast radius dependency graph, and multi-model arena benchmarking.
 */

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type FindingCategory = 
  | 'security'
  | 'performance'
  | 'bug_risk'
  | 'concurrency'
  | 'architecture'
  | 'best_practice';

export type AgentRole = 
  | 'security_agent'
  | 'performance_agent'
  | 'test_agent'
  | 'arbiter_agent'
  | 'remediation_agent';

export type ReviewDecision = 'APPROVED' | 'COMMENT' | 'REQUEST_CHANGES';

export interface DiffLine {
  type: 'add' | 'del' | 'normal';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  oldPath: string;
  newPath: string;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
  hunks: DiffHunk[];
  rawDiff: string;
  additions: number;
  deletions: number;
}

export interface ParsedDiff {
  files: DiffFile[];
  totalAdditions: number;
  totalDeletions: number;
  fileCount: number;
}

export interface CodeBlockContext {
  filePath: string;
  functionName?: string;
  className?: string;
  startLine: number;
  endLine: number;
  code: string;
}

export interface ReviewFinding {
  id: string;
  file: string;
  line: number;
  endLine?: number;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  description: string;
  cwe?: string; // e.g. "CWE-89: SQL Injection"
  codeSnippet: string;
  suggestedFix: string;
  confidence: number; // 0.0 to 1.0
  agentSource: AgentRole;
  remediated?: boolean;
}

export interface GeneratedUnitTest {
  id: string;
  targetFile: string;
  targetFunction: string;
  testFramework: 'vitest' | 'jest';
  testCode: string;
  rationale: string;
  coversVulnerability?: string;
}

export interface AgentExecutionMetrics {
  agentRole: AgentRole;
  durationMs: number;
  promptTokens: number;
  completionTokens: number;
  totalCostUsd: number;
  findingsCount: number;
}

export interface RepositoryGuideline {
  id: string;
  category: 'security' | 'performance' | 'architecture' | 'compliance';
  title: string;
  rule: string;
  severity: FindingSeverity;
  enabled: boolean;
  exampleBad?: string;
  exampleGood?: string;
}

export interface RemediationPatch {
  id: string;
  targetFile: string;
  originalSnippet: string;
  fixedSnippet: string;
  unifiedDiffPatch: string;
  branchName: string;
  commitMessage: string;
  status: 'ready' | 'applied' | 'verified';
  testSuitePassed: boolean;
}

export interface BlastRadiusNode {
  id: string;
  label: string;
  type: 'vulnerable_file' | 'dependent_service' | 'api_endpoint' | 'database_table';
  severity?: FindingSeverity;
  impactScore: number; // 0 to 100
}

export interface BlastRadiusEdge {
  source: string;
  target: string;
  relation: 'imports' | 'calls' | 'queries' | 'authenticates';
}

export interface BlastRadiusAnalysis {
  rootVulnerabilitiesCount: number;
  totalImpactedComponents: number;
  overallBlastRadiusScore: number; // 0-100%
  nodes: BlastRadiusNode[];
  edges: BlastRadiusEdge[];
}

export interface ModelBenchmarkResult {
  modelName: string;
  provider: string;
  findingsCount: number;
  criticalDetected: number;
  detectionRecall: number; // percentage (e.g. 96)
  latencyMs: number;
  totalTokens: number;
  costUsd: number;
}

export interface PRReviewResult {
  prId: string;
  repoName: string;
  decision: ReviewDecision;
  overallRiskScore: number;
  summary: string;
  findings: ReviewFinding[];
  unitTests: GeneratedUnitTest[];
  remediationPatches?: RemediationPatch[];
  blastRadius?: BlastRadiusAnalysis;
  metrics: {
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    totalTokens: number;
    totalCostUsd: number;
    totalDurationMs: number;
    agentMetrics: AgentExecutionMetrics[];
  };
}

export interface GitHubWebhookPayload {
  action: string;
  number: number;
  pull_request: {
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: string;
    html_url: string;
    diff_url: string;
    user: { login: string };
    head: { sha: string; ref: string };
    base: {
      sha: string;
      ref: string;
      repo: { full_name: string; name: string; owner: { login: string } };
    };
  };
  repository: {
    full_name: string;
    name: string;
    owner: { login: string };
  };
}
