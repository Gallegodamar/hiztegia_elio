-- Seed: Eguneko Gramatika (7 micro-lecciones)
begin;

-- Upsert lessons
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active) values (
  
'B1'
,
  
'-ra vs -n (norantz vs kokapena)'
,
  
'Euskaraz, -ra atzizkia norantz (helmuga / norabidea) adierazteko erabiltzen da; -n, berriz, kokapena (non) adierazteko.'
,
  
'[{"eu":"Donostiara noa.","es":"Voy a Donostia (direcciÃ³n/objetivo)."},{"eu":"Donostian bizi naiz.","es":"Vivo en Donostia (ubicaciÃ³n)."},{"eu":"Etxera joan naiz.","es":"He ido a casa (destino)."},{"eu":"Etxean nago.","es":"Estoy en casa (lugar)."}]'
::jsonb,
  
'Trikimailua: galdera egin. ''Nora?'' â†’ -ra. ''Non?'' â†’ -n.'
,
  
4
,
  
array['kasua', 'mugimendua', 'kokapena']::text[]
,
  true
) on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active) values (
  
'B1'
,
  
'-tik (jatorria) eta -ra (helmuga)'
,
  
'-tik atzizkiak jatorria edo abiapuntua adierazten du (nondik?); -ra atzizkiak helmuga (nora?).'
,
  
'[{"eu":"Gasteiztik nator.","es":"Vengo de Gasteiz (origen)."},{"eu":"Gasteizera noa.","es":"Voy a Gasteiz (destino)."},{"eu":"Etxetik irten naiz.","es":"He salido de casa."},{"eu":"Etxera itzuli naiz.","es":"He vuelto a casa."}]'
::jsonb,
  
'Askotan bikotean agertzen dira: ''X-tik Y-ra''.'
,
  
4
,
  
array['kasua', 'jatorria', 'helmuga']::text[]
,
  true
) on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active) values (
  
'B2'
,
  
'-enean vs -tzean (denborazko perpausak)'
,
  
'-enean normalean gertakari zehatz bati lotzen zaio (noiz? une jakin batean). -tzean sarriago erabiltzen da ekintza/egoera orokorrago edo prozedurazko batean.'
,
  
'[{"eu":"Etxera iritsi nintzenean, deitu nuen.","es":"Cuando lleguÃ© a casa (momento concreto), llamÃ©."},{"eu":"Etxera iristean, beti oinetakoak kentzen ditut.","es":"Al llegar a casa (hÃ¡bito), siempre me quito los zapatos."},{"eu":"Azterketa bukatu nuenean, lasaitu nintzen.","es":"Cuando terminÃ© el examen, me relajÃ©."}]'
::jsonb,
  
'Biak posible dira kasu batzuetan, baina -tzean ohikoagoa da ohituretan/argibideetan.'
,
  
5
,
  
array['menderakuntza', 'denbora', 'perpausak']::text[]
,
  true
) on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active) values (
  
'B2'
,
  
'-en arren (kontrastea: ''nahiz eta...'')'
,
  
'-en arren = ''a pesar de que''. Aurreikuspena hautsi egiten da: lehen zatian espero dena ez da betetzen bigarrenean.'
,
  
'[{"eu":"Euria egin arren, irten gara.","es":"Aunque llovÃ­a, hemos salido."},{"eu":"Nekatuta egon arren, lanari ekin dio.","es":"A pesar de estar cansado, se ha puesto a trabajar."}]'
::jsonb,
  
'Askotan sinonimoa da: ''nahiz eta euria egin, irten gara''. Baina -en arren oso trinkoa da eta idatzian ohikoa.'
,
  
5
,
  
array['menderakuntza', 'kontrastea', 'argumentazioa']::text[]
,
  true
) on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active) values (
  
'B2'
,
  
'omen / ote (ziurgabetasuna eta zurrumurrua)'
,
  
'omen erabiltzen da entzundako informazioa (zurrumurrua) adierazteko. ote galdera/ziurgabetasun kutsua emateko erabiltzen da.'
,
  
'[{"eu":"Bihar greba omen dago.","es":"Dicen que maÃ±ana hay huelga."},{"eu":"Etorri ote da?","es":"Â¿HabrÃ¡ venido? / Â¿HabrÃ¡ llegado?"},{"eu":"Hori egia omen da.","es":"Se supone que eso es verdad."}]'
::jsonb,
  
'omen = ''dicen que''. ote = duda, pregunta interna.'
,
  
4
,
  
array['modalitatea', 'diskurtsoa', 'matizak']::text[]
,
  true
) on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active) values (
  
'C1'
,
  
'berriz vs ordea (kontraste diskurtsiboa)'
,
  
'berriz maiz erabiltzen da bi elementu kontrajarri edo txandakatzean (A..., B, berriz...). ordea formaltasun handiagokoa da eta aurreko ideiari kontrapuntua jartzen dio.'
,
  
'[{"eu":"Nik bai; zu, berriz, ez.","es":"Yo sÃ­; tÃº, en cambio, no."},{"eu":"Saiatu da; ordea, ez du lortu.","es":"Lo ha intentado; sin embargo, no lo ha logrado."},{"eu":"Guk joango gara. Zuek, berriz, hemen geratuko zarete.","es":"Nosotros iremos. Vosotros, en cambio, os quedarÃ©is aquÃ­."}]'
::jsonb,
  
'berriz = alternancia/contraste entre dos sujetos/partes. ordea = ''sin embargo'' mÃ¡s argumentativo y formal.'
,
  
5
,
  
array['lokailuak', 'diskurtsoa', 'idazketa']::text[]
,
  true
) on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active) values (
  
'C1'
,
  
'Fokalizazioa: ''ba-'' eta ordena markatua (azpimarra)'
,
  
'Euskaraz, informazioa azpimarratzeko (fokoa) ordena markatua edo partikulak erabil daitezke. ''Ba-'' askotan baieztapen/azpimarra edo erantzun-kolpea emateko erabiltzen da testuinguru batzuetan.'
,
  
'[{"eu":"Nik BAi dakit.","es":"Yo SÃ lo sÃ© (Ã©nfasis)."},{"eu":"BA... hori ez nuen espero!","es":"Puesâ€¦ Â¡eso no me lo esperaba!"},{"eu":"LIBURUA irakurri dut, ez artikulua.","es":"He leÃ­do EL LIBRO, no el artÃ­culo."}]'
::jsonb,
  
'Helburua ez da arau itxi bat, baizik eta efektu komunikatiboa: zer azpimarratu nahi duzun. (Ahozkoan intonazioarekin doa askotan.)'
,
  
5
,
  
array['pragmatika', 'azpimarra', 'diskurtsoa']::text[]
,
  true
) on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

