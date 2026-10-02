# InsightLens — GitHub Copilot Instructions

## 1. Project Identity

InsightLens is an AI-powered visual intelligence platform.

Tagline:
"See Deeper. Analyze Smarter."

Core purpose:

Transform visual information into structured, relevant, evidence-grounded and explainable knowledge.

The product is NOT:
- a generic AI chatbot
- a generic project-management tool
- a generic document summarizer
- a collection of random AI features
- a demo that produces fake-looking outputs

The four core product principles are:

1. ACCURACY
2. RELEVANCE
3. STRUCTURE
4. EVIDENCE

Every major feature must strengthen at least one of these principles.

---

# 2. Technology Stack

Frontend:
- HTML
- CSS
- JavaScript
- Tailwind where already used
- Vite
- Do NOT migrate the frontend to React unless explicitly requested.

Backend:
- Node.js
- Express
- ES Modules

AI:
- Google Gemini
- OpenRouter where already implemented

Image processing:
- Sharp

Database:
- PostgreSQL
- Aiven PostgreSQL is the authoritative production database.

Deployment:
- Vercel frontend
- Render backend

Do not introduce another database or make LocalStorage the source of truth.

---

# 3. Existing Architecture

Respect the existing architecture.

Before modifying functionality:

1. Search the repository.
2. Find the existing implementation.
3. Understand its data flow.
4. Reuse existing APIs/services/components where appropriate.
5. Modify the existing subsystem rather than creating a duplicate subsystem.

Never create:
- duplicate comparison engines
- duplicate report engines
- duplicate AI services
- duplicate authentication systems
- duplicate evidence systems
- duplicate state managers

unless there is a clearly documented architectural reason.

---

# 4. Core Product Workflows

The primary workflows are:

## Analyze Visual

UPLOAD
→ CLASSIFY
→ UNDERSTAND
→ STRUCTURE
→ EXTRACT CLAIMS
→ GROUND WITH EVIDENCE
→ GENERATE REPORT
→ EXPLORE / ASK / GUESS / SPEECH / EXPORT

Supported visual categories include:

- photographs
- screenshots
- documents
- charts
- tables
- DFDs
- UML diagrams
- ER diagrams
- flowcharts
- architecture diagrams
- technical figures
- mixed visual content

Do NOT make InsightLens diagram-only.

---

## Compare

Compare 2–3 visual artifacts.

Comparison must be based on actual visual content.

It must NOT compare:
- filenames
- database IDs
- upload IDs
- generic category labels
- placeholder descriptions

The user should receive meaningful information such as:

- subjects
- objects
- attributes
- visual composition
- environment
- text
- spatial relationships
- structure
- similarities
- differences
- unique features
- meaningful conclusions
- uncertainty where appropriate

For diagrams, additionally compare:

- nodes
- entities
- processes
- relationships
- edges
- directions
- topology
- labels

For charts:

- axes
- categories
- series
- values
- trends
- legends
- annotations

Comparison output must be understandable to a normal user.

Never produce meaningless output such as:

"Image 1 is distinguished by..."
"Image 2 is distinguished by..."

without explaining the actual distinction.

---

# 5. Evidence Rules

Never fabricate evidence.

Use these semantic statuses:

OBSERVED
INFERRED
UNDETERMINABLE
POTENTIAL CONFLICT
CONTRADICTED

Do not invent numerical confidence percentages unless there is a defensible statistical basis.

Do not claim that an object, relationship, text, coordinate or property exists unless the underlying analysis actually provides evidence for it.

If evidence is insufficient:

say exactly what is missing.

Never replace missing evidence with a plausible guess.

---

# 6. AI Output Rules

AI output must be grounded in the actual input.

NEVER generate generic filler just because a section exists.

NEVER use hardcoded fake results to make a UI appear complete.

NEVER use sample/demo data as production analysis.

Demo/sample content must be explicitly labelled as demo content.

AI failures must surface honestly.

If an AI provider is unavailable:
- show a useful error state
- preserve the user's input
- allow retry
- do not silently substitute fake analysis

---

