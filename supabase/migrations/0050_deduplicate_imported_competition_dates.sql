-- Remove only DOC rows imported by 0049 when the live Schedule already had
-- the same event under a different id. Preserve the pre-existing live row.
do $deduplicate_imported_docs$
declare
  imported_ids uuid[] := array[
    '88cf2b47-1910-48bc-ac8c-a311719642e7', '1411dd6d-e5e4-48bc-847d-7b103ff2465d',
    'd4f12c78-1a1a-4c55-9d64-351d4770e6f3', 'bc83742b-35cc-435e-8c53-7cf586bcea44',
    '19556140-5006-4351-ba12-d3a66b9947f3', 'd46be08b-cc9a-4250-94ad-d7ab029f4955',
    '69cc7432-97db-4007-8496-05f3976a4a3e', 'dd82976a-9d4e-4f09-959f-f720d422e69d',
    '5174d475-687a-4803-90d4-8861a6cdf5d0', '276edfe8-c21a-4507-9981-da216449f32e',
    '8b6cf553-7c89-49f2-b32b-ed85ad6e2b2d', '17804e04-36bc-410e-97ea-8474970dab16',
    '57a9cdde-3449-4341-952c-eaba6d4c8e06', 'b566eb57-cf58-4b59-bf01-88e83cb45d05',
    '71b92929-8bf2-48a2-a9ba-fa88f66b45a8', 'a18b91ba-337b-4c3a-a03e-8b915722d065',
    'dec765dd-a678-4d12-8984-e11d269177e5', '08cb095d-84ad-4a3c-8cd4-1a1d43890b3e',
    '7c6e0593-bde1-4961-9dc5-eb8907eaee1e', 'bdcb0b07-8db8-47e2-a310-d473c32a8427',
    'd26f5c33-f09b-4b61-a021-00551eb0a46f', 'a6255509-66f0-4b6a-b8f9-00c95ad141f0',
    '4b84501b-5611-4137-b4b5-1d0c28100008'
  ]::uuid[];
  removed integer;
begin
  delete from public.team_schedule_events imported
   where imported.id = any(imported_ids)
     and imported.counts_as_competition_date is true
     and exists (
       select 1
         from public.team_schedule_events original
        where original.id <> imported.id
          and original.id <> all(imported_ids)
          and original.start_date = imported.start_date
          and coalesce(original.end_date, original.start_date) = coalesce(imported.end_date, imported.start_date)
          and lower(trim(coalesce(original.opponent_name, original.event_name, ''))) = lower(trim(coalesce(imported.opponent_name, imported.event_name, '')))
     );
  get diagnostics removed = row_count;
  raise notice 'Removed % imported duplicate competition-date rows', removed;
end
$deduplicate_imported_docs$;
