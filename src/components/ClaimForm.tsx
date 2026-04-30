import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { DeathClaim, ClaimStage } from '../types';
import { setupFibPayments } from '../lib/fibScheduler';
import { ArrowLeft, Save, Loader2, CheckCircle, XCircle, Settings, Trash2, CreditCard, Printer, FileText } from 'lucide-react';
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

const STAGES: ClaimStage[] = [
  'INTIMATION', 'REQUIREMENT_APPLIED', 'DOCUMENTS_AWAITED', 'CALCULATION', 
  'JV_APPROVAL', 'DOCUMENTS_COLLECTION', 'ZCC_PROCESSING', 'INVESTIGATION', 
  'AUDIT_PRE_ZCC', 'RCC_PROCESSING', 'PV_PREPARATION', 'AUDIT_PV', 
  'ACCOUNTS_FINAL', 'PAID', 'RECORD_ROOM'
];

export const ClaimForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    console.log("Current User:", user?.email);
    console.log("Current Role:", role?.role);
  }, [user, role]);
  const isNew = id === 'new';

  const printBankLetter = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Bank Credit Letter - ${formData.policyNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #000; line-height: 1.5; }
            .header { display: flex; align-items: start; margin-bottom: 20px; }
            .logo-img { width: 100px; height: auto; margin-right: 20px; }
            .header-text { flex: 1; border-left: 2px solid #000; padding-left: 15px; }
            .header-text h1 { margin: 0; font-size: 32px; font-weight: 700; color: #000; font-family: 'Times New Roman', serif; }
            .header-text h2 { margin: 0; font-size: 16px; font-weight: normal; color: #000; }
            .header-text .zone { font-weight: bold; font-size: 20px; margin-top: 2px; }
            .address-block { margin-top: 5px; font-size: 11px; font-weight: bold; line-height: 1.3; }
            .date-row { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .recipient { margin-bottom: 30px; }
            .subject { font-weight: bold; text-decoration: underline; margin-bottom: 30px; }
            .body-text { margin-bottom: 40px; text-align: justify; }
            .closing { margin-top: 60px; }
            .signature { margin-top: 40px; font-weight: bold; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/logo.png" class="logo-img" onerror="this.style.display='none'">
            <div class="header-text">
              <h1>State Life</h1>
              <h2>Insurance Corporation of Pakistan</h2>
              <div class="zone">Karachi Central Zone</div>
              <div class="address-block">
                Zonal Office,<br>
                State Life Building No.11,<br>
                6th & 7th Floor,<br>
                Abdullah Haroon Road, Saddar,<br>
                Karachi.
              </div>
            </div>
          </div>

          <div class="date-row">
            <div class="recipient">
              The Manager,<br>
              ${formData.bankName || '[Bank Name]'}<br>
              ${formData.branch || '[Branch Name]'}<br>
              Karachi.
            </div>
            <div>${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>

          <div class="subject">
            Subject: Policy No.${formData.policyNo}, ${formData.nameOfAssured}.
          </div>

          <div class="body-text">
            Dear Sir,<br><br>
            We are enclosing herewith a <b>cheque for settlement of death claim</b> No.<b>${formData.checkNo || '_______'}</b> dated <b>${formData.checkDate ? new Date(formData.checkDate).toLocaleDateString('en-GB') : '_______'}</b> for 
            <b>Rs.${formData.netAmount?.toLocaleString()}/=</b>. 
            <br><br>
            Please Credit the amount in the account of <b>${formData.beneficiaryName || '[Beneficiary Name]'}</b> 
            bearing No.<b>${formData.beneficiaryAccountNo || '____________________________'}</b> and intimate to the beneficiary.
            <br><br>
            Kindly acknowledge receipt and oblige.
          </div>

          <div class="closing">
            Yours faithfully,<br><br><br>
            <div class="signature">(Manager-PHS)</div>
          </div>

          <div class="no-print" style="margin-top: 50px;">
            <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Print Now</button>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const printRequirementLetter = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const missingDocs: string[] = [];
    const checklist = formData.documentsChecklist as any;
    if (checklist) {
      if (!checklist.deceasedCnic) missingDocs.push("Deceased CNIC");
      if (!checklist.deathCertificate) missingDocs.push("Death Certificate (Original/Attested)");
      if (!checklist.cnicCancellation) missingDocs.push("NADRA CNIC Cancellation Certificate");
      if (!checklist.cnicBeneficiary) missingDocs.push("Beneficiary CNIC (Valid Copy)");
      if (checklist.beneficiaryCnicExpired) missingDocs.push("Updated/Valid Beneficiary CNIC (The provided one is expired)");
      if (!checklist.attestedFormA) missingDocs.push("Claim Form A (Attested)");
      if (!checklist.formAVerifiedBank) missingDocs.push("Bank Verification on Claim Form A");
      if (!checklist.attestedFormB) missingDocs.push("Claim Form B (Attested)");
      if (!checklist.formBVerifiedHospital) missingDocs.push("Hospital Verification on Claim Form B");
      if (!checklist.attestedFormC) missingDocs.push("Claim Form C (Attested)");
      if (!checklist.attestedFormD) missingDocs.push("Claim Form D (Attested)");
      if (!checklist.frc) missingDocs.push("Family Registration Certificate (FRC)");
      if (!checklist.docsAttested17Scale) missingDocs.push("All documents must be attested by a Grade-17 or above officer");
    }

    checklist && checklist.beneficiaryCnicExpired ? missingDocs.push("Updated/Valid Beneficiary CNIC (The provided one is expired)") : null;
    
    const html = `
      <html>
        <head>
          <title>Requirement Letter - ${formData.policyNo}</title>
          <style>
             @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #000; line-height: 1.5; }
            .header { display: flex; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }
            .logo-img { width: 120px; height: auto; margin-right: 20px; }
            .header-text { flex: 1; }
            .header-text h1 { margin: 0; font-size: 36px; font-weight: bold; font-family: 'Times New Roman', serif; }
            .header-text div { font-size: 14px; font-weight: bold; text-transform: uppercase; }
            .subject { font-weight: bold; text-decoration: underline; margin: 30px 0; }
            .requirement-list { margin: 20px 0; }
            .requirement-item { margin-bottom: 10px; display: flex; gap: 10px; }
            .signature { margin-top: 60px; font-weight: bold; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/logo.png" class="logo-img" onerror="this.style.display='none'">
            <div class="header-text">
              <h1>State Life</h1>
              <div>Insurance Corporation of Pakistan</div>
              <div style="font-size: 20px;">Karachi Central Zone</div>
            </div>
          </div>
          
          <div style="text-align: right;">Date: ${new Date().toLocaleDateString()}</div>
          
          <div class="recipient">
            To,<br>
            The Beneficiary / Claimant,<br>
            <b>${formData.beneficiaryName || formData.nameOfAssured}</b><br>
            ${formData.beneficiaryAddress || '[Address Not Provided]'}<br><br>
            Policy No: ${formData.policyNo}<br>
            Assured: ${formData.nameOfAssured}
          </div>

          <div class="subject">Subject: SETTLEMENT OF DEATH CLAIM - OUTSTANDING REQUIREMENTS</div>

          <p>Dear Sir/Madam,</p>
          <p>With reference to the death claim intimation for the above policy, we request you to please provide the following missing/outstanding documents to proceed further with the settlement:</p>
          
          <div class="requirement-list">
            ${missingDocs.length > 0 
              ? missingDocs.map(doc => `<div class="requirement-item"><span>☐</span> <span>${doc}</span></div>`).join('')
              : '<p><b>All mandatory documents received. Please check additional notes if any.</b></p>'
            }
          </div>

          ${formData.missingRequirementsNotes ? `
            <div style="margin-top: 20px; padding: 15px; border: 1px dashed #ccc;">
              <b>Additional Notes:</b><br>
              ${formData.missingRequirementsNotes.replace(/\n/g, '<br>')}
            </div>
          ` : ''}

          <p style="margin-top: 30px;">Please submit these requirements at your earliest convenience to avoid further delay in processing.</p>

          <div class="signature">
             Yours faithfully,<br><br><br>
            (Manager-PHS)
          </div>

          <div class="no-print" style="margin-top: 50px;">
            <button onclick="window.print()" style="padding: 10px 20px;">Print Letter</button>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const deleteClaim = async () => {
    if (!window.confirm('Are you certain you want to permanently delete this record?')) return;
    try {
      setSaving(true);
      await deleteDoc(doc(db, 'claims', id!));
      navigate('/claims');
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete record. You might not have sufficient permissions.");
      handleFirestoreError(error, OperationType.DELETE, 'claims');
    } finally {
      setSaving(false);
    }
  };

  const [formData, setFormData] = useState<Partial<DeathClaim>>({
    policyNo: '',
    claimNo: '',
    nameOfAssured: '',
    dateOfDeath: '',
    dateOfIntimation: new Date().toISOString().split('T')[0],
    dueDateLastPayment: '',
    riskDate: '',
    earlyCase: false,
    nd: false,
    isRevived: false,
    revivalDate: '',
    hasFIB: false,
    fibTerm: 0,
    hasAIB_ADB: false,
    aib_adbTerm: 0,
    hasTIR: false,
    tirTerm: 0,
    otherRiders: '',
    mode: 'YLY',
    gender: 'M',
    age: 0,
    table: '',
    term: 0,
    yearOfMaturity: new Date().getFullYear(),
    policyStatus: '',
    option: '',
    sumAssuredPup: 0,
    sumAssured: 0,
    addSA: 0,
    bonuses: 0,
    intBonus: 0,
    millionBonus: 0,
    goldenJubileeBonus: 0,
    terminalBonus: 0,
    annBonus30th: 0,
    oneTimeBonus: 0,
    loyaltyBonus: 0,
    sb: 0,
    spBonus: 0,
    suspPreRefund: 0,
    aibAdb: 0,
    fibAnn: 0,
    khushaliBonus: 0,
    premium: 0,
    lateFee: 0,
    loanInt: 0,
    totalAmount: 0,
    instPremium: 0,
    extraPremium: 0,
    selectionStatus: 'STANDARD',
    medicalStatus: 'MEDICAL',
    remarks: '',
    jvNo: '',
    jvDate: '',
    pvNo: '',
    pvDate: '',
    checkNo: '',
    checkDate: '',
    checkDispatchDate: '',
    beneficiaryAddress: '',
    fibAmount: 0,
    fibPercentage: 0,
    fibPeriodYears: 0,
    rpAmount: 0,
    mNmStatus: '',
    documentsChecklist: {
      deceasedCnic: false,
      deathCertificate: false,
      cnicCancellation: false,
      cnicBeneficiary: false,
      attestedFormA: false,
      attestedFormB: false,
      attestedFormC: false,
      attestedFormD: false,
      formAVerifiedBank: false,
      formBVerifiedHospital: false,
      frc: false,
      firAdb: false,
      docsAttested17Scale: false,
      beneficiaryCnicExpired: false,
      waivedDocs: []
    },
    isRequirementStatus: false,
    missingRequirementsNotes: '',
    beneficiaryAccountNo: '',
    agencyChannel: { am: '', sm: '', so: '', sr: '' },
    currentStage: 'INTIMATION',
  });

  useEffect(() => {
    if (!isNew && id) {
      const fetchClaim = async () => {
        try {
          const docRef = doc(db, 'claims', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setFormData(docSnap.data() as DeathClaim);
          } else {
            console.error("No such claim!");
            navigate('/claims');
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `claims/${id}`);
        } finally {
          setLoading(false);
        }
      };
      fetchClaim();
    }
  }, [id, isNew, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let val: any = value;
    if (type === 'number') val = parseFloat(value) || 0;
    if (type === 'checkbox') val = (e.target as HTMLInputElement).checked;

    setFormData(prev => {
      let updated: any;
      if (name.startsWith('agency.')) {
        const agencyKey = name.split('.')[1];
        updated = {
          ...prev,
          agencyChannel: { ...prev.agencyChannel, [agencyKey]: val }
        };
      } else if (name.startsWith('docs.')) {
        const docKey = name.split('.')[1];
        updated = {
          ...prev,
          documentsChecklist: { ...prev.documentsChecklist, [docKey]: val }
        };
      } else if (name.startsWith('waive.')) {
        const docKey = name.split('.')[1];
        const currentWaived = prev.documentsChecklist?.waivedDocs || [];
        const isWaived = currentWaived.includes(docKey);
        const nextWaived = isWaived 
          ? currentWaived.filter(k => k !== docKey)
          : [...currentWaived, docKey];
        
        updated = {
          ...prev,
          documentsChecklist: { ...prev.documentsChecklist, waivedDocs: nextWaived }
        };
      } else {
        updated = { ...prev, [name]: val };
      }

      // Auto-calculate total amount based on all financial inputs
      const financialKeys = [
        'sumAssured', 'addSA', 'bonuses', 'intBonus', 'millionBonus', 
        'goldenJubileeBonus', 'terminalBonus', 'annBonus30th', 'oneTimeBonus', 
        'loyaltyBonus', 'sb', 'spBonus', 'suspPreRefund', 'aibAdb', 'fibAnn', 'khushaliBonus'
      ];
      const deductionKeys = ['premium', 'lateFee', 'loanInt'];
      
      if (financialKeys.includes(name) || deductionKeys.includes(name) || name === 'fibPercentage' || name === 'fibPeriodYears') {
        const total = financialKeys.reduce((acc, key) => acc + (updated[key] || 0), 0);
        const deductions = deductionKeys.reduce((acc, key) => acc + (updated[key] || 0), 0);
        updated.totalAmount = total;
        updated.netAmount = total - deductions;
        
        if (updated.sumAssured && updated.fibPercentage) {
          updated.fibAmount = (updated.sumAssured * (updated.fibPercentage / 100));
        }
      }
      
      return updated;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const timestamp = new Date().toISOString();
      
      // Check for duplicate policy number if new record
      if (isNew && formData.policyNo) {
        const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
        const q = query(collection(db, 'claims'), where('policyNo', '==', formData.policyNo), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          alert(`Duplicate Policy Found: A claim for policy ${formData.policyNo} already exists in the system.`);
          setSaving(false);
          return;
        }
      }

      const claimId = isNew ? Math.random().toString(36).substr(2, 9) : id!;
      const docRef = doc(db, 'claims', claimId);

      const data = {
        ...formData,
        updatedAt: timestamp,
      };

      if (isNew) {
        data.createdAt = timestamp;
        data.createdBy = user.uid;
        await setDoc(docRef, data);
      } else {
        await updateDoc(docRef, data);
      }

      if (data.currentStage === 'PAID') {
        const fullClaim = { ...data, id: claimId } as DeathClaim;
        await setupFibPayments(fullClaim);
      }

      navigate('/claims');
    } catch (error) {
      handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, 'claims');
    } finally {
      setSaving(false);
    }
  };

  const advanceStage = async () => {
    if (!id || isNew) return;
    const currentIndex = STAGES.indexOf(formData.currentStage as ClaimStage);
    if (currentIndex < STAGES.length - 1) {
      const nextStage = STAGES[currentIndex + 1];
      setSaving(true);
      try {
        await updateDoc(doc(db, 'claims', id), {
          currentStage: nextStage,
          updatedAt: new Date().toISOString()
        });

        if (nextStage === 'PAID') {
          const updatedClaim = { ...formData, id, currentStage: nextStage } as DeathClaim;
          await setupFibPayments(updatedClaim);
        }

        setFormData(prev => ({ ...prev, currentStage: nextStage }));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `claims/${id}`);
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/claims')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Pipeline
        </button>
          <div className="flex items-center gap-3">
            {!isNew && (
              <>
                <button
                  type="button"
                  onClick={printRequirementLetter}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95 border border-slate-200"
                >
                  <FileText size={14} /> Requirement Letter
                </button>
                <button
                  type="button"
                  onClick={printBankLetter}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-100 transition-all active:scale-95 border border-emerald-200"
                >
                  <Printer size={14} /> Bank Letter
                </button>
              </>
            )}
            {!isNew && (
              <button
                type="button"
              onClick={advanceStage}
              disabled={saving || formData.currentStage === 'PAID'}
              className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-100 transition-all disabled:opacity-50 active:scale-95 shadow-sm"
            >
              Advance to {STAGES[STAGES.indexOf(formData.currentStage as ClaimStage) + 1]?.replace('_', ' ') || 'Final'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isNew ? 'Generate Intimation' : 'Commit Changes'}
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={deleteClaim}
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete Record"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

      <form className="space-y-6">
        {/* Intimation & Agency Info */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              1. Intimation & Identity
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Excel Ref: COL 1-12</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Policy Number</label>
              <input type="text" name="policyNo" value={formData.policyNo || ''} onChange={handleChange} className="input-field w-full font-mono font-bold text-slate-700" placeholder="PK-XXXXX-XX" required />
            </div>
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Claim ID</label>
              <input type="text" name="claimNo" value={formData.claimNo || ''} onChange={handleChange} className="input-field w-full" placeholder="Internal ID" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name of Assured</label>
              <input type="text" name="nameOfAssured" value={formData.nameOfAssured || ''} onChange={handleChange} className="input-field w-full font-bold text-slate-800" placeholder="As per CNIC" required />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Death Date</label>
              <input type="date" name="dateOfDeath" value={formData.dateOfDeath || ''} onChange={handleChange} className="input-field w-full" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Intimation Date</label>
              <input type="date" name="dateOfIntimation" value={formData.dateOfIntimation || ''} onChange={handleChange} className="input-field w-full" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Due Date LP</label>
              <input type="date" name="dueDateLastPayment" value={formData.dueDateLastPayment || ''} onChange={handleChange} className="input-field w-full" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Risk Commencement</label>
              <input type="date" name="riskDate" value={formData.riskDate || ''} onChange={handleChange} className="input-field w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="earlyCase" checked={formData.earlyCase} onChange={handleChange} className="w-3 h-3 rounded text-blue-600" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Early Case (EY)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="nd" checked={formData.nd} onChange={handleChange} className="w-3 h-3 rounded text-blue-600" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">ND Case (Non-Disclosure)</span>
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isRevived" checked={formData.isRevived} onChange={handleChange} className="w-3 h-3 rounded text-blue-600" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Revived Policy?</span>
              </label>
              {formData.isRevived && (
                <input type="date" name="revivalDate" value={formData.revivalDate || ''} onChange={handleChange} className="input-field w-full text-[10px] py-1" placeholder="Revival Date" />
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cause of Death</label>
              <input type="text" name="causeOfDeath" value={formData.causeOfDeath || ''} onChange={handleChange} className="input-field w-full" placeholder="e.g., Natural/Accident" />
            </div>
          </div>

          <div className="border-t border-slate-50 pt-4 mt-6">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Agency Channel Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['am', 'sm', 'so', 'sr'].map((role) => (
                <div key={role}>
                   <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{role} Code</label>
                   <input 
                    type="text" 
                    name={`agency.${role}`} 
                    value={formData.agencyChannel?.[role as keyof typeof formData.agencyChannel] || ''} 
                    onChange={handleChange} 
                    className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs w-full outline-none focus:border-blue-500 font-mono" 
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Risk Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-4">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                2. Risk & Policy Data
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="input-field w-full text-xs">
                    <option value="M">Male (M)</option>
                    <option value="NM">Female (NM)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Age at Risk</label>
                  <input type="number" name="age" value={formData.age || 0} onChange={handleChange} className="input-field w-full font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Premium Mode</label>
                  <select name="mode" value={formData.mode} onChange={handleChange} className="input-field w-full text-xs">
                    <option value="YLY">Yearly</option>
                    <option value="HLY">Half-Yly</option>
                    <option value="QLY">Quarterly</option>
                    <option value="MLY">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Table</label>
                  <input type="text" name="table" value={formData.table || ''} onChange={handleChange} className="input-field w-full font-mono" placeholder="76, 19, etc" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Term</label>
                  <input type="number" name="term" value={formData.term || 0} onChange={handleChange} className="input-field w-full font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Maturity Year</label>
                  <input type="number" name="yearOfMaturity" value={formData.yearOfMaturity || 0} onChange={handleChange} className="input-field w-full font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Selection Status</label>
                  <select name="selectionStatus" value={formData.selectionStatus} onChange={handleChange} className="input-field w-full text-xs">
                    <option value="STANDARD">STANDARD</option>
                    <option value="SUBSTANDARD">SUBSTANDARD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Medical Status</label>
                  <select name="medicalStatus" value={formData.medicalStatus} onChange={handleChange} className="input-field w-full text-xs">
                    <option value="MEDICAL">MEDICAL</option>
                    <option value="NON-MEDICAL">NON-MEDICAL</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" name="claimPaperReceived" checked={formData.claimPaperReceived} onChange={handleChange} className="peer sr-only" />
                    <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                    <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:left-6"></div>
                  </div>
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Claim Papers Received</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Status as at 31.12.25</label>
                    <input type="text" name="policyStatus" value={formData.policyStatus || ''} onChange={handleChange} className="bg-transparent text-sm font-bold text-slate-700 outline-none w-full" placeholder="INFORCE/LAPSE" />
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Option</label>
                    <input type="text" name="option" value={formData.option || ''} onChange={handleChange} className="bg-transparent text-sm font-bold text-slate-700 outline-none w-full" placeholder="A/B/C" />
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Supplemental Riders
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="hasFIB" checked={formData.hasFIB} onChange={handleChange} className="w-4 h-4 rounded text-emerald-600" />
                      <span className="text-xs font-bold text-slate-600 uppercase">Family Income Benefit (FIB)</span>
                    </label>
                    {formData.hasFIB && (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">FIB Table</label>
                          <input type="text" name="fibTable" value={formData.fibTable || ''} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono" placeholder="Table" />
                        </div>
                        <div className="w-24">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">FIB Term</label>
                          <input type="number" name="fibTerm" value={formData.fibTerm || 0} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono" placeholder="Term" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="hasAIB_ADB" checked={formData.hasAIB_ADB} onChange={handleChange} className="w-4 h-4 rounded text-emerald-600" />
                      <span className="text-xs font-bold text-slate-600 uppercase">AIB / ADB</span>
                    </label>
                    {formData.hasAIB_ADB && (
                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Term</label>
                        <input type="number" name="aib_adbTerm" value={formData.aib_adbTerm || 0} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono" placeholder="Term" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="hasTIR" checked={formData.hasTIR} onChange={handleChange} className="w-4 h-4 rounded text-emerald-600" />
                      <span className="text-xs font-bold text-slate-600 uppercase">TIR</span>
                    </label>
                    {formData.hasTIR && (
                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Term</label>
                        <input type="number" name="tirTerm" value={formData.tirTerm || 0} onChange={handleChange} className="w-16 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono" placeholder="Term" />
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Other Riders</label>
                    <input type="text" name="otherRiders" value={formData.otherRiders || ''} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs" placeholder="e.g., WP" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-4">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              3. Bonuses & Financials
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Sum Assured (PUP)', name: 'sumAssuredPup' },
                { label: 'Sum Assured', name: 'sumAssured' },
                { label: 'Add-S-A', name: 'addSA' },
                { label: 'Basic Bonuses', name: 'bonuses' },
                { label: 'Int-Bonus', name: 'intBonus' },
                { label: 'Million-Bonus', name: 'millionBonus' },
                { label: 'Golden Jubilee', name: 'goldenJubileeBonus' },
                { label: 'Terminal Bonus', name: 'terminalBonus' },
                { label: '30th Ann-Bonus', name: 'annBonus30th' },
                { label: 'One Time Bonus', name: 'oneTimeBonus' },
                { label: 'Loyalty Bonus', name: 'loyaltyBonus' },
                { label: 'S-B', name: 'sb' },
                { label: 'SP-Bonus', name: 'spBonus' },
                { label: 'AIB-ADB', name: 'aibAdb' },
                { label: 'Khushali Bonus', name: 'khushaliBonus' },
                { label: 'Premium Refund', name: 'premium' },
                { label: 'Late Fee', name: 'lateFee' },
                { label: 'Loan + Interest', name: 'loanInt' },
                { label: 'Susp/Pre Refund', name: 'suspPreRefund' },
                { label: 'Extra Premium', name: 'extraPremium' },
                { label: 'Inst. Premium', name: 'instPremium' },
              ].map((field) => (
                <div key={field.name} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">{field.label}</label>
                  <input 
                    type="number" 
                    name={field.name} 
                    value={(formData as any)[field.name] || 0} 
                    onChange={handleChange} 
                    className="bg-transparent text-right text-xs font-mono font-bold text-slate-700 outline-none w-24" 
                  />
                </div>
              ))}
            </div>

            <div className="bg-slate-900 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-white/60">
                <div className="text-[10px] font-bold uppercase tracking-widest">Base Liability</div>
                <div className="text-sm font-mono">{(formData.totalAmount || 0).toLocaleString()}</div>
              </div>
              <div className="flex items-center justify-between text-white border-t border-white/10 pt-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Net Payable Amount</div>
                <div className="text-2xl font-bold font-mono tracking-tighter">
                  <span className="text-xs mr-1 text-emerald-400">Rs.</span>
                  {(formData.netAmount || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Record Room & Document Collection */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              4. Record Room & Document Checklist
            </h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  name="isRequirementStatus" 
                  checked={formData.isRequirementStatus} 
                  onChange={handleChange} 
                  className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500" 
                />
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Requirement Status</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">Excel Ref: Paper Collection</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mandatory Identity Papers</p>
              {[
                { id: 'deceasedCnic', label: 'Deceased CNIC' },
                { id: 'deathCertificate', label: 'Death Certificate' },
                { id: 'cnicCancellation', label: 'CNIC Cancellation' },
                { id: 'cnicBeneficiary', label: 'Beneficiary CNIC' },
                { id: 'beneficiaryCnicExpired', label: 'Beneficiary CNIC Expired', warning: true },
                { id: 'frc', label: 'Family Registration (FRC)' },
              ].map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input 
                      type="checkbox" 
                      name={`docs.${doc.id}`} 
                      checked={(formData.documentsChecklist as any)?.[doc.id] || false} 
                      onChange={handleChange} 
                      className={`w-4 h-4 rounded border-slate-300 ${(doc as any).warning ? 'text-rose-600 focus:ring-rose-600' : 'text-indigo-600 focus:ring-indigo-600'}`} 
                    />
                    <span className={`text-xs font-medium ${(formData.documentsChecklist?.waivedDocs?.includes(doc.id)) ? 'line-through text-slate-400 italic' : (doc as any).warning ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                      {doc.label}
                    </span>
                  </label>
                  {(role === 'ADMIN' || role === 'INCHARGE') && (
                    <button
                      type="button"
                      onClick={() => handleChange({ target: { name: `waive.${doc.id}`, value: '', type: 'checkbox' } } as any)}
                      className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded transition-opacity ${(formData.documentsChecklist?.waivedDocs?.includes(doc.id)) ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500 opacity-0 group-hover:opacity-100'}`}
                      title="Waive Document"
                    >
                      {formData.documentsChecklist?.waivedDocs?.includes(doc.id) ? 'Waived' : 'Waive'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Attested Forms (A,B,C,D)</p>
              {[
                { id: 'attestedFormA', label: 'Form A (Attested)' },
                { id: 'formAVerifiedBank', label: 'Form A (Bank Verified)' },
                { id: 'attestedFormB', label: 'Form B (Attested)' },
                { id: 'formBVerifiedHospital', label: 'Form B (Hospital Verified)' },
                { id: 'attestedFormC', label: 'Form C (Attested)' },
                { id: 'attestedFormD', label: 'Form D (Attested)' },
                { id: 'docsAttested17Scale', label: 'All signed by 17+ Scale Officer' },
                { id: 'firAdb', label: 'FIR (for ADB Claim)' },
              ].map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input 
                      type="checkbox" 
                      name={`docs.${doc.id}`} 
                      checked={(formData.documentsChecklist as any)?.[doc.id] || false} 
                      onChange={handleChange} 
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" 
                    />
                    <span className={`text-xs font-medium ${(formData.documentsChecklist?.waivedDocs?.includes(doc.id)) ? 'line-through text-slate-400 italic' : 'text-slate-700'}`}>
                      {doc.label}
                    </span>
                  </label>
                  {(role === 'ADMIN' || role === 'INCHARGE') && (
                    <button
                      type="button"
                      onClick={() => handleChange({ target: { name: `waive.${doc.id}`, value: '', type: 'checkbox' } } as any)}
                      className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded transition-opacity ${(formData.documentsChecklist?.waivedDocs?.includes(doc.id)) ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500 opacity-0 group-hover:opacity-100'}`}
                      title="Waive Document"
                    >
                      {formData.documentsChecklist?.waivedDocs?.includes(doc.id) ? 'Waived' : 'Waive'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

          {/* Checklist & Missing Documents Section */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-slate-800">
                <FileText size={16} className="text-orange-500" />
                5. Mandatory Requirements & Checklist
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Mailing Address for Requirement Letter</p>
                <textarea 
                  name="beneficiaryAddress" 
                  value={formData.beneficiaryAddress || ''} 
                  onChange={handleChange} 
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs outline-none focus:border-indigo-500 resize-none font-sans"
                  placeholder="Enter full postal address for requirement delivery..."
                />

                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mt-6">Missing Requirements Notes</p>
                <textarea 
                  name="missingRequirementsNotes" 
                  value={formData.missingRequirementsNotes || ''} 
                  onChange={handleChange} 
                  rows={4} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs outline-none focus:border-indigo-500 resize-none font-sans"
                  placeholder="List any other specific requirements needed from the claimant..."
                />
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Identity & Legal Papers</p>
                {[
                  { id: 'deceasedCnic', label: 'Deceased CNIC' },
                  { id: 'deathCertificate', label: 'Death Certificate' },
                  { id: 'cnicCancellation', label: 'CNIC Cancellation' },
                  { id: 'cnicBeneficiary', label: 'Beneficiary CNIC' },
                  { id: 'beneficiaryCnicExpired', label: 'Beneficiary CNIC Expired', warning: true },
                  { id: 'frc', label: 'Family Registration (FRC)' },
                ].map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input 
                        type="checkbox" 
                        name={`docs.${doc.id}`} 
                        checked={(formData.documentsChecklist as any)?.[doc.id] || false} 
                        onChange={handleChange} 
                        className={`w-4 h-4 rounded border-slate-300 ${doc.warning ? 'text-rose-600 focus:ring-rose-600' : 'text-indigo-600 focus:ring-indigo-600'}`} 
                      />
                      <span className={`text-xs font-medium ${(formData.documentsChecklist?.waivedDocs?.includes(doc.id)) ? 'line-through text-slate-400 italic' : doc.warning ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                        {doc.label}
                      </span>
                    </label>
                    {(role === 'ADMIN' || role === 'INCHARGE') && (
                      <button
                        type="button"
                        onClick={() => handleChange({ target: { name: `waive.${doc.id}`, value: '', type: 'checkbox' } } as any)}
                        className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded transition-opacity ${(formData.documentsChecklist?.waivedDocs?.includes(doc.id)) ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500 opacity-0 group-hover:opacity-100'}`}
                        title="Waive Document"
                      >
                        {formData.documentsChecklist?.waivedDocs?.includes(doc.id) ? 'Waived' : 'Waive'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

        {/* Verification & Audit Trail */}
        <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-slate-800">
              <CreditCard size={16} className="text-emerald-500" />
              6. Final Payment & Settlement
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Check / Instrument Number</label>
              <input type="text" name="checkNo" value={formData.checkNo || ''} onChange={handleChange} className="input-field w-full font-mono" placeholder="CHQ-XXXXXX" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Instrument Date</label>
              <input type="date" name="checkDate" value={formData.checkDate || ''} onChange={handleChange} className="input-field w-full" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Dispatch / Collection Date</label>
              <input type="date" name="checkDispatchDate" value={formData.checkDispatchDate || ''} onChange={handleChange} className="input-field w-full" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Beneficiary Name</label>
              <input type="text" name="beneficiaryName" value={formData.beneficiaryName || ''} onChange={handleChange} className="input-field w-full" placeholder="Receiving Party Name" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bank Name</label>
              <input type="text" name="bankName" value={formData.bankName || ''} onChange={handleChange} className="input-field w-full" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Branch</label>
              <input type="text" name="branch" value={formData.branch || ''} onChange={handleChange} className="input-field w-full" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Account / IBAN Number</label>
              <input type="text" name="beneficiaryAccountNo" value={formData.beneficiaryAccountNo || ''} onChange={handleChange} className="input-field w-full font-mono" placeholder="PKXX XXXX XXXX XXXX" />
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 pb-4 pt-6">
            <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-slate-800">
              <Settings size={16} />
              6. Verification & Trail
            </h3>
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Current Stage:</label>
              <select 
                name="currentStage" 
                value={formData.currentStage} 
                onChange={handleChange}
                className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 outline-none"
              >
                {STAGES.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">JV Mapping (Voucher/Date)</label>
                <div className="flex gap-3">
                  <input type="text" name="jvNo" placeholder="JV #" value={formData.jvNo || ''} onChange={handleChange} className="input-field w-1/3 font-mono" />
                  <input type="date" name="jvDate" value={formData.jvDate || ''} onChange={handleChange} className="input-field flex-1" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">PV Finalization (Serial/Date)</label>
                <div className="flex gap-3">
                  <input type="text" name="pvNo" placeholder="PV #" value={formData.pvNo || ''} onChange={handleChange} className="input-field w-1/3 font-mono" />
                  <input type="date" name="pvDate" value={formData.pvDate || ''} onChange={handleChange} className="input-field flex-1" />
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Official Outcome & Remarks</label>
                <textarea name="remarks" value={formData.remarks || ''} onChange={handleChange} rows={5} className="input-field w-full resize-none bg-white" placeholder="Add committee notes, ZCC status, or any regional processing remarks..." />
              </div>
            </div>
          </div>
        </section>

      </form>
    </div>
  );
};
