import { PRReviewResult } from '../types/index.js';
/**
 * OASIS Static Analysis Results Interchange Format (SARIF) v2.1.0 Exporter
 * Fully compliant with GitHub Advanced Security & Code Scanning tabs.
 */
export declare class SarifExporter {
    static exportToSarif(reviewResult: PRReviewResult): Record<string, any>;
    private static mapSeverityToSarifLevel;
}