-- Upsert questions
insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select id, 
1
, 
'Bilbo__ noa.'
, 
'["Bilbora","Bilbon","Bilbotik"]'
::jsonb, 
0
, 
'''Nora noa?'' helmuga da â†’ Bilbora.'
, true
from public.grammar_lessons
where level = 
'B1'
 and title = 
'-ra vs -n (norantz vs kokapena)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select id, 
2
, 
'Gaur arratsaldean etxe__ geratuko naiz.'
, 
'["etxera","etxean","etxetik"]'
::jsonb, 
1
, 
'''Non geratuko naiz?'' kokapena da â†’ etxean.'
, true
from public.grammar_lessons
where level = 
'B1'
 and title = 
'-ra vs -n (norantz vs kokapena)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select id, 
3
, 
'IruÃ±e__ bizi da nire laguna.'
, 
'["IruÃ±era","IruÃ±ean","IruÃ±etik"]'
::jsonb, 
1
, 
'Bizi = non? â†’ IruÃ±ean.'
, true
from public.grammar_lessons
where level = 
'B1'
 and title = 
'-ra vs -n (norantz vs kokapena)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select id, 
1
, 
'Unibertsitate__ etorri naiz autobusez.'
, 
'["unibertsitatera","unibertsitatean","unibertsitatetik"]'
::jsonb, 
2
, 
'''Nondik etorri naiz?'' â†’ unibertsitatetik.'
, true
from public.grammar_lessons
where level = 
'B1'
 and title = 
'-tik (jatorria) eta -ra (helmuga)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select id, 
2
, 
'Bihar goizean lan__ joango naiz.'
, 
'["lanera","lanean","lanetik"]'
::jsonb, 
0
, 
'''Nora joango naiz?'' â†’ lanera.'
, true
from public.grammar_lessons
where level = 
'B1'
 and title = 
