import { ReviewFinding, GeneratedUnitTest, ReviewDecision, AgentExecutionMetrics, PRReviewResult } from '../types/index.js';
export declare class ArbiterAgent {
    /**
     * Synthesizes agent outputs, removes duplicate findings, computes overall risk score,
     * and renders GitHub PR summary markdown.
     */
    static synthesize(prId: string, repoName: string, securityFindings: ReviewFinding[], performanceFindings: ReviewFinding[], unitTests: GeneratedUnitTest[], agentMetrics: AgentExecutionMetrics[]): {
        result: PRReviewResult;
        metrics: AgentExecutionMetrics;
    };
    /**
     * Deduplicates findings that share the same file and overlapping line boundaries
     */
    private static deduplicateFindings;
    /**
     * Calculates overall PR risk score from 0 to 100 based on finding severities
     */
    private static calculateRiskScore;
    private static determineDecision;
    /**
     * Generates production GitHub PR markdown summary with badges, tables, and collapsible test suites
     */
    static renderMarkdownSummary(repoName: string, prId: string, decision: ReviewDecision, riskScore: number, findings: ReviewFinding[], unitTests: GeneratedUnitTest[]): string;
}
