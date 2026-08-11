import { PRReviewResult, RepositoryGuideline } from '../types/index.js';
export interface PipelineOptions {
    prId?: string;
    repoName?: string;
    prTitle?: string;
    prAuthor?: string;
    guidelines?: RepositoryGuideline[];
}
export declare class ReviewPipelineOrchestrator {
    /**
     * Executes full autonomous multi-agent code review pipeline on raw git diff
     */
    static execute(rawDiff: string, options?: PipelineOptions): Promise<PRReviewResult>;
}
