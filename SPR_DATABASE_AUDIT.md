# SPR Database Audit & Schema Verification

**Database Provider**: Lovable Cloud (Supabase Managed PostgreSQL)  
**Host**: `itopsttdmtcklrkginnx.supabase.co`  
**Audit Timestamp**: 2026-10-15  
**Connection Status**: Active & Verified via Client & Node test harness  

---

## 1. Verified Live Tables and Current Row Counts

| Schema Table | Status in DB | Row Count | Primary Key | Key Relationships / Foreign Keys |
|---|---|---|---|---|
| `profiles` | Present | 0 | `id` (uuid -> auth.users) | One-to-one with auth.users |
| `user_roles` | Present | 0 | `id` (uuid) | `user_id` -> auth.users, unique `(user_id, role)` |
| `institutions` | Present | 0 | `id` (uuid) | Referenced by `classes` |
| `academic_years` | Present | 0 | `id` (uuid) | Partial unique index on `is_current = true` |
| `classes` | Present | 0 | `id` (uuid) | `institution_id`, `academic_year_id` |
| `houses` | Present | 0 | `id` (uuid) | Referenced by `students` |
| `students` | Present | 0 | `id` (uuid) | `spr_id` unique, `class_id`, `house_id` |
| `spr_categories` | Present | 0* | `id` (uuid) | `code` unique, `weight` numeric(30,20) |
| `assessment_items` | Present | 0 | `id` (uuid) | `category_id` -> `spr_categories` |
| `assessment_records` | Present | 0 | `id` (uuid) | `student_id`, `item_id`, `academic_year_id` |

*\* Note: `spr_categories` was seeded in the initial Drizzle migration file (`0000_migration.sql`) with 7 rows, but has an RLS policy permitting only `authenticated` staff to select. Anonymous queries return 0 rows.*

---

## 2. Views, Triggers, and Stored Procedures

### 2.1 Database Views
1. `public.student_category_scores`:
   - Calculates `sum(r.score) / nullif(sum(r.max_score), 0) as normalized_score` grouped by student, year, category.
   - **Gap**: Assumes 0..1 normalized score rather than raw unlimited points.
2. `public.student_spr`:
   - Calculates `round(100 * sum(c.weight * s.normalized_score) / (select total from w), 4) as spr_percentage`.
   - **CRITICAL MISMATCH**: Implements the obsolete 0–100% percentage matrix. Must be upgraded to calculate total raw/unlimited points.

### 2.2 Security Definer Functions & Triggers
1. `public.prevent_spr_id_change()`:
   - Attached to `before update on public.students`.
   - **Verified**: Raises exception `SPR Student ID is permanent and cannot be changed` if `new.spr_id is distinct from old.spr_id`.
2. `public.handle_new_user()`:
   - Attached to `after insert on auth.users`.
   - Creates profile and grants first user the `admin` role automatically (one-time bootstrap).
3. `public.has_role(_user_id uuid, _role public.app_role)`:
   - Checks membership in `public.user_roles`.
4. `public.is_staff(_user_id uuid)`:
   - Checks if user has any assigned role.
5. `public.can_manage(_user_id uuid)`:
   - Checks if user has `admin` or `coordinator` role.

---

## 3. Schema Gap Analysis: Original 31 Models vs Current Schema

The original SPR production platform documented 31 relational entities. The current database only possesses 10 generic tables from the Phase 1 scaffold.

| Original Conceptual Entity | Current Status | Required Action |
|---|---|---|
| `Student` | Present in `students` | **Expand**: Add `institutional_id`, `division`, `academic_year_id`, `notes`, `status` (`ACTIVE`/`INACTIVE`/`ALUMNI`). |
| `Institution` / `Class` / `AcademicYear` | Present | Retain. Add board/syllabus and stream links. |
| `Stream` (Jamiathul Hind / Ma'din Academy) | Missing | Add table `academic_streams`. |
| `Board` / `Syllabus` (Kerala State / NCERT) | Missing | Add table `academic_syllabuses`. |
| `Term` & `Exam` (Actual Max vs Target Mark) | Missing | Add `academic_terms` and `academic_exams` (with `actual_max_score` and `target_mark`). |
| `Subject` (Dynamic columns & mark entry) | Missing | Add `academic_subjects` and `academic_exam_marks`. |
| `LiteraryEvent` & `LiteraryCompetition` | Missing | Add tables `literary_events` and `literary_competitions`. |
| `CreativeForm` & `PublishedMedia` | Missing | Add tables `creative_forms` and `published_media` with base scores & weights. |
| `CreativeSubmission` | Missing | Add table `creative_submissions` (student, form, media, title, url, score, status, remarks). |
| `KuthbkhanaReading` | Missing | Add table `kuthbkhana_readings` (student, book, type: muthala/point_picking, base_score, subcategory_weight, earned_points). |
| `LibraryIntegrationSettings` & `LibraryRecord` | Missing | Add `library_settings` and `library_reading_records` (for Imthiyaaz library sync by exact SPR ID). |
| `ScoringSettings` (Prize & Level multipliers) | Hardcoded/Missing | Add table `scoring_rules` (prize base scores 100/75/50, prize multipliers 2.0/1.5/1.0, festival level multipliers 1.0 to 5.0). |
| `News` / `Announcements` | Missing | Add table `news_articles` (title, subtitle, content, image_url, published_at, is_published). |
| `StudentIssueReport` | Missing | Add table `student_issue_reports` (student_id, student_name, reporter_name, message, status, admin_notes). |
| `AuditLog` | Missing | Add table `audit_logs` (action, entity_name, entity_id, actor_id, changes_json, created_at). |
| `ImportHistory` | Missing | Add table `import_histories` (module, file_name, total_rows, success_count, error_count, error_log, created_by). |

---

## 4. Security & Data Integrity Assessment

1. **Secrets Security**:
   - `SUPABASE_SERVICE_ROLE_KEY` is kept server-side only in `.env` and `client.server.ts`.
   - Never exposed to browser bundle.
   - Client queries use `VITE_SUPABASE_PUBLISHABLE_KEY` with RLS.
2. **Row Level Security (RLS)**:
   - All 10 existing tables have RLS enabled.
   - Public read access is currently restricted by RLS on `spr_categories` and `students`.
   - For the public portal (leaderboard, student public profiles, display mode, categories), safe public views or explicit `to anon, authenticated` read policies on non-private columns must be added.
3. **Data Loss Risk**:
   - Live row count is currently 0 in all tables.
   - **Zero risk of production data loss on existing records**, but all modifications will be strictly additive and non-destructive.
