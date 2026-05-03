import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE_URL = 'https://www.oreaholding.ca';
const SCREENSHOT_DIR = '/tmp/qa-screenshots';
const REPORT_PATH = '/tmp/qa-report.md';
const USERNAME = 'test123';
const PASSWORD = '123456789';

mkdirSync(SCREENSHOT_DIR, { recursive: true });

type TestResult = {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL';
  severity?: 'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE';
  detail: string;
  page?: string;
  screenshot?: string;
  consoleErrors: string[];
  http5xx: string[];
};

type Browser = any;
type Page = any;
type Response = any;

const results: TestResult[] = [];
const globalConsoleErrors = new Set<string>();
const globalHttp5xx = new Set<string>();

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

async function screenshot(page: Page, id: string): Promise<string> {
  const path = `${SCREENSHOT_DIR}/${id}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function captureHtml(page: Page, id: string): Promise<void> {
  writeFileSync(`${SCREENSHOT_DIR}/${id}.html`, await page.content(), 'utf8');
}

async function goto(page: Page, pathOrUrl: string): Promise<Response | null> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${BASE_URL}${pathOrUrl}`;
  return await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
}

async function record(
  page: Page,
  id: string,
  name: string,
  checks: string[],
  failures: string[],
  consoleStart: number,
  httpStart: number,
  severity: TestResult['severity'] = 'MOYENNE',
): Promise<void> {
  const shot = await screenshot(page, id);
  await captureHtml(page, id);
  const consoleErrors = unique([...globalConsoleErrors].slice(consoleStart));
  const http5xx = unique([...globalHttp5xx].slice(httpStart));
  const allFailures = [...failures];
  if (http5xx.length > 0) {
    allFailures.push(`HTTP 5xx detecte: ${http5xx.join(' | ')}`);
  }

  results.push({
    id,
    name,
    status: allFailures.length === 0 ? 'PASS' : 'FAIL',
    severity: allFailures.length === 0 ? undefined : severity,
    detail: allFailures.length === 0 ? checks.join('; ') : allFailures.join('; '),
    page: page.url(),
    screenshot: shot,
    consoleErrors,
    http5xx,
  });
}

