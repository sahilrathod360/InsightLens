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
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON REST API / JWT Auth
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js / Express Backend                   │
│   Rate Limiting • SSRF Protection Layer • Parameter Guard   │
│   AIManager Multi-Model Vision Race Engine (Parallel Race)  │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Multimodal Vision       │ │    PostgreSQL Database     │
│ Google Gemini + OpenRouter   │ │ User-Scoped Persistence    │
│ Concurrent Race & Health Mgr │ │ Reports, History, Archive  │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## 🚀 Key Architectural Components

### 1. Frontend Client
- **Lightweight Single-Page Architecture:** Built with Vite and pure modular ECMAScript without heavy framework runtime overhead.
- **Strict XSS Defense:** All user inputs, model outputs, dynamic Markdown tables, and API responses are sanitized through DOMPurify prior to DOM insertion.
- **Telemetry & Dimensions Engine:** Computes client-side optical statistics (resolution, aspect ratio, luminance distribution, contrast vectors) directly on the canvas.

### 2. Multi-Model Vision Engine
- **True Parallel Provider Race:** Executes concurrent requests across configured multimodal vision models (Google Gemini `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, and OpenRouter gateway candidates).
- **Fastest Valid Response Policy:** The first complete, schema-conforming response is accepted, preventing slow, rate-limited, or billing-blocked models from holding the pipeline hostage.
- **Dynamic Model Health Tracker:** Automatically tracks provider latency, error rates, and HTTP 429/402 responses to deprioritize failing endpoints.

### 3. PostgreSQL Persistence & User Scoping
- **Authenticated Data Isolation:** Every report, archive query, dashboard calculation, and preference update is strictly scoped to the verified JWT session owner (`req.user.email`).
- **Idempotent Database Migrations:** Automatically verifies and initializes PostgreSQL schemas, tables, and foreign keys on startup.
- **Image De-duplication:** Prevents redundant base64 image storage, persisting single-source image records while maintaining backward compatibility for legacy reports.

### 4. Citation & SSRF Protection Layer
- **Strict Outbound URL Validation:** All citation verification requests pass through a security layer that parses and validates protocols, hostnames, and IP addresses.
- **Comprehensive SSRF Defense:** Blocks loopback addresses (`127.0.0.1`, `localhost`, `::1`), private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), cloud metadata services (`169.254.169.254`), and non-HTTP(S) schemes.

---

## 📷 Supported Image Formats

InsightLens supports standard raster and modern web image formats:
- **JPEG** (`image/jpeg`, `image/jpg`)
- **PNG** (`image/png`)
- **WebP** (`image/webp`)

*Maximum upload file size: 20MB client-side / 35MB API payload limit.*

---

## 📄 Document Export Capabilities

- **PDF Export:** Standalone printable document rendering optimized for executive reporting.
- **Markdown (`.md`):** Complete structured research document including metadata, executive summaries, data tables, and citation references.
- **JSON (`.json`):** Full serialized Report 2.0 schema payload for programmatic integration.

---

## ⚙️ Environment Variables

Create a `.env` file inside the `backend/` directory based on `.env.example`:

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | **Yes (Prod)** | PostgreSQL connection string (`postgres://...`) |
| `JWT_SECRET` | **Yes (Prod)** | Cryptographic signing secret for user session tokens (min. 16 characters) |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key for multimodal vision inference |
| `OPENROUTER_API_KEY`| Optional | OpenRouter API key for secondary failover |
| `CORS_ORIGINS` | Optional | Comma-separated list of allowed frontend origins |
| `PORT` | Optional | Backend server port (Default: `3000`) |
| `NODE_ENV` | Optional | Environment mode (`production` or `development`) |

---

## 🛠️ Development & Build

### Prerequisites
- Node.js 18+ (tested on Node v20/v24)
- PostgreSQL database instance (or cloud provider like Aiven/Neon/Supabase)

### Backend Setup
```bash
cd backend
npm install
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Production Build
```bash
cd frontend
npm run build
```

---

## 🔒 Security Summary

- **Authentication:** Scoped JWT tokens with secure cookie / Bearer authorization headers.
- **XSS Protection:** DOMPurify sanitization across all report rendering paths.
- **SSRF Defense:** IP/DNS parsing and validation blocking all intranet, loopback, and metadata ranges.
- **Rate Limiting:** Dedicated tier-based rate limiters on `/api/auth`, `/api/analyze`, and general `/api` routes.
- **Parameter Pollution:** HPP protection against duplicate HTTP query parameter tampering.
