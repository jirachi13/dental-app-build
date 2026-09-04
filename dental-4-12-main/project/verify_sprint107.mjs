// Sprint 107 — the Actions column is gone, and the queued STATE it used to
// carry survived the removal as a chip. Also checks the table still fits the
// narrow width CLAUDE.md requires (~390px).
import fs from 'node:fs';
import { chromium } from 'playwright';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const BASE = process.env.BASE_URL || 'https://dental-app-build.vercel.app';

const results = [];
const check = (n, pass, detail) => results.push({ check: n, result: pass ? 'PASS' : 'FAIL', detail });

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.fill('input[type="email"]', 'dentist@floral.com');
await page.fill('input[type="password"]', env.SEED_DENTIST_PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 30000 });

// Sprint 100 gave the dentist three schools, so the gate fires on a fresh profile.
const goPatients = async () => {
  await page.goto(`${BASE}/patients`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  if (page.url().includes('/select-school')) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /School/i.test(x.textContent || ''));
      b?.click();
    });
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}/patients`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
  }
};
await goPatients();
check('patient list loaded (not the school gate)', !page.url().includes('/select-school'), page.url().replace(BASE, ''));

const headers = await page.evaluate(() => [...document.querySelectorAll('thead th')].map((t) => t.textContent.trim()));
check('Actions column is gone', !headers.includes('Actions'), headers.filter(Boolean).join(' | '));
check('the other columns survived',
  ['Student', 'Grade', 'Section', 'Gender', 'Age'].every((h) => headers.includes(h)), headers.filter(Boolean).join(' | '));

// The whole point: queue a pupil via tick + bulk, then the chip must appear.
const chips = () => page.evaluate(() => [...document.querySelectorAll('tbody span')].filter((s) => s.textContent.trim() === 'Queued').length);
const before = await chips();

await page.evaluate(() => {
  const cb = [...document.querySelectorAll('tbody input[type="checkbox"]')][0];
  if (cb && !cb.checked) cb.click();
});
await page.waitForTimeout(600);
const queueBtn = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /Queue Selected/i.test(x.textContent || ''));
  if (b) { b.click(); return b.textContent.trim(); }
  return null;
});
check('bulk "Queue Selected" is reachable', !!queueBtn, queueBtn ?? 'not found');
await page.waitForTimeout(1200);
const after = await chips();
check('queued state still visible as a chip', after > before, `${before} chips -> ${after}`);

// ...and put it back, so the demo data is unchanged.
await page.evaluate(() => {
  const cb = [...document.querySelectorAll('tbody input[type="checkbox"]')][0];
  if (cb && !cb.checked) cb.click();
});
await page.waitForTimeout(500);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /Unqueue Selected/i.test(x.textContent || ''));
  b?.click();
});
await page.waitForTimeout(1000);
check('cleanup — chip count back to where it started', (await chips()) === before, `${await chips()} vs ${before}`);

// Narrow width: the table scrolls in its own container, the page must not.
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1200);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('no horizontal page overflow at 390px', overflow <= 1, `${overflow}px`);

console.table(results);
await browser.close();
const failed = results.filter((r) => r.result === 'FAIL');
console.log(failed.length ? `\n${failed.length} FAILED` : `\n${results.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
