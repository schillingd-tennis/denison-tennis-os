# BP-043E — Recruiting Import Preview

**Read-only.** No Supabase writes. No Person or Recruit Profile create/update/delete. No staging or commit.

**Reconciled from scratch** after BP-043E.2: all **12** approved Coda duplicate pairs MERGE. Previous 451/12-manual arithmetic is superseded.

**Sources:** Coda `Recruits.xlxs.xlsx` (474 data rows, 67 columns); roster `src/features/people/data.ts` (40 People); BP-043C + `0015_recruit_class_year.sql`; BP-043D / D.1 / D.5; BP-043E class-year semantics.

**Approved automatic identity decisions:**

| Kind | Count | Identities |
|---|---:|---|
| Coda → Coda MERGE | 12 pairs / 24 rows | Noah Vinbaytel; Paxton Au; Mateo Rizo-Patron; Evan Chu; Ivan Urbanovich; Balin Gupta; Matthew Sikorski; Aidan Bart; Peyton Barrett; Walker Nelson; Luca Sevim; Maxim/Maksim Hristov |
| Coda → Existing Person MERGE | 4 | Peter Berns; Jackson MacTaggart; Luke Colson; Minato Koido |

Asher Negandhi (2028 vs 2027) and the four TRN-URL collision rows stay **KEEP SEPARATE** (two People each). Blank stub is SKIP.

**Class years:** `Person.classYear` = Denison college graduation. `RecruitProfile.recruitClassYear` = Coda HS recruiting class. Never treated as a conflict. Existing Person `classYear` is never overwritten.

---

## 1. Summary counts (reconciled)

Every Coda row has exactly one disposition. **474 / 474.**

| Disposition | Coda rows | Check |
|---|---:|---|
| CREATE NEW PERSON + RECRUIT PROFILE | 457 | includes 12 merge canonicals |
| MERGE Coda rows → ONE RECRUIT PROFILE (folded sibling) | 12 | 12 pairs, one profile each |
| ENRICH EXISTING PERSON + CREATE RECRUIT PROFILE | 4 | roster |
| SKIP | 1 | xlsx-row-90 |
| MANUAL REVIEW | **0** | |
| **Total** | **474** | 457+12+4+1=474 |

| Final object | Count | Arithmetic |
|---|---:|---|
| Total Coda rows | **474** | workbook data rows |
| Coda rows merged (folded siblings) | **12** | 12 pairs × 1 extra row |
| Coda rows that participate in a Coda merge | **24** | 12 canonical + 12 folded |
| Coda rows skipped | **1** | stub |
| Resulting Recruit records | **461** | 457 new + 4 enriched |
| New People | **457** | one per CREATE row |
| Existing People enriched | **4** | no second Person |
| RecruitProfiles to create | **461** | 457+4; 12 merges share the canonical profile |
| Manual-review rows remaining | **0** | |

Each of the 12 approved duplicate pairs produces **one** Person and **one** Recruit Profile. None of those 24 rows creates two People.

---

## 2. Exact People that would be created

**457** new People, `role = recruit`. `Person.classYear` **unset**. Coda Class Year → `recruitClassYear` only.

CREATE Class Year: 2025=2, 2026=67, 2027=212, 2028=101, 2029=31, blank=44.

Duplicate display name in CREATE: **Asher Negandhi** twice (`xlsx-row-96` 2028, `xlsx-row-319` 2027).

