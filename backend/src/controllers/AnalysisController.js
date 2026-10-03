import AIManager from '../services/ai/AIManager.js';
import pool from '../config/db.js';
import { getCompletedAnalysis, storeCompletedAnalysis } from '../middleware/analysisAdmission.js';
import { normalizeReportId } from '../utils/idUtils.js';

export const analyzeArtifact = async (req, res, next) => {
  const reqStartTime = Date.now();
  const requestId = req.idempotencyKey || `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  try {
    console.log(`[Backend] [${requestId}] Request received for visual analysis`);
    const { dataUrl, promptObj = {}, preferredProvider } = req.body;
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({ success: false, message: 'Authentication required.', data: null });
    }

    const replay = getCompletedAnalysis(email, req.idempotencyKey);
    if (replay) {
      return res.status(200).json({ ...replay, replayed: true });
    }
    
    if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid image dataUrl is required for analysis.',
        data: null,
        errors: ['Missing or empty dataUrl'],
        timestamp: new Date().toISOString()
      });
    }

    const trimmedUrl = dataUrl.trim();

    // Reject non-image payloads, SVG injections, or dangerous protocol schemes
    if (trimmedUrl.startsWith('data:')) {
      const mimeMatch = trimmedUrl.match(/^data:([^;]+);base64,/i);
      if (!mimeMatch) {
        return res.status(400).json({
          success: false,
          message: 'Malformed base64 image dataUrl format.',
          data: null,
          errors: ['Invalid dataUrl format'],
          timestamp: new Date().toISOString()
        });
      }
      const mime = mimeMatch[1].toLowerCase().trim();
      const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedImageMimes.includes(mime)) {
        return res.status(400).json({
          success: false,
          message: `Unsupported file format "${mime}". Only JPEG, PNG, and WebP images are supported.`,
          data: null,
          errors: ['Unsupported MIME type'],
          timestamp: new Date().toISOString()
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid image format. Only a base64 data:image URL is accepted.',
        data: null,
        errors: ['Invalid image format'],
        timestamp: new Date().toISOString()
      });
    }

    // Enrich promptObj with authenticated user's stored personalization profile
    let enrichedPromptObj = { ...promptObj };
    if (pool && email) {
      try {
        const profileRes = await pool.query(
          `SELECT role, field, primary_uses, interests, visual_types, analysis_depth, presentation_style, evidence_preference
           FROM user_profiles WHERE LOWER(user_email) = $1`,
          [email.toLowerCase()]
        );
        if (profileRes.rows.length > 0) {
          const userProf = profileRes.rows[0];
          enrichedPromptObj.userPreferences = {
            role: userProf.role,
            field: userProf.field,
            primary_uses: userProf.primary_uses || [],
            interests: userProf.interests || [],
            visual_types: userProf.visual_types || [],
            analysis_depth: userProf.analysis_depth || 'balanced',
            presentation_style: userProf.presentation_style || ['balanced', 'evidence-first'],
            evidence_preference: userProf.evidence_preference || 'strict',
            ...(promptObj.userPreferences || {})
          };
          if (!enrichedPromptObj.researchLength && userProf.analysis_depth) {
            enrichedPromptObj.researchLength = userProf.analysis_depth === 'quick' ? 'short' : (userProf.analysis_depth === 'research' || userProf.analysis_depth === 'deep' ? 'exhaustive' : 'long');
          }
        }
      } catch (profErr) {
        console.warn('[AnalysisController] Notice: Could not load user profile preferences for AI personalization:', profErr.message);
      }
    }

    const report = await AIManager.generateReport(dataUrl, enrichedPromptObj, preferredProvider);

    // Verify database connection pool availability
    if (!pool) {
      const dbPoolError = 'PostgreSQL database pool is uninitialized. Report cannot be persisted.';
      console.error('[AnalysisController Error]', dbPoolError);
      return res.status(500).json({
        success: false,
        message: `Database persistence failed: ${dbPoolError}`,
        data: null,
        errors: [dbPoolError],
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[AnalysisController] Persisting report for authenticated user: ${email}`);
    
    // Always assign a normalized unique report ID for every analysis
    const reportId = normalizeReportId(report.id || `RPT-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
    const now = Date.now();
    const modelName = report.meta?.modelUsed || report.modelUsed || report.actualModel || 'gemini-2.5-flash';
    const formattedDate = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const processingTime = parseInt(report.meta?.inferenceLatencyMs || report.processingTimeMs || 0, 10);
    const evidenceStatus = report.evidenceStatus || 'undeterminable';
    const storedImageDataUrl = report.processedImageDataUrl;
    const thumbnailDataUrl = report.thumbnailDataUrl;
    delete report.processedImageDataUrl;
    delete report.thumbnailDataUrl;

    report.id = reportId;

    // 1. Awaited PostgreSQL Report Persistence
    const insertQuery = `
      INSERT INTO reports (
        id, user_email, title, subject, category, summary_lead, date_formatted,
        timestamp, image_data_url, thumbnail_data_url, full_image, model_used, processing_time_ms,
        confidence_score, full_data, favorite, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, FALSE, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        subject = EXCLUDED.subject,
        category = EXCLUDED.category,
        summary_lead = EXCLUDED.summary_lead,
        full_data = EXCLUDED.full_data,
        updated_at = NOW()
      RETURNING id;
    `;

    const insertValues = [
      reportId,
      email,
      report.title || 'Visual Research Report',
      report.subject || 'Analyzed Subject',
      report.category || 'General',
      report.executiveSummary || report.summaryLead || '',
      formattedDate,
      now,
      storedImageDataUrl,
      thumbnailDataUrl,
      null, // Legacy column retained for old reports only
      modelName,
      processingTime,
      evidenceStatus,
      JSON.stringify(report)
    ];

    const dbStartTime = Date.now();
    let persistedReportId = reportId;
    try {
      const insertResult = await pool.query(insertQuery, insertValues);
      persistedReportId = insertResult.rows[0]?.id || reportId;
      report.id = persistedReportId;
    } catch (dbErr) {
      console.error('[AnalysisController] PostgreSQL Report Persistence Failure:', dbErr.message);
      return res.status(500).json({
        success: false,
        message: 'Database persistence failed. Please try again later.',
        data: null,
        errors: [],
        timestamp: new Date().toISOString()
      });
    }
    const dbInsertDurationMs = Date.now() - dbStartTime;

    // 2. Activity Log Auditing
    const telemetryStartTime = Date.now();
    await pool.query(
      `INSERT INTO activity_logs (id, user_email, activity_type, text, timestamp)
       VALUES ($1, $2, 'generate', $3, $4)`,
      [`LOG-${now}-${Math.floor(Math.random() * 1000)}`, email, `Analysis Completed: ${report.title || 'Visual Artifact'} (${modelName})`, now]
    ).catch(logErr => console.error('[AnalysisController] PostgreSQL Activity Log Error:', logErr.message));

    const telemetryDurationMs = Date.now() - telemetryStartTime;

    const totalRequestTimeMs = Date.now() - reqStartTime;

    console.log('\n================ ANALYSIS TIMING ================');
    console.log(`Request ID:                          ${requestId}`);
    console.log(`Visual Classification:               [${(report.visualType || 'unknown').toUpperCase()}] -> ${report.specializedPipeline || 'Standard'}`);
    console.log(`AI Pipeline (Inference + Citations): ${report.processingTimeMs || 0} ms`);
    console.log(`Winning AI Provider:                 ${report.aiProvider || 'Unknown'}`);
    console.log(`Winning Model:                       ${report.actualModel || modelName}`);
    console.log(`PostgreSQL Report Insert:            ${dbInsertDurationMs} ms`);
    console.log(`Telemetry / Metrics Update:          ${telemetryDurationMs} ms`);
    console.log(`Total Request Latency:               ${totalRequestTimeMs} ms (${(totalRequestTimeMs / 1000).toFixed(2)}s)`);
    console.log('=================================================\n');

    const responsePayload = {
      success: true,
      message: 'Analysis complete',
      data: {
        ...report,
        id: persistedReportId,
        imageDataUrl: storedImageDataUrl,
        thumbnailDataUrl
      },
      reportId: persistedReportId,
      errors: [],
      timestamp: new Date().toISOString()
    };
    storeCompletedAnalysis(email, req.idempotencyKey, responsePayload);
    return res.status(200).json(responsePayload);
  } catch (err) {
    const elapsed = Date.now() - reqStartTime;
    const errorStatus = err.status || err.statusCode || 500;
    const errorCategory = err.code || err.name || 'UNKNOWN_ERROR';
    console.error(`[AnalysisController Error] [${requestId}] Failed in ${elapsed}ms | Status: ${errorStatus} | Category: ${errorCategory} | Message: ${err.message}`);
    next(err);
  }
};
