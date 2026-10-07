const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text()));
  await p.goto('file://' + process.cwd() + '/index.html');
  for (const id of ['sources','people','retirement','economy','shocks']) { await p.click('#tab_'+id); }
  await p.click('#tab_retirement');
  await p.click('button[data-id="protect"]');
  console.log('depl:', await p.textContent('#depYear'), '| closed:', await p.textContent('#closedPct'), '| capital:', await p.textContent('#capVal'), '|', (await p.textContent('#missionCount')));
  await p.screenshot({ path: out + '/v2-retirement.png', fullPage: true });
  await p.click('#tab_shocks'); await p.click('#diceBtn');
  await p.screenshot({ path: out + '/v2-shocks.png' });
  await p.setViewportSize({ width: 390, height: 800 });
  await p.screenshot({ path: out + '/v2-mobile.png' });
  console.log('errors:', errs);
  await b.close();
})();
