import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const host = process.env.SITE_HOST;
if (!host) throw new Error('SITE_HOST must be set');
const errors = [];
const warnings = [];
const pages = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !['.git', '.github', 'node_modules', 'docs', 'outreach', 'branding'].includes(entry.name)) walk(path.join(dir, entry.name));
    else if (entry.isFile() && entry.name.endsWith('.html')) pages.push(path.join(dir, entry.name));
  }
}
walk(root);
if (!pages.length) errors.push('No HTML pages found');

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const label = path.relative(root, file);
  if (!/<!doctype\s+html/i.test(html)) errors.push(label + ': missing HTML doctype');
  if (!/<html\b[^>]*\blang=/i.test(html)) errors.push(label + ': missing document language');
  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(label + ': missing page title');
  if (!/<meta\s+[^>]*name=["']description["']/i.test(html)) warnings.push(label + ': missing meta description');
  const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
  if (!canonical) errors.push(label + ': missing canonical URL');
  else if (!canonical.startsWith('https://' + host + '/')) errors.push(label + ': incorrect canonical host ' + canonical);
  if (/\bconcept preview\b|\bpreview enquiry\b|\bthis is a website preview\b/i.test(html)) errors.push(label + ': contains old concept/preview UI copy');
  if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) warnings.push(label + ': noindex is active');
  if (/<img\b[^>]*>/i.test(html) && /<img\b(?![^>]*\balt=)[^>]*>/i.test(html)) warnings.push(label + ': review image alt text');
  const origin = new URL('https://' + host + '/' + label.replace(/index\.html$/, ''));
  const links = [...html.matchAll(/<(?:a|link|script)\b[^>]*(?:href|src)=["']([^"']+)["']/gi)].map(m => m[1]);
  for (const ref of links) {
    if (/^(?:https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(ref)) continue;
    const url = new URL(ref, origin);
    if (url.hostname !== host) continue;
    const pathname = decodeURIComponent(url.pathname);
    const candidate = path.resolve(root, '.' + pathname);
    if (!candidate.startsWith(root + path.sep) && candidate !== root) {errors.push(label + ': invalid local link ' + ref);continue;}
    const targets = [candidate, path.join(candidate, 'index.html'), candidate + '.html'];
    const found = targets.find(p => existsSync(p) && statSync(p).isFile());
    if (!found) errors.push(label + ': missing internal target ' + ref);
  }
}
if (!existsSync(path.join(root, 'robots.txt'))) errors.push('Missing robots.txt');
if (!existsSync(path.join(root, 'sitemap.xml'))) errors.push('Missing sitemap.xml');
console.log('Checked ' + pages.length + ' pages for metadata, local links and legacy copy.');
for (const warning of warnings) console.warn('WARNING: ' + warning);
for (const error of errors) console.error('ERROR: ' + error);
console.log(errors.length + ' errors; ' + warnings.length + ' warnings.');
if (errors.length) process.exitCode = 1;
