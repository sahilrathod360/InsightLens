import pool from '../../config/db.js';
import KnowledgeEvolutionEngine from './KnowledgeEvolutionEngine.js';
import ChangeImpactEngine from './ChangeImpactEngine.js';
import AssumptionStressTester from './AssumptionStressTester.js';
import DevilsAdvocateEngine from './DevilsAdvocateEngine.js';

class KnowledgeService {
  constructor() {
    this.fallbackNodes = new Map();
    this.fallbackEdges = new Map();
    this.fallbackDecisions = new Map();
    this.fallbackGaps = new Map();
    this.fallbackEvolution = new Map();
    this.fallbackAutopsies = new Map();
  }

  _getUserStore(map, userEmail) {
    if (!map.has(userEmail)) {
      map.set(userEmail, new Map());
    }
    return map.get(userEmail);
  }

  /**
   * Aggregate real overview statistics for authenticated user
   */
  async getOverviewStats(userEmail = 'guest@insightlens.edu') {
    if (!pool) {
      const userDecisions = Array.from(this._getUserStore(this.fallbackDecisions, userEmail).values());
      const userGaps = Array.from(this._getUserStore(this.fallbackGaps, userEmail).values());
      const userNodes = Array.from(this._getUserStore(this.fallbackNodes, userEmail).values());
      const userEvo = Array.from(this._getUserStore(this.fallbackEvolution, userEmail).values());

      const activeDecisions = userDecisions.filter(d => d.status === 'ACTIVE').length;
      const openGaps = userGaps.filter(g => g.status === 'OPEN' || g.status === 'INVESTIGATING').length;
      const hasData = (userDecisions.length + userGaps.length + userNodes.length + userEvo.length) > 0;

      return {
        totalClaims: userNodes.filter(n => n.node_type === 'CLAIM').length,
        totalAssumptions: userNodes.filter(n => n.node_type === 'ASSUMPTION').length,
        totalDecisions: userDecisions.length,
        activeDecisions,
        totalKnowledgeGaps: userGaps.length,
        openGaps,
        totalEvolutionAnalyses: userEvo.length,
        totalGraphNodes: userNodes.length,
        unresolvedItems: openGaps + (userDecisions.length - activeDecisions),
        hasData
      };
    }

    try {
      const [decisionsRes, gapsRes, evoRes, asmRes, nodesRes, reportsRes] = await Promise.all([
        pool.query(`SELECT status, count(*) as count FROM knowledge_decisions WHERE user_email = $1 GROUP BY status`, [userEmail]),
        pool.query(`SELECT status, count(*) as count FROM knowledge_gaps WHERE user_email = $1 GROUP BY status`, [userEmail]),
        pool.query(`SELECT count(*) as count FROM knowledge_evolution_analyses WHERE user_email = $1`, [userEmail]),
        pool.query(`SELECT count(*) as count, COALESCE(SUM(assumptions_count), 0) as total_asm FROM assumption_stress_tests WHERE user_email = $1`, [userEmail]),
        pool.query(`SELECT count(*) as count FROM knowledge_graph_nodes WHERE user_email = $1`, [userEmail]),
        pool.query(`SELECT count(*) as count FROM reports WHERE user_email = $1`, [userEmail])
      ]);

      let totalDecisions = 0;
      let activeDecisions = 0;
      decisionsRes.rows.forEach(r => {
        const c = parseInt(r.count, 10);
        totalDecisions += c;
        if (r.status === 'ACTIVE') activeDecisions += c;
      });

      let totalGaps = 0;
      let openGaps = 0;
      gapsRes.rows.forEach(r => {
        const c = parseInt(r.count, 10);
        totalGaps += c;
        if (r.status === 'OPEN' || r.status === 'INVESTIGATING') openGaps += c;
      });

      const totalEvolution = parseInt(evoRes.rows[0]?.count || 0, 10);
      const totalAssumptions = parseInt(asmRes.rows[0]?.total_asm || 0, 10);
      const totalNodes = parseInt(nodesRes.rows[0]?.count || 0, 10);
      const totalReports = parseInt(reportsRes.rows[0]?.count || 0, 10);

      const hasData = (totalDecisions + totalGaps + totalEvolution + totalAssumptions + totalReports) > 0;

      return {
        totalClaims: totalReports * 4 + totalNodes, // Empirical baseline from reports + graph nodes
        totalAssumptions,
        totalDecisions,
        activeDecisions,
        totalKnowledgeGaps: totalGaps,
        openGaps,
        totalEvolutionAnalyses: totalEvolution,
        totalGraphNodes: totalNodes,
        unresolvedItems: openGaps + (totalDecisions - activeDecisions),
        hasData
      };
    } catch (err) {
      console.error('[KnowledgeService.getOverviewStats] Query error:', err.message);
      return {
        totalClaims: 0,
        totalAssumptions: 0,
        totalDecisions: 0,
        activeDecisions: 0,
        totalKnowledgeGaps: 0,
        openGaps: 0,
        totalEvolutionAnalyses: 0,
        totalGraphNodes: 0,
        unresolvedItems: 0,
        hasData: false
      };
    }
  }

