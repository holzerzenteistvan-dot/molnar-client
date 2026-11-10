# MolnarMacros web
1. `cp .env.example .env` and fill it in. 2. Edit `config.js` (prices, payment methods, wallet/PayPal details).
3. Local: `npm install && npm run dev` (reads .env). Hosting (Render etc.): start command `npm start`, set the .env values as environment variables in the dashboard. 4. Put it behind your domain with HTTPS (Caddy or nginx).
Stripe: add webhook `https://yourdomain.com/webhook` for `checkout.session.completed`.
Manual payments (PayPal/crypto): confirm at `/admin?token=ADMIN_TOKEN`, key is then released. Search orders there by license key, email or order ID (for support).
Download: put your build in `private/` and set DOWNLOAD_FILE in .env. Only paid orders can fetch it at `/download/<orderId>`.
