import { ModelBenchmarkResult } from '../types/index.js';
/**
 * Multi-Model LLM Arena & Comparative Benchmarking Suite
 * Evaluates performance, detection recall, latency, and cost across leading foundation models.
 */
export declare class ModelArenaBenchmark {
    static runBenchmark(_rawDiff: string): Promise<ModelBenchmarkResult[]>;
}
