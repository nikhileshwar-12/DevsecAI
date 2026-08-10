import { ParsedDiff, DiffFile, DiffHunk, DiffLine } from '../types/index.js';

/**
 * High-performance pure TypeScript Unified Diff Parser
 * Converts git diff string outputs into structured, typed file hunks and line-mapped change records.
 */
export function parseGitDiff(rawDiff: string): ParsedDiff {
  if (!rawDiff || rawDiff.trim() === '') {
    return {
      files: [],
      totalAdditions: 0,
      totalDeletions: 0,
      fileCount: 0,
    };
  }

  const lines = rawDiff.split(/\r?\n/);
  const files: DiffFile[] = [];
  
  let currentFile: Partial<DiffFile> | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLineCounter = 0;
  let newLineCounter = 0;
  let currentRawDiffLines: string[] = [];

  let totalAdditions = 0;
  let totalDeletions = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // File header: diff --git a/path b/path
    if (line.startsWith('diff --git')) {
      if (currentFile && currentFile.newPath) {
        if (currentHunk) {
          currentFile.hunks = currentFile.hunks || [];
          currentFile.hunks.push(currentHunk);
          currentHunk = null;
        }
        currentFile.rawDiff = currentRawDiffLines.join('\n');
        files.push(currentFile as DiffFile);
      }

      const match = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
      const oldPath = match ? match[1] : 'unknown';
      const newPath = match ? match[2] : 'unknown';

      currentFile = {
        oldPath,
        newPath,
        isNew: false,
        isDeleted: false,
        isRenamed: oldPath !== newPath && oldPath !== 'unknown',
        hunks: [],
        rawDiff: '',
        additions: 0,
        deletions: 0,
      };
      currentRawDiffLines = [line];
      continue;
    }

    if (!currentFile) {
      // In case diff starts without "diff --git" (e.g. standard patch)
      if (line.startsWith('--- a/')) {
        currentFile = {
          oldPath: line.substring(6),
          newPath: 'unknown',
          isNew: false,
          isDeleted: false,
          isRenamed: false,
          hunks: [],
          rawDiff: '',
          additions: 0,
          deletions: 0,
        };
        currentRawDiffLines = [line];
        continue;
      }
    }

    if (currentFile) {
      currentRawDiffLines.push(line);

      if (line.startsWith('new file mode')) {
        currentFile.isNew = true;
      } else if (line.startsWith('deleted file mode')) {
        currentFile.isDeleted = true;
      } else if (line.startsWith('--- a/')) {
        currentFile.oldPath = line.substring(6);
      } else if (line.startsWith('+++ b/')) {
        currentFile.newPath = line.substring(6);
      } else if (line.startsWith('@@ ')) {
        // Hunk header: @@ -oldStart,oldLen +newStart,newLen @@ [optional section title]
        if (currentHunk) {
          currentFile.hunks = currentFile.hunks || [];
          currentFile.hunks.push(currentHunk);
        }

        const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
        if (hunkMatch) {
          const oldStart = parseInt(hunkMatch[1], 10);
          const oldLines = hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1;
          const newStart = parseInt(hunkMatch[3], 10);
          const newLines = hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1;
          const header = hunkMatch[5]?.trim() || '';

          oldLineCounter = oldStart;
          newLineCounter = newStart;

          currentHunk = {
            oldStart,
            oldLines,
            newStart,
            newLines,
            header,
            lines: [],
          };
        }
      } else if (currentHunk) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          const diffLine: DiffLine = {
            type: 'add',
            newLineNumber: newLineCounter++,
            content: line.substring(1),
          };
          currentHunk.lines.push(diffLine);
          currentFile.additions = (currentFile.additions || 0) + 1;
          totalAdditions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          const diffLine: DiffLine = {
            type: 'del',
            oldLineNumber: oldLineCounter++,
            content: line.substring(1),
          };
          currentHunk.lines.push(diffLine);
          currentFile.deletions = (currentFile.deletions || 0) + 1;
          totalDeletions++;
        } else if (line.startsWith(' ') || line === '') {
          const diffLine: DiffLine = {
            type: 'normal',
            oldLineNumber: oldLineCounter++,
            newLineNumber: newLineCounter++,
            content: line.startsWith(' ') ? line.substring(1) : line,
          };
          currentHunk.lines.push(diffLine);
        }
      }
    }
  }

  // Push final file and hunk
  if (currentFile && currentFile.newPath) {
    if (currentHunk) {
      currentFile.hunks = currentFile.hunks || [];
      currentFile.hunks.push(currentHunk);
    }
    currentFile.rawDiff = currentRawDiffLines.join('\n');
    files.push(currentFile as DiffFile);
  }

  return {
    files,
    totalAdditions,
    totalDeletions,
    fileCount: files.length,
  };
}

/**
 * Extracts added code chunks with line number mapping for focused LLM evaluation.
 */
export function extractAddedCodeBlocks(file: DiffFile): Array<{ startLine: number; endLine: number; code: string; contextHeader?: string }> {
  const blocks: Array<{ startLine: number; endLine: number; code: string; contextHeader?: string }> = [];

  for (const hunk of file.hunks) {
    let currentBlock: { startLine: number; endLine: number; lines: string[]; contextHeader?: string } | null = null;

    for (const line of hunk.lines) {
      if (line.type === 'add' && line.newLineNumber !== undefined) {
        if (!currentBlock) {
          currentBlock = {
            startLine: line.newLineNumber,
            endLine: line.newLineNumber,
            lines: [line.content],
            contextHeader: hunk.header,
          };
        } else {
          currentBlock.endLine = line.newLineNumber;
          currentBlock.lines.push(line.content);
        }
      } else {
        if (currentBlock) {
          blocks.push({
            startLine: currentBlock.startLine,
            endLine: currentBlock.endLine,
            code: currentBlock.lines.join('\n'),
            contextHeader: currentBlock.contextHeader,
          });
          currentBlock = null;
        }
      }
    }

    if (currentBlock) {
      blocks.push({
        startLine: currentBlock.startLine,
        endLine: currentBlock.endLine,
        code: currentBlock.lines.join('\n'),
        contextHeader: currentBlock.contextHeader,
      });
    }
  }

  return blocks;
}
