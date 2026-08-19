# Namecheap မှာရှိပြီးသား App ကို Upgrade လုပ်နည်း

ဒီနည်းလမ်းက Namecheap cPanel ရဲ့ `Setup Node.js App` မှာ `billing.stechmm.com` ကိုတင်ထားပြီး MySQL database ချိတ်ထားပြီးသားအတွက် ဖြစ်ပါတယ်။ Database အသစ်မဖန်တီးပါနဲ့။ ရှိပြီးသား DB environment variables တွေကို မဖျက်ပါနဲ့။

## ၁။ လက်ရှိ App နဲ့ Database ကို Backup လုပ်ပါ

### App ဖိုင်များ

1. cPanel > **File Manager** ကိုဖွင့်ပါ။
2. `Setup Node.js App` မှာပြထားတဲ့ **Application root** folder ကိုသွားပါ။
3. Folder ထဲကဖိုင်တွေကိုရွေးပြီး **Compress** > ZIP Archive လုပ်ပါ။
4. Backup ZIP ကို computer ထဲ download လုပ်ထားပါ။

### MySQL Database

1. cPanel > **phpMyAdmin** ကိုဖွင့်ပါ။
2. လက်ရှိ app သုံးနေတဲ့ database ကို ဘယ်ဘက်ကရွေးပါ။
3. **Export** > **Quick** > **SQL** > **Go** နှိပ်ပါ။
4. ရလာတဲ့ `.sql` ဖိုင်ကိုသိမ်းထားပါ။

## ၂။ Node.js App Setting ကိုမှတ်ထားပါ

cPanel > **Setup Node.js App** > `billing.stechmm.com` application ကို Edit ဖွင့်ပါ။ အောက်ပါအချက်တွေကို screenshot ရိုက်ထားပါ။

- Node.js version
- Application mode
- Application root
- Application URL
- Application startup file
- Environment variables အားလုံး

Startup file က `server.js` ဖြစ်ရပါမယ်။ Existing `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_TABLE` တွေကို မပြောင်းပါနဲ့။

## ၃။ Receipt နဲ့ Voice File သိမ်းမယ့် Folder ဖန်တီးပါ

File Manager မှာ application root အပြင်ဘက်၊ home directory အောက်မှာ folder တစ်ခုဖန်တီးပါ။ ဥပမာ:

```text
/home/CPANEL_USERNAME/stech_billing_uploads
```

ပြီးရင် `Setup Node.js App` > Environment variables မှာ ထည့်ပါ:

```text
UPLOAD_DIR=/home/CPANEL_USERNAME/stech_billing_uploads
```

`CPANEL_USERNAME` ကို ကိုယ့် cPanel username နဲ့အစားထိုးပါ။ ဒီ folder ကို မဖန်တီးနိုင်ရင် `UPLOAD_DIR` မထည့်ဘဲ default `data/uploads` ကိုသုံးနိုင်ပေမယ့် နောက် upgrade တွေမှာ `data` folder မဖျက်မိဖို့ သတိထားရပါမယ်။

## ၄။ App ကို Stop လုပ်ပါ

`Setup Node.js App` မှာ လက်ရှိ application ကို **Stop App** လုပ်ပါ။ Upgrade ပြီးမှပြန်ဖွင့်ပါမယ်။

## ၅။ Update ZIP ကို Upload/Extract လုပ်ပါ

1. File Manager မှာ Application root folder ကိုသွားပါ။
2. `cash-billing-namecheap-update-2026-08-19.zip` ကို Upload လုပ်ပါ။
3. ZIP ကိုရွေးပြီး **Extract** လုပ်ပါ။
4. Existing files ကို overwrite/replace ခွင့်တောင်းရင် အတည်ပြုပါ။

Update ZIP ထဲမှာ database, `.env`, uploads နဲ့ records မပါပါဘူး။ အောက်ပါ server/app ဖိုင်တွေပဲ ပါပါတယ်:

- `server.js`
- `package.json`, `package-lock.json`
- `index.html`, `styles.css`, `app.js`
- Customer app ဖိုင်များ
- Documentation နဲ့ database schema

Application root ထဲမှာရှိပြီးသား `.env`, `data` နဲ့ upload folder တွေကို မဖျက်ပါနဲ့။ `node_modules` ကို ZIP နဲ့ overwrite မလုပ်ပါဘူး။

## ၆။ Environment Variables စစ်ပါ

Existing MySQL variables တွေ မပျက်ကြောင်းစစ်ပါ:

