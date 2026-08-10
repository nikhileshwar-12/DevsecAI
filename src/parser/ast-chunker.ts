import { DiffFile, CodeBlockContext } from '../types/index.js';
import { extractAddedCodeBlocks } from './diff-parser.js';

/**
 * AST Context Extractor
 * Identifies enclosing scope boundaries (functions, classes, route handlers)
 * to enrich diff hunks with essential surrounding code architecture.
 */
export class ASTContextChunker {
  /**
   * Enriches raw diff blocks with enclosing semantic context (functions, classes, decorators)
   */
  public static extractContextualBlocks(file: DiffFile): CodeBlockContext[] {
    const rawBlocks = extractAddedCodeBlocks(file);
    const contextualBlocks: CodeBlockContext[] = [];

    for (const block of rawBlocks) {
      const functionName = this.inferFunctionName(block.code, block.contextHeader);
      const className = this.inferClassName(block.code, block.contextHeader);

      contextualBlocks.push({
        filePath: file.newPath,
        functionName,
        className,
        startLine: block.startLine,
        endLine: block.endLine,
        code: block.code,
      });
    }

    return contextualBlocks;
  }

  /**
   * Infers function name from code signatures and hunk headers
   */
  private static inferFunctionName(code: string, contextHeader?: string): string | undefined {
    // 1. Check hunk header regex (e.g., function foo(...) or class Bar)
    if (contextHeader) {
      const headerMatch = contextHeader.match(/(?:function\s+([a-zA-Z0-9_$]+)|([a-zA-Z0-9_$]+)\s*\(|const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\()/);
      if (headerMatch) {
        return headerMatch[1] || headerMatch[2] || headerMatch[3];
      }
    }

    // 2. Check within the code chunk
    const fnRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>|(?:async\s+)?([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{/m;
    const match = code.match(fnRegex);
    if (match) {
      return match[1] || match[2] || match[3];
    }

    return undefined;
  }

  /**
   * Infers class name from code signatures and hunk headers
   */
  private static inferClassName(code: string, contextHeader?: string): string | undefined {
    if (contextHeader) {
      const headerMatch = contextHeader.match(/class\s+([a-zA-Z0-9_$]+)/);
      if (headerMatch) return headerMatch[1];
    }

    const classRegex = /(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/;
    const match = code.match(classRegex);
    if (match) {
      return match[1];
    }

    return undefined;
  }
}