# 7. Guess Mode / Test Your Understanding

Guess Mode is a post-report feature.

It must appear as a modal after report generation.

It must NOT appear as a permanent page section.

Questions MUST be generated from the actual report and its grounded findings.

Questions should test:
- actual subject matter
- actual observations
- actual extracted facts
- actual relationships
- actual conclusions supported by the report

Never generate generic InsightLens/product questions.

Never repeatedly show the same hardcoded questions.

Even when the report contains limited information, generate useful questions from whatever grounded information exists.

If the report contains very little factual information, questions must remain limited to those facts rather than inventing information.

Each question must have:
- question
- options
- correct answer
- explanation
- evidence/report reference when available

---

# 8. Speech / Explain Report

Speech is also a post-report modal.

It must explain the actual generated report.

It should not read only the first one or two lines.

Narration should be structured into steps:

1. What the visual shows
2. Important visual findings
3. Structure / relationships
4. Evidence and interpretation
5. Important conclusions
6. Limitations / uncertainty where relevant

Provide:
- Play
- Pause
- Resume
- Stop
- Next
- Previous
- progress
- playback controls

Speech should sound natural and conversational.

Do not create robotic sentence-by-sentence reading.

Use the best available browser/native or configured speech system already supported by the project.

Do not fabricate audio success if speech synthesis fails.

---

# 9. Live Vision

Live Vision must provide genuine real-time visual detection.

When supported by the AI pipeline, show bounding boxes for detected objects such as:

- person
- laptop
- phone
- bed
- chair
- book
- bottle
- etc.

Bounding boxes must be mapped correctly to the displayed video coordinates.

Account for:
- aspect ratio
- letterboxing
- cropping
- mobile viewport
- desktop viewport
- camera orientation

Do not draw fake boxes merely to demonstrate the feature.

Mobile camera controls must include:
- front camera
- rear/environment camera

Camera permission failures must have clear user-facing messages.

---

# 10. Archive

Archive must show the actual stored source visual whenever available.

Never intentionally display:

"Image unavailable"

when the source image exists.

Verify:
- image URL/path
- storage reference
- database record
- authentication
- API response
- frontend rendering

Do not fix the UI by hiding missing images.

Fix the underlying data flow.

---

# 11. Reports

Reports should feel like genuine visual intelligence/research reports.

Reports should contain useful sections based on the actual analysis.

Possible sections:

1. Executive Summary
2. Visual Classification
3. Visual Evidence / Observations
4. Detected Objects / Elements
5. Structural Analysis
6. Relationships / Spatial Context
7. Evidence-Grounded Findings
8. Relevant Interpretation
9. Important Insights
10. Uncertainty / Limitations
11. Sources / External Research when actually used
12. Concluding Synthesis

Do not force every section into every report.

A section should appear only when it contains meaningful information.

Never use filler text to make reports longer.

Longer does NOT automatically mean better.

The goal is useful depth.

---

# 12. Did You Know

A "Did You Know?" feature may appear as a notification after report generation.

It must be contextually relevant to the analyzed subject.

Examples:

- historical facts
- cultural facts
- scientific facts
- technological facts
- interesting biographical facts

Facts must be verifiable when external research is used.

Do not fabricate shocking facts.

Do not create clickbait claims merely because they sound interesting.

Clearly distinguish:
- fact from interpretation
- visual observation from external knowledge

---

# 13. UI/UX Principles

The UI should look like a professional visual intelligence product.

Priorities:

- clean hierarchy
- readable typography
- consistent spacing
- responsive design
- mobile usability
- meaningful visual grouping
- clear loading states
- clear error states
- clear empty states
- no unnecessary scrolling
- no horizontal overflow
- no broken buttons
- no duplicated content
- no developer/debug content in normal user workflows

Do not redesign the entire application unnecessarily.

Improve the existing visual language.

The interface should feel impressive because the functionality is useful, not because of excessive animations or decorative elements.

---

# 14. Navigation

Current primary navigation:

Home
Analyze
Compare
Archive
Extensions
Settings

