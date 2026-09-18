-- Add interaction_type 'whatsapp' and reclassify rows imported from WhatsApp
-- by source_system (idempotent). Does not touch Apple Messages or other sources.

alter table public.recruiting_interactions
  drop constraint if exists recruiting_interactions_type_valid;

alter table public.recruiting_interactions
  add constraint recruiting_interactions_type_valid check (
    interaction_type in (
      'call',
      'text',
      'email',
      'message',
      'visit',
      'meeting',
      'note',
      'other',
      'whatsapp'
    )
  );

update public.recruiting_interactions
set interaction_type = 'whatsapp',
    updated_at = now()
where source_system = 'whatsapp'
  and interaction_type is distinct from 'whatsapp';
