# Eenhana School League

## Update
- English is the default language; use the EN/DE button in the header to switch language.
- Top Scorers (Top 10) and the Fair Play table are shown on the homepage.
- Fair Play scoring: 1 point per yellow card and 3 points per red card; lower score ranks higher.
- The logo is imported directly from `logo.jpeg` by the React app, avoiding the broken public URL.

## Deployment
Replace the matching files in the GitHub repository root with the files in this ZIP. Vercel should deploy automatically from the connected repository.

No database migration is required for these display-only statistics. Fair Play uses `match_events`. Top Scorers uses `match_events` and falls back to the legacy `goals` table if there are no goal events.

The production build could not be verified in this environment because dependency installation did not complete. Check the Vercel deployment status after pushing.
