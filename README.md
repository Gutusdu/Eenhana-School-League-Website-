# Eenhana School League — Season 2027

A mobile-first league website for the Eenhana School League. Public visitors can view fixtures, results, league tables, top scorers, teams and match reports. Authorised administrators can manage league data through a protected dashboard.

## What's included

- Public competition selection landing page (U15 Boys / U15 Girls)
- Separate competition pages with their own tables, fixtures and top scorers
- Separate U15 Boys / U15 Girls filters
- Fixtures and results
- Automatically calculated league table (3 points for a win, 1 for a draw)
- Top scorer list
- Team directory with clickable team profiles, squad roster and team statistics
- Clickable match pages with match report and match-specific line-up tabs (starting XI / substitutes)
- Match line-ups managed from the admin dashboard
- Published match reports
- Supabase email/password admin login
- Admin tools to add teams, fixtures, results, goalscorers and reports
- Supabase SQL schema with Row Level Security (RLS)

## 1. Run locally

Install Node.js (LTS), then in this project folder run:

```bash
npm install
npm run dev
```

Vite will show a local address, usually `http://localhost:5173`.

Without Supabase environment variables, the site runs in preview mode with sample data. Preview mode is not connected to a live database and does not support admin changes.

## 2. Create a NEW Supabase project

1. Create a new project at https://supabase.com.
2. Open **SQL Editor**.
3. Run the contents of `supabase/schema.sql`.
4. Open **Project Settings → API** (or the API Keys page).
5. Copy the Project URL and the publishable/anon key.

Do not use the existing `cage-legends` project for this league. Keep the league database separate.

## 3. Connect Supabase

Copy `.env.example` to a new file named `.env` and fill in:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Restart the dev server after changing `.env`.

The publishable/anon key is intended for browser use when Row Level Security is configured correctly. **Never put a Supabase service-role key in this website or commit it to GitHub.**

## 4. Create the first administrator

1. In Supabase, open **Authentication → Users**.
2. Add an administrator user with an email address and password.
3. Copy that user's UUID.
4. In the SQL Editor, run this statement, replacing the UUID:

```sql
insert into public.admin_users (user_id)
values ('PASTE-AUTH-USER-UUID-HERE');
```

Only users listed in `admin_users` can create or change league data. Public visitors do not need to log in.

## 5. Put the project on GitHub

1. Create a new, empty GitHub repository named `eenhana-school-league`.
2. Upload the project files (do not upload `.env`).
3. Commit the files.
4. For live hosting, connect the repository to a host that supports Vite builds (for example, Vercel or Netlify).
5. Set the same two environment variables in the hosting provider's project settings.
6. Build command: `npm run build`
7. Output directory: `dist`

GitHub stores the source code. Supabase stores the league data. The hosting provider serves the website to visitors.

## Important before public launch

- Add only the minimum player information needed. For a youth league, avoid publishing personal phone numbers, home addresses, birth dates or other sensitive information.
- Get permission before publishing identifiable photos of children.
- The current top-scorer form stores the player name with each goal. Keep spelling consistent, or use the player registry in a later version to prevent duplicate names.
- The current first version records the match score and goalscorers separately. The administrator should enter all goals after saving the final score.
- The current version uses sample/demo data until Supabase is connected. Team rosters and match line-ups require player records to be added in the admin dashboard.


## Security checklist before launch

The website's admin button and hidden dashboard are **not** the security boundary. Supabase Row Level Security (RLS) is. The SQL schema enables RLS on every league table and permits writes only when the authenticated user's UUID is present in `admin_users`. The browser only receives the publishable/anon key; this key is expected to be public and must never be treated as a password.

Before going public:

1. In Supabase Authentication settings, disable public sign-ups (invite/create administrator users yourself).
2. Create only trusted administrator accounts. Add their UUIDs to `public.admin_users` using the Supabase SQL Editor.
3. Require strong, unique passwords; enable MFA for administrator accounts where available.
4. Never put the `service_role` / secret key in `.env` variables beginning with `VITE_`, frontend code, or GitHub.
5. Keep the `admin_users` table without public insert/update/delete policies. The supplied schema does this.
6. Review Supabase Auth rate limits and allowed redirect URLs before launch.
7. Do not publish children's sensitive personal details. Obtain guardian/school permission before publishing identifiable player photos.

A public visitor can inspect frontend JavaScript and see the publishable key. That is normal. They should still be unable to write data because the database enforces RLS. No internet-facing site can be promised "unhackable"; keep dependencies updated, secure admin email accounts, and review access logs.

## Line-up workflow

Add players to a team's squad in **Admin → Squads**. Then use **Admin → Line-ups** to select a match, team, player, starting XI/substitute status and team-sheet position. Each player can be assigned once per match. The public match page displays the published team sheets.

## Database note

Run the full `supabase/schema.sql` on a brand-new Supabase project. If you already created an earlier database from a previous ZIP, use the updated SQL as a migration only after checking which columns/tables already exist; do not blindly re-run policy creation on an existing schema.
