# Website lifecycle — ELNOVAR Group

Production: https://elnovargroup.co.uk/

## Phase 1: Development (current)
- **Current status: DEVELOPMENT — not declared launch-ready.**
- At setup, GitHub had **6 open issues** for this repository; this figure is a starting baseline, not a live count.
- Prioritise P0/P1 customer-facing faults, accuracy, access, deployment and real functional verification.
- Autonomous AI is **opt-in** via Actions repository variable `AUTO_DEV_ENABLED=true`; it selects only an explicitly approved open issue, runs bounded tests and proposes a **draft PR**. It never automatically merges.
- Provider/API secrets, business identity, real payment, data protection, UK legal and operational requirements require independent verification; keep launch gates in place until then.

## Phase 2: Maintenance — only after owner approval
Set GitHub Actions repository variable **`SITE_MODE=maintenance`** when ALL these conditions are met:

1. No unresolved **critical or launch-blocking** defects; approved deferred enhancements documented distinctly from defects.
2. Live production URLs, mobile/accessibility, responsive navigation, security headers and real enquiry/booking flows (where applicable) tested with evidence.
3. Real-world identity, service/capacity, data protection, licence, provider/email and payment requirements verified where relevant.
4. Appropriate Search Console ownership, sitemap, indexability and privacy controls checked; do not remove deliberate noindex prelaunch.
5. Seven consecutive days of production health checks with no unresolved critical regression, plus explicit owner sign-off.
6. Actual analytics/booking figures are used for conversion assessments **only if** connected and privacy compliant.

**`SITE_MODE=maintenance` pauses the daily Copilot coding job even when `AUTO_DEV_ENABLED=true`.** Health checks still run. Switch it back to `development` deliberately if major new work is approved.

## Ongoing reviews (both phases)
- **Daily:** existing Chromium browser/mobile/SEO/axe site-quality monitoring; deduplicated defect issues.
- **Weekly (Sunday):** security posture, production response headers, exposed-sensitive-file probes and repository token-pattern detection; ATD also performs npm dependency auditing.
- **Monthly:** live sitemap URL and canonical audit, mobile and desktop Lighthouse laboratory performance, conversion-data availability register (actual lead/revenue metrics only when verified feed exists).
- **On demand:** release readiness, genuine conversion improvements and urgent security fixes. No cosmetic change solely to keep AI busy.

Security checks are baseline automation, not penetration testing. Production HTTP checks and GSC/API integrations may be unavailable; UNKNOWN is not PASS. Do not introduce third-party analytics/cookie tracking or publish unverified commercial claims automatically.

See `.github/workflows/free-quality-monitor.yml`, `.github/workflows/portfolio-lifecycle-review.yml`, and `.github/workflows/safe-autonomous-development.yml`.
