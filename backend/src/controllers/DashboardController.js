import pool from '../config/db.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const email = (req.query.email || req.user?.email || 'guest@insightlens.edu').toLowerCase();

    if (!pool) {
      return res.status(200).json({
        success: true,
        data: {
          totalAnalyses: 0,
          totalReports: 0,
          activeModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'openrouter/free'],
          categoryDistribution: {},
          recentActivity: []
        }
      });
    }

    // 1. Total counts
    const totalReportsRes = await pool.query(
      'SELECT COUNT(*) as count FROM reports WHERE user_email = $1 OR user_email = $2',
      [email, 'guest@insightlens.edu']
    );
    const totalReports = parseInt(totalReportsRes.rows[0]?.count || '0', 10);

    // 2. Category distribution
    const categoryRes = await pool.query(
      `SELECT category, COUNT(*) as count
       FROM reports
       WHERE user_email = $1 OR user_email = $2
       GROUP BY category`,
      [email, 'guest@insightlens.edu']
    );
    const categoryDistribution = {};
    categoryRes.rows.forEach(r => {
      categoryDistribution[r.category || 'General'] = parseInt(r.count, 10);
    });

    // 3. Model usage breakdown
    const modelRes = await pool.query(
      `SELECT model_used, COUNT(*) as count
       FROM reports
       WHERE user_email = $1 OR user_email = $2
       GROUP BY model_used`,
      [email, 'guest@insightlens.edu']
    );
    const modelDistribution = {};
    modelRes.rows.forEach(r => {
      modelDistribution[r.model_used || 'gemini-2.5-flash'] = parseInt(r.count, 10);
    });

    // 4. Recent reports
    const recentRes = await pool.query(
      `SELECT id, title, subject, category, date_formatted, timestamp, model_used, confidence_score, favorite
       FROM reports
       WHERE user_email = $1 OR user_email = $2
       ORDER BY timestamp DESC LIMIT 10`,
      [email, 'guest@insightlens.edu']
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
