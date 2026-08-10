import { RepositoryGuideline } from '../types/index.js';

/**
 * Repository Knowledge Base & Guideline Store
 * Provides repository-specific architectural rules and security guidelines to agents.
 */
export class RepoMemoryStore {
  private static defaultGuidelines: RepositoryGuideline[] = [
    {
      id: 'rule-sec-01',
      category: 'security',
      rule: 'All SQL database queries must use parameterized placeholders ($1, ?) or typed ORM builders. Never concatenate user input into raw SQL strings.',
      exampleBad: "db.query(`SELECT * FROM users WHERE id = '${userId}'`)",
      exampleGood: 'db.query("SELECT * FROM users WHERE id = $1", [userId])',
    },
    {
      id: 'rule-sec-02',
      category: 'security',
      rule: 'Never commit secrets, API keys, private tokens, or credentials into source code. Always use environment variables validated with Zod.',
      exampleBad: 'const STRIPE_SECRET = "sk_live_99812489124";',
      exampleGood: 'const STRIPE_SECRET = config.STRIPE_SECRET;',
    },
    {
      id: 'rule-perf-01',
      category: 'performance',
      rule: 'Avoid N+1 queries. Never execute single database lookups inside loops or Array.map. Batch load with WHERE id IN (...) or dataloader.',
      exampleBad: 'for (const user of users) { await db.order.find({ userId: user.id }); }',
      exampleGood: 'const orders = await db.order.findMany({ where: { userId: { in: userIds } } });',
    },
    {
      id: 'rule-perf-02',
      category: 'concurrency',
      rule: 'Never use async callbacks directly inside Array.prototype.forEach. Use Promise.all with Array.prototype.map for concurrency.',
      exampleBad: 'items.forEach(async (item) => { await process(item); });',
      exampleGood: 'await Promise.all(items.map(item => process(item)));',
    },
  ];

  /**
   * Retrieves applicable repository guidelines matching the diff context
   */
  public static async getApplicableGuidelines(_repoName?: string): Promise<RepositoryGuideline[]> {
    // In production, this performs a vector cosine similarity search via pgvector over the repository's rules.
    return this.defaultGuidelines;
  }
}
