import { PRReviewResult, ReviewFinding } from '../types/index.js';

/**
 * OASIS Static Analysis Results Interchange Format (SARIF) v2.1.0 Exporter
 * Fully compliant with GitHub Advanced Security & Code Scanning tabs.
 */
export class SarifExporter {
  public static exportToSarif(reviewResult: PRReviewResult): Record<string, any> {
    const rulesMap = new Map<string, any>();

    // Build distinct rules
    for (const finding of reviewResult.findings) {
      const ruleId = finding.cwe ? finding.cwe.split(':')[0].trim() : `DEVSEC-${finding.category.toUpperCase()}`;
      if (!rulesMap.has(ruleId)) {
        rulesMap.set(ruleId, {
          id: ruleId,
          name: finding.title.replace(/[^a-zA-Z0-9]/g, ''),
          shortDescription: {
            text: finding.title,
          },
          fullDescription: {
            text: finding.description,
          },
          defaultConfiguration: {
            level: this.mapSeverityToSarifLevel(finding.severity),
          },
          help: {
            text: `Vulnerability: ${finding.title}\nCWE: ${finding.cwe || 'N/A'}\nSuggested Fix:\n${finding.suggestedFix}`,
            markdown: `### ${finding.title}\n\n**Description:** ${finding.description}\n\n**Suggested Resolution:**\n\`\`\`typescript\n${finding.suggestedFix}\n\`\`\``,
          },
          properties: {
            precision: 'very-high',
            tags: [finding.category, finding.cwe || 'security'],
          },
        });
      }
    }

    // Build results list
    const results = reviewResult.findings.map(finding => {
      const ruleId = finding.cwe ? finding.cwe.split(':')[0].trim() : `DEVSEC-${finding.category.toUpperCase()}`;
      return {
        ruleId,
        level: this.mapSeverityToSarifLevel(finding.severity),
        message: {
          text: `[DevSecAI] ${finding.title}: ${finding.description}`,
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: finding.file,
                uriBaseId: '%SRCROOT%',
              },
              region: {
                startLine: finding.line,
                endLine: finding.endLine || finding.line + Math.max(1, finding.codeSnippet.split('\n').length - 1),
                snippet: {
                  text: finding.codeSnippet,
                },
              },
            },
          },
        ],
        fixes: finding.suggestedFix ? [
          {
            description: {
              text: 'Apply DevSecAI automated remediation patch',
            },
            replacementChanges: [
              {
                deletedRegion: {
                  startLine: finding.line,
                  endLine: finding.endLine || finding.line + Math.max(1, finding.codeSnippet.split('\n').length - 1),
                },
                insertedContent: {
                  text: finding.suggestedFix,
                },
              },
            ],
          },
        ] : undefined,
      };
    });

    return {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'DevSecAI Multi-Agent Security Engine',
              version: '1.0.0',
              informationUri: 'https://github.com/nikhileshwar-12/DevsecAI',
              rules: Array.from(rulesMap.values()),
            },
          },
          invocations: [
            {
              executionSuccessful: true,
              endTimeUtc: new Date().toISOString(),
            },
          ],
          results,
        },
      ],
    };
  }

  private static mapSeverityToSarifLevel(severity: string): 'error' | 'warning' | 'note' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      case 'info':
      default:
        return 'note';
    }
  }
}
