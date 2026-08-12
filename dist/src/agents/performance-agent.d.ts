import { ParsedDiff, ReviewFinding, AgentExecutionMetrics, RepositoryGuideline } from '../types/index.js';
export declare class PerformanceAgent {
    static analyze(parsedDiff: ParsedDiff, guidelines?: RepositoryGuideline[]): Promise<{
        findings: ReviewFinding[];
        metrics: AgentExecutionMetrics;
    }>;
}
