# Void Bot Dashboard

This repository now includes a static HTML dashboard plus a backend API route that reads your existing bot files.

## Dashboard structure

- `public/index.html` — the HTML dashboard UI
- `public/styles.css` — dashboard styling
- `public/app.js` — front-end data loader
- `api/status.js` — Vercel serverless API route that reads bot config files
- `vercel.json` — Vercel routing configuration

## Local preview

1. Install dependencies from the repository root:
   ```bash
   npm install
   ```
2. Run the live dashboard and bot server:
   ```bash
   npm run dashboard
   ```
3. Open the website in your browser:
   ```bash
   http://localhost:3000
   ```

## Vercel deployment

1. Deploy the repository root to Vercel.
2. Vercel will serve the static dashboard from `public/` and the API from `api/status`.
3. The dashboard fetches data from `/api/status` and reads these files:
   - `guildConfig.json`
   - `ticketConfig.json`
   - `whitelist.json`
   - `src/bot.js`
   - `src/config.js`
   - `src/utils/guildConfig.js`

## Notes

- If `guildConfig.json` does not exist yet, the dashboard will still load and show a warning.
- Add `BLACKLIST_ROLE_ID` and `BLACKLIST_APPROVER_ROLE_ID` environment variables to reduce backend alerts.
- The local `npm run dashboard` server does connect to your live Discord bot via `src/bot.js` and exposes live status at `/api/status`.
- The Vercel deployment will serve the static dashboard and file-based backend from the repository, but a live Discord bot process must run separately if you want runtime updates.

## Link to a GitHub repo manually

1. Install Git on your machine if it is not already installed.
2. Open a terminal at the repository root (`C:\Users\opeye\VoidBot\Void-Bot-Official-main`).
3. Initialize the repository and make your first commit:
   ```bash
   git init
   git add .
   git commit -m "Initial dashboard and bot backend integration"
   ```
4. Create a repository on GitHub.
5. Add the remote and push:
   ```bash
   git remote add origin https://github.com/<your-user>/<your-repo>.git
   git branch -M main
   git push -u origin main
   ```
6. In Vercel, import the GitHub repo and deploy the project root.

If you want, I can also help you choose the best branch name and Vercel settings for this dashboard.