| Coda row | Name | First | Last | recruitClassYear | Email | Phone |
|---|---|---|---|---|---|---|
| xlsx-row-3 | Jason Eigbedion | Jason | Eigbedion | 2028 | — | — |
| xlsx-row-4 | Zhiyu Yuan | Zhiyu | Yuan | 2028 | — | — |
| xlsx-row-5 | Ved Vanga | Ved | Vanga | 2028 | — | — |
| xlsx-row-6 | Juan Miguel Pereyra | Juan | Pereyra | 2028 | — | — |
| xlsx-row-7 | Garran McKay | Garran | McKay | 2028 | — | — |
| xlsx-row-8 | Andrew Chu | Andrew | Chu | 2028 | — | — |
| xlsx-row-9 | Benjamin Wiese | Benjamin | Wiese | 2028 | — | — |
| xlsx-row-10 | Cooper McKenna | Cooper | McKenna | 2028 | — | — |
| xlsx-row-11 | Camden Johnson | Camden | Johnson | 2028 | — | — |
| xlsx-row-12 | Charlie Barton | Charlie | Barton | 2028 | — | — |
| xlsx-row-13 | Tyson Young | Tyson | Young | 2028 | — | — |
| xlsx-row-14 | Ethan Chen | Ethan | Chen | 2027 | — | — |
| xlsx-row-15 | Ross Johnson | Ross | Johnson | 2027 | — | — |
| xlsx-row-16 | Jaren Scarborough | Jaren | Scarborough | 2027 | — | — |
| xlsx-row-17 | Anuj Mathur | Anuj | Mathur | 2027 | — | — |
| xlsx-row-18 | Benjamin Montana | Benjamin | Montana | 2027 | — | — |
| xlsx-row-19 | Balin Gupta | Balin | Gupta | 2027 | — | — |
| xlsx-row-20 | Gustavo Vasconcellos | Gustavo | Vasconcellos | 2027 | — | — |
| xlsx-row-21 | Anibal Nunez | Anibal | Nunez | 2027 | — | — |
| xlsx-row-22 | Bo Schroerlucke | Bo | Schroerlucke | 2027 | — | — |
| xlsx-row-23 | Addison Roach | Addison | Roach | 2027 | — | — |
| xlsx-row-24 | Alejandro Puentes | Alejandro | Puentes | 2027 | — | — |
| xlsx-row-25 | Michael Homsi | Michael | Homsi | 2027 | — | — |
| xlsx-row-26 | David Vartanov | David | Vartanov | 2027 | — | — |
| xlsx-row-27 | Cole LaFors | Cole | LaFors | 2027 | — | — |
| xlsx-row-28 | Aidan Gionis | Aidan | Gionis | 2027 | — | — |
| xlsx-row-29 | Ketan Garg | Ketan | Garg | 2027 | — | — |
| xlsx-row-30 | Marcello Bisogno | Marcello | Bisogno | 2027 | — | — |
| xlsx-row-31 | Aakash Deodhar | Aakash | Deodhar | 2027 | — | — |
| xlsx-row-32 | Taytum Jones | Taytum | Jones | 2027 | — | — |
| xlsx-row-33 | Dylan Jones | Dylan | Jones | 2027 | — | — |
| xlsx-row-34 | Shivraj Bhosale | Shivraj | Bhosale | 2027 | — | — |
| xlsx-row-35 | Aaron Wang | Aaron | Wang | 2027 | — | — |
| xlsx-row-36 | Jaidyn Finley | Jaidyn | Finley | 2027 | — | — |
| xlsx-row-37 | Chase Bowden | Chase | Bowden | 2027 | — | — |
| xlsx-row-38 | Nicolas Pedraza | Nicolas | Pedraza | 2027 | — | — |
| xlsx-row-39 | Darren Wei | Darren | Wei | 2027 | — | — |
| xlsx-row-40 | Lucas Smith | Lucas | Smith | 2027 | — | — |
| xlsx-row-41 | Rocco Roti | Rocco | Roti | 2027 | — | — |
| xlsx-row-42 | Saahil Gupte | Saahil | Gupte | 2027 | — | — |
| xlsx-row-43 | Aidan Xu | Aidan | Xu | 2027 | — | — |
| xlsx-row-44 | Andrej Markovic | Andrej | Markovic | 2027 | — | — |
| xlsx-row-45 | Chase Gerloff | Chase | Gerloff | 2027 | — | — |
| xlsx-row-46 | Aashray Arun | Aashray | Arun | 2027 | — | — |
| xlsx-row-47 | Shaw Akula | Shaw | Akula | 2027 | — | — |
| xlsx-row-48 | Maddox Bose | Maddox | Bose | 2027 | — | — |
| xlsx-row-49 | Maksim Nekrasov | Maksim | Nekrasov | 2027 | — | — |
| xlsx-row-50 | Thomas Sirichantho | Thomas | Sirichantho | 2027 | — | — |
| xlsx-row-51 | Elijah Johnson | Elijah | Johnson | 2027 | — | — |
| xlsx-row-52 | Harsha Karakala Reddy | Harsha | Reddy | 2027 | — | — |
| xlsx-row-53 | Oscar Puyplat | Oscar | Puyplat | 2027 | — | — |
| xlsx-row-54 | Joshua Bayete Miller | Joshua | Miller | 2027 | — | — |
| xlsx-row-55 | Enzo Carvalho | Enzo | Carvalho | 2027 | — | — |
| xlsx-row-56 | Nason Lo | Nason | Lo | 2027 | — | — |
| xlsx-row-57 | Matthew Sikorski | Matthew | Sikorski | 2027 | — | — |
| xlsx-row-58 | Carter Cotich | Carter | Cotich | 2027 | — | — |
| xlsx-row-59 | William (Bennett) Crew | William | Crew | — | — | — |
| xlsx-row-60 | Ryu Kotikula (Ree oo) | Ryu | oo) | 2027 | kotikularyu@gmail.com | +66 97 974 4919 |
| xlsx-row-61 | David Liu | David | Liu | 2027 | — | — |
| xlsx-row-62 | William Krusen | William | Krusen | 2028 | — | — |
| xlsx-row-63 | Zain Choudry | Zain | Choudry | 2027 | — | — |
| xlsx-row-64 | Keller Veltenaar | Keller | Veltenaar | 2027 | — | — |
| xlsx-row-65 | Hunter Udis | Hunter | Udis | 2028 | — | — |
| xlsx-row-66 | Julian Parnell | Julian | Parnell | 2028 | — | — |
| xlsx-row-67 | Yuvraj Dasari | Yuvraj | Dasari | 2027 | — | — |
| xlsx-row-68 | Thomas McCormick | Thomas | McCormick | 2027 | — | — |
| xlsx-row-69 | Charles Ma | Charles | Ma | 2027 | — | — |
| xlsx-row-70 | Lukas Sorgic | Lukas | Sorgic | 2026 | — | — |
| xlsx-row-71 | Jake Farquhar | Jake | Farquhar | 2027 | — | — |
| xlsx-row-72 | Ezra Crum | Ezra | Crum | 2026 | — | — |
| xlsx-row-73 | Seth Lomas | Seth | Lomas | 2027 | — | — |
| xlsx-row-74 | Oliver Derrow | Oliver | Derrow | 2027 | — | — |
| xlsx-row-75 | Stephen Gollapalli | Stephen | Gollapalli | 2027 | — | — |
| xlsx-row-76 | Casey Beckmann | Casey | Beckmann | 2028 | — | — |
| xlsx-row-77 | Elijah Shimman | Elijah | Shimman | 2027 | — | — |
| xlsx-row-78 | Michael Cho | Michael | Cho | 2028 | — | — |
| xlsx-row-79 | Cooper Remy | Cooper | Remy | 2026 | — | — |
| xlsx-row-80 | Griffin Richards | Griffin | Richards | 2027 | — | — |
| xlsx-row-81 | Mathieu Fosse | Mathieu | Fosse | 2027 | — | — |
| xlsx-row-82 | Giorgio Materazzo | Giorgio | Materazzo | 2027 | — | — |
| xlsx-row-83 | Bradley Ng | Bradley | Ng | 2028 | — | — |
| xlsx-row-84 | Brennan Plunkett | Brennan | Plunkett | 2027 | — | — |
| xlsx-row-85 | Grant Schaefer | Grant | Schaefer | 2028 | — | — |
| xlsx-row-86 | Jonah Grismer | Jonah | Grismer | 2026 | — | — |
| xlsx-row-87 | Philip Etzel | Philip | Etzel | 2027 | — | — |
| xlsx-row-88 | Zachary Sanchez | Zachary | Sanchez | 2027 | — | — |
| xlsx-row-89 | Karson Walden | Karson | Walden | 2028 | — | — |
| xlsx-row-91 | Paxton Au | Paxton | Au | 2027 | — | — |
| xlsx-row-95 | George Faraci | George | Faraci | 2028 | — | — |
| xlsx-row-96 | Asher Negandhi | Asher | Negandhi | 2028 | — | — |
| xlsx-row-97 | Matteo Rizo-Patron | Matteo | Rizo-Patron | — | — | — |
| xlsx-row-98 | Johan Schick | Johan | Schick | 2028 | — | — |
| xlsx-row-99 | Mateo Rizo-Patron | Mateo | Rizo-Patron | 2027 | — | — |
| xlsx-row-100 | Brandon Bao | Brandon | Bao | 2027 | — | — |
| xlsx-row-101 | Leon Moldenhauer | Leon | Moldenhauer | 2028 | leon.moldenhauer@t-online.de | — |
| xlsx-row-102 | Ezra Britton | Ezra | Britton | 2026 | — | — |
| xlsx-row-103 | Martin Fernandez | Martin | Fernandez | 2027 | — | — |
| xlsx-row-104 | Aruth Chinsupakul | Aruth | Chinsupakul | 2027 | — | — |
| xlsx-row-105 | Ned Bishop | Ned | Bishop | 2027 | — | — |
| xlsx-row-106 | Enzo Badotti Cariani | Enzo | Cariani | 2027 | — | — |
| xlsx-row-107 | Rafael Gama | Rafael | Gama | 2027 | — | +55 41 99279-7788 |
| xlsx-row-108 | Ricards Dzirkals | Ricards | Dzirkals | 2027 | — | +371 22 497 403 |
| xlsx-row-109 | Evan Chu | Evan | Chu | 2027 | — | — |
| xlsx-row-110 | Ivan Urbanovich | Ivan | Urbanovich | 2027 | — | — |
| xlsx-row-111 | Simon Monsanto | Simon | Monsanto | 2027 | — | 1 (612) 805-8475 |
| xlsx-row-112 | Kaito Tokukura | Kaito | Tokukura | 2027 | kaitotokukura@gmail.com | — |
| xlsx-row-113 | Shayane Joglekar | Shayane | Joglekar | 2027 | shayne.joglekar08@gmail.com | 703-463-0857 |
| xlsx-row-114 | Decker Lenzen | Decker | Lenzen | 2028 | decker.lenzen@gmail.com | 312-925-6499 |
| xlsx-row-115 | Georgii Demers | Georgii | Demers | 2027 | georgii.demers.college@gmail.com | 818-304-3143 |
| xlsx-row-116 | Gideon Ames | Gideon | Ames | 2027 | amesgideon@gmail.com | 310-801-4835 |
| xlsx-row-117 | Yusaku Harashima | Yusaku | Harashima | 2027 | — | +81 80 7980 4271 |
| xlsx-row-118 | Leo Zelenko | Leo | Zelenko | 2028 | — | — |
| xlsx-row-119 | Brennan Coletta | Brennan | Coletta | 2028 | bwcoletta@gmail.com | — |
| xlsx-row-121 | Gareth Kurowski | Gareth | Kurowski | 2028 | — | — |
| xlsx-row-122 | Janek Teply | Janek | Teply | 2028 | — | — |
| xlsx-row-123 | David Waterman | David | Waterman | 2028 | — | — |
| xlsx-row-124 | Vivaan Moghekar | Vivaan | Moghekar | 2028 | — | — |
| xlsx-row-125 | Nicholas Marhoff | Nicholas | Marhoff | 2027 | — | — |
| xlsx-row-126 | Noah Vinbaytel | Noah | Vinbaytel | 2027 | — | 718-757-5713 |
| xlsx-row-127 | Aariz Rehman | Aariz | Rehman | 2027 | aarehman2009@gmail.com | 858-380-6151 |
| xlsx-row-128 | Agastya Singh | Agastya | Singh | 2027 | akansha11@gmail.com | 469-731-6556 |
| xlsx-row-129 | Dawson Daves | Dawson | Daves | 2027 | davesforrest02@gmail.com | 843-254-3494 |
| xlsx-row-130 | Daniel Vartanov | Daniel | Vartanov | 2027 | dmitriyvartanov@gmail.com | 916-600-9648 |
| xlsx-row-131 | Zade Azmeh | Zade | Azmeh | 2027 | zadeazmeh@gmail.com | 650-283-3239 |
| xlsx-row-132 | Akiva Goldwasser | Akiva | Goldwasser | 2027 | akivako@gmail.com | 669-233-9953 |
| xlsx-row-133 | Nicolas Cudny | Nicolas | Cudny | 2027 | — | — |
| xlsx-row-134 | Vansh Patel | Vansh | Patel | 2028 | vipul421@yahoo.com | 559-312-8444 |
| xlsx-row-135 | Vedansh Pande | Vedansh | Pande | 2028 | xxx_t_s_lakshmi@hotmail.com | 650-455-8294 |
| xlsx-row-136 | Jaden Worden | Jaden | Worden | — | — | — |
| xlsx-row-137 | Chase Klugo | Chase | Klugo | 2027 | cklugo1@hwemail.com | 513-500-8838 |
| xlsx-row-138 | Charlie Phillips | Charlie | Phillips | 2027 | charlesphillips27@guerincatholic.org | 317-607-1140 |
| xlsx-row-139 | Ajay Prasanna | Ajay | Prasanna | 2028 | — | — |
| xlsx-row-140 | James Register | James | Register | 2027 | chris.register@waverly-advisors.com | 601-278-6517 |
| xlsx-row-141 | Jude Sangar | Jude | Sangar | 2028 | judesangar@icloud.com | 317-554-9402 |
| xlsx-row-142 | Aditya Shah | Aditya | Shah | 2026 | preethia@gmail.com | 502-526-8205 |
| xlsx-row-143 | Aarav Shah | Aarav | Shah | 2027 | manish1905@yahoo.com | 734 330 5296 |
| xlsx-row-144 | Levi Solomon | Levi | Solomon | 2027 | — | — |
| xlsx-row-145 | Lucas Stoecker | Lucas | Stoecker | 2028 | — | — |
| xlsx-row-146 | Brady Stump | Brady | Stump | 2027 | bradyrstump@gmail.com | 317-690-0138 |
| xlsx-row-147 | Reed Sugarman | Reed | Sugarman | 2027 | reedsugarman@icloud.com | 312-953-4549 |
| xlsx-row-148 | Zain Taqi | Zain | Taqi | 2027 | zaintaqi59@gmail.com | 248-631-7025 |
| xlsx-row-149 | David Toth | David | Toth | 2028 | david.toth.force@gmail.com | 919-425-9039 |
| xlsx-row-150 | Mark Watson | Mark | Watson | 2027 | markwatson08@gmail.com | 984-895-6937 |
| xlsx-row-151 | Brady Winston | Brady | Winston | 2027 | bradywinston2525@gmail.com | 248-505-7790 |
| xlsx-row-152 | Wesley Worobel | Wesley | Worobel | 2026 | worobel@gmail.com | 203-500-8979 |
| xlsx-row-153 | Tarek Yassine | Tarek | Yassine | 2026 | najatyassine42@hotmail.com | 419-270-5025 |
| xlsx-row-154 | Lucas Zhang | Lucas | Zhang | 2028 | zhangdi_2002@yahoo.com | 917-821-3992 |
| xlsx-row-155 | Jarren Griffin | Jarren | Griffin | 2027 | — | 14045939484 |
| xlsx-row-156 | Tristan Bradu | Tristan | Bradu | — | — | — |
| xlsx-row-157 | Ty Taylor | Ty | Taylor | — | — | — |
| xlsx-row-158 | Maximus Monogenis | Maximus | Monogenis | 2027 | — | — |
| xlsx-row-159 | Andres Matos | Andres | Matos | — | — | — |
| xlsx-row-160 | Clayton Pohoski | Clayton | Pohoski | — | — | — |
| xlsx-row-161 | Ryan Wang | Ryan | Wang | — | — | — |
| xlsx-row-162 | Leo Yang | Leo | Yang | — | — | — |
| xlsx-row-163 | Isaiah Parra | Isaiah | Parra | — | — | — |
| xlsx-row-164 | Maximiliano Roca | Maximiliano | Roca | 2027 | — | — |
| xlsx-row-165 | Andreas Udall | Andreas | Udall | — | — | — |
| xlsx-row-166 | Grant Kleppinger | Grant | Kleppinger | 2027 | — | 910-352-4349 |
| xlsx-row-167 | Kai Collins | Kai | Collins | 2027 | — | — |
| xlsx-row-168 | Spencer Trattner | Spencer | Trattner | — | — | — |
| xlsx-row-169 | Dan Horwitz | Dan | Horwitz | — | — | — |
| xlsx-row-170 | Connor Yang | Connor | Yang | 2027 | — | — |
| xlsx-row-171 | Mateo Pouso | Mateo | Pouso | — | — | — |
| xlsx-row-172 | Udaijot Sangha | Udaijot | Sangha | — | — | — |
| xlsx-row-173 | Reed MacAlester | Reed | MacAlester | — | — | — |
| xlsx-row-174 | Mitchell Hofer | Mitchell | Hofer | 2027 | — | — |
| xlsx-row-175 | Adam Roman | Adam | Roman | — | — | — |
| xlsx-row-176 | Noa Cakaric | Noa | Cakaric | — | — | — |
| xlsx-row-178 | Aiden Yeung | Aiden | Yeung | — | — | — |
| xlsx-row-179 | James Barrow | James | Barrow | 2027 | — | — |
| xlsx-row-180 | Matthew Morneault | Matthew | Morneault | — | — | — |
| xlsx-row-181 | Koray Abramson | Koray | Abramson | — | — | — |
| xlsx-row-183 | Nicholas Joyce | Nicholas | Joyce | 2027 | — | — |
| xlsx-row-184 | Juan Carlos Benito | Juan | Benito | — | — | — |
| xlsx-row-185 | Blake Hussey | Blake | Hussey | 2027 | kmhussey@fuse.net | 859-512-1690 |
| xlsx-row-186 | Tanush Reddy Gade | Tanush | Gade | — | — | — |
| xlsx-row-187 | Hans Sempre | Hans | Sempre | — | — | — |
| xlsx-row-188 | Drew Barr | Drew | Barr | 2027 | — | — |
| xlsx-row-189 | Noah Gou | Noah | Gou | 2027 | — | 773-592-5020 |
| xlsx-row-190 | Liam Collins | Liam | Collins | 2027 | — | 346-221-0225 |
| xlsx-row-192 | Rushil Rajpal | Rushil | Rajpal | — | — | — |
| xlsx-row-193 | Andrew Zielinski | Andrew | Zielinski | 2027 | — | — |
| xlsx-row-194 | Brayden Amey | Brayden | Amey | 2027 | — | — |
| xlsx-row-195 | Brayden Campion | Brayden | Campion | — | — | — |
| xlsx-row-196 | Luca Tabidze | Luca | Tabidze | 2027 | — | — |
| xlsx-row-197 | Shayne Joglekar | Shayne | Joglekar | 2027 | — | — |
| xlsx-row-198 | Mark Mrcela | Mark | Mrcela | — | — | — |
| xlsx-row-199 | Landon Vens | Landon | Vens | 2027 | — | — |
| xlsx-row-200 | Albert Crismar | Albert | Crismar | 2027 | — | — |
| xlsx-row-201 | JohnPaul Huston | JohnPaul | Huston | — | — | — |
| xlsx-row-202 | Gianluca Galasso | Gianluca | Galasso | 2027 | — | — |
| xlsx-row-203 | Adrian Baerga-Torres | Adrian | Baerga-Torres | — | — | — |
| xlsx-row-204 | Sergio Garin | Sergio | Garin | 2027 | — | — |
| xlsx-row-205 | Zachary Keiper | Zachary | Keiper | — | — | — |
| xlsx-row-206 | Tomas Orrego | Tomas | Orrego | — | — | — |
| xlsx-row-207 | Samuel Rosales Stephen | Samuel | Stephen | — | — | — |
| xlsx-row-208 | Collin De Oliveira | Collin | Oliveira | — | — | — |
| xlsx-row-209 | Tarak Ram Muvva | Tarak | Muvva | — | — | — |
| xlsx-row-210 | Austin Potter | Austin | Potter | 2027 | — | — |
| xlsx-row-211 | Jordan Papadopoulos | Jordan | Papadopoulos | — | — | — |
| xlsx-row-212 | Mathieu Veltkamp | Mathieu | Veltkamp | 2027 | — | — |
| xlsx-row-213 | Ashwin Willy | Ashwin | Willy | — | — | — |
| xlsx-row-214 | Kevin Lee | Kevin | Lee | 2027 | — | — |
| xlsx-row-216 | Illia Shcherbakov | Illia | Shcherbakov | 2027 | — | — |
| xlsx-row-217 | Luke Conner | Luke | Conner | 2027 | — | — |
| xlsx-row-218 | Samuel Church-Schulman | Samuel | Church-Schulman | 2027 | — | — |
| xlsx-row-219 | Jacob Pletka | Jacob | Pletka | 2027 | — | — |
| xlsx-row-220 | Lucas Huang | Lucas | Huang | — | — | — |
| xlsx-row-221 | Nolan Baynham | Nolan | Baynham | 2027 | — | — |
| xlsx-row-222 | Zahir Hassan | Zahir | Hassan | 2027 | — | — |
| xlsx-row-223 | Brady Kattan | Brady | Kattan | 2029 | — | — |
| xlsx-row-224 | Levi Brumbaugh | Levi | Brumbaugh | 2027 | — | — |
| xlsx-row-225 | Michael Shope | Michael | Shope | 2028 | kriazzi@hotmail.com | 937-689-6200 |
| xlsx-row-226 | Oliver Carpenter | Oliver | Carpenter | 2027 | — | 650-223-3318 |
| xlsx-row-227 | Nihal Narisetty | Nihal | Narisetty | 2027 | — | +1 (513) 913-8797 |
| xlsx-row-228 | Dash Parkinson-Lubold | Dash | Parkinson-Lubold | 2027 | mlubold2003@gmail.com | 973-441-0991 |
| xlsx-row-229 | Advay Singh | Advay | Singh | 2029 | — | — |
| xlsx-row-231 | Walker Nelson | Walker | Nelson | 2028 | — | — |
| xlsx-row-232 | Marko Mikic | Marko | Mikic | 2028 | — | — |
| xlsx-row-233 | Rafael Bote | Rafael | Bote | 2027 | — | — |
| xlsx-row-234 | William Delach | William | Delach | 2027 | jyz_us@yahoo.com | 847-648-0788 |
| xlsx-row-235 | Kush Bhandari | Kush | Bhandari | 2027 | kush.r.bhandari@gmail.com | 470-707-0790 |
| xlsx-row-236 | Ian Sweeney | Ian | Sweeney | 2027 | fifinsweeney@hotmail.com | 858-740-7755 |
| xlsx-row-237 | Aiden Zadeh | Aiden | Zadeh | 2028 | — | — |
| xlsx-row-238 | Akshath Hemanth | Akshath | Hemanth | 2028 | — | — |
| xlsx-row-239 | Aman Dole | Aman | Dole | 2028 | — | — |
| xlsx-row-240 | Alonso Berry | Alonso | Berry | 2028 | alonsoberry000@icloud.com | 857-209-1151 |
| xlsx-row-241 | Harrison Lessard | Harrison | Lessard | 2029 | — | — |
| xlsx-row-242 | Trishiv Premanand | Trishiv | Premanand | 2028 | — | — |
| xlsx-row-243 | Casra Afsharipour | Casra | Afsharipour | 2028 | — | — |
| xlsx-row-244 | Cyrus Josephs | Cyrus | Josephs | 2028 | — | — |
| xlsx-row-245 | Dylan Warn | Dylan | Warn | 2029 | — | — |
| xlsx-row-246 | Kona Parseghian | Kona | Parseghian | 2028 | — | — |
| xlsx-row-247 | Yicheng Feng | Yicheng | Feng | 2028 | — | — |
| xlsx-row-248 | Mason Menyhart | Mason | Menyhart | 2029 | — | — |
| xlsx-row-249 | Mayurchandra Bharath | Mayurchandra | Bharath | 2028 | — | — |
| xlsx-row-250 | Elliott Awomoyi | Elliott | Awomoyi | — | — | — |
| xlsx-row-251 | Sebastian Wright | Sebastian | Wright | — | — | — |
| xlsx-row-252 | Sam Calvert | Sam | Calvert | — | — | — |
| xlsx-row-253 | Aaron Tokarz | Aaron | Tokarz | 2027 | raftok1@gmail.com | 631-335-5021 |
| xlsx-row-254 | Oliver Caldwell | Oliver | Caldwell | 2028 | — | — |
| xlsx-row-255 | Mason Fekete | Mason | Fekete | — | — | — |
| xlsx-row-256 | Nirbhay Agarwal | Nirbhay | Agarwal | — | — | — |
| xlsx-row-257 | Henry Waddell | Henry | Waddell | — | — | — |
| xlsx-row-258 | Benjamin Chervoneva | Benjamin | Chervoneva | 2028 | — | — |
| xlsx-row-259 | Gus Geubelle | Gus | Geubelle | 2029 | — | — |
| xlsx-row-260 | Van Davidson | Van | Davidson | 2028 | — | — |
| xlsx-row-261 | Advay Aggarwal | Advay | Aggarwal | 2027 | — | — |
| xlsx-row-262 | John Ozmun | John | Ozmun | 2028 | — | — |
| xlsx-row-263 | Adrian Marin | Adrian | Marin | 2028 | — | — |
| xlsx-row-264 | Niranjan Ramalingam | Niranjan | Ramalingam | 2028 | — | — |
| xlsx-row-265 | Michael Goldovsky | Michael | Goldovsky | 2028 | — | — |
| xlsx-row-266 | Luca de Calice | Luca | Calice | 2029 | — | — |
| xlsx-row-267 | Justin Zhang | Justin | Zhang | 2027 | justinzg8@gmail.com | 949-922-7170 |
| xlsx-row-268 | Brendan Linstrom | Brendan | Linstrom | 2028 | — | — |
| xlsx-row-269 | Ayden Thielsen | Ayden | Thielsen | 2028 | — | — |
| xlsx-row-270 | Kensho Ford | Kensho | Ford | 2029 | — | — |
| xlsx-row-271 | Louden Muha | Louden | Muha | 2029 | — | — |
| xlsx-row-272 | Braden Lambert | Braden | Lambert | 2028 | — | — |
| xlsx-row-273 | Ashwin Sudhakar | Ashwin | Sudhakar | 2027 | leena.sudhakar07@gmail.com | 724-732-6176 |
| xlsx-row-274 | Vincenzo Caruso | Vincenzo | Caruso | 2027 | — | — |
| xlsx-row-275 | Sal Ponamgi | Sal | Ponamgi | 2027 | — | — |
| xlsx-row-276 | Ricardo Espalliat | Ricardo | Espalliat | 2025 | — | — |
| xlsx-row-277 | Shreyash Upadhyay | Shreyash | Upadhyay | 2027 | — | — |
| xlsx-row-278 | Joseph DeGracia | Joseph | DeGracia | 2027 | — | — |
| xlsx-row-279 | Raj Pisal | Raj | Pisal | 2027 | mpisal@gmail.com | 510-396-0373 |
| xlsx-row-280 | Daven Aga | Daven | Aga | 2027 | daven.aga3@gmail.com | 858-951-5713 |
| xlsx-row-281 | Colin McPeek | Colin | McPeek | 2028 | — | — |
| xlsx-row-282 | Charlie Schlenker | Charlie | Schlenker | 2026 | — | — |
| xlsx-row-283 | Reid Ferreira | Reid | Ferreira | 2026 | — | — |
| xlsx-row-284 | Alexander Park | Alexander | Park | 2027 | — | — |
| xlsx-row-285 | Peter Jorniak | Peter | Jorniak | 2027 | — | — |
| xlsx-row-286 | Rafael Lopez | Rafael | Lopez | 2027 | — | — |
| xlsx-row-287 | Peyton Barrett | Peyton | Barrett | 2027 | — | — |
| xlsx-row-288 | Joshua Golden | Joshua | Golden | 2027 | — | — |
| xlsx-row-289 | David Grigoryan | David | Grigoryan | 2027 | — | — |
| xlsx-row-290 | Elijah Mireles | Elijah | Mireles | 2027 | — | — |
| xlsx-row-291 | Sebastian Zavala | Sebastian | Zavala | 2029 | — | — |
| xlsx-row-292 | Maddox Iliescu | Maddox | Iliescu | 2028 | — | — |
| xlsx-row-293 | Qi Ao | Qi | Ao | 2028 | — | — |
| xlsx-row-294 | Peter Choi | Peter | Choi | 2028 | — | — |
| xlsx-row-295 | Manas Kondapalli | Manas | Kondapalli | 2028 | — | — |
| xlsx-row-296 | Matei Calin | Matei | Calin | 2028 | — | — |
| xlsx-row-297 | Jiarui Zhang | Jiarui | Zhang | 2029 | — | — |
| xlsx-row-298 | John Murphy | John | Murphy | 2028 | — | — |
| xlsx-row-299 | Kurt Sayan | Kurt | Sayan | 2027 | wolfiesayan@gmail.com | 631-495-5819 |
| xlsx-row-300 | Kalvin Seo | Kalvin | Seo | 2029 | — | — |
| xlsx-row-301 | Jackson McCrory | Jackson | McCrory | 2027 | — | — |
| xlsx-row-302 | Vivek Kuchimanchi | Vivek | Kuchimanchi | 2028 | — | — |
| xlsx-row-303 | Nathan De Croos | Nathan | Croos | 2028 | — | — |
| xlsx-row-304 | Finn Ashley | Finn | Ashley | 2027 | finnisaacashley@gmail.com | 760-504-7163 |
| xlsx-row-305 | Alexander Dirlea | Alexander | Dirlea | 2028 | — | — |
| xlsx-row-306 | Alexander Lerman | Alexander | Lerman | 2029 | — | — |
| xlsx-row-307 | Lucas Rowe | Lucas | Rowe | 2028 | — | — |
| xlsx-row-308 | Ethan Hu | Ethan | Hu | 2029 | — | — |
| xlsx-row-309 | Hunter Jones | Hunter | Jones | 2028 | — | — |
| xlsx-row-310 | Santiago Bisogno | Santiago | Bisogno | 2028 | — | — |
| xlsx-row-311 | Smyan Vijay | Smyan | Vijay | 2029 | — | — |
| xlsx-row-312 | Vedant Bhende | Vedant | Bhende | 2028 | — | — |
| xlsx-row-313 | Kyler Sigurdsson | Kyler | Sigurdsson | 2028 | — | — |
| xlsx-row-314 | Jose Vasquez | Jose | Vasquez | 2028 | — | — |
| xlsx-row-315 | Brayden Bonetti | Brayden | Bonetti | 2028 | — | — |
| xlsx-row-316 | Christian Rohrberg | Christian | Rohrberg | 2029 | — | — |
| xlsx-row-317 | Petru Cotoman | Petru | Cotoman | 2028 | — | — |
| xlsx-row-318 | Joseph Kim | Joseph | Kim | 2029 | — | — |
| xlsx-row-319 | Asher Negandhi | Asher | Negandhi | 2027 | — | — |
| xlsx-row-320 | Matteo Huarte | Matteo | Huarte | 2027 | — | — |
| xlsx-row-321 | Anish Poojari | Anish | Poojari | 2027 | — | — |
| xlsx-row-322 | George Santalov | George | Santalov | 2027 | — | — |
| xlsx-row-323 | Siddharth Bharadwaj | Siddharth | Bharadwaj | 2027 | — | — |
| xlsx-row-324 | Arjun Prabhakar | Arjun | Prabhakar | 2027 | — | — |
| xlsx-row-325 | Miguel Rooney | Miguel | Rooney | 2027 | — | — |
| xlsx-row-326 | Joseph Nau | Joseph | Nau | 2027 | — | — |
| xlsx-row-327 | Henry Lessard | Henry | Lessard | 2027 | — | — |
| xlsx-row-328 | Soren Swenson | Soren | Swenson | 2027 | — | — |
| xlsx-row-329 | Luca Ostovany | Luca | Ostovany | 2027 | — | — |
| xlsx-row-330 | Rowan Qalbani | Rowan | Qalbani | 2028 | — | — |
| xlsx-row-331 | Ilias Bouzoubaa | Ilias | Bouzoubaa | 2027 | — | — |
| xlsx-row-332 | Eli Kaminski | Eli | Kaminski | 2028 | — | — |
| xlsx-row-333 | Wesley Cotton | Wesley | Cotton | 2027 | — | — |
| xlsx-row-334 | Lennart Hammargren | Lennart | Hammargren | 2028 | — | — |
| xlsx-row-335 | Daniel Malacek | Daniel | Malacek | 2028 | — | — |
| xlsx-row-336 | Ivan Rybak | Ivan | Rybak | 2028 | — | — |
| xlsx-row-337 | Piotr Gradzki | Piotr | Gradzki | 2029 | — | — |
| xlsx-row-338 | James Andrew Ross | James | Ross | 2028 | — | — |
| xlsx-row-339 | Nikhil Bommaiah | Nikhil | Bommaiah | 2027 | nikbommaiah@gmail.com | 949-765-9988 |
| xlsx-row-340 | Antanas Daugis | Antanas | Daugis | 2028 | — | — |
| xlsx-row-341 | Maxwell Paape | Maxwell | Paape | 2028 | — | — |
| xlsx-row-342 | Ryan Corcoran | Ryan | Corcoran | 2028 | — | — |
| xlsx-row-343 | Simon Hayal | Simon | Hayal | 2027 | — | — |
| xlsx-row-344 | Nile Ung | Nile | Ung | 2027 | — | — |
| xlsx-row-345 | Zesen Wang | Zesen | Wang | 2029 | — | — |
| xlsx-row-346 | Karthik Thumu | Karthik | Thumu | 2027 | — | — |
| xlsx-row-347 | Robert McAdoo | Robert | McAdoo | 2028 | — | — |
| xlsx-row-348 | Joshua Dolinsky | Joshua | Dolinsky | 2029 | — | — |
| xlsx-row-349 | Cayden Laughton | Cayden | Laughton | 2028 | — | — |
| xlsx-row-350 | Akshay Mirmira | Akshay | Mirmira | 2027 | — | — |
| xlsx-row-351 | Atticus Kim | Atticus | Kim | 2027 | — | — |
| xlsx-row-352 | Boning Wang | Boning | Wang | 2027 | — | — |
| xlsx-row-353 | Luca Sevim | Luca | Sevim | 2028 | — | — |
| xlsx-row-354 | Sean Peng | Sean | Peng | 2028 | — | — |
| xlsx-row-355 | Alexander Anderson | Alexander | Anderson | 2029 | — | — |
| xlsx-row-356 | Zander Abrams | Zander | Abrams | 2028 | — | — |
| xlsx-row-357 | Damian Gutheil | Damian | Gutheil | 2029 | — | — |
| xlsx-row-358 | Rafael Pawar | Rafael | Pawar | 2029 | — | — |
| xlsx-row-359 | Rohan Vyas | Rohan | Vyas | 2027 | vyasrohan29@gmail.com | 973-901-0521 |
| xlsx-row-360 | Daniil Berezin | Daniil | Berezin | 2028 | — | — |
| xlsx-row-361 | Aayush Vartak | Aayush | Vartak | 2029 | — | — |
| xlsx-row-362 | Surya DeDatta | Surya | DeDatta | 2027 | suryadedatta@gmail.com | 650-575-6772 |
| xlsx-row-363 | Tristan Ascenzo | Tristan | Ascenzo | 2029 | — | — |
| xlsx-row-365 | Carson Kuchar | Carson | Kuchar | 2028 | — | — |
| xlsx-row-366 | Aryan Ponugoti | Aryan | Ponugoti | 2029 | — | — |
| xlsx-row-367 | Alexander Totoian | Alexander | Totoian | 2028 | — | — |
| xlsx-row-368 | Eita Mishima | Eita | Mishima | 2028 | — | — |
| xlsx-row-369 | Blake Wright | Blake | Wright | 2028 | — | — |
| xlsx-row-370 | Connor Feehan | Connor | Feehan | 2029 | — | — |
| xlsx-row-371 | Zachary Szymanski | Zachary | Szymanski | 2029 | — | — |
| xlsx-row-372 | Griffin Goode | Griffin | Goode | 2029 | — | — |
| xlsx-row-373 | Max Dukowicz | Max | Dukowicz | 2028 | — | — |
| xlsx-row-374 | Ethan Turunen | Ethan | Turunen | 2028 | — | — |
| xlsx-row-375 | Adrian Sharma | Adrian | Sharma | 2029 | — | — |
| xlsx-row-376 | Ricky Jeong | Ricky | Jeong | 2028 | — | — |
| xlsx-row-377 | Peter Nistad | Peter | Nistad | 2028 | — | — |
| xlsx-row-378 | Braylon Desquitado | Braylon | Desquitado | 2029 | — | — |
| xlsx-row-379 | Pietro Sagone | Pietro | Sagone | 2027 | sagonep@gmail.com | +39 3667472442 |
| xlsx-row-380 | Finn Keenan | Finn | Keenan | 2027 | — | 234-237-3999 |
| xlsx-row-381 | Alec Rodriguez-Fields | Alec | Rodriguez-Fields | 2027 | rfalec77@gmail.com | (720) 656-1580 |
| xlsx-row-382 | Alexander Wriedt | Alexander | Wriedt | 2027 | wriedt@mac.com | 516-637-8371 |
| xlsx-row-383 | Aidan Conley | Aidan | Conley | 2027 | aidanconley164@gmail.com | 425-770-9657 |
| xlsx-row-384 | Karam Dhawan | Karam | Dhawan | 2027 | karambdhawan@gmail.com | 650-732-8707 |
| xlsx-row-385 | Yosef Elyashkevich | Yosef | Elyashkevich | 2027 | yoyoelyash@gmail.com | 832-419-2707 |
| xlsx-row-386 | Owen Conley | Owen | Conley | 2027 | owenconley63@gmail.com | 425-770-9630 |
| xlsx-row-387 | Alex Borisov | Alex | Borisov | 2026 | — | — |
| xlsx-row-388 | Eiji Fujita | Eiji | Fujita | 2026 | — | — |
| xlsx-row-389 | Saje Menon | Saje | Menon | 2026 | — | — |
| xlsx-row-390 | Joseph Owen Lauw | Joseph | Lauw | 2026 | owenlauw15@gmail.com | — |
| xlsx-row-391 | Hayden Williams | Hayden | Williams | 2026 | haydenwilliams1818@gmail.com | 737-701-6763 |
| xlsx-row-392 | James Lammas | James | Lammas | 2025 | — | +353 87 204 5552 |
| xlsx-row-393 | Henry Groves | Henry | Groves | 2026 | — | — |
| xlsx-row-395 | Jaden Dai | Jaden | Dai | 2026 | — | — |
| xlsx-row-396 | Jack Reis | Jack | Reis | 2026 | — | — |
| xlsx-row-397 | Jovan Morales | Jovan | Morales | 2026 | — | — |
| xlsx-row-398 | Neelan Gandhi | Neelan | Gandhi | 2027 | neelan.gandhi08@gmail.com | 513-846-1888 |
| xlsx-row-399 | Volodymyr (Vlad) Dombrovskyi | Volodymyr | Dombrovskyi | 2026 | vldombrovskyi@gmail.com | (203) 273-2870 |
| xlsx-row-401 | Drew Gilbert | Drew | Gilbert | 2026 | — | — |
| xlsx-row-402 | Aidan Bart | Aidan | Bart | 2026 | a1bartnyc@icloud.com | — |
| xlsx-row-403 | William McEwan | William | McEwan | 2027 | — | — |
| xlsx-row-404 | Dylan Donovan | Dylan | Donovan | 2026 | — | 415-916-3769 |
| xlsx-row-405 | Kawelo Tsuneyoshi | Kawelo | Tsuneyoshi | 2026 | — | — |
| xlsx-row-406 | Ayden Fraire | Ayden | Fraire | 2026 | — | — |
| xlsx-row-407 | Colin Cerminara | Colin | Cerminara | 2027 | colincerminara@icloud.com | 704-929-4557 |
| xlsx-row-408 | JP (Jose Pablo) Coello | JP | Coello | 2026 | jpcoello@gmail.com | (305) 518-9240 |
| xlsx-row-409 | TJ Shanahan | TJ | Shanahan | 2026 | — | 405-514-2820 |
| xlsx-row-411 | Michael Mitchell | Michael | Mitchell | 2026 | michaelm207@icloud.com | — |
| xlsx-row-412 | Preston Lubiniecki | Preston | Lubiniecki | 2027 | lubipa27@episcopalacademy.org | — |
| xlsx-row-413 | Aiden Mueller | Aiden | Mueller | 2026 | — | — |
| xlsx-row-414 | Dudley Willis | Dudley | Willis | 2027 | dudsthe3rd@gmail.com | 508-808-5837 |
| xlsx-row-415 | Bobby Rohs | Bobby | Rohs | 2027 | bobbyrohs@gmail.com | 7703633110 |
| xlsx-row-417 | Michael Geffre | Michael | Geffre | 2027 | mggsports22@gmail.com | 9494828459 |
| xlsx-row-418 | Robert Chen | Robert | Chen | 2027 | — | +1 919-813-9208 |
| xlsx-row-419 | Kabir Motwani | Kabir | Motwani | 2027 | sheetal1275@gmail.com | +1 (847) 532-9445 |
| xlsx-row-420 | Rohan Rao | Rohan | Rao | 2027 | roro.rao11@gmail.com | 617-893-9014 |
| xlsx-row-421 | Alexander Klimovich | Alexander | Klimovich | 2027 | mklimovich@yahoo.com | 5617773236 |
| xlsx-row-422 | Cooper Grim | Cooper | Grim | 2027 | — | — |
| xlsx-row-423 | Mirco Koledin | Mirco | Koledin | 2027 | — | — |
| xlsx-row-424 | Aarav Nair | Aarav | Nair | 2027 | — | — |
| xlsx-row-425 | Vikram Narendran | Vikram | Narendran | 2027 | vixi_naren@yahoo.com | (520) 934-3061 |
| xlsx-row-426 | Samuel Schumacher | Samuel | Schumacher | 2027 | sam.schumacher27@gmail.com | 269-249-8905 |
| xlsx-row-427 | Samuel He | Samuel | He | 2026 | — | — |
| xlsx-row-428 | Alton Swan | Alton | Swan | 2026 | — | — |
| xlsx-row-429 | Alex Walker | Alex | Walker | 2027 | indyoralsurgery@gmail.com | (463)273-7774 |
| xlsx-row-430 | Mason Crosby | Mason | Crosby | 2027 | masoncrosby@icloud.com | (248) 921-2641 |
| xlsx-row-431 | Alessandro De Bernardo | Alessandro | Bernardo | 2026 | marvifrancesa@hotmail.com | 727-244-3415 |
| xlsx-row-432 | Maksim Hristov | Maksim | Hristov | 2026 | maksibarca08@gmail.com | 224-409-4272 |
| xlsx-row-433 | Juno Pethe | Juno | Pethe | 2026 | rpethe@yahoo.com | — |
| xlsx-row-434 | Tair Sarmivov | Tair | Sarmivov | — | — | +7 775 457 0035 |
| xlsx-row-435 | Filip Nikolovski | Filip | Nikolovski | 2027 | ogneninteko@yahoo.com | 551-795-5204 |
| xlsx-row-436 | Jonah Stolte | Jonah | Stolte | 2026 | — | — |
| xlsx-row-437 | Landon Marcus | Landon | Marcus | 2027 | lanjm3@gmail.com | 4703043504 |
| xlsx-row-438 | Simon Zoldan | Simon | Zoldan | 2027 | sdzoldan@gmail.com | 484-832-4133 |
| xlsx-row-439 | Julian (Who Li-in) Winter | Julian | Winter | 2026 | Juliw@gmx.de | +49 178 2007041 |
| xlsx-row-440 | PJ Barry | PJ | Barry | 2026 | patrickjohnbarry@gmail.com | (224) 300-8140 |
| xlsx-row-441 | Isaac Lewis | Isaac | Lewis | 2027 | isaacrlewis27@gmail.com | 828-779-0658 |
| xlsx-row-442 | Luca Ugel | Luca | Ugel | 2026 | — | — |
| xlsx-row-443 | Brady Friesen | Brady | Friesen | 2026 | bradydavisfriesen@gmail.com | 312-366-0207 |
| xlsx-row-444 | Alex Borbiu | Alex | Borbiu | 2026 | alexborbiu22@gmail.com | — |
| xlsx-row-445 | Aaditt Rishi | Aaditt | Rishi | 2026 | — | 469-469-0505 |
| xlsx-row-446 | Sean Park | Sean | Park | 2026 | — | — |
| xlsx-row-447 | Oliver Mesicek | Oliver | Mesicek | 2026 | — | — |
| xlsx-row-448 | Braden LeBaron | Braden | LeBaron | 2027 | bradenlebaron541@gmail.com | 6309740093 |
| xlsx-row-449 | Dante Chabot | Dante | Chabot | 2026 | — | — |
| xlsx-row-450 | Davis Aubrey | Davis | Aubrey | 2026 | Daubrey.40love@hotmail.com | 801-824-7131 |
| xlsx-row-451 | Ziyan (Terry) Zhang | Ziyan | Zhang | 2026 | Ziyan.Zhang@imgacademy.education | (941) 447-5543 |
| xlsx-row-452 | Arjun Reiland | Arjun | Reiland | 2026 | arjunreiland@gmail.com | 816-382-7933 |
| xlsx-row-453 | (Sai) Kunal Amara | (Sai) | Amara | 2026 | — | — |
| xlsx-row-454 | Shane Hand | Shane | Hand | 2026 | shanehand89@gmail.com | (614) 325-5617 |
| xlsx-row-456 | Ethan Sun | Ethan | Sun | 2027 | — | — |
| xlsx-row-457 | Jack Lindstrom | Jack | Lindstrom | 2026 | — | — |
| xlsx-row-458 | Daniel Tonkal | Daniel | Tonkal | 2026 | — | (513) 850-6184 |
| xlsx-row-459 | Connor Wilcox | Connor | Wilcox | 2026 | — | — |
| xlsx-row-460 | Jaden Woller-Li | Jaden | Woller-Li | 2026 | — | 630-470-9100 |
| xlsx-row-461 | Jonathan Seder | Jonathan | Seder | 2026 | — | 312-502-8146 |
| xlsx-row-462 | Connor Thornton | Connor | Thornton | 2026 | — | — |
| xlsx-row-463 | Deepinder Singh | Deepinder | Singh | 2026 | — | (425) 785-4809 |
| xlsx-row-464 | Hudson Martson | Hudson | Martson | 2026 | hmarston26@riverdale.edu | — |
| xlsx-row-465 | Shaurya Swarup | Shaurya | Swarup | 2026 | shauryaswarup2025@gmail.com | — |
| xlsx-row-466 | Advaita Sircar | Advaita | Sircar | 2027 | — | — |
| xlsx-row-467 | Stuart Konezny | Stuart | Konezny | 2026 | stuartkonezny@gmail.com | — |
| xlsx-row-468 | Pavel (Pasha) Litvak | Pavel | Litvak | 2026 | litvak.pavel2008@gmail.com | — |
| xlsx-row-469 | Alex Thomas | Alex | Thomas | 2026 | — | — |
| xlsx-row-470 | Ivan Pflueger | Ivan | Pflueger | 2026 | ivanpflueger@gmail.com | 949.531.8933 |
| xlsx-row-471 | Rudr Malayya | Rudr | Malayya | 2026 | — | — |
| xlsx-row-473 | Martin Dimitrov | Martin | Dimitrov | 2026 | — | — |
| xlsx-row-474 | Shaun Fernando | Shaun | Fernando | 2026 | — | — |
| xlsx-row-475 | Danny Karia | Danny | Karia | 2026 | — | — |
| xlsx-row-476 | Dutch Prather | Dutch | Prather | 2026 | — | 918-859-1111 |