```text
NODE_ENV=production
DB_CLIENT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ရှိပြီးသား_database_name
DB_USER=ရှိပြီးသား_database_user
DB_PASSWORD=ရှိပြီးသား_database_password
DB_TABLE=app_state
UPLOAD_DIR=/home/CPANEL_USERNAME/stech_billing_uploads
```

Namecheap က `PORT` ကိုစီမံပေးတာဖြစ်လို့ `PORT` အသစ်မထည့်ပါနဲ့။ `HOST` ကိုလည်း မထည့်ဘဲထားပါ။ `ADMIN_*` variables တွေက database အသစ်အလွတ်ဖန်တီးချိန်မှာသာ အသုံးဝင်ပြီး ရှိပြီးသား admin account ကိုမပြောင်းပါဘူး။

## ၇။ Dependency အသစ်များ Install လုပ်ပါ

`Setup Node.js App` စာမျက်နှာမှာ **Run NPM Install** နှိပ်ပါ။ ဒီအဆင့်က `ws`, `mysql2`, `dotenv` package တွေကို `package.json` အတိုင်း install လုပ်ပေးပါတယ်။

Button မအောင်မြင်ရင် Setup Node.js App ရဲ့အပေါ်မှာပြထားတဲ့ virtual environment command ကို Terminal မှာ run ပြီး:

```bash
cd APPLICATION_ROOT
npm install --omit=dev
```

## ၈။ App ကို Restart လုပ်ပါ

`Setup Node.js App` မှာ **Start App** သို့ **Restart** နှိပ်ပါ။ ပြီးရင် အောက်ပါ URL ကိုဖွင့်ပါ:

```text
https://billing.stechmm.com/api/health
```

အဖြေမှာ အနည်းဆုံး အောက်ပါအတိုင်းဖြစ်ရပါမယ်:

```json
{"ok":true,"storage":{"mode":"mysql"}}
```

Storage mode က `json` ဖြစ်နေရင် MySQL environment variables မရောက်တာဖြစ်လို့ app ထဲ record အသစ်မထည့်သေးဘဲ DB settings ကိုပြန်စစ်ပါ။

## ၉။ Upgrade ပြီး စမ်းသပ်ရမယ့်အချက်များ

1. Admin login နဲ့ customer login
2. အဟောင်း Cash Ledger, Billing, Device records တွေအားလုံးရှိနေခြင်း
3. Customer Home မှာ Region, Serial Number, Kit Number, Plan, Address ပြခြင်း
4. Billing & Support chat တစ်ခုတည်းဖြစ်နေခြင်း
5. Customer မှ receipt image/PDF ပို့ခြင်း
6. Customer နဲ့ admin နှစ်ဖက် voice message ပို့/နားထောင်ခြင်း
7. Chat realtime ရောက်ခြင်း
8. App restart ပြီး records နဲ့ receipt/voice files မပျောက်ခြင်း

WebSocket ကို shared-hosting proxy ကကန့်သတ်ထားရင် chat က 60-second fallback refresh နဲ့ဆက်အလုပ်လုပ်ပါမယ်။ Receipt/voice file တင်တာ `413` သို့ size error ရရင် hosting upload/request limit ကို Namecheap Support နဲ့စစ်ရပါမယ်။ App က attachment တစ်ခုကို အများဆုံး 8 MB လက်ခံပါတယ်။

## ၁၀။ ပြဿနာဖြစ်ရင် အဟောင်းပြန်ထားနည်း

1. App ကို Stop လုပ်ပါ။
2. Upgrade မတိုင်ခင်ယူထားတဲ့ app backup ZIP ကို Application root မှာ Extract/overwrite လုပ်ပါ။
3. Database ပြောင်းလဲပျက်စီးမှသာ phpMyAdmin ကနေ SQL backup ကို restore လုပ်ပါ။ Code upgrade တင်တာတစ်ခုတည်းကြောင့် DB restore ပုံမှန်အားဖြင့်မလိုပါဘူး။
4. အဟောင်း `package.json` အတိုင်း Run NPM Install လုပ်ပါ။
5. App ကို Start/Restart လုပ်ပါ။

## အရေးကြီးချက်

- Application ကို **Destroy** မလုပ်ပါနဲ့။ Stop/Restart ပဲသုံးပါ။
- MySQL database အသစ်မဖန်တီးပါနဲ့။
- Existing DB environment variables မဖျက်ပါနဲ့။
- `.env`, `data`, upload folder နဲ့ database ကို overwrite/delete မလုပ်ပါနဲ့။
- Backup ယူပြီးမှ update တင်ပါ။
