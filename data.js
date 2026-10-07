/* Reference data: sourced published figures and approximate preset encodings. */
(function (root) {
  // Headline facts: 2026 Trustees Report (via CRS, CRFB, CNBC summaries; ssa.gov was not reachable when built).
  const FACTS = {
    report: '2026 Trustees Report',
    oasiDepletion: '2032 (Q4)',
    oasiPayable: 78,
    combinedDepletion: '2034 (Q3)',
    combinedPayable: 83,
    deficit: 4.42,
    deficitPrior: 3.82
  };

  // Published single-provision scores (percent of 75-yr shortfall closed). Most come from
  // SSA Office of the Chief Actuary scores against the 2025 Trustees baseline (3.82% of payroll),
  // so against today's larger 4.42% gap each closes a somewhat smaller share.
  const REFERENCE = [
    { name: 'Raise the payroll tax by 3.65 pts (12.4% → 16.05%)', score: 'Closes 100% of the 2025-baseline gap', src: 'CRFB / CRS', url: 'https://www.crfb.org/papers/analysis-2025-social-security-trustees-report' },
    { name: 'Eliminate the taxable maximum, with benefit credit', score: '~48% of the 75-yr gap', src: 'AAF / OCACT', url: 'https://www.americanactionforum.org/insight/the-social-security-trust-funds-and-options-for-reform/' },
    { name: 'Eliminate the taxable maximum, no benefit credit', score: '~67% of the 75-yr gap', src: 'AAF / OCACT', url: 'https://www.americanactionforum.org/insight/the-social-security-trust-funds-and-options-for-reform/' },
    { name: 'Raise full retirement age to 69 and index to longevity', score: '~36% of the 75-yr gap', src: 'AAF / OCACT', url: 'https://www.americanactionforum.org/insight/the-social-security-trust-funds-and-options-for-reform/' },
    { name: 'FRA to 69 by 2039 and 70 by 2063', score: '~37% of the 75-yr gap', src: 'CRFB', url: 'https://www.crfb.org/blogs/ten-options-secure-social-security-trust-fund' },
    { name: 'Chained CPI for cost-of-living adjustments', score: '~18–19% of the 75-yr gap', src: 'AAF / CRFB', url: 'https://www.crfb.org/blogs/ten-options-secure-social-security-trust-fund' },
    { name: 'Tax earnings above $250,000 (CBO)', score: 'Delays combined exhaustion ~13 yrs, to 2044 (CBO baseline at the time)', src: 'CBO', url: 'https://www.cbo.gov/budget-options/54806' },
    { name: 'Tax 90% of covered earnings (CBO)', score: 'Delays combined exhaustion ~5 yrs, to 2036 (CBO baseline at the time)', src: 'CBO', url: 'https://www.cbo.gov/budget-options/54806' },
    { name: 'Penn Wharton "Option A": +1 pt payroll tax, $250k cap, slower COLA', score: 'Delays insolvency from 2032 to 2058', src: 'Penn Wharton Budget Model', url: 'https://budgetmodel.wharton.upenn.edu/p/2026-03-09-six-options-to-restore-social-securitys-financial-balance/' }
  ];

  // Proposals Congress and commissions have actually put on the table. The "encoding" is OUR rough
  // translation of the main provisions into this app's levers; it is not an official score.
  const PRESETS = [
    {
      id: 'current', name: 'Do nothing', tag: 'Current law',
      blurb: 'No legislation. OASI runs dry in 2032, the combined funds in 2034, and benefits are cut automatically to what incoming taxes can pay (about 77–83%).',
      settings: {},
      sources: [['2026 Trustees Report highlights', 'https://www.ssa.gov/oact/tr/2026/II_A_highlights.html']]
    },
    {
      id: 'tax', name: 'Taxes only', tag: 'Revenue-side bookend',
      blurb: 'Close the gap entirely with a higher payroll tax rate. The 2025 Trustees report put the immediate fix at 3.65 points (12.4% to 16.05%); starting in 2030 instead needs more, about 4.7. Our own bookend, not a bill.',
      settings: { payrollRate: 4.7 },
      sources: [['CRFB analysis of the 2025 Trustees report', 'https://www.crfb.org/papers/analysis-2025-social-security-trustees-report']]
    },
    {
      id: 'benefits', name: 'Benefits only', tag: 'Spending-side bookend',
      blurb: 'Close the gap with no new revenue: later retirement age indexed to longevity, chained CPI, and a trim to new retirees\' initial benefits, deeper for higher earners. Our own bookend, not a bill.',
      settings: { fra: 69, fraIndexed: true, cola: 'chained', newCut: 15, highCut: 25 },
      sources: []
    },
    {
      id: 'sb', name: 'Simpson–Bowles style', tag: '2010 fiscal commission',
      blurb: 'The 2010 co-chairs\' plan: raise the cap to cover 90% of earnings, chained CPI, a retirement age that drifts up to 68 by 2050 and 69 by 2075 (modeled as indexing to longevity), a more progressive formula for higher earners, and a minimum benefit at 125% of poverty. It also extended coverage to new state and local hires (not modeled). The original claimed 75-year balance against 2010 projections; against today\'s larger gap it closes less. The formula trim size is our guess.',
      settings: { taxShare: 90, fraIndexed: true, cola: 'chained', highCut: 25, minBenefit: 100 },
      sources: [['CBPP: what was in Bowles–Simpson', 'https://www.cbpp.org/research/what-was-actually-in-bowles-simpson-and-how-can-we-compare-it-with-other-plans'], ['CBPP: Bowles–Simpson Social Security proposal', 'https://www.cbpp.org/research/bowles-simpson-social-security-proposal-not-a-good-starting-point-for-reforms']]
    },
    {
      id: 's2100', name: 'Social Security 2100 style', tag: 'Larson / Blumenthal bill',
      blurb: 'Applies the 12.4% tax to earnings above $400,000, leaving a gap between today\'s cap and $400k, adds a 2% across-the-board benefit increase, CPI-E cost-of-living adjustments, and a minimum benefit at 125% of poverty, with a tax on high earners\' investment income. Newly taxed earnings add only a small benefit (1% replacement), treated as none here. The investment-income revenue size is back-solved from a reported "about half the shortfall" score, not verified.',
      settings: { taxShare: 90, benefitCredit: false, allCut: -2, cola: 'cpie', minBenefit: 100, otherRevenue: 2.0 },
      sources: [['CBPP: Social Security 2100 overview', 'https://www.cbpp.org/research/social-security/social-security-2100-an-overview'], ['Congress.gov: S.2280', 'https://www.congress.gov/bill/118th-congress/senate-bill/2280']]
    },
    {
      id: 'rsc', name: 'Republican Study Committee style', tag: 'House GOP budget',
      blurb: 'The RSC budget raises the full retirement age to 69 (three months a year, modeled here at the standard two) and slows benefit growth for higher earners. Reports differ on whether it also adopts chained CPI for Social Security, so that is left out. The size of the higher-earner slowdown is our guess.',
      settings: { fra: 69, highCut: 20 },
      sources: [['Center for American Progress on the RSC budget', 'https://www.americanprogress.org/article/the-house-republican-study-committee-budget-proposes-harsh-changes-to-social-security/'], ['Cato: RSC budget and key drivers', 'https://www.cato.org/blog/republican-study-committee-budget-key-drivers-spending-debt']]
    },
    {
      id: 'ck', name: 'Cassidy–Kaine investment fund', tag: 'Senate bipartisan idea',
      blurb: 'The real plan borrows $300B a year for five years ($1.5T), puts it in a separate fund invested for 70 years, and has Treasury cover benefits meanwhile, repaying at the end. This model can only approximate that as a deposit into the trust fund invested in stocks, so it overstates near-term help and ignores borrowing costs. Critics\' stress tests found it fails to repay in about 70% of scenarios.',
      settings: { deposit: 1.5, equityShare: 100 },
      sources: [['The Hill: what to know', 'https://thehill.com/business/budget/5439992-bipartisan-senate-social-security-plan/'], ['CRR critique', 'https://crr.bc.edu/the-cassidy-kaine-proposal-does-virtually-nothing-to-solve-social-securitys-financing-problems/']]
    },
    {
      id: 'protect', name: 'Protect the vulnerable', tag: 'Our fairness-first mix',
      blurb: 'Our own illustration, not a bill: raise the cap without extra benefits for top earners, a modest rate rise and new revenue, then spare lower earners and anyone 55+ from cuts, add a minimum benefit and caregiver credit, and ask higher earners to take smaller benefit growth.',
      settings: { taxShare: 92, benefitCredit: false, payrollRate: 0.8, otherRevenue: 0.6, shield: true, grandfather: true, minBenefit: 50, caregiver: 3, fra: 68, fraIndexed: true, highCut: 20, cola: 'chained' },
      sources: []
    },
    {
      id: 'mix', name: 'Shared sacrifice', tag: 'Our middle path',
      blurb: 'Our own illustration, not a bill: a small rate increase, a higher cap, a modest retirement-age rise, and chained CPI. Does it get you all the way?',
      settings: { payrollRate: 1.0, taxShare: 90, fra: 68, cola: 'chained', highCut: 10 },
      sources: []
    }
  ];

  const SOURCES = [
    ['2026 Trustees Report highlights', 'https://www.ssa.gov/oact/tr/2026/II_A_highlights.html'],
    ['CRS: Selected Findings of the 2026 Annual Report', 'https://www.congress.gov/crs-product/IF13256'],
    ['CRFB: Analysis of the 2026 Trustees\' Report', 'https://www.crfb.org/papers/analysis-2026-social-security-trustees-report'],
    ['CBO: Social Security (March 2026)', 'https://www.cbo.gov/system/files/2026-03/62217-Social-Security.pdf'],
    ['SSA OCACT: provisions affecting solvency', 'https://www.ssa.gov/OACT/solvency/provisions_tr2025/index.html'],
    ['CRFB: Ten options to secure the trust fund', 'https://www.crfb.org/blogs/ten-options-secure-social-security-trust-fund'],
    ['AAF: Trust funds and options for reform', 'https://www.americanactionforum.org/insight/the-social-security-trust-funds-and-options-for-reform/'],
    ['Penn Wharton Budget Model: six options', 'https://budgetmodel.wharton.upenn.edu/p/2026-03-09-six-options-to-restore-social-securitys-financial-balance/'],
    ['Social Security 2100 Act (Rep. Larson)', 'http://larson.house.gov/issues/social-security-2100-act'],
    ['CRR: Cassidy–Kaine critique', 'https://crr.bc.edu/the-cassidy-kaine-proposal-does-virtually-nothing-to-solve-social-securitys-financing-problems/']
  ];

  root.SSData = { FACTS, REFERENCE, PRESETS, SOURCES };
})(typeof window !== 'undefined' ? window : globalThis);
