import { ParsedDiff, DiffFile } from '../types/index.js';
/**
 * High-performance pure TypeScript Unified Diff Parser
 * Converts git diff string outputs into structured, typed file hunks and line-mapped change records.
 */
export declare function parseGitDiff(rawDiff: string): ParsedDiff;
/**
 * Extracts added code chunks with line number mapping for focused LLM evaluation.
 */
export declare function extractAddedCodeBlocks(file: DiffFile): Array<{
    startLine: number;
    endLine: number;
    code: string;
    contextHeader?: string;
}>;
