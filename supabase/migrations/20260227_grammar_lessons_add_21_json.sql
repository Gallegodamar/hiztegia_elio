-- Seed generated from "21 lecciones.json"
-- Lessons in file: 18
begin;

-- B1 ? -rekin (norekin) vs -z (zerez) oinarrizkoa
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'B1',
  '-rekin (norekin) vs -z (zerez) oinarrizkoa',
  '-rekin atzizkia pertsona edo zerbaitekin batera egitea da (norekin). -z atzizkia tresna edo modua da (zerez, nola).',
  '[{"eu":"Ane-rekin nator.","es":"Vengo con Ane."},{"eu":"Autobusez joan naiz.","es":"He ido en autobus (modo/medio)."},{"eu":"Labanez moztu dut.","es":"He cortado con cuchillo (instrumento)."}]'::jsonb,
  'Galdera: norekin -> -rekin. zerez/nola -> -z.',
  4,
  array['kasua', 'tresnak', 'laguntasuna']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Nire lagun__ joango naiz zinemara.',
  '["lagunarekin","lagunaz","lagunarengana"]'::jsonb,
  0,
  'Norekin? -> lagunarekin.',
  true
from public.grammar_lessons gl
where gl.level = 'B1'
  and gl.title = '-rekin (norekin) vs -z (zerez) oinarrizkoa'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Trenez etorri naiz. Hemen -z zer da?',
  '["tresna edo modua","kokapena","jatorria"]'::jsonb,
  0,
  '-z hemen modua/garraioa da.',
  true
from public.grammar_lessons gl
where gl.level = 'B1'
  and gl.title = '-rekin (norekin) vs -z (zerez) oinarrizkoa'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'B1'
  and gl.title = '-rekin (norekin) vs -z (zerez) oinarrizkoa'
  and gq.position > 2;

-- B1 ? -ko (jatorria edo lotura) oinarrizkoa
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'B1',
  '-ko (jatorria edo lotura) oinarrizkoa',
  '-ko atzizkiak lotura edo jatorria adieraz dezake: nonkoa, zein motatakoa, edo zeinekin lotua.',
  '[{"eu":"Donostiako hondartzak ederrak dira.","es":"Las playas de Donostia son bonitas."},{"eu":"Gaurko berriak irakurri ditut.","es":"He leido las noticias de hoy."},{"eu":"Etxeko atea zabalik dago.","es":"La puerta de casa esta abierta."}]'::jsonb,
  'Askotan gaztelaniazko ''de'' bezala: Donostiako, gaurko, etxeko.',
  4,
  array['postposizioa', 'jatorria', 'erlazioa']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Aukeratu egokiena: Gaur__ eguraldia ona da.',
  '["gaurko","gaurra","gaurrean"]'::jsonb,
  0,
  'Gaurko = de hoy.',
  true
from public.grammar_lessons gl
where gl.level = 'B1'
  and gl.title = '-ko (jatorria edo lotura) oinarrizkoa'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Aukeratu egokiena: Bilbo__ museoa bisitatu dut.',
  '["Bilboko","Bilbora","Bilbon"]'::jsonb,
  0,
  'Bilboko museoa = el museo de Bilbao.',
  true
from public.grammar_lessons gl
where gl.level = 'B1'
  and gl.title = '-ko (jatorria edo lotura) oinarrizkoa'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'B1'
  and gl.title = '-ko (jatorria edo lotura) oinarrizkoa'
  and gq.position > 2;

-- B1 ? -en (genitiboa) eta -rena (noren) oinarrizkoa
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'B1',
  '-en (genitiboa) eta -rena (noren) oinarrizkoa',
  '-en genitiboak noren? adierazten du: Aleren liburua. -rena askotan izenordain moduan erabiltzen da: nirea, zurea, haren-a.',
  '[{"eu":"Aneren liburua da.","es":"Es el libro de Ane."},{"eu":"Liburu hau nirea da.","es":"Este libro es mio."},{"eu":"Giltzak zureak dira.","es":"Las llaves son tuyas."}]'::jsonb,
  'A + -en + izena. Eta izena ez errepikatzeko: nirea/zurea/haren-a.',
  5,
  array['kasua', 'jabetza', 'genitiboa']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Aukeratu egokiena: Jon__ autoa gorria da.',
  '["Jonen","Joni","Jondik"]'::jsonb,
  0,
  'Noren autoa? -> Jonen.',
  true
