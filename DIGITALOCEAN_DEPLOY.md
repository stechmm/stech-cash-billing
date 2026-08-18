# DigitalOcean VPS ပေါ်တင်နည်း

ဒီလမ်းညွှန်မှာ Ubuntu 24.04 LTS, `billing.stechmm.com`, Node.js, PM2, Nginx, MySQL နဲ့ HTTPS ကိုသုံးပြီး S-Tech Billing System တင်နည်းကို အဆင့်လိုက်ဖော်ပြထားပါတယ်။

## ၁။ DigitalOcean Droplet နဲ့ Domain ပြင်ဆင်ခြင်း

1. DigitalOcean မှာ Ubuntu 24.04 LTS Droplet တစ်ခုဖန်တီးပါ။
2. Password ထက် SSH Key သုံးတာပိုလုံခြုံပါတယ်။
3. `stechmm.com` ရဲ့ DNS Manager မှာ အောက်ပါ `A` record ထည့်ပါ။
   - Host: `billing`
   - Value: DigitalOcean Droplet ရဲ့ Public IPv4
4. Server ကိုချိတ်ပါ။

```bash
ssh root@YOUR_DROPLET_IP
```

## ၂။ Server အခြေခံပြင်ဆင်ခြင်း

```bash
apt update && apt upgrade -y
adduser stech
usermod -aG sudo stech
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

Root user ရဲ့ SSH key ကို `stech` user ဆီကူးပြီးမှ root/password SSH login ကိုပိတ်ပါ။ ကျန်အဆင့်တွေကို `stech` user နဲ့ဆက်လုပ်ပါ။

## ၃။ Node.js, Nginx, MySQL နဲ့ PM2 ထည့်ခြင်း

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx mysql-server
sudo npm install -g pm2
node --version
npm --version
```

PM2 က application ပျက်သွားရင် အလိုအလျောက်ပြန်ဖွင့်ပေးပြီး VPS restart ဖြစ်ရင်လည်း app ကိုပြန်စပေးပါမယ်။

## ၄။ MySQL Database ဖန်တီးခြင်း

ခိုင်မာပြီး တခြားနေရာမှာမသုံးထားတဲ့ password အသစ်တစ်ခုရွေးပါ။ ပြီးရင် MySQL ထဲဝင်ပါ။

```bash
sudo mysql
```

MySQL prompt ထဲမှာ အောက်ပါ command တွေ run ပါ။

```sql
CREATE DATABASE stech_billing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'stech_app'@'localhost' IDENTIFIED BY 'ခိုင်မာသော_PASSWORD_အသစ်ထည့်ပါ';
GRANT ALL PRIVILEGES ON stech_billing.* TO 'stech_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Application နဲ့ MySQL က VPS တစ်ခုတည်းမှာရှိလို့ Firewall မှာ MySQL port `3306` ကို အပြင်ဘက်ဖွင့်ရန်မလိုပါဘူး။

## ၅။ GitHub ကနေ Application ယူခြင်း

Repository က Private ဖြစ်လို့ VPS မှာ GitHub authentication သို့ Deploy Key တစ်ခုလိုပါမယ်။ Authentication ပြီးရင် run ပါ။

```bash
sudo mkdir -p /var/www/stech-billing /var/lib/stech-billing/uploads
sudo chown -R stech:stech /var/www/stech-billing /var/lib/stech-billing
git clone https://github.com/stechmm/stech-cash-billing.git /var/www/stech-billing
cd /var/www/stech-billing
npm ci --omit=dev
cp .env.example .env
nano .env
```

## ၆။ Production Environment သတ်မှတ်ခြင်း

`.env` ဖိုင်ကို အောက်ပါပုံစံဖြည့်ပါ။ Password နေရာတွေမှာ တကယ့် password တွေထည့်ပါ။

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3030
DB_CLIENT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=stech_billing
DB_USER=stech_app
DB_PASSWORD=MYSQL_PASSWORD_ထည့်ပါ
DB_TABLE=app_state
UPLOAD_DIR=/var/lib/stech-billing/uploads
ADMIN_FULL_NAME=Administrator
ADMIN_USERNAME=ADMIN_EMAIL_ထည့်ပါ
ADMIN_PASSWORD=ခိုင်မာသော_ADMIN_PASSWORD_ထည့်ပါ
```

`.env` ထဲမှာ password တွေပါလို့ တခြား user တွေမဖတ်နိုင်အောင် permission ကန့်သတ်ပါ။ ဒီဖိုင်ကို GitHub ပေါ်မတင်ပါနဲ့။

```bash
chmod 600 .env
```

`ADMIN_USERNAME` နဲ့ `ADMIN_PASSWORD` ကို database အသစ်စဖန်တီးတဲ့ ပထမဆုံးအကြိမ်မှာသာ admin account ဖန်တီးဖို့သုံးပါတယ်။ Database ထဲ user ရှိပြီးသားဆိုရင် restart လုပ်တာနဲ့ account ပြောင်းမသွားပါဘူး။

