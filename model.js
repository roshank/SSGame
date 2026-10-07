/* Social Security trust-fund model.
 *
 * A deliberately simple, transparent annual projection (2026-2100), calibrated to the
 * 2026 Trustees Report (intermediate assumptions): combined OASDI reserves depleted in
 * 2034, 75-year actuarial deficit of 4.42% of taxable payroll.
 *
 * Everything is in REAL 2026 dollars. Income, cost and balances are expressed as a
 * percent of taxable payroll; reserves in trillions of 2026 dollars.
 *
 * Baseline cost and income rates follow the Trustees' intermediate path (Table IV.B1, as
 * charted by CRR, June 2026): cost ~15.4% now, flat near 15.7% through 2035, 16.2% in 2040,
 * peaking near 20.5% around 2085 and 20.0% in 2100; income ~13.0% rising to ~13.45%.
 * Income is split into payroll taxes and income tax on benefits, which scales with cost.
 *
 * Lever effects are rules of thumb tuned so that single-lever results land near the
 * published Office of the Chief Actuary scores (see data.js) where such scores exist.
 * Levers without a published anchor (disability, survivors, protections, economy, shocks)
 * are labeled rough in the UI. NOT official estimates.
 */
(function (root) {
  const START = 2026, END = 2100;
  const YEARS = END - START + 1;
  const REAL_INTEREST = 0.023;      // Trustees' ultimate real interest rate
  // Effective real yield on reserves: the funds hold older low-coupon bonds, so the
  // yield starts near zero after inflation and reaches the ultimate rate as they roll over.
  const YIELD_PTS = [[2026, 0.000], [2036, REAL_INTEREST]];
  const PAYROLL_2026 = 11.1;        // $T taxable payroll, 2026
  const RESERVES_2025 = 2.6;        // $T combined reserves at start of 2026 (~150% of a year's cost)
  const FRA_BASE = 67;

  // ---- baseline (current law) path, % of taxable payroll ---------------------------
  function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
  function piecewise(pts, y) {
    for (let i = 1; i < pts.length; i++) {
      if (y <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (y - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
    }
    return pts[pts.length - 1][1];
  }
  const COST_PTS = [[2026, 15.4], [2030, 15.7], [2035, 15.75], [2040, 16.2], [2050, 16.85], [2060, 17.9],
    [2070, 19.2], [2080, 20.15], [2086, 20.5], [2100, 20.0]];
  // payroll-tax income (12.4% less self-employment and compliance effects)
  const INCOME_PTS = [[2026, 12.16], [2100, 12.16]];
  // income tax on benefits as a share of benefit cost (thresholds are not indexed, so it rises;
  // the 2025 tax law lowered it)
  const TOB_PTS = [[2026, 0.055], [2050, 0.060], [2100, 0.065]];
  const GROWTH_PTS = [[2026, 0.020], [2050, 0.013], [2100, 0.012]];

  const BASE = { cost: [], income: [], tob: [], yield: [], payroll: [] };
  (function () {
    let p = PAYROLL_2026;
    for (let i = 0; i < YEARS; i++) {
      const y = START + i;
      BASE.cost.push(piecewise(COST_PTS, y));
      BASE.income.push(piecewise(INCOME_PTS, y));
      BASE.tob.push(piecewise(TOB_PTS, y));
      BASE.yield.push(piecewise(YIELD_PTS, y));
      if (i > 0) p *= 1 + piecewise(GROWTH_PTS, y);
      BASE.payroll.push(p);
    }
  })();

  // ---- default lever settings ----------------------------------------------------
  const DEFAULTS = {
    startYear: 2030,       // year changes begin
    // Sources: taxes
    payrollRate: 0,        // pp added to combined 12.4% rate
    taxShare: 82.5,        // % of covered earnings subject to the tax
    benefitCredit: true,   // do newly taxed earnings earn benefits?
    otherRevenue: 0,       // pp of payroll from other dedicated revenue
    benefitTax: 0,         // % change in income tax on benefits credited to the funds (-100 = repeal)
    // Sources: trust fund money
    deposit: 0,            // $T one-time Treasury deposit in start year
    equityShare: 0,        // % of reserves invested in equities (+3pp expected)
    // People
    tfr: 1.75,             // ultimate total fertility rate
    immigration: 0,        // change in net annual immigration, thousands
    lifeExp: 0,            // change in life expectancy at 65 by 2070, years
    // Retirement: when
    fra: 67,               // target full retirement age
    fraIndexed: false,     // index FRA to longevity afterwards
    // Retirement: benefit amounts
    allCut: 0,             // % cut for all beneficiaries (negative = increase)
    newCut: 0,             // % cut to initial benefits of new retirees
    highCut: 0,            // extra % cut to initial benefits of higher earners
    cola: 'cpiw',          // 'cpiw' | 'chained' | 'cpie'
    // Retirement: disability & survivors
    diCut: 0,              // % cut to disability benefits/eligibility (negative = expand)
    survCut: 0,            // % cut to survivor benefits (negative = increase)
    // Retirement: protections
    minBenefit: 0,         // % of a minimum-benefit boost for long-career low earners (0-100)
    caregiver: 0,          // years of caregiver earnings credit (0-5)
    shield: false,         // exempt lower earners from benefit cuts
    grandfather: false,    // spare people now 55+ from cohort-based changes
    // Economy
    wageGrowth: 0,         // change in real wage growth, pp per year
    employment: 0,         // % change in long-run employment (payroll base)
    realRate: 0,           // change in real interest rate on reserves, pp
    // Shocks & risk
    recession: 0,          // severity: % of payroll lost at the trough (0 = none)
    recessionYear: 2031,
    crash: 0,              // % loss on stock holdings (0 = none)
    crashYear: 2036
  };

  const TFR_COEF = 4.9;              // pp of payroll per child per woman, once phased in
  const IMMIG_COEF = 0.10;           // pp of payroll per 100k net immigrants a year
  const COLA_PP = { cpiw: 0, chained: -0.0025, cpie: 0.002 };
  const BASE_TAX_SHARE = 82.5;
  const LAMBDA_COHORT = 0.065;       // share of benefit stock replaced per year
  const FRA_COST_PER_YEAR = 0.041;   // cost reduction per year of FRA increase, fully phased in
  const COLA_EXPOSURE_YEARS = 22;    // avg years a benefit has been exposed to COLA
  const DI_SHARE = 0.10;             // disability share of total cost (~0.52% of GDP of ~5.2%)
  const SURV_SHARE = 0.13;           // survivor share of total cost (approximate)
  const SHIELD_FACTOR = 0.78;        // share of benefit cuts that still bites when lower earners are exempt
  const GRANDFATHER_YEAR = 2037;     // people 55 today turn 66 about now

  function ramp(y, start, len) { return Math.max(0, Math.min(1, (y - start) / len)); }

  function simulate(input) {
    const s = Object.assign({}, DEFAULTS, input);
    const out = { years: [], income: [], cost: [], reserve: [], payable: [], balance: [], payroll: [] };
    let reserve = RESERVES_2025;
    let depletion = null;
    let eFra = 0, eNew = 0, eHigh = 0, eCredit = 0, eDi = 0, eSurv = 0, eExtra = 0;
    let pvGap = 0, pvPayroll = 0, discount = 1, lastCostD = 0, depositPV = 0;
    const credit = s.benefitCredit ? 1 : 0;
    const extraShare = Math.max(0, (s.taxShare - BASE_TAX_SHARE) / BASE_TAX_SHARE);
    const shield = s.shield ? SHIELD_FACTOR : 1;
    const cohortStart = s.grandfather ? Math.max(s.startYear, GRANDFATHER_YEAR) : s.startYear;

    for (let i = 0; i < YEARS; i++) {
      const y = START + i;
      const active = y >= s.startYear;
      const cohortActive = y >= cohortStart;
      const since = active ? y - s.startYear : -1;
      const cSince = cohortActive ? y - cohortStart : -1;

      // --- payroll base: wages, employment, recession
      const wgf = Math.pow(1 + s.wageGrowth / 100, i);
      const lpm = 1 + (s.employment / 100) * ramp(y, 2027, 10);
      let rec = 1;
      if (s.recession > 0) {
        const k = y - s.recessionYear;
        const shape = k < 0 ? 0 : k <= 1 ? 1 : Math.max(0, 1 - (k - 1) / 4);
        rec = 1 - (s.recession / 100) * shape;
      }
      const P = BASE.payroll[i] * wgf;          // payroll before employment / recession effects
      const Pe = P * lpm * rec;                 // effective payroll

      // --- income side (% of effective payroll)
      let income = BASE.income[i];
      if (active) income += s.payrollRate + 12.4 * extraShare + s.otherRevenue;
      // demographics, tuned to the 2026 report: 1.90 -> 1.75 fertility cost 0.33% of payroll;
      // 150k fewer temporary/unlawful immigrants a year cost 0.12%
      income += (s.tfr - 1.75) * TFR_COEF * ramp(y, 2046, 30)
              + (s.immigration / 100) * IMMIG_COEF * ramp(y, 2027, 20);

      // --- benefit side (cost multiplier)
      let fraNow = FRA_BASE;
      if (cohortActive) {
        fraNow = Math.min(s.fra, FRA_BASE + cSince / 6);       // +2 months a year
        if (s.fraIndexed && fraNow >= s.fra) fraNow = s.fra + Math.max(0, cSince - (s.fra - FRA_BASE) * 6) / 24;
      }
      const cut = (v) => (v > 0 ? v * shield : v);
      eFra += LAMBDA_COHORT * ((fraNow - FRA_BASE) * shield - eFra);
      eNew += LAMBDA_COHORT * ((cohortActive ? cut(s.newCut) / 100 : 0) - eNew);
      eHigh += LAMBDA_COHORT * ((cohortActive ? s.highCut / 100 : 0) - eHigh);
      eDi += 0.12 * ((cohortActive ? s.diCut / 100 : 0) - eDi);
      eSurv += 0.10 * ((cohortActive ? cut(s.survCut) / 100 : 0) - eSurv);

      let costMult = 1 - FRA_COST_PER_YEAR * eFra;
      costMult *= 1 - eNew;
      costMult *= 1 - 0.5 * eHigh;
      costMult *= 1 - DI_SHARE * eDi;
      costMult *= 1 - SURV_SHARE * eSurv;
      if (active) costMult *= 1 - cut(s.allCut) / 100;
      if (active) {
        const exp = COLA_EXPOSURE_YEARS * (1 - Math.exp(-since / COLA_EXPOSURE_YEARS));
        costMult *= Math.pow(1 + COLA_PP[s.cola], exp);
      }
      // longevity: each extra year of life at 65 ~ +4% benefit cost once fully phased in
      costMult *= 1 + s.lifeExp * 0.04 * ramp(y, 2030, 40);
      // faster real wage growth outpaces post-claim cost-of-living adjustments
      costMult *= 1 - (s.wageGrowth / 100) * 10.5 * (1 - Math.exp(-(y - START) / 10));

      let costRate0 = BASE.cost[i] * costMult;
      // benefit credit for newly taxed earnings (slowly rising cost)
      eCredit += 0.045 * ((active ? 1 : 0) - eCredit);
      costRate0 += credit * 12.4 * extraShare * 0.40 * eCredit * (active ? 1 : 0) * (BASE.cost[i] / 17);
      // protections that add cost: minimum benefit and caregiver credits
      eExtra += 0.05 * ((cohortActive ? 1 : 0) - eExtra);
      costRate0 += (s.minBenefit / 100 * 0.4 + s.caregiver * 0.02) * eExtra * (BASE.cost[i] / 17);

      // --- dollars; income tax on benefits follows benefit cost
      const costD = costRate0 / 100 * P;
      const tob = BASE.tob[i] * (active ? Math.max(0, 1 + s.benefitTax / 100) : 1);
      const incomeD = income / 100 * Pe + tob * costD;
      income = incomeD / Pe * 100;
      const costRate = costD / Pe * 100;

      // --- reserves
      if (y === s.startYear) { reserve += s.deposit; depositPV = s.deposit * discount; }
      let crashLoss = 0;
      if (s.crash > 0 && y === s.crashYear) { crashLoss = reserve * (s.equityShare / 100) * (s.crash / 100); reserve -= crashLoss; }
      const rate = BASE.yield[i] + s.realRate / 100;   // also the discount rate for the 75-yr balance
      const r = rate + (s.equityShare / 100) * 0.03;
      // stock returns above the Treasury rate (and crash losses) count in the 75-yr balance,
      // so it agrees with the reserve path
      const excessReturn = reserve * (r - rate);
      let payable = 1;
      reserve = reserve + reserve * r + (incomeD - costD);
      if (reserve < 0) {
        if (depletion === null) depletion = y;
        payable = Math.min(1, incomeD / costD);
        reserve = 0;
      }
      out.years.push(y);
      out.income.push(income);
      out.cost.push(costRate);
      out.reserve.push(reserve);
      out.payable.push(payable);
      out.balance.push(income - costRate);
      out.payroll.push(Pe);
      lastCostD = costD;

      pvGap += discount * (costD - incomeD + crashLoss - excessReturn);
      pvPayroll += discount * Pe;
      discount /= 1 + rate;
    }
    // target: ending reserve equal to one year's cost; starting reserve offsets
    const gapPV = pvGap + lastCostD * discount - RESERVES_2025 - depositPV;
    out.actuarialBalance = -(gapPV / pvPayroll) * 100;     // negative = deficit
    out.finalYearBalance = out.balance[YEARS - 1];
    out.depletionYear = depletion;
    return out;
  }

  let _base = null;
  function baseline() { return _base || (_base = simulate({})); }

  function summarize(sim) {
    const base = baseline();
    const shortfall = -base.actuarialBalance;
    const closed = (sim.actuarialBalance - base.actuarialBalance) / shortfall * 100;
    const idx = (y) => y - START;
    // Trustees' sustainable-solvency test: at the end, income covers cost, or the trust fund
    // ratio (reserves / a year's cost) is stable or rising, so earnings on reserves cover the gap
    const ratio = (y) => sim.reserve[idx(y)] / (sim.cost[idx(y)] / 100 * sim.payroll[idx(y)]);
    const reservesKeepPace = !sim.depletionYear && ratio(END) >= 1 && ratio(END) >= ratio(END - 5);
    const stableAtEnd = sim.finalYearBalance >= -0.05 || reservesKeepPace;
    return {
      actuarialBalance: sim.actuarialBalance,
      closedPct: closed,
      depletionYear: sim.depletionYear,
      payableAtDepletion: sim.depletionYear ? sim.payable[idx(sim.depletionYear)] : 1,
      payable2060: sim.payable[idx(2060)],
      payable2100: sim.payable[idx(2100)],
      finalYearBalance: sim.finalYearBalance,
      solvent75: sim.actuarialBalance >= -0.005,
      reservesKeepPace,
      stableAtEnd,
      sustainable: sim.actuarialBalance >= -0.005 && stableAtEnd
    };
  }

  const api = { simulate, baseline, summarize, DEFAULTS, START, END, BASE, FRA_BASE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SSModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
