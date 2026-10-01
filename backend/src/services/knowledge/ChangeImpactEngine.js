/**
 * Change Impact Engine
 * Traces downstream dependencies and potential ripple effects of detected modifications.
 * Adheres strictly to cautious probabilistic phrasing ("potentially affected", "may require review", "dependency detected").
 */

export class ChangeImpactEngine {
  /**
   * Identifies downstream technical, architectural, or domain dependencies that may be affected by changes.
   */
  static analyzeImpact({ changes = [], context = 'software_specification' }) {
    const impactChains = [];
    const affectedComponentsSummary = new Map();

    const domainRuleMatrix = [
      {
        keywordMatch: /concurrent users|capacity|throughput|qps|load|rps/i,
        component: 'System Scalability & Capacity',
        downstreamChain: [
          { component: 'Infrastructure Sizing', note: 'May require review of server compute, RAM, and replica provisioning' },
          { component: 'Database Connection Pool', note: 'Potentially affected if concurrent transactional traffic scales proportionally' },
          { component: 'Load Balancing & Rate Limiter', note: 'Dependency detected in throttle thresholds and ingress gateway limits' },
          { component: 'Performance & Stress Tests', note: 'Automated test scenarios may need recalibration for new load targets' }
        ]
      },
      {
        keywordMatch: /api|endpoint|request schema|payload|json response|parameter/i,
        component: 'API Interface Contract',
        downstreamChain: [
          { component: 'Request Validation Layer', note: 'May require review: schema validation rules should be updated to match new parameters' },
          { component: 'Frontend Client Forms & State', note: 'Potentially affected where user inputs bind to API endpoints' },
          { component: 'Database Schema & Serializers', note: 'May require review if newly introduced payload fields are persisted' },
          { component: 'Contract & Integration Tests', note: 'May require review: automated API contract test assertions should be updated' }
        ]
      },
      {
        keywordMatch: /database|table|column|migration|sql|postgres|index|foreign key/i,
        component: 'Data Persistence Layer',
        downstreamChain: [
          { component: 'Database Migration Scripts', note: 'Migration scripts may require forward and rollback testing' },
          { component: 'ORM / Query Models', note: 'Potentially affected queries and data access objects' },
          { component: 'Data Integrity & Referential Constraints', note: 'Dependency detected in relational integrity checks' },
          { component: 'Analytics & Reporting Pipelines', note: 'Downstream aggregations and views may require alignment' }
        ]
      },
      {
        keywordMatch: /auth|permission|role|jwt|login|access control|token/i,
        component: 'Authentication & Security Boundary',
        downstreamChain: [
          { component: 'Authorization Guards & Middleware', note: 'Route protection and role checks may require review' },
          { component: 'Session Storage & Token Handling', note: 'Potentially affected in client credential lifecycle' },
          { component: 'Security Audit & Compliance', note: 'Access control policy changes may require security review' }
        ]
      },
      {
        keywordMatch: /latency|response time|speed|render|performance|cache/i,
        component: 'Response Performance & SLA',
        downstreamChain: [
          { component: 'Caching Strategy', note: 'Cache invalidation and TTL parameters may need adjustment' },
          { component: 'Client Rendering Lifecycle', note: 'Potentially affected UI responsiveness and loading indicators' },
          { component: 'Service Level Objective (SLO) Monitoring', note: 'Alerting thresholds may require update' }
        ]
      }
    ];

    for (const change of changes) {
      if (change.type === 'STABLE') continue;

      const changeText = `${change.previousStatement || ''} ${change.newStatement || ''} ${change.semanticDelta || ''}`;
      let matchedAny = false;

      for (const rule of domainRuleMatrix) {
        if (rule.keywordMatch.test(changeText)) {
          matchedAny = true;
          
          impactChains.push({
            triggerChangeId: change.id,
            triggerSummary: change.semanticDelta || change.newStatement || change.previousStatement,
            originComponent: rule.component,
            changeType: change.type,
            impactLevel: change.potentialImpact || 'Potentially significant',
            downstreamChain: rule.downstreamChain.map(link => ({
              ...link,
              status: 'May require review'
            }))
          });

          // Aggregate summary
          for (const item of rule.downstreamChain) {
            if (!affectedComponentsSummary.has(item.component)) {
              affectedComponentsSummary.set(item.component, {
                component: item.component,
                mentionCount: 1,
                sampleNote: item.note,
                status: 'Potential dependency detected'
              });
            } else {
              const existing = affectedComponentsSummary.get(item.component);
              existing.mentionCount++;
            }
          }
        }
      }

      if (!matchedAny) {
        // Generic architectural fallback chain
        impactChains.push({
          triggerChangeId: change.id,
          triggerSummary: change.semanticDelta || change.newStatement || change.previousStatement,
          originComponent: change.category || 'General Specification',
          changeType: change.type,
          impactLevel: 'Moderate review recommended',
          downstreamChain: [
            { component: 'Functional Documentation', note: 'May require review to maintain specification parity' },
            { component: 'Verification Test Cases', note: 'Test coverage should be verified for this modified requirement' }
          ]
        });
      }
    }

    return {
      totalImpactChains: impactChains.length,
      potentiallyAffectedComponents: Array.from(affectedComponentsSummary.values()),
      chains: impactChains
    };
  }
}

export default ChangeImpactEngine;
