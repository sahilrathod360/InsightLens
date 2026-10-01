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
CREATE TABLE IF NOT EXISTS user_preferences (
    user_email VARCHAR(255) PRIMARY KEY,
    theme VARCHAR(20) DEFAULT 'dark',
    provider VARCHAR(20) DEFAULT 'auto',
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
    thumbnail_data_url TEXT,
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

CREATE INDEX IF NOT EXISTS idx_reports_user_timestamp ON reports(user_email, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_favorite ON reports(favorite);

-- 4. User Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) DEFAULT 'guest@insightlens.edu',
    activity_type VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_timestamp ON activity_logs(user_email, timestamp DESC);

-- 5. Application Telemetry & Cumulative Metrics
CREATE TABLE IF NOT EXISTS app_metrics (
    metric_key VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    total_images_analyzed INT DEFAULT 0,
    total_reports_generated INT DEFAULT 0,
    pdf_exports_count INT DEFAULT 0,
    markdown_exports_count INT DEFAULT 0,
    last_analysis_timestamp BIGINT,
    last_successful_model VARCHAR(100),
    last_successful_time BIGINT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_metrics_user_email ON app_metrics(user_email);

-- 6. Extensions Platform
CREATE TABLE IF NOT EXISTS extensions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    description TEXT NOT NULL,
    author VARCHAR(150) NOT NULL DEFAULT 'InsightLens Core Team',
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(100) DEFAULT 'extension',
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_builtin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extensions_category ON extensions(category);

-- 7. User Installed & Enabled Extensions
CREATE TABLE IF NOT EXISTS user_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    extension_id VARCHAR(100) NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
    is_installed BOOLEAN DEFAULT FALSE,
    is_enabled BOOLEAN DEFAULT FALSE,
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_extension UNIQUE(user_email, extension_id)
);

CREATE INDEX IF NOT EXISTS idx_user_extensions_user ON user_extensions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_extensions_enabled ON user_extensions(user_email, is_enabled);

-- 8. Extension Settings & Configurations
CREATE TABLE IF NOT EXISTS extension_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    extension_id VARCHAR(100) NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
    settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_extension_settings UNIQUE(user_email, extension_id)
);

-- 8b. Authoritative User UI & Extension Preferences
CREATE TABLE IF NOT EXISTS user_ui_preferences (
    user_email VARCHAR(255) PRIMARY KEY,
    theme_slug VARCHAR(100) DEFAULT 'midnight-research',
    typography_slug VARCHAR(100) DEFAULT 'modern',
    layout_slug VARCHAR(100) DEFAULT 'research-desk',
    active_modes JSONB DEFAULT '[]'::jsonb,
    preferences_json JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Theme Packs
CREATE TABLE IF NOT EXISTS themes (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    css_variables JSONB NOT NULL,
    is_builtin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Typography Packs
CREATE TABLE IF NOT EXISTS typography_packs (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    font_family VARCHAR(200) NOT NULL,
    scale_ratio NUMERIC(3, 2) DEFAULT 1.25,
    is_builtin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. UI Layout Packs
CREATE TABLE IF NOT EXISTS layout_packs (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    layout_data JSONB NOT NULL,
    is_builtin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- VISUAL INTELLIGENCE SUBSYSTEM TABLES
-- =========================================================================

-- 12. Visual Artifacts
CREATE TABLE IF NOT EXISTS visual_artifacts (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL DEFAULT 'guest@insightlens.edu',
    title TEXT NOT NULL,
    visual_type VARCHAR(50) NOT NULL, -- 'PHOTO', 'DOCUMENT', 'CHART', 'DFD', 'UML', 'ERD', 'FLOWCHART', 'ARCHITECTURE', 'MIXED'
    image_url TEXT,
    image_dimensions JSONB DEFAULT '{"width": 0, "height": 0}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visual_artifacts_user ON visual_artifacts(user_email, created_at DESC);

-- 13. Visual Evidence Registry
CREATE TABLE IF NOT EXISTS visual_evidence (
    id VARCHAR(100) PRIMARY KEY,
    analysis_id VARCHAR(100),
    claim_id VARCHAR(100),
    evidence_type VARCHAR(50) NOT NULL, -- 'REGION', 'NODE', 'EDGE', 'CHART_SERIES', 'DOCUMENT_BLOCK', 'POINT', 'POLYGON'
    region_label TEXT NOT NULL,
    coordinates JSONB NOT NULL,
    relation VARCHAR(50) DEFAULT 'SUPPORTS',
    status VARCHAR(50) NOT NULL DEFAULT 'OBSERVED', -- 'OBSERVED', 'INFERRED', 'UNDETERMINABLE', 'CONTRADICTED'
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visual_evidence_analysis ON visual_evidence(analysis_id);

-- 14. Visual Comparisons (Delta Models)
CREATE TABLE IF NOT EXISTS visual_comparisons (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL DEFAULT 'guest@insightlens.edu',
    source_a_id VARCHAR(100) NOT NULL,
    source_b_id VARCHAR(100) NOT NULL,
    intent VARCHAR(100) DEFAULT 'Comparison',
    diff_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visual_comparisons_user ON visual_comparisons(user_email, created_at DESC);

-- 15. Cross-Visual Consistency Reports
CREATE TABLE IF NOT EXISTS visual_consistencies (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL DEFAULT 'guest@insightlens.edu',
    title TEXT NOT NULL,
    artifact_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    conflict_count INT DEFAULT 0,
    overall_status VARCHAR(50) DEFAULT 'CONSISTENT',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visual_consistencies_user ON visual_consistencies(user_email, created_at DESC);

-- 16. Multi-Visual Workspaces
CREATE TABLE IF NOT EXISTS visual_workspaces (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL DEFAULT 'guest@insightlens.edu',
    name VARCHAR(255) NOT NULL,
    intent VARCHAR(100) DEFAULT 'General Understanding',
    artifacts_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visual_workspaces_user ON visual_workspaces(user_email, updated_at DESC);
