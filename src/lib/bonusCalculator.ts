export type PlanType = 'WHOLE_LIFE' | 'ENDOWMENT' | 'ANTICIPATED_ENDOWMENT' | 'SADA_BAHAR' | 'PLATINUM_PLUS' | 'SUPER_SUNEHRI_SHEHNAI';

interface BonusRates {
  first5: number;
  sixTo16: number;
  seventeenPlus: number;
}

const REVERSIONARY_BONUS_TABLES: Record<string, Record<string, BonusRates>> = {
  WHOLE_LIFE: {
    DEFAULT: { first5: 56, sixTo16: 122, seventeenPlus: 187 }
  },
  ENDOWMENT: {
    '20_PLUS': { first5: 47, sixTo16: 106, seventeenPlus: 162 },
    '15_19': { first5: 32, sixTo16: 89, seventeenPlus: 101 },
    '14_LESS': { first5: 19, sixTo16: 73, seventeenPlus: 0 }
  },
  ANTICIPATED_ENDOWMENT: {
    '20_PLUS': { first5: 32, sixTo16: 77, seventeenPlus: 124 },
    '15_19': { first5: 23, sixTo16: 66, seventeenPlus: 73 },
    '14_LESS': { first5: 18, sixTo16: 58, seventeenPlus: 0 }
  },
  SADA_BAHAR: {
    '20_PLUS': { first5: 42, sixTo16: 95, seventeenPlus: 162 },
    '15_19': { first5: 29, sixTo16: 83, seventeenPlus: 101 },
    '14_LESS': { first5: 22, sixTo16: 73, seventeenPlus: 0 }
  },
  PLATINUM_PLUS: {
    DEFAULT: { first5: 29, sixTo16: 110, seventeenPlus: 0 }
  }
};

const KHUSHALI_BONUS_TABLES: Record<string, Record<string, BonusRates>> = {
  WHOLE_LIFE: {
    DEFAULT: { first5: 10, sixTo16: 22, seventeenPlus: 32 }
  },
  ENDOWMENT: {
    '20_PLUS': { first5: 8, sixTo16: 18, seventeenPlus: 28 },
    '15_19': { first5: 6, sixTo16: 16, seventeenPlus: 18 },
    '14_LESS': { first5: 2, sixTo16: 12, seventeenPlus: 0 }
  },
  ANTICIPATED_ENDOWMENT: {
    '20_PLUS': { first5: 6, sixTo16: 14, seventeenPlus: 22 },
    '15_19': { first5: 4, sixTo16: 12, seventeenPlus: 12 },
    '14_LESS': { first5: 2, sixTo16: 10, seventeenPlus: 0 }
  },
  SADA_BAHAR: {
    '20_PLUS': { first5: 6, sixTo16: 16, seventeenPlus: 28 },
    '15_19': { first5: 6, sixTo16: 14, seventeenPlus: 18 },
    '14_LESS': { first5: 4, sixTo16: 12, seventeenPlus: 0 }
  },
  PLATINUM_PLUS: {
    DEFAULT: { first5: 3, sixTo16: 18, seventeenPlus: 0 }
  }
};

const SPECIAL_REV_BONUS_SB: Record<number, number> = {
  20: 3165, 18: 2765, 16: 2350, 12: 1545, 10: 1175
};

export function calculateReversionaryBonus(
  plan: PlanType,
  termRange: string,
  sumAssured: number,
  policyYears: number,
  isBigDeal: boolean = false
): number {
  if (plan === 'SUPER_SUNEHRI_SHEHNAI') {
    return (125 * sumAssured / 1000) * policyYears;
  }

  const planTable = REVERSIONARY_BONUS_TABLES[plan];
  if (!planTable) return 0;

  const rates = planTable[termRange] || planTable['DEFAULT'];
  if (!rates) return 0;

  const effectiveSA = isBigDeal ? sumAssured * 0.25 : sumAssured;
  let totalBonus = 0;

  for (let year = 1; year <= policyYears; year++) {
    let rate = 0;
    if (year <= 5) rate = rates.first5;
    else if (year <= 16) rate = rates.sixTo16;
    else rate = rates.seventeenPlus;
    
    totalBonus += (rate * effectiveSA / 1000);
  }

  return Math.round(totalBonus);
}

export function calculateKhushaliBonus(
  plan: PlanType,
  termRange: string,
  sumAssured: number,
  policyYearsAsOf2024: number,
  isBigDeal: boolean = false
): number {
  const planTable = KHUSHALI_BONUS_TABLES[plan];
  if (!planTable) return 0;

  const rates = planTable[termRange] || planTable['DEFAULT'];
  if (!rates) return 0;

  const effectiveSA = isBigDeal ? sumAssured * 0.25 : sumAssured;
  let rate = 0;
  
  if (policyYearsAsOf2024 <= 5) rate = rates.first5;
  else if (policyYearsAsOf2024 <= 16) rate = rates.sixTo16;
  else rate = rates.seventeenPlus;

  return Math.round((rate * effectiveSA) / 1000);
}

export function calculateTerminalBonus(sumAssured: number, premiumsPaidYears: number): number {
  if (premiumsPaidYears <= 10) return 0;
  
  const excessYears = premiumsPaidYears - 10;
  const ratePerThou = 80;
  const totalRate = Math.min(ratePerThou * excessYears, 1600);
  
  return Math.round((totalRate * sumAssured) / 1000);
}

export function calculateLoyaltyBonus(sumAssured: number, commencementYear: number): number {
  if (commencementYear <= 2005) {
    return Math.round((200 * sumAssured) / 1000);
  }
  return 0;
}

export function calculateSpecialTerminalBonusFIB(sumAssured: number, fibYears: number): number {
  if (fibYears <= 10) return 0;
  const excessYears = fibYears - 10;
  const rate = Math.min(10 * excessYears, 200);
  return Math.round((rate * sumAssured) / 1000);
}

export function calculateSpecialReversionaryBonusSB(sbAmount: number, yearsRemaining: number): number {
  // Rough interpolation if not exact
  const rates = SPECIAL_REV_BONUS_SB;
  const sortedYears = Object.keys(rates).map(Number).sort((a, b) => b - a);
  
  let rate = 0;
  for (const yr of sortedYears) {
    if (yearsRemaining >= yr) {
      rate = rates[yr];
      break;
    }
  }
  
  if (rate === 0 && yearsRemaining > 0) {
    // If less than 10 years, maybe use linear if appropriate, but circular implies specific brackets.
    // Let's assume 0 if less than 10 based on table visual.
    return 0;
  }

  return Math.round((rate * sbAmount) / 1000);
}
