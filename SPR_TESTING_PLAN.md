# SPR Testing & Validation Plan

**Test Engine**: Vitest 4.x + React Testing Library + PostgreSQL / RLS Validation  
**Scope**: Pure Scoring Logic, Multipliers, Tie-Breaking, SPR ID Invariance, Data Privacy, and User Experience  

---

## 1. Test Categories & Requirements

### 1.1 Pure Scoring Engine Tests (`src/lib/spr/scoring.test.ts`)
- [ ] **Islamic Studies Scaling**:
  - Exam Scaled Score = $(\frac{\sum \text{obtained}}{\sum \text{max}}) \times \text{actual\_max}$
  - Verify scaling when actual max = 100 vs custom values.
- [ ] **School Studies Scaling**:
  - Verify scaling with actual max = 130. Example: $90\% \times 130 = 117.00$ points.
- [ ] **Prize Multipliers**:
  - 1st Prize: $2.0\times$
  - 2nd Prize: $1.5\times$
  - 3rd Prize: $1.0\times$
  - Other/Participation: $1.0\times$
- [ ] **Festival Level Multipliers**:
  - Verify multipliers: Campus (1.0), School (1.0), Division (2.0), District (2.5), Da'eera (3.0), State/Jamia (4.0), National (4.5), International (5.0).
  - Example: District 1st Prize = $100 \times 2.0 \times 2.5 = 500$ points.
- [ ] **Qualification Formula**:
  - $\text{Base} \times \text{Subcategory Weight} \times \text{Level} \times \text{Prize}$.
- [ ] **Creative Hub Formula**:
  - Form base scores: Research Paper (100), Story (75), Article/Poem/Review (50), Response (40), Letter/Others (30).
  - Multiplied by published media weights or direct points entry.
- [ ] **Library Reading Formulas**:
  - Full read: $(\frac{\text{Pages}}{10}) \times \text{Rate}$.
  - Half read: $\frac{\text{Full Points}}{2}$.
  - Custom read: $(\frac{\text{Pages Read}}{10}) \times \text{Rate}$.
  - Direct review points addition.
- [ ] **Kuthbkhana Classical Reading**:
  - $\text{Base Score} \times \text{Subcategory Weight}$.
- [ ] **Unlimited Numerical Points Sum**:
  - Total points strictly = $\sum (\text{points from active categories})$.
  - Verify totals exceeding 100, 1,000, and 5,000 points without artificial capping.

### 1.2 Ranking & Leaderboard Rules (`src/lib/spr/ranking.test.ts`)
- [ ] **Tie-breaking ("1224 style")**:
  - Two students tied for 1st both receive Rank 1.
  - The next student receives Rank 3.
  - Verification of joint-rank badges and deterministic secondary sorting (records count desc, name asc).
- [ ] **Zero-Point Policies**:
  - Category-specific leaderboards: Exclude students with 0 earned points in that category.
  - Overall master leaderboard: Include all active students (even with 0 points).

### 1.3 SPR Student ID Invariance (`src/lib/spr/sprId.test.ts`)
- [ ] Format validation: `/^SPR\d{4,}$/i`.
- [ ] Normalization: Upper-casing, zero-padding to at least 4 digits (`SPR0001`, `SPR0115`).
- [ ] Immutability: Verify trigger raises exception on update attempts.
- [ ] Exact Matching: External system synchronization tests strictly rejecting fuzzy or partial name matches.

### 1.4 Excel Import Validation Tests (`src/services/importValidation.test.ts`)
- [ ] Detection of missing student names.
- [ ] Detection of unmapped classes or invalid schools.
- [ ] Detection of duplicate records within import batch.
- [ ] Reporting with line numbers, field names, and severity (ERROR/WARNING).

### 1.5 Privacy & Security Tests
- [ ] Public endpoints and TV display payloads return only public-safe fields (rank, name, SPR ID, class, school, points).
- [ ] Reporter names and internal admin notes strictly excluded from public responses.
- [ ] No Base64 image payloads stored or returned in queries.

---

## 2. Test Execution & Reporting Protocol
All tests are executed via `npm test` (`vitest run`). Actual execution logs and pass/fail counts will be documented in `SPR_IMPLEMENTATION_STATUS.md`.
