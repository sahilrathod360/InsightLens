import pool from '../config/db.js';

export const saveReport = async (req, res, next) => {
  try {
    const {
      id,
      userEmail,
      title,
      subject,
      category,
      summaryLead,
      date,
      timestamp,
      imageDataUrl,
      fullImage,
      modelUsed,
      processingTimeMs,
      confidenceScore,
      fullData,
      favorite
    } = req.body;

    const reportId = id || `RPT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const email = (userEmail || req.user?.email || 'guest@insightlens.edu').toLowerCase();
    const nowTime = timestamp || Date.now();
    const formattedDate = date || new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (!pool) {
      return res.status(200).json({
        success: true,
        message: 'Report saved (local mode)',
        data: { id: reportId, ...req.body }
      });
    }

    const query = `
      INSERT INTO reports (
        id, user_email, title, subject, category, summary_lead, date_formatted,
        timestamp, image_data_url, full_image, model_used, processing_time_ms,
        confidence_score, full_data, favorite, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        subject = EXCLUDED.subject,
        category = EXCLUDED.category,
        summary_lead = EXCLUDED.summary_lead,
        image_data_url = EXCLUDED.image_data_url,
        full_image = EXCLUDED.full_image,
        full_data = EXCLUDED.full_data,
        favorite = EXCLUDED.favorite,
        updated_at = NOW()
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
      imageDataUrl || '',
      fullImage || '',
      modelUsed || 'gemini-2.5-flash',
      parseInt(processingTimeMs, 10) || 0,
      confidenceScore || '96.8%',
      JSON.stringify(fullData || {}),
      Boolean(favorite)
    ];

    const result = await pool.query(query, values);
    const savedRow = result.rows[0];

    // Increment telemetry metrics in database
    await pool.query(
      `INSERT INTO app_metrics (metric_key, user_email, total_reports_generated, last_analysis_timestamp, last_successful_model, last_successful_time)
       VALUES ('global_metrics', $1, 1, $2, $3, $4)
       ON CONFLICT (metric_key) DO UPDATE SET
         total_reports_generated = app_metrics.total_reports_generated + 1,
         last_analysis_timestamp = EXCLUDED.last_analysis_timestamp,
         last_successful_model = EXCLUDED.last_successful_model,
         last_successful_time = EXCLUDED.last_successful_time,
         updated_at = NOW()`,
      [email, nowTime, modelUsed || 'gemini-2.5-flash', nowTime]
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
        imageDataUrl: savedRow.image_data_url,
        fullImage: savedRow.full_image,
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

export const getReportById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(404).json({ success: false, message: 'Report not found (database not connected)' });
    }

    const result = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
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
        imageDataUrl: row.image_data_url,
        fullImage: row.full_image,
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

export const listReports = async (req, res, next) => {
  try {
    const email = (req.query.email || req.user?.email || 'guest@insightlens.edu').toLowerCase();
    const category = req.query.category;
    const queryTerm = req.query.q;
    const favoriteOnly = req.query.favorites === 'true';

    if (!pool) {
      return res.status(200).json({ success: true, data: [] });
    }

    let sql = 'SELECT * FROM reports WHERE (user_email = $1 OR user_email = $2)';
    const params = [email, 'guest@insightlens.edu'];

    if (category && category !== 'all') {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }

    if (favoriteOnly) {
      sql += ' AND favorite = TRUE';
    }

    if (queryTerm && queryTerm.trim()) {
      params.push(`%${queryTerm.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(subject) LIKE $${params.length} OR LOWER(summary_lead) LIKE $${params.length})`;
    }

    sql += ' ORDER BY timestamp DESC LIMIT 100';

    const result = await pool.query(sql, params);
    const reports = result.rows.map(r => ({
      id: r.id,
      userEmail: r.user_email,
      title: r.title,
      subject: r.subject,
      category: r.category,
      summaryLead: r.summary_lead,
      date: r.date_formatted,
      timestamp: Number(r.timestamp),
      imageDataUrl: r.image_data_url,
      fullImage: r.full_image,
      modelUsed: r.model_used,
      processingTimeMs: r.processing_time_ms,
      confidenceScore: r.confidence_score,
      fullData: r.full_data,
      favorite: r.favorite
    }));

    return res.status(200).json({
      success: true,
      data: reports
    });
  } catch (err) {
    next(err);
  }
};

export const deleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(200).json({ success: true, message: 'Deleted locally.' });
    }

    await pool.query('DELETE FROM reports WHERE id = $1', [id]);
    return res.status(200).json({
      success: true,
      message: `Report ${id} deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
};

export const toggleFavorite = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(200).json({ success: true, message: 'Toggled favorite locally.' });
    }

    const result = await pool.query(
      'UPDATE reports SET favorite = NOT favorite, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};
