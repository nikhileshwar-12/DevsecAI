import { GitHubWebhookPayload } from '../types/index.js';
/**
 * GitHub Webhook Signature Validator & Payload Processor
 */
export declare class GitHubWebhookHandler {
    /**
     * Cryptographically verifies GitHub x-hub-signature-256 using HMAC SHA256
     * and timingSafeEqual to prevent side-channel timing attacks.
     */
    static verifySignature(rawBody: string, signatureHeader?: string): boolean;
    /**
     * Determines if webhook event is actionable for code review
     */
    static isReviewablePREvent(event: string, payload: any): boolean;
    /**
     * Formats PR details from payload
     */
    static parsePayload(payload: any): GitHubWebhookPayload;
}