from public.grammar_lessons gl
where gl.level = 'B1'
  and gl.title = '-en (genitiboa) eta -rena (noren) oinarrizkoa'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Aukeratu egokiena: Poltsa hau (ni) __ da.',
  '["nirea","nirekin","nirean"]'::jsonb,
  0,
  'Izenordain jabetza: nirea.',
  true
from public.grammar_lessons gl
where gl.level = 'B1'
  and gl.title = '-en (genitiboa) eta -rena (noren) oinarrizkoa'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'B1'
  and gl.title = '-en (genitiboa) eta -rena (noren) oinarrizkoa'
  and gq.position > 2;

-- B1 ? Aditz perifrastikoa: ari izan (orain jarraitua)
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'B1',
  'Aditz perifrastikoa: ari izan (orain jarraitua)',
  'Ari izan egitura ekintza une honetan egiten ari dela adierazteko: irakurtzen ari naiz.',
  '[{"eu":"Afaltzen ari gara.","es":"Estamos cenando."},{"eu":"Lan egiten ari naiz.","es":"Estoy trabajando."},{"eu":"Euria egiten ari du.","es":"Esta lloviendo."}]'::jsonb,
  'Egitura: aditza -tzen + ari + izan (naiz/zara/da...).',
  4,
  array['aditza', 'perifrasiak', 'oraina']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Orain bertan: (irakurri) __.',
  '["irakurtzen ari naiz","irakurri dut","irakurriko dut"]'::jsonb,
  0,
  'Une honetan -> irakurtzen ari naiz.',
  true
from public.grammar_lessons gl
where gl.level = 'B1'
  and gl.title = 'Aditz perifrastikoa: ari izan (orain jarraitua)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Aukeratu egokiena: Haurrak jolasten __.',
  '["ari dira","dira ari","ari da"]'::jsonb,
  0,
  'Subjektu plurala -> ari dira.',
  true
from public.grammar_lessons gl
where gl.level = 'B1'
  and gl.title = 'Aditz perifrastikoa: ari izan (orain jarraitua)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'B1'
  and gl.title = 'Aditz perifrastikoa: ari izan (orain jarraitua)'
  and gq.position > 2;

-- B1 ? behar izan (obligazioa) oinarrizkoa
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'B1',
  'behar izan (obligazioa) oinarrizkoa',
  'Behar izan obligazioa edo beharra adierazteko erabiltzen da: joan behar dut.',
  '[{"eu":"Bihar goiz jaiki behar dut.","es":"Manana tengo que madrugar."},{"eu":"Medikura joan behar du.","es":"Tiene que ir al medico."}]'::jsonb,
  'Egitura: aditza -tu/-tzen (testuinguruaren arabera) + behar + izan.',
  4,
  array['aditza', 'obligazioa', 'perifrasiak']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Aukeratu egokiena: Gaur lanera joan __.',
  '["behar dut","nago","omen dut"]'::jsonb,
  0,
  'Obligazioa -> behar dut.',
  true
from public.grammar_lessons gl
where gl.level = 'B1'
  and gl.title = 'behar izan (obligazioa) oinarrizkoa'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Aukeratu egokiena: Zuk ere etorri __.',
  '["behar duzu","behar zara","behar da"]'::jsonb,
  0,
  '2. pertsona -> behar duzu.',
  true
from public.grammar_lessons gl
where gl.level = 'B1'
  and gl.title = 'behar izan (obligazioa) oinarrizkoa'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'B1'
  and gl.title = 'behar izan (obligazioa) oinarrizkoa'
  and gq.position > 2;

