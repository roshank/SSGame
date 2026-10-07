// Prints baseline + single-lever results next to published OCACT scores.
const M = require('../model.js');
const b = M.summarize(M.baseline());
console.log('BASE', b.actuarialBalance.toFixed(2), 'depl', b.depletionYear, 'payable', b.payableAtDepletion.toFixed(2), 'p2100', b.payable2100.toFixed(2));
const t = (name, o, target) => {
  const s = M.summarize(M.simulate(Object.assign({startYear: 2027}, o)));
  console.log(name.padEnd(34), 'closed', s.closedPct.toFixed(0).padStart(4)+'%', 'target', target, 'depl', s.depletionYear, 'bal', s.actuarialBalance.toFixed(2), 'final', s.finalYearBalance.toFixed(2));
};
t('payroll +3.65pp', {payrollRate: 3.65}, '~83-100');
t('eliminate cap w/ credit', {taxShare: 100}, '~48');
t('eliminate cap no credit', {taxShare: 100, benefitCredit: false}, '~67');
t('FRA 69 + indexed', {fra: 69, fraIndexed: true}, '~36-37');
t('chained CPI', {cola: 'chained'}, '~18-19');
t('all benefits -13%', {allCut: 13}, '~100?');
// 2026 Trustees sensitivities (change in 75-yr balance, % of payroll)
const d = (name, o, target) => console.log(name.padEnd(34), 'dAB', (M.simulate(o).actuarialBalance - M.baseline().actuarialBalance).toFixed(2), 'target', target);
d('fertility 1.75 -> 1.90', {tfr: 1.90}, '+0.33');
d('150k fewer immigrants/yr', {immigration: -150}, '-0.12');
d('real wage growth +0.5', {wageGrowth: 0.5}, '+0.54');
d('real interest +0.5', {realRate: 0.5}, '~+0.2-0.3');
d('repeal tax on benefits', {benefitTax: -100, startYear: 2027}, 'depletion ~2032');
