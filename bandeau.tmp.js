const puppeteer = require('puppeteer');
const { demarrer } = require('/Users/ttchamdja/Library/Mobile Documents/com~apple~CloudDocs/Dev/AeroSup/tests/smoke/harness');
(async () => {
  const srv = await demarrer({ port: 4787 });
  const nav = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-dev-shm-usage'] });
  for (const rep of ['js', 'app']) {
    const bocal = await nav.createBrowserContext();
    const page = await bocal.newPage();
    await page.setRequestInterception(true);
    const corps = '<!doctype html><html><head><meta charset="utf-8"></head><body>'
      + '<script>window.__coupe=false;window.fetch=async()=>{if(window.__coupe)throw new TypeError("Failed to fetch");'
      + 'return new Response("{}",{status:200});};<\/script>'
      + `<script src="/shared/${rep}/oasis-hors-ligne.js"><\/script></body></html>`;
    page.on('request', (r) => (r.url().endsWith('/__v') ? r.respond({ status: 200, contentType: 'text/html', body: corps }) : r.continue()));
    await page.goto(`${srv.base}/__v`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 400));
    const r = await page.evaluate(`(async () => {
      window.__coupe = true;
      await fetch('/api/m/ramp/poi', { method: 'POST', body: '{"n":1}' });
      window.__coupe = false;
      const b = document.querySelector('.oasis-hl-bandeau');
      return JSON.stringify({
        etat: window.oasisHorsLigne.etat(),
        file: (await window.oasisHorsLigne.file()).map((e) => ({ echec: e.echec, typeof: typeof e.echec })),
        classe: b ? b.className : null,
        texte: b ? b.textContent : null,
      });
    })()`);
    console.log(` ${rep.padEnd(4)} ${r}`);
    await bocal.close();
  }
  await nav.close(); await srv.arreter();
})().catch((e) => { console.error(e.message); process.exit(1); });
