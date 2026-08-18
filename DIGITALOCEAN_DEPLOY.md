# DigitalOcean VPS Deployment

Target: Ubuntu 24.04 LTS, `billing.stechmm.com`, Node.js, PM2, Nginx, MySQL, and HTTPS.

## 1. Create the Droplet and DNS record

1. Create an Ubuntu 24.04 LTS Droplet with SSH-key authentication.
2. In the DNS manager for `stechmm.com`, create an `A` record:
   - Host: `billing`
   - Value: the Droplet public IPv4 address
3. Connect to the server:

```bash
ssh root@YOUR_DROPLET_IP
```

## 2. Prepare the server

```bash
apt update && apt upgrade -y
adduser stech
usermod -aG sudo stech
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

Copy the root SSH key to the new user before disabling root/password SSH access. Reconnect as `stech` for the remaining steps.

## 3. Install Node.js, Nginx, MySQL, and PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx mysql-server
sudo npm install -g pm2
node --version
npm --version
```

## 4. Create the MySQL database

Generate a strong unique password, then run:

```bash
sudo mysql
```

```sql
CREATE DATABASE stech_billing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'stech_app'@'localhost' IDENTIFIED BY 'REPLACE_WITH_A_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON stech_billing.* TO 'stech_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

MySQL port `3306` should not be opened in UFW because the application connects locally.

## 5. Clone and configure the application

Replace `YOUR_GITHUB_REPOSITORY` after the repository is published.

```bash
sudo mkdir -p /var/www/stech-billing /var/lib/stech-billing/uploads
sudo chown -R stech:stech /var/www/stech-billing /var/lib/stech-billing
git clone YOUR_GITHUB_REPOSITORY /var/www/stech-billing
cd /var/www/stech-billing
npm ci --omit=dev
cp .env.example .env
nano .env
```

Use these values in `.env`:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3030
DB_CLIENT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=stech_billing
DB_USER=stech_app
DB_PASSWORD=REPLACE_WITH_THE_MYSQL_PASSWORD
DB_TABLE=app_state
UPLOAD_DIR=/var/lib/stech-billing/uploads
ADMIN_FULL_NAME=Administrator
ADMIN_USERNAME=YOUR_ADMIN_EMAIL
ADMIN_PASSWORD=REPLACE_WITH_A_STRONG_INITIAL_ADMIN_PASSWORD
```

Keep `.env` out of Git and restrict it:

```bash
chmod 600 .env
```

## 6. Start with PM2

```bash
cd /var/www/stech-billing
pm2 start server.js --name stech-billing
pm2 save
pm2 startup
```

Run the final command printed by `pm2 startup`, then verify:

```bash
curl http://127.0.0.1:3030/api/health
pm2 status
```

## 7. Configure Nginx and WebSocket

```bash
sudo nano /etc/nginx/sites-available/billing.stechmm.com
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name billing.stechmm.com;

    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:3030;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }
}
```

Enable and test it:

```bash
sudo ln -s /etc/nginx/sites-available/billing.stechmm.com /etc/nginx/sites-enabled/billing.stechmm.com
sudo nginx -t
sudo systemctl reload nginx
```

## 8. Enable HTTPS

Wait until the DNS record resolves to the Droplet, then run:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d billing.stechmm.com
sudo certbot renew --dry-run
```

HTTPS is required for secure login cookies and microphone access in the customer app.

## 9. Verify production

Open and test:

- `https://billing.stechmm.com/`
- `https://billing.stechmm.com/customer/`
- `https://billing.stechmm.com/api/health`

Verify staff/customer login, realtime chat, receipt upload, voice recording, image/audio playback, and server restart recovery.

## 10. Deploy later updates

```bash
cd /var/www/stech-billing
git pull --ff-only
npm ci --omit=dev
pm2 restart stech-billing --update-env
pm2 save
```

## 11. Back up both data locations

The database and attachments are separate. Back up both:

```bash
mysqldump -u stech_app -p stech_billing > stech_billing.sql
tar -czf stech_uploads.tar.gz /var/lib/stech-billing/uploads
```

Store copies away from the Droplet. A MySQL backup without the upload directory will not include receipts or voice recordings.
