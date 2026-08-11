/**
 * Langfuse / OpenTelemetry-compatible AI Telemetry & Observability Tracer
 */
export class ObservabilityTracer {
    static spans = [];
    static startSpan(traceId, name, agentRole) {
        const span = {
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
    static endSpan(span, attributes = {}) {
        span.endTime = Date.now();
        span.durationMs = span.endTime - span.startTime;
        span.attributes = { ...span.attributes, ...attributes };
        return span;
    }
    static computeSummary(metrics) {
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
