# SPR Master Requirements Document
**Institution**: Ma'din School of Excellence (MSOE), Malappuram, Kerala, India  
**System**: Student Performance Rating (SPR) — Production Platform  
**Target Specification**: Documented Original Final Feature Set & Architecture  
**Status**: Authoritative Reference Document

---

## 1. Executive Summary & Purpose

The Student Performance Rating (SPR) application is a consolidated performance evaluation, rating, and public recognition platform for Ma'din School of Excellence. It synthesizes student achievements across:
1. Academic School Studies (Kerala State Board & NCERT)
2. Islamic Studies (Jamiathul Hind Al-Islamiyya & Ma'din Academy streams)
3. Qualifications & Certifications (Hifz, Qira'at, etc.)
4. Creative Hub (Literature, Articles, Poems, Reviews, Digital/Print Publishing)
5. Literary Programmes (Sahityotsav, Jamia Maharjan, M-Lit Fest, Kerala School Kalotsav)
6. Programmes & Competitions (Institutional, Division, State, National events)
7. Library Reading (Imthiyaaz Library) & Classical Islamic Muthala (Kuthbkhana)

The platform provides a dual-facing architecture:
- **Public Portal**: Executive landing page, top 1st/2nd/3rd podium cards, master leaderboard with deterministic ties and zero-point handling, category visual directories, student dossier profiles, A4 Print Studio, news updates, student inaccuracy issue reporting, and TV/projector display mode.
- **Administrative Suite**: Role-based access control, master data management, academic bulk mark entry with dynamic subject tables, creative submissions registry, literary competition score imports, Kuthbkhana classical text tracking, Imthiyaaz library on-demand synchronization, scoring weight management, global search (Ctrl+K), and audit logging.

---

## 2. Core Non-Negotiable Architectural Principles

1. **Managed Cloud Database**:
   - Lovable Cloud / Supabase-managed PostgreSQL (`itopsttdmtcklrkginnx.supabase.co`).
   - No unauthorized provider switches.
   - Server-side/database-level authorization and Row Level Security (RLS).
2. **Scoring Model — Unlimited Numerical Points**:
   - Total SPR Points = $\sum (\text{Earned Points across active categories})$.
   - Points are **unlimited** and can scale past 100, 1,000, or 5,000.
   - **Prohibited**: The obsolete/experimental capped 0–100% matrix (20% Islamic + 13.333% each for 6 categories) must NOT be used.
3. **Permanent & Immutable SPR Student IDs**:
   - Canonical format: `/^SPR\d{4,}$/i` (e.g., `SPR0001`, `SPR0002`, `SPR0115`).
   - Normalized: Uppercase, trimmed, sequential zero-padded.
   - Enforced by database trigger (`prevent_spr_id_change`).
   - Permanent once assigned; never regenerated or altered during profile edits.
4. **Exact Cross-System Matching**:
   - External data synchronization (e.g., Imthiyaaz Library) must match by **exact normalized SPR Student ID only**.
   - No fuzzy matching by name, phonetic similarity, or guessed identity.
5. **No Base64 Photo Blobs in PostgreSQL**:
   - Student and news photos must use external URLs / CDN.
   - Google Drive photos normalized to direct thumbnail CDN URLs: `https://lh3.googleusercontent.com/d/{FILE_ID}=s360`.
6. **Tie-Breaking & Leaderboard Visibility**:
   - Standard competition ranking: "1, 1, 3" style (skipped subsequent rank for ties).
   - Deterministic secondary sort: Participation/record count descending, name ascending.
   - Category-specific leaderboards: Exclude students with zero earned points in that category.
   - Overall master leaderboard: Include all active students (even with zero points).
7. **Egress & Performance Optimization**:
   - No `SELECT *` on large tables; paginate student lists and records.
   - Use aggregate database queries (`head: true`, `count: 'exact'`).
   - Public caching (~60-second in-memory cache).
   - Silent TV refresh every ~60 seconds with public-safe projections only.

---

## 3. Institutional Structure

### 3.1 Central & Partner Institutions
- **Central Institution**: Ma'din School of Excellence (MSOE), Malappuram.
- **Partner / Associated Institutions**:
  1. GBHS Malappuram
  2. GBHSS Malappuram
  3. CM Academy
  4. Ma'din Higher Secondary School
  5. DUHSS Panakkad
- Configurable via database table `institutions` (no hardcoding).

### 3.2 Academic Classes & Divisions
- Classes: Class 8, Class 9, Class 10, Class +1 (Grade 11), Class +2 (Grade 12).
- Divisions: A, B, etc.
- Configurable via `classes` referencing `institutions` and `academic_years`.

### 3.3 Syllabuses & Streams
- **School Studies**: Kerala State Board & NCERT.
- **Islamic Studies**: Jamiathul Hind Al-Islamiyya & Ma'din Academy.

---

## 4. Scoring Logic & Multipliers

### 4.1 Islamic Studies
- Exam Scaled Score = $(\frac{\sum \text{Obtained Marks}}{\sum \text{Max Marks}}) \times \text{Exam Actual Max Score}$.
- Default Exam Actual Max Score = 100.
- Total Islamic Points = $\sum (\text{Exam Scaled Scores})$.

### 4.2 School Studies
- Exam Scaled Score = $(\frac{\sum \text{Obtained Marks}}{\sum \text{Max Marks}}) \times \text{Exam Actual Max Score}$.
- Default Exam Actual Max Score = 130.
- Example: 90% in exam with actual max 130 = $117.00$ points.

### 4.3 Programmes & Literary Competitions
- $\text{Earned Points} = \text{Base Score} \times \text{Prize Multiplier} \times \text{Level Multiplier}$.
- **Prize Multipliers**:
  - 1st Prize: $2.0\times$
  - 2nd Prize: $1.5\times$
  - 3rd Prize: $1.0\times$
  - Other / Participation: $1.0\times$
- **Base Scores (Configurable defaults)**:
  - 1st Prize: 100
  - 2nd Prize: 75
  - 3rd Prize: 50
- **Festival Level Multipliers**:
  - Campus: $1.00\times$
  - School: $1.00\times$
  - Division / Sub-district / Kulliya: $2.00\times$
  - District: $2.50\times$
  - Da'eera: $3.00\times$
  - State / Jamia: $4.00\times$
  - National: $4.50\times$
  - International: $5.00\times$

### 4.4 Qualification
- $\text{Earned Points} = \text{Base Score} \times \text{Subcategory Weight} \times \text{Level Multiplier} \times \text{Prize Multiplier}$.
- Subcategories: Hifz, Qira'at, specialized certificates.

### 4.5 Creative Hub
- Direct points or: $\text{Earned Points} = \text{Form Base Score} \times \text{Media Weight}$.
- **Form Base Scores**:
  - Research Paper: 100
  - Story: 75
  - Article / Poem / Book Review: 50
  - Response: 40
  - Letter / Others: 30
- **Published Media**: Newspaper, Magazine, Wall Magazine, Digital Portal, Journal.

### 4.6 Library & Reading
- **Total Points** = Imthiyaaz Library Points + Kuthbkhana Classical Reading Points.
- **Imthiyaaz Library Points**:
  - Full read: $(\frac{\text{Pages}}{10}) \times \text{Rate}$
  - Half read: $\frac{\text{Full Points}}{2}$
  - Custom read: $(\frac{\text{Pages Read}}{10}) \times \text{Rate}$
  - Reviews: Added directly.
- **Kuthbkhana Classical Reading**:
  - Types: Muthala (classical text study) & Point Picking (research/thesis analysis).
  - Formula: $\text{Base Score} \times \text{Subcategory Weight}$.
  - Texts: Fathul Mueen, Safinathun-Naja, Ihya Uloomiddin, Minhajut-Thalibeen, Tafseer Al-Jalalayn, Riyadus-Saliheen, Bulughul Maram, etc.

---

## 5. User Roles and Access Control

| Role | Permissions & Scope |
|---|---|
| `SUPER_ADMIN` | Unrestricted access: user management, master data, weights, scoring rules, all modules. |
| `ADMIN` | Student management, academic mark entry, competitions, leaderboards. Restricted from altering master system settings. |
| `CREATIVE_HUB_ADMIN` | Creative Hub submissions, approvals, and permitted views. |
| `KUTHBKHANA_ADMIN` | Kuthbkhana classical reading entries, validations, and reports. |
| `TEACHER` | Enter/edit marks for assigned academic classes and subjects. |
| `VIEWER` | Read-only access to dossiers, public portal, and leaderboards. |

*Compatibility Note*: In the Phase 1 schema, `app_role` has `admin`, `coordinator`, `teacher`, `viewer`. Role mapping supports these while enabling module-specific administrative delegations.

---

## 6. Public Portal & Experiences

1. **Landing Portal (`/`)**:
   - Institutional branding, title, emblems.
   - Top 1, 2, 3 podium cards with gold/silver/bronze treatments.
   - Search and filter controls (Class, School, Category, Stream, Festival).
   - Secret triple-click dark mode toggle in hero sky (`spr_theme` key in `localStorage`).
2. **Master & Category Leaderboards (`/leaderboard`, `/categories`, `/categories/[id]`)**:
   - Rank, avatar, full name, SPR ID, class, school, category breakdown, total SPR points.
   - Standard competition ties (1, 1, 3) with tie badges.
3. **Student Dossier & A4 Print Studio (`/student/[id]`)**:
   - Profile card, ranks (overall, class, school), points breakdown.
   - Academic drawers with Exam Actual Max vs Target scaling.
   - A4 Print Studio: OFFICIAL (transcript), COMPACT (summary), CUSTOM (granular selections) with print CSS.
4. **TV / Projector Display Mode (`/display`)**:
   - 16:9 large display layout, dark aesthetics, digital clock.
   - Smooth auto-scrolling, ~60-second silent refresh, public-safe data only.
5. **Public Student Issue Reporting Modal**:
   - Inaccuracy reporting: student name/ID, reporter name, message, status (PENDING/REVIEWED/RESOLVED). Private admin notes.
6. **Public News & Announcements (`/updates`)**:
   - Institutional updates, image cards, detail modal.
