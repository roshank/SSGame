const M=require('../model.js');
const P={
 tax:{payrollRate:4.7},
 benefits:{fra:69,fraIndexed:true,cola:'chained',newCut:15,highCut:25},
 sb:{taxShare:90,fra:69,fraIndexed:true,cola:"chained",highCut:25,newCut:4},
 s2100:{taxShare:97,benefitCredit:false,newCut:-2,cola:"cpie",otherRevenue:2.4},
 rsc:{fra:69,cola:'chained',highCut:20,newCut:4},
 ck:{deposit:1.4,equityShare:100},
 mix:{payrollRate:1.0,taxShare:90,fra:68,fraIndexed:false,cola:'chained',highCut:10},
 wait2040:{startYear:2040,payrollRate:4.0}
};
for(const k in P){const s=M.summarize(M.simulate(Object.assign({startYear:2030},P[k])));
console.log(k.padEnd(9),'closed',s.closedPct.toFixed(0),'bal',s.actuarialBalance.toFixed(2),'depl',s.depletionYear,'final',s.finalYearBalance.toFixed(2),'p2100',s.payable2100.toFixed(2));}