Do not reintroduce removed generic engineering/knowledge-management sections.

Do not add generic AI features simply to increase the feature count.

---

# 15. Extensions

The existing extension platform must remain functional.

Existing lifecycle:

Not Installed
→ Download
→ Install
→ Disabled
→ Enable
→ Use
→ Disable
→ Uninstall

Do not rebuild the extension architecture.

Do not add new extensions unless explicitly requested.

Extension state must remain user-specific and authoritative in PostgreSQL.

---

# 16. PostgreSQL

PostgreSQL is the authoritative persistence layer.

Important product data should persist through PostgreSQL.

Do not use LocalStorage as the source of truth for:
- reports
- analyses
- claims
- evidence
- workspaces
- comparisons
- user settings
- extension state

LocalStorage may only be used for appropriate transient UI preferences when explicitly justified.

---

# 17. Security

All security changes must preserve product functionality.

Important requirements:

- validate authentication
- isolate users
- validate IDs
- validate file paths
- prevent path traversal
- validate uploaded files
- prevent arbitrary filesystem access
- protect state-changing APIs
- never expose secrets
- never trust client-provided ownership
- validate database access by authenticated user

Never solve a security issue by breaking legitimate product workflows.

---

# 18. Testing

Before declaring a feature complete:

Run relevant tests.

At minimum when appropriate:

npm test

npm run build

npm run test:prod:http

npm run test:prod:browser

Tests must verify actual behavior.

Do NOT modify tests simply to make broken functionality pass.

A passing test suite is not proof of semantic AI accuracy.

For AI-heavy functionality, include deterministic validation around:
- schema
- required fields
- evidence references
- unsupported claims
- empty results
- malformed responses
- fallback behavior

---

# 19. Production Verification

When a feature affects production:

1. Build the frontend.
2. Verify backend API.
3. Verify the actual deployed frontend.
4. Test desktop.
5. Test mobile/responsive behavior where relevant.
6. Check browser console.
7. Check network/API failures.
8. Check database persistence.
9. Check actual AI response.
10. Check that no demo/fake data is being displayed.

Do not claim "verified" merely because the page loads.

---

# 20. Coding Rules

Prefer small, maintainable modules.

Use existing naming conventions.

Do not silently change unrelated functionality.

Do not delete existing functionality without understanding dependencies.

Do not create unnecessary abstraction layers.

Do not add dependencies unless necessary.

Do not hardcode production results.

Do not hardcode user-specific data.

Do not hardcode AI answers.

Do not hide errors.

Do not suppress console/API errors merely to make tests green.

---

# 21. Before Editing

For every substantial task:

FIRST:

- inspect repository
- search for existing implementation
- identify frontend component
- identify backend route
- identify controller/service
- identify database interaction
- identify existing tests
- identify related UI

THEN:

- explain internally what is wrong
- modify the smallest coherent set of files
- test
- inspect actual output
- fix regressions

Do not immediately create a new subsystem.

---

# 22. Definition of Done

A feature is NOT complete merely because:

- the button exists
- the modal opens
- the API returns 200
- the test passes
- the UI looks good

A feature is complete only when:

1. The UI works.
2. The backend works.
3. The database flow works where applicable.
4. The actual AI/data output is meaningful.
5. The result is grounded in real input.
6. Errors are handled.
7. Mobile works where applicable.
8. Existing workflows are not broken.
9. No fake/demo output is used.
10. Relevant automated tests pass.
11. Production behavior has been checked when applicable.

---

# 23. Critical Instruction

When you see a feature that technically works but produces meaningless, generic, fake, placeholder, repeated, or filename-based output:

DO NOT simply improve the wording.

Trace the entire pipeline:

INPUT
→ EXTRACTION
→ AI REQUEST
→ AI RESPONSE
→ NORMALIZATION
→ DATABASE
→ API
→ FRONTEND
→ DISPLAY

Find where information is being lost or fabricated.

Fix the root cause.

InsightLens is judged primarily on:

ACCURACY
RELEVANCE
STRUCTURE
EVIDENCE

Never sacrifice these just to make the interface appear complete.