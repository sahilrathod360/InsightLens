-- =========================================================================
-- InsightLens PostgreSQL Production Schema (Aiven PostgreSQL)
-- =========================================================================

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    initials VARCHAR(10),
    role VARCHAR(50) DEFAULT 'Researcher',
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. User Preferences (Theme, AI model, formatting options)
-- Note: Sensitive API keys are strictly configured on the server, NEVER stored here.
CREATE TABLE IF NOT EXISTS user_preferences (
    user_email VARCHAR(255) PRIMARY KEY,
    theme VARCHAR(20) DEFAULT 'dark',
    model VARCHAR(50) DEFAULT 'auto',
    auto_model_fallback BOOLEAN DEFAULT TRUE,
    compact_mode BOOLEAN DEFAULT FALSE,
    font_size VARCHAR(20) DEFAULT 'medium',
    animations_on BOOLEAN DEFAULT TRUE,
    writing_style VARCHAR(50) DEFAULT 'classic',
    research_length VARCHAR(50) DEFAULT 'long',
    citation_style VARCHAR(20) DEFAULT 'APA',
    language VARCHAR(10) DEFAULT 'en',
    export_format VARCHAR(20) DEFAULT 'pdf',
    auto_save_reports BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Reports & Visual Analyses Archive
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) DEFAULT 'guest@insightlens.edu',
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General Research',
    summary_lead TEXT,
    date_formatted VARCHAR(100),
    timestamp BIGINT NOT NULL,
    image_data_url TEXT,
    full_image TEXT,
    model_used VARCHAR(100) DEFAULT 'gemini-2.5-flash',
    processing_time_ms INT DEFAULT 0,
    confidence_score VARCHAR(20) DEFAULT '96.8%',
    full_data JSONB NOT NULL,
    pdf_available BOOLEAN DEFAULT TRUE,
    markdown_available BOOLEAN DEFAULT TRUE,
    favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_email ON reports(user_email);
CREATE INDEX IF NOT EXISTS idx_reports_timestamp ON reports(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_favorite ON reports(favorite);

-- 4. User Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) DEFAULT 'guest@insightlens.edu',
    activity_type VARCHAR(50) NOT NULL, -- 'upload', 'generate', 'pdf', 'markdown', 'delete', 'duplicate'
    text TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_timestamp ON activity_logs(user_email, timestamp DESC);

-- 5. Application Telemetry & Cumulative Metrics
CREATE TABLE IF NOT EXISTS app_metrics (
    metric_key VARCHAR(100) PRIMARY KEY DEFAULT 'global_metrics',
    user_email VARCHAR(255) DEFAULT 'guest@insightlens.edu',
    total_images_analyzed INT DEFAULT 0,
    total_reports_generated INT DEFAULT 0,
    pdf_exports_count INT DEFAULT 0,
    markdown_exports_count INT DEFAULT 0,
    last_analysis_timestamp BIGINT,
    last_successful_model VARCHAR(100),
    last_successful_time BIGINT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
