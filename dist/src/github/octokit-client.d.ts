import { PRReviewResult } from '../types/index.js';
export declare class GitHubClient {
    private octokit;
    constructor(token?: string);
    /**
     * Fetches raw diff text for a given PR from GitHub
     */
    fetchPullRequestDiff(owner: string, repo: string, pullNumber: number): Promise<string>;
    /**
     * Posts comprehensive PR review with summary comment and inline code annotations
     */
    submitPRReview(owner: string, repo: string, pullNumber: number, commitSha: string, reviewResult: PRReviewResult): Promise<void>;
}
