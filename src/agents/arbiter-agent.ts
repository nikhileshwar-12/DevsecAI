import { 
  ReviewFinding, 
  GeneratedUnitTest, 
  ReviewDecision, 
  AgentExecutionMetrics, 
  PRReviewResult 
} from '../types/index.js';
import { config } from '../config/env.js';

export class ArbiterAgent {
  /**
   * Synthesizes agent outputs, removes duplicate findings, computes overall risk score,
   * and renders GitHub PR summary markdown.
   */
  public static synthesize(
    prId: string,
    repoName: string,
    securityFindings: ReviewFinding[],
    performanceFindings: ReviewFinding[],
    unitTests: GeneratedUnitTest[],
    agentMetrics: AgentExecutionMetrics[]
  ): { result: PRReviewResult; metrics: AgentExecutionMetrics } {
    const startTime = Date.now();

    // 1. Merge & Deduplicate findings
    const allFindings = [...securityFindings, ...performanceFindings];
    const deduplicatedFindings = this.deduplicateFindings(allFindings);

    // 2. Filter by confidence threshold
    const filteredFindings = deduplicatedFindings.filter(
      f => f.confidence >= config.MIN_CONFIDENCE_THRESHOLD
    );

    // 3. Compute Composite Risk Score (0 - 100)
    const riskScore = this.calculateRiskScore(filteredFindings);

    // 4. Determine Decision
    const decision: ReviewDecision = this.determineDecision(riskScore, filteredFindings);

    // 5. Generate Markdown PR Summary
    const summary = this.renderMarkdownSummary(
      repoName,
      prId,
      decision,
      riskScore,
      filteredFindings,
      unitTests
    );

    // 6. Aggregate Telemetry
    const totalTokens = agentMetrics.reduce((sum, m) => sum + m.promptTokens + m.completionTokens, 0);
    const totalCostUsd = agentMetrics.reduce((sum, m) => sum + m.totalCostUsd, 0);
    const totalDurationMs = agentMetrics.reduce((sum, m) => sum + m.durationMs, 0) + (Date.now() - startTime);

    const criticalCount = filteredFindings.filter(f => f.severity === 'critical').length;
    const highCount = filteredFindings.filter(f => f.severity === 'high').length;
    const mediumCount = filteredFindings.filter(f => f.severity === 'medium').length;
    const lowCount = filteredFindings.filter(f => f.severity === 'low' || f.severity === 'info').length;

    const arbiterMetrics: AgentExecutionMetrics = {
      agentRole: 'arbiter_agent',
      durationMs: Date.now() - startTime,
      promptTokens: 0,
      completionTokens: 0,
      totalCostUsd: 0,
      findingsCount: filteredFindings.length,
    };

    const finalMetrics = [...agentMetrics, arbiterMetrics];

    const result: PRReviewResult = {
      prId,
      repoName,
      decision,
      overallRiskScore: riskScore,
      summary,
      findings: filteredFindings,
      unitTests,
      metrics: {
        totalFindings: filteredFindings.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        totalTokens,
        totalCostUsd,
        totalDurationMs,
        agentMetrics: finalMetrics,
      },
    };

    return { result, metrics: arbiterMetrics };
  }

  /**
   * Deduplicates findings that share the same file and overlapping line boundaries
   */
  private static deduplicateFindings(findings: ReviewFinding[]): ReviewFinding[] {
    const unique: ReviewFinding[] = [];

    for (const finding of findings) {
      const isDuplicate = unique.some(existing => 
        existing.file === finding.file &&
        Math.abs(existing.line - finding.line) <= 2 &&
        (existing.category === finding.category || existing.cwe === finding.cwe)
      );

      if (!isDuplicate) {
        unique.push(finding);
      }
    }

    return unique;
  }

  /**
   * Calculates overall PR risk score from 0 to 100 based on finding severities
   */
  private static calculateRiskScore(findings: ReviewFinding[]): number {
    let score = 0;

    for (const f of findings) {
      switch (f.severity) {
        case 'critical':
          score += 35;
          break;
        case 'high':
          score += 20;
          break;
        case 'medium':
          score += 10;
          break;
        case 'low':
        case 'info':
          score += 3;
          break;
      }
    }

    return Math.min(100, Math.max(0, score));
  }

