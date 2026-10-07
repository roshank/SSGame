const M=require('../model.js');
const P={
 protect:{taxShare:92,benefitCredit:false,payrollRate:0.8,otherRevenue:0.6,shield:true,grandfather:true,minBenefit:50,caregiver:3,fra:68,fraIndexed:true,highCut:20,cola:'chained'},
 protect2:{taxShare:94,benefitCredit:false,payrollRate:1.2,otherRevenue:1.0,shield:true,grandfather:true,minBenefit:50,caregiver:3,fra:68,fraIndexed:true,highCut:20,newCut:4}
};
for(const k in P){const s=M.summarize(M.simulate(Object.assign({startYear:2030},P[k])));console.log(k,s.closedPct.toFixed(0),s.depletionYear,s.finalYearBalance.toFixed(2),s.sustainable);}
