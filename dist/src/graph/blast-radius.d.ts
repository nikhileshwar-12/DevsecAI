import { ReviewFinding, BlastRadiusAnalysis } from '../types/index.js';
/**
 * Security Blast-Radius & Component Dependency Analyzer
 * Maps the downstream propagation of flagged vulnerabilities to API routes,
 * database models, and dependent microservices.
 */
export declare class BlastRadiusAnalyzer {
    static analyze(findings: ReviewFinding[]): BlastRadiusAnalysis;
}
