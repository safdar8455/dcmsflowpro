import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { DeathClaim } from '../types';
import Papa from 'papaparse';
import { FileUp, Download, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export const BulkImport: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    success: number;
    duplicates: string[];
    errors: string[];
  } | null>(null);

  const downloadTemplate = () => {
    const headers = [
      'policyNo', 'claimNo', 'nameOfAssured', 'dateOfDeath', 'dateOfIntimation', 
      'dueDateLastPayment', 'riskDate', 'earlyCase', 'nd', 'isRevived', 'causeOfDeath',
      'amCode', 'smCode', 'soCode', 'srCode',
      'gender', 'age', 'mode', 'table', 'term', 'yearOfMaturity', 'claimPaperReceived',
      'policyStatus', 'option', 'selectionStatus', 'medicalStatus', 
      'hasFIB', 'fibAnn', 'fibPercentage', 'fibPeriodYears', 'hasAIB_ADB', 'hasTIR', 'otherRiders',
      'sumAssuredPup', 'sumAssured', 'addSA', 'bonuses', 'intBonus', 'millionBonus',
      'goldenJubileeBonus', 'terminalBonus', 'annBonus30th', 'oneTimeBonus', 'loyaltyBonus',
      'sb', 'spBonus', 'aibAdb', 'khushaliBonus', 'extraPremium', 'premiumRefund', 'lateFee', 'loanInt',
      'suspPreRefund', 'baseLiability', 'netAmount',
      'checkNo', 'checkDate', 'checkDispatchDate', 'beneficiaryName', 'bankName', 'branch', 'accountNo',
      'currentStage', 'jvNo', 'jvDate', 'pvNo', 'pvDate', 'remarks'
    ];
    const example = [
      'PK-12345-67', 'C-100', 'John Doe', '2023-05-10', '2024-04-30',
      '2024-06-01', '2015-01-01', 'FALSE', 'FALSE', 'FALSE', 'Natural',
      'AM-001', 'SM-001', 'SO-001', 'SR-001',
      'M', '45', 'YLY', '76', '20', '2035', 'TRUE',
      'INFORCE', 'A', 'STANDARD', 'MEDICAL',
      'TRUE', '100000', '10', '15', 'FALSE', 'FALSE', '',
      '0', '1000000', '0', '500000', '0', '0',
      '0', '0', '0', '0', '0',
      '0', '0', '0', '0', '0', '0', '500', '0',
      '0', '1500000', '1495000',
      'CHQ-999', '2024-05-20', '2024-05-25', 'Jane Doe', 'ABC Bank', 'City Branch', 'PK00112233',
      'INTIMATION', 'JV-001', '2024-05-15', 'PV-001', '2024-05-18', 'Bulk Imported'
    ];
    
    const csvContent = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'claims_import_template_v2.csv');
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    setResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let batch = writeBatch(db);
        let currentBatchSize = 0;
        const claimsCollection = collection(db, 'claims');
        const timestamp = new Date().toISOString();
        
        let successCount = 0;
        const duplicatePolicies: string[] = [];
        const processingErrors: string[] = [];

        try {
          const allRows = results.data as any[];
          
          const cleanNumber = (val: any) => {
            if (typeof val === 'number') return isNaN(val) ? 0 : val;
            if (val === undefined || val === null || val === '') return 0;
            const cleaned = String(val).replace(/[^0-9.-]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
          };

          const trim = (val: any) => String(val || '').trim();

          for (const row of allRows) {
            if (!row.policyNo) continue;

            const pollNo = trim(row.policyNo);

            // 2. Check for duplicate within the system
            const q = query(claimsCollection, where('policyNo', '==', pollNo));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
              duplicatePolicies.push(pollNo);
              continue;
            }

            // 3. Prepare individual claim record
            const claimId = Math.random().toString(36).substr(2, 9);
            const claimDocRef = doc(claimsCollection, claimId);
            
            const toBool = (val: any) => {
              const s = String(val).toLowerCase().trim();
              return s === 'true' || s === 'yes' || s === '1' || s === 'y';
            };

            const newClaim: DeathClaim = {
              id: claimId,
              policyNo: pollNo,
              claimNo: trim(row.claimNo),
              nameOfAssured: trim(row.nameOfAssured || 'Imported Case').substring(0, 200),
              riskDate: trim(row.riskDate),
              dateOfDeath: trim(row.dateOfDeath),
              dateOfIntimation: trim(row.dateOfIntimation || timestamp.split('T')[0]),
              dueDateLastPayment: trim(row.dueDateLastPayment),
              mode: (trim(row.mode).toUpperCase() || 'YLY') as any,
              age: cleanNumber(row.age),
              gender: (trim(row.gender).charAt(0).toUpperCase() || 'M') as any,
              table: trim(row.table),
              term: cleanNumber(row.term),
              yearOfMaturity: cleanNumber(row.yearOfMaturity),
              policyStatus: trim(row.policyStatus || 'INFORCE').toUpperCase(),
              option: trim(row.option || 'A').toUpperCase(),
              earlyCase: toBool(row.earlyCase),
              nd: toBool(row.nd),
              isRevived: toBool(row.isRevived),
              hasFIB: toBool(row.hasFIB),
              hasAIB_ADB: toBool(row.hasAIB_ADB),
              hasTIR: toBool(row.hasTIR),
              otherRiders: trim(row.otherRiders),
              causeOfDeath: trim(row.causeOfDeath),
              claimPaperReceived: toBool(row.claimPaperReceived),
              
              sumAssuredPup: cleanNumber(row.sumAssuredPup),
              sumAssured: cleanNumber(row.sumAssured),
              addSA: cleanNumber(row.addSA),
              bonuses: cleanNumber(row.bonuses),
              intBonus: cleanNumber(row.intBonus),
              millionBonus: cleanNumber(row.millionBonus),
              goldenJubileeBonus: cleanNumber(row.goldenJubileeBonus),
              terminalBonus: cleanNumber(row.terminalBonus),
              annBonus30th: cleanNumber(row.annBonus30th),
              oneTimeBonus: cleanNumber(row.oneTimeBonus),
              loyaltyBonus: cleanNumber(row.loyaltyBonus),
              sb: cleanNumber(row.sb),
              spBonus: cleanNumber(row.spBonus),
              aibAdb: cleanNumber(row.aibAdb),
              khushaliBonus: cleanNumber(row.khushaliBonus),
              premium: cleanNumber(row.premiumRefund),
              rpAmount: cleanNumber(row.premiumRefund),
              lateFee: cleanNumber(row.lateFee),
              loanInt: cleanNumber(row.loanInt),
              suspPreRefund: cleanNumber(row.suspPreRefund),
              totalAmount: cleanNumber(row.baseLiability),
              netAmount: cleanNumber(row.netAmount),
              
              checkNo: trim(row.checkNo),
              checkDate: trim(row.checkDate),
              checkDispatchDate: trim(row.checkDispatchDate),
              beneficiaryName: trim(row.beneficiaryName),
              beneficiaryAccountNo: trim(row.accountNo),
              bankName: trim(row.bankName),
              branch: trim(row.branch),
              
              jvNo: trim(row.jvNo),
              jvDate: trim(row.jvDate),
              pvNo: trim(row.pvNo),
              pvDate: trim(row.pvDate),
              
              currentStage: (trim(row.currentStage).toUpperCase() || 'INTIMATION') as any,
              remarks: trim(row.remarks || 'Bulk Imported'),
              agencyChannel: { 
                am: trim(row.amCode), 
                sm: trim(row.smCode), 
                so: trim(row.soCode), 
                sr: trim(row.srCode) 
              },
              
              createdAt: timestamp,
              updatedAt: timestamp,
              createdBy: user.uid,
              beneficiaryAddress: '',
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
              ordSp: '',
              toa: '',
              instPremium: 0,
              extraPremium: cleanNumber(row.extraPremium),
              selectionStatus: (trim(row.selectionStatus).toUpperCase() || 'STANDARD') as any,
              medicalStatus: (trim(row.medicalStatus).toUpperCase() || 'MEDICAL') as any,
              revivalDate: '',
              fibTerm: 0,
              fibTable: '',
              aib_adbTerm: 0,
              tirTerm: 0,
              fibAnn: cleanNumber(row.fibAnn),
              fibPercentage: cleanNumber(row.fibPercentage),
              fibPeriodYears: cleanNumber(row.fibPeriodYears || 0)
            };

            batch.set(claimDocRef, newClaim);
            successCount++;
            currentBatchSize++;

            if (currentBatchSize >= 450) {
                await batch.commit();
                batch = writeBatch(db);
                currentBatchSize = 0;
            }
          }

          if (currentBatchSize > 0) {
            await batch.commit();
          }

          setResults({
            success: successCount,
            duplicates: duplicatePolicies,
            errors: processingErrors
          });
        } catch (error) {
          console.error("Bulk import error:", error);
          handleFirestoreError(error, OperationType.CREATE, 'claims');
          setResults({
            success: 0,
            duplicates: [],
            errors: ["System error occurred during import. Check logs."]
          });
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        console.error("Parse error:", error);
        setLoading(false);
        alert("Failed to parse CSV file.");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/claims')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Pipeline
        </button>
        <button 
          onClick={downloadTemplate}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-xs uppercase tracking-widest transition-colors"
        >
          <Download size={16} />
          Download CSV Template
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-2">
            <FileUp size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bulk Claim Import</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Upload a CSV file to import multiple death claim intimidations at once.</p>
        </div>

        <div className="max-w-md mx-auto">
          {!loading && !results && (
            <label className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileUp className="text-slate-400 group-hover:text-blue-500 mb-2 transition-colors" size={24} />
                <p className="text-xs font-black text-slate-400 group-hover:text-slate-600 uppercase tracking-widest">Click to select CSV file</p>
              </div>
              <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
            </label>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Checking records & processing...</p>
            </div>
          )}

          {results && (
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
            >
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-emerald-700">
                <div className="flex items-center gap-2 mb-2 justify-center">
                    <CheckCircle2 size={24} />
                    <span className="text-xl font-black">{results.success} Records Imported</span>
                </div>
                <p className="text-xs font-medium opacity-80">Successfully created in the claims pipeline.</p>
              </div>

              {results.duplicates.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-700 text-left">
                  <div className="flex items-center gap-2 mb-3">
                      <AlertCircle size={20} />
                      <span className="text-sm font-bold uppercase tracking-widest">Skipped Duplicates ({results.duplicates.length})</span>
                  </div>
                  <div className="text-[10px] font-mono grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {results.duplicates.map(p => (
                      <div key={p} className="bg-amber-100/50 p-2 rounded">{p}</div>
                    ))}
                  </div>
                  <p className="text-[10px] mt-3 italic">These policy numbers already exist in the system and were skipped to avoid duplication.</p>
                </div>
              )}

              <button 
                onClick={() => navigate('/claims')}
                className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-xl hover:bg-slate-800 transition-all active:scale-95"
              >
                Go to Pipeline
              </button>
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={14} className="text-blue-500" />
                Wait, before you upload!
            </h4>
            <ul className="text-[11px] text-slate-500 space-y-2 list-disc pl-4 font-medium">
                <li>Ensure the column headers match the template exactly.</li>
                <li>Dates should be in <b>YYYY-MM-DD</b> format.</li>
                <li>Policy Number is used as a <b>unique key</b>. Duplicate policies will be ignored automatically.</li>
                <li>Mode must be one of: <b>YLY, HLY, QLY, MLY</b>.</li>
                <li>Current Stage (optional) defaults to <b>INTIMATION</b>.</li>
            </ul>
        </div>
        <div className="bg-blue-600 p-6 rounded-2xl border border-blue-500 text-white space-y-4 shadow-xl shadow-blue-500/20">
            <h4 className="text-xs font-black uppercase tracking-widest">Why use bulk import?</h4>
            <p className="text-[11px] font-medium opacity-90 leading-relaxed">
                If you have several cases received in a single batch from the Record Room or Regional Offices, you can prepare them in Excel and upload them here to save time on manual entry.
            </p>
        </div>
      </div>
    </div>
  );
};
