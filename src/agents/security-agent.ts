import { z } from 'zod';
import { LLMProvider } from '../ai/llm-provider.js';
import { ParsedDiff, ReviewFinding, AgentExecutionMetrics, RepositoryGuideline } from '../types/index.js';
import { ASTContextChunker } from '../parser/ast-chunker.js';

const findingSchema = z.object({
  id: z.string(),
  file: z.string(),
  line: z.number(),
  endLine: z.number().optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  category: z.literal('security'),
  title: z.string(),
  description: z.string(),
  cwe: z.string().optional(),
  codeSnippet: z.string(),
  suggestedFix: z.string(),
  confidence: z.number().min(0).max(1),
});

const securityResponseSchema = z.object({
  findings: z.array(findingSchema),
});

export class SecurityAgent {
  public static async analyze(
    parsedDiff: ParsedDiff,
    guidelines: RepositoryGuideline[] = []
  ): Promise<{ findings: ReviewFinding[]; metrics: AgentExecutionMetrics }> {
    const startTime = Date.now();

    // Prepare code blocks enriched with AST context
    const contextualBlocks = parsedDiff.files.flatMap(file => 
      ASTContextChunker.extractContextualBlocks(file)
    );

    const promptPayload = {
      files: parsedDiff.files.map(f => ({
        path: f.newPath,
        additions: f.additions,
        deletions: f.deletions,
        rawDiff: f.rawDiff,
      })),
      contextualBlocks,
      guidelines: guidelines.map(g => ({ rule: g.rule, category: g.category })),
    };

    const systemPrompt = `You are the DevSecAI Principal Security Auditor.
Your objective: Audit pull request code diffs for security vulnerabilities, secret leaks, injection risks, authorization flaws, and CWE/OWASP Top 10 violations.

CRITICAL GUIDELINES:
1. ONLY report genuine security issues in newly added or modified code (+ lines).
2. For each issue, provide:
   - file, line number (in the new file)
   - severity ('critical' | 'high' | 'medium' | 'low')
   - category: 'security'
   - title & description
   - CWE classification (e.g. CWE-89, CWE-79, CWE-798)
   - exact codeSnippet
   - copy-pasteable suggestedFix
   - confidence score (0.0 to 1.0)
3. Return strict JSON matching the schema: { "findings": [...] }`;

    const userPrompt = `Analyze the following Pull Request diff for security vulnerabilities:
\`\`\`json
${JSON.stringify(promptPayload, null, 2)}
\`\`\``;

    const response = await LLMProvider.generateCompletion({
      systemPrompt,
      userPrompt,
      responseFormat: 'json',
      temperature: 0.1,
    });

    let findings: ReviewFinding[] = [];
    try {
      const parsed = securityResponseSchema.parse(JSON.parse(response.content));
      findings = parsed.findings.map(f => ({
        ...f,
        agentSource: 'security_agent' as const,
      }));
    } catch (e) {
      console.warn('[SecurityAgent] Fallback JSON parse recovery:', e);
      try {
        const rawObj = JSON.parse(response.content);
        if (Array.isArray(rawObj.findings)) {
          findings = rawObj.findings.map((f: any) => ({
            id: f.id || `sec-${Math.random().toString(36).substring(2, 8)}`,
            file: f.file || 'unknown',
            line: Number(f.line) || 1,
            severity: f.severity || 'high',
            category: 'security' as const,
            title: f.title || 'Security Warning',
            description: f.description || '',
            cwe: f.cwe,
            codeSnippet: f.codeSnippet || '',
            suggestedFix: f.suggestedFix || '',
            confidence: Number(f.confidence) || 0.85,
            agentSource: 'security_agent' as const,
          }));
        }
      } catch {
        findings = [];
      }
    }

    const durationMs = Date.now() - startTime;
    const totalCostUsd = (response.promptTokens * 0.00000015) + (response.completionTokens * 0.0000006);

    const metrics: AgentExecutionMetrics = {
      agentRole: 'security_agent',
      durationMs,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      totalCostUsd,
      findingsCount: findings.length,
    };

    return { findings, metrics };
  }
}
