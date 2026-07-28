// Chapter 4 figure capture — drives the deployed app and saves one PNG per
// figure slot in docs/chapter4-5-draft.md. Reads credentials from the sibling
// .env; never prints them.
//
// Run from this directory: node capture_figures.mjs
// Output: <repo>/docs/figures/*.png

import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));       // .../dental-4-12-main/project
const REPO = resolve(HERE, '..', '..');                      // repo root
const BASE = 'https://dental-app-build.vercel.app';
const OUT = join(REPO, 'docs', 'figures');

// --- env ---------------------------------------------------------------
const env = {};
for (const line of readFileSync(join(HERE, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const ACCOUNTS = {
  dentist:     { email: 'dentist@floral.com',     pw: env.SEED_DENTIST_PASSWORD },
  aide:        { email: 'aide@floral.com',        pw: env.SEED_AIDE_PASSWORD },
  schooladmin: { email: 'schooladmin@floral.com', pw: env.SEED_SCHOOLADMIN_PASSWORD },
  bho:         { email: 'bho@floral.com',         pw: env.SEED_BHO_PASSWORD },
  admin:       { email: env.SEED_ADMIN_EMAIL,     pw: env.SEED_ADMIN_PASSWORD },
};

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const results = [];
const ok   = (n, m = '') => { results.push(`PASS  ${n}${m ? '  — ' + m : ''}`); console.log(`  ok   ${n}`); };
const fail = (n, e)       => { results.push(`FAIL  ${n}  — ${e}`);              console.log(`  FAIL ${n}: ${e}`); };

// On pages taller than the viewport, Playwright's fullPage capture leaves
// position:fixed elements floating at their viewport offset — the sidebar ends
// up stranded mid-page. Pinning it to absolute/full-height for the capture
// makes it span the whole image the way a reader expects.
const PIN_FIXED = `
  aside { position: absolute !important; top: 0 !important; height: 100% !important; }
`;

async function shot(page, name, note = '') {
  try {
    await page.waitForTimeout(1800); // let charts/skeletons settle
    const style = await page.addStyleTag({ content: PIN_FIXED });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
    await style.evaluate((el) => el.remove()).catch(() => {});
    ok(name, note);
  } catch (e) { fail(name, e.message.split('\n')[0]); }
}

async function login(page, who) {
  const { email, pw } = ACCOUNTS[who];
  if (!pw) throw new Error(`no password in .env for ${who}`);
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pw);
  await page.click('button[type="submit"]');
  // poll for the redirect rather than guessing a fixed delay
  for (let i = 0; i < 30 && page.url().includes('login'); i++) await page.waitForTimeout(500);
  if (page.url().includes('select-school')) {
    const cards = page.locator('.grid button');
    if (await cards.count()) { await cards.first().click(); await page.waitForTimeout(2500); }
  }
  if (page.url().includes('login')) throw new Error('still on /login after 15s — check credentials');
  await page.waitForTimeout(2000);
}

async function go(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  if (page.url().includes('select-school')) {
    const cards = page.locator('.grid button');
    if (await cards.count()) { await cards.first().click(); await page.waitForTimeout(2000); }
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
  }
}

// --- run ---------------------------------------------------------------
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

try {
  // ===== DENTIST =====
  console.log('\n[dentist]');
  await login(page, 'dentist');

  await go(page, '/');            await shot(page, 'fig-4.4.1-dashboard-dentist');
  await go(page, '/patients');    await shot(page, 'fig-4.1.1-student-list');

  // NOTE: medical history, dietary/social habits and oral health conditions all
  // live on ONE tab ("History & Oral") — they are not separate screens, so the
  // draft's 4.1.2 and 4.1.3 collapse into a single figure. The remaining tabs
  // (Consent, Treatment History, DMFT History) are real features worth figures.
  try {
    const row = page.locator('tbody tr').first();
    if (await row.count()) {
      await row.click(); await page.waitForTimeout(2500);
      await shot(page, 'fig-4.1.2-iptr-history-and-oral');
      for (const [label, name] of [
        ['Consent',           'fig-4.1.3a-consent-tab'],
        ['Treatment History', 'fig-4.1.3b-treatment-history-tab'],
        ['DMFT History',      'fig-4.1.3c-dmft-history-tab'],
      ]) {
        const tab = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).first();
        if (await tab.count()) { await tab.click(); await page.waitForTimeout(1800); await shot(page, name); }
        else fail(name, `no "${label}" tab`);
      }
    } else fail('fig-4.1.2-iptr-history-and-oral', 'no student rows on /patients');
  } catch (e) { fail('fig-4.1.2/4.1.3 student detail', e.message.split('\n')[0]); }

  await go(page, '/dental-charts'); await shot(page, 'fig-4.1.4a-dental-chart-list');
  try {
    const row = page.locator('tbody tr').first();
    if (await row.count()) { await row.click(); await page.waitForTimeout(3000); await shot(page, 'fig-4.1.4-dental-chart'); }
    else fail('fig-4.1.4-dental-chart', 'no chart rows');
  } catch (e) { fail('fig-4.1.4-dental-chart', e.message.split('\n')[0]); }

  await go(page, '/appointments');       await shot(page, 'fig-4.2.1-appointments');
  await go(page, '/treatment-records');  await shot(page, 'fig-4.2.2-treatment-records');
  await go(page, '/rpc');                await shot(page, 'fig-4.2.3-rpc-tracking');
  await go(page, '/ai-analytics');       await shot(page, 'fig-4.3.4-risk-classification', 'ML service may be cold');
  await go(page, '/reports');            await shot(page, 'fig-4.4.4-reports');

  try {
    const btn = page.getByRole('button', { name: /export/i }).first();
    if (await btn.count()) { await btn.click(); await page.waitForTimeout(900); await shot(page, 'fig-4.4.5-export-menu'); }
    else fail('fig-4.4.5-export-menu', 'no Export button on /reports');
  } catch (e) { fail('fig-4.4.5-export-menu', e.message.split('\n')[0]); }

  // ===== SYSTEM ADMIN =====
  console.log('\n[system_admin]');
  await ctx.clearCookies();
  await login(page, 'admin');
  await go(page, '/accounts'); await shot(page, 'fig-4.2.5-account-management');
  await go(page, '/audit');    await shot(page, 'fig-4.2.4-audit-trail');

  // ===== SCHOOL ADMIN =====
  console.log('\n[school_admin]');
  await ctx.clearCookies();
  await login(page, 'schooladmin');
  await go(page, '/'); await shot(page, 'fig-4.4.2a-dashboard-school-admin');

  // ===== BHO =====
  console.log('\n[bho_staff]');
  await ctx.clearCookies();
  await login(page, 'bho');
  await go(page, '/'); await shot(page, 'fig-4.4.2b-dashboard-bho');

} catch (e) {
  fail('RUN ABORTED', e.message.split('\n')[0]);
} finally {
  await browser.close();
  const pass = results.filter(r => r.startsWith('PASS')).length;
  console.log(`\n===== ${pass}/${results.length} captured -> docs/figures/ =====`);
  results.forEach(r => console.log(r));
}
