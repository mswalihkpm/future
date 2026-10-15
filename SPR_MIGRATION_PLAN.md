# SPR Database Migration Plan

**Database Target**: Lovable Cloud (Supabase Managed PostgreSQL)  
**Safety Protocol**: Strictly Non-Destructive, Additive-Only Evolution  
**Principle**: Zero Data Loss, Backward Compatibility, Reversible Operations

---

## 1. Migration Overview & Strategy

The application currently has 10 base tables scaffolded by Lovable. We will introduce safe, additive tables, views, and functions to support the full SPR feature set.

No existing table will be dropped.  
No column will be removed.  
No existing records will be deleted.

---

## 2. Phased Migration Stages

### Stage 1: Core Master Data Expansion (Safe & Additive)

- **Table Alterations**:
  - `students`: Add columns `institutional_id text`, `division text`, `notes text`, `status text not null default 'ACTIVE'`.
- **New Tables**:
  - `academic_streams`: Support streams like `Jamiathul Hind Al-Islamiyya`, `Ma'din Academy`.
  - `academic_syllabuses`: Support syllabuses like `Kerala State Board`, `NCERT`.
  - `academic_terms`: Terms per academic year (e.g. `Term 1`, `Term 2`, `Annual`).
  - `academic_exams`: Exam definitions with `actual_max_score numeric` (default 100 for Islamic, 130 for School) and `target_mark numeric`.
  - `academic_subjects`: Subjects mapped to streams or syllabuses with dynamic column ordering.
  - `academic_exam_marks`: Itemized marks per student, exam, and subject.

### Stage 2: Specialized Category Registries

- **Literary & Competitions**:
  - `literary_events`: Events such as `Sahityotsav`, `Jamia Maharjan`, `M-Lit Fest`, `Kerala School Kalotsav` linked to academic year.
  - `literary_competitions`: Competitions within events with level (`Campus`, `School`, `Division`, `District`, `Da'eera`, `State`, `National`, `International`).
  - `competition_results`: Student rankings, prizes (1st, 2nd, 3rd, participation), base scores, prize multipliers, level multipliers, and calculated points.
- **Creative Hub**:
  - `creative_forms`: Forms (`Research Paper`, `Story`, `Article`, `Poem`, `Book Review`, `Response`, `Letter`, `Others`) with default base scores.
  - `published_media`: Media (`Newspaper`, `Magazine`, `Wall Magazine`, `Digital Portal`, `Journal`) with weight factors.
  - `creative_submissions`: Student creative submissions with direct points or formula-derived points.
- **Kuthbkhana Classical Reading**:
  - `kuthbkhana_texts`: Autocomplete classical text registry (`Fathul Mueen`, `Safinathun-Naja`, etc.).
  - `kuthbkhana_readings`: Student readings (`Muthala`, `Point Picking`), base score, subcategory weight, and earned points.
- **Library Integration (Imthiyaaz Library)**:
  - `library_settings`: Integration settings (endpoint URL, last sync timestamp, reading rates).
  - `library_reading_records`: Sync records matched by **exact SPR Student ID only**.

### Stage 3: Operational & Public Communication Tables

- `news_articles`: Updates, image URLs, publication status.
- `student_issue_reports`: Public inaccuracy reports with status (`PENDING`, `REVIEWED`, `RESOLVED`) and private admin notes.
- `audit_logs`: Traceable sensitive action logs.
- `import_histories`: Detailed Excel/CSV batch import logs and error tallies.
- `scoring_rules`: Configurable prize multipliers, level multipliers, and base scores.

### Stage 4: Scoring Views Evolution

- Update `student_category_scores` and `student_spr` views to mirror the pure **unlimited numerical points model**:
  - Sum of earned points across all active categories.
  - RLS policies allowing public anonymous read for leaderboard/public profile projections while restricting private student notes and reporter identities.

---

## 3. Rollback & Recovery Plan

- Every migration step is versioned and applied incrementally.
- Views can be recreated without data migration.
- Additive columns have safe defaults (`null` or default values) to prevent breaking existing queries.