---

## 3. Existing People that would be enriched

Fill-null on Person only. **Never overwrite `classYear`.** **Never overwrite existing email/phone.** All four have blank contact on both sides.

| Coda row | Coda name | Person id | Person.classYear (keep) | recruitClassYear (write) | Fill-null if Person blank |
|---|---|---|---|---|---|
| xlsx-row-472 | Peter Berns | `player-peter-berns` | **2030** | **2026** | hometown Fort Meyers, FL; UTR 10.55; TRN 157 / id 934461 |
| xlsx-row-455 | Jackson MacTaggart | `player-jackson-mactaggart` | **2030** | **2026** | hometown Bahamas; UTR 10.73; TRN 110 / id 887218 |
| xlsx-row-410 | Luke Colson | `player-luke-colson` | **2030** | **2026** | hometown Goshen, KY; HS Online; UTR 10.50; TRN 154 / id 899496 |
| xlsx-row-416 | Minato Koido | `player-minato-koido` | **2030** | **2026** | hometown Orlando, FL; UTR 11.12; TRN 143 / id 971110 |

Do not change player role/status. Recruit Profile is still created.

---

## 4. RecruitProfiles that would be created

**461** = 457 CREATE People + 4 enriched People.

| Profile for | n | codaRowId |
|---|---:|---|
| New CREATE Person | 457 | that row’s `xlsx-row-*` |
| Enriched roster Person | 4 | 472, 455, 410, 416 |
| Folded Coda sibling | 0 extra | stored under canonical profile |

