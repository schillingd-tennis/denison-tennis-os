-- Knowledge: Hotels directory. Imported values preserve the named Hotels.csv rows.
create table if not exists public.knowledge_hotels (
  id uuid primary key default gen_random_uuid(),
  import_key text unique,
  name text not null,
  chain text,
  city text not null,
  state text not null,
  rating smallint check (rating between 1 and 5),
  address text,
  notes text,
  team_friendly boolean,
  price_range text,
  dog_entry_rating smallint check (dog_entry_rating between 1 and 5),
  year_stayed text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_hotels_name_idx on public.knowledge_hotels (name);
create index if not exists knowledge_hotels_location_idx on public.knowledge_hotels (state, city);
create index if not exists knowledge_hotels_chain_idx on public.knowledge_hotels (chain);

grant select, insert, update, delete on table public.knowledge_hotels to authenticated;
alter table public.knowledge_hotels enable row level security;
drop policy if exists "Authenticated users can read hotels" on public.knowledge_hotels;
create policy "Authenticated users can read hotels" on public.knowledge_hotels for select to authenticated using (true);
drop policy if exists "Authenticated users can create hotels" on public.knowledge_hotels;
create policy "Authenticated users can create hotels" on public.knowledge_hotels for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update hotels" on public.knowledge_hotels;
create policy "Authenticated users can update hotels" on public.knowledge_hotels for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete hotels" on public.knowledge_hotels;
create policy "Authenticated users can delete hotels" on public.knowledge_hotels for delete to authenticated using (true);

with source as (
  select * from jsonb_to_recordset($hotels$[
{"state":"CA","city":"Pomona","name":"Hilton Garden Inn","rating":3,"notes":"Very nice rooms. Good neighborhood- lots of food nearby. Beds are uncomfortable. And probably a deal breaker","year_stayed":"2025"},
{"state":"CA","city":"Diamond Bar","name":"Holiday Inn","rating":4,"notes":"Very Nice Hotel","year_stayed":"2025"},
{"state":"FL","city":"Boca Raton","name":"Hampton Inn","rating":3,"dog_entry_rating":4,"notes":"dog friendly and clean - good sized room. Stayed in 2026 - Rooms are pretty old and beatup"},
{"state":"FL","city":"Orlando","name":"Hilton Garden Inn","address":"Airport","rating":4,"dog_entry_rating":5,"notes":"Easy to get dogs in and. out of. Pretty big room for non suite. Good location"},
{"state":"FL","city":"Orlando","name":"Hyatt Place","address":"Lake Mary","rating":3,"dog_entry_rating":2,"notes":"Very hard to get dogs into. TV reception poor - rooms are nice"},
{"state":"FL","city":"Orlando","name":"Wyngate","address":"Airport","rating":4,"notes":"(Stayed for Timmy NCAA’s) - nice hotel, clean - good location"},
{"state":"FL","city":"Orlando","name":"Home2 Suites","address":"Airport","rating":4,"dog_entry_rating":5,"notes":"Nice enough, big room, easy to get dogs in and. out of. Not necessarily any better than other hotel I stayed at during NCAAs"},
{"state":"FL","city":"Fort meyers","name":"Hilton Garden Inn","address":"University drive","rating":4,"dog_entry_rating":5,"notes":"Nice hotel. Good location. Rooms a bit dated. Easy to get dogs into. Room is a 3. Hotel and location is a 4. 30 minutes from Dani","year_stayed":"2025"},
{"state":"FL","city":"Wesley Chapel","name":"Hyatt Place","rating":4,"dog_entry_rating":1,"notes":"Very hard to get dogs into - Hyatt also has a $100 dog fee (way too high) - tried to charge me $200. Nice hotel. Clean rooms - but dog piece probably not worth it.","year_stayed":"2026"},
{"state":"GA","city":"Macon North","name":"Candalwood Suites","address":"3957 River Place DriveMacon, GA 31210","rating":3,"dog_entry_rating":4,"notes":"Newly remodeled December 2025i. Room is small and cramped and not a lot of space to spread out a suitcase.","year_stayed":"2025"},
{"state":"GA","city":"Macon","name":"Home2 suites","rating":5,"dog_entry_rating":2,"notes":"Very nice hotel. Right off 75 so easy to get to. Rooms are nice. Clean. only one side entrance and it is a little difficult to get the dogs in. Room key did not work on the side door so that made it even more difficult.","year_stayed":"2026"},
{"state":"GA","city":"Adel","name":"Hampton Inn"},
{"state":"GA","city":"Richmond Hill, Savannah","name":"Home2 suites","rating":4,"dog_entry_rating":5,"notes":"Super easy to get the in. Nice large room, however, TV work very well. Pretty miles south of Savannah. A good stop between Savannah and Jacksonville.","year_stayed":"2026"},
{"state":"IL","city":"Champaign","name":"Home2 suite","rating":4,"dog_entry_rating":5,"notes":"Dog friendly. Very nice suites but halls and carpet a bit dated. Easy to get dogs in back door."},
{"state":"IL","city":"Champaign","name":"Candalwood Suites","rating":3,"dog_entry_rating":5,"notes":"Very easy to get dogs in. Kind of old and a bit dated, however, not too bad if price is the only thing that matters. Certainly livable for a night or 2.","year_stayed":"2026"},
{"state":"IN","city":"Elkhart","name":"Avid","rating":2,"dog_entry_rating":3,"notes":"Small rooms, no frills, but new and clean. Fairlly easy to get dogs in side door."},
{"state":"IN","city":"Naperville","name":"Hampton in","rating":4,"dog_entry_rating":4,"notes":"Very nice suites"},
{"state":"IN","city":"Merrillville","name":"Staybridge Suites","rating":3,"dog_entry_rating":4,"notes":"Pretty nice. Side door access for dogs. Rooms are big and nice. Kitchen Suite -"},
{"state":"IN","city":"Merrillville","name":"Residence inn","rating":2,"dog_entry_rating":3,"notes":"Kind of run down. Furniture in bad shape"},
{"state":"IN","city":"Indianapolis","name":"Candalwood Suites","address":"21st St northeast","rating":1,"dog_entry_rating":3,"notes":"21st St northeast"},
{"state":"IN","city":"Indianapolis","name":"Holday Inn Express","address":"InfoTech Area","rating":4,"dog_entry_rating":3},
{"state":"IN","city":"Indianapolis","name":"Residence Inn","address":"InfoTech Area","rating":4,"dog_entry_rating":5,"notes":"very nice rooms - Big (easy dog access on sides wiht no view from front desk)"},
{"state":"IN","city":"Auburn","name":"Tru by Hilton","rating":4,"dog_entry_rating":5,"notes":"Digital Card in Hilton App is awesome. No going to the front desk and pick my room. Room clean and fine. Not many amenities and no chair or couch or easy angle to watch TV except in bed","year_stayed":"2026"},
{"state":"KS","city":"Overland Park","name":"Holiday Inn Express","rating":3,"dog_entry_rating":3,"notes":"Easy access if you are in the back of the hotel in a “suite”. Hotel needs upgrades. Room is big, but old and hotel is pretty loud","year_stayed":"2025"},
{"state":"KY","city":"Louisville","name":"Residence inn","address":"By Louisville Indoor","rating":5,"dog_entry_rating":5,"notes":"Louisville indoor tennis. Very nice room. Side doors for dogs very accessible. Big suite room"},
{"state":"KY","city":"Williamsburg","name":"Holiday Inn Express","rating":3,"notes":"Under repair. Easy access of Route 75 - but the hotel was nothing special - just Ok, but it is under remodeling.","year_stayed":"2026"},
{"state":"LA","city":"Slidell","name":"Candalwood Suites","rating":2,"dog_entry_rating":5,"notes":"Kind of old. 35 minutes from New Orleans on Northside of Lake Ponch"},
{"state":"MD","city":"Annapolis","name":"Hilton Garden Inn","address":"305 Truman Parkway, Annapolis 21401","rating":4,"dog_entry_rating":4,"notes":"Easy dog entry on the side. Nice hotel - no breakfast. About 15 minutes from Downtown - but lots out in the area it is located.","year_stayed":"2026"},
{"state":"MI","city":"Grand Rapids","name":"Candalwood suites","rating":2,"dog_entry_rating":4,"notes":"Kind of Old and needs an update. Easy to get dogs into. Good location"},
{"state":"MI","city":"Grand Rapids","name":"Hyatt Place Grand Rapids South","address":"2150 Metro Lane SW Wyoming, MI","rating":4,"dog_entry_rating":5,"notes":"Good location in Wyoming. Stuff nearby. Rooms are pretty good. Not anything special. Tv splits 2 rooms which I don’t love","year_stayed":"Jan 2026"},
{"state":"MI","city":"Kalamazoo","name":"Home2","rating":5,"dog_entry_rating":5,"notes":"Very nice. New Hotel - big Rooms. Not really close to campus - but really nice hotel that is connected to TRU by Hilton. Dog fee is $75 for unlimited dogs up to 4 nights - worth paying","year_stayed":"2025"},
{"state":"MI","city":"Kalamazoo","name":"Hampton Inn Airport","address":"Airport","rating":4,"dog_entry_rating":4,"notes":"Nice sized rooms. Big hotel. Plenty of amenities. Breakfast included. Easy to get dogs in side doors. I rooms on first floor","year_stayed":"2023"},
{"state":"MI","city":"Kalamazoo","name":"Towne Place Suites","address":"9th Ave.","rating":1,"dog_entry_rating":3,"notes":"Very old and poor. Probably was another property before. Suppossedly renovating in Nov 2025. Dirty"},
{"state":"MI","city":"Kalamazoo","name":"Holliday Inn Express ( West)","address":"West","rating":4,"dog_entry_rating":4,"notes":"very clean and nice rooms / full breakfast"},
{"state":"MI","city":"Lansing","name":"Hyatt Place","address":"2401 Showtime Drive","rating":3,"dog_entry_rating":2,"notes":"A little difficult to get dogs into. Parking garage is attached next door - only 1st floor entry ( $10 extra charge). No Free parking. Rooms were nice. Free Breakfast. Just a bit difficult to get dog into - but nice rooms. Not easy side entrance.","year_stayed":"2026"},
{"state":"MI","city":"Bay City","name":"Hampton Inn","rating":3,"dog_entry_rating":4,"notes":"Decent enough. Nothing special. Room was dated and old big hallways and easy to get dogs into. Hotel was a little less than average, but serviceable with lots of plugs, etc.."},
{"state":"MS","city":"Haitesburgh","name":"Town Place Suites","rating":1,"dog_entry_rating":5,"notes":"Good Back door entry. Hotel is old and rundown.","year_stayed":"2025 - November"},
{"state":"NC","city":"Mooresville","name":"TownePlace Suites","rating":4,"dog_entry_rating":5,"notes":"Easy to get dogs into. Room pretty nice."},
{"state":"NC","city":"Mooresville","name":"Holiday inn express","rating":2,"notes":"Kind of old and run down. One of the lower HIE I have stayed at. Stayed with Team on spring break","year_stayed":"2026"},
{"state":"SC","city":"Columbia","name":"TownePlace Suites","address":"250 East Exchange Blvd","rating":4,"dog_entry_rating":3,"notes":"Nice Room. Decent Size. A little hard to get dogs in side door - but very doable","year_stayed":"2025"},
{"state":"SC","city":"Columbia","name":"Homewood Suites","address":"230 Greystone Blvd - West/Lexington","rating":3,"dog_entry_rating":3,"notes":"Not a great part of town, but pretty safe. Rooms were somewhat old and dingy - could stay there again, but not first choice"},
{"state":"SC","city":"Columbia","name":"TownePlace Suites","address":"2915 Sunset Blvd","rating":3,"dog_entry_rating":2,"notes":"Nice hotel. Hard to get the dogs into the side door because of where the parking is. Rooms were large and clean"},
{"state":"TN","city":"Chattanooga","name":"DoubleTree - Hamilton Place","address":"Center Road","rating":4,"notes":"Nice enough rooms - not worth paying a premium however. Not much walking distance from hotel - but lots of food options 1 mile away.","year_stayed":"2026"},
{"state":"VA","city":"Richmond","name":"Springhill Suites - Richmond / Glen Allen","address":"Glen Allen area","rating":3,"dog_entry_rating":4,"notes":"Easy to get dogs in. Hotel was a bit rundown and keys didn’t work. Location is about 20 minutes from Univ. Of Richmond - and there were places to eat out there. Nothing special - but acceptable","year_stayed":"2026"}
]$hotels$::jsonb) as row(state text, city text, name text, address text, rating smallint, dog_entry_rating smallint, notes text, year_stayed text)
), normalized as (
  select md5(concat_ws(E'\u001f', lower(name), lower(city), lower(state), lower(coalesce(address, '')))) as import_key, source.* from source
)
insert into public.knowledge_hotels (import_key, state, city, name, address, rating, dog_entry_rating, notes, year_stayed)
select import_key, state, city, name, address, rating, dog_entry_rating, notes, year_stayed from normalized
on conflict (import_key) do update set
  state = excluded.state, city = excluded.city, name = excluded.name, address = excluded.address,
  rating = excluded.rating, dog_entry_rating = excluded.dog_entry_rating, notes = excluded.notes,
  year_stayed = excluded.year_stayed, updated_at = now();

comment on table public.knowledge_hotels is 'Knowledge hotel directory; initial named rows imported idempotently from Hotels.csv.';
