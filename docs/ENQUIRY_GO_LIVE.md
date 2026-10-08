# Elnovar Group — secure enquiry go-live checklist
Status: **server and progressive frontend code implemented; external configuration NOT VERIFIED**.

The production repository now includes:
- `functions/api/enquiry.js` — Cloudflare Pages GET status and secure POST email delivery, strict field validation, origin/hostname restriction, Cloudflare Turnstile verification, honeypot and privacy-safe generic errors.
- `enquiry-live.js` — status checks, only enables the production form after the service is configured and Turnstile loads successfully.
- Existing preview behaviour remains in place while the endpoint is disabled. No user input should be considered delivered merely because a local confirmation appears.

## Explicit launch dependencies
1. **Business and legal readiness:** Replace the pre-launch privacy page with verified controller/trading identity and a complete recruitment-applicant/enquiry privacy notice; establish a monitored company inbox and terms before enabling.
2. Configure a **Resend** account, verify the mail-sending domain, approve sending identity and recipient mailbox and confirm a suitable DPA and retention arrangements.
3. Create **Cloudflare Turnstile** widget for `elnovargroup.co.uk`; record its site key and secret key.
4. In the relevant **Cloudflare Pages project**, configure **production environment variables** (secrets for sensitive values). Do not commit these values to GitHub:
   - `RESEND_API_KEY` — secret
   - `ENQUIRY_FROM` — verified sending address (e.g. `Website Enquiries <notify@elnovargroup.co.uk>` after verification)
   - `ENQUIRY_TO` — verified monitored recipient inbox
   - `TURNSTILE_SITE_KEY` — public widget key
   - `TURNSTILE_SECRET_KEY` — secret
   - `ENQUIRY_LIVE` — initially absent/false; set to exact string `true` **only after completion and approval of all checks**
5. Verify Pages Functions are deployed with Git integration and that the custom hostname is correctly bound over HTTPS.
6. Before changing the live flag, test privacy, proper controller details, accessibility, Turnstile widget, delivery to inbox, reply-to, spam rejection, invalid fields, delivery failures, and false-positive outcomes in a controlled environment.
7. Configure Cloudflare WAF/rate limiting as appropriate. The honeypot and Turnstile are anti-abuse measures but do not replace monitoring and rate controls.
8. Verify no data are written to browser analytics, deployment logs or public repository. Confirm vendor processing terms, privacy disclosure and agreed retention.
9. Check `GET https://elnovargroup.co.uk/api/enquiry`: disabled yields `{"live":false,"siteKey":null}` before launch; active yields `{"live":true,"siteKey":"..."}`.
10. Perform an end-to-end controlled POST through the form. A 200 success response is only returned after the email provider accepts the message. Check **actual inbox delivery** before advertising the form.

## Fail-safe behaviour
- The endpoint fails closed (503) if any credentials or the launch flag are missing, the hostname is wrong, or the server cannot send.
- It rejects cross-origin requests and requires Turnstile verification and a verified sending identity.
- Frontend presentation stays in preview mode until the endpoint explicitly reports a production-ready state; it never claims a live submission while inactive.
- **Do not** set `ENQUIRY_LIVE=true` simply to clear a GitHub issue. A deployed endpoint is not evidence of legally ready enquiry processing or a functioning inbox.

## Cloudflare deployment footnote
The site is static; the `functions/` directory is discovered by **Cloudflare Pages** when the linked Git project deploys it. Do not switch to GitHub Pages; GitHub Pages does not execute Cloudflare Functions. Validate actual Cloudflare deployment status in the dashboard because GitHub commits alone cannot confirm that the live service is working.
