import { RepositoryGuideline } from '../types/index.js';
export declare class RepoMemoryStore {
    private static defaultGuidelines;
    static getApplicableGuidelines(_repoName?: string): Promise<RepositoryGuideline[]>;
}
