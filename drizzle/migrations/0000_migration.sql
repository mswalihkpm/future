-- ============ ROLES & PROFILES ============
create type public.app_role as enum ('admin', 'coordinator', 'teacher', 'viewer');

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index idx_user_roles_user on public.user_roles(user_id);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

create or replace function public.can_manage(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','coordinator'))
$$;

create policy "Users read own profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- New users get a profile. The very first account becomes admin (bootstrap);
-- every later account has no role until an admin assigns one.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.email);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ============ ACADEMIC STRUCTURE ============
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on > starts_on)
);
create unique index uq_academic_years_current on public.academic_years(is_current) where is_current;

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  name text not null,
  section text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, academic_year_id, name, section)
);
create index idx_classes_year on public.classes(academic_year_id);

create table public.houses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ============ STUDENTS ============
create table public.students (
  id uuid primary key default gen_random_uuid(),
  spr_id text not null unique,
  full_name text not null,
  father_name text,
  date_of_birth date,
  student_type text,
  class_id uuid references public.classes(id) on delete set null,
  house_id uuid references public.houses(id) on delete set null,
  photo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(spr_id)) > 0)
);
create index idx_students_class on public.students(class_id);
create index idx_students_house on public.students(house_id);
create index idx_students_name on public.students(lower(full_name));

-- SPR Student IDs are permanent
create or replace function public.prevent_spr_id_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.spr_id is distinct from old.spr_id then
    raise exception 'SPR Student ID is permanent and cannot be changed';
  end if;
  return new;
end; $$;
create trigger trg_students_spr_id before update on public.students for each row execute function public.prevent_spr_id_change();

-- ============ SPR CATEGORIES & ASSESSMENTS ============
create table public.spr_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  weight numeric(30,20) not null check (weight >= 0),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assessment_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.spr_categories(id) on delete cascade,
  name text not null,
  max_score numeric(10,2) not null check (max_score > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, name)
);
create index idx_assessment_items_category on public.assessment_items(category_id);

create table public.assessment_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  item_id uuid not null references public.assessment_items(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  score numeric(10,2) not null check (score >= 0),
  max_score numeric(10,2) not null check (max_score > 0),
  remarks text,
  assessed_on date not null default current_date,
  recorded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (score <= max_score)
);
create index idx_records_student_year on public.assessment_records(student_id, academic_year_id);
create index idx_records_item on public.assessment_records(item_id);

-- updated_at triggers
create trigger trg_institutions_updated before update on public.institutions for each row execute function public.set_updated_at();
create trigger trg_years_updated before update on public.academic_years for each row execute function public.set_updated_at();
create trigger trg_classes_updated before update on public.classes for each row execute function public.set_updated_at();
create trigger trg_students_updated before update on public.students for each row execute function public.set_updated_at();
create trigger trg_categories_updated before update on public.spr_categories for each row execute function public.set_updated_at();
create trigger trg_items_updated before update on public.assessment_items for each row execute function public.set_updated_at();
create trigger trg_records_updated before update on public.assessment_records for each row execute function public.set_updated_at();

-- ============ GRANTS & RLS ============
grant select, insert, update, delete on public.institutions, public.academic_years, public.classes, public.houses,
  public.students, public.spr_categories, public.assessment_items, public.assessment_records to authenticated;
grant all on public.institutions, public.academic_years, public.classes, public.houses,
  public.students, public.spr_categories, public.assessment_items, public.assessment_records to service_role;

alter table public.institutions enable row level security;
alter table public.academic_years enable row level security;
alter table public.classes enable row level security;
alter table public.houses enable row level security;
alter table public.students enable row level security;
alter table public.spr_categories enable row level security;
alter table public.assessment_items enable row level security;
alter table public.assessment_records enable row level security;

do $$
declare t text;
begin
  foreach t in array array['institutions','academic_years','classes','houses','students','assessment_items'] loop
    execute format('create policy "Staff read" on public.%I for select to authenticated using (public.is_staff(auth.uid()))', t);
    execute format('create policy "Managers write" on public.%I for all to authenticated using (public.can_manage(auth.uid())) with check (public.can_manage(auth.uid()))', t);
  end loop;
end $$;

create policy "Staff read" on public.spr_categories for select to authenticated using (public.is_staff(auth.uid()));
create policy "Admins write" on public.spr_categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "Staff read" on public.assessment_records for select to authenticated using (public.is_staff(auth.uid()));
create policy "Assessors insert" on public.assessment_records for insert to authenticated
  with check ((public.can_manage(auth.uid()) or public.has_role(auth.uid(),'teacher')) and recorded_by = auth.uid());
create policy "Managers or author update" on public.assessment_records for update to authenticated
  using (public.can_manage(auth.uid()) or recorded_by = auth.uid())
  with check (public.can_manage(auth.uid()) or recorded_by = auth.uid());
create policy "Managers delete" on public.assessment_records for delete to authenticated using (public.can_manage(auth.uid()));

-- ============ SPR CALCULATION ============
-- Category score = sum(score)/sum(max_score) in [0,1].
-- Final SPR = 100 * sum(w_i * s_i) / sum(w_i) over active categories,
-- so the maximum is exactly 100 regardless of weight rounding.
create or replace view public.student_category_scores with (security_invoker = true) as
select r.student_id, r.academic_year_id, i.category_id,
       sum(r.score) / nullif(sum(r.max_score), 0) as normalized_score
from public.assessment_records r
join public.assessment_items i on i.id = r.item_id
group by r.student_id, r.academic_year_id, i.category_id;

create or replace view public.student_spr with (security_invoker = true) as
with w as (select sum(weight) as total from public.spr_categories where is_active)
select s.student_id, s.academic_year_id,
       round(100 * sum(c.weight * s.normalized_score) / (select total from w), 4) as spr_percentage
from public.student_category_scores s
join public.spr_categories c on c.id = s.category_id and c.is_active
group by s.student_id, s.academic_year_id;

grant select on public.student_category_scores, public.student_spr to authenticated;

-- Seed the seven top-level categories (configuration, not student data).
insert into public.spr_categories (code, name, weight, sort_order) values
  ('islamic_studies', 'Islamic Studies', 20, 1),
  ('school_studies', 'School Studies', 80.0/6, 2),
  ('qualification', 'Qualification', 80.0/6, 3),
  ('creative_hub', 'Creative Hub', 80.0/6, 4),
  ('library_reading', 'Library & Reading', 80.0/6, 5),
  ('literary_programmes', 'Literary Programmes', 80.0/6, 6),
  ('programmes_competitions', 'Programmes & Competitions', 80.0/6, 7);
