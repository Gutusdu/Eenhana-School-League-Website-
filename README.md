# Eenhana School League – flat GitHub upload

All files are in one folder. Upload **all files**, not the ZIP, to the root of your GitHub repository. Keep filenames unchanged.

Deploy on Vercel using framework preset **Vite**, build command `npm run build`, output directory `dist`. Do not upload `dist` or `node_modules`.

For live data: create a Supabase project and run `schema.sql` in SQL Editor **only on a fresh project**. Set Vercel environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (publishable/anon, NEVER service_role). Redeploy after adding variables.

Create admin user through Supabase Auth and manually insert their user UUID into `public.admin_users` following the schema. Disable public sign-ups and verify RLS.

The site displays example data until Supabase is configured.
