import { DeathClaim, FibPayment } from '../types';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';

/**
 * Calculates the FIB payment schedule based on policy rules:
 * 1. Start one month after Date of Death.
 * 2. Stop one month before Policy Maturity Date.
 * 3. Annual frequency.
 * 4. First 3 payments as specified (base).
 * 5. From 4th year onwards, 7.5% compound interest increment annually.
 */
export function calculateFibSchedule(claim: DeathClaim): Omit<FibPayment, 'id' | 'createdAt' | 'updatedAt'>[] {
  const schedule: Omit<FibPayment, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  
  if (!claim.hasFIB || !claim.dateOfDeath || !claim.yearOfMaturity || !claim.riskDate) {
    return schedule;
  }

  const deathDate = new Date(claim.dateOfDeath);
  const riskDate = new Date(claim.riskDate);
  
  // Start date: One month after the date of death
  const startDate = new Date(deathDate);
  startDate.setMonth(startDate.getMonth() + 1);

  // Maturity date: Same month/day as riskDate but in yearOfMaturity
  const maturityDate = new Date(claim.yearOfMaturity, riskDate.getMonth(), riskDate.getDate());
  
  // Stop limit: One month before the policy maturity date
  const stopLimit = new Date(maturityDate);
  stopLimit.setMonth(stopLimit.getMonth() - 1);

  // Base amount calculation (Using percentage if fibAnn not explicitly set)
  // Usually FIB is given as annual amount in circulars
  const baseAnnualAmount = claim.fibAnn || (claim.sumAssured * (claim.fibPercentage || 0) / 100);
  
  if (baseAnnualAmount <= 0) return [];

  let currentDueDate = new Date(startDate);
  let yearIndex = 1;

  // Generate annual payments until stop limit
  while (currentDueDate <= stopLimit) {
    let amount = baseAnnualAmount;
    
    // After the third payment, the amount increases annually using 7.5% compound interest
    if (yearIndex > 3) {
      amount = baseAnnualAmount * Math.pow(1.075, yearIndex - 3);
    }

    schedule.push({
      claimId: claim.id,
      policyNo: claim.policyNo,
      dueDate: currentDueDate.toISOString().split('T')[0],
      amount: Math.round(amount),
      paymentYear: yearIndex,
      status: yearIndex === 1 ? 'PENDING' : 'SCHEDULED' // First one is immediately pending
    });

    // Move to next year
    currentDueDate = new Date(currentDueDate);
    currentDueDate.setFullYear(currentDueDate.getFullYear() + 1);
    yearIndex++;
  }

  return schedule;
}

/**
 * Creates FIB payment records in Firestore if they don't exist yet.
 * By default, it creates the entire schedule based on rules.
 */
export async function setupFibPayments(claim: DeathClaim) {
  if (!claim.id || !claim.hasFIB) return;

  try {
    const schedule = calculateFibSchedule(claim);
    if (schedule.length === 0) {
      throw new Error(`Could not calculate schedule based on current data. (FIB: ${claim.hasFIB}, DOD: ${claim.dateOfDeath}, Risk: ${claim.riskDate}, Mat: ${claim.yearOfMaturity}, AnnAmt: ${claim.fibAnn})`);
    }

    // Fetch existing payments to avoid duplicates
    const q = query(collection(db, 'fibPayments'), where('claimId', '==', claim.id));
    const snapshot = await getDocs(q);
    const existingPayments = snapshot.docs.map(doc => doc.data() as FibPayment);
    const existingDueDates = existingPayments.map(p => p.dueDate);

    const now = new Date().toISOString();
    let createdCount = 0;
    
    // If no payments exist at all, we MUST create at least the FIRST record
    if (existingPayments.length === 0) {
      const firstPayment = schedule[0];
      await addDoc(collection(db, 'fibPayments'), {
        ...firstPayment,
        createdAt: now,
        updatedAt: now
      });
      createdCount++;
      
      // Also create the rest of the schedule by default to show future commitments
      // as they were previously calculating the whole schedule.
      // But the user said: "For subsequent payments, create additional records"
      // If they want them ALL now, we can. 
      for (let i = 1; i < schedule.length; i++) {
         await addDoc(collection(db, 'fibPayments'), {
            ...schedule[i],
            createdAt: now,
            updatedAt: now
          });
          createdCount++;
      }
    } else {
      // Check if we need to add missing ones (sync logic)
      for (const payment of schedule) {
        if (!existingDueDates.includes(payment.dueDate)) {
          await addDoc(collection(db, 'fibPayments'), {
            ...payment,
            createdAt: now,
            updatedAt: now
          });
          createdCount++;
        }
      }
    }

    if (createdCount > 0) {
      console.log(`Successfully scheduled ${createdCount} new FIB payments`);
    }
  } catch (error) {
    console.error('Error setting up FIB payments:', error);
    throw error;
  }
}