Twelve merge pairs → twelve profiles (canonical `coda_row_id` only).

---

## 5. Coda rows merged

**12** siblings fold into **12** canonicals. Both original 67-column rows stay in `codaExport`.

| Identity | Canonical (one Person + one profile) | Folded row | recruitClassYear | Resolution |
|---|---|---|---|---|
| Noah Vinbaytel | xlsx-row-126 | xlsx-row-191 | 2027 | Keep 126. Phone 718-757-5713. TRN 100 over 101. |
| Paxton Au | xlsx-row-91 | xlsx-row-364 | 2027 | Keep 91. TRN 95 over 121. Pipeline Active over Potential. |
| Mateo Rizo-Patron | xlsx-row-99 | xlsx-row-230 | 2027 | Keep 99. TRN 130 over 168. |
| Evan Chu | xlsx-row-109 | xlsx-row-215 | 2027 | Keep 109. TRN 167 over 153. Hometown New York, NY over NY. |
| Ivan Urbanovich | xlsx-row-110 | xlsx-row-182 | 2027 | Keep 110 tennis. Copy pipeline Potential from 182. TRN 222 over 193. |
| Balin Gupta | xlsx-row-19 | xlsx-row-177 | 2027 | Keep 19 tennis. Copy hometown NV from 177. TRN 178 over 188. |
| Matthew Sikorski | xlsx-row-57 | xlsx-row-120 | 2027 | Keep 57. Same TRN id 933987. Copy hometown/HS from 120. TRN Rank 94 over 97. |
| Aidan Bart | xlsx-row-402 | xlsx-row-394 | 2026 | Keep 402 (complete). Fold empty 394. Email a1bartnyc@icloud.com. |
| Peyton Barrett | xlsx-row-287 | xlsx-row-92 | 2027 | Keep 287. Fold empty-tennis 92. Same hometown San Marino, CA. |
| Walker Nelson | xlsx-row-231 | xlsx-row-94 | 2028 | Keep 231. Copy HS Bixby HS from 94. Same Tulsa, OK. |
| Luca Sevim | xlsx-row-353 | xlsx-row-93 | 2028 | Keep 353. Copy HS Laural Springs from 93. Chicago vs Chicago, IL. |
| Maksim Hristov (Maxim) | xlsx-row-432 | xlsx-row-400 | 2026 | Keep 432 Maksim. Same TRN id 955372. Email/phone on 432. TRN Rank 74 over 67. Display name Maksim. |

