import pool from '../config/db.js';

/**
 * Dashboard Statistics & Analytics.
 * Scoped strictly to the authenticated user from req.user.
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No valid session token provided.',
        data: null
      });
    }

    if (!pool) {
      console.error('[DashboardController Error] PostgreSQL pool is uninitialized.');
      return res.status(500).json({
        success: false,
        message: 'Database connection pool is unavailable.',
        data: null
      });
    }

    // Execute all independent dashboard aggregate queries concurrently in parallel
    const [totalReportsRes, categoryRes, modelRes, recentRes, metricsRes] = await Promise.all([
      // 1. Total counts for this user
      pool.query('SELECT COUNT(*) as count FROM reports WHERE user_email = $1', [email]),

      // 2. Category distribution for this user
      pool.query(
        `SELECT category, COUNT(*) as count
         FROM reports
         WHERE user_email = $1
         GROUP BY category`,
        [email]
      ),

      // 3. Model usage breakdown for this user
      pool.query(
        `SELECT model_used, COUNT(*) as count
         FROM reports
         WHERE user_email = $1
         GROUP BY model_used`,
        [email]
      ),

      // 4. Lightweight recent reports metadata for this user
      pool.query(
        `SELECT id, title, subject, category, date_formatted, timestamp, model_used, confidence_score, favorite, thumbnail_data_url
         FROM reports
         WHERE user_email = $1
         ORDER BY timestamp DESC LIMIT 10`,
        [email]
      ),

      // 5. Per-user app telemetry
      pool.query('SELECT * FROM app_metrics WHERE metric_key = $1 AND user_email = $2', [`user:${email}`, email])
    ]);

    const totalReports = parseInt(totalReportsRes.rows[0]?.count || '0', 10);

    const categoryDistribution = {};
    categoryRes.rows.forEach(r => {
      categoryDistribution[r.category || 'General'] = parseInt(r.count, 10);
    });

    const modelDistribution = {};
    modelRes.rows.forEach(r => {
      modelDistribution[r.model_used || 'gemini-2.5-flash'] = parseInt(r.count, 10);
    });

    const recentReports = recentRes.rows.map(r => ({
      id: r.id,
      title: r.title,
      subject: r.subject,
      category: r.category,
      date: r.date_formatted,
      timestamp: Number(r.timestamp),
      modelUsed: r.model_used,
      confidenceScore: r.confidence_score,
      favorite: r.favorite,
      thumbnailDataUrl: r.thumbnail_data_url || null
    }));

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
        recentReports
      }
    });
  } catch (err) {
    next(err);
  }
};
