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

## Auth notes

- Login nagusia Supabase Auth da (`username@tuapp.local` edo email osoa).
- Key fallback (`validate_user_key`) mantentzen da bilaketa-erabilerarako.
- Gogokoak eta admin-ekintzak (sinonimo berriak gehitzea) erabiltzaile autentikatuentzako konfiguratu dira.
