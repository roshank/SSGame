/* Social Security trust-fund model.
 *
 * A deliberately simple, transparent annual projection (2026-2100), calibrated to the
 * 2026 Trustees Report (intermediate assumptions): combined OASDI reserves depleted in
 * 2034, 75-year actuarial deficit of 4.42% of taxable payroll.
 *
 * Everything is in REAL 2026 dollars. Income, cost and balances are expressed as a
 * percent of taxable payroll; reserves in trillions of 2026 dollars.
 *
 * Lever effects are rules of thumb tuned so that single-lever results land near the
 * published Office of the Chief Actuary scores (see data.js). They are NOT official
 * estimates.
 */
(function (root) {
  const START = 2026, END = 2100;
  const YEARS = END - START + 1;
  const REAL_INTEREST = 0.023;      // Trustees' ultimate real interest rate
  const PAYROLL_2026 = 11.7;        // $T taxable payroll, 2026
  const RESERVES_2025 = 2.75;       // $T combined reserves at start of 2026
  const FRA_BASE = 67;

  // ---- baseline (current law) path, % of taxable payroll ---------------------------
  function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
  function piecewise(pts, y) {
    for (let i = 1; i < pts.length; i++) {
      if (y <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (y - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
    }
    return pts[pts.length - 1][1];
  }
  const COST_PTS = [[2026, 14.9], [2034, 16.4], [2040, 17.3], [2055, 17.5], [2100, 18.45]];
  const INCOME_PTS = [[2026, 12.6], [2060, 12.7], [2100, 12.9]];
  const GROWTH_PTS = [[2026, 0.020], [2050, 0.013], [2100, 0.012]];

  const BASE = { cost: [], income: [], payroll: [] };
  (function () {
    let p = PAYROLL_2026;
    for (let i = 0; i < YEARS; i++) {
      const y = START + i;
      BASE.cost.push(piecewise(COST_PTS, y));
      BASE.income.push(piecewise(INCOME_PTS, y));
      if (i > 0) p *= 1 + piecewise(GROWTH_PTS, y);
      BASE.payroll.push(p);
    }
  })();

  // ---- default lever settings ----------------------------------------------------
  const DEFAULTS = {
    startYear: 2030,       // year changes begin
    payrollRate: 0,        // pp added to combined 12.4% rate
    taxShare: 82.5,        // % of covered earnings subject to the tax
    benefitCredit: true,   // do newly taxed earnings earn benefits?
    fra: 67,               // target full retirement age
    fraIndexed: false,     // index FRA to longevity afterwards
    allCut: 0,             // % cut for all beneficiaries (negative = increase)
    newCut: 0,             // % cut to initial benefits of new retirees
    highCut: 0,            // extra % cut to initial benefits of higher earners
    cola: 'cpiw',          // 'cpiw' | 'chained' | 'cpie'
    otherRevenue: 0,       // pp of payroll from other dedicated revenue
    deposit: 0,            // $T one-time Treasury deposit in start year
    equityShare: 0,        // % of reserves invested in equities (+3pp expected)
    tfr: 1.75,             // ultimate total fertility rate
    immigration: 0         // change in net annual immigration, thousands
  };

  const COLA_PP = { cpiw: 0, chained: -0.0025, cpie: 0.002 };
  const BASE_TAX_SHARE = 82.5;
  const LAMBDA_COHORT = 0.065;       // share of benefit stock replaced per year
  const FRA_COST_PER_YEAR = 0.041;   // cost reduction per year of FRA increase, fully phased in
  const COLA_EXPOSURE_YEARS = 22;    // avg years a benefit has been exposed to COLA

  function simulate(input) {
    const s = Object.assign({}, DEFAULTS, input);
    const out = {
      years: [], income: [], cost: [], reserve: [], payable: [], balance: [],
      payroll: BASE.payroll
    };
    let reserve = RESERVES_2025;
    let depletion = null;
    let eFra = 0, eNew = 0, eHigh = 0, eCredit = 0;
    let pvGap = 0, pvPayroll = 0, discount = 1;
    const credit = s.benefitCredit ? 1 : 0;
    const extraShare = Math.max(0, (s.taxShare - BASE_TAX_SHARE) / BASE_TAX_SHARE);

    for (let i = 0; i < YEARS; i++) {
      const y = START + i;
      const active = y >= s.startYear;
      const since = active ? y - s.startYear : -1;

      // --- income side (% payroll)
      let income = BASE.income[i];
      let extraRev = 0;
      if (active) {
        extraRev += s.payrollRate;
        extraRev += 12.4 * extraShare;
        extraRev += s.otherRevenue;
      }
      // demographic sensitivities (balance effects, pp of payroll)
      const demo = (s.tfr - 1.75) * 2.2 * ramp(y, 2046, 30)
                 + (s.immigration / 100) * 0.045 * ramp(y, 2027, 20);

      // --- benefit side (cost multiplier)
      let fraNow = FRA_BASE;
      if (active) {
        fraNow = Math.min(s.fra, FRA_BASE + since / 6);       // +2 months a year
        if (s.fraIndexed && fraNow >= s.fra) fraNow = s.fra + Math.max(0, since - (s.fra - FRA_BASE) * 6) / 24;
      }
      eFra += LAMBDA_COHORT * ((fraNow - FRA_BASE) - eFra);
      const newCutNow = active ? s.newCut / 100 : 0;
      const highCutNow = active ? s.highCut / 100 : 0;
      eNew += LAMBDA_COHORT * (newCutNow - eNew);
      eHigh += LAMBDA_COHORT * (highCutNow - eHigh);

      let costMult = 1 - FRA_COST_PER_YEAR * eFra;
      costMult *= 1 - eNew;
      costMult *= 1 - 0.5 * eHigh;                      // higher earners ~half of benefit dollars
      if (active) costMult *= 1 - s.allCut / 100;
      if (active) {
        const exp = COLA_EXPOSURE_YEARS * (1 - Math.exp(-since / COLA_EXPOSURE_YEARS));
        costMult *= Math.pow(1 + COLA_PP[s.cola], exp);
      }
      let cost = BASE.cost[i] * costMult;

      // benefit credit for newly taxed earnings (slowly rising cost)
      eCredit += 0.045 * ((active ? 1 : 0) - eCredit);
      cost += credit * 12.4 * extraShare * 0.40 * eCredit * (active ? 1 : 0) * (BASE.cost[i] / 17);

      income += extraRev + demo;

      // --- reserves
      const payroll = BASE.payroll[i];
      if (y === s.startYear) reserve += s.deposit;
      const r = REAL_INTEREST + (s.equityShare / 100) * 0.03;
      const interest = reserve * r;
      let net = (income - cost) / 100 * payroll;
      let payable = 1;
      reserve = reserve + interest + net;
      if (reserve < 0) {
        if (depletion === null) depletion = y;
        // after depletion only current income can be paid out
        payable = Math.min(1, income / cost);
        reserve = 0;
      }
      out.years.push(y);
      out.income.push(income);
      out.cost.push(cost);
      out.reserve.push(reserve);
      out.payable.push(payable);
      out.balance.push(income - cost);

      // --- actuarial measure: PV of (cost - income) over PV of payroll
      pvGap += discount * (cost - income) / 100 * payroll;
      pvPayroll += discount * payroll;
      discount /= 1 + REAL_INTEREST;
    }
    // target: ending reserve equal to one year's cost; starting reserve offsets
    const lastCost = out.cost[YEARS - 1] / 100 * BASE.payroll[YEARS - 1];
    const targetPV = lastCost * discount;                // discount already advanced one more year
    const gapPV = pvGap + targetPV - RESERVES_2025 - (s.deposit / Math.pow(1 + REAL_INTEREST, Math.max(0, s.startYear - START)));
    out.actuarialBalance = -(gapPV / pvPayroll) * 100;     // negative = deficit
    out.finalYearBalance = out.balance[YEARS - 1];
    out.depletionYear = depletion;
    return out;
  }

  function ramp(y, start, len) { return Math.max(0, Math.min(1, (y - start) / len)); }

  let _base = null;
  function baseline() { return _base || (_base = simulate({})); }

  function summarize(sim) {
    const base = baseline();
    const shortfall = -base.actuarialBalance;
    const closed = (sim.actuarialBalance - base.actuarialBalance) / shortfall * 100;
    const idx = (y) => y - START;
    return {
      actuarialBalance: sim.actuarialBalance,
      closedPct: closed,
      depletionYear: sim.depletionYear,
      payableAtDepletion: sim.depletionYear ? sim.payable[idx(sim.depletionYear)] : 1,
      payable2060: sim.payable[idx(2060)],
      payable2100: sim.payable[idx(2100)],
      finalYearBalance: sim.finalYearBalance,
      solvent75: sim.actuarialBalance >= -0.005,
      sustainable: sim.actuarialBalance >= -0.005 && sim.finalYearBalance >= -0.05
    };
  }

  const api = { simulate, baseline, summarize, DEFAULTS, START, END, BASE, FRA_BASE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SSModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