-- B1 ? Ez + ba- (erantzun laburrak): baietz/ezetz
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'B1',
  'Ez + ba- (erantzun laburrak): baietz/ezetz',
  'Erantzun laburretan, bai/ez eta ba- erabil daitezke: Bai, badakit. Ez, ez dakit. Baietz eta ezetz ere erabiltzen dira.',
  '[{"eu":"Badator? Bai, baietz.","es":"Viene? Si, que si."},{"eu":"Badator? Ez, ezetz.","es":"Viene? No, que no."},{"eu":"Bai, badakit.","es":"Si, lo se."}]'::jsonb,
  'Oharra: ahozkoan oso ohikoa da baietz/ezetz.',
  4,
  array['diskurtsoa', 'erantzunak', 'ba-']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Badakizu? (baiezkoa) ->',
  '["Bai, badakit","Ez, badakit","Bai, ote"]'::jsonb,
  0,
  'Baiezkoa eta ba- -> badakit.',
  true
from public.grammar_lessons gl
where gl.level = 'B1'
  and gl.title = 'Ez + ba- (erantzun laburrak): baietz/ezetz'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Badator? (ezezkoa) ->',
  '["Ez, ezetz","Bai, baietz","Bai, omen"]'::jsonb,
  0,
  'Ezezkoa laburrean -> ezetz.',
  true
from public.grammar_lessons gl
where gl.level = 'B1'
  and gl.title = 'Ez + ba- (erantzun laburrak): baietz/ezetz'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'B1'
  and gl.title = 'Ez + ba- (erantzun laburrak): baietz/ezetz'
  and gq.position > 2;

-- B2 ? -enez (kausa: 'zeren eta')
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'B2',
  '-enez (kausa: ''zeren eta'')',
  '-enez perpausak kausa adierazten du: ''... delako'' edo ''zeren eta ...'' antzera. Idatzian oso erabilia da.',
  '[{"eu":"Berandu zenez, taxi hartu dugu.","es":"Como era tarde, hemos cogido taxi."},{"eu":"Denbora gutxi genuenez, laburtu dugu.","es":"Como teniamos poco tiempo, lo hemos resumido."}]'::jsonb,
  'Egitura: adj/izena + -enez, edo aditz forma egokia + -enez.',
  5,
  array['menderakuntza', 'kausa', 'lokailuak']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Aukeratu egokiena: Euria __, ez gara joan.',
  '["zenez","tzean","arren"]'::jsonb,
  0,
  'Kausa -> zenez.',
  true
from public.grammar_lessons gl
where gl.level = 'B2'
  and gl.title = '-enez (kausa: ''zeren eta'')'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Aukeratu egokiena: Nekatuta __, etxean geratu naiz.',
  '["nenez","nintzenean","ote"]'::jsonb,
  0,
  'Kausa -> nekatuta nenez.',
  true
from public.grammar_lessons gl
where gl.level = 'B2'
  and gl.title = '-enez (kausa: ''zeren eta'')'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'B2'
  and gl.title = '-enez (kausa: ''zeren eta'')'
  and gq.position > 2;

-- B2 ? -tzeko (helburua: 'para')
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'B2',
  '-tzeko (helburua: ''para'')',
  '-tzeko egiturak helburua adierazten du: ''... egiteko'' = ''para hacer ...''.',
  '[{"eu":"Euskara ikasteko aplikazioa erabiltzen dut.","es":"Uso una app para aprender euskera."},{"eu":"Dirua aurrezteko, gutxiago gastatzen dut.","es":"Para ahorrar dinero, gasto menos."}]'::jsonb,
  'Askotan esaldiaren hasieran edo erdian: -tzeko, ...',
  5,
  array['menderakuntza', 'helburua', 'perpausak']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Aukeratu egokiena: Lo egiteko, ohera __ naiz.',
  '["joan","joango","joan nintzenean"]'::jsonb,
  0,
  'Helburua -> ''ohera joan naiz'' (lo egiteko).',
  true
from public.grammar_lessons gl
where gl.level = 'B2'
  and gl.title = '-tzeko (helburua: ''para'')'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Aukeratu egokiena: Azterketa gainditzeko, asko __ dut.',
  '["ikasi","ikasten","ikastean"]'::jsonb,
  0,
  'Helburua: gainditzeko -> ikasi dut.',
  true