`codaExport` for these 12 profiles: `{ "primary": {…67 keys…}, "mergedRows": [ { "codaRowId": "xlsx-row-…", "row": {…67 keys…} } ] }`. Unique `coda_row_id` = canonical only.

Verification: 12 canonicals are in the CREATE set; 12 folded rows are not; no pair mints two People.

---

## 6. Rows skipped

| Coda row | Name | Why |
|---|---|---|
| xlsx-row-90 | *(blank)* | No Player Name. Created on `7/10/2026, 7:34 AM`, International=`0`, button artifacts. Do not create a Person. |

---

## 7. Remaining manual decisions

**0 rows.** The prior 12-row hold list is now approved MERGE (Sikorski, Bart, Barrett, Nelson, Sevim, Hristov).

Not merges (intentional KEEP SEPARATE, already in CREATE): Asher Negandhi ×2; Eiji Fujita vs Volodymyr Dombrovskyi; Samuel He vs Deepinder Singh.

---

## 8. Field-level conflicts

| Pair | Conflict | Preview resolution |
|---|---|---|
| Noah | TRN Rank 100 vs 101 | Keep 126 |
| Paxton | TRN 95 vs 121; Active vs Potential | Keep 91 |
| Mateo | TRN 130 vs 168 | Keep 99 |
| Evan | TRN 167 vs 153 | Keep 109 |
| Ivan | TRN 222 vs 193; pipeline blank vs Potential | Keep 110 tennis; copy Potential from 182 |
| Balin | TRN 178 vs 188; hometown blank vs NV | Keep 19 tennis; copy NV from 177 |
| Sikorski | TRN Rank 94 vs 97; same id 933987 | Keep 57 tennis; copy hometown/HS from 120 |
| Bart | 394 empty vs 402 complete | Keep 402 |
| Barrett | 92 empty tennis vs 287 complete | Keep 287 |
| Nelson | 94 HS-only vs 231 TRN | Keep 231; copy Bixby HS |
| Sevim | 93 HS-only vs 353 TRN | Keep 353; copy Laural Springs |
| Hristov | Maxim vs Maksim; TRN 67 vs 74; same id 955372 | Keep 432 Maksim (has email/phone) |
| Roster four | Coda HS 2026 vs Person 2030 | **Not a conflict.** 2030 stays; 2026 → recruitClassYear |
| Fujita / Vlad | shared TRN URL 1048343 | KEEP SEPARATE — two CREATE People |
| He / Singh | shared TRN URL 944605 | KEEP SEPARATE — two CREATE People |
| Asher | class 2028 vs 2027 | KEEP SEPARATE — two CREATE People |

