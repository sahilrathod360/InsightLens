import pool from '../config/db.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const email = (req.user?.email || req.query.email || 'guest@insightlens.edu').toLowerCase().trim();

    if (!pool) {
      console.error('[DashboardController Error] PostgreSQL pool is uninitialized.');
      return res.status(500).json({
        success: false,
        message: 'Database connection pool is unavailable.',
        data: null
      });
    }

    // 1. Total counts
    const totalReportsRes = await pool.query(
      'SELECT COUNT(*) as count FROM reports WHERE user_email = $1',
      [email]
    );
    const totalReports = parseInt(totalReportsRes.rows[0]?.count || '0', 10);

    // 2. Category distribution
    const categoryRes = await pool.query(
      `SELECT category, COUNT(*) as count
       FROM reports
       WHERE user_email = $1
       GROUP BY category`,
      [email]
    );
    const categoryDistribution = {};
    categoryRes.rows.forEach(r => {
      categoryDistribution[r.category || 'General'] = parseInt(r.count, 10);
    });

    // 3. Model usage breakdown
    const modelRes = await pool.query(
      `SELECT model_used, COUNT(*) as count
       FROM reports
       WHERE user_email = $1
       GROUP BY model_used`,
      [email]
    );
    const modelDistribution = {};
    modelRes.rows.forEach(r => {
      modelDistribution[r.model_used || 'gemini-2.5-flash'] = parseInt(r.count, 10);
    });

    // 4. Recent reports
    const recentRes = await pool.query(
      `SELECT id, title, subject, category, date_formatted, timestamp, model_used, confidence_score, favorite
       FROM reports
       WHERE user_email = $1
       ORDER BY timestamp DESC LIMIT 10`,
      [email]
    );

    // 5. App telemetry
    const metricsRes = await pool.query('SELECT * FROM app_metrics WHERE metric_key = $1', ['global_metrics']);
    const metrics = metricsRes.rows[0] || {};

    return res.status(200).json({
      success: true,
      data: {
        totalReports,
        totalAnalyses: Math.max(totalReports, metrics.total_images_analyzed || 0),
        categoryDistribution,
        modelDistribution,
        metrics: {
          totalImagesAnalyzed: metrics.total_images_analyzed || totalReports,
          totalReportsGenerated: metrics.total_reports_generated || totalReports,
          pdfExportsCount: metrics.pdf_exports_count || 0,
          markdownExportsCount: metrics.markdown_exports_count || 0,
          lastSuccessfulModel: metrics.last_successful_model || 'gemini-2.5-flash',
          lastSuccessfulTime: metrics.last_successful_time || null
        },
        recentReports: recentRes.rows
      }
    });
  } catch (err) {
    next(err);
  }
};
