import { RepositoryGuideline } from '../types/index.js';
/**
 * Team Architecture & Security Policy Studio Engine
 * Manages custom organizational rules, compliance standards, and vector memory embeddings.
 */
export declare class PolicyEngine {
    private static policies;
    static getPolicies(): RepositoryGuideline[];
    static getActivePolicies(): RepositoryGuideline[];
    static addPolicy(policy: Omit<RepositoryGuideline, 'id'>): RepositoryGuideline;
    static togglePolicy(id: string): boolean;
    static deletePolicy(id: string): boolean;
}
