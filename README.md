# ELNOVAR GROUP — Recruitment & Talent Solutions

Static multi-page website for Elnovar Group, focusing initially on engineering and manufacturing, transport and logistics, and warehousing/industrial recruitment.

## Source and production
- GitHub source: `rahis306-png/elnovar-site`, production branch `main`.
- Target production hostname: **https://elnovargroup.co.uk/**, purchased and reported connected to Cloudflare by the owner.
- Hosting target: **Cloudflare Pages**, linked to GitHub `main`.
- Framework preset: None; build command `exit 0` or empty if supported; output directory `.` (repository root).
- GitHub is for code and pull requests; Cloudflare Pages is for deployment and HTTPS. Keep GitHub Pages custom-domain settings disabled if not using GitHub Pages.
- Do not assume a GitHub commit proves Cloudflare deployment succeeded: verify Cloudflare deployment status and visit the live URLs.

## Structure
- `index.html` homepage, employer/candidate navigation and preview-only enquiry form.
- `services/` services overview; `services/permanent-recruitment/` and `services/recruitment-outsourcing/`.
- `industries/` engineering/manufacturing, logistics/transport, warehousing/industrial landing pages.
- `styles.css`, `script.js` static frontend; `favicon.svg`.
- `sitemap.xml` and `robots.txt` refer to **https://elnovargroup.co.uk/**.
- All 7 HTML pages include unique titles, descriptions, canonical URLs, Breadcrumb/WebPage structured data as appropriate.
- Brand wordmark is ELNOVAR with GROUP in smaller lettering in header and footer; approved for `main` in PR #2.

## Operational limits
**A deployed website is not proof the agency is operational.**
- Enquiry form is **a preview only**; it does **not deliver, process or store** candidate/employer messages. Users should not enter real personal details.
- Before enabling lead collection, confirm monitored recipient email and secure form delivery, anti-spam controls, privacy notice/controller identity, retention policy, and test delivery.
- Verify legal entity/trading status, company number/address where applicable, insurance, and agreed recruitment terms of business before taking instructions or introducing candidates.
- Confirm all service and capacity claims; services marked in-development must not be marketed as operational. Do not invent placements, testimonials, clients or accreditations.
- Website loads Google Fonts and remote image assets; review licences and privacy disclosures.
- Once domain resolves, verify Cloudflare HTTPS, all seven routes, no broken internal links, and the submitted sitemap.
- Verify **https://elnovargroup.co.uk/** in Google Search Console and submit `https://elnovargroup.co.uk/sitemap.xml` when ready.

## Development workflow
Prefer feature branches and pull requests for complex changes. Merging approved changes to `main` triggers the Cloudflare Pages production deployment only if the Git integration remains active. No credentials or personal candidate records may be committed.
