-- Idempotent import of the nonblank rows supplied in Table.csv.
with source(full_name, company, email, phone, notes) as (values
 ('Jeffiner Pourchier','IMG Academy','jennifer.pourchier@imgacademy.com','941-900-5742 / 770-231-4979 (c)','Cost of School is upwards of $110,000 per year'),
 ('Jeff Benito',null,null,'9092299956',null),('Sarah Borwell',null,'borwell@hotmail.com',null,null),
 ('Pippa Lane',null,null,null,null),('Brian Boland',null,null,null,null),('Matt Knoll',null,null,'+12548550902',null),
 ('Dennis den Boer','MADE Scholarships','dennis@madescholarships.com',null,null),
 ('Daniel Carvajal',null,'jdanielbecasamericanas@gmail.com',null,null),
 ('Jayan Samir Verma','Next Track','jayan@nextrackconsulting.com',null,null),
 ('Yanick Mandl','UniSports','yanick@unisportsrecruiting.com',null,null),
 ('Charly Zick','Tennis Zick','info@college-tennis.de',null,null),
 ('Joakim Frisk','BlueChip','joakim.frisk@bluechip.nu',null,null),
 ('Rodrigo Roxo','Munn Sports Management','rodrigo@munnsm.com',null,'Focus on Brazil'),
 ('Victor Chaw','Infinity Agency','infinityagency.sports@gmail.com',null,null),
 ('Guillermo Agost','Keystone Sports (Spain)','guillermo.agost@keystonesports.com',null,null),
 ('Simon Salgfors','ASM Sports','simon@asmsports.co',null,null),
 ('Brian Smith','University Prospects','brian@universityprospects.com',null,'Brian is President'),
 ('Phil Patri','One Dream Agency','philpatri@onedreamagency.com',null,null),
 ('Jenn Porchier','IMG',null,null,null),
 ('Jenn Ferrara','ES - Barcelona',null,'+34 674 168 689','Chapi, Kael'),
 ('Harrison Madison','Madison - Suk','hscollegeplacement@gmail.com',null,'Harrison Madison (Miss State) and Natalie Suk (Ole Miss0')
), companies as (select distinct company from source where company is not null)
insert into public.recruiting_agencies(import_key,name)
select md5('table.csv:agency:'||lower(company)),company from companies
on conflict(import_key) do update set name=excluded.name,updated_at=now();

with source(full_name, company, email, phone, notes) as (values
 ('Jeffiner Pourchier','IMG Academy','jennifer.pourchier@imgacademy.com','941-900-5742 / 770-231-4979 (c)','Cost of School is upwards of $110,000 per year'),('Jeff Benito',null,null,'9092299956',null),('Sarah Borwell',null,'borwell@hotmail.com',null,null),('Pippa Lane',null,null,null,null),('Brian Boland',null,null,null,null),('Matt Knoll',null,null,'+12548550902',null),('Dennis den Boer','MADE Scholarships','dennis@madescholarships.com',null,null),('Daniel Carvajal',null,'jdanielbecasamericanas@gmail.com',null,null),('Jayan Samir Verma','Next Track','jayan@nextrackconsulting.com',null,null),('Yanick Mandl','UniSports','yanick@unisportsrecruiting.com',null,null),('Charly Zick','Tennis Zick','info@college-tennis.de',null,null),('Joakim Frisk','BlueChip','joakim.frisk@bluechip.nu',null,null),('Rodrigo Roxo','Munn Sports Management','rodrigo@munnsm.com',null,'Focus on Brazil'),('Victor Chaw','Infinity Agency','infinityagency.sports@gmail.com',null,null),('Guillermo Agost','Keystone Sports (Spain)','guillermo.agost@keystonesports.com',null,null),('Simon Salgfors','ASM Sports','simon@asmsports.co',null,null),('Brian Smith','University Prospects','brian@universityprospects.com',null,'Brian is President'),('Phil Patri','One Dream Agency','philpatri@onedreamagency.com',null,null),('Jenn Porchier','IMG',null,null,null),('Jenn Ferrara','ES - Barcelona',null,'+34 674 168 689','Chapi, Kael'),('Harrison Madison','Madison - Suk','hscollegeplacement@gmail.com',null,'Harrison Madison (Miss State) and Natalie Suk (Ole Miss0')
), normalized as (
 select s.*,regexp_replace(full_name,'\s+[^\s]+$','') first_name,substring(full_name from '\S+$') last_name,
 md5(concat_ws(':','table.csv:agent',lower(full_name),lower(coalesce(company,'')),lower(coalesce(email,'')))) import_key from source s
)
insert into public.recruiting_agents(import_key,agency_id,first_name,last_name,email,phone,notes)
select n.import_key,a.id,n.first_name,n.last_name,n.email,n.phone,n.notes from normalized n
left join public.recruiting_agencies a on lower(a.name)=lower(n.company)
on conflict(import_key) do update set agency_id=excluded.agency_id,first_name=excluded.first_name,last_name=excluded.last_name,
 email=excluded.email,phone=excluded.phone,notes=excluded.notes,updated_at=now();
