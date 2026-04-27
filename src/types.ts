export type ClaimStage = 
  | 'INTIMATION' 
  | 'REQUIREMENT_APPLIED'
  | 'DOCUMENTS_AWAITED'
  | 'CALCULATION' 
  | 'JV_APPROVAL' 
  | 'DOCUMENTS_COLLECTION' 
  | 'ZCC_PROCESSING' 
  | 'INVESTIGATION' 
  | 'AUDIT_PRE_ZCC' 
  | 'RCC_PROCESSING' 
  | 'PV_PREPARATION' 
  | 'AUDIT_PV' 
  | 'ACCOUNTS_FINAL' 
  | 'PAID'
  | 'RECORD_ROOM';

export type UserRoleType = 'ADMIN' | 'INCHARGE' | 'ACCOUNTANT' | 'FO' | 'AUDIT' | 'ACCOUNTS' | 'CLERK';

export interface DeathClaim {
  id: string;
  policyNo: string;
  claimNo: string;
  nameOfAssured: string;
  riskDate: string;
  dateOfDeath: string;
  dateOfIntimation: string;
  dueDateLastPayment: string;
  mode: 'YLY' | 'HLY' | 'QLY' | 'MLY';
  age: number;
  gender: 'M' | 'NM';
  ordSp: string;
  table: string;
  term: number;
  toa: string;
  yearOfMaturity: number;
  instPremium: number;
  extraPremium: number;
  policyStatus: string;
  option: string;
  earlyCase: boolean;
  nd: boolean;
  causeOfDeath: string;
  causeOfDeathCode?: string;
  sumAssuredPup?: number;
  sumAssured: number;
  addSA: number;
  bonuses: number;
  intBonus: number;
  millionBonus: number;
  goldenJubileeBonus: number;
  terminalBonus: number;
  annBonus30th: number;
  oneTimeBonus: number;
  loyaltyBonus: number;
  sb: number;
  spBonus: number;
  suspPreRefund: number;
  aibAdb: number;
  fibAnn: number;
  totalAmount: number;
  premium?: number;
  lateFee?: number;
  loanInt?: number;
  netAmount?: number;
  jvNo?: string;
  jvDate?: string;
  pvNo?: string;
  pvDate?: string;
  checkNo?: string;
  checkDate?: string;
  checkDispatchDate?: string;
  beneficiaryName?: string;
  beneficiaryAddress?: string;
  branch?: string;
  remarks?: string;
  claimPaperReceived?: boolean;
  fibAmount?: number;
  fibPercentage?: number;
  fibPeriodYears?: number;
  rpAmount?: number;
  mNmStatus?: string;
  documentsChecklist?: {
    deceasedCnic: boolean;
    deathCertificate: boolean;
    cnicCancellation: boolean;
    cnicBeneficiary: boolean;
    attestedFormA: boolean;
    attestedFormB: boolean;
    attestedFormC: boolean;
    attestedFormD: boolean;
    formAVerifiedBank: boolean;
    formBVerifiedHospital: boolean;
    frc: boolean;
    firAdb: boolean;
    docsAttested17Scale: boolean;
    beneficiaryCnicExpired: boolean;
    waivedDocs?: string[];
  };
  beneficiaryAccountNo?: string;
  missingRequirementsNotes?: string;
  isRequirementStatus?: boolean;
  khushaliBonus?: number;
  agencyChannel?: {
    am: string;
    sm: string;
    so: string;
    sr: string;
  };
  currentStage: ClaimStage;
  investigationStatus?: string;
  auditQueries?: string;
  assignedFO?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface UserRole {
  uid: string;
  email: string;
  role: UserRoleType;
}
