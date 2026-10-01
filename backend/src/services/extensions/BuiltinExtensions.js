/**
 * Built-in Extension Manifests & Bundled Packages
 * Standard 10 extensions for InsightLens Extensibility Platform.
 */

export const BUILTIN_THEMES = [
  {
    id: 'theme-midnight-research',
    name: 'Midnight Research',
    slug: 'midnight-research',
    description: 'Dark academic aesthetic with deep navy slate backgrounds and refined violet-indigo accents.',
    theme_data: {
      bgMain: '#0B0F19',
      bgCanvas: '#0E1322',
      bgCard: '#151C30',
      bgCardSubtle: '#1C253E',
      borderColor: '#263354',
      textPrimary: '#F1F5F9',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      accentPrimary: '#6366F1',
      accentEmerald: '#10B981',
      accentAmber: '#F59E0B',
      accentPurple: '#8B5CF6',
      accentLink: '#38BDF8',
      mode: 'dark'
    }
  },
  {
    id: 'theme-neo-glass',
    name: 'Neo Glass',
    slug: 'neo-glass',
    description: 'Futuristic frosted translucent interface with subtle neon violet and cyan borders.',
    theme_data: {
      bgMain: '#070913',
      bgCanvas: '#0A0E1F',
      bgCard: 'rgba(20, 27, 50, 0.75)',
      bgCardSubtle: 'rgba(30, 41, 75, 0.65)',
      borderColor: 'rgba(139, 92, 246, 0.25)',
      textPrimary: '#FFFFFF',
      textSecondary: '#A5B4FC',
      textMuted: '#6366F1',
      accentPrimary: '#8B5CF6',
      accentEmerald: '#34D399',
      accentAmber: '#FBBF24',
      accentPurple: '#A855F7',
      accentLink: '#22D3EE',
      mode: 'dark',
      backdropBlur: '16px'
    }
  },
  {
    id: 'theme-terminal',
    name: 'Terminal',
    slug: 'terminal',
    description: 'Developer and systems terminal aesthetic with jet black surface and phosphor emerald and amber highlights.',
    theme_data: {
      bgMain: '#050709',
      bgCanvas: '#080C10',
      bgCard: '#0E141C',
      bgCardSubtle: '#151D28',
      borderColor: '#1E293B',
      textPrimary: '#E2E8F0',
      textSecondary: '#94A3B8',
      textMuted: '#475569',
      accentPrimary: '#10B981',
      accentEmerald: '#10B981',
      accentAmber: '#F59E0B',
      accentPurple: '#06B6D4',
      accentLink: '#10B981',
      mode: 'dark'
    }
  },
  {
    id: 'theme-paper',
    name: 'Paper Editorial',
    slug: 'paper',
    description: 'Clean academic paper document aesthetic with high-contrast serif typography and soft cream canvas.',
    theme_data: {
      bgMain: '#FBFBF9',
      bgCanvas: '#FFFFFF',
      bgCard: '#F4F4F0',
      bgCardSubtle: '#ECECE6',
      borderColor: '#D8D8CF',
      textPrimary: '#18181B',
      textSecondary: '#52525B',
      textMuted: '#71717A',
      accentPrimary: '#2563EB',
      accentEmerald: '#059669',
      accentAmber: '#D97706',
      accentPurple: '#7C3AED',
      accentLink: '#2563EB',
      mode: 'light'
    }
  },
  {
    id: 'theme-solarized-lab',
    name: 'Solarized Lab',
    slug: 'solarized-lab',
    description: 'Precision laboratory aesthetic inspired by classic solarized palettes for prolonged reading comfort.',
    theme_data: {
      bgMain: '#002B36',
      bgCanvas: '#073642',
      bgCard: '#094251',
      bgCardSubtle: '#0E5062',
      borderColor: '#186478',
      textPrimary: '#93A1A1',
      textSecondary: '#839496',
      textMuted: '#586E75',
      accentPrimary: '#268BD2',
      accentEmerald: '#2AA198',
      accentAmber: '#B58900',
      accentPurple: '#6C71C4',
      accentLink: '#2AA198',
      mode: 'dark'
    }
  }
];

