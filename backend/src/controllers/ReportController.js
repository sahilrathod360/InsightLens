import pool from '../config/db.js';

/**
 * Save / Persist Report to PostgreSQL.
 * Scoped strictly to the authenticated user from req.user.
 */
export const saveReport = async (req, res, next) => {
  try {
    const {
      id,
      title,
      subject,
      category,
      summaryLead,
      date,
      timestamp,
      imageDataUrl,
      thumbnailDataUrl,
      fullImage,
      modelUsed,
      processingTimeMs,
      confidenceScore,
      fullData,
      favorite
    } = req.body;

    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No valid session token provided.',
        data: null
      });
    }

    const reportId = id || `RPT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const nowTime = timestamp || Date.now();
    const formattedDate = date || new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (!pool) {
      const errMsg = 'Database connection pool is uninitialized. Report cannot be persisted.';
      console.error('[ReportController Error]', errMsg);
      return res.status(500).json({
        success: false,
        message: `Database persistence failed: ${errMsg}`,
        data: null
      });
    }

    // Ownership check: If this report ID already exists, ensure it belongs to the authenticated user
    const checkOwnership = await pool.query('SELECT user_email FROM reports WHERE id = $1', [reportId]);
    if (checkOwnership.rows.length > 0) {
      const existingOwner = (checkOwnership.rows[0].user_email || '').toLowerCase().trim();
      if (existingOwner !== email) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to modify this report.',
          data: null
        });
      }
    }

    const query = `
      INSERT INTO reports (
        id, user_email, title, subject, category, summary_lead, date_formatted,
        timestamp, image_data_url, thumbnail_data_url, full_image, model_used, processing_time_ms,
        confidence_score, full_data, favorite, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        subject = EXCLUDED.subject,
        category = EXCLUDED.category,
        summary_lead = EXCLUDED.summary_lead,
        image_data_url = EXCLUDED.image_data_url,
        thumbnail_data_url = EXCLUDED.thumbnail_data_url,
        full_image = EXCLUDED.full_image,
        full_data = EXCLUDED.full_data,
        favorite = EXCLUDED.favorite,
        updated_at = NOW()
      WHERE reports.user_email = $2
      RETURNING *;
    `;

    const values = [
      reportId,
      email,
      title || 'Visual Research Brief',
      subject || 'Visual Subject Assessment',
      category || 'General Research',
      summaryLead || '',
      formattedDate,
      nowTime,
      imageDataUrl || fullImage || '',
      thumbnailDataUrl || null,
      null, // Single copy: image_data_url is the primary storage column
      modelUsed || 'gemini-2.5-flash',
      parseInt(processingTimeMs, 10) || 0,
      confidenceScore || 'uncertain',
      JSON.stringify(fullData || {}),
      Boolean(favorite)
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to modify this report.',
        data: null
      });
    }

    const savedRow = result.rows[0];

    // Increment telemetry metrics in database (non-blocking)
    pool.query(
      `INSERT INTO app_metrics (metric_key, user_email, total_reports_generated, last_analysis_timestamp, last_successful_model, last_successful_time)
       VALUES ($1, $2, 1, $3, $4, $5)
       ON CONFLICT (metric_key) DO UPDATE SET
         total_reports_generated = app_metrics.total_reports_generated + 1,
         last_analysis_timestamp = EXCLUDED.last_analysis_timestamp,
         last_successful_model = EXCLUDED.last_successful_model,
         last_successful_time = EXCLUDED.last_successful_time,
         updated_at = NOW()`,
      [`user:${email}`, email, nowTime, modelUsed || 'gemini-2.5-flash', nowTime]
    ).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Report persisted to database successfully.',
      data: {
        id: savedRow.id,
        userEmail: savedRow.user_email,
        title: savedRow.title,
        subject: savedRow.subject,
        category: savedRow.category,
        summaryLead: savedRow.summary_lead,
        date: savedRow.date_formatted,
        timestamp: Number(savedRow.timestamp),
        imageDataUrl: savedRow.image_data_url || savedRow.full_image,
        thumbnailDataUrl: savedRow.thumbnail_data_url || null,
        fullImage: savedRow.full_image || savedRow.image_data_url,
        modelUsed: savedRow.model_used,
        processingTimeMs: savedRow.processing_time_ms,
        confidenceScore: savedRow.confidence_score,
        fullData: savedRow.full_data,
        favorite: savedRow.favorite
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieve a Single Report by ID.
 * Returns complete report dataset including fullData and images.
 * Scoped strictly to the authenticated user from req.user.
 */
export const getReportById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No valid session token provided.',
        data: null
      });
    }

    if (!pool) {
      return res.status(404).json({ success: false, message: 'Report not found (database not connected)' });
    }

    const result = await pool.query('SELECT * FROM reports WHERE id = $1 AND user_email = $2', [id, email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const row = result.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        id: row.id,
        userEmail: row.user_email,
        title: row.title,
        subject: row.subject,
        category: row.category,
        summaryLead: row.summary_lead,
        date: row.date_formatted,
        timestamp: Number(row.timestamp),
        imageDataUrl: row.image_data_url || row.full_image,
        thumbnailDataUrl: row.thumbnail_data_url || null,
        fullImage: row.full_image || row.image_data_url,
        modelUsed: row.model_used,
        processingTimeMs: row.processing_time_ms,
        confidenceScore: row.confidence_score,
        fullData: row.full_data,
        favorite: row.favorite
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List Reports (History & Archive).
 * Returns lightweight metadata and thumbnail image references.
 * Bounded pagination: default limit 20, max limit 50.
 * Scoped strictly to the authenticated user from req.user.
 */
export const listReports = async (req, res, next) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No valid session token provided.',
        data: []
      });
    }

    const category = req.query.category;
    const queryTerm = req.query.q;
    const favoriteOnly = req.query.favorites === 'true';
    const model = req.query.model;
    const since = Number(req.query.since);
    const sort = String(req.query.sort || 'newest');

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    if (!pool) {
      console.error('[ReportController Error] PostgreSQL pool is uninitialized.');
      return res.status(500).json({
        success: false,
        message: 'Database connection pool is unavailable.',
        data: []
      });
    }

    let whereSql = ' WHERE user_email = $1';
    const params = [email];

    if (category && category !== 'all') {
      params.push(category);
      whereSql += ` AND category = $${params.length}`;
    }

    if (favoriteOnly) {
      whereSql += ' AND favorite = TRUE';
    }

    if (queryTerm && queryTerm.trim()) {
      params.push(`%${queryTerm.trim().toLowerCase()}%`);
      whereSql += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(subject) LIKE $${params.length} OR LOWER(summary_lead) LIKE $${params.length})`;
    }

    if (model && model !== 'all') {
      params.push(`%${model.toLowerCase()}%`);
      whereSql += ` AND LOWER(model_used) LIKE $${params.length}`;
    }
    if (Number.isFinite(since) && since > 0) {
      params.push(since);
      whereSql += ` AND timestamp >= $${params.length}`;
    }

    const orderBy = {
      newest: 'timestamp DESC',
      oldest: 'timestamp ASC',
      alphabetical: 'title ASC',
      evidence: 'confidence_score ASC'
    }[sort] || 'timestamp DESC';

    params.push(limit);
    params.push(offset);
    const sql = `
      SELECT id, user_email, title, subject, category, summary_lead, date_formatted,
             timestamp, thumbnail_data_url, model_used, processing_time_ms,
             confidence_score, favorite, created_at
      FROM reports${whereSql}
      ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const [result, totalResult] = await Promise.all([
      pool.query(sql, params),
      pool.query(`SELECT COUNT(*) AS count FROM reports${whereSql}`, params.slice(0, -2))
    ]);
    const reports = result.rows.map(r => ({
      id: r.id,
      userEmail: r.user_email,
      title: r.title,
      subject: r.subject,
      category: r.category,
      summaryLead: r.summary_lead,
      date: r.date_formatted,
      timestamp: Number(r.timestamp),
      thumbnailDataUrl: r.thumbnail_data_url || null,
      modelUsed: r.model_used,
      processingTimeMs: r.processing_time_ms,
      confidenceScore: r.confidence_score,
      favorite: r.favorite
    }));

    return res.status(200).json({
      success: true,
      data: reports,
      page,
      limit,
      count: reports.length,
      total: Number(totalResult.rows[0]?.count || 0),
      totalPages: Math.max(1, Math.ceil(Number(totalResult.rows[0]?.count || 0) / limit))
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a Report.
 * Scoped strictly to the authenticated user from req.user.
 */
export const deleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No valid session token provided.'
      });
    }

    if (!pool) {
      console.error('[ReportController Error] PostgreSQL pool is uninitialized.');
      return res.status(500).json({
        success: false,
        message: 'Database connection pool is unavailable.'
      });
    }

    const result = await pool.query(
      'DELETE FROM reports WHERE id = $1 AND user_email = $2 RETURNING id',
      [id, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found or not owned by user.'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Report ${id} deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle Favorite Status of a Report.
 * Scoped strictly to the authenticated user from req.user.
 */
export const toggleFavorite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No valid session token provided.',
        data: null
      });
    }

    if (!pool) {
      console.error('[ReportController Error] PostgreSQL pool is uninitialized.');
      return res.status(500).json({
        success: false,
        message: 'Database connection pool is unavailable.'
      });
    }

    const result = await pool.query(
      'UPDATE reports SET favorite = NOT favorite, updated_at = NOW() WHERE id = $1 AND user_email = $2 RETURNING *',
      [id, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found or not owned by user.' });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Track Export Telemetry Metric.
 * Scoped strictly to the authenticated user from req.user.
 */
export const trackExportMetric = async (req, res, next) => {
  try {
    const { format } = req.body;
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No valid session token provided.'
      });
    }

    if (!pool) {
      console.error('[ReportController Error] PostgreSQL pool is uninitialized.');
      return res.status(500).json({
        success: false,
        message: 'Database connection pool is unavailable.'
      });
    }

    if (format === 'pdf') {
      await pool.query(`
        INSERT INTO app_metrics (metric_key, user_email, pdf_exports_count)
        VALUES ($1, $2, 1)
        ON CONFLICT (metric_key) DO UPDATE SET
          pdf_exports_count = app_metrics.pdf_exports_count + 1,
          updated_at = NOW()
      `, [`user:${email}`, email]);
      console.log(`[Export Metrics] Incremented pdf_exports_count for ${email}`);
    } else if (format === 'markdown') {
      await pool.query(`
        INSERT INTO app_metrics (metric_key, user_email, markdown_exports_count)
        VALUES ($1, $2, 1)
        ON CONFLICT (metric_key) DO UPDATE SET
          markdown_exports_count = app_metrics.markdown_exports_count + 1,
          updated_at = NOW()
      `, [`user:${email}`, email]);
      console.log(`[Export Metrics] Incremented markdown_exports_count for ${email}`);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid export format specified.' });
    }

    return res.status(200).json({
      success: true,
      message: `Export metric recorded: ${format}`
    });
  } catch (err) {
    next(err);
  }
};
