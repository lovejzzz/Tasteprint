# Security Policy

## Reporting a Vulnerability

If you discover a security issue in Tasteprint, please report it privately:

1. **Do not** open a public issue.
2. Email the maintainers or use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) feature on this repository.

We will acknowledge reports within 48 hours and aim to release a fix within 7 days for confirmed vulnerabilities.

## Scope

Tasteprint runs entirely in the browser. The main security surface is:

- **JSON import** — untrusted files are validated and HTML-sanitized via `validateImport` / `sanitizeHtml` in `src/utils.js`
- **HTML rendering** — user-editable text fields pass through sanitization before rendering
- **No server-side code** — Tasteprint is a static single-page app with no backend

## Supported Versions

Only the latest release on `main` receives security updates.
