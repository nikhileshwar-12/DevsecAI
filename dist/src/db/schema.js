/**
 * DevSecAI PostgreSQL + pgvector Database Schema (Drizzle ORM Definition)
 * Supports multi-tenant repositories, PR review history, and semantic guideline vector search.
 */
export const schemaSql = `
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Repositories Table
CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_id BIGINT UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    default_branch VARCHAR(100) DEFAULT 'main',
    risk_threshold INT DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Repository Guidelines & Standards (Vector-enabled Knowledge Base)
CREATE TABLE IF NOT EXISTS repo_guidelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- 'security', 'performance', 'architecture', 'style'
    rule_title VARCHAR(255) NOT NULL,
    rule_description TEXT NOT NULL,
    embedding vector(1536), -- text-embedding-3-small vector
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create HNSW Index for sub-millisecond semantic search
CREATE INDEX IF NOT EXISTS idx_guidelines_embedding 
ON repo_guidelines USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Pull Request Audits Table
CREATE TABLE IF NOT EXISTS pull_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    pr_number INT NOT NULL,
    pr_title TEXT NOT NULL,
    author VARCHAR(100) NOT NULL,
    commit_sha VARCHAR(40) NOT NULL,
    decision VARCHAR(20) NOT NULL, -- 'APPROVED', 'REQUEST_CHANGES', 'COMMENT'
    risk_score INT NOT NULL,
    summary_markdown TEXT NOT NULL,
    total_tokens INT DEFAULT 0,
    cost_usd NUMERIC(8, 6) DEFAULT 0,
    duration_ms INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Findings Table
CREATE TABLE IF NOT EXISTS review_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pull_request_id UUID REFERENCES pull_requests(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    line_number INT NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
    category VARCHAR(50) NOT NULL,
    cwe VARCHAR(100),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    code_snippet TEXT,
    suggested_fix TEXT,
    confidence NUMERIC(3, 2) NOT NULL,
    agent_source VARCHAR(50) NOT NULL,
    is_false_positive BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Synthetic Unit Tests Table
CREATE TABLE IF NOT EXISTS generated_unit_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pull_request_id UUID REFERENCES pull_requests(id) ON DELETE CASCADE,
    target_file TEXT NOT NULL,
    target_function TEXT NOT NULL,
    framework VARCHAR(20) NOT NULL,
    test_code TEXT NOT NULL,
    rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;
