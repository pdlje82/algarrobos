// Run from the repository root; use the bundled Playwright and installed Edge.
const { chromium } = require('C:/Users/JanEngelke/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

(async () => {
  setTimeout(() => { console.error('Rendering exceeded 45 seconds'); process.exit(1); }, 45000).unref();
  const folder = __dirname;
  const manifestPath = path.join(folder, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const browser = await chromium.launch({ channel: 'msedge', headless: true, timeout: 15000 });
  let success = false;
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
    for (const scheme of manifest.schemes) {
      await page.goto(pathToFileURL(path.join(folder, scheme.svg)).href);
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.locator('svg text').evaluateAll(elements => elements.map(el => {
        const b = el.getBBox();
        return { text: el.textContent, x: b.x, y: b.y, width: b.width, height: b.height };
      }).filter(b => b.x < 0 || b.y < 0 || b.x + b.width > 1400 || b.y + b.height > 900));
      if (overflow.length) throw new Error(`${scheme.svg}: text outside canvas ${JSON.stringify(overflow)}`);
      scheme.png = scheme.svg.replace(/\.svg$/, '.png');
      await page.screenshot({ path: path.join(folder, scheme.png) });
      scheme.sha256_png = crypto.createHash('sha256').update(fs.readFileSync(path.join(folder, scheme.png))).digest('hex');
      scheme.text_outside_canvas = 0;
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(JSON.stringify(manifest.schemes));
    success = true;
  } finally {
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 1000))]);
    process.exit(success ? 0 : 1);
  }
})().catch(error => { console.error(error); process.exit(1); });
