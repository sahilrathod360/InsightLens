import AIManager from '../services/ai/AIManager.js';
import pool from '../config/db.js';
import { getCompletedAnalysis, storeCompletedAnalysis } from '../middleware/analysisAdmission.js';

export const analyzeArtifact = async (req, res, next) => {
  const reqStartTime = Date.now();
  try {
    console.log(`[Backend] Request received for visual analysis`);
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

    const report = await AIManager.generateReport(dataUrl, promptObj, preferredProvider);

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
    
    // Always assign a fresh unique report ID for every analysis
    const reportId = `RPT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const now = Date.now();
    const modelName = report.meta?.modelUsed || report.modelUsed || report.actualModel || 'gemini-2.5-flash';
    const formattedDate = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const processingTime = parseInt(report.meta?.inferenceLatencyMs || report.processingTimeMs || 0, 10);
    const evidenceStatus = report.evidenceStatus || 'uncertain';
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

    // 2. Parallel Telemetry and Activity Log Auditing
    const telemetryStartTime = Date.now();
    const metricsQuery = pool.query(
      `INSERT INTO app_metrics (metric_key, user_email, total_images_analyzed, total_reports_generated, last_analysis_timestamp, last_successful_model, last_successful_time)
       VALUES ($1, $2, 1, 1, $3, $4, $5)
       ON CONFLICT (metric_key) DO UPDATE SET
         total_images_analyzed = app_metrics.total_images_analyzed + 1,
         total_reports_generated = app_metrics.total_reports_generated + 1,
         last_analysis_timestamp = EXCLUDED.last_analysis_timestamp,
         last_successful_model = EXCLUDED.last_successful_model,
         last_successful_time = EXCLUDED.last_successful_time,
         updated_at = NOW()`,
      [`user:${email}`, email, now, modelName, now]
    ).catch(metricErr => console.error('[AnalysisController] PostgreSQL Metrics Update Error:', metricErr.message));

    const activityQuery = pool.query(
      `INSERT INTO activity_logs (id, user_email, activity_type, text, timestamp)
       VALUES ($1, $2, 'generate', $3, $4)`,
      [`LOG-${now}-${Math.floor(Math.random() * 1000)}`, email, `Analysis Completed: ${report.title || 'Visual Artifact'} (${modelName})`, now]
    ).catch(logErr => console.error('[AnalysisController] PostgreSQL Activity Log Error:', logErr.message));

    await Promise.allSettled([metricsQuery, activityQuery]);
    const telemetryDurationMs = Date.now() - telemetryStartTime;

    const totalRequestTimeMs = Date.now() - reqStartTime;

    console.log('\n================ ANALYSIS TIMING ================');
    console.log(`Visual Classification:               [${(report.visualType || 'unknown').toUpperCase()}] -> ${report.specializedPipeline || 'Standard'}`);
    console.log(`AI Pipeline (Inference + Citations): ${report.processingTimeMs || 0} ms`);
    console.log(`Winning AI Provider:                 ${report.aiProvider || 'Unknown'}`);
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
    next(err);
  }
};
