(function () {
  const M = window.SSModel, D = window.SSData;
  const $ = (id) => document.getElementById(id);
  const DEF = M.DEFAULTS;
  const state = Object.assign({}, DEF);

  // ---- lever buckets ---------------------------------------------------------------
  const pct = (v) => (v === 0 ? 'no change' : v > 0 ? '−' + v + '%' : '+' + (-v) + '%');
  const TIMING = { k: 'startYear', t: 'range', label: 'Changes begin in', min: 2027, max: 2040, step: 1, fmt: (v) => v,
    help: 'Waiting makes every fix bigger and harsher. Try pushing this to 2040.' };

  const BUCKETS = [
    { id: 'sources', name: 'Sources', icon: '💵', intro: 'Where the money comes from: payroll taxes, other revenue, and what the trust fund itself earns.',
      keys: ['payrollRate', 'taxShare', 'benefitCredit', 'otherRevenue', 'deposit', 'equityShare'],
      sections: [
        { title: 'Payroll taxes', ctl: [
          { k: 'payrollRate', t: 'range', label: 'Payroll tax rate increase', min: 0, max: 6, step: 0.1, fmt: (v) => (12.4 + v).toFixed(1) + '% total',
            help: 'Today 12.4%, split between worker and employer. +1 pt costs a $75k worker ~$375/yr.' },
          { k: 'taxShare', t: 'range', label: 'Share of earnings subject to the tax', min: 82.5, max: 100, step: 0.5, fmt: (v) => v >= 100 ? '100% (no cap)' : v.toFixed(1) + '%',
            help: 'Today ~82.5% of covered wages are under the $184,500 cap. 90% was a Simpson–Bowles target.' },
          { k: 'benefitCredit', t: 'check', label: 'Newly taxed earnings also earn benefits',
            help: 'With credit, high earners get larger checks later, which gives back part of the revenue.' },
          { k: 'otherRevenue', t: 'range', label: 'Other dedicated revenue', min: 0, max: 4, step: 0.1, fmt: (v) => '+' + v.toFixed(1) + '% of payroll',
            help: 'E.g. a surtax on high earners\' investment income or general-revenue transfers.' }
        ]},
        { title: 'Trust fund money', ctl: [
          { k: 'deposit', t: 'range', label: 'One-time Treasury deposit', min: 0, max: 5, step: 0.1, fmt: (v) => '$' + v.toFixed(1) + 'T',
            help: 'Borrowed or appropriated cash credited to the trust fund. Borrowing cost not modeled.' },
          { k: 'equityShare', t: 'range', label: 'Reserves invested in stocks', min: 0, max: 100, step: 5, fmt: (v) => v + '%',
            help: 'Shown at expected return (+3 pts). Add a market crash in Shocks to feel the risk.' }
        ]}
      ]},
    { id: 'people', name: 'People', icon: '👥', intro: 'Who is paying in and who is collecting: births, immigration, and how long people live.',
      keys: ['tfr', 'immigration', 'lifeExp'],
      sections: [{ title: 'Population', ctl: [
        { k: 'tfr', t: 'range', label: 'Long-run fertility rate', min: 1.4, max: 2.2, step: 0.05, fmt: (v) => v.toFixed(2) + ' births/woman',
          help: '2026 Trustees assume 1.75, down from 1.90 last year, a key driver of the larger gap.' },
        { k: 'immigration', t: 'range', label: 'Net immigration vs. baseline', min: -500, max: 500, step: 50, fmt: (v) => (v > 0 ? '+' : '') + v + 'k / yr',
          help: 'Rough sensitivity: more working-age arrivals mean more payroll taxes.' },
        { k: 'lifeExp', t: 'range', label: 'Life expectancy at 65 (change by 2070)', min: -2, max: 3, step: 0.5, fmt: (v) => (v > 0 ? '+' : '') + v + ' yrs', rough: true,
          help: 'Living longer is good news that costs money: about +4% benefit cost per extra year.' }
      ]}]},
    { id: 'retirement', name: 'Retirement', icon: '🧓', intro: 'How the money is used: when people can retire, what they get, who gets disability and survivor checks, and who is protected.',
      keys: ['fra', 'fraIndexed', 'allCut', 'newCut', 'highCut', 'cola', 'diCut', 'survCut', 'minBenefit', 'caregiver', 'shield', 'grandfather'],
      sections: [
        { title: 'When people retire', ctl: [
          { k: 'fra', t: 'range', label: 'Full retirement age', min: 67, max: 70, step: 0.5, fmt: (v) => v === 67 ? '67 (current law)' : String(v),
            help: 'Rises two months a year from the start year. Each extra year is roughly a 6–7% benefit cut for new retirees.' },
          { k: 'fraIndexed', t: 'check', label: 'Then index to life expectancy', help: 'Keeps rising by 1 month every 2 years afterward.' }
        ]},
        { title: 'Benefit amounts', ctl: [
          { k: 'newCut', t: 'range', label: 'Initial benefits for new retirees', min: -10, max: 25, step: 1, fmt: pct, help: 'Phases in as new cohorts retire. Negative values are benefit increases.' },
          { k: 'highCut', t: 'range', label: 'Extra trim for higher earners', min: 0, max: 40, step: 1, fmt: (v) => v === 0 ? 'none' : '−' + v + '%', help: 'Progressive formula change aimed at the top third of earners.' },
          { k: 'allCut', t: 'range', label: 'Across-the-board change, everyone now', min: -10, max: 25, step: 1, fmt: pct, help: 'Hits current retirees too, the politically hardest lever.' },
          { k: 'cola', t: 'select', label: 'Cost-of-living adjustment', opts: [['cpiw', 'CPI-W (current law)'], ['chained', 'Chained CPI (~0.25 pt/yr lower)'], ['cpie', 'CPI-E (~0.2 pt/yr higher)']],
            help: 'Small yearly differences compound over a long retirement.' }
        ]},
        { title: 'Disability & survivors', rough: true, ctl: [
          { k: 'diCut', t: 'range', label: 'Disability benefits & eligibility', min: -10, max: 25, step: 1, fmt: pct, help: 'Disability is ~10% of cost. Tighter rules save money; looser rules cost more.' },
          { k: 'survCut', t: 'range', label: 'Survivor benefits', min: -20, max: 25, step: 1, fmt: pct, help: 'Survivors are ~13% of cost. Negative values mimic proposals to raise widow(er) benefits.' }
        ]},
        { title: 'Protections & fairness', rough: true, ctl: [
          { k: 'shield', t: 'check', label: 'Shield lower earners from benefit cuts', help: 'Exempts the bottom ~40% of earners from cuts and retirement-age changes. Costs some savings.' },
          { k: 'grandfather', t: 'check', label: 'Grandfather everyone 55 and older', help: 'Cohort-based changes only apply to people retiring after ~2037. Delays savings.' },
          { k: 'minBenefit', t: 'range', label: 'Minimum benefit for long careers', min: 0, max: 100, step: 10, fmt: (v) => v === 0 ? 'none' : v + '% boost', help: 'Lifts the floor for low-wage workers with long work histories. Adds cost.' },
          { k: 'caregiver', t: 'range', label: 'Caregiver credit', min: 0, max: 5, step: 1, fmt: (v) => v === 0 ? 'none' : v + ' yrs credited', help: 'Credits earnings for years spent raising young children. Adds cost.' }
        ]}
      ]},
    { id: 'economy', name: 'Economy', icon: '📈', intro: 'Wages, jobs and interest rates set how much comes in. The Trustees\' economic assumptions are as important as any policy.',
      keys: ['wageGrowth', 'employment', 'realRate'],
      sections: [{ title: 'The economy', rough: true, ctl: [
        { k: 'wageGrowth', t: 'range', label: 'Real wage growth vs. baseline', min: -1, max: 1, step: 0.1, fmt: (v) => (v > 0 ? '+' : '') + v.toFixed(1) + ' pt/yr', help: 'Faster wages grow payroll faster than cost-of-living-adjusted benefits.' },
        { k: 'employment', t: 'range', label: 'Long-run employment', min: -5, max: 5, step: 0.5, fmt: (v) => (v > 0 ? '+' : '') + v + '%', help: 'More people working means a bigger payroll base. Think labor-force participation.' },
        { k: 'realRate', t: 'range', label: 'Real interest rate on reserves', min: -1, max: 1, step: 0.1, fmt: (v) => (v > 0 ? '+' : '') + v.toFixed(1) + ' pt', help: 'Only matters while reserves last, so it does little with the fund this small.' }
      ]}]},
    { id: 'shocks', name: 'Shocks', icon: '⚡', intro: 'Stress-test your plan. Recessions and crashes are the surprises that break neat projections.',
      keys: ['recession', 'recessionYear', 'crash', 'crashYear', 'equityShare'],
      sections: [{ title: 'Surprises', rough: true, ctl: [
        { k: 'recession', t: 'range', label: 'Recession: payroll lost at the trough', min: 0, max: 10, step: 0.5, fmt: (v) => v === 0 ? 'none' : v + '%', help: 'Payroll falls for two years then recovers over four, while benefits keep flowing.' },
        { k: 'recessionYear', t: 'range', label: 'Recession year', min: 2027, max: 2060, step: 1, fmt: (v) => v },
        { k: 'crash', t: 'range', label: 'Stock market crash', min: 0, max: 60, step: 5, fmt: (v) => v === 0 ? 'none' : '−' + v + '%', help: 'Only bites if you invest reserves in stocks (Sources tab).' },
        { k: 'crashYear', t: 'range', label: 'Crash year', min: 2027, max: 2060, step: 1, fmt: (v) => v }
      ], extra: 'dice' }]}
  ];
  const ALL_CTL = {};
  BUCKETS.forEach((b) => b.sections.forEach((s) => s.ctl.forEach((c) => { ALL_CTL[c.k] = c; })));
  ALL_CTL.startYear = TIMING;

  const SRC_TAX = ['payrollRate', 'taxShare', 'benefitCredit', 'otherRevenue', 'deposit', 'equityShare'];
  const RET = BUCKETS[2].keys;
  const PEOPLE_ECON = ['tfr', 'immigration', 'lifeExp', 'wageGrowth', 'employment', 'realRate'];

  // ---- state <-> URL -----------------------------------------------------------------
  function readHash() {
    try {
      new URLSearchParams(location.hash.slice(1)).forEach((v, k) => {
        if (!(k in DEF)) return;
        const d = DEF[k];
        state[k] = typeof d === 'number' ? Number(v) : typeof d === 'boolean' ? v === '1' : v;
      });
    } catch (e) {}
  }
  function writeHash() {
    const p = new URLSearchParams();
    Object.keys(DEF).forEach((k) => { if (state[k] !== DEF[k]) p.set(k, typeof state[k] === 'boolean' ? (state[k] ? '1' : '0') : state[k]); });
    try { history.replaceState(null, '', p.toString() ? '#' + p : location.pathname + location.search); } catch (e) {}
  }

  // ---- build controls ----------------------------------------------------------------
  let activeTab = 'sources', activePreset = 'current';
  function ctlHTML(c) {
    const id = 'c_' + c.k;
    let inner;
    if (c.t === 'range') inner = '<div class="row"><label for="' + id + '">' + c.label + '</label><span class="val" id="v_' + c.k + '"></span></div><input type="range" id="' + id + '" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '">';
    else if (c.t === 'check') inner = '<label class="check"><input type="checkbox" id="' + id + '"> ' + c.label + '</label>';
    else inner = '<div class="row"><label for="' + id + '">' + c.label + '</label></div><select id="' + id + '">' + c.opts.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') + '</select>';
    return inner + (c.help ? '<div class="help">' + c.help + '</div>' : '');
  }
  function bind(k) {
    const c = ALL_CTL[k], el = $('c_' + k);
    el.addEventListener('input', () => {
      state[k] = c.t === 'range' ? Number(el.value) : c.t === 'check' ? el.checked : el.value;
      activePreset = null; update();
    });
  }
  function build() {
    $('timingCtl').innerHTML = ctlHTML(TIMING); bind('startYear');
    const tabs = $('tabs'), panels = $('panels');
    BUCKETS.forEach((b) => {
      const t = document.createElement('button');
      t.className = 'tab'; t.type = 'button'; t.id = 'tab_' + b.id; t.setAttribute('role', 'tab'); t.setAttribute('aria-controls', 'panel_' + b.id);
      t.innerHTML = '<span class="t"><span aria-hidden="true">' + b.icon + '</span> ' + b.name + '</span><span class="b" id="badge_' + b.id + '">—</span>';
      t.addEventListener('click', () => { activeTab = b.id; renderTabs(); });
      tabs.appendChild(t);
      const p = document.createElement('div');
      p.className = 'panel'; p.id = 'panel_' + b.id; p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', 'tab_' + b.id);
      let h = '<p class="intro">' + b.intro + '</p>';
      b.sections.forEach((s) => {
        h += '<div class="sect"><h3>' + s.title + (s.rough ? ' <span class="rough" title="No published score behind this lever; order-of-magnitude only">rough</span>' : '') + '</h3>';
        s.ctl.forEach((c) => { h += '<div class="ctl">' + ctlHTML(c) + '</div>'; });
        if (s.extra === 'dice') h += '<div class="btnrow"><button class="btn" id="diceBtn" type="button">Random shocks</button><button class="btn alt" id="clearShocks" type="button">Clear shocks</button></div>';
        h += '</div>';
      });
      p.innerHTML = h; panels.appendChild(p);
    });
    BUCKETS.forEach((b) => b.sections.forEach((s) => s.ctl.forEach((c) => bind(c.k))));
    $('diceBtn').addEventListener('click', () => {
      const r = (a, b2) => a + Math.floor(Math.random() * (b2 - a + 1));
      state.recession = r(2, 9); state.recessionYear = r(2028, 2045);
      state.crash = r(2, 10) * 5; state.crashYear = r(2028, 2050);
      activePreset = null; update();
    });
    $('clearShocks').addEventListener('click', () => { ['recession', 'crash', 'recessionYear', 'crashYear'].forEach((k) => { state[k] = DEF[k]; }); activePreset = null; update(); });
    $('resetBtn').addEventListener('click', () => { Object.assign(state, DEF); activePreset = 'current'; update(); });

    const sel = $('presetSelect');
    sel.innerHTML = '<option value="">Custom scenario</option>' + D.PRESETS.map((p) => '<option value="' + p.id + '">' + p.name + ' (' + p.tag + ')</option>').join('');
    sel.addEventListener('change', () => {
      const p = D.PRESETS.find((x) => x.id === sel.value);
      if (!p) { activePreset = null; update(); return; }
      const st = state.startYear; Object.assign(state, DEF, { startYear: st }, p.settings); activePreset = p.id; update();
    });
    $('refBody').innerHTML = D.REFERENCE.map((r) => '<tr><td>' + r.name + '</td><td>' + r.score + '</td><td><a href="' + r.url + '" target="_blank" rel="noopener">' + r.src + '</a></td></tr>').join('');
    $('sources').innerHTML = D.SOURCES.map((s) => '<a href="' + s[1] + '" target="_blank" rel="noopener">' + s[0] + '</a>').join('');
  }
  function syncControls() {
    Object.keys(ALL_CTL).forEach((k) => {
      const c = ALL_CTL[k], el = $('c_' + k);
      if (c.t === 'range') { el.value = state[k]; $('v_' + k).textContent = c.fmt(state[k]); }
      else if (c.t === 'check') el.checked = !!state[k];
      else el.value = state[k];
    });
  }
  function renderTabs() {
    BUCKETS.forEach((b) => {
      const t = $('tab_' + b.id);
      t.setAttribute('aria-selected', String(b.id === activeTab));
      $('panel_' + b.id).hidden = b.id !== activeTab;
    });
  }
  function renderPresets() {
    $('presetSelect').value = activePreset || '';
    const p = D.PRESETS.find((x) => x.id === activePreset);
    $('presetBlurb').textContent = p ? p.blurb : 'Custom scenario. Adjust the levers, or pick a proposal to compare.';
  }

  // ---- charts ------------------------------------------------------------------------
  function lineChart(el, o) {
    const W = 640, H = 220, L = 42, R = 12, T = 12, B = 26;
    const xs = o.years, x0 = xs[0], x1 = xs[xs.length - 1];
    const X = (v) => L + (v - x0) / (x1 - x0) * (W - L - R);
    const Y = (v) => T + (1 - (v - o.min) / (o.max - o.min)) * (H - T - B);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + o.label + '">';
    o.ticks.forEach((t) => { s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" stroke="var(--grid)"/><text x="' + (L - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + o.tickFmt(t) + '</text>'; });
    [2030, 2040, 2050, 2060, 2070, 2080, 2090, 2100].forEach((y) => { s += '<text x="' + X(y) + '" y="' + (H - 6) + '" text-anchor="middle">' + y + '</text>'; });
    o.series.forEach((se) => {
      const d = se.data.map((v, i) => (i ? 'L' : 'M') + X(xs[i]).toFixed(1) + ' ' + Y(Math.max(o.min, Math.min(o.max, v))).toFixed(1)).join('');
      s += '<path d="' + d + '" fill="none" stroke="' + se.color + '" stroke-width="' + (se.w || 2.5) + '"' + (se.dash ? ' stroke-dasharray="5 4"' : '') + ' stroke-linejoin="round"/>';
    });
    s += '<line id="' + el.id + '_x" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--muted)" opacity="0"/>';
    o.series.forEach((se, i) => { s += '<g transform="translate(' + (L + 8 + i * 150) + ',' + (T + 8) + ')"><line x2="16" stroke="' + se.color + '" stroke-width="3"' + (se.dash ? ' stroke-dasharray="4 3"' : '') + '/><text x="22" y="4">' + se.name + '</text></g>'; });
    s += '<text id="' + el.id + '_t" x="' + (W - R) + '" y="' + (H - 34) + '" text-anchor="end" style="fill:var(--ink);font-weight:600"></text></svg>';
    el.innerHTML = s;
    const svg = el.querySelector('svg'), line = $(el.id + '_x'), tt = $(el.id + '_t');
    svg.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W, yr = Math.round(x0 + (px - L) / (W - L - R) * (x1 - x0));
      if (yr < x0 || yr > x1) return;
      line.setAttribute('x1', X(yr)); line.setAttribute('x2', X(yr)); line.setAttribute('opacity', '.6');
      tt.textContent = yr + ': ' + o.series.map((se) => se.name + ' ' + o.valFmt(se.data[yr - x0])).join(' · ');
    });
    svg.addEventListener('mouseleave', () => { line.setAttribute('opacity', '0'); tt.textContent = ''; });
  }
  function renderCharts(sim, base) {
    const yrs = sim.years;
    const rmax = Math.max(6, Math.ceil(Math.max.apply(null, sim.reserve.concat(base.reserve)) / 2) * 2);
    lineChart($('chartReserve'), { years: yrs, min: 0, max: rmax, ticks: [0, rmax / 2, rmax], tickFmt: (v) => '$' + v + 'T', valFmt: (v) => '$' + v.toFixed(1) + 'T', label: 'Trust fund reserves over time',
      series: [{ name: 'Current law', data: base.reserve, color: 'var(--muted)', dash: true, w: 2 }, { name: 'Your scenario', data: sim.reserve, color: 'var(--brand)' }] });
    lineChart($('chartRates'), { years: yrs, min: 10, max: 22, ticks: [10, 14, 18, 22], tickFmt: (v) => v + '%', valFmt: (v) => v.toFixed(1) + '%', label: 'Program income and cost as percent of payroll',
      series: [{ name: 'Income', data: sim.income, color: 'var(--tax)' }, { name: 'Cost', data: sim.cost, color: 'var(--ben)' }, { name: 'Cost, current law', data: base.cost, color: 'var(--muted)', dash: true, w: 1.5 }] });
    lineChart($('chartPayable'), { years: yrs, min: 0.6, max: 1.12, ticks: [0.6, 0.8, 1], tickFmt: (v) => Math.round(v * 100) + '%', valFmt: (v) => Math.round(v * 100) + '%', label: 'Share of scheduled benefits payable',
      series: [{ name: 'Current law', data: base.payable, color: 'var(--muted)', dash: true, w: 2 }, { name: 'Your scenario', data: sim.payable, color: 'var(--brand)' }] });
  }

  // ---- scoreboard --------------------------------------------------------------------
  const closed = (o) => M.summarize(M.simulate(o)).closedPct;
  function pick(keys) { const o = { startYear: state.startYear }; keys.forEach((k) => { o[k] = state[k]; }); return o; }

  function renderScore(sim, s) {
    const hero = $('heroCard');
    if (s.depletionYear) {
      $('depYear').textContent = s.depletionYear;
      $('depNote').textContent = s.depletionYear >= 2050 ? 'Pushed far out, but the fund still runs dry before 2100 (benefits then ' + Math.round(s.payableAtDepletion * 100) + '% of scheduled).' : 'Then benefits are cut to ' + Math.round(s.payableAtDepletion * 100) + '% of scheduled, and lower later.';
      hero.className = 'card hero ' + (s.depletionYear >= 2050 ? 'warn' : 'bad');
    } else {
      $('depYear').textContent = 'Never';
      $('depNote').textContent = s.sustainable ? 'Solvent through 2100 and not heading for a cliff after.' : 'Solvent through 2100, but costs outrun income by the end.';
      hero.className = 'card hero ok';
    }
    const pc = Math.max(0, Math.min(100, s.closedPct));
    $('closedFill').style.width = pc + '%';
    $('closedFill').style.background = s.closedPct >= 99 ? 'var(--good)' : 'var(--brand)';
    $('closedPct').textContent = Math.round(s.closedPct) + '%';
    const bal = s.actuarialBalance;
    $('balNote').textContent = 'Gap now ' + (bal >= 0 ? '+' : '−') + Math.abs(bal).toFixed(2) + '% of payroll (starts at −4.4%). ' + (s.finalYearBalance < -0.05 ? 'Year-2100 deficit still ' + Math.abs(s.finalYearBalance).toFixed(1) + '% of payroll.' : s.closedPct >= 99 ? 'Balanced for 75 years.' : '');

    const v = $('verdict'), notes = [];
    if (state.allCut > 0) notes.push('it cuts benefits for people already retired');
    if (state.payrollRate > 0 || state.taxShare > 82.5 || state.otherRevenue > 0) notes.push('it raises taxes');
    if (state.startYear >= 2036) notes.push('waiting until ' + state.startYear + ' makes the changes steeper');
    if (s.closedPct >= 99 && s.sustainable) { v.className = 'verdict win'; v.textContent = 'Solved: solvent for 75 years and still balanced in 2100.' + (notes.length ? ' Tradeoffs: ' + notes.join('; ') + '.' : ''); }
    else if (s.closedPct >= 99) { v.className = 'verdict'; v.textContent = 'Balanced over 75 years, but costs outrun income by 2100, so the gap reopens right after.'; }
    else { v.className = 'verdict'; v.textContent = Math.max(0, Math.round(100 - s.closedPct)) + '% of the 75-year gap is still open.'; }

    const goals = [
      [!s.depletionYear, 'Trust fund never runs out'],
      [s.closedPct >= 99, 'Balanced over 75 years'],
      [s.finalYearBalance >= -0.05, 'Balanced in the 75th year (2100)']
    ];
    $('goals').innerHTML = goals.map((g) => '<li class="' + (g[0] ? 'ok' : 'no') + '"><span aria-hidden="true">' + (g[0] ? '✓' : '✗') + '</span> ' + g[1] + '<span class="sr"> (' + (g[0] ? 'met' : 'not met') + ')</span></li>').join('');

    // per-bucket contribution tags
    BUCKETS.forEach((b) => {
      const c = closed(pick(b.keys)), el = $('badge_' + b.id);
      el.className = 'b' + (c > 0.5 ? ' pos' : c < -0.5 ? ' neg' : '');
      el.textContent = Math.abs(c) < 0.5 ? 'no effect' : (c > 0 ? '+' : '−') + Math.abs(Math.round(c)) + '% of gap';
    });
  }

  // ---- "you" panel -------------------------------------------------------------------
  const CAP = 184500, B1 = 1286, B2 = 7749;
  const CAP_TABLE = [[82.5, 184500], [85, 215000], [88, 260000], [90, 300000], [92, 370000], [95, 550000], [98, 1100000], [100, 1e12]];
  function capForShare(sh) {
    for (let i = 1; i < CAP_TABLE.length; i++) if (sh <= CAP_TABLE[i][0]) { const a = CAP_TABLE[i - 1], b = CAP_TABLE[i]; return a[1] + (b[1] - a[1]) * (sh - a[0]) / (b[0] - a[0]); }
    return 1e12;
  }
  function pia(earn) { const aime = Math.min(earn, CAP) / 12; return 0.9 * Math.min(aime, B1) + 0.32 * Math.max(0, Math.min(aime, B2) - B1) + 0.15 * Math.max(0, aime - B2); }
  const money = (v) => '$' + Math.round(v).toLocaleString('en-US');
  function delta(v, unit, goodWhenUp) {
    if (Math.abs(v) < 0.5) return '<span class="d">no change</span>';
    const up = v > 0, good = goodWhenUp ? up : !up;
    return '<span class="d ' + (good ? 'up' : 'down') + '">' + (up ? '+' : '−') + money(Math.abs(v)) + unit + '</span>';
  }
  function stat(k, v, d) { return '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div>' + d + '</div>'; }
  function renderYou(sim, base) {
    const birth = Math.max(1950, Math.min(2010, Number($('yBirth').value) || 1985));
    const earn = Math.max(0, Number($('yEarn').value) || 0);
    const claimYear = birth + 67, i = Math.max(0, Math.min(sim.years.length - 1, claimYear - M.START));
    const newCap = capForShare(state.taxShare);
    const taxBase = 0.124 * Math.min(earn, CAP);
    const taxNew = (0.124 + state.payrollRate / 100) * Math.min(earn, CAP) + 0.124 * Math.max(0, Math.min(earn, newCap) - CAP);
    const sched = pia(earn) * 12;
    const low = earn < 60000, sh = state.shield && low ? 0.78 : 1;
    const cohortStart = state.grandfather ? Math.max(state.startYear, 2037) : state.startYear;
    const cohortActive = claimYear >= cohortStart;
    let f = 1;
    if (cohortActive) {
      f *= 1 - 0.065 * Math.max(0, Math.min(state.fra - 67, (claimYear - cohortStart) / 6)) * sh;
      f *= 1 - (state.newCut > 0 ? state.newCut * sh : state.newCut) / 100;
      if (earn >= 100000) f *= 1 - state.highCut / 100;
    }
    if (claimYear >= state.startYear - 10) f *= 1 - (state.allCut > 0 ? state.allCut * sh : state.allCut) / 100;
    if (state.benefitCredit && newCap > CAP && earn > CAP) f *= 1 + 0.075 * (Math.min(earn, newCap) - CAP) / CAP;
    if (low && state.minBenefit) f *= 1 + state.minBenefit / 100 * 0.06;
    const colaMult = Math.pow(1 + ({ cpiw: 0, chained: -0.0025, cpie: 0.002 })[state.cola], 12);
    const planned = sched * f * colaMult * sim.payable[i], doNothing = sched * base.payable[i];
    $('youOut').innerHTML =
      stat('Your payroll tax (your half)', money(taxBase / 2) + '/yr now', delta((taxNew - taxBase) / 2, '/yr', false)) +
      stat('Scheduled benefit at 67 (' + claimYear + ')', money(sched) + '/yr', '<span class="d">today\'s dollars</span>') +
      stat('If Congress does nothing', money(doNothing) + '/yr', '<span class="d down">' + Math.round(base.payable[i] * 100) + '% payable then</span>') +
      stat('Under your scenario', money(planned) + '/yr', delta(planned - doNothing, '/yr vs. nothing', true));
  }

  // ---- main --------------------------------------------------------------------------
  function update() {
    const sim = M.simulate(state), base = M.baseline(), s = M.summarize(sim);
    syncControls(); renderTabs(); renderPresets();
    renderScore(sim, s); renderCharts(sim, base); renderYou(sim, base); writeHash();
  }

  readHash();
  build();
  activePreset = Object.keys(DEF).some((k) => state[k] !== DEF[k]) ? null : 'current';
  ['yBirth', 'yEarn'].forEach((id) => $(id).addEventListener('input', update));
  $('shareBtn').addEventListener('click', () => {
    try { navigator.clipboard.writeText(location.href); $('shareBtn').textContent = 'Link copied!'; setTimeout(() => { $('shareBtn').textContent = 'Copy link to this scenario'; }, 1800); } catch (e) {}
  });
  update();
})();
