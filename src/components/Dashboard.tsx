import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { DeathClaim, ClaimStage } from '../types';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Clock, FileWarning, Search, Send, User } from 'lucide-react';

const STAGE_CONFIG: Record<ClaimStage, { label: string; color: string; icon: any; textColor: string }> = {
  INTIMATION: { label: 'Intimation', color: 'bg-blue-50', textColor: 'text-blue-700', icon: Search },
  REQUIREMENT_APPLIED: { label: 'Req Applied', color: 'bg-amber-50', textColor: 'text-amber-700', icon: Clock },
  DOCUMENTS_AWAITED: { label: 'Docs Awaited', color: 'bg-rose-50', textColor: 'text-rose-700', icon: FileWarning },
  CALCULATION: { label: 'Calculation', color: 'bg-indigo-50', textColor: 'text-indigo-700', icon: Clock },
  JV_APPROVAL: { label: 'JV Approval', color: 'bg-amber-50', textColor: 'text-amber-700', icon: AlertCircle },
  DOCUMENTS_COLLECTION: { label: 'Docs Pending', color: 'bg-orange-50', textColor: 'text-orange-700', icon: FileWarning },
  ZCC_PROCESSING: { label: 'ZCC Processing', color: 'bg-purple-50', textColor: 'text-purple-700', icon: Send },
  INVESTIGATION: { label: 'Investigation', color: 'bg-rose-50', textColor: 'text-rose-700', icon: User },
  AUDIT_PRE_ZCC: { label: 'Audit (ZCC)', color: 'bg-cyan-50', textColor: 'text-cyan-700', icon: Search },
  RCC_PROCESSING: { label: 'RCC Processing', color: 'bg-violet-50', textColor: 'text-violet-700', icon: Send },
  PV_PREPARATION: { label: 'PV Prep', color: 'bg-amber-50', textColor: 'text-amber-700', icon: Clock },
  AUDIT_PV: { label: 'Audit (PV)', color: 'bg-teal-50', textColor: 'text-teal-700', icon: Search },
  ACCOUNTS_FINAL: { label: 'Accounts Final', color: 'bg-emerald-50', textColor: 'text-emerald-700', icon: AlertCircle },
  PAID: { label: 'Paid', color: 'bg-green-50', textColor: 'text-green-700', icon: CheckCircle2 },
  RECORD_ROOM: { label: 'Record Room', color: 'bg-slate-50', textColor: 'text-slate-700', icon: CheckCircle2 },
};

export const Dashboard: React.FC = () => {
  const [claims, setClaims] = useState<DeathClaim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'claims'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeathClaim));
      setClaims(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'claims');
    });

    return () => unsubscribe();
  }, []);

  const stats = Object.entries(STAGE_CONFIG).map(([stage, config]) => {
    const count = claims.filter(c => c.currentStage === stage).length;
    return { stage: stage as ClaimStage, count, ...config };
  });

  const totalAmount = claims.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Executive Dashboard</h2>
          <p className="text-slate-500 text-sm">Death claim pipeline monitoring and processing metrics</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Liability</div>
            <div className="text-lg font-bold text-slate-700 font-mono">Rs. {totalAmount.toLocaleString()}</div>
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Claims</div>
            <div className="text-lg font-bold text-slate-700">{claims.length}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-4 rounded-xl border transition-all group relative overflow-hidden ${stat.count > 0 ? 'bg-white border-slate-200 shadow-sm hover:shadow-md' : 'bg-slate-50/50 border-slate-100 opacity-60'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${stat.count > 0 ? `${stat.color} ${stat.textColor}` : 'bg-slate-100 text-slate-400'} group-hover:scale-110 transition-transform`}>
                <stat.icon size={16} />
              </div>
              <span className={`text-xl font-bold font-mono tracking-tighter ${stat.count > 0 ? 'text-slate-800' : 'text-slate-400'}`}>{stat.count}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate" title={stat.label}>{stat.label}</p>
              {stat.count > 0 && (
                <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full ${stat.textColor.replace('text', 'bg')} transition-all duration-1000`} 
                    style={{ width: `${(stat.count / (claims.length || 1)) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
              <Clock size={16} className="text-blue-500" />
              Recent Pipeline Activity
            </h3>
            <button className="text-[10px] font-bold text-blue-600 uppercase tracking-wider hover:underline">View All</button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-3">Policy / Holder</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Stage</th>
                  <th className="px-6 py-3 text-right">Last Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic text-sm">No activity recorded</td>
                  </tr>
                ) : (
                  claims
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .slice(0, 6)
                    .map(claim => (
                      <tr key={claim.id} className="hover:bg-slate-50 group cursor-pointer">
                        <td className="px-6 py-3">
                          <div className="font-bold text-slate-700 text-xs">{claim.policyNo}</div>
                          <div className="text-[10px] text-slate-400 group-hover:text-slate-600 truncate max-w-[150px]">{claim.nameOfAssured}</div>
                        </td>
                        <td className="px-6 py-3 font-mono text-xs text-slate-600">
                          {claim.totalAmount?.toLocaleString()}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STAGE_CONFIG[claim.currentStage].color} ${STAGE_CONFIG[claim.currentStage].textColor} border-current`}>
                            {STAGE_CONFIG[claim.currentStage].label}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-[10px] text-slate-400 font-medium">
                          {new Date(claim.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xl shadow-slate-200">
          <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-400" />
            Audit & Compliance
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-[11px] mb-2 font-bold uppercase tracking-wider text-slate-400">
                <span>Critical Investigations</span>
                <span className="text-rose-400">{claims.filter(c => c.currentStage === 'INVESTIGATION').length} Cases</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 w-1/4"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-2 font-bold uppercase tracking-wider text-slate-400">
                <span>Payment Backlog</span>
                <span className="text-emerald-400">{claims.filter(c => c.currentStage === 'PAID').length} / {claims.length}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${(claims.filter(c => c.currentStage === 'PAID').length / (claims.length || 1)) * 100}%` }}></div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                Note: Ensure all ZCC/RCC meeting minutes are uploaded for claims exceeding Rs. 500,000 threshold.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
