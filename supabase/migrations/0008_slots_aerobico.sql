-- Aeróbico no fim de cada treino: slot do tipo 'aerobico' com duração em minutos.
-- Nos slots de musculação, minutos fica nulo.
alter table public.slots drop constraint slots_tipo_check;
alter table public.slots add constraint slots_tipo_check check (tipo in ('composto', 'acessorio', 'aerobico'));
alter table public.slots add column minutos smallint check (minutos between 5 and 120);
alter table public.slots add constraint slots_minutos_aerobico check ((tipo = 'aerobico') = (minutos is not null));
-- A coluna nova segue a regra do slot: só select e insert pela API.
