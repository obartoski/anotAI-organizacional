-- =============================================================================
-- anotAI — Schema do banco (Supabase / PostgreSQL)
-- =============================================================================
-- V1 funcional do anotAI
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- =============================================================================


-- =============================================================================
-- EXTENSÕES
-- =============================================================================

create extension if not exists "pgcrypto";


-- =============================================================================
-- ENUMS
-- =============================================================================

do $$ begin
  create type contact_channel as enum (
    'whatsapp',
    'talkmi',
    'email'
  );
exception
  when duplicate_object then null;
end $$;


do $$ begin
  create type lesson_status as enum (
    'interest',
    'alignment',
    'quote',
    'pre_reservation',
    'confirmed',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;


do $$ begin
  create type quote_status as enum (
    'not_sent',
    'sent',
    'approved',
    'rejected'
  );
exception
  when duplicate_object then null;
end $$;


do $$ begin
  create type payment_status as enum (
    'pending',
    'paid'
  );
exception
  when duplicate_object then null;
end $$;


do $$ begin
  create type payment_method as enum (
    'pix_cnpj',
    'pix_machine',
    'credit_card',
    'debit_card',
    'cash'
  );
exception
  when duplicate_object then null;
end $$;


do $$ begin
  create type teacher_check_status as enum (
    'not_contacted',
    'waiting',
    'available',
    'unavailable'
  );
exception
  when duplicate_object then null;
end $$;


do $$ begin
  create type weekday_enum as enum (
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
  );
exception
  when duplicate_object then null;
end $$;


do $$ begin
  create type notification_type as enum (
    'payment_deadline',
    'lesson_date_passed',
    'schedule_conflict'
  );
exception
  when duplicate_object then null;
end $$;


-- =============================================================================
-- FUNÇÃO: updated_at automático
-- =============================================================================

create or replace function set_updated_at()
returns trigger
as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- =============================================================================
-- CONTRATAÇÕES
-- =============================================================================

create sequence if not exists contracts_display_number_seq
start 1;


create table if not exists contracts (

  id uuid primary key default gen_random_uuid(),

  display_number integer
    not null
    unique
    default nextval('contracts_display_number_seq'),

  client_name text not null,

  phone text not null,

  email text,

  contact_channel contact_channel,

  is_member boolean,

  color_index integer
    generated always as ((display_number - 1) % 10) stored,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


drop trigger if exists trg_contracts_updated_at
on contracts;


create trigger trg_contracts_updated_at
before update on contracts
for each row
execute function set_updated_at();


create index if not exists idx_contracts_display_number
on contracts (display_number);


-- =============================================================================
-- PROFESSORES
-- =============================================================================

create table if not exists teachers (

  id uuid primary key default gen_random_uuid(),

  name text not null,

  priority_order integer not null,

  active boolean
    not null
    default true,

  created_at timestamptz
    not null
    default now()
);


create unique index if not exists idx_teachers_priority_order
on teachers (priority_order);


-- =============================================================================
-- AULAS
-- =============================================================================

create table if not exists lessons (

  id uuid primary key default gen_random_uuid(),

  contract_id uuid
    not null
    references contracts(id)
    on delete cascade,

  lesson_number integer not null,

  date date,

  base_time time,

  actual_start_time time,

  status lesson_status
    not null
    default 'interest',

  selected_teacher_id uuid
    references teachers(id)
    on delete set null,

  quote_amount numeric(10,2),

  quote_sent_at date,

  quote_status quote_status
    not null
    default 'not_sent',

  amount_paid numeric(10,2),

  payment_method payment_method,

  expected_payment_date date,

  actual_payment_date date,

  payment_status payment_status
    not null
    default 'pending',

  rooftop boolean
    not null
    default false,

  frans_cafe boolean
    not null
    default false,

  complement_notes text,

  special_requirements text,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (contract_id, lesson_number)
);


drop trigger if exists trg_lessons_updated_at
on lessons;


create trigger trg_lessons_updated_at
before update on lessons
for each row
execute function set_updated_at();


-- =============================================================================
-- NUMERAÇÃO AUTOMÁTICA DAS AULAS
-- =============================================================================

create or replace function set_lesson_number()
returns trigger
as $$
begin

  if new.lesson_number is null then

    select
      coalesce(max(lesson_number), 0) + 1

    into new.lesson_number

    from lessons

    where contract_id = new.contract_id;

  end if;

  return new;

end;
$$ language plpgsql;


drop trigger if exists trg_lessons_number
on lessons;


create trigger trg_lessons_number
before insert on lessons
for each row
execute function set_lesson_number();


create index if not exists idx_lessons_contract_id
on lessons (contract_id);

create index if not exists idx_lessons_date
on lessons (date);

create index if not exists idx_lessons_status
on lessons (status);

create index if not exists idx_lessons_payment_status
on lessons (payment_status);


-- =============================================================================
-- CONSULTA DE PROFESSORES POR AULA
-- =============================================================================

create table if not exists lesson_teacher_checks (

  id uuid primary key default gen_random_uuid(),

  lesson_id uuid
    not null
    references lessons(id)
    on delete cascade,

  teacher_id uuid
    not null
    references teachers(id)
    on delete cascade,

  status teacher_check_status
    not null
    default 'not_contacted',

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (lesson_id, teacher_id)
);


drop trigger if exists trg_teacher_checks_updated_at
on lesson_teacher_checks;


create trigger trg_teacher_checks_updated_at
before update on lesson_teacher_checks
for each row
execute function set_updated_at();


create index if not exists idx_teacher_checks_lesson_id
on lesson_teacher_checks (lesson_id);


-- =============================================================================
-- GRADE FIXA RECORRENTE
-- =============================================================================

create table if not exists weekly_schedule (

  id uuid primary key default gen_random_uuid(),

  weekday weekday_enum
    not null,

  start_time time
    not null,

  active boolean
    not null
    default true,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (weekday, start_time)
);


drop trigger if exists trg_weekly_schedule_updated_at
on weekly_schedule;


create trigger trg_weekly_schedule_updated_at
before update on weekly_schedule
for each row
execute function set_updated_at();


create index if not exists idx_weekly_schedule_weekday
on weekly_schedule (weekday);


-- =============================================================================
-- HISTÓRICO GERAL DA CONTRATAÇÃO
-- =============================================================================

create table if not exists contract_notes (

  id uuid primary key default gen_random_uuid(),

  contract_id uuid
    not null
    references contracts(id)
    on delete cascade,

  text text not null,

  created_at timestamptz
    not null
    default now()
);


create index if not exists idx_contract_notes_contract_id
on contract_notes (contract_id);


-- =============================================================================
-- HISTÓRICO INDIVIDUAL DA AULA
-- =============================================================================

create table if not exists lesson_notes (

  id uuid primary key default gen_random_uuid(),

  lesson_id uuid
    not null
    references lessons(id)
    on delete cascade,

  text text not null,

  created_at timestamptz
    not null
    default now()
);


create index if not exists idx_lesson_notes_lesson_id
on lesson_notes (lesson_id);


-- =============================================================================
-- FEEDBACK
-- =============================================================================

create table if not exists lesson_feedback (

  id uuid primary key default gen_random_uuid(),

  lesson_id uuid
    not null
    unique
    references lessons(id)
    on delete cascade,

  image_url text,

  description text,

  created_at timestamptz
    not null
    default now()
);


-- =============================================================================
-- NOTIFICAÇÕES
-- =============================================================================

create table if not exists notifications (

  id uuid primary key default gen_random_uuid(),

  type notification_type
    not null,

  entity_id uuid
    not null,

  seen boolean
    not null
    default false,

  created_at timestamptz
    not null
    default now(),

  unique (type, entity_id)
);


create index if not exists idx_notifications_seen
on notifications (seen);


-- =============================================================================
-- PROFESSORES INICIAIS
-- =============================================================================

insert into teachers (
  name,
  priority_order,
  active
)
values

  ('Raphael BrunON', 1, true),

  ('Gersinho Marques', 2, true),

  ('Ton', 3, true),

  ('Bruno Beroso', 4, true),

  ('Thiago Pardal', 5, true)

on conflict (priority_order)
do nothing;


-- =============================================================================
-- STORAGE
-- =============================================================================

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'feedback-images',
  'feedback-images',
  true
)
on conflict (id)
do update
set public = true;


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
-- IMPORTANTE:
--
-- A V1 ainda não possui login.
--
-- Estas políticas permitem acesso através da anon key do Supabase.
-- Isso serve para nossos testes atuais.
--
-- Antes de utilizar dados reais/sensíveis de clientes em produção,
-- devemos adicionar autenticação e restringir estas políticas.
-- =============================================================================


do $$

declare
  t text;

begin

  for t in

    select unnest(
      array[
        'contracts',
        'lessons',
        'teachers',
        'lesson_teacher_checks',
        'weekly_schedule',
        'contract_notes',
        'lesson_notes',
        'lesson_feedback',
        'notifications'
      ]
    )

  loop

    execute format(
      'alter table %I enable row level security;',
      t
    );

    execute format(
      'drop policy if exists "allow_all_v1" on %I;',
      t
    );

    execute format(
      'create policy "allow_all_v1"
       on %I
       for all
       using (true)
       with check (true);',
      t
    );

  end loop;

end $$;


-- =============================================================================
-- STORAGE — POLÍTICAS
-- =============================================================================


drop policy if exists "feedback_images_read"
on storage.objects;


create policy "feedback_images_read"
on storage.objects
for select
using (
  bucket_id = 'feedback-images'
);


drop policy if exists "feedback_images_write"
on storage.objects;


create policy "feedback_images_write"
on storage.objects
for insert
with check (
  bucket_id = 'feedback-images'
);


drop policy if exists "feedback_images_update"
on storage.objects;


create policy "feedback_images_update"
on storage.objects
for update
using (
  bucket_id = 'feedback-images'
)
with check (
  bucket_id = 'feedback-images'
);


drop policy if exists "feedback_images_delete"
on storage.objects;


create policy "feedback_images_delete"
on storage.objects
for delete
using (
  bucket_id = 'feedback-images'
);


-- =============================================================================
-- FIM
-- =============================================================================
