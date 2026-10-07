(function () {
  const M = window.SSModel, D = window.SSData;
  const $ = (id) => document.getElementById(id);
  const DEF = M.DEFAULTS;
  const state = Object.assign({}, DEF);

  const TAX_KEYS = ['payrollRate', 'taxShare', 'benefitCredit', 'otherRevenue'];
  const BEN_KEYS = ['fra', 'fraIndexed', 'allCut', 'newCut', 'highCut', 'cola'];

  // ---- lever definitions ---------------------------------------------------------
  const GROUPS = [
    { title: 'Timing', tag: ['a', 'When'], ctl: [
      { k: 'startYear', t: 'range', label: 'Changes begin in', min: 2027, max: 2040, step: 1, fmt: (v) => v,
        help: 'Waiting makes every fix bigger and harsher. Try pushing this to 2040.' }
    ]},
    { title: 'Payroll taxes', tag: ['t', 'Revenue'], ctl: [
      { k: 'payrollRate', t: 'range', label: 'Payroll tax rate increase', min: 0, max: 6, step: 0.1,
        fmt: (v) => (12.4 + v).toFixed(1) + '% total', help: 'Today 12.4%, split between worker and employer. +1 pt costs a $75k worker ~$375/yr.' },
      { k: 'taxShare', t: 'range', label: 'Share of earnings subject to the tax', min: 82.5, max: 100, step: 0.5,
        fmt: (v) => v >= 100 ? '100% (no cap)' : v.toFixed(1) + '%', help: 'Today ~82.5% of covered wages are under the $184,500 cap. 90% was a Simpson–Bowles target.' },
      { k: 'benefitCredit', t: 'check', label: 'Newly taxed earnings also earn benefits',
        help: 'With credit, high earners get larger checks later, which gives back part of the revenue. Without, it is a pure tax.' },
      { k: 'otherRevenue', t: 'range', label: 'Other dedicated revenue', min: 0, max: 4, step: 0.1,
        fmt: (v) => '+' + v.toFixed(1) + '% of payroll', help: 'E.g. a surtax on high earners\' investment income or general-revenue transfers.' }
    ]},
    { title: 'Retirement age', tag: ['b', 'Benefits'], ctl: [
      { k: 'fra', t: 'range', label: 'Full retirement age', min: 67, max: 70, step: 0.5,
        fmt: (v) => v === 67 ? '67 (current law)' : v.toFixed(1).replace('.0', ''), help: 'Rises two months a year from the start year. Each extra year is roughly a 6–7% benefit cut for new retirees.' },
      { k: 'fraIndexed', t: 'check', label: 'Then index to life expectancy',
        help: 'Keeps rising by 1 month every 2 years afterward.' }
    ]},
    { title: 'Benefit formula', tag: ['b', 'Benefits'], ctl: [
      { k: 'newCut', t: 'range', label: 'Initial benefits for new retirees', min: -10, max: 25, step: 1,
        fmt: (v) => v === 0 ? 'no change' : (v > 0 ? '−' + v + '%' : '+' + (-v) + '%'), help: 'Phases in as new cohorts retire. Negative values are benefit increases.' },
      { k: 'highCut', t: 'range', label: 'Extra trim for higher earners', min: 0, max: 40, step: 1,
        fmt: (v) => v === 0 ? 'none' : '−' + v + '%', help: 'Progressive formula change aimed at the top third of earners; protects lower earners.' },
      { k: 'allCut', t: 'range', label: 'Across-the-board change, everyone now', min: -10, max: 25, step: 1,
        fmt: (v) => v === 0 ? 'no change' : (v > 0 ? '−' + v + '%' : '+' + (-v) + '%'), help: 'Hits current retirees too, the politically hardest lever.' },
      { k: 'cola', t: 'select', label: 'Cost-of-living adjustment', opts: [['cpiw', 'CPI-W (current law)'], ['chained', 'Chained CPI (~0.25 pt/yr lower)'], ['cpie', 'CPI-E (~0.2 pt/yr higher)']],
        help: 'Small yearly differences compound over a long retirement.' }
    ]},
    { title: 'Investing & transfers', tag: ['o', 'Other'], ctl: [
      { k: 'deposit', t: 'range', label: 'One-time Treasury deposit', min: 0, max: 5, step: 0.1,
        fmt: (v) => '$' + v.toFixed(1) + 'T', help: 'Borrowed or appropriated cash credited to the trust fund. Borrowing cost not modeled.' },
      { k: 'equityShare', t: 'range', label: 'Reserves invested in stocks', min: 0, max: 100, step: 5,
        fmt: (v) => v + '%', help: 'Shown at expected return (+3 pts). Real returns are volatile.' }
    ]},
    { title: 'Demographics', tag: ['a', 'Assumptions'], ctl: [
      { k: 'tfr', t: 'range', label: 'Long-run fertility rate', min: 1.4, max: 2.2, step: 0.05,
        fmt: (v) => v.toFixed(2) + ' births/woman', help: '2026 Trustees assume 1.75, down from 1.90 last year, a key driver of the larger gap.' },
      { k: 'immigration', t: 'range', label: 'Net immigration vs. baseline', min: -500, max: 500, step: 50,
        fmt: (v) => (v > 0 ? '+' : '') + v + 'k / yr', help: 'Rough sensitivity: more working-age arrivals mean more payroll taxes.' }
    ]}
  ];

  // ---- state <-> URL -------------------------------------------------------------
  function readHash() {
    try {
      const p = new URLSearchParams(location.hash.slice(1));
      p.forEach((v, k) => {
        if (!(k in DEF)) return;
        const d = DEF[k];
        state[k] = typeof d === 'number' ? Number(v) : typeof d === 'boolean' ? v === '1' : v;
      });
    } catch (e) {}
  }
  function writeHash() {
    const p = new URLSearchParams();
    Object.keys(DEF).forEach((k) => {
      if (state[k] !== DEF[k]) p.set(k, typeof state[k] === 'boolean' ? (state[k] ? '1' : '0') : state[k]);
    });
    try { history.replaceState(null, '', p.toString() ? '#' + p : location.pathname + location.search); } catch (e) {}
  }

  // ---- controls ------------------------------------------------------------------
  const controls = {};
  function buildLevers() {
    const root = $('levers');
    GROUPS.forEach((g) => {
      const box = document.createElement('div'); box.className = 'group';
      box.innerHTML = '<h3>' + g.title + ' <span class="gtag ' + g.tag[0] + '">' + g.tag[1] + '</span></h3>';
      g.ctl.forEach((c) => {
        const w = document.createElement('div'); w.className = 'ctl';
        const id = 'c_' + c.k;
        let inner = '';
        if (c.t === 'range') {
          inner = '<div class="row"><label for="' + id + '">' + c.label + '</label><span class="val" id="v_' + c.k + '"></span></div>' +
            '<input type="range" id="' + id + '" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '">';
        } else if (c.t === 'check') {
          inner = '<label class="check"><input type="checkbox" id="' + id + '"> ' + c.label + '</label>';
        } else {
          inner = '<div class="row"><label for="' + id + '">' + c.label + '</label></div><select id="' + id + '">' +
            c.opts.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') + '</select>';
        }
        w.innerHTML = inner + (c.help ? '<div class="help">' + c.help + '</div>' : '');
        box.appendChild(w);
        controls[c.k] = c;
      });
      root.appendChild(box);
    });
    Object.keys(controls).forEach((k) => {
      const c = controls[k], el = $('c_' + k);
      el.addEventListener('input', () => {
        state[k] = c.t === 'range' ? Number(el.value) : c.t === 'check' ? el.checked : el.value;
        activePreset = null; update();
      });
    });
  }
  function syncControls() {
    Object.keys(controls).forEach((k) => {
      const c = controls[k], el = $('c_' + k);
      if (c.t === 'range') { el.value = state[k]; $('v_' + k).textContent = c.fmt(state[k]); }
      else if (c.t === 'check') el.checked = !!state[k];
      else el.value = state[k];
    });
  }

  // ---- presets -------------------------------------------------------------------
  let activePreset = 'current';
  function buildPresets() {
    const box = $('presetChips');
    D.PRESETS.forEach((p) => {
      const b = document.createElement('button');
      b.className = 'chip'; b.type = 'button'; b.dataset.id = p.id;
      b.innerHTML = p.name + '<small>' + p.tag + '</small>';
      b.addEventListener('click', () => {
        const start = state.startYear;
        Object.assign(state, DEF, { startYear: start }, p.settings);
        activePreset = p.id; update();
      });
      box.appendChild(b);
    });
  }
  function renderPresets() {
    document.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === activePreset)));
    const p = D.PRESETS.find((x) => x.id === activePreset);
    $('presetBlurb').textContent = p ? p.blurb : 'Custom scenario. Adjust the levers or pick a proposal above to compare.';
  }

  // ---- charts --------------------------------------------------------------------
  function lineChart(el, o) {
    const W = 640, H = 220, L = 42, R = 12, T = 12, B = 26;
    const xs = o.years, x0 = xs[0], x1 = xs[xs.length - 1];
    const X = (v) => L + (v - x0) / (x1 - x0) * (W - L - R);
    const Y = (v) => T + (1 - (v - o.min) / (o.max - o.min)) * (H - T - B);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + o.label + '">';
    const ticks = o.ticks;
    ticks.forEach((t) => {
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" stroke="var(--grid)"/>' +
           '<text x="' + (L - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + o.tickFmt(t) + '</text>';
    });
    [2030, 2040, 2050, 2060, 2070, 2080, 2090, 2100].forEach((y) => {
      s += '<text x="' + X(y) + '" y="' + (H - 6) + '" text-anchor="middle">' + y + '</text>';
    });
    if (o.band) s += '<path d="' + o.band + '" fill="var(--bad)" opacity=".12"/>';
    o.series.forEach((se) => {
      const d = se.data.map((v, i) => (i ? 'L' : 'M') + X(xs[i]).toFixed(1) + ' ' + Y(Math.max(o.min, Math.min(o.max, v))).toFixed(1)).join('');
      s += '<path d="' + d + '" fill="none" stroke="' + se.color + '" stroke-width="' + (se.w || 2.5) + '"' + (se.dash ? ' stroke-dasharray="5 4"' : '') + ' stroke-linejoin="round"/>';
    });
    s += '<line id="' + el.id + '_x" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--muted)" opacity="0"/>';
    // legend
    o.series.forEach((se, i) => {
      s += '<g transform="translate(' + (L + 8 + i * 150) + ',' + (T + 8) + ')"><line x2="16" stroke="' + se.color + '" stroke-width="3"' + (se.dash ? ' stroke-dasharray="4 3"' : '') + '/><text x="22" y="4">' + se.name + '</text></g>';
    });
    s += '<text id="' + el.id + '_t" x="' + (W - R) + '" y="' + (T + 12) + '" text-anchor="end" style="fill:var(--ink);font-weight:600"></text></svg>';
    el.innerHTML = s;
    const svg = el.querySelector('svg'), line = $(el.id + '_x'), tt = $(el.id + '_t');
    svg.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width * W;
      const yr = Math.round(x0 + (px - L) / (W - L - R) * (x1 - x0));
      if (yr < x0 || yr > x1) return;
      const i = yr - x0;
      line.setAttribute('x1', X(yr)); line.setAttribute('x2', X(yr)); line.setAttribute('opacity', '.6');
      tt.textContent = yr + ': ' + o.series.map((se) => se.name + ' ' + o.valFmt(se.data[i])).join(' · ');
    });
    svg.addEventListener('mouseleave', () => { line.setAttribute('opacity', '0'); tt.textContent = ''; });
  }

  function renderCharts(sim, base) {
    const yrs = sim.years;
    const rmax = Math.max(6, Math.ceil(Math.max.apply(null, sim.reserve.concat(base.reserve)) / 2) * 2);
    lineChart($('chartReserve'), {
      years: yrs, min: 0, max: rmax, ticks: [0, rmax / 2, rmax], tickFmt: (v) => '$' + v + 'T', valFmt: (v) => '$' + v.toFixed(1) + 'T',
      label: 'Trust fund reserves over time',
      series: [{ name: 'Current law', data: base.reserve, color: 'var(--muted)', dash: true, w: 2 }, { name: 'Your scenario', data: sim.reserve, color: 'var(--brand)' }]
    });
    lineChart($('chartRates'), {
      years: yrs, min: 10, max: 22, ticks: [10, 14, 18, 22], tickFmt: (v) => v + '%', valFmt: (v) => v.toFixed(1) + '%',
      label: 'Program income and cost as percent of payroll',
      series: [{ name: 'Income', data: sim.income, color: 'var(--tax)' }, { name: 'Cost', data: sim.cost, color: 'var(--ben)' },
               { name: 'Cost, current law', data: base.cost, color: 'var(--muted)', dash: true, w: 1.5 }]
    });
    lineChart($('chartPayable'), {
      years: yrs, min: 0.6, max: 1.12, ticks: [0.6, 0.8, 1], tickFmt: (v) => Math.round(v * 100) + '%', valFmt: (v) => Math.round(v * 100) + '%',
      label: 'Share of scheduled benefits payable',
      series: [{ name: 'Current law', data: base.payable, color: 'var(--muted)', dash: true, w: 2 }, { name: 'Your scenario', data: sim.payable, color: 'var(--brand)' }]
    });
  }

  // ---- scoreboard ----------------------------------------------------------------
  const closed = (o) => M.summarize(M.simulate(o)).closedPct;
  function pick(keys) { const o = { startYear: state.startYear }; keys.forEach((k) => { o[k] = state[k]; }); return o; }

  function renderScore(sim, s) {
    const hero = $('heroCard');
    if (s.depletionYear) {
      $('depYear').textContent = s.depletionYear;
      const pay = Math.round(s.payableAtDepletion * 100);
      $('depNote').textContent = 'Then benefits are cut to ' + pay + '% of scheduled, and lower later.';
      hero.className = 'card hero ' + (s.depletionYear >= 2050 ? 'warn' : 'bad');
      if (s.depletionYear >= 2050) $('depNote').textContent = 'Pushed far out, but the fund still runs dry before 2100 (benefits then ' + Math.round(s.payableAtDepletion * 100) + '% of scheduled).';
    } else {
      $('depYear').textContent = 'Never';
      $('depNote').textContent = s.sustainable ? 'Solvent through 2100 and not heading for a cliff after.' : 'Solvent through 2100, but costs outrun income by the end.';
      hero.className = 'card hero ok';
    }
    const pct = Math.max(0, Math.min(100, s.closedPct));
    $('closedFill').style.width = pct + '%';
    $('closedFill').style.background = s.closedPct >= 99 ? 'var(--good)' : 'var(--brand)';
    $('closedPct').textContent = Math.round(s.closedPct) + '%';
    const bal = s.actuarialBalance;
    $('balNote').textContent = 'Gap now ' + (bal >= 0 ? '+' : '−') + Math.abs(bal).toFixed(2) + '% of payroll (starts at −4.4%). ' +
      (s.finalYearBalance < -0.05 ? 'Year-2100 deficit still ' + Math.abs(s.finalYearBalance).toFixed(1) + '% of payroll.' : s.closedPct >= 99 ? 'Balanced for 75 years.' : '');

    const t = Math.max(0, closed(pick(TAX_KEYS))), b = Math.max(0, closed(pick(BEN_KEYS)));
    const sum = t + b;
    const tp = sum > 0.5 ? t / sum * 100 : 0, bp = sum > 0.5 ? 100 - tp : 0;
    $('splitTax').style.width = tp + '%'; $('splitBen').style.width = bp + '%';
    $('taxPct').textContent = Math.round(tp) + '%'; $('benPct').textContent = Math.round(bp) + '%';
    $('splitNote').textContent = sum > 0.5 ? 'Of the shortfall these two levers close.' : 'Move a lever to see the balance.';
  }

  // ---- "you" panel ---------------------------------------------------------------
  const CAP = 184500, B1 = 1286, B2 = 7749;
  // approximate share-of-earnings -> cap ($), 2026 dollars
  const CAP_TABLE = [[82.5, 184500], [85, 215000], [88, 260000], [90, 300000], [92, 370000], [95, 550000], [98, 1100000], [100, 1e12]];
  function capForShare(sh) {
    for (let i = 1; i < CAP_TABLE.length; i++) {
      if (sh <= CAP_TABLE[i][0]) { const a = CAP_TABLE[i - 1], b = CAP_TABLE[i]; return a[1] + (b[1] - a[1]) * (sh - a[0]) / (b[0] - a[0]); }
    }
    return 1e12;
  }
  function pia(earn) {
    const aime = Math.min(earn, CAP) / 12;
    return 0.9 * Math.min(aime, B1) + 0.32 * Math.max(0, Math.min(aime, B2) - B1) + 0.15 * Math.max(0, aime - B2);
  }
  const money = (v) => '$' + Math.round(v).toLocaleString('en-US');
  function delta(v, unit, goodWhenUp) {
    if (Math.abs(v) < 0.5) return '<span class="d">no change</span>';
    const up = v > 0, good = goodWhenUp ? up : !up;
    return '<span class="d ' + (good ? 'up' : 'down') + '">' + (up ? '+' : '−') + money(Math.abs(v)) + unit + '</span>';
  }
  function renderYou(sim, base) {
    const birth = Math.max(1950, Math.min(2010, Number($('yBirth').value) || 1985));
    const earn = Math.max(0, Number($('yEarn').value) || 0);
    const claimYear = birth + 67;
    const i = Math.max(0, Math.min(sim.years.length - 1, claimYear - M.START));

    // taxes today
    const newCap = capForShare(state.taxShare);
    const taxBase = 0.124 * Math.min(earn, CAP);
    const taxNew = (0.124 + state.payrollRate / 100) * Math.min(earn, CAP) + 0.124 * Math.max(0, Math.min(earn, newCap) - CAP);
    const youTaxDelta = (taxNew - taxBase) / 2;     // worker pays half

    // benefit
    const sched = pia(earn) * 12;
    let f = 1;
    const fraDelta = Math.min(state.fra - 67, Math.max(0, (claimYear - state.startYear)) / 6);
    f *= 1 - 0.065 * Math.max(0, fraDelta);
    const cohortActive = claimYear >= state.startYear;
    if (cohortActive) f *= 1 - state.newCut / 100;
    if (cohortActive && earn >= 100000) f *= 1 - state.highCut / 100;
    if (claimYear >= state.startYear - 10) f *= 1 - state.allCut / 100;
    if (state.benefitCredit && newCap > CAP && earn > CAP) {
      f *= 1 + 0.15 * (Math.min(earn, newCap) - CAP) / 12 / (CAP / 12) * 0.5; // small high-end formula credit
    }
    const colaYears = 12;
    const colaMult = Math.pow(1 + ({ cpiw: 0, chained: -0.0025, cpie: 0.002 })[state.cola], colaYears);
    const planned = sched * f * colaMult * sim.payable[i];
    const doNothing = sched * base.payable[i];

    $('youOut').innerHTML =
      stat('Your payroll tax (your half)', money(taxBase / 2) + '/yr now', delta(youTaxDelta, '/yr', false)) +
      stat('Scheduled benefit at 67 (' + claimYear + ')', money(sched) + '/yr', '<span class="d">today\'s dollars</span>') +
      stat('If Congress does nothing', money(doNothing) + '/yr', '<span class="d down">' + Math.round(base.payable[i] * 100) + '% payable then</span>') +
      stat('Under your scenario', money(planned) + '/yr', delta(planned - doNothing, '/yr vs. nothing', true));
  }
  function stat(k, v, d) { return '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div>' + d + '</div>'; }

  // ---- reference table ------------------------------------------------------------
  function buildRef() {
    $('refBody').innerHTML = D.REFERENCE.map((r) => '<tr><td>' + r.name + '</td><td>' + r.score + '</td><td><a href="' + r.url + '" target="_blank" rel="noopener">' + r.src + '</a></td></tr>').join('');
    $('sources').innerHTML = D.SOURCES.map((s) => '<a href="' + s[1] + '" target="_blank" rel="noopener">' + s[0] + '</a>').join('');
  }

  // ---- main ----------------------------------------------------------------------
  function update() {
    const sim = M.simulate(state), base = M.baseline(), s = M.summarize(sim);
    syncControls(); renderPresets(); renderScore(sim, s); renderCharts(sim, base); renderYou(sim, base); writeHash();
  }

  readHash();
  buildLevers(); buildPresets(); buildRef();
  const changed = Object.keys(DEF).some((k) => state[k] !== DEF[k]);
  activePreset = changed ? null : 'current';
  ['yBirth', 'yEarn'].forEach((id) => $(id).addEventListener('input', update));
  $('shareBtn').addEventListener('click', () => {
    try { navigator.clipboard.writeText(location.href); $('shareBtn').textContent = 'Link copied!'; setTimeout(() => { $('shareBtn').textContent = 'Copy link to this scenario'; }, 1800); } catch (e) {}
  });
  update();
})();
