import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserRole, UserRoleType } from '../types';
import { UserPlus, Shield, Mail, Trash2, ShieldCheck, AlertCircle, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

export const UserAccess: React.FC = () => {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newUid, setNewUid] = useState('');
  const [newRole, setNewRole] = useState<UserRoleType>('CLERK');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const roles: UserRoleType[] = ['ADMIN', 'INCHARGE', 'ACCOUNTANT', 'FO', 'AUDIT', 'ACCOUNTS', 'CLERK'];

  useEffect(() => {
    const q = query(collection(db, 'userRoles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as UserRole);
      setUsers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'userRoles');
    });

    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUid || !newEmail) return;

    try {
      await setDoc(doc(db, 'userRoles', newUid), {
        uid: newUid,
        email: newEmail,
        role: newRole
      });
      setMessage({ type: 'success', text: `Access granted to ${newEmail}` });
      setNewUid('');
      setNewEmail('');
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'userRoles');
      setMessage({ type: 'error', text: 'Failed to authorize user' });
    }
  };

  const handleUpdateRole = async (uid: string, role: UserRoleType) => {
    try {
      await setDoc(doc(db, 'userRoles', uid), { role }, { merge: true });
      setMessage({ type: 'success', text: 'Role updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'userRoles');
    }
  };

  const handleRevoke = async (uid: string) => {
    if (!window.confirm('Are you sure you want to revoke access? This user will no longer be able to access the system.')) return;
    try {
      await deleteDoc(doc(db, 'userRoles', uid));
      setMessage({ type: 'success', text: 'Identity revoked' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'userRoles');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Shield className="text-blue-600" size={32} />
            AUTHORIZATION CENTER
          </h1>
          <p className="text-slate-500 font-medium mt-1">Configure multi-tier personnel permissions & security roles</p>
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Active</span>
        </div>
      </header>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'} flex items-center gap-3 text-sm font-bold shadow-sm`}
        >
          {message.type === 'success' ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add User Section */}
        <div className="space-y-6">
          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <UserPlus size={20} className="text-blue-600" />
              <h2 className="font-bold text-slate-800 uppercase tracking-widest text-xs">Provision Identity</h2>
            </div>
            
            <form onSubmit={handleAddUser} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Firebase UID</label>
                <input 
                  type="text" 
                  value={newUid} 
                  onChange={(e) => setNewUid(e.target.value)}
                  placeholder="Paste manual UID"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Personnel Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="email" 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="official@claimflow.pro"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Assigned Realm</label>
                <select 
                  value={newRole} 
                  onChange={(e) => setNewRole(e.target.value as UserRoleType)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold text-slate-700 appearance-none cursor-pointer"
                >
                  {roles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]"
              >
                Establish Access
              </button>
            </form>
          </section>

          <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100/50">
            <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-[0.15em] mb-2">Note to Administrator</h4>
            <p className="text-xs text-blue-700 leading-relaxed font-medium">
              Users must authenticate via Google first. You must then map their exact Firebase UID and Email here to grant specific functional permissions.
            </p>
          </div>
        </div>

        {/* User List Section */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 relative overflow-hidden">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between px-8">
              <div className="flex items-center gap-3">
                <UserIcon size={20} className="text-slate-600" />
                <h2 className="font-bold text-slate-800 uppercase tracking-widest text-xs">Access Registry</h2>
              </div>
              <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                {users.length} AUTHORIZED
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                    <th className="px-8 py-5">Personnel Data</th>
                    <th className="px-8 py-5 text-center">Authorization Level</th>
                    <th className="px-8 py-5 text-right pr-12">Security</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 tracking-tight">{user.email}</p>
                            <p className="text-[9px] text-slate-400 font-mono tracking-tighter uppercase">{user.uid}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          <select 
                            value={user.role} 
                            onChange={(e) => handleUpdateRole(user.uid, e.target.value as UserRoleType)}
                            className="bg-transparent border-none text-[10px] font-black px-4 py-2 text-slate-700 outline-none cursor-pointer hover:bg-slate-50 transition-colors appearance-none"
                          >
                            {roles.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <div className="px-2 border-l border-slate-100 pointer-events-none">
                            <div className={`w-1.5 h-1.5 rounded-full ${user.role === 'ADMIN' ? 'bg-pink-500' : 'bg-blue-500'}`}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right pr-12">
                        <button 
                          onClick={() => handleRevoke(user.uid)}
                          className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 ml-auto"
                        >
                          <Trash2 size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Revoke</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && !loading && (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center">
                        <div className="max-w-xs mx-auto space-y-3">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                            <Shield size={24} />
                          </div>
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Registry Empty</p>
                          <p className="text-xs text-slate-400">Provision your first system administrator to begin managing the facility.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

