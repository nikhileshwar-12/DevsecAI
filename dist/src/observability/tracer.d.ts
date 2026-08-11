import { AgentExecutionMetrics } from '../types/index.js';
export interface TraceSpan {
    id: string;
    traceId: string;
    name: string;
    agentRole: string;
    startTime: number;
    endTime?: number;
    durationMs?: number;
    attributes: Record<string, any>;
}
/**
 * Langfuse / OpenTelemetry-compatible AI Telemetry & Observability Tracer
 */
export declare class ObservabilityTracer {
    private static spans;
    static startSpan(traceId: string, name: string, agentRole: string): TraceSpan;
    static endSpan(span: TraceSpan, attributes?: Record<string, any>): TraceSpan;
    static computeSummary(metrics: AgentExecutionMetrics[]): {
        totalTokens: number;
        totalPromptTokens: number;
        totalCompletionTokens: number;
        totalCostUsd: number;
        totalDurationMs: number;
        agentBreakdown: {
            agent: import("../types/index.js").AgentRole;
            durationMs: number;
            tokens: number;
            costUsd: number;
            findings: number;
        }[];
    };
}