No approved Coda pair has two disagreeing emails or phones.

---

## 9. Contact data mapping

| Rule |
|---|
| Coda Email → Person `personalEmail` on CREATE; fill-null only on ENRICH. |
| Coda Phone → Person `cellPhone` on CREATE; fill-null only on ENRICH. |
| Phone E164 stays in `codaExport` only. |
| Do not overwrite existing Person email/phone. |
| Do not drop a Coda email/phone: if it cannot land on Person, it remains in `codaExport`. |
| Coda→Coda MERGE: union onto the canonical Person. |

| Bucket | Emails | Phones |
|---|---:|---:|
| All 474 Coda rows | 95 | 105 |
| CREATE (457) | **95** | **105** |
| ENRICH / folded / SKIP | 0 | 0 |
| MANUAL REVIEW | 0 | 0 |

Bart email and Hristov email/phone now land on CREATE canonicals 402 and 432. Noah phone lands on 126.

---

## 10. Class-year mapping

| Situation | Person.classYear | RecruitProfile.recruitClassYear |
|---|---|---|
| CREATE new recruit | **unset** | Coda Class Year, or null if blank (44 CREATE rows) |
| Coda MERGE (12) | **unset** | Canonical Coda year (2026/2027/2028 as in §5) |
| ENRICH roster four | **2030 unchanged** | **2026** |
| SKIP | no write | no write |

Coda Class Year is never copied onto `Person.classYear`.

---

## 11. codaRowId / codaExport preservation

| Item | Rule |
|---|---|
| `codaRowId` | `xlsx-row-{Excel sheet row}` |
| Unique `coda_row_id` | Canonical / sole imported row |
| `codaExport` | Full 67 keys, unnormalized |
| 12 Coda merges | Primary 67 + `mergedRows[]` sibling 67 |
| Analytics / International=0 / buttons | `codaExport` only |
| SKIP stub | not attached to a Person |

Coda rows represented on the 461 profiles: 457 CREATE + 4 ENRICH + 12 folded siblings = **473**. Plus 1 SKIP = **474**. Every original Coda row is either on a profile (including as `mergedRows`) or the documented skip.

---

## 12. Final proposed import totals

| Object | Count |
|---|---:|
| Total Coda rows | **474** |
| Coda rows merged (folded) | **12** |
| Coda rows skipped | **1** |
| Resulting Recruit records | **461** |
| New People | **457** |
| Existing People enriched | **4** |
| RecruitProfiles to create | **461** |
| Manual-review rows remaining | **0** |
| People to delete | **0** |
| Database writes this milestone | **None** |

