<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Go06sT8ttOgxCZ7xzx8oc9gOj7mGGdYD

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Favorites setup

Run `supabase_favorites.sql` in your Supabase SQL editor to create:
- `user_favorite_words`
- `user_access_keys` + `validate_user_key(...)` for username/key validation
- indexes + RLS policies for reading, inserting and deleting favorites

After that, insert at least one user key in Supabase (example included at the end of `supabase_favorites.sql`).

## Login behavior

Dictionary login accepts:
- Registered Supabase Auth users (`email + password`, or username transformed as `username@tuapp.local`)
- Fallback key validation through `public.validate_user_key(...)` and `user_access_keys`
