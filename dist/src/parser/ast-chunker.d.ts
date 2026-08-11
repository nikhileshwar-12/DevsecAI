import { DiffFile, CodeBlockContext } from '../types/index.js';
/**
 * AST Context Extractor
 * Identifies enclosing scope boundaries (functions, classes, route handlers)
 * to enrich diff hunks with essential surrounding code architecture.
 */
export declare class ASTContextChunker {
    /**
     * Enriches raw diff blocks with enclosing semantic context (functions, classes, decorators)
     */
    static extractContextualBlocks(file: DiffFile): CodeBlockContext[];
    /**
     * Infers function name from code signatures and hunk headers
     */
    private static inferFunctionName;
    /**
     * Infers class name from code signatures and hunk headers
     */
    private static inferClassName;
}