export const BUILTIN_TYPOGRAPHY = [
  {
    id: 'typo-academic',
    name: 'Academic',
    slug: 'academic',
    description: 'Source Serif 4 for headings, Inter for body, and JetBrains Mono for telemetry.',
    typography_data: {
      headingFont: '"Source Serif 4", Georgia, serif',
      bodyFont: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      monoFont: '"JetBrains Mono", "SF Mono", monospace',
      lineHeight: '1.6',
      letterSpacing: '-0.015em'
    }
  },
  {
    id: 'typo-editorial',
    name: 'Editorial',
    slug: 'editorial',
    description: 'Merriweather heading styling with clean proportional body fonts.',
    typography_data: {
      headingFont: '"Merriweather", "Source Serif 4", serif',
      bodyFont: '"Source Sans 3", "Inter", sans-serif',
      monoFont: '"Space Mono", monospace',
      lineHeight: '1.65',
      letterSpacing: '-0.01em'
    }
  },
  {
    id: 'typo-technical',
    name: 'Technical',
    slug: 'technical',
    description: 'Dense technical font hierarchy with Fira Code accents and high glyph legibility.',
    typography_data: {
      headingFont: '"Inter", system-ui, sans-serif',
      bodyFont: '"Inter", system-ui, sans-serif',
      monoFont: '"Fira Code", monospace',
      lineHeight: '1.5',
      letterSpacing: '-0.02em'
    }
  },
  {
    id: 'typo-modern',
    name: 'Modern Sans',
    slug: 'modern',
    description: 'Clean geometry with contemporary sans-serif precision across all viewports.',
    typography_data: {
      headingFont: '"Plus Jakarta Sans", "Inter", sans-serif',
      bodyFont: '"Inter", sans-serif',
      monoFont: '"Fira Code", monospace',
      lineHeight: '1.55',
      letterSpacing: '-0.025em'
    }
  },
  {
    id: 'typo-minimal',
    name: 'Minimal Clean',
    slug: 'minimal',
    description: 'Pure system-native typography for zero network overhead and maximum rendering speed.',
    typography_data: {
      headingFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      bodyFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      monoFont: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
      lineHeight: '1.5',
      letterSpacing: '0'
    }
  }
];

export const BUILTIN_LAYOUTS = [
  {
    id: 'layout-command-center',
    name: 'Command Center',
    slug: 'command-center',
    description: 'Multi-column dense monitoring layout optimized for high-resolution desktop displays.',
    layout_data: {
      containerMaxWidth: '1440px',
      gridColumns: '12',
      panelSpacing: '1rem',
      compactMetrics: true
    }
  },
  {
    id: 'layout-research-desk',
    name: 'Research Desk',
    slug: 'research-desk',
    description: 'Balanced research workbench with prominent visual target staging and side-by-side telemetry.',
    layout_data: {
      containerMaxWidth: '1240px',
      gridColumns: '12',
      panelSpacing: '1.5rem',
      compactMetrics: false
    }
  },
  {
    id: 'layout-minimal-workspace',
    name: 'Minimal Workspace',
    slug: 'minimal-workspace',
    description: 'Single-column content-first reading view with minimized lateral chrome.',
    layout_data: {
      containerMaxWidth: '900px',
      gridColumns: '1',
      panelSpacing: '1.75rem',
      compactMetrics: false
    }
  },
  {
    id: 'layout-analysis-lab',
    name: 'Analysis Lab',
    slug: 'analysis-lab',
    description: 'Split-pane layout prioritizing data tables, node graphs, and claim verification ledgers.',
    layout_data: {
      containerMaxWidth: '1360px',
      gridColumns: '12',
      panelSpacing: '1.25rem',
      compactMetrics: true
    }
  },
  {
    id: 'layout-presentation-board',
    name: 'Presentation Board',
    slug: 'presentation-board',
    description: 'Wide-screen presentation view suitable for projections, reviews, and faculty demonstrations.',
    layout_data: {
      containerMaxWidth: '1500px',
      gridColumns: '12',
      panelSpacing: '2rem',
      compactMetrics: false
    }
  }
];

