# Eenhana School League – Website

## Deployment
This project uses Vite, React and Supabase. Keep all project files together in the repository root (no assets subfolder is required). The league crest is loaded from `/logo.jpeg` with `/eenhana-school-league-logo.jpeg` as a fallback.

1. Upload/replace the project files in the root of the GitHub repository.
2. Vercel should deploy automatically from the connected repository.
3. Supabase credentials are already configured in `supabase.js` using the browser-safe publishable key. Never add a service-role key to frontend code.
4. The database must have the tables from `schema.sql`. For match timeline events, run `migration-match-events.sql` in Supabase SQL Editor.

## Features
- U15 Boys and U15 Girls competitions
- Fixtures, results and automatically calculated standings
- Team profiles and player rosters
- Match event timeline (goals, penalties, own goals, cards, substitutions)
- Admin-only inline edit and delete actions; edits open prefilled dialogs, deletion requires typing `LÖSCHEN`

## Important
The website starts with an empty database view; it does not seed demo teams or fixtures. Existing Supabase data is not deleted by this frontend. Admin writes require the signed-in user to be present in `public.admin_users`.
