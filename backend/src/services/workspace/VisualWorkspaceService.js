import pool from '../../config/db.js';
import { generateCustomId } from '../../utils/idUtils.js';
import EvidenceEngine from '../evidence/EvidenceEngine.js';
import VisualComparisonEngine from '../comparison/VisualComparisonEngine.js';
import CrossVisualConsistencyEngine from '../consistency/CrossVisualConsistencyEngine.js';
import VisualQAEngine from '../visualqa/VisualQAEngine.js';
import RelevanceEngine from '../relevance/RelevanceEngine.js';

export class VisualWorkspaceService {
  constructor() {
    this.inMemoryWorkspaces = new Map(); // workspaceId -> workspaceObj
  }

  /**
   * Creates a multi-visual intelligence workspace.
   */
  async createWorkspace(userEmail = 'guest@insightlens.edu', data = {}) {
    const workspaceId = generateCustomId('WKS');
    const name = data.name || 'Visual Intelligence Workspace';
    const intent = data.intent || 'General Understanding';
    const artifacts = data.artifacts || [];

    const workspaceObj = {
      id: workspaceId,
      workspaceId,
      userEmail,
      name,
      intent,
      artifacts,
      evidenceReport: { status: 'INITIALIZED', totalArtifacts: artifacts.length },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (pool) {
      try {
        await pool.query(`
          INSERT INTO visual_workspaces (id, user_email, name, intent, artifacts_json, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            intent = EXCLUDED.intent,
            artifacts_json = EXCLUDED.artifacts_json,
            updated_at = NOW();
        `, [workspaceId, userEmail, name, intent, JSON.stringify(artifacts)]);
      } catch (err) {
        console.warn('[VisualWorkspaceService.createWorkspace] DB notice:', err.message);
      }
    }

    this.inMemoryWorkspaces.set(workspaceId, workspaceObj);
    return workspaceObj;
  }

  /**
   * Retrieves workspace data and computes real-time cross-visual intelligence.
   */
  async getWorkspaceIntelligence(workspaceId, userEmail = 'guest@insightlens.edu') {
    let workspace = this.inMemoryWorkspaces.get(workspaceId);

    if (!workspace && pool) {
      try {
        const { rows } = await pool.query('SELECT * FROM visual_workspaces WHERE id = $1', [workspaceId]);
        if (rows.length > 0) {
          workspace = {
            id: rows[0].id,
            userEmail: rows[0].user_email,
            name: rows[0].name,
            intent: rows[0].intent,
            artifacts: rows[0].artifacts_json || [],
            createdAt: rows[0].created_at,
            updatedAt: rows[0].updated_at
          };
          this.inMemoryWorkspaces.set(workspaceId, workspace);
        }
      } catch (err) {
        console.warn('[VisualWorkspaceService.getWorkspaceIntelligence] DB notice:', err.message);
      }
    }

    if (!workspace) {
      // Default sandbox workspace
      workspace = {
        id: workspaceId,
        userEmail,
        name: 'Active Multi-Visual Workspace',
        intent: 'General Understanding',
        artifacts: []
      };
    }

    const artifacts = workspace.artifacts || [];

    // 1. Process individual evidence and relevance per artifact
    const processedArtifacts = artifacts.map(art => {
      const ev = EvidenceEngine.extractAndLinkEvidence(art);
      const prioritizedFindings = RelevanceEngine.prioritizeFindings(art.findings || art.claims || [], workspace.intent);
      return {
        ...art,
        evidenceList: ev.evidence,
        linkedClaims: ev.linkedClaims,
        prioritizedFindings
      };
    });

    // 2. Evaluate cross-visual consistency
    const consistencyReport = artifacts.length >= 2 
      ? CrossVisualConsistencyEngine.evaluateConsistency(artifacts)
      : null;

    // 3. Evaluate comparative diff if at least 2 artifacts
    const comparisonReport = artifacts.length >= 2
      ? VisualComparisonEngine.compareVisuals(artifacts[0], artifacts[1], { intent: workspace.intent })
      : null;

    return {
      workspaceId: workspace.id,
      name: workspace.name,
      intent: workspace.intent,
      artifactCount: artifacts.length,
      artifacts: processedArtifacts,
      consistency: consistencyReport,
      comparison: comparisonReport,
      summary: {
        totalEvidenceItems: processedArtifacts.reduce((acc, a) => acc + (a.evidenceList?.length || 0), 0),
        consistencyStatus: consistencyReport ? consistencyReport.overallStatus : 'INSUFFICIENT_ARTIFACTS',
        potentialConflicts: consistencyReport ? consistencyReport.conflictCount : 0
      }
    };
  }

  /**
   * Executes evidence-grounded Q&A against a workspace or single visual artifact.
   */
  askVisualQuestion(artifactOrWorkspace, query) {
    return VisualQAEngine.answerQuery(artifactOrWorkspace, query);
  }
}

export default new VisualWorkspaceService();
