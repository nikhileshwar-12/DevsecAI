import { z } from 'zod';
import { LLMProvider } from '../ai/llm-provider.js';
import { ParsedDiff, ReviewFinding, GeneratedUnitTest, AgentExecutionMetrics } from '../types/index.js';
import { ASTContextChunker } from '../parser/ast-chunker.js';

const unitTestSchema = z.object({
  id: z.string(),
  targetFile: z.string(),
  targetFunction: z.string(),
  testFramework: z.enum(['vitest', 'jest']),
  testCode: z.string(),
  rationale: z.string(),
  coversVulnerability: z.string().optional(),
});

const testGenResponseSchema = z.object({
  unitTests: z.array(unitTestSchema),
});

export class TestGeneratorAgent {
  public static async generateTests(
    parsedDiff: ParsedDiff,
    flaggedFindings: ReviewFinding[]
  ): Promise<{ unitTests: GeneratedUnitTest[]; metrics: AgentExecutionMetrics }> {
    const startTime = Date.now();

    const contextualBlocks = parsedDiff.files.flatMap(file => 
      ASTContextChunker.extractContextualBlocks(file)
    );

    const promptPayload = {
      flaggedIssues: flaggedFindings.map(f => ({
        file: f.file,
        line: f.line,
        title: f.title,
        severity: f.severity,
        cwe: f.cwe,
        codeSnippet: f.codeSnippet,
      })),
      contextualBlocks,
    };

    const systemPrompt = `You are the DevSecAI Autonomous Test Generation Engineer.
Your objective: Synthesize production-ready, executable Vitest/Jest test suites that target edge cases, boundary conditions, and test regressions for flagged vulnerabilities.

CRITICAL INSTRUCTIONS:
1. Generate valid, TypeScript-compliant unit tests using Vitest (or Jest).
2. Mock dependencies appropriately (e.g. database clients, external HTTP requests).
3. Include tests for:
   - Security exploits (e.g., verifying SQL injection strings or malicious payloads are rejected/sanitized).
   - Negative boundaries (e.g., empty string, null, unexpected input types).
4. Return strict JSON matching: { "unitTests": [...] }`;

    const userPrompt = `Generate regression & edge-case unit tests for this Pull Request:
\`\`\`json
${JSON.stringify(promptPayload, null, 2)}
\`\`\``;

    const response = await LLMProvider.generateCompletion({
      systemPrompt,
      userPrompt,
      responseFormat: 'json',
      temperature: 0.2,
    });

    let unitTests: GeneratedUnitTest[] = [];
    try {
      const parsed = testGenResponseSchema.parse(JSON.parse(response.content));
      unitTests = parsed.unitTests;
    } catch (e) {
      console.warn('[TestGeneratorAgent] Fallback JSON parse recovery:', e);
      try {
        const rawObj = JSON.parse(response.content);
        if (Array.isArray(rawObj.unitTests)) {
          unitTests = rawObj.unitTests.map((t: any) => ({
            id: t.id || `test-${Math.random().toString(36).substring(2, 8)}`,
            targetFile: t.targetFile || 'src/app.test.ts',
            targetFunction: t.targetFunction || 'handler',
            testFramework: t.testFramework || 'vitest',
            testCode: t.testCode || '',
            rationale: t.rationale || 'Covers boundary conditions and error handling.',
            coversVulnerability: t.coversVulnerability,
          }));
        }
      } catch {
        unitTests = [];
      }
    }

    const durationMs = Date.now() - startTime;
    const totalCostUsd = (response.promptTokens * 0.00000015) + (response.completionTokens * 0.0000006);

    const metrics: AgentExecutionMetrics = {
      agentRole: 'test_agent',
      durationMs,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      totalCostUsd,
      findingsCount: unitTests.length,
    };

    return { unitTests, metrics };
  }
}
