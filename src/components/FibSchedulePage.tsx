import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, updateDoc, doc, limit, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { FibPayment, DeathClaim } from '../types';
import { setupFibPayments } from '../lib/fibScheduler';
import { Clock, CheckCircle, Search, TrendingUp, Filter } from 'lucide-react';
import { motion } from 'motion/react';

const FibSchedulePage: React.FC = () => {
  const [payments, setPayments] = useState<FibPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SCHEDULED' | 'PAID'>('ALL');

  useEffect(() => {
    const fetchAllPayments = async () => {
      const path = 'fibPayments';
      try {
        const q = query(
          collection(db, path),
          orderBy('dueDate', 'asc'),
          limit(100) // Performance guard
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FibPayment));
        setPayments(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPayments();
  }, []);

  const markAsPaid = async (paymentId: string) => {
    const path = `fibPayments/${paymentId}`;
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'fibPayments', paymentId), {
        status: 'PAID',
        paidDate: now.split('T')[0],
        updatedAt: now
      });
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'PAID', paidDate: now.split('T')[0] } : p));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.policyNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const syncPolicyFib = async (policyNo: string) => {
    try {
      setLoading(true);
      // Find the claim first
      const q = query(collection(db, 'claims'), where('policyNo', '==', policyNo), limit(1));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        alert(`Policy "${policyNo}" not found in death claims database.`);
        return;
      }

      const claim = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as DeathClaim;
      
      if (claim.currentStage !== 'PAID') {
        alert("FIB Payment Schedule can only be initialized for claims that have reached the 'PAID' stage.");
        return;
      }

      if (!claim.hasFIB) {
        alert("This policy record exists but is not marked with 'Family Income Benefit (FIB)'. Please enable FIB in the claim form first.");
        return;
      }

      // Check for required calculation fields
      if (!claim.dateOfDeath || !claim.riskDate || !claim.yearOfMaturity) {
        alert("Missing critical data (Date of Death, Risk Date, or Maturity Year) in the claim record. Cannot calculate schedule.");
        return;
      }

      await setupFibPayments(claim);
      alert("FIB Schedule synced/initialized successfully.");
      window.location.reload();
    } catch (error) {
      console.error("Sync error:", error);
      alert("Failed to sync FIB: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <TrendingUp className="text-blue-600" size={32} />
            7. FIB Payment Schedule
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Global Family Income Benefit Tracking</p>
        </div>
        <button 
            onClick={() => {
                const policyNo = window.prompt("Enter Policy Number to sync/initialize FIB schedule:");
                if (policyNo) {
                    syncPolicyFib(policyNo);
                }
            }}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
        >
            <TrendingUp size={16} />
            Initialize/Sync Policy
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-2">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search Policy Number..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter size={14} className="text-slate-400" />
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/20"
                >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="PAID">Paid</option>
                </select>
            </div>
        </div>

        {loading ? (
            <div className="py-20 text-center space-y-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading Payments...</p>
            </div>
        ) : filteredPayments.length === 0 ? (
            <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Clock className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-slate-400 text-sm font-medium">No FIB payments found matching criteria.</p>
            </div>
        ) : (
            <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50">
                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Policy No</th>
                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Year</th>
                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredPayments.map((p) => (
                            <motion.tr 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                key={p.id} 
                                className="hover:bg-slate-50/50 transition-colors"
                            >
                                <td className="py-4 px-4">
                                    <div className="text-xs font-black text-slate-800">{p.policyNo}</div>
                                    <div className="text-[9px] text-slate-400 font-medium">ID: {p.claimId.slice(0, 8)}...</div>
                                </td>
                                <td className="py-4 px-4 text-xs font-bold text-slate-600">Year {p.paymentYear}</td>
                                <td className="py-4 px-4 text-xs font-mono text-slate-500">{new Date(p.dueDate).toLocaleDateString('en-GB')}</td>
                                <td className="py-4 px-4 text-xs font-black text-slate-900 font-mono">Rs. {p.amount.toLocaleString()}</td>
                                <td className="py-4 px-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                        p.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 
                                        p.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {p.status === 'PAID' ? <CheckCircle size={10} /> : p.status === 'PENDING' ? <Clock size={10} /> : <TrendingUp size={10} />}
                                        {p.status}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    {p.status !== 'PAID' && (
                                        <button 
                                            onClick={() => markAsPaid(p.id)}
                                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                        >
                                            Mark Paid
                                        </button>
                                    )}
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
};

export default FibSchedulePage;
