# 🌐 Website ko Internet par LIVE Kaise Karein — Step-by-Step Guide (FREE)

**Maksad:** "Mera Shahar, Meri Pehchan" website ko internet par dalna, taaki duniya mein koi bhi use khol sake, account Bana sake aur post kar sake.

**Kharcha:** ₹0 (free tareeka). **Time:** lagbhag 15-20 minute.
**Chahiye bas:** ek email id (Gmail sabse asaan) aur thoda dhyaan.

> 💡 **Do website use hongi, dono bilkul muft:**
> 1. **GitHub.com** — yahan website ka code rakha jaayega (jaise Google Drive, bas code ke liye)
> 2. **Render.com** — yahan website asal mein chalegi (hosting)

---

## STEP 1️⃣ — GitHub par account Bana (5 minute)

1. Browser mein **github.com** kholein.
2. Upar **"Sign up"** dabayein.
3. Apna **email**, ek **password** aur ek **username** chunein (username kuch bhi ho sakta hai, jaise `mera-shahar-admin`).
4. Email mein aaya code daalkar verify karein.
5. Agar plans puche to **Free (₹0)** wala chunein.

✅ Account ban gaya!

## STEP 2️⃣ — Website ka code GitHub par rakho (5 minute)

1. GitHub mein upar-dahine **"+"** (plus) wale nishan par click → **"New repository"** chunein.
2. **Repository name** mein likhein: `mera-shahar`
3. **Public** hi rehne dein → neeche **"Create repository"** dabayein.
4. Naya Khali page khulega. Us mein **"uploading an existing file"** wale neele link par click karein.
5. Ab is `bharat-darshan` folder ke **ANDAR ki saari cheezein** (folder khud nahi, uske andar ka saaman) kheech kar (drag & drop) us page par chhod dein:
   - `server.py`, `index.html`, `style.css`, `app.js`
   - `Procfile`, `render.yaml`, `requirements.txt`
   - **`assets` folder pura** (photos + naksha)
   - **`data` folder pura** (taaki 12 demo posts live website par bhi dikhein)
6. Upload pura hone par neeche **"Commit changes"** wala green button dabayein.

✅ Code internet par surakshit rakha gaya!

## STEP 3️⃣ — Render par website chalao (5-7 minute)

1. Browser mein **render.com** kholein → **"Get Started for Free"** dabayein.
2. **"GitHub"** se sign-up karein (wahi GitHub account — button dbate hi jud jaayega).
3. Dashboard khulne par upar **"New +"** → **"Web Service"** chunein.
4. Apni **`mera-shahar`** repository chunein → **Connect** dabayein.
   *(Agar repo na dikhe to "Configure account" karke GitHub ko permission dein.)*
5. Settings aise bharein (zyadaatar apne-aap bhari hongi, bas check kar lo):

   | Jagah | Kya likhna hai |
   | --- | --- |
   | **Name** | `mera-shahar-meri-pehchan` (yahi aapki website ka address Banega) |
   | **Runtime / Language** | Python 3 |
   | **Build Command** | `echo ready` |
   | **Start Command** | `python3 server.py` |
   | **Plan** | **Free** ($0) wala chunein |

6. Neeche **"Create Web Service"** dabayein.
7. Ab 2-3 minute rukein — screen par "live" hara nishaan aayega aur upar aapki website ka pata dikhega, kuch aisa:
   🎉 **`https://mera-shahar-meri-pehchan.onrender.com`**

✅ **BADHAAI HO! Aapki website duniya bhar ke liye LIVE hai!** Us link ko kisi ko bhi bhejo, woh khol sakta hai.

## STEP 4️⃣ — Live website par pehle ye kaam karo

1. Apni nayi website kholo aur **sabse pehle apna khud ka account Bana** (apna pasandeeda username koi aur na le le!).
2. Ek **test post** karke dekho, ek comment bhi karo.
3. Link ko doston/gaon walon ko **WhatsApp par share** karo — pehli posts unhi se dalwao!

---

## ⚠️ Free plan ki 2 sachhi baatein (dhyaan se padho)

### 1. Website "so" jaati hai 😴
15 minute tak koi website na khole to free server so jaata hai. Uske baad pehla visitor aayega to website khulne mein **30-60 second** lagega. Tension nahi — khud theek ho jaata hai, bas logon ko bata do "thoda ruko, khul rahi hai".

### 2. ⚠️ SABSE IMPORTANT: Nayi posts mit sakti hain
Free server ki disk **asthayi (temporary)** hoti hai. Server jab restart/redeploy hoga (jo kabhi-kabhi khud hota hai), to **baad mein daali gayi posts, comments aur bane hue account mit sakte hain** (GitHub par rakhi 12 demo posts phir se aa jaayengi). **Shuruaat/demo ke liye ye bilkul theek hai.**

**Jab website asal mein chalne lage aur data permanent chahiye, to ye karna hoga (mujhse kehna, main kar dunga/guide dunga):**
- **Option A (asaan):** Render ki **paid disk** (lagbhag ₹80-100/mahina se shuru) jodna. Hamara server iske liye pehle se taiyaar hai — Render settings mein disk ka path `/var/data` rakhna hai aur ek setting `DATA_DIR=/var/data` jodni hai. Guide mein maangna, bata dunga.
- **Option B (sabse mazboot):** Asli **database** (jaise free PostgreSQL) jodna — thoda bada kaam hai, par aage ke liye yahi sahi raasta hai.

## 🔄 Website mein badlav (update) Kaise hoga?

Maine jab bhi nayi feature banaun, to nayi files ko GitHub repo mein **purani files ki jagah upload** kar do ("Add file → Upload files"). Render khud 2-3 minute mein website ko naye roop mein live kar dega. ✨

## ❓ Kuch gadbad ho to?

| Dikkat | Hal |
| --- | --- |
| Render par "Deploy failed" aaya | Usi page par **Logs** kholo — aam taur par Start Command `python3 server.py` hona chahiye, dobara check karo |
| Repo list mein nahi dikhi | Render → "Configure account" → GitHub mein repository ko permission do |
| Website khulne mein der | Free server soya hoga — 1 minute ruk kar refresh karo |
| Kuch aur atke | Screenshot/jo likha aaya woh mujhe yahan bhejo — main wahi step samjha dunga 🤝 |

## 🏷️ Aage chalke: Apna khud ka naam (domain)
Jab chaaho, `merashahar.in` jaisa apna naam (₹500-800/saal ke aas-paas) khareed kar Render se joda ja sakta hai. Us samay kehna, uski bhi poori step-by-step guide bana dunga.
