import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { DeathClaim, ClaimStage } from '../types';
import { Plus, Search, Filter, Eye, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ClaimList: React.FC = () => {
  const [claims, setClaims] = useState<DeathClaim[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<ClaimStage | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const exportPaidClaimsCSV = () => {
    const paidClaims = claims.filter(c => {
      if (c.currentStage !== 'PAID') return false;
      
      const claimDate = new Date(c.createdAt);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && claimDate < start) return false;
      if (end) {
        const endOfDate = new Date(end);
        endOfDate.setHours(23, 59, 59, 999);
        if (claimDate > endOfDate) return false;
      }
      return true;
    });

    if (paidClaims.length === 0) {
      alert('No paid claims found in the selected date range.');
      return;
    }

    const headers = [
      'S-No', 'POLICY NO', 'NAME-OF-CLAIMANT', 'P-V-No', 'J-V-No', 'J-V-DATE', 
      'CLAIM-No', 'CHQ-No', 'CHQ-DATE', 'CHQ-AMOUNT', 'SUM-ASSURED', 'ADD-S-A', 
      'BONUSES', 'RP', 'M-NM', 'FIB', 'AIB', 'SB', 'SP-B', 'REF-OF-SUS', 
      'E-NE', 'CAUSE-OF-DEATH', 'REMARKS'
    ];

    const rows = paidClaims.map((c, index) => [
      index + 1,
      c.policyNo,
      c.beneficiaryName || c.nameOfAssured,
      c.pvNo || '',
      c.jvNo || '',
      c.jvDate || '',
      c.claimNo,
      c.checkNo || '',
      c.checkDate || '',
      c.netAmount || 0,
      c.sumAssured || 0,
      c.addSA || 0,
      c.bonuses || 0,
      c.rpAmount || 0,
      c.mNmStatus || (c.gender === 'NM' ? 'NM' : 'M'),
      c.fibAmount || 0,
      c.aibAdb || 0,
      c.sb || 0,
      c.spBonus || 0,
      c.suspPreRefund || 0,
      c.earlyCase ? 'EY' : 'NE',
      c.causeOfDeath || '',
      c.remarks || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Paid_Claims_Report_${startDate || 'Start'}_to_${endDate || 'End'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadMonthlyReport = () => {
    // Generate CSV content
    const headers = [
      'S-No', 'POLICY NO', 'NAME-OF-CLAIMANT', 'P-V-No', 'J-V-No', 'J-V-DATE', 
      'CLAIM-No', 'CHQ-No', 'CHQ-DATE', 'CHQ-AMOUNT', 'SUM-ASSURED', 'ADD-S-A', 
      'BONUSES', 'RP', 'M-NM', 'FIB', 'AIB', 'SB', 'SP-B', 'REF-OF-SUS', 
      'E-NE', 'CAUSE-OF-DEATH', 'REMARKS'
    ];

    const rows = filteredClaims.map((c, index) => [
      index + 1,
      c.policyNo,
      c.beneficiaryName || c.nameOfAssured,
      c.pvNo || '',
      c.jvNo || '',
      c.jvDate || '',
      c.claimNo,
      c.checkNo || '',
      c.checkDate || '',
      c.netAmount || 0,
      c.sumAssured || 0,
      c.addSA || 0,
      c.bonuses || 0,
      c.rpAmount || 0,
      c.mNmStatus || (c.gender === 'NM' ? 'NM' : 'M'),
      c.fibAmount || 0,
      c.aibAdb || 0,
      c.sb || 0,
      c.spBonus || 0,
      c.suspPreRefund || 0,
      c.earlyCase ? 'EY' : 'NE',
      c.causeOfDeath || '',
      c.remarks || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Monthly_Report_${new Date().toLocaleString('default', { month: 'long' })}_${new Date().getFullYear()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const filteredClaims = claims.filter(c => {
    const matchSearch = c.policyNo.includes(searchTerm) || c.nameOfAssured.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStage = stageFilter === 'ALL' || c.currentStage === stageFilter;
    
    const claimDate = new Date(c.createdAt);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    let matchDate = true;
    if (start && claimDate < start) matchDate = false;
    if (end) {
      const endOfDate = new Date(end);
      endOfDate.setHours(23, 59, 59, 999);
      if (claimDate > endOfDate) matchDate = false;
    }

    return matchSearch && matchStage && matchDate;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Claims Pipeline</h2>
          <p className="text-slate-500 text-sm">Manage and track death claims across all processing centers</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportPaidClaimsCSV}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-500/20 active:scale-95"
          >
            <Download size={18} />
            Export Paid Cases
          </button>
          <button
            onClick={downloadMonthlyReport}
            className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all border border-slate-200 active:scale-95"
          >
            <Download size={18} />
            Export Monthly Report
          </button>
          <Link 
            to="/claims/new"
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus size={18} />
            Record New Intimation
          </Link>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search Policy Number or Assured Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all shadow-sm"
          />
        </div>
        <div className="flex flex-row gap-2 flex-wrap md:flex-nowrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs transition-all shadow-sm"
            />
          </div>
        </div>
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as any)}
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm appearance-none cursor-pointer transition-all shadow-sm"
          >
            <option value="ALL">All Stages</option>
            {['INTIMATION', 'REQUIREMENT_APPLIED', 'DOCUMENTS_AWAITED', 'CALCULATION', 'JV_APPROVAL', 'DOCUMENTS_COLLECTION', 'ZCC_PROCESSING', 'INVESTIGATION', 'AUDIT_PRE_ZCC', 'RCC_PROCESSING', 'PV_PREPARATION', 'AUDIT_PV', 'ACCOUNTS_FINAL', 'PAID', 'RECORD_ROOM'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Policy / Name</th>
                <th className="px-6 py-4">Intimation</th>
                <th className="px-6 py-4 text-center">Status / Stage</th>
                <th className="px-6 py-4">Claim Amount</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>
                  </td>
                </tr>
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">No records match your criteria</td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-700 tracking-tight">{claim.policyNo}</div>
                      <div className="text-[10px] text-slate-400 group-hover:text-slate-500 uppercase font-semibold tracking-tighter truncate max-w-[180px]">{claim.nameOfAssured}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(claim.dateOfIntimation).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full border border-slate-200 inline-block uppercase tracking-wider">
                          {claim.currentStage.replace('_', ' ')}
                        </span>
                        {claim.isRequirementStatus && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[8px] font-black rounded uppercase border border-rose-100/50 animate-pulse">
                            Requirement
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-medium text-slate-700">
                      {claim.totalAmount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/claims/${claim.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        <Eye size={14} />
                        Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
