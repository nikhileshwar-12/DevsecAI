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
export class ObservabilityTracer {
  private static spans: TraceSpan[] = [];

  public static startSpan(traceId: string, name: string, agentRole: string): TraceSpan {
    const span: TraceSpan = {
      id: `span-${Math.random().toString(36).substring(2, 9)}`,
      traceId,
      name,
      agentRole,
      startTime: Date.now(),
      attributes: {},
    };
    this.spans.push(span);
    return span;
  }

  public static endSpan(span: TraceSpan, attributes: Record<string, any> = {}): TraceSpan {
    span.endTime = Date.now();
    span.durationMs = span.endTime - span.startTime;
    span.attributes = { ...span.attributes, ...attributes };
    return span;
  }

  public static computeSummary(metrics: AgentExecutionMetrics[]) {
    const totalPromptTokens = metrics.reduce((acc, m) => acc + m.promptTokens, 0);
    const totalCompletionTokens = metrics.reduce((acc, m) => acc + m.completionTokens, 0);
    const totalCostUsd = metrics.reduce((acc, m) => acc + m.totalCostUsd, 0);
    const totalDurationMs = metrics.reduce((acc, m) => acc + m.durationMs, 0);

    return {
      totalTokens: totalPromptTokens + totalCompletionTokens,
      totalPromptTokens,
      totalCompletionTokens,
      totalCostUsd: Number(totalCostUsd.toFixed(6)),
      totalDurationMs,
      agentBreakdown: metrics.map(m => ({
        agent: m.agentRole,
        durationMs: m.durationMs,
        tokens: m.promptTokens + m.completionTokens,
        costUsd: Number(m.totalCostUsd.toFixed(6)),
        findings: m.findingsCount,
      })),
    };
  }
}
