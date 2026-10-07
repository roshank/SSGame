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
      settings: {}
    },
    {
      id: 'tax', name: 'Taxes only', tag: 'Revenue-side bookend',
      blurb: 'Close the gap entirely with a higher payroll tax rate, as the Trustees\' "what it would take" illustration does. Roughly a 4–5 point rise on top of 12.4%.',
      settings: { payrollRate: 4.7 }
    },
    {
      id: 'benefits', name: 'Benefits only', tag: 'Spending-side bookend',
      blurb: 'Close the gap with no new revenue: later retirement age indexed to longevity, chained CPI, and a trim to new retirees\' initial benefits, deeper for higher earners.',
      settings: { fra: 69, fraIndexed: true, cola: 'chained', newCut: 15, highCut: 25 }
    },
    {
      id: 'sb', name: 'Simpson–Bowles style', tag: '2010 fiscal commission',
      blurb: 'A bipartisan mix: raise the cap to cover ~90% of earnings, chained CPI, a more progressive benefit formula, and a gradually rising retirement age (to 69 by 2075 in the original; modeled here as a faster ramp).',
      settings: { taxShare: 90, fra: 69, fraIndexed: true, cola: 'chained', highCut: 25, newCut: 4 }
    },
    {
      id: 's2100', name: 'Social Security 2100 style', tag: 'Larson / Blumenthal bill',
      blurb: 'Expand benefits modestly (about 2% across the board, CPI-E COLA) and pay for it by taxing earnings above $400k and adding new taxes on high earners\' investment income. Roughly encoded.',
      settings: { taxShare: 97, benefitCredit: false, newCut: -2, cola: 'cpie', otherRevenue: 3.2 }
    },
    {
      id: 'rsc', name: 'Republican Study Committee style', tag: 'House GOP budget',
      blurb: 'Benefit-side reforms without tax increases: raise the full retirement age to 69, chained CPI, and slower benefit growth for higher earners. Roughly encoded.',
      settings: { fra: 69, cola: 'chained', highCut: 20, newCut: 4 }
    },
    {
      id: 'ck', name: 'Cassidy–Kaine investment fund', tag: 'Senate bipartisan idea',
      blurb: 'Borrow ~$1.5T, invest it in stocks for decades, and use the returns to help pay benefits. Critics note it adds little unless returns are high, and the borrowing has a cost not captured here.',
      settings: { deposit: 1.4, equityShare: 100 }
    },
    {
      id: 'mix', name: 'Shared sacrifice', tag: 'A middle path to try',
      blurb: 'A balanced starting point: a small rate increase, a higher cap, a modest retirement-age rise, and chained CPI. Does it get you all the way?',
      settings: { payrollRate: 1.0, taxShare: 90, fra: 68, cola: 'chained', highCut: 10 }
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
