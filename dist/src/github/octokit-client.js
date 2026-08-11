import { Octokit } from '@octokit/rest';
import { config } from '../config/env.js';
export class GitHubClient {
    octokit;
    constructor(token) {
        this.octokit = new Octokit({
            auth: token || config.GITHUB_TOKEN || '',
        });
    }
    /**
     * Fetches raw diff text for a given PR from GitHub
     */
    async fetchPullRequestDiff(owner, repo, pullNumber) {
        try {
            const response = await this.octokit.pulls.get({
                owner,
                repo,
                pull_number: pullNumber,
                mediaType: {
                    format: 'diff',
                },
            });
            return response.data;
        }
        catch (error) {
            console.error(`[GitHubClient] Failed to fetch PR diff for ${owner}/${repo}#${pullNumber}:`, error.message);
            throw error;
        }
    }
    /**
     * Posts comprehensive PR review with summary comment and inline code annotations
     */
    async submitPRReview(owner, repo, pullNumber, commitSha, reviewResult) {
        if (!config.GITHUB_TOKEN) {
            console.log('[GitHubClient] GITHUB_TOKEN not provided — skipping live GitHub API post (demo mode)');
            return;
        }
        try {
            const event = reviewResult.decision === 'REQUEST_CHANGES'
                ? 'REQUEST_CHANGES'
                : reviewResult.decision === 'APPROVED'
                    ? 'APPROVE'
                    : 'COMMENT';
            // Prepare inline comments for GitHub API
            const comments = reviewResult.findings.map((finding) => ({
                path: finding.file,
                line: finding.line,
                body: `### 🛡️ DevSecAI [${finding.severity.toUpperCase()}] Finding\n\n**${finding.title}**\n\n${finding.description}\n\n${finding.suggestedFix ? `**Suggested Resolution:**\n\`\`\`typescript\n${finding.suggestedFix}\n\`\`\`` : ''}`,
            }));
            await this.octokit.pulls.createReview({
                owner,
                repo,
                pull_number: pullNumber,
                commit_id: commitSha,
                body: reviewResult.summary,
                event: event,
                comments: comments.slice(0, 10), // GitHub batch limit safeguard
            });
            console.log(`[GitHubClient] Successfully posted review to ${owner}/${repo}#${pullNumber}!`);
        }
        catch (error) {
            console.error(`[GitHubClient] Error submitting review:`, error.message);
        }
    }
}
