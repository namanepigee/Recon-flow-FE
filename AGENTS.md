# AGENTS.md

## Project Context

This repository contains the frontend for a financial reconciliation application.

Tech stack:

- React
- JavaScript
- Tailwind CSS
- npm
- Node.js 22 target runtime, matching the current `node:22-alpine` Dockerfile

The backend is maintained in a separate repository.

CI validation is required before changes are merged into main.
Codex automatic review is enabled for pull requests in this repository.

## Project Validation

Run these checks before handing off frontend changes:

```bash
npm run lint
npm run format:check
npm run build
```

There is currently no automated test suite. Do not invent or reference a test command yet.

## Development Rules

- Do not introduce TypeScript unless explicitly requested.
- Do not replace npm with another package manager.
- Do not change API contracts without explicitly mentioning it.
- Do not hardcode backend URLs, secrets, tokens, or credentials.
- Use environment variables for environment-specific API URLs.
- Keep components reasonably modular.
- Reuse existing components and utilities before creating duplicates.
- Follow the existing project structure and conventions.
- Do not introduce new major dependencies unless necessary.

## Code Review Rules

- Check for exposed secrets or credentials.
- Check for broken authentication flows.
- Check for incorrect authorization assumptions in the UI.
- Check for hardcoded API URLs.
- Check error and loading states for API requests.
- Check for regressions in responsive UI.
- Check for unnecessary dependency additions.
- Check that `npm run lint` and `npm run build` continue to pass.
