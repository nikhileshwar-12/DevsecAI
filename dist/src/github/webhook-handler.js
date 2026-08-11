import crypto from 'node:crypto';
import { config } from '../config/env.js';
/**
 * GitHub Webhook Signature Validator & Payload Processor
 */
export class GitHubWebhookHandler {
    /**
     * Cryptographically verifies GitHub x-hub-signature-256 using HMAC SHA256
     * and timingSafeEqual to prevent side-channel timing attacks.
     */
    static verifySignature(rawBody, signatureHeader) {
        if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
            return false;
        }
        const secret = config.GITHUB_WEBHOOK_SECRET;
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(rawBody);
        const expectedSignature = `sha256=${hmac.digest('hex')}`;
        const signatureBuffer = Buffer.from(signatureHeader);
        const expectedBuffer = Buffer.from(expectedSignature);
        if (signatureBuffer.length !== expectedBuffer.length) {
            return false;
        }
        return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    }
    /**
     * Determines if webhook event is actionable for code review
     */
    static isReviewablePREvent(event, payload) {
        if (event !== 'pull_request')
            return false;
        const action = payload.action;
        return action === 'opened' || action === 'synchronize' || action === 'reopened';
    }
    /**
     * Formats PR details from payload
     */
    static parsePayload(payload) {
        return payload;
    }
}