async function test1Login(page: Page): Promise<void> {
  const consoleStart = globalConsoleErrors.size;
  const httpStart = globalHttp5xx.size;
  const failures: string[] = [];
  const checks: string[] = [];

  const response = await goto(page, '/fr/login');
  if (!response || response.status() >= 400) failures.push(`Login page status ${response?.status() ?? 'none'}`);

  const usernameInput = page.locator('input[name="username"], input[name="email"], input[type="text"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  if ((await usernameInput.count()) === 0) failures.push('Champ username introuvable');
  if ((await passwordInput.count()) === 0) failures.push('Champ password introuvable');

  if (failures.length === 0) {
    await usernameInput.fill(USERNAME);
    await passwordInput.fill(PASSWORD);
    const submit = page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("Se connecter")').first();
    await submit.waitFor({ state: 'visible', timeout: 10_000 });
    await page.waitForFunction(() => {
      const button = document.querySelector('button[type="submit"]') as HTMLButtonElement | null;
      return Boolean(button && !button.disabled);
    }, { timeout: 15_000 }).catch(() => undefined);
    if (await submit.isDisabled()) {
      failures.push('Bouton Connexion reste disabled apres hydratation');
    } else {
      await submit.click();
      await page.waitForURL(/\/perso/, { timeout: 15_000 }).catch(() => undefined);
      await page.waitForLoadState('networkidle').catch(() => undefined);
    }
    if (!page.url().includes('/perso')) failures.push(`Redirect login invalide: ${page.url()}`);
    const cookies = await page.context().cookies(BASE_URL);
    if (cookies.length === 0) failures.push('Aucun cookie apres login');
    checks.push(`redirect ${page.url()}`, `cookies ${cookies.length}`);
  }

  await record(page, 'test-1-login', 'Login', checks, failures, consoleStart, httpStart, 'CRITIQUE');
}

async function test2ImportPage(page: Page): Promise<void> {
  const consoleStart = globalConsoleErrors.size;
  const httpStart = globalHttp5xx.size;
  const failures: string[] = [];
  const checks: string[] = [];
  const response = await goto(page, '/fr/perso/comptabilite/import-releve');
  if (!response || response.status() !== 200) failures.push(`Status attendu 200, obtenu ${response?.status() ?? 'none'}`);

  const text = normalizeText(await page.locator('body').innerText());
  for (const expected of ['importer un releve', 'sync onedrive releves', 'auto-attacher factures', 'analyser']) {
    if (!text.includes(expected)) failures.push(`Texte manquant: ${expected}`);
  }
  if (text.includes('developpement') || text.includes('work in progress') || text.includes('wip')) {
    failures.push('Banniere WIP/developpement encore presente');
  }

  const options = await page.locator('select[name="paymentSourceId"] option').count();
  if (options < 6) failures.push(`PaymentSource options attendues >= 6 incluant placeholder, obtenu ${options}`);
  const fileInput = page.locator('input[type="file"]').first();
  const accept = (await fileInput.count()) > 0 ? await fileInput.getAttribute('accept') : null;
  if (accept !== '.csv,.xlsx,.xls') failures.push(`Accept file invalide: ${accept ?? 'input absent'}`);
  checks.push(`payment sources options ${options}`, `file accept ${accept}`);

  await record(page, 'test-2-import-releve', 'Page import-releve', checks, failures, consoleStart, httpStart, 'HAUTE');
}

async function test3ListCompta(page: Page): Promise<void> {
  const consoleStart = globalConsoleErrors.size;
  const httpStart = globalHttp5xx.size;
  const failures: string[] = [];
  const checks: string[] = [];
  const response = await goto(page, '/fr/perso/comptabilite');
  if (!response || response.status() !== 200) failures.push(`Status attendu 200, obtenu ${response?.status() ?? 'none'}`);
  const text = normalizeText(await page.locator('body').innerText());
  for (const expected of ['tout voir']) {
    if (!text.includes(expected)) failures.push(`Texte manquant: ${expected}`);
  }
  const hasPrevNext = text.includes('‹') || text.includes('›') || text.includes('<') || text.includes('>');
  if (!hasPrevNext) failures.push('Fleches navigation mois introuvables');
  const hasExport = text.includes('exporter excel') || text.includes('export');
  if (!hasExport) failures.push('Bouton export Excel introuvable');

  const toutVoir = page.locator('a:has-text("Tout voir"), button:has-text("Tout voir")').first();
  if ((await toutVoir.count()) > 0) {
    await toutVoir.click();
    await page.waitForLoadState('networkidle');
    if (!page.url().includes('month=all')) failures.push(`Click Tout voir sans month=all: ${page.url()}`);
  }
  checks.push(`url ${page.url()}`);
  await record(page, 'test-3-liste-compta', 'Liste compta', checks, failures, consoleStart, httpStart, 'MOYENNE');
}

async function test4Conciliation(page: Page): Promise<void> {
  const consoleStart = globalConsoleErrors.size;
  const httpStart = globalHttp5xx.size;
  const failures: string[] = [];
  const checks: string[] = [];
  const response = await goto(page, '/fr/perso/comptabilite/conciliation');
  if (!response || response.status() !== 200) failures.push(`Status attendu 200, obtenu ${response?.status() ?? 'none'}`);
  const text = normalizeText(await page.locator('body').innerText());
  if (!/\d+\s*\/\s*\d+/.test(text) && !text.includes('%')) failures.push('Stats progression introuvables');
  for (const expected of ['toutes', 'conciliees', 'non conciliees']) {
    if (!text.includes(expected)) failures.push(`Filtre manquant: ${expected}`);
  }
  checks.push('page chargee');
  await record(page, 'test-4-conciliation', 'Page conciliation', checks, failures, consoleStart, httpStart, 'HAUTE');
}

async function test5Dashboards(page: Page): Promise<void> {
  const consoleStart = globalConsoleErrors.size;
  const httpStart = globalHttp5xx.size;
  const failures: string[] = [];
  const checks: string[] = [];
  const response = await goto(page, '/fr/perso/comptabilite/dashboards');
  if (!response || response.status() !== 200) failures.push(`Status attendu 200, obtenu ${response?.status() ?? 'none'}`);
  const text = normalizeText(await page.locator('body').innerText());
  const wanted = ['solde par compagnie', 'evolution mensuelle', 'top 10 fournisseurs', 'avances'];
  const found = wanted.filter((item) => text.includes(item)).length;
  if (found < 2) failures.push(`Widgets attendus trouves ${found}/4`);
  const cards = await page.locator('[class*="border"], [class*="shadow"], article, section').count();
  if (cards < 7) failures.push(`Nombre de cards/sections faible: ${cards}`);
  checks.push(`widgets ${found}/4`, `cards/sections ${cards}`);
  await record(page, 'test-5-dashboards', 'Dashboards', checks, failures, consoleStart, httpStart, 'MOYENNE');
}

async function test6Reports(page: Page): Promise<void> {
  const consoleStart = globalConsoleErrors.size;
  const httpStart = globalHttp5xx.size;
  const failures: string[] = [];
  const checks: string[] = [];
  const response = await goto(page, '/fr/perso/comptabilite/reports');
  if (!response || response.status() !== 200) failures.push(`Status attendu 200, obtenu ${response?.status() ?? 'none'}`);
  const text = normalizeText(await page.locator('body').innerText());
  if (!text.includes('mensuel') && (await page.locator('select, input[type="radio"]').count()) === 0) {
    failures.push('Selecteur periode introuvable');
  }
  const generate = page.locator('button:has-text("Generer"), button:has-text("Générer")').first();
  if ((await generate.count()) === 0) {
    failures.push('Bouton Generer rapport introuvable');
  } else {
    await generate.click();
    await page.waitForLoadState('networkidle').catch(() => undefined);
  }
  const afterText = normalizeText(await page.locator('body').innerText());
  if (!afterText.includes('tps') && !afterText.includes('tvq')) failures.push('Lignes TPS/TVQ introuvables');
  if (!afterText.includes('imprimer')) failures.push('Bouton Imprimer introuvable');
  checks.push('reports inspecte');
  await record(page, 'test-6-reports', 'Reports fiscaux', checks, failures, consoleStart, httpStart, 'HAUTE');
}

async function test7Sidebar(page: Page): Promise<void> {
  const consoleStart = globalConsoleErrors.size;
  const httpStart = globalHttp5xx.size;
  const failures: string[] = [];
  const checks: string[] = [];
  await goto(page, '/fr/perso/comptabilite');
  const text = normalizeText(await page.locator('body').innerText());
  for (const expected of ['comptabilite', 'transactions', 'importer releve', 'conciliation', 'dashboards', 'rapports']) {
    if (!text.includes(expected)) failures.push(`Lien/sidebar manquant: ${expected}`);
  }
  checks.push('sidebar inspectee');
  await record(page, 'test-7-sidebar', 'Sidebar', checks, failures, consoleStart, httpStart, 'MOYENNE');
}

async function test8AdminSources(page: Page): Promise<void> {
  const consoleStart = globalConsoleErrors.size;
  const httpStart = globalHttp5xx.size;
  const failures: string[] = [];
  const checks: string[] = [];
  const response = await goto(page, '/fr/perso/admin/sources-paiement');
  if (!response || response.status() !== 200) failures.push(`Status attendu 200, obtenu ${response?.status() ?? 'none'}`);
  const rows = await page.locator('tr, [class*="divide-y"] > div, li').count();
  if (rows < 5) failures.push(`Sources paiement attendues >= 5, detectees ${rows}`);
  const text = normalizeText(await page.locator('body').innerText());
  const expectedNames = ['compte', 'visa', 'orea'];
  for (const expected of expectedNames) {
    if (!text.includes(expected)) failures.push(`Mot attendu absent sources: ${expected}`);
  }
  checks.push(`rows ${rows}`);
  await record(page, 'test-8-admin-sources', 'Admin sources de paiement', checks, failures, consoleStart, httpStart, 'MOYENNE');
}

async function test9AdminCategories(page: Page): Promise<void> {
  const consoleStart = globalConsoleErrors.size;
  const httpStart = globalHttp5xx.size;
  const failures: string[] = [];
  const checks: string[] = [];
  const response = await goto(page, '/fr/perso/admin/categories');
  if (!response || response.status() !== 200) failures.push(`Status attendu 200, obtenu ${response?.status() ?? 'none'}`);
  const add = page.locator('a:has-text("Nouvelle"), a:has-text("Ajouter"), a[href*="/categories/nouveau"]').first();
  if ((await add.count()) === 0) {
    failures.push('Lien nouvelle categorie introuvable');
  } else {
    await add.click();
    await page.waitForLoadState('networkidle');
    const text = normalizeText(await page.locator('body').innerText());
    if (!page.url().includes('/categories/nouveau')) failures.push(`URL formulaire invalide: ${page.url()}`);
    if (!text.includes('categorie') || (await page.locator('input[name="name"]').count()) === 0) {
      failures.push('Formulaire categorie introuvable');
    }
  }
  checks.push(`url ${page.url()}`);
  await record(page, 'test-9-admin-categories', 'Admin categories', checks, failures, consoleStart, httpStart, 'MOYENNE');
}

async function test10HomepagePerso(page: Page): Promise<void> {
  const consoleStart = globalConsoleErrors.size;
  const httpStart = globalHttp5xx.size;
  const failures: string[] = [];
  const checks: string[] = [];
  const response = await goto(page, '/fr/perso');
  if (!response || response.status() !== 200) failures.push(`Status attendu 200, obtenu ${response?.status() ?? 'none'}`);
  const text = normalizeText(await page.locator('body').innerText());
  if (text.includes('application error') || text.includes('server-side exception')) failures.push('Application error visible');
  if (text.length < 100) failures.push('Contenu page perso trop court');
  checks.push(`body chars ${text.length}`);
  await record(page, 'test-10-homepage-perso', 'Homepage perso', checks, failures, consoleStart, httpStart, 'HAUTE');
}

function writeReport(startedAt: number): void {
  const passed = results.filter((result) => result.status === 'PASS').length;
  const failed = results.length - passed;
  const consoleErrors = unique([...globalConsoleErrors]);
  const http5xx = unique([...globalHttp5xx]);
  const critical = results.filter((result) => result.status === 'FAIL' && result.severity === 'CRITIQUE');
  const high = results.filter((result) => result.status === 'FAIL' && result.severity === 'HAUTE');
  const verdict = critical.length > 0 || http5xx.length > 0
    ? 'BUGS CRITIQUES BLOQUANTS'
    : failed > 0 || high.length > 0
      ? 'BUGS MINEURS A FIXER'
      : 'PRODUIT FINAL OK';

  const lines: string[] = [
    '# Rapport QA OREA — 2026-05-03',
    '',
    `**Site teste**: ${BASE_URL}`,
    `**Date**: ${new Date().toISOString()}`,
    '**User test**: test123',
    `**Pages visitees**: ${results.length}`,
    `**Duree**: ${Math.round((performance.now() - startedAt) / 1000)}s`,
    '',
    '## Resume',
    '',
    '| # | Test | Statut |',
    '|---|---|---|',
    ...results.map((result) => `| ${result.id.replace('test-', '').split('-')[0]} | ${result.name} | ${result.status} |`),
    '',
    '## Statistiques',
    '',
    `- Tests passes: ${passed}/12`,
    `- Tests echoues: ${failed}/12`,
    `- Erreurs console totales: ${consoleErrors.length}`,
    `- Erreurs HTTP 5xx: ${http5xx.length}`,
    '',
    '## Bugs trouves',
    '',
  ];

  const failedResults = results.filter((result) => result.status === 'FAIL');
  if (failedResults.length === 0) {
    lines.push('Aucun bug bloquant detecte.', '');
  } else {
    failedResults.forEach((result, index) => {
      lines.push(
        `### Bug #${index + 1} — ${result.name}`,
        `- Severite: ${result.severity ?? 'MOYENNE'}`,
        `- Test: ${result.id}`,
        `- Page: ${result.page ?? '-'}`,
        `- Symptome: ${result.detail}`,
        `- Console errors associees: ${result.consoleErrors.length > 0 ? result.consoleErrors.join(' | ') : '-'}`,
        `- HTTP 5xx associes: ${result.http5xx.length > 0 ? result.http5xx.join(' | ') : '-'}`,
        `- Screenshot: ${result.screenshot ?? '-'}`,
        `- Repro: executer ${result.id} dans scripts/qa-end-to-end.ts`,
        '',
      );
    });
  }

  lines.push(
    '## Erreurs console (top 10 uniques)',
    '',
    ...(consoleErrors.length > 0 ? consoleErrors.slice(0, 10).map((error, index) => `${index + 1}. ${error}`) : ['Aucune.']),
    '',
    '## Erreurs HTTP 5xx',
    '',
    ...(http5xx.length > 0 ? http5xx.map((error, index) => `${index + 1}. ${error}`) : ['Aucune.']),
    '',
    '## Conclusion',
    '',
    `Verdict: ${verdict}`,
    '',
    `Recommandation: ${failedResults.length > 0 ? 'Corriger les tests FAIL avant de considerer le module production ready.' : 'Aucune correction immediate requise selon ces tests.'}`,
    '',
  );

  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
}

async function runTests(): Promise<void> {
  const startedAt = performance.now();
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    page.on('console', (msg: { type: () => string; text: () => string }) => {
      if (msg.type() === 'error') globalConsoleErrors.add(msg.text());
    });
    page.on('pageerror', (err: { message: string }) => globalConsoleErrors.add(err.message));
    page.on('response', (response: { status: () => number; url: () => string }) => {
      if (response.status() >= 500) globalHttp5xx.add(`${response.status()} ${response.url()}`);
    });

    await test1Login(page);
    await test2ImportPage(page);
    await test3ListCompta(page);
    await test4Conciliation(page);
    await test5Dashboards(page);
    await test6Reports(page);
    await test7Sidebar(page);
    await test8AdminSources(page);
    await test9AdminCategories(page);
    await test10HomepagePerso(page);
  } finally {
    await browser?.close();
    writeReport(startedAt);
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