export const BUILTIN_EXTENSIONS = [
  {
    id: 'theme-studio',
    name: 'Theme Studio',
    version: '1.2.0',
    description: 'Curated collection of 5 academic, glassmorphic, and high-contrast color palettes for InsightLens.',
    author: 'InsightLens Design Lab',
    category: 'Themes',
    icon: 'palette',
    capabilities: ['themes', 'ui_styling', 'color_palette'],
    manifest: {
      id: 'theme-studio',
      name: 'Theme Studio',
      version: '1.2.0',
      description: 'Curated collection of 5 academic, glassmorphic, and high-contrast color palettes for InsightLens.',
      author: 'InsightLens Design Lab',
      category: 'Themes',
      capabilities: ['themes', 'ui_styling', 'color_palette'],
      themesCount: 5,
      themes: BUILTIN_THEMES.map(t => ({ id: t.id, name: t.name, slug: t.slug, description: t.description }))
    },
    is_builtin: true
  },
  {
    id: 'typography-lab',
    name: 'Typography Lab',
    version: '1.1.0',
    description: 'Selectable font pairings and line-height presets tailored for research papers and technical reading.',
    author: 'InsightLens Core Team',
    category: 'Typography',
    icon: 'font_download',
    capabilities: ['typography', 'font_pairing', 'text_hierarchy'],
    manifest: {
      id: 'typography-lab',
      name: 'Typography Lab',
      version: '1.1.0',
      description: 'Selectable font pairings and line-height presets tailored for research papers and technical reading.',
      author: 'InsightLens Core Team',
      category: 'Typography',
      capabilities: ['typography', 'font_pairing', 'text_hierarchy'],
      packsCount: 5,
      packs: BUILTIN_TYPOGRAPHY.map(p => ({ id: p.id, name: p.name, slug: p.slug, description: p.description }))
    },
    is_builtin: true
  },
  {
    id: 'layout-packs',
    name: 'UI Layout Packs',
    version: '1.1.0',
    description: 'Flexible viewport layouts ranging from ultra-wide Command Center to single-column Minimal Workspace.',
    author: 'InsightLens Core Team',
    category: 'Layouts',
    icon: 'dashboard_customize',
    capabilities: ['layout_modes', 'viewport_structure'],
    manifest: {
      id: 'layout-packs',
      name: 'UI Layout Packs',
      version: '1.1.0',
      description: 'Flexible viewport layouts ranging from ultra-wide Command Center to single-column Minimal Workspace.',
      author: 'InsightLens Core Team',
      category: 'Layouts',
      capabilities: ['layout_modes', 'viewport_structure'],
      layoutsCount: 5,
      layouts: BUILTIN_LAYOUTS.map(l => ({ id: l.id, name: l.name, slug: l.slug, description: l.description }))
    },
    is_builtin: true
  },
  {
    id: 'hint-engine',
    name: 'Contextual Hint Engine',
    version: '1.0.4',
    description: 'Intelligent, non-intrusive contextual tips recommending next-best actions without disruptive popups.',
    author: 'InsightLens UX Team',
    category: 'Productivity',
    icon: 'tips_and_updates',
    capabilities: ['contextual_hints', 'workflow_guidance'],
    manifest: {
      id: 'hint-engine',
      name: 'Contextual Hint Engine',
      version: '1.0.4',
      description: 'Intelligent, non-intrusive contextual tips recommending next-best actions without disruptive popups.',
      author: 'InsightLens UX Team',
      category: 'Productivity',
      capabilities: ['contextual_hints', 'workflow_guidance'],
      defaultSettings: {
        frequency: 'medium',
        showOnUpload: true,
        showOnUncertainClaims: true,
        showOnVersionMismatch: true
      }
    },
    is_builtin: true
  },
  {
    id: 'academic-mode',
    name: 'Academic Paper Mode',
    version: '1.3.0',
    description: 'Optimized workflow for literature reviews, research papers, dissertation figures, and citation checks.',
    author: 'InsightLens Academic Council',
    category: 'Research',
    icon: 'school',
    capabilities: ['academic_workflows', 'citation_tools', 'methodology_shortcuts'],
    manifest: {
      id: 'academic-mode',
      name: 'Academic Paper Mode',
      version: '1.3.0',
      description: 'Optimized workflow for literature reviews, research papers, dissertation figures, and citation checks.',
      author: 'InsightLens Academic Council',
      category: 'Research',
      capabilities: ['academic_workflows', 'citation_tools', 'methodology_shortcuts'],
      shortcuts: ['evidence_ledger', 'assumption_tester', 'citation_formatter']
    },
    is_builtin: true
  },
  {
    id: 'presentation-mode',
    name: 'Presentation & Review Mode',
    version: '1.0.2',
    description: 'Clean, distraction-free view with large findings and step-by-step navigation ideal for faculty demos.',
    author: 'InsightLens Core Team',
    category: 'Productivity',
    icon: 'co_present',
    capabilities: ['presentation_view', 'slide_navigation', 'clean_display'],
    manifest: {
      id: 'presentation-mode',
      name: 'Presentation & Review Mode',
      version: '1.0.2',
      description: 'Clean, distraction-free view with large findings and step-by-step navigation ideal for faculty demos.',
      author: 'InsightLens Core Team',
      category: 'Productivity',
      capabilities: ['presentation_view', 'slide_navigation', 'clean_display']
    },
    is_builtin: true
  },
  {
    id: 'focus-mode',
    name: 'Focus Mode (Zen Workspace)',
    version: '1.0.1',
    description: 'Collapses secondary sidebars and non-essential widgets to let you focus on active document reasoning.',
    author: 'InsightLens Core Team',
    category: 'Productivity',
    icon: 'center_focus_strong',
    capabilities: ['minimal_ui', 'distraction_free', 'zen_analysis'],
    manifest: {
      id: 'focus-mode',
      name: 'Focus Mode (Zen Workspace)',
      version: '1.0.1',
      description: 'Collapses secondary sidebars and non-essential widgets to let you focus on active document reasoning.',
      author: 'InsightLens Core Team',
      category: 'Productivity',
      capabilities: ['minimal_ui', 'distraction_free', 'zen_analysis']
    },
    is_builtin: true
  },
  {
    id: 'developer-mode',
    name: 'Developer & Schema Inspector',
    version: '1.1.2',
    description: 'Live telemetry inspector showing structured JSON schema, token timing, pipeline latencies, and validation logs.',
    author: 'InsightLens Core Engineering',
    category: 'Productivity',
    icon: 'terminal',
    capabilities: ['raw_json_inspector', 'telemetry_console', 'schema_validator'],
    manifest: {
      id: 'developer-mode',
      name: 'Developer & Schema Inspector',
      version: '1.1.2',
      description: 'Live telemetry inspector showing structured JSON schema, token timing, pipeline latencies, and validation logs.',
      author: 'InsightLens Core Engineering',
      category: 'Productivity',
      capabilities: ['raw_json_inspector', 'telemetry_console', 'schema_validator']
    },
    is_builtin: true
  },
  {
    id: 'research-mode',
    name: 'Deep Research Workspace',
    version: '1.2.0',
    description: 'Multi-document claim organization matrix and evidence ledger comparison workspace.',
    author: 'InsightLens Research Group',
    category: 'Research',
    icon: 'biotech',
    capabilities: ['claim_organizer', 'source_matrix', 'evidence_workbench'],
    manifest: {
      id: 'research-mode',
      name: 'Deep Research Workspace',
      version: '1.2.0',
      description: 'Multi-document claim organization matrix and evidence ledger comparison workspace.',
      author: 'InsightLens Research Group',
      category: 'Research',
      capabilities: ['claim_organizer', 'source_matrix', 'evidence_workbench']
    },
    is_builtin: true
  },
  {
    id: 'prompt-playground',
    name: 'Prompt Playground & Experiments',
    version: '1.0.0',
    description: 'Early-access sandbox to test prompt configurations and visual reasoning parameters without affecting stable workflows.',
    author: 'InsightLens Lab Incubator',
    category: 'Experimental',
    icon: 'science',
    capabilities: ['prompt_engineering', 'experimental_sandbox', 'prototype_lab'],
    manifest: {
      id: 'prompt-playground',
      name: 'Prompt Playground & Experiments',
      version: '1.0.0',
      description: 'Early-access sandbox to test prompt configurations and visual reasoning parameters without affecting stable workflows.',
      author: 'InsightLens Lab Incubator',
      category: 'Experimental',
      capabilities: ['prompt_engineering', 'experimental_sandbox', 'prototype_lab'],
      isBeta: true
    },
    is_builtin: true
  }
];
