import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { FibPayment } from '../types';
import { Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

interface FibPaymentTableProps {
  claimId: string;
}

export const FibPaymentTable: React.FC<FibPaymentTableProps> = ({ claimId }) => {
  const [payments, setPayments] = useState<FibPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      const path = 'fibPayments';
      try {
        const q = query(
          collection(db, path),
          where('claimId', '==', claimId),
          orderBy('dueDate', 'asc')
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

    if (claimId) {
      fetchPayments();
    }
  }, [claimId]);

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

  if (loading) return <div className="p-4 text-center text-xs text-slate-400">Loading payment schedule...</div>;
  if (payments.length === 0) return <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">No FIB payments scheduled yet. (Stage must be PAID to generate)</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Year</th>
            <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</th>
            <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
            <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
            <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="py-3 px-4 text-xs font-bold text-slate-600">Year {p.paymentYear}</td>
              <td className="py-3 px-4 text-xs font-mono text-slate-500">{new Date(p.dueDate).toLocaleDateString('en-GB')}</td>
              <td className="py-3 px-4 text-xs font-black text-slate-900 font-mono">Rs. {p.amount.toLocaleString()}</td>
              <td className="py-3 px-4">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                  p.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 
                  p.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {p.status === 'PAID' ? <CheckCircle size={10} /> : p.status === 'PENDING' ? <Clock size={10} /> : <Calendar size={10} />}
                  {p.status}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                {p.status !== 'PAID' && (
                  <button 
                    onClick={() => markAsPaid(p.id)}
                    className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                  >
                    Mark Paid
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
