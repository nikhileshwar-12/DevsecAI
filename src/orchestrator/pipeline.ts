import { parseGitDiff } from '../parser/diff-parser.js';
import { SecurityAgent } from '../agents/security-agent.js';
import { PerformanceAgent } from '../agents/performance-agent.js';
import { TestGeneratorAgent } from '../agents/test-generator-agent.js';
import { ArbiterAgent } from '../agents/arbiter-agent.js';
import { RemediationPatchEngine } from '../remediation/patch-engine.js';
import { BlastRadiusAnalyzer } from '../graph/blast-radius.js';
import { PolicyEngine } from '../policy/policy-engine.js';
import { 
  PRReviewResult, 
  RepositoryGuideline, 
  AgentExecutionMetrics 
} from '../types/index.js';

export interface PipelineOptions {
  prId?: string;
  repoName?: string;
  prTitle?: string;
  prAuthor?: string;
  guidelines?: RepositoryGuideline[];
}

export class ReviewPipelineOrchestrator {
  /**
   * Executes full autonomous multi-agent code review pipeline on raw git diff
   */
  public static async execute(
    rawDiff: string,
    options: PipelineOptions = {}
  ): Promise<PRReviewResult> {
    const prId = options.prId || `PR-${Math.floor(1000 + Math.random() * 9000)}`;
    const repoName = options.repoName || 'organization/repo';
    
    // Ingest custom policies dynamically
    const activePolicies = PolicyEngine.getActivePolicies();
    const guidelines = options.guidelines && options.guidelines.length > 0 
      ? options.guidelines 
      : activePolicies;

    console.log(`[DevSecAI] 🚀 Initializing multi-agent review for ${repoName} (#${prId}) with ${guidelines.length} active policies...`);
    
    // Step 1: Parse Diff into Structured AST-friendly Hunks
    const parsedDiff = parseGitDiff(rawDiff);
    console.log(`[DevSecAI] 📄 Parsed ${parsedDiff.fileCount} file(s), +${parsedDiff.totalAdditions}/-${parsedDiff.totalDeletions} lines.`);

    if (parsedDiff.fileCount === 0) {
      return ArbiterAgent.synthesize(prId, repoName, [], [], [], []).result;
    }

    // Step 2: Parallel Agent Analysis (Security + Performance)
    console.log('[DevSecAI] 🤖 Dispatching Security Agent and Performance Agent in parallel...');
    const [securityRes, performanceRes] = await Promise.all([
      SecurityAgent.analyze(parsedDiff, guidelines),
      PerformanceAgent.analyze(parsedDiff, guidelines),
    ]);

    console.log(`[DevSecAI] 🛡️ Security Agent flagged ${securityRes.findings.length} issue(s).`);
    console.log(`[DevSecAI] ⚡ Performance Agent flagged ${performanceRes.findings.length} issue(s).`);

    const accumulatedMetrics: AgentExecutionMetrics[] = [
      securityRes.metrics,
      performanceRes.metrics,
    ];

    const preliminaryFindings = [...securityRes.findings, ...performanceRes.findings];

    // Step 3: Test Generation Agent
    let unitTests: any[] = [];
    if (preliminaryFindings.length > 0) {
      console.log('[DevSecAI] 🧪 Dispatching Autonomous Test Generator Agent...');
      const testRes = await TestGeneratorAgent.generateTests(parsedDiff, preliminaryFindings);
      unitTests = testRes.unitTests;
      accumulatedMetrics.push(testRes.metrics);
      console.log(`[DevSecAI] ✅ Synthesized ${unitTests.length} regression test suite(s).`);
    }

    // Step 4: Arbiter Agent Consensus & Risk Scoring
    console.log('[DevSecAI] ⚖️ Arbiter Agent synthesizing consensus and calculating risk score...');
    const { result } = ArbiterAgent.synthesize(
      prId,
      repoName,
      securityRes.findings,
      performanceRes.findings,
      unitTests,
      accumulatedMetrics
    );

    // Step 5: Auto-Remediation & Patch Generation
    const remediationPatches = RemediationPatchEngine.generatePatches(
      result.findings,
      prId,
      unitTests
    );
    result.remediationPatches = remediationPatches;

    // Step 6: Security Blast-Radius Dependency Graph
    const blastRadius = BlastRadiusAnalyzer.analyze(result.findings);
    result.blastRadius = blastRadius;

    console.log(`[DevSecAI] 🏁 Review complete. Decision: ${result.decision}, Risk Score: ${result.overallRiskScore}/100, Patches: ${remediationPatches.length}.`);
    return result;
  }
}