### Validation checklist

| Check | Result |
|---|---|
| All 474 rows have a disposition | Yes (457+12+4+1) |
| 12 approved pairs → 12 profiles, not 24 People | Yes |
| No approved duplicate creates two People | Yes |
| All Coda emails/phones land on a CREATE Person | Yes (95 / 105) |
| Coda Class Year → `recruitClassYear` | Yes |
| Existing `Person.classYear` never overwritten | Yes |
| Existing Person contact fill-null only | Yes |
| Original Coda rows preserved in `codaExport` / skip log | Yes |
| No automatic merges beyond the approved 12+4 | Yes |

---

## 13. Row-level disposition (474)

| Coda row | Name | Disposition |
|---|---|---|
| xlsx-row-3 | Jason Eigbedion | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-4 | Zhiyu Yuan | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-5 | Ved Vanga | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-6 | Juan Miguel Pereyra | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-7 | Garran McKay | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-8 | Andrew Chu | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-9 | Benjamin Wiese | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-10 | Cooper McKenna | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-11 | Camden Johnson | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-12 | Charlie Barton | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-13 | Tyson Young | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-14 | Ethan Chen | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-15 | Ross Johnson | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-16 | Jaren Scarborough | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-17 | Anuj Mathur | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-18 | Benjamin Montana | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-19 | Balin Gupta | CREATE NEW PERSON + RECRUIT PROFILE (canonical of Coda merge) |
| xlsx-row-20 | Gustavo Vasconcellos | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-21 | Anibal Nunez | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-22 | Bo Schroerlucke | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-23 | Addison Roach | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-24 | Alejandro Puentes | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-25 | Michael Homsi | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-26 | David Vartanov | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-27 | Cole LaFors | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-28 | Aidan Gionis | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-29 | Ketan Garg | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-30 | Marcello Bisogno | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-31 | Aakash Deodhar | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-32 | Taytum Jones | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-33 | Dylan Jones | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-34 | Shivraj Bhosale | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-35 | Aaron Wang | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-36 | Jaidyn Finley | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-37 | Chase Bowden | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-38 | Nicolas Pedraza | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-39 | Darren Wei | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-40 | Lucas Smith | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-41 | Rocco Roti | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-42 | Saahil Gupte | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-43 | Aidan Xu | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-44 | Andrej Markovic | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-45 | Chase Gerloff | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-46 | Aashray Arun | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-47 | Shaw Akula | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-48 | Maddox Bose | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-49 | Maksim Nekrasov | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-50 | Thomas Sirichantho | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-51 | Elijah Johnson | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-52 | Harsha Karakala Reddy | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-53 | Oscar Puyplat | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-54 | Joshua Bayete Miller | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-55 | Enzo Carvalho | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-56 | Nason Lo | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-57 | Matthew Sikorski | CREATE NEW PERSON + RECRUIT PROFILE (canonical of Coda merge) |
| xlsx-row-58 | Carter Cotich | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-59 | William (Bennett) Crew | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-60 | Ryu Kotikula (Ree oo) | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-61 | David Liu | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-62 | William Krusen | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-63 | Zain Choudry | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-64 | Keller Veltenaar | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-65 | Hunter Udis | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-66 | Julian Parnell | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-67 | Yuvraj Dasari | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-68 | Thomas McCormick | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-69 | Charles Ma | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-70 | Lukas Sorgic | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-71 | Jake Farquhar | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-72 | Ezra Crum | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-73 | Seth Lomas | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-74 | Oliver Derrow | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-75 | Stephen Gollapalli | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-76 | Casey Beckmann | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-77 | Elijah Shimman | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-78 | Michael Cho | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-79 | Cooper Remy | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-80 | Griffin Richards | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-81 | Mathieu Fosse | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-82 | Giorgio Materazzo | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-83 | Bradley Ng | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-84 | Brennan Plunkett | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-85 | Grant Schaefer | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-86 | Jonah Grismer | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-87 | Philip Etzel | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-88 | Zachary Sanchez | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-89 | Karson Walden | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-90 | — | SKIP |
| xlsx-row-91 | Paxton Au | CREATE NEW PERSON + RECRUIT PROFILE (canonical of Coda merge) |
| xlsx-row-92 | Peyton Barrett | MERGE Coda rows → ONE RECRUIT PROFILE → canonical xlsx-row-287 |
| xlsx-row-93 | Luca Sevim | MERGE Coda rows → ONE RECRUIT PROFILE → canonical xlsx-row-353 |
| xlsx-row-94 | Walker Nelson | MERGE Coda rows → ONE RECRUIT PROFILE → canonical xlsx-row-231 |
| xlsx-row-95 | George Faraci | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-96 | Asher Negandhi | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-97 | Matteo Rizo-Patron | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-98 | Johan Schick | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-99 | Mateo Rizo-Patron | CREATE NEW PERSON + RECRUIT PROFILE (canonical of Coda merge) |
| xlsx-row-100 | Brandon Bao | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-101 | Leon Moldenhauer | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-102 | Ezra Britton | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-103 | Martin Fernandez | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-104 | Aruth Chinsupakul | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-105 | Ned Bishop | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-106 | Enzo Badotti Cariani | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-107 | Rafael Gama | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-108 | Ricards Dzirkals | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-109 | Evan Chu | CREATE NEW PERSON + RECRUIT PROFILE (canonical of Coda merge) |
| xlsx-row-110 | Ivan Urbanovich | CREATE NEW PERSON + RECRUIT PROFILE (canonical of Coda merge) |
| xlsx-row-111 | Simon Monsanto | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-112 | Kaito Tokukura | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-113 | Shayane Joglekar | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-114 | Decker Lenzen | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-115 | Georgii Demers | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-116 | Gideon Ames | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-117 | Yusaku Harashima | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-118 | Leo Zelenko | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-119 | Brennan Coletta | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-120 | Matthew Sikorski | MERGE Coda rows → ONE RECRUIT PROFILE → canonical xlsx-row-57 |
| xlsx-row-121 | Gareth Kurowski | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-122 | Janek Teply | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-123 | David Waterman | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-124 | Vivaan Moghekar | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-125 | Nicholas Marhoff | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-126 | Noah Vinbaytel | CREATE NEW PERSON + RECRUIT PROFILE (canonical of Coda merge) |
| xlsx-row-127 | Aariz Rehman | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-128 | Agastya Singh | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-129 | Dawson Daves | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-130 | Daniel Vartanov | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-131 | Zade Azmeh | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-132 | Akiva Goldwasser | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-133 | Nicolas Cudny | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-134 | Vansh Patel | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-135 | Vedansh Pande | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-136 | Jaden Worden | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-137 | Chase Klugo | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-138 | Charlie Phillips | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-139 | Ajay Prasanna | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-140 | James Register | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-141 | Jude Sangar | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-142 | Aditya Shah | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-143 | Aarav Shah | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-144 | Levi Solomon | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-145 | Lucas Stoecker | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-146 | Brady Stump | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-147 | Reed Sugarman | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-148 | Zain Taqi | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-149 | David Toth | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-150 | Mark Watson | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-151 | Brady Winston | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-152 | Wesley Worobel | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-153 | Tarek Yassine | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-154 | Lucas Zhang | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-155 | Jarren Griffin | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-156 | Tristan Bradu | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-157 | Ty Taylor | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-158 | Maximus Monogenis | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-159 | Andres Matos | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-160 | Clayton Pohoski | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-161 | Ryan Wang | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-162 | Leo Yang | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-163 | Isaiah Parra | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-164 | Maximiliano Roca | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-165 | Andreas Udall | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-166 | Grant Kleppinger | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-167 | Kai Collins | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-168 | Spencer Trattner | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-169 | Dan Horwitz | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-170 | Connor Yang | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-171 | Mateo Pouso | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-172 | Udaijot Sangha | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-173 | Reed MacAlester | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-174 | Mitchell Hofer | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-175 | Adam Roman | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-176 | Noa Cakaric | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-177 | Balin Gupta | MERGE Coda rows → ONE RECRUIT PROFILE → canonical xlsx-row-19 |
| xlsx-row-178 | Aiden Yeung | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-179 | James Barrow | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-180 | Matthew Morneault | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-181 | Koray Abramson | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-182 | Ivan Urbanovich | MERGE Coda rows → ONE RECRUIT PROFILE → canonical xlsx-row-110 |
| xlsx-row-183 | Nicholas Joyce | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-184 | Juan Carlos Benito | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-185 | Blake Hussey | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-186 | Tanush Reddy Gade | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-187 | Hans Sempre | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-188 | Drew Barr | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-189 | Noah Gou | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-190 | Liam Collins | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-191 | Noah Vinbaytel | MERGE Coda rows → ONE RECRUIT PROFILE → canonical xlsx-row-126 |
| xlsx-row-192 | Rushil Rajpal | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-193 | Andrew Zielinski | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-194 | Brayden Amey | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-195 | Brayden Campion | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-196 | Luca Tabidze | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-197 | Shayne Joglekar | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-198 | Mark Mrcela | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-199 | Landon Vens | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-200 | Albert Crismar | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-201 | JohnPaul Huston | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-202 | Gianluca Galasso | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-203 | Adrian Baerga-Torres | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-204 | Sergio Garin | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-205 | Zachary Keiper | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-206 | Tomas Orrego | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-207 | Samuel Rosales Stephen | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-208 | Collin De Oliveira | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-209 | Tarak Ram Muvva | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-210 | Austin Potter | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-211 | Jordan Papadopoulos | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-212 | Mathieu Veltkamp | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-213 | Ashwin Willy | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-214 | Kevin Lee | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-215 | Evan Chu | MERGE Coda rows → ONE RECRUIT PROFILE → canonical xlsx-row-109 |
| xlsx-row-216 | Illia Shcherbakov | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-217 | Luke Conner | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-218 | Samuel Church-Schulman | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-219 | Jacob Pletka | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-220 | Lucas Huang | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-221 | Nolan Baynham | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-222 | Zahir Hassan | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-223 | Brady Kattan | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-224 | Levi Brumbaugh | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-225 | Michael Shope | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-226 | Oliver Carpenter | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-227 | Nihal Narisetty | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-228 | Dash Parkinson-Lubold | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-229 | Advay Singh | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-230 | Mateo Rizo-Patron | MERGE Coda rows → ONE RECRUIT PROFILE → canonical xlsx-row-99 |
| xlsx-row-231 | Walker Nelson | CREATE NEW PERSON + RECRUIT PROFILE (canonical of Coda merge) |
| xlsx-row-232 | Marko Mikic | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-233 | Rafael Bote | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-234 | William Delach | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-235 | Kush Bhandari | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-236 | Ian Sweeney | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-237 | Aiden Zadeh | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-238 | Akshath Hemanth | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-239 | Aman Dole | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-240 | Alonso Berry | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-241 | Harrison Lessard | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-242 | Trishiv Premanand | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-243 | Casra Afsharipour | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-244 | Cyrus Josephs | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-245 | Dylan Warn | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-246 | Kona Parseghian | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-247 | Yicheng Feng | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-248 | Mason Menyhart | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-249 | Mayurchandra Bharath | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-250 | Elliott Awomoyi | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-251 | Sebastian Wright | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-252 | Sam Calvert | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-253 | Aaron Tokarz | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-254 | Oliver Caldwell | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-255 | Mason Fekete | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-256 | Nirbhay Agarwal | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-257 | Henry Waddell | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-258 | Benjamin Chervoneva | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-259 | Gus Geubelle | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-260 | Van Davidson | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-261 | Advay Aggarwal | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-262 | John Ozmun | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-263 | Adrian Marin | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-264 | Niranjan Ramalingam | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-265 | Michael Goldovsky | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-266 | Luca de Calice | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-267 | Justin Zhang | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-268 | Brendan Linstrom | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-269 | Ayden Thielsen | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-270 | Kensho Ford | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-271 | Louden Muha | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-272 | Braden Lambert | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-273 | Ashwin Sudhakar | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-274 | Vincenzo Caruso | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-275 | Sal Ponamgi | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-276 | Ricardo Espalliat | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-277 | Shreyash Upadhyay | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-278 | Joseph DeGracia | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-279 | Raj Pisal | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-280 | Daven Aga | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-281 | Colin McPeek | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-282 | Charlie Schlenker | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-283 | Reid Ferreira | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-284 | Alexander Park | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-285 | Peter Jorniak | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-286 | Rafael Lopez | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-287 | Peyton Barrett | CREATE NEW PERSON + RECRUIT PROFILE (canonical of Coda merge) |
| xlsx-row-288 | Joshua Golden | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-289 | David Grigoryan | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-290 | Elijah Mireles | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-291 | Sebastian Zavala | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-292 | Maddox Iliescu | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-293 | Qi Ao | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-294 | Peter Choi | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-295 | Manas Kondapalli | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-296 | Matei Calin | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-297 | Jiarui Zhang | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-298 | John Murphy | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-299 | Kurt Sayan | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-300 | Kalvin Seo | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-301 | Jackson McCrory | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-302 | Vivek Kuchimanchi | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-303 | Nathan De Croos | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-304 | Finn Ashley | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-305 | Alexander Dirlea | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-306 | Alexander Lerman | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-307 | Lucas Rowe | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-308 | Ethan Hu | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-309 | Hunter Jones | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-310 | Santiago Bisogno | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-311 | Smyan Vijay | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-312 | Vedant Bhende | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-313 | Kyler Sigurdsson | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-314 | Jose Vasquez | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-315 | Brayden Bonetti | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-316 | Christian Rohrberg | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-317 | Petru Cotoman | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-318 | Joseph Kim | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-319 | Asher Negandhi | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-320 | Matteo Huarte | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-321 | Anish Poojari | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-322 | George Santalov | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-323 | Siddharth Bharadwaj | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-324 | Arjun Prabhakar | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-325 | Miguel Rooney | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-326 | Joseph Nau | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-327 | Henry Lessard | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-328 | Soren Swenson | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-329 | Luca Ostovany | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-330 | Rowan Qalbani | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-331 | Ilias Bouzoubaa | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-332 | Eli Kaminski | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-333 | Wesley Cotton | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-334 | Lennart Hammargren | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-335 | Daniel Malacek | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-336 | Ivan Rybak | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-337 | Piotr Gradzki | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-338 | James Andrew Ross | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-339 | Nikhil Bommaiah | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-340 | Antanas Daugis | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-341 | Maxwell Paape | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-342 | Ryan Corcoran | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-343 | Simon Hayal | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-344 | Nile Ung | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-345 | Zesen Wang | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-346 | Karthik Thumu | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-347 | Robert McAdoo | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-348 | Joshua Dolinsky | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-349 | Cayden Laughton | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-350 | Akshay Mirmira | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-351 | Atticus Kim | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-352 | Boning Wang | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-353 | Luca Sevim | CREATE NEW PERSON + RECRUIT PROFILE (canonical of Coda merge) |
| xlsx-row-354 | Sean Peng | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-355 | Alexander Anderson | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-356 | Zander Abrams | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-357 | Damian Gutheil | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-358 | Rafael Pawar | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-359 | Rohan Vyas | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-360 | Daniil Berezin | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-361 | Aayush Vartak | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-362 | Surya DeDatta | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-363 | Tristan Ascenzo | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-364 | Paxton Au | MERGE Coda rows → ONE RECRUIT PROFILE → canonical xlsx-row-91 |
| xlsx-row-365 | Carson Kuchar | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-366 | Aryan Ponugoti | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-367 | Alexander Totoian | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-368 | Eita Mishima | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-369 | Blake Wright | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-370 | Connor Feehan | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-371 | Zachary Szymanski | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-372 | Griffin Goode | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-373 | Max Dukowicz | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-374 | Ethan Turunen | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-375 | Adrian Sharma | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-376 | Ricky Jeong | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-377 | Peter Nistad | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-378 | Braylon Desquitado | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-379 | Pietro Sagone | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-380 | Finn Keenan | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-381 | Alec Rodriguez-Fields | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-382 | Alexander Wriedt | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-383 | Aidan Conley | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-384 | Karam Dhawan | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-385 | Yosef Elyashkevich | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-386 | Owen Conley | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-387 | Alex Borisov | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-388 | Eiji Fujita | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-389 | Saje Menon | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-390 | Joseph Owen Lauw | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-391 | Hayden Williams | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-392 | James Lammas | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-393 | Henry Groves | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-394 | Aidan Bart | MERGE Coda rows → ONE RECRUIT PROFILE → canonical xlsx-row-402 |
| xlsx-row-395 | Jaden Dai | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-396 | Jack Reis | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-397 | Jovan Morales | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-398 | Neelan Gandhi | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-399 | Volodymyr (Vlad) Dombrovskyi | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-400 | Maxim Hristov | MERGE Coda rows → ONE RECRUIT PROFILE → canonical xlsx-row-432 |
| xlsx-row-401 | Drew Gilbert | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-402 | Aidan Bart | CREATE NEW PERSON + RECRUIT PROFILE (canonical of Coda merge) |
| xlsx-row-403 | William McEwan | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-404 | Dylan Donovan | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-405 | Kawelo Tsuneyoshi | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-406 | Ayden Fraire | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-407 | Colin Cerminara | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-408 | JP (Jose Pablo) Coello | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-409 | TJ Shanahan | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-410 | Luke Colson | ENRICH EXISTING PERSON + CREATE RECRUIT PROFILE → player-luke-colson |
| xlsx-row-411 | Michael Mitchell | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-412 | Preston Lubiniecki | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-413 | Aiden Mueller | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-414 | Dudley Willis | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-415 | Bobby Rohs | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-416 | Minato Koido | ENRICH EXISTING PERSON + CREATE RECRUIT PROFILE → player-minato-koido |
| xlsx-row-417 | Michael Geffre | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-418 | Robert Chen | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-419 | Kabir Motwani | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-420 | Rohan Rao | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-421 | Alexander Klimovich | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-422 | Cooper Grim | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-423 | Mirco Koledin | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-424 | Aarav Nair | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-425 | Vikram Narendran | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-426 | Samuel Schumacher | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-427 | Samuel He | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-428 | Alton Swan | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-429 | Alex Walker | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-430 | Mason Crosby | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-431 | Alessandro De Bernardo | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-432 | Maksim Hristov | CREATE NEW PERSON + RECRUIT PROFILE (canonical of Coda merge) |
| xlsx-row-433 | Juno Pethe | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-434 | Tair Sarmivov | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-435 | Filip Nikolovski | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-436 | Jonah Stolte | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-437 | Landon Marcus | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-438 | Simon Zoldan | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-439 | Julian (Who Li-in) Winter | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-440 | PJ Barry | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-441 | Isaac Lewis | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-442 | Luca Ugel | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-443 | Brady Friesen | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-444 | Alex Borbiu | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-445 | Aaditt Rishi | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-446 | Sean Park | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-447 | Oliver Mesicek | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-448 | Braden LeBaron | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-449 | Dante Chabot | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-450 | Davis Aubrey | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-451 | Ziyan (Terry) Zhang | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-452 | Arjun Reiland | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-453 | (Sai) Kunal Amara | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-454 | Shane Hand | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-455 | Jackson MacTaggart | ENRICH EXISTING PERSON + CREATE RECRUIT PROFILE → player-jackson-mactaggart |
| xlsx-row-456 | Ethan Sun | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-457 | Jack Lindstrom | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-458 | Daniel Tonkal | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-459 | Connor Wilcox | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-460 | Jaden Woller-Li | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-461 | Jonathan Seder | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-462 | Connor Thornton | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-463 | Deepinder Singh | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-464 | Hudson Martson | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-465 | Shaurya Swarup | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-466 | Advaita Sircar | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-467 | Stuart Konezny | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-468 | Pavel (Pasha) Litvak | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-469 | Alex Thomas | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-470 | Ivan Pflueger | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-471 | Rudr Malayya | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-472 | Peter Berns | ENRICH EXISTING PERSON + CREATE RECRUIT PROFILE → player-peter-berns |
| xlsx-row-473 | Martin Dimitrov | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-474 | Shaun Fernando | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-475 | Danny Karia | CREATE NEW PERSON + RECRUIT PROFILE |
| xlsx-row-476 | Dutch Prather | CREATE NEW PERSON + RECRUIT PROFILE |

---

No import. No Supabase writes.
