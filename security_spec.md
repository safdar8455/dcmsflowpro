# Security Specification - ClaimFlow

## 1. Data Invariants

- **DeathClaim**:
  - `policyNo` is required and must be alphanumeric.
  - `currentStage` must be valid based on the workflow.
  - `totalAmount` must be the sum of `sumAssured`, `addSA`, and `bonuses` if provided.
  - `createdAt` is immutable.
  - `updatedAt` must be the server time on every write.
  - Access is restricted based on user roles stored in `/userRoles/{userId}`.

- **UserRole**:
  - Only Admins can modify user roles.
  - Every user must have a role to perform actions.

## 2. The "Dirty Dozen" Payloads (Denial Tests)

1. **Anonymous Write**: Attempt to create a claim without authentication.
2. **Identity Spoofing**: User A attempts to create a claim but sets `createdBy` to User B's UID.
3. **Role Escalation**: A Clerk attempts to modify their own role to ADMIN in `userRoles` collection.
4. **Stage Skipping**: A Clerk attempts to move a claim from `INTIMATION` directly to `PAID`.
5. **PII Leak**: An unauthenticated user attempts to list all claims to see `nomineeName` and `accountNumber`.
6. **Ghost Field Injection**: Adding `isVerified: true` to a claim creation payload.
7. **Invalid Type**: Setting `totalAmount` as a string instead of a number.
8. **Oversized String**: Sending a 1MB string for `causeOfDeath`.
9. **Immutable Mutation**: Attempting to change `createdAt` on an existing claim.
10. **Unauthorized Transition**: FO attempting to approve a JV (changing `currentStage` to `DOCUMENTS_COLLECTION`).
11. **Future Timestamp**: Setting `updatedAt` to a future date instead of `request.time`.
12. **Malicious ID**: Creating a claim with a document ID containing special characters like `../../../etc/passwd`.

## 3. Test Runner Concept

The `firestore.rules` will be tested via these scenarios to ensure `PERMISSION_DENIED` is returned for all "Dirty Dozen" payloads.
