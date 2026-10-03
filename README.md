# InsightLens

> **Universal Visual Understanding, Structural Reasoning and Evidence Intelligence Platform.**

InsightLens transforms visual artifacts (photographs, scientific figures, technical diagrams, architectural structures, data visualizations, documents, and UI screenshots) into structured, domain-adaptive, empirical research briefs.

---

## 🏛️ System Architecture

InsightLens is architected as a high-performance, security-hardened full-stack platform:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Client (SPA)                    │
│      Vite + Vanilla JS Modular Architecture + Tailwind      │
│   DOMPurify XSS Hardening • Progressive Telemetry Pipeline  │
│   Real-Time COCO-SSD Vision • Spatial 3D Horizon Canvas     │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON REST API / JWT Auth
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js / Express Backend                   │
│   Rate Limiting • SSRF Protection Layer • Parameter Guard   │
│   AIManager Multi-Model Vision Race Engine (Parallel Race)  │
│   Evidence Normalizer • Visual Diff Engine • Extension Host │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Multimodal Vision       │ │    PostgreSQL Database     │
│ Google Gemini + OpenRouter   │ │ Clean 15 Physical Tables   │
│ Concurrent Race & Health Mgr │ │ Reports, Evidence, Profiles│
└──────────────────────────────┘ └────────────────────────────┘
```

---

## 🗄️ PostgreSQL Database Architecture (15 Physical Tables)

The InsightLens database is structured into **15 physical tables**, each designed for relational integrity, performance, and clear college viva explanation:

| # | Table Name | Purpose & College Viva Explanation | Key Relational Foreign Keys |
| :--- | :--- | :--- | :--- |
| 1 | **`users`** | Stores authenticated user accounts, encrypted credentials (bcrypt), and roles. | Primary auth entity |
| 2 | **`user_profiles`** | Stores researcher profiles, onboarding state, avatar URL, and unified `ui_preferences` JSONB. | `user_id REFERENCES users(id) ON DELETE CASCADE` |
| 3 | **`visual_artifacts`** | Stores visual image assets, SHA-256 hashes, optical telemetry, and dimensions. | `user_email REFERENCES users(email)` |
| 4 | **`reports`** | Stores structured research reports, executive insights, findings, and schema metadata. | `user_email REFERENCES users(email)` |
| 5 | **`visual_evidence`** | Stores spatial bounding boxes, optical coordinate vectors, claims, and relations (`SUPPORTS`/`REFUTES`). | `report_id REFERENCES reports(id)` |
| 6 | **`visual_comparisons`** | Stores visual diff comparisons, added/removed elements, and structural variance between images. | `user_email REFERENCES users(email)` |
| 7 | **`visual_workspaces`** | Stores multi-image investigation sessions, canvas state, and composite research workspaces. | `user_email REFERENCES users(email)` |
| 8 | **`activity_logs`** | Stores audit logs, user actions, system events, and real-time dashboard telemetry. | Scoped to `user_email` |
| 9 | **`visual_consistencies`** | Stores cross-visual consistency evaluations across multiple diagrams (e.g. DFD vs UML). | Scoped to analysis sessions |
| 10 | **`extensions`** | Stores installable extension packages, manifests, capabilities, and permissions. | Primary extension catalog |
| 11 | **`user_extensions`** | Tracks extensions installed/activated by each user. | `extension_id REFERENCES extensions(id)` |
| 12 | **`extension_settings`** | Stores configuration parameters for active extensions per user. | `extension_id REFERENCES extensions(id)` |
| 13 | **`themes`** | Stores UI theme definitions, color palettes, and styling tokens. | Pack catalog |
| 14 | **`typography_packs`** | Stores font configurations, typography scales, and font pairings. | Pack catalog |
| 15 | **`layout_packs`** | Stores workspace layout configurations, report templates, and grid presets. | Pack catalog |

> **Viva Key Point:** Legacy redundant tables (`user_preferences`, `user_ui_preferences`, `app_metrics`) were consolidated into `user_profiles.ui_preferences` JSONB and live activity metrics, simplifying the database while preserving 100% of user customization capabilities.

---

## 🚀 Key Architectural Features

### 1. Dedicated Authentication & Onboarding
- **Dedicated Login & Sign-Up:** Independent views with real-time form validation, password visibility toggle, and secure password hashing.
- **7-Step Interactive Onboarding:** Collects researcher background, intent, analysis depth, optical settings, and visual focus, persisting preferences into PostgreSQL.
- **Contained Avatar Uploads:** Avatar previews and profile photos are strictly bounded to circular containers with CSS `object-fit: cover`, preventing layout displacement.

### 2. Multi-Model Vision & Evidence Engine
- **True Parallel Provider Race:** Executes concurrent requests across Google Gemini (`gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`) and OpenRouter gateway candidates.
- **Evidence Verification:** Spatial bounding box coordinate normalization with `[0, 1]` bounds clipping and claim classification (`OBSERVED`, `INFERRED`, `UNDETERMINABLE`).
- **Diagram & Chart Extraction:** Structural extraction of nodes, edges, processes, data stores, and data flows with duplicate resolution.

### 3. Live Vision Real-Time Object Detection
- Real-time client-side COCO-SSD object detection running directly against camera frames.
- Aspect-ratio responsive canvas overlay drawing verified bounding boxes, confidence scores, and categorical labels.

### 4. 3D Spatial Landing Horizon
- Custom 3D particle horizon canvas with multi-layer depth velocity, interactive mouse parallax, rotating wireframe objects, and smooth 60fps rendering across desktop, laptop, and mobile viewports.

---

## ⚙️ Environment Variables

Create a `.env` file inside the `backend/` directory:

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | **Yes (Prod)** | PostgreSQL connection string (`postgres://...`) |
| `JWT_SECRET` | **Yes (Prod)** | Cryptographic signing secret for user session tokens |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key for multimodal vision inference |
| `OPENROUTER_API_KEY`| Optional | OpenRouter API key for secondary failover |
| `CORS_ORIGINS` | Optional | Comma-separated list of allowed frontend origins |
| `PORT` | Optional | Backend server port (Default: `3000`) |
| `NODE_ENV` | Optional | Environment mode (`production` or `development`) |

---

## 🛠️ Development & Build

### Backend
```bash
cd backend
npm install
npm test      # Runs canonical test suites (Auth, Analysis, Evidence, LiveVision, Comparison, Extensions, Security)
npm start     # Starts production server on port 3000
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # Starts Vite development server
npm run build # Generates production bundle in dist/
```

---

## 🔒 Security Hardening

- **Authentication:** Scoped JWT tokens with secure cookie / Bearer authorization headers.
- **XSS Protection:** DOMPurify sanitization across all report rendering paths.
- **SSRF Defense:** IP/DNS parsing and validation blocking all intranet, loopback, and metadata ranges.
- **Rate Limiting:** Dedicated tier-based rate limiters on `/api/auth`, `/api/analyze`, and general `/api` routes.
- **Parameter Pollution:** HPP protection against duplicate HTTP query parameter tampering.
