import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();
const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    GITHUB_WEBHOOK_SECRET: z.string().default('devsec-test-secret-key-12345'),
    GITHUB_TOKEN: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    DEFAULT_LLM_PROVIDER: z.enum(['mock', 'openai', 'anthropic']).default('mock'),
    AI_MODEL_NAME: z.string().default('gpt-4o-mini'),
    DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/devsecai'),
    MIN_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.70),
    MAX_DIFF_LINES: z.coerce.number().default(5000),
});
export const config = envSchema.parse({
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    DEFAULT_LLM_PROVIDER: (process.env.OPENAI_API_KEY ? 'openai' : process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'mock'),
    AI_MODEL_NAME: process.env.AI_MODEL_NAME,
    DATABASE_URL: process.env.DATABASE_URL,
    MIN_CONFIDENCE_THRESHOLD: process.env.MIN_CONFIDENCE_THRESHOLD,
    MAX_DIFF_LINES: process.env.MAX_DIFF_LINES,
});
