import { ParsedDiff, ReviewFinding, GeneratedUnitTest, AgentExecutionMetrics } from '../types/index.js';
export declare class TestGeneratorAgent {
    static generateTests(parsedDiff: ParsedDiff, flaggedFindings: ReviewFinding[]): Promise<{
        unitTests: GeneratedUnitTest[];
        metrics: AgentExecutionMetrics;
    }>;
}