## ၇။ PM2 နဲ့ Application စခြင်း

```bash
cd /var/www/stech-billing
pm2 start server.js --name stech-billing
pm2 save
pm2 startup
```

`pm2 startup` က ထုတ်ပေးတဲ့ နောက်ဆုံး command ကို copy လုပ်ပြီး run ပါ။ ပြီးရင် app အလုပ်လုပ်မလုပ် စစ်ပါ။

```bash
curl http://127.0.0.1:3030/api/health
pm2 status
```

အဖြေထဲမှာ `"ok": true` နဲ့ storage mode `mysql` ဖြစ်နေရပါမယ်။

## ၈။ Nginx နဲ့ WebSocket ပြင်ဆင်ခြင်း

Nginx configuration ဖိုင်ဖန်တီးပါ။

```bash
sudo nano /etc/nginx/sites-available/billing.stechmm.com
```

အောက်ပါ configuration ထည့်ပါ။ `client_max_body_size 15M` က receipt နဲ့ voice message တင်ဖို့လိုပါတယ်။ WebSocket headers တွေက realtime chat အတွက်လိုပါတယ်။

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

Configuration ကို enable လုပ်ပြီး အမှားရှိမရှိစစ်ပါ။

```bash
sudo ln -s /etc/nginx/sites-available/billing.stechmm.com /etc/nginx/sites-enabled/billing.stechmm.com
sudo nginx -t
sudo systemctl reload nginx
```

## ၉။ HTTPS/SSL ဖွင့်ခြင်း

`billing.stechmm.com` DNS က Droplet IP ကိုမှန်မှန်ညွှန်ပြီးမှ အောက်ပါ command တွေ run ပါ။

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d billing.stechmm.com
sudo certbot renew --dry-run
```

HTTPS က login cookie လုံခြုံရေးနဲ့ customer Android ဖုန်းမှာ microphone အသုံးပြုခွင့်ရဖို့ မဖြစ်မနေလိုပါတယ်။

## ၁၀။ Production စမ်းသပ်ခြင်း

အောက်ပါလင့်တွေကို ဖွင့်ကြည့်ပါ။

- Admin app: `https://billing.stechmm.com/`
- Customer app: `https://billing.stechmm.com/customer/`
- Server health: `https://billing.stechmm.com/api/health`

အောက်ပါအချက်တွေကို တစ်ခုချင်းစမ်းပါ။

1. Admin နဲ့ customer login
2. Customer နဲ့ admin realtime chat
3. ငွေလွှဲပြေစာ image/PDF တင်ခြင်း
4. Voice message record လုပ်ပြီးပို့ခြင်း
5. Receipt image နဲ့ audio ပြန်ဖွင့်ခြင်း
6. Device info, usage နဲ့ announcements ပြခြင်း
7. VPS restart လုပ်ပြီး records မပျောက်ခြင်း

## ၁၁။ နောက်ပိုင်း Update တင်ခြင်း

Local က code အသစ်ကို GitHub push လုပ်ပြီးတိုင်း VPS မှာ အောက်ပါ command တွေ run ပါ။

```bash
cd /var/www/stech-billing
git pull --ff-only
npm ci --omit=dev
pm2 restart stech-billing --update-env
pm2 save
```

Database schema သို့ `.env` ပြောင်းထားရင် restart မလုပ်ခင် အသစ်လိုအပ်တာတွေကို အရင်စစ်ပါ။

## ၁၂။ Database နဲ့ Receipt/Voice ဖိုင်များ Backup လုပ်ခြင်း

Application data ကို MySQL ထဲမှာသိမ်းပြီး receipt/voice files ကို upload directory ထဲမှာသိမ်းပါတယ်။ ဒါကြောင့် နှစ်ခုလုံးကို backup လုပ်ရပါမယ်။

```bash
mysqldump -u stech_app -p stech_billing > stech_billing.sql
tar -czf stech_uploads.tar.gz /var/lib/stech-billing/uploads
```

Backup ဖိုင်တွေကို Droplet တစ်ခုတည်းမှာပဲမထားပါနဲ့။ အခြား cloud storage သို့ local computer မှာပါ copy တစ်ခုထားပါ။ MySQL backup တစ်ခုတည်းမှာ receipt နဲ့ voice files မပါပါဘူး။

## အရေးကြီးမှတ်ချက်

- `.env` နဲ့ password တွေကို GitHub မတင်ပါနဲ့။
- MySQL port `3306` ကို Public မဖွင့်ပါနဲ့။
- `UPLOAD_DIR` ကို application user ကရေးခွင့်ရှိရပါမယ်။
- Realtime chat အလုပ်လုပ်ဖို့ Nginx WebSocket headers မပျက်ရပါဘူး။
- Voice recording အလုပ်လုပ်ဖို့ HTTPS သုံးရပါမယ်။
- Database နဲ့ upload folder နှစ်ခုလုံးကို ပုံမှန် backup လုပ်ပါ။
