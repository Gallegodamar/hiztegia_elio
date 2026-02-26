# Hiztegia Elio

Euskarazko hiztegi aplikazioa (esanahiak, sinonimoak, gogokoak, gaiak eta antolatzaileak), React + Vite + Supabase erabiliz.

## Local setup

**Prerequisites**
- Node.js 20+
- Supabase project bat (URL + anon key)

1. Instalatu dependientziak:
   - `npm install`
2. Sortu `.env.local`:
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
3. Abiarazi garapenean:
   - `npm run dev`
4. Ekoizpen build-a:
   - `npm run build`
5. Testak:
   - `npm test`

## Supabase SQL scripts

Exekutatu SQL editorrean:

1. `supabase_favorites.sql`
   - `user_access_keys`
   - `syn_words`
   - `user_favorite_words`
   - `validate_user_key(...)`
   - `add_synonym_word(...)`
   - RLS politikak

2. `supabase_topics.sql`
   - `get_topics()`
   - `get_topic(p_slug text)`

3. Daily challenge (galdera-bankua + eguneko erronka)
   - `supabase/migrations/20260226_daily_questions_challenge.sql`
   - Aukeran seed-a (galderak kargatzeko): zure `questions` edukia / seed propioa

4. Eguneko gramatika (micro-lecciones)
   - `supabase/migrations/20260226_grammar_daily_module.sql`
   - `supabase/seed_grammar_lessons.sql` (edo `supabase/seed.sql`)
   - Honek 7 micro-lección + galderak sartzen ditu (`grammar_lessons`, `grammar_questions`)

## Eguneko Gramatika setup (quick start)

1. Ziurtatu `.env.local` fitxategian daudela:
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
2. Supabase SQL Editorrean exekutatu:
   - `supabase/migrations/20260226_grammar_daily_module.sql`
   - `supabase/seed.sql` (edo `supabase/seed_grammar_lessons.sql`)
3. Erabiltzaile batekin login egin (Supabase Auth)
4. App-a abiatu:
   - `npm run dev`
5. Nabigatu:
   - Home -> `Eguneko gramatika` txartela
   - edo beheko barra -> `Gramatika`

## Auth notes

- Login nagusia Supabase Auth da (`username@tuapp.local` edo email osoa).
- Key fallback (`validate_user_key`) mantentzen da bilaketa-erabilerarako.
- Gogokoak eta admin-ekintzak (sinonimo berriak gehitzea) erabiltzaile autentikatuentzako konfiguratu dira.
- `Eguneko Gramatika` eta `Gaurko 5 hitzak` (Supabase-backed moduak) erabiltzaile autentikatuarekin hobeto funtzionatzen dute.
