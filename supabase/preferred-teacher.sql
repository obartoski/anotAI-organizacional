-- Preferência de professor da contratação

alter table contracts
add column if not exists preferred_teacher_id uuid
references teachers(id)
on delete set null;
