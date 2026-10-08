# Elnovar — Recruitment & Talent Solutions

A responsive preview website for **Elnovar**, a UK recruitment brand focusing initially on engineering and manufacturing, logistics and transport, and warehousing and industrial operations.

## Website files
- `index.html` — accessible page structure and content
- `styles.css` — responsive layout, visual system and typography
- `script.js` — mobile navigation, audience switch and demo-only enquiry interaction

No framework, dependency installation or build step required.

## Preview locally
Open `index.html` in a modern browser. Images and Google Fonts need an internet connection.

## Publish using GitHub Pages (free public-repository route)
1. Make sure the repository contains no private data or secrets.
2. In **Settings → General**, change the repository visibility to **Public**, if needed.
3. In **Settings → Pages**, choose **Deploy from a branch**, branch `main`, folder `/(root)`, and **Save**.
4. After GitHub finishes deploying, check: https://rahis306-png.github.io/elnovar-site/

GitHub Free generally requires the repository to be public to publish through GitHub Pages. If you want to retain a private repository, use another static host with free-tier support and repository integration.

## Important launch checklist
This is a preview, **not yet a live recruitment service**.
- The enquiry form **does not send, process or store enquiries**. A confirmation message explains this.
- Before activating forms, confirm a lawful privacy/data-handling process, controller identity, retention rules and rights information.
- Add the legal entity's registered name, company number and address where required.
- Confirm whether Elnovar is a trading name and ensure commercial claims are accurate.
- Establish an actual employer-contact channel and a functioning enquiry backend before using the site for campaigns.
- Have recruitment terms of business reviewed and agreed before introducing candidates to employers.
- Review image licences/availability and accessibility before production launch.
- The website currently loads stock photography from Unsplash and fonts from Google Fonts.

## Future integration
Connect approved form endpoints/ATS or CRM, then add job listings and compliant employer and candidate workflows. Keep secrets in the chosen hosting provider's environment settings, never in frontend JavaScript.

Built for a staged launch; no other GitHub repositories are changed.


## Recruitment services & on-page SEO (8 October 2026)
- Added a detailed six-category services overview at `services/` (all 32 commercial opportunities, plus three commercial formats).
- Added distinct focused pages at `services/permanent-recruitment/` and `services/recruitment-outsourcing/`.
- Added industry pages for engineering/manufacturing, logistics/transport and warehousing/industrial.
- Homepage now includes links to services and sector landing pages.
- Unique page titles, meta descriptions, canonical URLs, breadcrumb JSON-LD, homepage Organization JSON-LD, semantic headings, sitemap.xml, robots.txt and an SVG favicon.
- **Important:** The 'Initial focus' label is not a claim that the agency has fulfilled placements or secured clients. 'In development' / 'specialist setup' capabilities must not be represented as operational.
- SEO base URL is currently `https://rahis306-png.github.io/elnovar-site/`. Update canonical links and sitemap if a custom domain is connected.
- Enquiry form remains a demo and does not transmit enquiries. The live site must not be used for lead capture until the form backend, privacy notice and legal-entity details have been configured.
- Google indexing is not automatic: verify the site in Search Console and submit `sitemap.xml` after public hosting is confirmed.
