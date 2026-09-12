-- =============================================================================
-- anotAI — Schema do banco (Supabase / PostgreSQL)
-- =============================================================================
-- Como aplicar:
--   1. Abra o painel do seu projeto em https://supabase.com/dashboard
--   2. Menu lateral -> "SQL Editor" -> "New query"
--   3. Cole o conteúdo INTEIRO deste arquivo
--   4. Clique em "Run"
-- Pode ser executado do zero em um projeto novo. É seguro reexecutar
-- (usa IF NOT EXISTS / CREATE OR REPLACE onde possível).
-- =============================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

do $$ begin
  create type contact_channel as enum ('whatsapp', 'talkmi', 'email');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lesson_status as enum (
    'interest', 'alignment', 'quote', 'pre_reservation', 'confirmed', 'completed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type quote_status as enum ('not_sent', 'sent', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum (
    'pix_cnpj', 'pix_machine', 'credit_card', 'debit_card', 'cash'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type teacher_check_status as enum ('not_contacted', 'waiting', 'available', 'unavailable');
exception when duplicate_object then null; end $$;

do $$ begin
  create type weekday_enum as enum (
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum (
    'payment_deadline', 'lesson_date_passed', 'schedule_conflict'
  );
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- FUNÇÃO utilitária: updated_at automático
-- -----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- -----------------------------------------------------------------------------
-- CONTRATOS (contracts)
-- -----------------------------------------------------------------------------

create sequence if not exists contracts_display_number_seq start 1;

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  display_number integer not null unique default nextval('contracts_display_number_seq'),
  client_name text not null,
  phone text not null,
  email text,
  contact_channel contact_channel,
  is_member boolean,
  -- Cor de identificação no calendário: cíclica sobre uma paleta controlada de 10 tons
  -- (ver src/lib/colors.ts no front-end) — nunca cor aleatória "livre".
  color_index integer generated always as ((display_number - 1) % 10) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_contracts_updated_at on contracts;
create trigger trg_contracts_updated_at
  before update on contracts
  for each row execute function set_updated_at();

create index if not exists idx_contracts_display_number on contracts (display_number);

-- -----------------------------------------------------------------------------
-- PROFESSORES (teachers)
-- -----------------------------------------------------------------------------

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  priority_order integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_teachers_priority_order on teachers (priority_order);

-- -----------------------------------------------------------------------------
-- AULAS (lessons) — pertencem a uma contratação
-- -----------------------------------------------------------------------------

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete cascade,
  lesson_number integer not null, -- 1, 2, 3... dentro da contratação (ver trigger abaixo)

  date date,               -- null enquanto "sem data definida"
  base_time time,          -- horário-base escolhido na interface
  actual_start_time time,  -- horário real da aula, após eventual ajuste operacional

  status lesson_status not null default 'interest',
  selected_teacher_id uuid references teachers (id) on delete set null,

  quote_amount numeric(10, 2),
  quote_sent_at date,
  quote_status quote_status not null default 'not_sent',

  amount_paid numeric(10, 2),
  payment_method payment_method,
  expected_payment_date date,
  actual_payment_date date,
  payment_status payment_status not null default 'pending',

  rooftop boolean not null default false,
  frans_cafe boolean not null default false,
  complement_notes text,
  special_requirements text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (contract_id, lesson_number)
);

drop trigger if exists trg_lessons_updated_at on lessons;
create trigger trg_lessons_updated_at
  before update on lessons
  for each row execute function set_updated_at();

-- Numeração automática da aula dentro da contratação (Aula 01, 02, 03...).
-- Evita cálculo de COUNT+1 no front-end (mesma lógica de #009 da Parte 3, aplicada aqui a aulas).
create or replace function set_lesson_number()
returns trigger as $$
begin
  if new.lesson_number is null then
    select coalesce(max(lesson_number), 0) + 1
      into new.lesson_number
      from lessons
      where contract_id = new.contract_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_lessons_number on lessons;
create trigger trg_lessons_number
  before insert on lessons
  for each row execute function set_lesson_number();

create index if not exists idx_lessons_contract_id on lessons (contract_id);
create index if not exists idx_lessons_date on lessons (date);
create index if not exists idx_lessons_status on lessons (status);
create index if not exists idx_lessons_payment_status on lessons (payment_status);

-- -----------------------------------------------------------------------------
-- CONSULTA DE PROFESSORES POR AULA (lesson_teacher_checks)
-- -----------------------------------------------------------------------------

create table if not exists lesson_teacher_checks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons (id) on delete cascade,
  teacher_id uuid not null references teachers (id) on delete cascade,
  status teacher_check_status not null default 'not_contacted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, teacher_id)
);

drop trigger if exists trg_teacher_checks_updated_at on lesson_teacher_checks;
create trigger trg_teacher_checks_updated_at
  before update on lesson_teacher_checks
  for each row execute function set_updated_at();

create index if not exists idx_teacher_checks_lesson_id on lesson_teacher_checks (lesson_id);

-- -----------------------------------------------------------------------------
-- GRADE FIXA RECORRENTE (weekly_schedule)
-- -----------------------------------------------------------------------------

create table if not exists weekly_schedule (
  id uuid primary key default gen_random_uuid(),
  weekday weekday_enum not null,
  start_time time not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (weekday, start_time)
);

drop trigger if exists trg_weekly_schedule_updated_at on weekly_schedule;
create trigger trg_weekly_schedule_updated_at
  before update on weekly_schedule
  for each row execute function set_updated_at();

create index if not exists idx_weekly_schedule_weekday on weekly_schedule (weekday);

-- -----------------------------------------------------------------------------
-- HISTÓRICO (dois níveis — nunca misturar)
-- -----------------------------------------------------------------------------

create table if not exists contract_notes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_contract_notes_contract_id on contract_notes (contract_id);

create table if not exists lesson_notes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_lesson_notes_lesson_id on lesson_notes (lesson_id);

-- -----------------------------------------------------------------------------
-- FEEDBACK (opcional, 1 por aula)
-- -----------------------------------------------------------------------------

create table if not exists lesson_feedback (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references lessons (id) on delete cascade,
  image_url text,
  description text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- NOTIFICAÇÕES — armazena apenas "visualizada", nunca "resolvida"
-- (a condição real é recalculada a partir dos dados; ver Parte 3, item 31)
-- -----------------------------------------------------------------------------

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  type notification_type not null,
  entity_id uuid not null, -- id da lesson (ou outra entidade, conforme o tipo)
  seen boolean not null default false,
  created_at timestamptz not null default now(),
  unique (type, entity_id)
);

create index if not exists idx_notifications_seen on notifications (seen);

-- -----------------------------------------------------------------------------
-- DADOS INICIAIS — professores (ordem de preferência real, Parte 1 item 19)
-- -----------------------------------------------------------------------------

insert into teachers (name, priority_order, active)
values
  ('Raphael BrunON', 1, true),
  ('Gersinho Marques', 2, true),
  ('Ton', 3, true),
  ('Bruno Beroso', 4, true),
  ('Thiago Pardal', 5, true)
on conflict (priority_order) do nothing;

-- -----------------------------------------------------------------------------
-- STORAGE — bucket para imagens de feedback
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('feedback-images', 'feedback-images', true)
on conflict (id) do nothing;

-- Row Level Security (RLS) e políticas de acesso: ver supabase/auth-policies.sql
-- (mantido em arquivo separado — não precisa ser reexecutado sempre que o schema mudar).

-- =============================================================================
-- Fim do schema.
-- =============================================================================