from public.grammar_lessons gl
where gl.level = 'B2'
  and gl.title = '-tzeko (helburua: ''para'')'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'B2'
  and gl.title = '-tzeko (helburua: ''para'')'
  and gq.position > 2;

-- B2 ? -tzen den bitartean (aldi berean)
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'B2',
  '-tzen den bitartean (aldi berean)',
  'Bitartean = while. Ekintza bat gertatzen den bitartean beste bat gertatzen dela adierazten du.',
  '[{"eu":"Sukaldatzen ari naizen bitartean, musika entzuten dut.","es":"Mientras cocino, escucho musica."},{"eu":"Zuk hitz egiten duzun bitartean, nik idazten dut.","es":"Mientras tu hablas, yo escribo."}]'::jsonb,
  'Egitura: (aditza -tzen) + bitartean.',
  5,
  array['denbora', 'aldi berean', 'menderakuntza']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Aukeratu egokiena: Telebista ikusten __, afaltzen dugu.',
  '["dugun bitartean","dugunez","dugun arren"]'::jsonb,
  0,
  'Aldi berean -> bitartean.',
  true
from public.grammar_lessons gl
where gl.level = 'B2'
  and gl.title = '-tzen den bitartean (aldi berean)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Aukeratu egokiena: Zuk gidatzen __, nik mapa begiratuko dut.',
  '["duzun bitartean","duzunez","duzunean"]'::jsonb,
  0,
  'While -> duzun bitartean.',
  true
from public.grammar_lessons gl
where gl.level = 'B2'
  and gl.title = '-tzen den bitartean (aldi berean)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'B2'
  and gl.title = '-tzen den bitartean (aldi berean)'
  and gq.position > 2;

-- B2 ? Ahal izan (gaitasuna eta posibilitatea)
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'B2',
  'Ahal izan (gaitasuna eta posibilitatea)',
  'Ahal izan gaitasuna edo posibilitatea adierazteko erabiltzen da: egin ahal dut (puedo hacerlo).',
  '[{"eu":"Gaur ezin dut joan, baina bihar joan ahal naiz.","es":"Hoy no puedo ir, pero manana si."},{"eu":"Ezin dut ulertu; berriro esan ahal duzu?","es":"No lo entiendo; puedes repetir?"}]'::jsonb,
  'Egitura: aditza + ahal + izan. Ezezkoan: ezin + ... ahal.',
  4,
  array['aditza', 'modalitatea', 'posibilitatea']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Aukeratu egokiena: Barkatu, berriro esan __?',
  '["ahal duzu","behar duzu","omen duzu"]'::jsonb,
  0,
  'Eskaera adeitsua/posible -> ahal duzu.',
  true
from public.grammar_lessons gl
where gl.level = 'B2'
  and gl.title = 'Ahal izan (gaitasuna eta posibilitatea)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Aukeratu egokiena: Gaur ezin __ joan.',
  '["naiz","dut","ahal"]'::jsonb,
  1,
  'Ezin dut joan (nor-nork).',
  true
from public.grammar_lessons gl
where gl.level = 'B2'
  and gl.title = 'Ahal izan (gaitasuna eta posibilitatea)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'B2'
  and gl.title = 'Ahal izan (gaitasuna eta posibilitatea)'
  and gq.position > 2;

-- B2 ? hala ere (kontraesana testuan)
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'B2',
  'hala ere (kontraesana testuan)',
  'Hala ere = ''aun asi / sin embargo'' (diskurtso markatzailea). Aurreko ideiari kontra egiten dio, baina aurrera jarraitzen du.',
  '[{"eu":"Nekatuta nago; hala ere, irtengo naiz.","es":"Estoy cansado; aun asi, saldre."},{"eu":"Garestia da; hala ere, erosi dut.","es":"Es caro; aun asi, lo he comprado."}]'::jsonb,
  'Hala ere askotan puntu eta koma edo puntuarekin doa idatzian.',
  4,
  array['lokailuak', 'kontrastea', 'idazketa']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Aukeratu egokiena: Ez dut astirik; __, lagunduko dizut.',
  '["hala ere","beraz","gainera"]'::jsonb,
  0,
  'Kontrastea -> hala ere.',
  true