  private static determineDecision(riskScore: number, findings: ReviewFinding[]): ReviewDecision {
    const hasCritical = findings.some(f => f.severity === 'critical');
    const hasHigh = findings.some(f => f.severity === 'high');

    if (hasCritical || hasHigh || riskScore >= 50) {
      return 'REQUEST_CHANGES';
    }
    if (findings.length > 0 || riskScore >= 20) {
      return 'COMMENT';
    }
    return 'APPROVED';
  }

  /**
   * Generates production GitHub PR markdown summary with badges, tables, and collapsible test suites
   */
  public static renderMarkdownSummary(
    repoName: string,
    prId: string,
    decision: ReviewDecision,
    riskScore: number,
    findings: ReviewFinding[],
    unitTests: GeneratedUnitTest[]
  ): string {
    const decisionBadge = decision === 'APPROVED' 
      ? '🟢 **STATUS: APPROVED**' 
      : decision === 'REQUEST_CHANGES' 
      ? '🔴 **STATUS: CHANGES REQUESTED**' 
      : '🟡 **STATUS: REVIEW COMMENTS**';

    const riskBadge = riskScore >= 70 
      ? `🔴 **High Risk (${riskScore}/100)**` 
      : riskScore >= 30 
      ? `🟡 **Moderate Risk (${riskScore}/100)**` 
      : `🟢 **Low Risk (${riskScore}/100)**`;

    let md = `## 🛡️ DevSecAI Security & Architecture Audit Report\n\n`;
    md += `| Decision | PR Risk Score | Total Findings | Security | Concurrency/Perf |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    md += `| ${decisionBadge} | ${riskBadge} | **${findings.length} issues** | ${findings.filter(f => f.category === 'security').length} flagged | ${findings.filter(f => f.category === 'performance' || f.category === 'concurrency').length} flagged |\n\n`;

    if (findings.length === 0) {
      md += `✅ **No security vulnerabilities or major performance bottlenecks detected in this diff.** Ready to merge!\n\n`;
    } else {
      md += `### 🚨 Prioritized Audit Findings\n\n`;

      findings.forEach((f, idx) => {
        const severityIcon = f.severity === 'critical' ? '🔴 CRITICAL' : f.severity === 'high' ? '🟠 HIGH' : f.severity === 'medium' ? '🟡 MEDIUM' : '🔵 LOW';
        md += `#### ${idx + 1}. [${severityIcon}] ${f.title}\n`;
        md += `- **Location:** \`${f.file}:${f.line}\`\n`;
        if (f.cwe) md += `- **Classification:** \`${f.cwe}\`\n`;
        md += `- **Confidence:** \`${(f.confidence * 100).toFixed(0)}%\`\n`;
        md += `- **Impact:** ${f.description}\n\n`;

        if (f.codeSnippet) {
          md += `**Problematic Code:**\n\`\`\`typescript\n${f.codeSnippet}\n\`\`\`\n\n`;
        }

        if (f.suggestedFix) {
          md += `**Suggested One-Click Resolution:**\n\`\`\`typescript\n${f.suggestedFix}\n\`\`\`\n\n`;
        }
        md += `---\n\n`;
      });
    }

    if (unitTests.length > 0) {
      md += `### 🧪 Autonomous Vitest / Jest Unit Test Suite\n`;
      md += `DevSecAI synthesized the following test suites targeting identified edge cases and exploit vectors:\n\n`;

      unitTests.forEach(test => {
        md += `<details>\n<summary><b>▶ ${test.targetFile} — <code>${test.targetFunction}</code> (${test.testFramework.toUpperCase()})</b></summary>\n\n`;
        md += `> **Rationale:** ${test.rationale}\n\n`;
        md += `\`\`\`typescript\n${test.testCode}\n\`\`\`\n`;
        md += `</details>\n\n`;
      });
    }

    md += `\n*Automated audit conducted by **DevSecAI Multi-Agent Pipeline** (Security Agent + Performance Agent + Arbiter).*`;
    return md;
  }
}