'-tik (jatorria) eta -ra (helmuga)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select id, 
1
, 
'Etxera iritsi __, mezua bidali zidan.'
, 
'["nintzenean","iristean","nintzenean/iristean (biak)"]'
::jsonb, 
0
, 
'Gertakari zehatza da â†’ ''iritsi nintzenean''.'
, true
from public.grammar_lessons
where level = 
'B2'
 and title = 
'-enean vs -tzean (denborazko perpausak)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select id, 
2
, 
'Klasea hasi __, mugikorra isilarazi.'
, 
'["denean","tzean","denean/tzean (biak)"]'
::jsonb, 
1
, 
'Argibide/prozedura moduan â†’ ''hastean'' (-tzean).'
, true
from public.grammar_lessons
where level = 
'B2'
 and title = 
'-enean vs -tzean (denborazko perpausak)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select id, 
1
, 
'Hotza __, mendira joan dira.'
, 
'["egiten arren","egiten denean","egitean"]'
::jsonb, 
0
, 
'Kontrastea (''a pesar de'') â†’ ''egiten arren''.'
, true
from public.grammar_lessons
where level = 
'B2'
 and title = 
'-en arren (kontrastea: ''nahiz eta...'')'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select id, 
2
, 
'Denbora gutxi __, proiektua amaitu dute.'
, 
'["izan arren","izatean","dagoenean"]'
::jsonb, 
0
, 
'''Denbora gutxi izan arren'' = aunque habÃ­a poco tiempo.'
, true
from public.grammar_lessons
where level = 
'B2'
 and title = 
'-en arren (kontrastea: ''nahiz eta...'')'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select id, 
1
, 
'Aste honetan euria __ du.'
, 
'["omen","ote","ere"]'
::jsonb, 
0
, 
'Informazioa ''entzundakoa'' â†’ omen.'
, true
from public.grammar_lessons
where level = 
'B2'
 and title = 
'omen / ote (ziurgabetasuna eta zurrumurrua)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select id, 
2
, 
'Gaur berandu iritsiko __ naiz?'
, 
'["ote","omen","baino"]'
::jsonb, 
0
, 
'Duda/pregunta â†’ ote.'
, true
from public.grammar_lessons
where level = 
'B2'
 and title = 
'omen / ote (ziurgabetasuna eta zurrumurrua)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select id, 
1
, 
'Emaitzak onak dira; __, hobetu daiteke.'
, 
'["ordea","berriz","gainera"]'
::jsonb, 
0
, 
'Egitura argumentatiboa (''sin embargo'') â†’ ordea.'
, true
from public.grammar_lessons
where level = 
'C1'
 and title = 
'berriz vs ordea (kontraste diskurtsiboa)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select id, 
2
, 
'Ane etorriko da. Jon, __, etxean geratuko da.'
, 
'["berriz","ordea","hala ere"]'
::jsonb, 
0
, 
'Bi pertsona kontrajarri (A..., B, berriz) â†’ berriz.'
, true
from public.grammar_lessons
where level = 
'C1'
 and title = 
'berriz vs ordea (kontraste diskurtsiboa)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select id, 
1
, 
'Aukeratu azpimarra adierazten duen esaldia (fokoa):'
, 
'["Liburua irakurri dut, ez artikulua.","Liburua irakurri dut eta artikulua ere bai.","Liburua irakurri dut gaur."]'
::jsonb, 
0
, 
'Kontraste bidezko fokalizazioa: ''liburua'' azpimarratzen da.'
, true
from public.grammar_lessons
where level = 
'C1'
 and title = 
'Fokalizazioa: ''ba-'' eta ordena markatua (azpimarra)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select id, 
2
, 
'Testuinguruan erantzun azpimarratua emateko egokiena:'
, 
'["Bai, badakit.","Bai, ote dakit.","Bai, omen dakit."]'
::jsonb, 
0
, 
'Azpimarra/baieztapena â†’ ''badakit'' (ba-).'
, true
from public.grammar_lessons
where level = 
'C1'
 and title = 
'Fokalizazioa: ''ba-'' eta ordena markatua (azpimarra)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

commit;