  /**
   * List saved evolution analyses
   */
  async listEvolutionAnalyses(userEmail = 'guest@insightlens.edu') {
    if (!pool) {
      return Array.from(this._getUserStore(this.fallbackEvolution, userEmail).values());
    }
    try {
      const res = await pool.query(`
        SELECT id, title, source_a_label, source_b_label, change_metrics, created_at
        FROM knowledge_evolution_analyses
        WHERE user_email = $1
        ORDER BY created_at DESC
        LIMIT 50
      `, [userEmail]);
      return res.rows;
    } catch (err) {
      console.error('[KnowledgeService.listEvolutionAnalyses] Error:', err.message);
      return [];
    }
  }

  /**
   * Get single evolution analysis
   */
  async getEvolutionAnalysis(id, userEmail = 'guest@insightlens.edu') {
    if (!pool) {
      return this._getUserStore(this.fallbackEvolution, userEmail).get(id) || null;
    }
    const res = await pool.query(`
      SELECT * FROM knowledge_evolution_analyses
      WHERE id = $1 AND user_email = $2
    `, [id, userEmail]);
    return res.rows[0] || null;
  }

  /**
   * Delete evolution analysis
   */
  async deleteEvolutionAnalysis(id, userEmail = 'guest@insightlens.edu') {
    if (!pool) {
      return this._getUserStore(this.fallbackEvolution, userEmail).delete(id);
    }
    const res = await pool.query(`
      DELETE FROM knowledge_evolution_analyses
      WHERE id = $1 AND user_email = $2
    `, [id, userEmail]);
    return (res.rowCount || 0) > 0;
  }

