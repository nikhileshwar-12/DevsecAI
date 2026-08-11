export interface LLMPromptOptions {
    systemPrompt: string;
    userPrompt: string;
    responseFormat?: 'json' | 'text';
    temperature?: number;
    maxTokens?: number;
}
export interface LLMResponse {
    content: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    model: string;
}
/**
 * Universal LLM Interface with JSON mode and fallback simulation
 */
export declare class LLMProvider {
    static generateCompletion(options: LLMPromptOptions): Promise<LLMResponse>;
    private static callOpenAI;
    private static callAnthropic;
    /**
     * Deterministic Semantic & Rule-Guided Analyzer (Mock Engine)
     */
    private static simulateAgentReasoning;
}