from public.grammar_lessons gl
where gl.level = 'B2'
  and gl.title = 'hala ere (kontraesana testuan)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Aukeratu egokiena: Euria ari du; __, paseatzera joan gara.',
  '["hala ere","orduan","zeren"]'::jsonb,
  0,
  'Aun asi -> hala ere.',
  true
from public.grammar_lessons gl
where gl.level = 'B2'
  and gl.title = 'hala ere (kontraesana testuan)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'B2'
  and gl.title = 'hala ere (kontraesana testuan)'
  and gq.position > 2;

-- B2 ? izan ere (azalpen indargarria)
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'B2',
  'izan ere (azalpen indargarria)',
  'Izan ere esapideak aurreko baieztapena indartu eta azalpena emateko balio du (antzekoa: ''izan ere, ...'').',
  '[{"eu":"Ez dut joango. Izan ere, gaixo nago.","es":"No ire. De hecho, estoy enfermo."},{"eu":"Proposamena ona da. Izan ere, arazoa konpontzen du.","es":"La propuesta es buena. De hecho, resuelve el problema."}]'::jsonb,
  'Diskurtsoan: baieztapena + izan ere + arrazoia.',
  5,
  array['diskurtsoa', 'azalpena', 'idazketa']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Aukeratu egokiena: Ezin dut etorri. __, lanean nago.',
  '["Izan ere","Aitzitik","Horrela"]'::jsonb,
  0,
  'Azalpen indargarria -> Izan ere.',
  true
from public.grammar_lessons gl
where gl.level = 'B2'
  and gl.title = 'izan ere (azalpen indargarria)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Aukeratu egokiena: Oso garrantzitsua da. __, askori eragiten dio.',
  '["Izan ere","Bitartean","Bestela"]'::jsonb,
  0,
  'Justifikazioa -> Izan ere.',
  true
from public.grammar_lessons gl
where gl.level = 'B2'
  and gl.title = 'izan ere (azalpen indargarria)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'B2'
  and gl.title = 'izan ere (azalpen indargarria)'
  and gq.position > 2;

-- C1 ? gainera vs bestalde (antolaketa argumentatiboa)
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'C1',
  'gainera vs bestalde (antolaketa argumentatiboa)',
  'Gainera gehitze hutsa da (in addition). Bestalde bi ildo edo ikuspegi bereizteko da (on the other hand / besides that).',
  '[{"eu":"Merkea da; gainera, azkarra.","es":"Es barato; ademas, es rapido."},{"eu":"Prezioa altua da. Bestalde, kalitatea ona da.","es":"El precio es alto. Por otro lado, la calidad es buena."}]'::jsonb,
  'Bestalde askotan bi puntu edo paragrafo bereizteko erabiltzen da.',
  5,
  array['lokailuak', 'argumentazioa', 'idazketa']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Aukeratu egokiena: Ez du denborarik; __, ez du gogorik.',
  '["gainera","bestalde","hala ere"]'::jsonb,
  0,
  'Gehiketa -> gainera.',
  true
from public.grammar_lessons gl
where gl.level = 'C1'
  and gl.title = 'gainera vs bestalde (antolaketa argumentatiboa)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Aukeratu egokiena: Batetik, kostua. __, antolaketa.',
  '["Bestalde","Gainera","Beraz"]'::jsonb,
  0,
  'Bi ildo bereizteko -> bestalde.',
  true
from public.grammar_lessons gl
where gl.level = 'C1'
  and gl.title = 'gainera vs bestalde (antolaketa argumentatiboa)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'C1'
  and gl.title = 'gainera vs bestalde (antolaketa argumentatiboa)'
  and gq.position > 2;

