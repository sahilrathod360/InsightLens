# InsightLens Agent Rules

## Scope

- Modify only the requested feature.
- Never change unrelated files or functionality.
- Ask before performing large refactors.

## Code Quality

- Keep code modular, reusable, and well-commented.
- Do not duplicate code.
- Follow the existing project structure and naming conventions.

## UI/UX

- Maintain a clean, modern, responsive design.
- Keep styling consistent across the application.
- Do not redesign existing pages unless requested.

## Performance

- Avoid unnecessary dependencies.
- Optimize for performance and responsiveness.

## AI Features

- Never generate fake AI analysis.
- If the AI API fails or quota is exceeded, show a clear error and stop the analysis.
- Do not fabricate research results.

## Backend

- Prefer secure backend implementations over exposing secrets in the frontend.
- Never hardcode API keys or sensitive credentials.

## Before Completing

- Verify the project builds successfully.
- Fix linting or runtime errors introduced by your changes.
- Summarize what was changed.
