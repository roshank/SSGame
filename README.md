# Fix Social Security

An interactive, no-build web app for exploring how policy levers (payroll tax rate, taxable maximum,
retirement age, benefit formula, COLA, trust-fund investing, demographics) change the Social Security
trust fund. Levers are grouped into five buckets (Sources, People, Retirement, Economy, Shocks), with political capital, approval meters and unlockable missions. Includes presets modeled on real proposals and a table of published expert scores.

Open `index.html` in a browser (or `python3 -m http.server`). Scenarios are shareable via the URL hash.

- `model.js`: projection engine, calibrated to the 2026 Trustees Report (combined depletion 2034, 4.42% gap)
- `data.js`: sourced reference scores and preset encodings
- `app.js`, `styles.css`: UI
- `scripts/calibrate.js`: compares single-lever results to published scores

This is a simplified educational model, not an official estimate. See the in-app notes for limits.

## Deploy
Pushes to `main` deploy to GitHub Pages via `.github/workflows/pages.yml`.
One-time setup: repo Settings → Pages → Source: **GitHub Actions**.
Live at https://roshank.github.io/SSGame/
