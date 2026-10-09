# Free portfolio website monitor — ELNOVAR Group

This repository participates in the same **zero-new-subscription** monitor architecture as MRKHD, Avencrest, ELNOVAR Group and Airport Transfer Desk. It uses GitHub Actions, Chromium + Playwright, axe-core WCAG checks, and Lighthouse. No Copilot/API-token or paid AI service is required.

## Schedule and triggers
- Daily live production browser audit in a staggered early-morning UTC slot (GitHub cron execution can be delayed or skipped).
- Weekly live Lighthouse report every Monday (separate JSON artifact; advisory, not a hard SEO score requirement).
- Every PR and main push: same browser monitor against a local static preview of the proposed source. Tests are **advisory**, not a merge gate until existing defects are baselined.
- On demand: GitHub > Actions > **Free website quality monitor** > **Run workflow**.

## Included checks
Each configured public route: reachable HTML/HTTP response, exactly one H1 in main, meaningful title, correct canonical host, no fatal browser JavaScript errors. Checks also verify robots/sitemap fetchability, key internal navigation, mobile menu Escape behavior, homepage horizontal overflow at 375px and 1440px, the key lead/booking entry point, and serious/critical automated axe-core WCAG violations. Screenshots and a JSON report are attached to each workflow run for five days.

**Production schedule/manual audit only**: failed checks create or reopen an identifiable per-check GitHub issue. When a failing check later passes, the monitor closes its own issue. Already-open issues are **not updated every day**, reducing repetitive notification email. A manually closed **not planned** monitor issue is respected. The monitor never closes ordinary founder-created issues.

## Safety, billing and limitations
- Both scripts run using GitHub-hosted Actions runners, **not ChatGPT Work/Computer sessions**. They consume GitHub Actions minutes/storage under the account allowance and could be billed if limits/overages permit it.
- One Chromium browser installed per workflow; each browser job capped at 18 minutes; Lighthouse job capped at 10 minutes, concurrency cancelled on same ref.
- No external API keys, passwords, payment calls, customer submission, form data capture, or privileged operator visits. No automatic code fixes or merges: AI-agent mode needs a separate explicit paid-provider/budget decision.
- Only production checks create automated issues. Failure reports exclude names, customer input, request bodies or sensitive secrets, and screenshots target public pages.
- Screenshots are **evidence**, not screenshot-to-baseline comparisons; establishing approved visual baselines and actual iOS Safari testing remains a follow-up.
- For ELNOVAR Group, intentional launch-stage `noindex` or demo/live policies are **not** changed by the monitor. Search Console indexation and legal go-live requirements still require verification.
- Real browser tests against a local Python static server cannot exercise Cloudflare Pages Functions, Worker API, Stripe, D1, email or SMS. They are separate integration tests and launch criteria.
- Lighthouse scores and accessibility analysis are screening tools, not proof of legal or WCAG compliance.
- GitHub Actions issue creation needs **Settings → Actions → General → Workflow permissions** to permit a GITHUB_TOKEN with `issues: write`. If policy restricts it, a repository owner must allow that permission; do not introduce PATs or paid apps automatically.

## Operating loop
1. Scheduled/browser audit creates evidence-backed GitHub issues.
2. A developer or GitHub MCP-assisted AI (when invoked) implements changes through a PR.
3. Existing CI and Playwright preview checks run; consider serious regressions before merge.
4. Cloudflare updates the live website through the normal existing deploy process.
5. Next live production monitor checks recovery and auto-closes only its own resolved issues.

**Cost control:** Default cadence is daily + weekly and the runs use no AI tokens. Monitor monthly Actions minutes via GitHub Billing & Licensing and keep additional spend at £0. For more frequent checks (every hour) or autonomous coding, first measure actual run duration and approve billing separately.

Configured live domain: https://elnovargroup.co.uk/
