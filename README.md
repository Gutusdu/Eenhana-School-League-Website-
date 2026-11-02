# Eenhana School League

Vite + React website for the Eenhana School League (U15 Boys and U15 Girls), connected to Supabase.

## Setup
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in the Supabase project URL and publishable key.
3. Run the original `schema.sql` in the Supabase SQL Editor if setting up a fresh project.
4. For an existing project created with the original schema, run `migration-match-events.sql` once in the Supabase SQL Editor.
5. Start locally with `npm run dev`; deploy through the connected Vercel/GitHub project.

The official league logo is stored in `public/assets/eenhana-school-league-logo.jpeg` and used in the header and footer.

## Match events
The match center supports goal, penalty, own goal, yellow card, red card and substitution events, with optional minute, player and short details (e.g. “Elfmeter”). Admins can edit an event inline or delete it after typing `LÖSCHEN`. Scoring events update the match score through the database trigger in the migration.

## Security
The browser uses only the Supabase publishable key. Keep the service-role key out of the frontend. Database write access must remain protected by the Supabase RLS policies and the `admin_users` membership table.
