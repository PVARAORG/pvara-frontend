## Summary

Adds UX and infra improvements in a feature branch:

- In-app toasts via `src/ToastContext.jsx` for non-blocking notifications.
- Audit viewer (UI + CSV export) to inspect audit trail entries.
- Admin: job create / edit / delete features and form improvements.
- Replaced blocking `alert()` calls with toasts across the app.
- Playwright E2E tests and configuration for end-to-end verification.
- GitHub Actions CI workflow to run unit tests and Playwright E2E.
- Dockerfile and `.dockerignore` to package the frontend for production.

## Files changed / added (high level)
- `src/PvaraPhase2.jsx` — core app: admin view, audit view, toasts usage.
- `src/ToastContext.jsx` — new toast provider and hook.
- `playwright.config.js`, `tests/e2e.spec.js` — Playwright config and tests.
- `.github/workflows/ci.yml` — CI: run unit tests and Playwright E2E.
- `Dockerfile`, `.dockerignore` — production image build.
- `README.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `PR_BODY.md`.

## How to test locally
1. Install deps:
   ```bash
   npm install
   npx playwright install --with-deps
   ```
2. Run unit tests:
   ```bash
   CI=true npm test -- --watchAll=false
   ```
3. Run E2E (dev server starts automatically via Playwright webServer):
   ```bash
   npx playwright test
   ```
4. Run dev server locally:
   ```bash
   npm start
   # visit http://localhost:3000
   ```

## QA / Acceptance criteria
- Unit tests pass.
- Playwright E2E pass in CI.
- Admin user (username: `admin`) can create, edit, delete jobs.
- Audit entries get recorded for create/edit/delete actions and are exportable.

## Next steps / Recommendations (post-merge)
- Add Dependabot for dependency updates and pin Playwright version in CI.
- Add container image scanning (Trivy) in CI before deployments.
- Add deployment workflow (e.g. GitHub Actions -> container registry -> k8s/Heroku/Vercel).
- Integrate real auth (OIDC) and back-end API for persistence.
- Add monitoring/observability, Sentry/error boundary and structured logging.

---

(You can use this file as `--body-file` for `gh pr create`.)
