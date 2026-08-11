/**
 * Team Architecture & Security Policy Studio Engine
 * Manages custom organizational rules, compliance standards, and vector memory embeddings.
 */
export class PolicyEngine {
    static policies = [
        {
            id: 'pol-sec-01',
            category: 'security',
            title: 'Mandatory Parameterized SQL Queries',
            rule: 'All SQL database queries must strictly use parameterized placeholders ($1, ?) or typed ORM builders. Never concatenate user input into raw SQL strings.',
            severity: 'critical',
            enabled: true,
            exampleBad: "db.query(`SELECT * FROM users WHERE id = '${userId}'`)",
            exampleGood: 'db.query("SELECT * FROM users WHERE id = $1", [userId])',
        },
        {
            id: 'pol-sec-02',
            category: 'security',
            title: 'Zero Hardcoded Secrets Policy',
            rule: 'Never commit cryptographic signing keys, passwords, or API tokens into source code. Always use validated environment variables.',
            severity: 'critical',
            enabled: true,
            exampleBad: 'const JWT_SECRET = "super_secret_jwt_key_998124";',
            exampleGood: 'const JWT_SECRET = config.JWT_SECRET;',
        },
        {
            id: 'pol-perf-01',
            category: 'performance',
            title: 'No N+1 Database Loops',
            rule: 'Avoid N+1 queries. Never execute single database lookups inside loops or Array.map. Batch load with WHERE id IN (...) or dataloader.',
            severity: 'high',
            enabled: true,
            exampleBad: 'for (const user of users) { await db.order.find({ userId: user.id }); }',
            exampleGood: 'const orders = await db.order.findMany({ where: { userId: { in: userIds } } });',
        },
        {
            id: 'pol-perf-02',
            category: 'performance',
            title: 'Safe Async Execution in Iterables',
            rule: 'Never use async callbacks directly inside Array.prototype.forEach. Use Promise.all with Array.prototype.map to prevent swallowed promise rejections.',
            severity: 'medium',
            enabled: true,
            exampleBad: 'items.forEach(async (item) => { await process(item); });',
            exampleGood: 'await Promise.all(items.map(item => process(item)));',
        },
        {
            id: 'pol-arch-01',
            category: 'architecture',
            title: 'Type-Safe Runtime Validation with Zod',
            rule: 'All incoming HTTP request bodies and external API payloads must be validated with a strict Zod schema before processing.',
            severity: 'medium',
            enabled: true,
            exampleBad: 'const data = req.body;',
            exampleGood: 'const data = userSchema.parse(req.body);',
        },
    ];
    static getPolicies() {
        return [...this.policies];
    }
    static getActivePolicies() {
        return this.policies.filter(p => p.enabled);
    }
    static addPolicy(policy) {
        const newPolicy = {
            ...policy,
            id: `pol-custom-${Math.random().toString(36).substring(2, 8)}`,
        };
        this.policies.unshift(newPolicy);
        return newPolicy;
    }
    static togglePolicy(id) {
        const policy = this.policies.find(p => p.id === id);
        if (policy) {
            policy.enabled = !policy.enabled;
            return policy.enabled;
        }
        return false;
    }
    static deletePolicy(id) {
        const idx = this.policies.findIndex(p => p.id === id);
        if (idx !== -1) {
            this.policies.splice(idx, 1);
            return true;
        }
        return false;
    }
}