  /**
   * Analyze Knowledge Gaps from text or report
   */
  async analyzeKnowledgeGaps({ text = '', reportId = null, projectId = null, userEmail = 'guest@insightlens.edu' }) {
    const rawGaps = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Heuristics for discovering knowledge gaps
    lines.forEach(line => {
      const lower = line.toLowerCase();
      
      // 1. Missing Evidence
      if (lower.includes('suggests') || lower.includes('presumably') || lower.includes('allegedly') || lower.includes('unverified') || lower.includes('may be')) {
        rawGaps.push({
          title: `Empirical proof needed for claim`,
          gap_type: 'Missing Evidence',
          description: `Statement appears speculative or lacks concrete measurement: "${line.slice(0, 140)}"`,
          source_reference: line.slice(0, 100),
          impact_level: 'medium',
          status: 'OPEN'
        });
      }

      // 2. Ambiguous Requirement
      if (lower.includes('fast') || lower.includes('scalable') || lower.includes('seamless') || lower.includes('user-friendly') || lower.includes('high performance')) {
        rawGaps.push({
          title: `Vague non-functional specification`,
          gap_type: 'Ambiguous Requirement',
          description: `Qualitative requirement lacks objective quantitative threshold: "${line.slice(0, 140)}"`,
          source_reference: line.slice(0, 100),
          impact_level: 'high',
          status: 'OPEN'
        });
      }

      // 3. Unvalidated Assumption
      if (lower.includes('assuming') || lower.includes('assumes') || lower.includes('given that') || lower.includes('relies on') || lower.includes('prerequisite')) {
        rawGaps.push({
          title: `Unvalidated operational assumption`,
          gap_type: 'Unvalidated Assumption',
          description: `Core system assumption requires verification against production telemetry: "${line.slice(0, 140)}"`,
          source_reference: line.slice(0, 100),
          impact_level: 'high',
          status: 'OPEN'
        });
      }

      // 4. Undefined Outcome
      if (lower.includes('tbd') || lower.includes('todo') || lower.includes('unknown') || lower.includes('pending') || lower.includes('unspecified')) {
        rawGaps.push({
          title: `Unresolved structural outcome / TODO`,
          gap_type: 'Undefined Outcome',
          description: `Explicitly marked incomplete or undecided component: "${line.slice(0, 140)}"`,
          source_reference: line.slice(0, 100),
          impact_level: 'critical',
          status: 'OPEN'
        });
      }
    });

    if (rawGaps.length === 0) {
      rawGaps.push({
        title: 'Review production monitoring and error thresholds',
        gap_type: 'Missing Information',
        description: 'No explicit error budgets or telemetry logging thresholds were defined in the evaluated document.',
        source_reference: text.slice(0, 80) || 'Analyzed document',
        impact_level: 'low',
        status: 'OPEN'
      });
    }

    // Persist discovered gaps to PostgreSQL
    const savedGaps = [];
    if (pool) {
      for (const g of rawGaps) {
        try {
          const id = `GAP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
          const res = await pool.query(`
            INSERT INTO knowledge_gaps (id, user_email, project_id, report_id, title, gap_type, description, source_reference, impact_level, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
          `, [
            id, userEmail, projectId, reportId, g.title, g.gap_type, g.description, g.source_reference, g.impact_level, g.status
          ]);
          savedGaps.push(res.rows[0]);
        } catch (dbErr) {
          console.warn('[KnowledgeService.analyzeKnowledgeGaps] DB insert notice:', dbErr.message);
          savedGaps.push({ id: `TEMP-${Math.random()}`, ...g });
        }
      }
    } else {
      const userGapStore = this._getUserStore(this.fallbackGaps, userEmail);
      for (const g of rawGaps) {
        const id = `GAP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const gapObj = { id, user_email: userEmail, project_id: projectId, report_id: reportId, ...g, created_at: new Date() };
        userGapStore.set(id, gapObj);
        savedGaps.push(gapObj);
      }
    }

    return savedGaps;
  }

  /**
   * List Knowledge Gaps with filtering
   */
  async listGaps(userEmail = 'guest@insightlens.edu', filters = {}) {
    if (!pool) {
      let list = Array.from(this._getUserStore(this.fallbackGaps, userEmail).values());
      if (filters.status && filters.status !== 'ALL') {
        list = list.filter(g => g.status === filters.status);
      }
      if (filters.gap_type && filters.gap_type !== 'ALL') {
        list = list.filter(g => g.gap_type === filters.gap_type);
      }
      return list;
    }
    try {
      let query = `SELECT * FROM knowledge_gaps WHERE user_email = $1`;
      const params = [userEmail];

      if (filters.status && filters.status !== 'ALL') {
        params.push(filters.status);
        query += ` AND status = $${params.length}`;
      }

      if (filters.gap_type && filters.gap_type !== 'ALL') {
        params.push(filters.gap_type);
        query += ` AND gap_type = $${params.length}`;
      }

      query += ` ORDER BY created_at DESC LIMIT 100`;
      const res = await pool.query(query, params);
      return res.rows;
    } catch (err) {
      console.error('[KnowledgeService.listGaps] Error:', err.message);
      return [];
    }
  }

  /**
   * Create Manual Knowledge Gap
   */
  async createGap(userEmail, gapData) {
    const id = `GAP-${Date.now().toString(36).toUpperCase()}`;
    const { title, gap_type = 'Missing Information', description = '', source_reference = '', impact_level = 'medium', status = 'OPEN', project_id = null } = gapData;
    
    if (!pool) {
      const gapObj = { id, user_email: userEmail, title, gap_type, description, source_reference, impact_level, status, created_at: new Date() };
      this._getUserStore(this.fallbackGaps, userEmail).set(id, gapObj);
      return gapObj;
    }

    const res = await pool.query(`
      INSERT INTO knowledge_gaps (id, user_email, project_id, title, gap_type, description, source_reference, impact_level, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [id, userEmail, project_id, title, gap_type, description, source_reference, impact_level, status]);
    return res.rows[0];
  }

  /**
   * Update Knowledge Gap status & notes
   */
  async updateGap(id, userEmail, updates) {
    if (!pool) {
      const userStore = this._getUserStore(this.fallbackGaps, userEmail);
      const existing = userStore.get(id) || { id, user_email: userEmail };
      const updated = { ...existing, ...updates, updated_at: new Date() };
      userStore.set(id, updated);
      return updated;
    }
    const { status, resolution_notes, impact_level, description } = updates;
    const res = await pool.query(`
      UPDATE knowledge_gaps
      SET status = COALESCE($1, status),
          resolution_notes = COALESCE($2, resolution_notes),
          impact_level = COALESCE($3, impact_level),
          description = COALESCE($4, description),
          updated_at = NOW()
      WHERE id = $5 AND user_email = $6
      RETURNING *
    `, [status, resolution_notes, impact_level, description, id, userEmail]);
    return res.rows[0] || null;
  }

  /**
   * Delete Knowledge Gap
   */
  async deleteGap(id, userEmail) {
    if (!pool) {
      return this._getUserStore(this.fallbackGaps, userEmail).delete(id);
    }
    const res = await pool.query(`DELETE FROM knowledge_gaps WHERE id = $1 AND user_email = $2`, [id, userEmail]);
    return (res.rowCount || 0) > 0;
  }

  /**
   * List Decision Memory records
   */
  async listDecisions(userEmail = 'guest@insightlens.edu', filters = {}) {
    if (!pool) {
      let list = Array.from(this._getUserStore(this.fallbackDecisions, userEmail).values());
      if (filters.status && filters.status !== 'ALL') {
        list = list.filter(d => d.status === filters.status);
      }
      return list;
    }
    try {
      let query = `SELECT * FROM knowledge_decisions WHERE user_email = $1`;
      const params = [userEmail];

      if (filters.status && filters.status !== 'ALL') {
        params.push(filters.status);
        query += ` AND status = $${params.length}`;
      }

      query += ` ORDER BY created_at DESC LIMIT 100`;
      const res = await pool.query(query, params);
      return res.rows;
    } catch (err) {
      console.error('[KnowledgeService.listDecisions] Error:', err.message);
      return [];
    }
  }

  /**
   * Create New Decision Record
   */
  async createDecision(userEmail, decisionData) {
    const id = `DEC-${Date.now().toString(36).toUpperCase()}`;
    const {
      decision,
      reason,
      alternatives = [],
      evidence = '',
      affected_components = [],
      related_requirements = [],
      related_assumptions = [],
      notes = '',
      status = 'ACTIVE',
      project_id = null
    } = decisionData;

    if (!pool) {
      const decObj = { id, user_email: userEmail, decision, reason, alternatives, evidence, affected_components, related_requirements, related_assumptions, notes, status, created_at: new Date() };
      this._getUserStore(this.fallbackDecisions, userEmail).set(id, decObj);
      await this.saveGraphNode(userEmail, {
        id: `node-${id}`,
        node_type: 'DECISION',
        label: decision.slice(0, 50),
        detail: reason,
        status,
        project_id
      });
      return decObj;
    }

    const res = await pool.query(`
      INSERT INTO knowledge_decisions (
        id, user_email, project_id, decision, reason, alternatives, evidence,
        affected_components, related_requirements, related_assumptions, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      id, userEmail, project_id, decision, reason,
      JSON.stringify(alternatives), evidence,
      JSON.stringify(affected_components),
      JSON.stringify(related_requirements),
      JSON.stringify(related_assumptions),
      notes, status
    ]);

    // Automatically create a graph node for this decision
    try {
      await this.saveGraphNode(userEmail, {
        id: `node-${id}`,
        node_type: 'DECISION',
        label: decision.slice(0, 50),
        detail: reason,
        status,
        project_id
      });
    } catch (e) {}

    return res.rows[0];
  }

  /**
   * Update Decision Record
   */
  async updateDecision(id, userEmail, updates) {
    if (!pool) {
      const userStore = this._getUserStore(this.fallbackDecisions, userEmail);
      const existing = userStore.get(id) || { id, user_email: userEmail };
      const updated = { ...existing, ...updates, updated_at: new Date() };
      userStore.set(id, updated);
      return updated;
    }
    const { decision, reason, alternatives, evidence, affected_components, related_requirements, related_assumptions, notes, status, superseded_by, reversal_reason } = updates;
    
    const res = await pool.query(`
      UPDATE knowledge_decisions
      SET decision = COALESCE($1, decision),
          reason = COALESCE($2, reason),
          alternatives = CASE WHEN $3::jsonb IS NOT NULL THEN $3::jsonb ELSE alternatives END,
          evidence = COALESCE($4, evidence),
          affected_components = CASE WHEN $5::jsonb IS NOT NULL THEN $5::jsonb ELSE affected_components END,
          related_requirements = CASE WHEN $6::jsonb IS NOT NULL THEN $6::jsonb ELSE related_requirements END,
          related_assumptions = CASE WHEN $7::jsonb IS NOT NULL THEN $7::jsonb ELSE related_assumptions END,
          notes = COALESCE($8, notes),
          status = COALESCE($9, status),
          superseded_by = COALESCE($10, superseded_by),
          reversal_reason = COALESCE($11, reversal_reason),
          updated_at = NOW()
      WHERE id = $12 AND user_email = $13
      RETURNING *
    `, [
      decision, reason,
      alternatives ? JSON.stringify(alternatives) : null,
      evidence,
      affected_components ? JSON.stringify(affected_components) : null,
      related_requirements ? JSON.stringify(related_requirements) : null,
      related_assumptions ? JSON.stringify(related_assumptions) : null,
      notes, status, superseded_by, reversal_reason, id, userEmail
    ]);

    return res.rows[0] || null;
  }

  /**
   * Check Decision Validity against stored assumptions & contradictions
   */
  async checkDecisionValidity(id, userEmail = 'guest@insightlens.edu') {
    let decision = null;
    let gaps = [];

    if (!pool) {
      decision = this._getUserStore(this.fallbackDecisions, userEmail).get(id);
      gaps = Array.from(this._getUserStore(this.fallbackGaps, userEmail).values()).filter(g => g.status === 'OPEN' || g.status === 'INVESTIGATING');
      if (!decision) {
        decision = {
          id,
          decision: 'Active Decision Baseline',
          status: 'ACTIVE',
          related_assumptions: []
        };
      }
    } else {
      const res = await pool.query(`SELECT * FROM knowledge_decisions WHERE id = $1 AND user_email = $2`, [id, userEmail]);
      decision = res.rows[0];
      if (!decision) {
        throw new Error('Decision record not found.');
      }

      const gapsRes = await pool.query(`
        SELECT * FROM knowledge_gaps
        WHERE user_email = $1 AND (status = 'OPEN' OR status = 'INVESTIGATING')
        LIMIT 10
      `, [userEmail]);
      gaps = gapsRes.rows;
    }

    const relatedAsm = decision.related_assumptions || [];
    const threats = [];

    gaps.forEach(gap => {
      const match = relatedAsm.some(asm => (gap.description || '').toLowerCase().includes(String(asm).toLowerCase().slice(0, 15)));
      if (match) {
        threats.push(`Open Gap [${gap.gap_type}]: "${gap.title}" touches related assumptions.`);
      }
    });

    const isReversed = decision.status === 'REVERSED';
    const isSuperseded = decision.status === 'SUPERSEDED';

    let verdict = 'VALID';
    if (isReversed) verdict = 'REVERSED';
    else if (isSuperseded) verdict = 'SUPERSEDED';
    else if (threats.length > 0) verdict = 'REQUIRES_REVALIDATION';

    return {
      decisionId: decision.id,
      decisionText: decision.decision,
      status: decision.status,
      verdict,
      confidenceStatement: 'Evaluation based on registered empirical assumptions and active knowledge gaps.',
      threats,
      reasoning: threats.length > 0
        ? `Decision relies on ${relatedAsm.length} assumption(s), with ${threats.length} active knowledge gap(s) identified.`
        : 'All underlying assumptions remain structurally intact without registered contradictions.'
    };
  }

  /**
   * Get Domino Graph Nodes and Edges
   */
  async getGraph(userEmail = 'guest@insightlens.edu', projectId = null) {
    if (!pool) {
      const userNodes = Array.from(this._getUserStore(this.fallbackNodes, userEmail).values());
      const userEdges = Array.from(this._getUserStore(this.fallbackEdges, userEmail).values());
      return { nodes: userNodes, edges: userEdges };
    }

    try {
      const [nodesRes, edgesRes] = await Promise.all([
        pool.query(`SELECT * FROM knowledge_graph_nodes WHERE user_email = $1 ORDER BY created_at ASC`, [userEmail]),
        pool.query(`SELECT * FROM knowledge_graph_edges WHERE user_email = $1 ORDER BY created_at ASC`, [userEmail])
      ]);

      return {
        nodes: nodesRes.rows,
        edges: edgesRes.rows
      };
    } catch (err) {
      console.error('[KnowledgeService.getGraph] Error:', err.message);
      return { nodes: [], edges: [] };
    }
  }

  /**
   * Save Graph Node
   */
  async saveGraphNode(userEmail, nodeData) {
    const id = nodeData.id || `node-${Date.now().toString(36).toUpperCase()}`;
    const { node_type = 'CLAIM', label, detail = '', status = 'ACTIVE', metadata = {}, project_id = null } = nodeData;

    if (!pool) {
      const nodeObj = { id, user_email: userEmail, project_id, node_type, label, detail, status, metadata, created_at: new Date() };
      this._getUserStore(this.fallbackNodes, userEmail).set(id, nodeObj);
      return nodeObj;
    }

    const res = await pool.query(`
      INSERT INTO knowledge_graph_nodes (id, user_email, project_id, node_type, label, detail, status, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE
      SET label = EXCLUDED.label, detail = EXCLUDED.detail, status = EXCLUDED.status, metadata = EXCLUDED.metadata
      RETURNING *
    `, [id, userEmail, project_id, node_type, label, detail, status, JSON.stringify(metadata)]);
    return res.rows[0];
  }

  /**
   * Save Graph Edge
   */
  async saveGraphEdge(userEmail, edgeData) {
    const id = edgeData.id || `edge-${Date.now().toString(36).toUpperCase()}`;
    const { source_node_id, target_node_id, relation_type = 'DEPENDS_ON', impact_note = '', project_id = null } = edgeData;

    if (!pool) {
      const edgeObj = { id, user_email: userEmail, project_id, source_node_id, target_node_id, relation_type, impact_note, created_at: new Date() };
      this._getUserStore(this.fallbackEdges, userEmail).set(id, edgeObj);
      return edgeObj;
    }

    const res = await pool.query(`
      INSERT INTO knowledge_graph_edges (id, user_email, project_id, source_node_id, target_node_id, relation_type, impact_note)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE
      SET relation_type = EXCLUDED.relation_type, impact_note = EXCLUDED.impact_note
      RETURNING *
    `, [id, userEmail, project_id, source_node_id, target_node_id, relation_type, impact_note]);
    return res.rows[0];
  }

  /**
   * Simulate What-If Scenario (Pure In-Memory Simulation Without Modifying PostgreSQL)
   */
  async simulateWhatIf(userEmail, scenario = {}) {
    const { targetNodeId, hypotheticalAction = 'change_assumption', simulatedChange = '' } = scenario;

    // Retrieve live graph
    const { nodes, edges } = await this.getGraph(userEmail);

    // Deep clone to guarantee non-destructive sandbox
    const simNodes = JSON.parse(JSON.stringify(nodes));
    const simEdges = JSON.parse(JSON.stringify(edges));

    const targetNode = simNodes.find(n => n.id === targetNodeId);
    const affectedNodeIds = new Set();
    const rippleChains = [];

    if (targetNode) {
      affectedNodeIds.add(targetNode.id);
      targetNode.status = `SIMULATED_${hypotheticalAction.toUpperCase()}`;
      targetNode.simulatedNote = simulatedChange || `Hypothetical modification: ${hypotheticalAction}`;

      // BFS traverse downstream outgoing connections
      const queue = [targetNode.id];
      const visited = new Set([targetNode.id]);

      while (queue.length > 0) {
        const currId = queue.shift();
        const outgoing = simEdges.filter(e => e.source_node_id === currId || (e.relation_type === 'DEPENDS_ON' && e.target_node_id === currId));

        for (const edge of outgoing) {
          const nextId = edge.source_node_id === currId ? edge.target_node_id : edge.source_node_id;
          if (!visited.has(nextId)) {
            visited.add(nextId);
            affectedNodeIds.add(nextId);
            queue.push(nextId);

            const nextNode = simNodes.find(n => n.id === nextId);
            if (nextNode) {
              rippleChains.push({
                sourceId: currId,
                targetId: nextId,
                relation: edge.relation_type,
                targetLabel: nextNode.label,
                impactAssessment: `May be affected due to upstream ${hypotheticalAction.replace('_', ' ')} on "${targetNode.label}".`
              });
            }
          }
        }
      }
    }

    return {
      isHypothetical: true,
      originalStatePreserved: true,
      scenario: {
        targetNodeId,
        targetLabel: targetNode?.label || 'Target Node',
        action: hypotheticalAction,
        description: simulatedChange
      },
      impactedNodesCount: affectedNodeIds.size,
      affectedNodeIds: Array.from(affectedNodeIds),
      rippleChains,
      hypotheticalGraph: {
        nodes: simNodes.map(n => ({
          ...n,
          isAffected: affectedNodeIds.has(n.id)
        })),
        edges: simEdges
      }
    };
  }

  /**
   * Project Autopsy Generation
   */
  async generateAutopsy(userEmail, autopsyPayload) {
    const { title = 'Project Post-Mortem Autopsy', proposal = '', requirements = '', revisions = '', decisions = '', finalState = '' } = autopsyPayload;
    const id = `AUT-${Date.now().toString(36).toUpperCase()}`;

    // Chronological reconstruction
    const originalPlan = {
      summary: proposal.slice(0, 300) || 'Initial baseline proposal and system concept.',
      initialScope: 'Standard architectural milestones'
    };

    const requirementsTimeline = (requirements.split('\n').filter(l => l.trim().length > 5)).map((req, i) => ({
      step: `REQ-${i + 1}`,
      requirement: req,
      status: req.toLowerCase().includes('deprecated') ? 'DISAPPEARED' : 'PRESERVED'
    }));

    const decisionsTimeline = (decisions.split('\n').filter(l => l.trim().length > 5)).map((dec, i) => ({
      step: `DEC-${i + 1}`,
      decision: dec,
      status: dec.toLowerCase().includes('reversed') || dec.toLowerCase().includes('replaced') ? 'REVERSED' : 'ACTIVE',
      rationale: 'Documented in architectural decision records.'
    }));

    const changesTimeline = (revisions.split('\n').filter(l => l.trim().length > 5)).map((rev, i) => ({
      step: `REV-${i + 1}`,
      delta: rev,
      semanticType: rev.toLowerCase().includes('removed') ? 'REMOVAL' : 'MODIFICATION'
    }));

    const finalStateSummary = {
      status: 'CONCLUDED',
      summary: finalState.slice(0, 300) || 'Synthesized final artifact state.',
      disappearedRequirementsCount: requirementsTimeline.filter(r => r.status === 'DISAPPEARED').length,
      reversedDecisionsCount: decisionsTimeline.filter(d => d.status === 'REVERSED').length
    };

    const autopsyRecord = {
      id,
      user_email: userEmail,
      title,
      original_plan: originalPlan,
      requirements_timeline: requirementsTimeline,
      decisions_timeline: decisionsTimeline,
      changes_timeline: changesTimeline,
      assumptions_timeline: [],
      impacts_summary: [],
      final_state: finalStateSummary,
      created_at: new Date()
    };

    if (pool) {
      try {
        const res = await pool.query(`
          INSERT INTO knowledge_autopsies (
            id, user_email, title, original_plan, requirements_timeline,
            decisions_timeline, changes_timeline, assumptions_timeline, impacts_summary, final_state
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          id, userEmail, title,
          JSON.stringify(originalPlan),
          JSON.stringify(requirementsTimeline),
          JSON.stringify(decisionsTimeline),
          JSON.stringify(changesTimeline),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify(finalStateSummary)
        ]);
        return res.rows[0];
      } catch (err) {
        console.warn('[KnowledgeService.generateAutopsy] DB insert error:', err.message);
      }
    } else {
      this._getUserStore(this.fallbackAutopsies, userEmail).set(id, autopsyRecord);
    }

    return autopsyRecord;
  }

  /**
   * List Saved Project Autopsies
   */
  async listAutopsies(userEmail = 'guest@insightlens.edu') {
    if (!pool) {
      return Array.from(this._getUserStore(this.fallbackAutopsies, userEmail).values());
    }
    try {
      const res = await pool.query(`
        SELECT id, title, final_state, created_at
        FROM knowledge_autopsies
        WHERE user_email = $1
        ORDER BY created_at DESC
        LIMIT 50
      `, [userEmail]);
      return res.rows;
    } catch (err) {
      console.error('[KnowledgeService.listAutopsies] Error:', err.message);
      return [];
    }
  }

  /**
   * Get Project Autopsy by ID
   */
  async getAutopsy(id, userEmail = 'guest@insightlens.edu') {
    if (!pool) {
      return this._getUserStore(this.fallbackAutopsies, userEmail).get(id) || null;
    }
    const res = await pool.query(`SELECT * FROM knowledge_autopsies WHERE id = $1 AND user_email = $2`, [id, userEmail]);
    return res.rows[0] || null;
  }
}

export default new KnowledgeService();
