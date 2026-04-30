import React, { useState } from 'react';
import { Calculator, Info, RefreshCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { 
  calculateReversionaryBonus, 
  calculateTerminalBonus, 
  calculateLoyaltyBonus, 
  calculateKhushaliBonus, 
  calculateSpecialTerminalBonusFIB, 
  calculateSpecialReversionaryBonusSB,
  PlanType 
} from '../lib/bonusCalculator';

const BonusHelper: React.FC = () => {
  const [inputs, setInputs] = useState({
    plan: 'WHOLE_LIFE' as PlanType,
    termRange: 'DEFAULT',
    sumAssured: 100000,
    policyYears: 20,
    policyYearsAsOf2024: 19,
    commencementYear: 2005,
    premiumsPaidYears: 20,
    isBigDeal: false,
    fibYears: 0,
    sbAmount: 0,
    sbYearsRemaining: 0
  });

  const [results, setResults] = useState<{
    reversionary: number;
    terminal: number;
    loyalty: number;
    khushali: number;
    specialTerminalFIB: number;
    specialRevSB: number;
    total: number;
  } | null>(null);

  const handleCalculate = () => {
    const rev = calculateReversionaryBonus(
      inputs.plan,
      inputs.termRange,
      inputs.sumAssured,
      inputs.policyYears,
      inputs.isBigDeal
    );
    const term = calculateTerminalBonus(inputs.sumAssured, inputs.premiumsPaidYears);
    const loyalty = calculateLoyaltyBonus(inputs.sumAssured, inputs.commencementYear);
    const khushali = calculateKhushaliBonus(
      inputs.plan,
      inputs.termRange,
      inputs.sumAssured,
      inputs.policyYearsAsOf2024,
      inputs.isBigDeal
    );
    const stf = calculateSpecialTerminalBonusFIB(inputs.sumAssured, inputs.fibYears);
    const srsb = calculateSpecialReversionaryBonusSB(inputs.sbAmount, inputs.sbYearsRemaining);

    setResults({
      reversionary: rev,
      terminal: term,
      loyalty: loyalty,
      khushali: khushali,
      specialTerminalFIB: stf,
      specialRevSB: srsb,
      total: rev + term + loyalty + khushali + stf + srsb
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Calculator className="text-blue-600" size={32} />
            Bonus Calculation Helper
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Full Implementation of Circular PHS/PO/CIR-07/2025</p>
        </div>
        <button 
          onClick={() => setInputs({
            plan: 'WHOLE_LIFE',
            termRange: 'DEFAULT',
            sumAssured: 100000,
            policyYears: 20,
            policyYearsAsOf2024: 19,
            commencementYear: 2005,
            premiumsPaidYears: 20,
            isBigDeal: false,
            fibYears: 0,
            sbAmount: 0,
            sbYearsRemaining: 0
          })}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs uppercase tracking-widest transition-colors"
        >
          <RefreshCcw size={14} />
          Reset Form
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
        {/* Inputs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6"
        >
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-3">Policy Parameters</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Plan Category</label>
                <select 
                  value={inputs.plan} 
                  onChange={(e) => setInputs({...inputs, plan: e.target.value as PlanType})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                >
                  <option value="WHOLE_LIFE">Whole Life & Endowment Assurance</option>
                  <option value="ENDOWMENT">Endowment</option>
                  <option value="ANTICIPATED_ENDOWMENT">Anticipated Endowment</option>
                  <option value="SADA_BAHAR">Sada-Bahar (Table 74)</option>
                  <option value="PLATINUM_PLUS">Platinum Plus</option>
                  <option value="SUPER_SUNEHRI_SHEHNAI">Super (72), Sunehri (73) & Shehnai (77)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Term / Duration Category</label>
                <select 
                  value={inputs.termRange} 
                  onChange={(e) => setInputs({...inputs, termRange: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                >
                  <option value="DEFAULT">Default / Whole Life</option>
                  <option value="20_PLUS">20 Years and Over</option>
                  <option value="15_19">15 to 19 Years</option>
                  <option value="14_LESS">14 Years and Less</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Sum Assured (Rs.)</label>
                  <input 
                    type="number" 
                    value={inputs.sumAssured} 
                    onChange={(e) => setInputs({...inputs, sumAssured: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Commencement Year</label>
                  <input 
                    type="number" 
                    value={inputs.commencementYear} 
                    onChange={(e) => setInputs({...inputs, commencementYear: parseInt(e.target.value) || 2024})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total Policy Years</label>
                  <input 
                    type="number" 
                    value={inputs.policyYears} 
                    onChange={(e) => setInputs({...inputs, policyYears: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Years as of 2024</label>
                  <input 
                    type="number" 
                    value={inputs.policyYearsAsOf2024} 
                    onChange={(e) => setInputs({...inputs, policyYearsAsOf2024: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Premiums Paid (Years)</label>
                <input 
                  type="number" 
                  value={inputs.premiumsPaidYears} 
                  onChange={(e) => setInputs({...inputs, premiumsPaidYears: parseInt(e.target.value) || 0})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">FIB Years (if applies)</label>
                  <input 
                    type="number" 
                    value={inputs.fibYears} 
                    onChange={(e) => setInputs({...inputs, fibYears: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Survival Benefit Amt</label>
                  <input 
                    type="number" 
                    value={inputs.sbAmount} 
                    onChange={(e) => setInputs({...inputs, sbAmount: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-2xl border border-blue-100 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={inputs.isBigDeal} 
                    onChange={(e) => setInputs({...inputs, isBigDeal: e.target.checked})}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-5 bg-blue-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                  <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:left-6"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider">Big Deal Policy (G. Endow/Shadabad etc)</span>
                </div>
              </label>
            </div>
          </div>

          <button
            onClick={handleCalculate}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-500/30"
          >
            Calculate Bonuses
          </button>
        </motion.div>

        {/* Results */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-8 rounded-3xl border-2 transition-all ${results ? 'bg-blue-600 border-blue-600 shadow-2xl shadow-blue-500/40 text-white' : 'bg-white border-dashed border-slate-200 text-slate-300'}`}
          >
            {results ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Calculated Results</h3>
                  <Calculator size={20} className="opacity-80" />
                </div>
                
                <div className="space-y-3">
                  <ResultRow label="Reversionary Bonus" value={results.reversionary} />
                  <ResultRow label="Terminal Bonus" value={results.terminal} />
                  <ResultRow label="Loyalty Bonus" value={results.loyalty} />
                  <ResultRow label="Khushali Bonus" value={results.khushali} />
                  <ResultRow label="Spec. Terminal (FIB)" value={results.specialTerminalFIB} />
                  <ResultRow label="Spec. Rev (SB/Family)" value={results.specialRevSB} />
                  
                  <div className="flex justify-between items-center pt-6 mt-2 border-t border-white/20">
                    <span className="text-sm font-black uppercase tracking-[0.2em]">Net Total Bonus</span>
                    <span className="text-4xl font-black font-mono">Rs. {results.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                <Calculator size={48} className="opacity-20 translate-y-4" />
                <p className="text-sm font-bold uppercase tracking-widest">Awaiting calculation...</p>
              </div>
            )}
          </motion.div>

          {/* Quick Info */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 text-blue-600">
              <Info size={14} />
              Policy Guidance (Circular Highlights)
            </h3>
            <ul className="space-y-3">
              {[
                { title: 'Khushali Bonus', desc: 'One-time bonus on Sum Assured in force as at 31st Dec 2024.' },
                { title: 'Big Deal Policies', desc: 'Jeevan Sathi, Shadabad & Golden Endowment receive bonuses on 25% of Sum Assured only.' },
                { title: 'FIB Terminal', desc: 'Rs. 10 per thousand basic SA for each year in excess of 10 years FIB in force.' },
                { title: 'Survival Benefits', desc: 'Special Reversionary Bonus if survival benefit is left with SLIC.' }
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{item.title}</span>
                    <span className="text-[10px] text-slate-500 font-medium leading-relaxed">{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResultRow: React.FC<{ label: string, value: number }> = ({ label, value }) => (
  <div className="flex justify-between items-baseline border-b border-white/10 pb-2">
    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</span>
    <span className="text-lg font-black font-mono">Rs. {value.toLocaleString()}</span>
  </div>
);

export default BonusHelper;
