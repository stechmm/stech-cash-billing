# S-Tech Billing

This app is a small Node.js server that serves the frontend.

For production, it should use a MySQL database.
For local fallback, it can still use a JSON file.

## Hosting shape

This is **not** a static-hosting app. It needs:

- A Node.js web service
- A MySQL database for production
- HTTPS in production for login cookies
- A persistent upload directory for private receipts and voice messages

## Recommended hosting

This app can run on any hosting that supports:

- Node.js web services
- MySQL
- Environment variables

Namecheap shared hosting can work if `Setup Node.js App` is available and the hosting account also provides MySQL.

For Namecheap, this app needs either:

- Shared hosting with `Setup Node.js App` and MySQL
- Or a VPS / dedicated server with Node.js and MySQL

If the hosting plan is only static or PHP-only, this app will not run there as-is.

## Required environment variables

- `PORT`
  The hosting platform usually sets this automatically.
- `NODE_ENV=production`
- `DB_CLIENT=mysql`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_TABLE`
  Optional. Defaults to `app_state`.
- `UPLOAD_DIR`
  Persistent server path for chat receipts and voice messages. Recommended: `/var/lib/stech-billing/uploads`.
- `ADMIN_FULL_NAME`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
  Initial administrator details used only when a new empty database is created.

## Render deploy

1. Upload this folder to a Git repository.
2. Create a new Render Web Service from that repository.
3. Keep the start command as `node server.js`.
4. Create a MySQL database.
5. Set the MySQL environment variables.
6. Open `/api/health` after deploy to confirm the app is healthy.

The included `render.yaml` can be used for Blueprint deploys.

## Namecheap deploy note

For a domain such as `billing.stechmm.com`, the normal setup is:

1. Create the subdomain in Namecheap.
2. Point it to the hosting account or server.
3. Upload this app folder.
4. Create a MySQL database in cPanel.
5. Import [database.sql](C:/Users/ST/Documents/Codex/2026-07-07/new-chat/outputs/cash-billing-app/database.sql) or let the app create the table automatically.
6. In `Setup Node.js App`, run the app with `node server.js`.
7. Set `NODE_ENV=production`.
8. Set:
   `DB_CLIENT=mysql`
   `DB_HOST=localhost`
   `DB_PORT=3306`
   `DB_NAME=...`
   `DB_USER=...`
   `DB_PASSWORD=...`

If MySQL is connected correctly, server restarts will not remove your records.

## Initial administrator

Set `ADMIN_FULL_NAME`, `ADMIN_USERNAME`, and a strong `ADMIN_PASSWORD` in the production `.env` file before the first startup. Existing databases keep their current users.