-- C1 ? batetik ... bestetik (aurkezpen egituratua)
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'C1',
  'batetik ... bestetik (aurkezpen egituratua)',
  'Batetik ... bestetik egiturak bi arrazoi edo bi alderdi aurkezteko balio du, modu oso argian.',
  '[{"eu":"Batetik, merkeagoa da; bestetik, erosoagoa.","es":"Por un lado, es mas barato; por otro, mas comodo."},{"eu":"Batetik, arriskua dago; bestetik, aukera handia.","es":"Por un lado, hay riesgo; por otro, gran oportunidad."}]'::jsonb,
  'Oso erabilgarria testu argumentatiboetan eta aurkezpenetan.',
  5,
  array['diskurtsoa', 'egiturak', 'argumentazioa']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Aukeratu egitura egokia bi alde aurkezteko:',
  '["Batetik... bestetik...","Hala ere... beraz...","Bitartean... orduan..."]'::jsonb,
  0,
  'Bi alde -> batetik/bestetik.',
  true
from public.grammar_lessons gl
where gl.level = 'C1'
  and gl.title = 'batetik ... bestetik (aurkezpen egituratua)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Osatu: Batetik, denbora falta; __, baliabide gutxi.',
  '["bestetik","gainera","ordea"]'::jsonb,
  0,
  'Bigarren aldea -> bestetik.',
  true
from public.grammar_lessons gl
where gl.level = 'C1'
  and gl.title = 'batetik ... bestetik (aurkezpen egituratua)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'C1'
  and gl.title = 'batetik ... bestetik (aurkezpen egituratua)'
  and gq.position > 2;

-- C1 ? Aitzitik (kontraargumentua formala)
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'C1',
  'Aitzitik (kontraargumentua formala)',
  'Aitzitik = ''por el contrario''. Aurreko ideiari kontrako baieztapena egiten du, tonu formalean.',
  '[{"eu":"Ez da arazoa. Aitzitik, aukera da.","es":"No es un problema. Al contrario, es una oportunidad."},{"eu":"Ez du kalterik egin. Aitzitik, lagundu du.","es":"No ha hecho dano. Al contrario, ha ayudado."}]'::jsonb,
  'Formala da: txostenetan, iritzietan, idazlanetan oso egokia.',
  5,
  array['lokailuak', 'formala', 'kontraargumentua']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Aukeratu egokiena: Ez du okertu; __, asmatu du.',
  '["aitzitik","hala ere","beraz"]'::jsonb,
  0,
  'Por el contrario -> aitzitik.',
  true
from public.grammar_lessons gl
where gl.level = 'C1'
  and gl.title = 'Aitzitik (kontraargumentua formala)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Aukeratu egokiena: Ez da motelagoa; __, azkarragoa da.',
  '["aitzitik","gainera","bitartean"]'::jsonb,
  0,
  'Kontrakoa -> aitzitik.',
  true
from public.grammar_lessons gl
where gl.level = 'C1'
  and gl.title = 'Aitzitik (kontraargumentua formala)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'C1'
  and gl.title = 'Aitzitik (kontraargumentua formala)'
  and gq.position > 2;

-- C1 ? -enez gero (kausa formala, logika)
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'C1',
  '-enez gero (kausa formala, logika)',
  '-enez gero kausa logiko edo formalagoa adierazteko erabiltzen da (since/as). Idatzian eta hizkera zainduan ohikoa.',
  '[{"eu":"Datuak argiak direnez gero, erabakia hartu behar da.","es":"Dado que los datos son claros, hay que decidir."},{"eu":"Zuk eskatu duzunez gero, egingo dut.","es":"Como tu lo has pedido, lo hare."}]'::jsonb,
  'Antzekoa: -enez, baina tonu formala edo kausalitate sendoa eman dezake.',
  5,
  array['menderakuntza', 'kausa', 'formala']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Aukeratu egokiena: Ez dut zalantzarik, froga__ gero.',
  '["argiak direnez","argiak direnean","argiak diren arren"]'::jsonb,
  0,
  'Kausa formala -> direnez (gero).',
  true
from public.grammar_lessons gl
where gl.level = 'C1'
  and gl.title = '-enez gero (kausa formala, logika)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Aukeratu egokiena: Zu etorri ez __ gero, hasiko gara.',
  '["bazara","zarenez","zarenean"]'::jsonb,
  1,
  'Egitura: etorri ez zarenez gero...',
  true
