const assert = require('assert');
const M = require('../model.js');
const sum = (o) => M.summarize(M.simulate(Object.assign({ startYear: 2027 }, o)));
const base = M.summarize(M.baseline());
assert.ok(Math.abs(base.actuarialBalance + 4.42) < 0.1, 'baseline gap ~4.42% of payroll');
assert.strictEqual(base.depletionYear, 2034);
// 2026 Trustees path: 83% payable at depletion, ~6.57% deficit in 2100
assert.ok(Math.abs(base.payableAtDepletion - 0.83) < 0.015, 'payable at depletion ~83%');
assert.ok(base.payable2100 > 0.63 && base.payable2100 < 0.69, 'payable in 2100 about two-thirds');
assert.ok(Math.abs(base.finalYearBalance + 6.57) < 0.25, '2100 deficit ~6.57% of payroll');
// sensitivities tuned to the 2026 report
const dAB = (o) => M.simulate(o).actuarialBalance - M.baseline().actuarialBalance;
assert.ok(Math.abs(dAB({ tfr: 1.90 }) - 0.33) < 0.05, 'fertility 1.75 -> 1.90 worth ~0.33');
assert.ok(Math.abs(dAB({ immigration: -150 }) + 0.12) < 0.03, '150k fewer immigrants cost ~0.12');
assert.ok(Math.abs(dAB({ wageGrowth: 0.5 }) - 0.54) < 0.1, '+0.5 pt real wage growth worth ~0.54');
assert.ok(dAB({ realRate: 0.5 }) > 0.1 && dAB({ realRate: -0.5 }) < -0.1, 'interest rate matters via discounting');
assert.ok(dAB({ benefitTax: -100, startYear: 2027 }) < -0.8, 'repealing tax on benefits costs ~1% of payroll');
assert.ok(sum({ allCut: 20 }).closedPct < 20 / 25 * 100, 'benefit cuts give back some income tax on benefits');
assert.ok(sum({ payrollRate: 4.7 }).closedPct > 95, 'big tax increase closes the gap');
assert.ok(sum({ fra: 69, fraIndexed: true }).closedPct > 25 && sum({ fra: 69, fraIndexed: true }).closedPct < 40);
assert.ok(sum({ cola: 'chained' }).closedPct > 10 && sum({ cola: 'chained' }).closedPct < 20);
assert.ok(sum({ taxShare: 100 }).closedPct < sum({ taxShare: 100, benefitCredit: false }).closedPct, 'benefit credit gives back revenue');
const late = M.summarize(M.simulate({ startYear: 2040, payrollRate: 4.0 }));
const early = M.summarize(M.simulate({ startYear: 2028, payrollRate: 4.0 }));
assert.ok(early.closedPct > late.closedPct, 'waiting costs more');
// new levers move the gap in the expected direction
assert.ok(sum({ diCut: 20 }).closedPct > 3, 'disability cut saves money');
assert.ok(sum({ survCut: -15 }).closedPct < 0, 'survivor increase costs money');
assert.ok(sum({ lifeExp: 1 }).closedPct < 0 && sum({ lifeExp: -1 }).closedPct > 0, 'longevity costs money');
assert.ok(sum({ wageGrowth: 0.5 }).closedPct > 0, 'faster wages help');
assert.ok(sum({ newCut: 15, shield: true }).closedPct < sum({ newCut: 15 }).closedPct, 'shield gives up savings');
assert.ok(sum({ fra: 69, grandfather: true }).closedPct < sum({ fra: 69 }).closedPct, 'grandfathering delays savings');
assert.ok(sum({ recession: 8 }).closedPct < 0, 'recession hurts');
const crashed = M.simulate({ startYear: 2027, equityShare: 100, deposit: 1.4, crash: 40, crashYear: 2030 });
const noCrash = M.simulate({ startYear: 2027, equityShare: 100, deposit: 1.4 });
assert.ok(crashed.reserve[6] < noCrash.reserve[6], 'crash cuts reserves');
// stock returns count in the 75-yr balance, and growing reserves count as stable at the end
const stocks = { payrollRate: 0.9, taxShare: 97, equityShare: 80, tfr: 2, immigration: 250, fra: 69, diCut: 11, survCut: 7 };
const withStocks = M.summarize(M.simulate(stocks));
const noStocks = M.summarize(M.simulate(Object.assign({}, stocks, { equityShare: 0 })));
assert.ok(withStocks.actuarialBalance > noStocks.actuarialBalance + 0.5, 'expected stock returns improve the 75-yr balance');
assert.ok(withStocks.finalYearBalance < -0.05 && withStocks.stableAtEnd && withStocks.sustainable, 'reserve earnings cover a cash deficit');
assert.ok(!noStocks.stableAtEnd, 'without stocks the same plan runs dry');
assert.ok(M.summarize(M.simulate(Object.assign({}, stocks, { crash: 40, crashYear: 2085 }))).actuarialBalance < withStocks.actuarialBalance, 'a crash counts against the balance');
// every preset only sets real levers
global.window = global; require('../data.js');
for (const p of global.SSData.PRESETS) for (const k of Object.keys(p.settings)) assert.ok(k in M.DEFAULTS, p.id + ' sets unknown lever ' + k);
console.log('model tests passed');
