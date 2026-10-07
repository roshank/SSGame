const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text()));
  await p.goto('file://' + process.cwd() + '/index.html');
  await p.screenshot({ path: process.argv[2] + '/default.png', fullPage: true });
  await p.click('button[data-id="sb"]');
  console.log('hero:', await p.textContent('#depYear'), '| closed:', await p.textContent('#closedPct'), '| url:', p.url().split('#')[1]);
  await p.screenshot({ path: process.argv[2] + '/sb.png', fullPage: true });
  await p.setViewportSize({ width: 390, height: 800 });
  await p.screenshot({ path: process.argv[2] + '/mobile.png' });
  console.log('errors:', errs);
  await b.close();
})();
