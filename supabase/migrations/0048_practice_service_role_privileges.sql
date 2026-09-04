-- Allow trusted server-side maintenance and controlled environment transfers.
grant select, insert, update, delete on table public.practice_drills to service_role;
grant select, insert, update, delete on table public.practice_days to service_role;
grant select, insert, update, delete on table public.daily_practice_plans to service_role;
grant select, insert, update, delete on table public.practice_plan_drills to service_role;
