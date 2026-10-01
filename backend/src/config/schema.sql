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
    activity_type VARCHAR(50) NOT NULL, -- 'upload', 'generate', 'pdf', 'markdown', 'delete', 'duplicate'
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
    category VARCHAR(50) NOT NULL, -- 'Themes', 'Typography', 'Layouts', 'Analysis', 'Research', 'Productivity', 'Experimental'
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
    is_installed BOOLEAN DEFAULT TRUE,
    is_enabled BOOLEAN DEFAULT TRUE,
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

-- 9. Theme Packs
CREATE TABLE IF NOT EXISTS themes (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    theme_data JSONB NOT NULL,
    is_builtin BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Typography Packs
CREATE TABLE IF NOT EXISTS typography_packs (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    typography_data JSONB NOT NULL,
    is_builtin BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. UI Layout Packs
CREATE TABLE IF NOT EXISTS layout_packs (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    layout_data JSONB NOT NULL,
    is_builtin BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Knowledge Projects
CREATE TABLE IF NOT EXISTS knowledge_projects (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL DEFAULT 'guest@insightlens.edu',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_projects_user ON knowledge_projects(user_email, updated_at DESC);

-- 13. Knowledge Evolution Analyses Archive (Time Machine)
CREATE TABLE IF NOT EXISTS knowledge_evolution_analyses (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) DEFAULT 'guest@insightlens.edu',
    project_id VARCHAR(100) REFERENCES knowledge_projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    source_a_label VARCHAR(255) DEFAULT 'Version 1',
    source_b_label VARCHAR(255) DEFAULT 'Version 2',
    change_metrics JSONB NOT NULL,
    semantic_changes JSONB NOT NULL,
    impact_graph JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_evolution_user ON knowledge_evolution_analyses(user_email, created_at DESC);

-- 14. Knowledge Gaps
CREATE TABLE IF NOT EXISTS knowledge_gaps (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL DEFAULT 'guest@insightlens.edu',
    project_id VARCHAR(100) REFERENCES knowledge_projects(id) ON DELETE SET NULL,
    report_id VARCHAR(100),
    title TEXT NOT NULL,
    gap_type VARCHAR(50) NOT NULL, -- 'Missing Information', 'Missing Evidence', 'Ambiguous Requirement', 'Unvalidated Assumption', 'Unresolved Contradiction', 'Undefined Outcome'
    description TEXT,
    source_reference TEXT,
    impact_level VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(20) DEFAULT 'OPEN', -- 'OPEN', 'INVESTIGATING', 'RESOLVED', 'ACCEPTED'
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_user ON knowledge_gaps(user_email, status);

-- 15. Decision Memory
CREATE TABLE IF NOT EXISTS knowledge_decisions (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL DEFAULT 'guest@insightlens.edu',
    project_id VARCHAR(100) REFERENCES knowledge_projects(id) ON DELETE SET NULL,
    decision TEXT NOT NULL,
    reason TEXT NOT NULL,
    alternatives JSONB DEFAULT '[]'::jsonb,
    evidence TEXT,
    affected_components JSONB DEFAULT '[]'::jsonb,
    related_requirements JSONB DEFAULT '[]'::jsonb,
    related_assumptions JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'REVISITING', 'REVERSED', 'SUPERSEDED'
    superseded_by VARCHAR(100),
    reversal_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_decisions_user ON knowledge_decisions(user_email, status);

-- 16. Claim Domino Graph Nodes
CREATE TABLE IF NOT EXISTS knowledge_graph_nodes (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL DEFAULT 'guest@insightlens.edu',
    project_id VARCHAR(100) REFERENCES knowledge_projects(id) ON DELETE SET NULL,
    node_type VARCHAR(50) NOT NULL, -- 'CLAIM', 'ASSUMPTION', 'REQUIREMENT', 'DECISION', 'EVIDENCE', 'COMPONENT', 'RISK', 'KNOWLEDGE_GAP'
    label TEXT NOT NULL,
    detail TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_user ON knowledge_graph_nodes(user_email, project_id);

-- 17. Claim Domino Graph Edges
CREATE TABLE IF NOT EXISTS knowledge_graph_edges (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL DEFAULT 'guest@insightlens.edu',
    project_id VARCHAR(100) REFERENCES knowledge_projects(id) ON DELETE SET NULL,
    source_node_id VARCHAR(100) NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
    target_node_id VARCHAR(100) NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL, -- 'SUPPORTS', 'DEPENDS_ON', 'AFFECTS', 'CONTRADICTS', 'DERIVED_FROM', 'REQUIRES'
    impact_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_user ON knowledge_graph_edges(user_email, project_id);

-- 18. Project Autopsies
CREATE TABLE IF NOT EXISTS knowledge_autopsies (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL DEFAULT 'guest@insightlens.edu',
    project_id VARCHAR(100) REFERENCES knowledge_projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    original_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
    requirements_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    decisions_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    changes_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    assumptions_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    impacts_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
    final_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_autopsies_user ON knowledge_autopsies(user_email, created_at DESC);

-- 19. Assumption Stress Tests Archive
CREATE TABLE IF NOT EXISTS assumption_stress_tests (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) DEFAULT 'guest@insightlens.edu',
    title TEXT NOT NULL,
    document_title VARCHAR(255),
    assumptions_count INT DEFAULT 0,
    assumptions_data JSONB NOT NULL,
    relationship_graph JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assumption_tests_user ON assumption_stress_tests(user_email, created_at DESC);

-- 20. Adversarial Devil's Advocate & Claim Survival Archive
CREATE TABLE IF NOT EXISTS adversarial_analyses (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) DEFAULT 'guest@insightlens.edu',
    title TEXT NOT NULL,
    claims_analyzed INT DEFAULT 0,
    survival_tally JSONB NOT NULL,
    challenges_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adversarial_user ON adversarial_analyses(user_email, created_at DESC);

