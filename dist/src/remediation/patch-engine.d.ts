import { ReviewFinding, RemediationPatch, GeneratedUnitTest } from '../types/index.js';
/**
 * Autonomous Auto-Remediation & Patch Engine
 * Applies suggested fixes to vulnerable AST nodes, generates standard Git .patch diffs,
 * and creates automated fix branches verified against synthesized Vitest unit tests.
 */
export declare class RemediationPatchEngine {
    /**
     * Generates remediation patches for all actionable findings in a PR
     */
    static generatePatches(findings: ReviewFinding[], prId?: string, unitTests?: GeneratedUnitTest[]): RemediationPatch[];
    /**
     * Formats a standard Git unified patch string
     */
    private static createUnifiedPatch;
    /**
     * Generates a combined master patch for all findings in the PR
     */
    static generateMasterPatch(patches: RemediationPatch[]): string;
}
