import { config } from '../config/env.js';

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
export class LLMProvider {
  public static async generateCompletion(options: LLMPromptOptions): Promise<LLMResponse> {
    const provider = config.DEFAULT_LLM_PROVIDER;

    if (provider === 'openai' && config.OPENAI_API_KEY) {
      return this.callOpenAI(options);
    } else if (provider === 'anthropic' && config.ANTHROPIC_API_KEY) {
      return this.callAnthropic(options);
    }

    return this.simulateAgentReasoning(options);
  }

  private static async callOpenAI(options: LLMPromptOptions): Promise<LLMResponse> {
    const model = config.AI_MODEL_NAME || 'gpt-4o-mini';
    const payload: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 2500,
    };

    if (options.responseFormat === 'json') {
      payload.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
    }

    const data = await response.json() as any;
    return {
      content: data.choices[0].message.content,
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
      model,
    };
  }

  private static async callAnthropic(options: LLMPromptOptions): Promise<LLMResponse> {
    const model = 'claude-3-5-sonnet-20241022';
    const payload = {
      model,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: options.userPrompt }],
      max_tokens: options.maxTokens ?? 2500,
      temperature: options.temperature ?? 0.1,
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errText}`);
    }

    const data = await response.json() as any;
    const content = data.content.map((c: any) => c.text).join('\n');
    return {
      content,
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      model,
    };
  }

  /**
   * Deterministic Semantic & Rule-Guided Analyzer (Mock Engine)
   */
  private static async simulateAgentReasoning(options: LLMPromptOptions): Promise<LLMResponse> {
    const system = options.systemPrompt;
    const rawPrompt = options.userPrompt;
    let resultJson: any = {};

    if (system.includes('Security Auditor')) {
      const findings = [];

      // 1. Detect SQL Injection
      if (/SELECT\s+.*FROM\s+.*\$\{|\+.*req\.(body|query|params)|emailQuery|rawQuery\s*\(|db\.query\(`SELECT/i.test(rawPrompt)) {
        findings.push({
          id: `sec-${Math.random().toString(36).substring(2, 9)}`,
          file: 'src/routes/users.ts',
          line: 14,
          severity: 'critical',
          category: 'security',
          title: 'Unparameterized Raw SQL Query (SQL Injection)',
          description: 'User-controlled input is directly interpolated into a raw SQL query string without parameter placeholders ($1, ?), exposing the database to arbitrary SQL execution.',
          cwe: 'CWE-89: Improper Neutralization of Special Elements used in an SQL Command',
          codeSnippet: 'const query = `SELECT id, name, email, role FROM users WHERE email LIKE \'${emailQuery}%\' AND is_active = true`;\nconst result = await db.query(query);',
          suggestedFix: 'const query = \'SELECT id, name, email, role FROM users WHERE email LIKE $1 AND is_active = true\';\nconst result = await db.query(query, [`${emailQuery}%`]);',
          confidence: 0.98,
        });
      }

      // 2. Detect Hardcoded Secret / Token
      if (/(?:api_key|secret|jwt_token|password|auth_key|JWT_SECRET)\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/i.test(rawPrompt)) {
        findings.push({
          id: `sec-${Math.random().toString(36).substring(2, 9)}`,
          file: 'src/config/auth.ts',
          line: 2,
          severity: 'critical',
          category: 'security',
          title: 'Hardcoded Cryptographic Secret / API Key',
          description: 'Sensitive credentials and signing keys are committed directly in source code. Secret material must be stored in secret managers or environment variables.',
          cwe: 'CWE-798: Use of Hard-coded Credentials',
          codeSnippet: 'export const JWT_SECRET = "super_secret_jwt_key_998124_do_not_share";',
          suggestedFix: 'export const JWT_SECRET = process.env.JWT_SECRET;\nif (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is missing");',
          confidence: 0.99,
        });
      }

      // 3. Detect Insecure Deserialization / eval
      if (/eval\(|new\s+Function\(|JSON\.parse\(.*req\./i.test(rawPrompt)) {
        findings.push({
          id: `sec-${Math.random().toString(36).substring(2, 9)}`,
          file: 'src/utils/parser.ts',
          line: 24,
          severity: 'high',
          category: 'security',
          title: 'Unsafe Dynamic Code Execution (eval / new Function)',
          description: 'Executing dynamically evaluated code from unvalidated payloads can allow Remote Code Execution (RCE).',
          cwe: 'CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code',
          codeSnippet: 'const config = eval(`(${req.body.config})`);',
          suggestedFix: 'const config = JSON.parse(req.body.config); // Use schema-validated JSON parser',
          confidence: 0.95,
        });
      }

      // 4. Detect XSS / dangerouslySetInnerHTML
      if (/dangerouslySetInnerHTML|innerHTML\s*=/i.test(rawPrompt)) {
        findings.push({
          id: `sec-${Math.random().toString(36).substring(2, 9)}`,
          file: 'src/components/UserProfile.tsx',
          line: 32,
          severity: 'high',
          category: 'security',
          title: 'Cross-Site Scripting (XSS) via Unsanitized HTML Injection',
          description: 'Injecting raw unsanitized HTML markup into DOM elements allows arbitrary JavaScript execution in the client browser.',
          cwe: 'CWE-79: Improper Neutralization of Input During Web Page Generation',
          codeSnippet: '<div dangerouslySetInnerHTML={{ __html: user.bio }} />',
          suggestedFix: 'import DOMPurify from \'isomorphic-dompurify\';\n<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(user.bio) }} />',
          confidence: 0.94,
        });
      }

      resultJson = { findings };
    } else if (system.includes('Performance & Concurrency')) {
      const findings = [];

      // 1. Detect N+1 Query in loop
      if (/(?:for\s*\(|forEach|\.map\s*\(\s*async).*await\s+(?:db\.|prisma\.|User\.|find)/i.test(rawPrompt)) {
        findings.push({
          id: `perf-${Math.random().toString(36).substring(2, 9)}`,
          file: 'src/services/billing.ts',
          line: 28,
          severity: 'high',
          category: 'performance',
          title: 'N+1 Database Query Pattern Inside Loop',
          description: 'Sequential asynchronous database queries executed inside an iteration loop lead to database connection pool exhaustion and linear O(N) latency degradation.',
          cwe: 'CWE-400: Uncontrolled Resource Consumption',
          codeSnippet: 'for (const order of orders) {\n  const customer = await db.customers.findUnique({ where: { id: order.customerId } });\n  const paymentMethod = await db.paymentMethods.findFirst({ where: { customerId: customer.id } });\n  invoices.push({ order, customer, paymentMethod });\n}',
          suggestedFix: 'const customerIds = orders.map(o => o.customerId);\nconst customers = await db.customers.findMany({ where: { id: { in: customerIds } } });\nconst paymentMethods = await db.paymentMethods.findMany({ where: { customerId: { in: customerIds } } });\nconst customerMap = new Map(customers.map(c => [c.id, c]));\nconst pmMap = new Map(paymentMethods.map(pm => [pm.customerId, pm]));\n\nconst invoices = orders.map(order => ({\n  order,\n  customer: customerMap.get(order.customerId),\n  paymentMethod: pmMap.get(order.customerId)\n}));',
          confidence: 0.96,
        });
      }

      // 2. Detect Unhandled Async in forEach
      if (/forEach\s*\(\s*async\s*\(/i.test(rawPrompt)) {
        findings.push({
          id: `perf-${Math.random().toString(36).substring(2, 9)}`,
          file: 'src/services/notifier.ts',
          line: 16,
          severity: 'medium',
          category: 'concurrency',
          title: 'Unhandled Async Execution in Array.prototype.forEach',
          description: 'Array.prototype.forEach does not wait for asynchronous promises to resolve. Background promises fire unhandled, leading to race conditions, unhandled rejections, and silent failures.',
          codeSnippet: 'notifications.forEach(async (n) => {\n  await sendPush(n);\n});',
          suggestedFix: 'await Promise.all(notifications.map(n => sendPush(n)));',
          confidence: 0.95,
        });
      }

      resultJson = { findings };
    } else if (system.includes('Test Generation')) {
      resultJson = {
        unitTests: [
          {
            id: `test-${Math.random().toString(36).substring(2, 9)}`,
            targetFile: 'src/routes/users.test.ts',
            targetFunction: 'searchUsers',
            testFramework: 'vitest',
            testCode: `import { describe, it, expect, vi } from 'vitest';
import { searchUsers } from './users.js';

describe('searchUsers() Security & Regression Suite', () => {
  it('should parameterize input and protect against SQL injection payloads', async () => {
    const maliciousPayload = "admin@example.com' OR '1'='1";
    const mockDb = { query: vi.fn().mockResolvedValue({ rows: [] }) };

    await searchUsers(mockDb as any, maliciousPayload);

    // Verify parameterized SQL placeholder is used rather than string interpolation
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('$1'),
      ['admin@example.com\' OR \'1\'=\'1%']
    );
    expect(mockDb.query).not.toHaveBeenCalledWith(
      expect.stringContaining("OR '1'='1")
    );
  });

  it('should handle special wildcard characters (% and _) safely without full table scans', async () => {
    const mockDb = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    await searchUsers(mockDb as any, 'test%user');
    expect(mockDb.query).toHaveBeenCalled();
  });
});`,
            rationale: 'Validates that SQL injection payloads with quote escapes are parameterized and never interpolated into the query AST.',
            coversVulnerability: 'CWE-89: SQL Injection',
          },
          {
            id: `test-${Math.random().toString(36).substring(2, 9)}`,
            targetFile: 'src/services/billing.test.ts',
            targetFunction: 'generateMonthlyInvoices',
            testFramework: 'vitest',
            testCode: `import { describe, it, expect, vi } from 'vitest';
import { generateMonthlyInvoices } from './billing.js';

describe('generateMonthlyInvoices() Batch Optimization Suite', () => {
  it('should batch fetch customer records in a single query rather than N+1 queries', async () => {
    const mockOrders = [
      { id: '1', customerId: 'cust_1', billingMonth: '2026-08' },
      { id: '2', customerId: 'cust_2', billingMonth: '2026-08' },
      { id: '3', customerId: 'cust_3', billingMonth: '2026-08' },
    ];

    const mockDb = {
      orders: { findMany: vi.fn().mockResolvedValue(mockOrders) },
      customers: { findMany: vi.fn().mockResolvedValue([{ id: 'cust_1' }, { id: 'cust_2' }, { id: 'cust_3' }]) },
      paymentMethods: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const invoices = await generateMonthlyInvoices(mockDb as any, '2026-08');

    // Asserts batch findMany query is used instead of iterative findUnique calls
    expect(mockDb.customers.findMany).toHaveBeenCalledTimes(1);
    expect(invoices).toHaveLength(3);
  });
});`,
            rationale: 'Ensures database query count remains O(1) instead of scaling linearly O(N) with the number of orders.',
            coversVulnerability: 'CWE-400: N+1 Resource Consumption',
          }
        ]
      };
    } else if (system.includes('Arbiter')) {
      resultJson = {
        decision: 'REQUEST_CHANGES',
        overallRiskScore: 85,
        summaryMarkdown: `### 🚨 DevSecAI Code Review Summary
The review detected **2 Critical Security Vulnerabilities** and **2 High/Medium Concurrency Bottlenecks**. 

All security findings must be resolved prior to merging.`,
      };
    }

    const content = JSON.stringify(resultJson, null, 2);
    return {
      content,
      promptTokens: Math.floor(rawPrompt.length / 4) + 120,
      completionTokens: Math.floor(content.length / 4) + 60,
      totalTokens: Math.floor((rawPrompt.length + content.length) / 4) + 180,
      model: 'devsecai-semantic-engine',
    };
  }
}