from public.grammar_lessons gl
where gl.level = 'C1'
  and gl.title = '-enez gero (kausa formala, logika)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'C1'
  and gl.title = '-enez gero (kausa formala, logika)'
  and gq.position > 2;

-- C1 ? Hain zuzen (zehaztapena eta zuzenketa)
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'C1',
  'Hain zuzen (zehaztapena eta zuzenketa)',
  'Hain zuzen = ''precisamente / concretamente''. Aurrekoa zehazteko edo zuzentzeko erabiltzen da.',
  '[{"eu":"Arazo nagusia bat da: hain zuzen, denbora falta.","es":"El problema principal es uno: concretamente, falta de tiempo."},{"eu":"Ez dut horri buruz hitz egin. Hain zuzen, kontrakoa esan dut.","es":"No he hablado de eso. Precisamente, he dicho lo contrario."}]'::jsonb,
  'Oso erabilgarria definizioetan eta argitzean.',
  4,
  array['diskurtsoa', 'zehaztapena', 'idazketa']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Aukeratu egokiena: Gauza bat falta da: __, datuak.',
  '["hain zuzen","hala ere","bitartean"]'::jsonb,
  0,
  'Zehaztapena -> hain zuzen.',
  true
from public.grammar_lessons gl
where gl.level = 'C1'
  and gl.title = 'Hain zuzen (zehaztapena eta zuzenketa)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Aukeratu egokiena: Ez dut hori esan. __, bestea esan dut.',
  '["Hain zuzen","Beraz","Gainera"]'::jsonb,
  0,
  'Zuzenketa/zehaztapena -> hain zuzen.',
  true
from public.grammar_lessons gl
where gl.level = 'C1'
  and gl.title = 'Hain zuzen (zehaztapena eta zuzenketa)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'C1'
  and gl.title = 'Hain zuzen (zehaztapena eta zuzenketa)'
  and gq.position > 2;

-- C1 ? Izan daiteke (hipotesia eta aukera)
insert into public.grammar_lessons (level, title, short_explanation, examples, more_info, estimated_minutes, tags, active)
values (
  'C1',
  'Izan daiteke (hipotesia eta aukera)',
  'Izan daiteke egiturak aukera edo hipotesia adierazten du (puede que sea). Diskurtso zainduan oso erabilgarria da.',
  '[{"eu":"Egia izan daiteke.","es":"Puede que sea verdad."},{"eu":"Arrazoia izan daiteke hori.","es":"Puede que esa sea la razon."},{"eu":"Hori gertatzea posible izan daiteke.","es":"Puede ser posible que ocurra."}]'::jsonb,
  'Ziurtasunik ez, baina aukera erreal bat.',
  4,
  array['modalitatea', 'hipotesia', 'diskurtsoa']::text[],
  true
)
on conflict (level, title) do update set
  short_explanation = excluded.short_explanation,
  examples = excluded.examples,
  more_info = excluded.more_info,
  estimated_minutes = excluded.estimated_minutes,
  tags = excluded.tags,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  1,
  'Aukeratu egokiena: Hori egia __.',
  '["izan daiteke","izan behar da","omen da"]'::jsonb,
  0,
  'Hipotesia -> izan daiteke.',
  true
from public.grammar_lessons gl
where gl.level = 'C1'
  and gl.title = 'Izan daiteke (hipotesia eta aukera)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

insert into public.grammar_questions (lesson_id, position, prompt, options, correct_index, explanation, active)
select
  gl.id,
  2,
  'Aukeratu egokiena: Berandu etortzea arrazoi __.',
  '["izan daiteke","izan naiteke","ote daiteke"]'::jsonb,
  0,
  'Aukera -> izan daiteke.',
  true
from public.grammar_lessons gl
where gl.level = 'C1'
  and gl.title = 'Izan daiteke (hipotesia eta aukera)'
on conflict (lesson_id, position) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  active = excluded.active,
  updated_at = now();

delete from public.grammar_questions gq
using public.grammar_lessons gl
where gq.lesson_id = gl.id
  and gl.level = 'C1'
  and gl.title = 'Izan daiteke (hipotesia eta aukera)'
  and gq.position > 2;

commit;
