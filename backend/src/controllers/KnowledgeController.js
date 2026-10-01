import KnowledgeEvolutionEngine from '../services/knowledge/KnowledgeEvolutionEngine.js';
import ChangeImpactEngine from '../services/knowledge/ChangeImpactEngine.js';
import AssumptionStressTester from '../services/knowledge/AssumptionStressTester.js';
import DevilsAdvocateEngine from '../services/knowledge/DevilsAdvocateEngine.js';
import KnowledgeService from '../services/knowledge/KnowledgeService.js';
import pool from '../config/db.js';
import { sendSuccess, sendError, APIError } from '../utils/apiUtils.js';

class KnowledgeController {
  /**
   * Overview Dashboard Stats
   */
  async getOverview(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const stats = await KnowledgeService.getOverviewStats(userEmail);
      return sendSuccess(res, stats, 'Knowledge overview retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Semantic Change Detection & Evolution Analysis (Time Machine)
   */
  async analyzeEvolution(req, res, next) {
    try {
      const { sourceA, sourceB, title = 'Document Evolution Analysis', sourceALabel = 'Version 1', sourceBLabel = 'Version 2', projectId = null } = req.body;
      if (!sourceA || !sourceB) {
        throw new APIError('Both sourceA and sourceB document contents are required for evolution analysis.', 400, 'KnowledgeController');
      }

      const analysis = KnowledgeEvolutionEngine.analyze({ sourceA, sourceB, title, sourceALabel, sourceBLabel });
      
      // Auto-compute downstream impact for convenience
      const impactAnalysis = ChangeImpactEngine.analyzeImpact({ changes: analysis.changes });
      analysis.impactSummary = impactAnalysis;

      // Persist to PostgreSQL
      if (pool) {
        try {
          const userEmail = req.user?.email || 'guest@insightlens.edu';
          const recordId = `EVO-${Date.now().toString(36).toUpperCase()}`;
          await pool.query(`
            INSERT INTO knowledge_evolution_analyses (id, user_email, project_id, title, source_a_label, source_b_label, change_metrics, semantic_changes, impact_graph)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            recordId,
            userEmail,
            projectId,
            title,
            sourceALabel,
            sourceBLabel,
            JSON.stringify(analysis.metrics),
            JSON.stringify(analysis.changes),
            JSON.stringify(impactAnalysis)
          ]);
          analysis.id = recordId;
        } catch (dbErr) {
          console.warn('[KnowledgeController] Evolution persistence notice:', dbErr.message);
        }
      }

      return sendSuccess(res, analysis, 'Knowledge evolution analyzed successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * List Saved Evolution Analyses
   */
  async listEvolution(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const items = await KnowledgeService.listEvolutionAnalyses(userEmail);
      return sendSuccess(res, items, 'Evolution analyses listed successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Single Evolution Analysis
   */
  async getEvolutionById(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const item = await KnowledgeService.getEvolutionAnalysis(req.params.id, userEmail);
      if (!item) {
        throw new APIError('Evolution analysis record not found.', 404, 'KnowledgeController');
      }
      return sendSuccess(res, item, 'Evolution analysis retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete Evolution Analysis
   */
  async deleteEvolution(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const success = await KnowledgeService.deleteEvolutionAnalysis(req.params.id, userEmail);
      return sendSuccess(res, { deleted: success }, 'Evolution analysis deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Downstream Change Impact Analysis
   */
  async analyzeImpact(req, res, next) {
    try {
      const { changes = [], context = 'software_specification' } = req.body;
      const impact = ChangeImpactEngine.analyzeImpact({ changes, context });
      return sendSuccess(res, impact, 'Change impact analyzed successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Analyze Knowledge Gaps
   */
  async analyzeGaps(req, res, next) {
    try {
      const { text = '', reportId = null, projectId = null } = req.body;
      if (!text.trim()) {
        throw new APIError('Text content or report data is required for knowledge gap detection.', 400, 'KnowledgeController');
      }
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const gaps = await KnowledgeService.analyzeKnowledgeGaps({ text, reportId, projectId, userEmail });
      return sendSuccess(res, gaps, 'Knowledge gaps analyzed and cataloged successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * List Knowledge Gaps
   */
  async listGaps(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const filters = {
        status: req.query.status || 'ALL',
        gap_type: req.query.gap_type || 'ALL'
      };
      const gaps = await KnowledgeService.listGaps(userEmail, filters);
      return sendSuccess(res, gaps, 'Knowledge gaps listed successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create Manual Knowledge Gap
   */
  async createGap(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const gap = await KnowledgeService.createGap(userEmail, req.body);
      return sendSuccess(res, gap, 'Knowledge gap created successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update Knowledge Gap Status & Notes
   */
  async updateGap(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const gap = await KnowledgeService.updateGap(req.params.id, userEmail, req.body);
      if (!gap) {
        throw new APIError('Knowledge gap record not found.', 404, 'KnowledgeController');
      }
      return sendSuccess(res, gap, 'Knowledge gap updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete Knowledge Gap
   */
  async deleteGap(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const success = await KnowledgeService.deleteGap(req.params.id, userEmail);
      return sendSuccess(res, { deleted: success }, 'Knowledge gap deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * List Decisions from Decision Memory
   */
  async listDecisions(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const filters = { status: req.query.status || 'ALL' };
      const decisions = await KnowledgeService.listDecisions(userEmail, filters);
      return sendSuccess(res, decisions, 'Decisions listed successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create New Decision
   */
  async createDecision(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      if (!req.body.decision || !req.body.reason) {
        throw new APIError('Both decision statement and reason are required.', 400, 'KnowledgeController');
      }
      const decision = await KnowledgeService.createDecision(userEmail, req.body);
      return sendSuccess(res, decision, 'Decision record created successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update Decision
   */
  async updateDecision(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const decision = await KnowledgeService.updateDecision(req.params.id, userEmail, req.body);
      if (!decision) {
        throw new APIError('Decision record not found.', 404, 'KnowledgeController');
      }
      return sendSuccess(res, decision, 'Decision record updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Validate Decision ("IS THIS DECISION STILL VALID?")
   */
  async validateDecision(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const validation = await KnowledgeService.checkDecisionValidity(req.params.id, userEmail);
      return sendSuccess(res, validation, 'Decision validity assessed successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Domino Graph
   */
  async getGraph(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const graph = await KnowledgeService.getGraph(userEmail, req.query.projectId);
      return sendSuccess(res, graph, 'Domino graph retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Save Domino Graph Node
   */
  async saveGraphNode(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const node = await KnowledgeService.saveGraphNode(userEmail, req.body);
      return sendSuccess(res, node, 'Graph node saved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Save Domino Graph Edge
   */
  async saveGraphEdge(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const edge = await KnowledgeService.saveGraphEdge(userEmail, req.body);
      return sendSuccess(res, edge, 'Graph edge saved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Simulate What-If Scenario
   */
  async simulateWhatIf(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const simulation = await KnowledgeService.simulateWhatIf(userEmail, req.body);
      return sendSuccess(res, simulation, 'What-if scenario simulated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Generate Project Autopsy
   */
  async createAutopsy(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const autopsy = await KnowledgeService.generateAutopsy(userEmail, req.body);
      return sendSuccess(res, autopsy, 'Project autopsy generated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * List Project Autopsies
   */
  async listAutopsies(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const autopsies = await KnowledgeService.listAutopsies(userEmail);
      return sendSuccess(res, autopsies, 'Project autopsies listed successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Single Project Autopsy
   */
  async getAutopsyById(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const autopsy = await KnowledgeService.getAutopsy(req.params.id, userEmail);
      if (!autopsy) {
        throw new APIError('Project autopsy record not found.', 404, 'KnowledgeController');
      }
      return sendSuccess(res, autopsy, 'Project autopsy retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Assumption Stress Testing
   */
  async stressTestAssumptions(req, res, next) {
    try {
      const { documentText, claims = [], title = 'Assumption Stress Test' } = req.body;
      if (!documentText && (!claims || claims.length === 0)) {
        throw new APIError('Document text or claims array is required for assumption stress testing.', 400, 'KnowledgeController');
      }

      const result = AssumptionStressTester.testDocument({ documentText, claims, title });

      // Persist to PostgreSQL if configured
      if (pool) {
        try {
          const userEmail = req.user?.email || 'guest@insightlens.edu';
          const recordId = `ASM-${Date.now().toString(36).toUpperCase()}`;
          await pool.query(`
            INSERT INTO assumption_stress_tests (id, user_email, title, document_title, assumptions_count, assumptions_data)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            recordId,
            userEmail,
            title,
            title,
            result.metrics.totalAssumptions,
            JSON.stringify(result.assumptions)
          ]);
          result.id = recordId;
        } catch (dbErr) {
          console.warn('[KnowledgeController] Assumption persistence notice:', dbErr.message);
        }
      }

      return sendSuccess(res, result, 'Assumptions stress tested successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Adversarial Devil's Advocate & Claim Survival Review
   */
  async runAdversarialReview(req, res, next) {
    try {
      const { claims = [], conclusions = [], documentText = '', title = "Adversarial Devil's Advocate Review" } = req.body;
      if (!documentText && (!claims || claims.length === 0)) {
        throw new APIError('Document text or claims array is required for adversarial analysis.', 400, 'KnowledgeController');
      }

      const result = DevilsAdvocateEngine.runAnalysis({ claims, conclusions, documentText, title });

      // Persist to PostgreSQL if configured
      if (pool) {
        try {
          const userEmail = req.user?.email || 'guest@insightlens.edu';
          const recordId = `ADV-${Date.now().toString(36).toUpperCase()}`;
          await pool.query(`
            INSERT INTO adversarial_analyses (id, user_email, title, claims_analyzed, survival_tally, challenges_data)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            recordId,
            userEmail,
            title,
            result.totalClaimsEvaluated,
            JSON.stringify(result.survivalTally),
            JSON.stringify(result.attacks)
          ]);
          result.id = recordId;
        } catch (dbErr) {
          console.warn('[KnowledgeController] Adversarial persistence notice:', dbErr.message);
        }
      }

      return sendSuccess(res, result, "Adversarial review and claim survival analyzed successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Assumption -> Impact Graph Generator
   */
  async generateRelationshipGraph(req, res, next) {
    try {
      const { claims = [], attacks = [], documentText = '' } = req.body;
      const graph = DevilsAdvocateEngine.constructRelationshipGraph(claims, attacks, documentText);
      return sendSuccess(res, { graph }, 'Relationship graph constructed successfully');
    } catch (err) {
      next(err);
    }
  }
}

export default new KnowledgeController();
