# 🌿 Mera Shahar, Meri Pehchan

Ek website jahan **India ke har Rajya (28) aur kendra shasit pradesh (8)** ke log apna **muft account** Banakar apne gaon/shahar ki **famous cheez** — khana, jagah, tyohar, kala, prakriti — **photo ke saath** post kar sakte hain. Baaki log post ko **like** kar sakte hain, uspar **comment** kar sakte hain aur WhatsApp par share kar sakte hain.

## ✨ Features

| Feature | Detail |
| --- | --- |
| 🗺️ **India ka clickable naksha** | Asli border-wala map — kisi Rajya par click karo, uski posts dikh jaayengi. Posts zyada = rang gehra hara. **Naksha Bharat ki Adhikarik seemaon (Survey of India) ke anusaar hai — PoK, Gilgit-Baltistan aur Aksai Chin Bharat ke Abhinn ang ke roop mein shamil hain** (data: Natural Earth "India point of view", public domain) |
| 🪪 **Account & Profile** | Naam + username + password se muft account (password surakshit hash mein save). Profile mein aapki posts, mile hue likes/comments ke aankde, naam/gaon/bio badalna |
| ➕ **Post dalna** | Rajya, gaon/shahar, category, title, kahani aur photo (drag & drop, apne-aap resize) — login ke baad hi |
| 💬 **Comments** | Har post par charcha; apna comment hata sakte ho, post wala bhi apni post ke comments hata sakta hai |
| ❤️ **Likes** | Ek account = ek like (server par ginna jaata hai, nakli like nahi lag sakta) |
| 📋 **Rajya list + search** | Saare 36 Rajya/UT, category chips, search, sort (nayi / zyada pasand / zyada charcha) |
| 💾 **Data save** | Posts `data/posts.json`, accounts `data/users.json`, login `data/sessions.json` mein |

## ▶️ Apne computer par chalayein

Sirf **Python 3** chahiye (kuch install nahi karna):

```bash
cd bharat-darshan
python3 server.py
```

Browser mein kholein: **http://localhost:8000** — 12 demo posts (comments ke saath) pehle se mili hain.

## 🌐 Internet par LIVE karna hai?

Poori asaan Hinglish guide taiyaar hai → **[INTERNET-PAR-LIVE-GUIDE.md](INTERNET-PAR-LIVE-GUIDE.md)**
(GitHub + Render free hosting, step-by-step. Saari settings files — `Procfile`, `render.yaml`, `requirements.txt` — taiyaar hain.)

## 📁 Files

```
bharat-darshan/
├── index.html        ← website ke saare hisse (naksha, feed, form, login, profile)
├── style.css         ← Fresh Nature design (hara-bhara)
├── app.js            ← dimaag (login, naksha, posts, comments, likes)
├── server.py         ← server + saare API (sirf Python standard library)
├── assets/           ← demo photos + India naksha data (india-states.geo.json)
├── data/             ← posts.json, users.json, sessions.json (auto bante hain)
├── Procfile, render.yaml, requirements.txt   ← hosting ki taiyaari
└── INTERNET-PAR-LIVE-GUIDE.md                ← live karne ki guide
```

> 🔐 **Suraksha note:** Password kabhi seedha save nahi hota — PBKDF2 hash bankar save hota hai. Phir bhi, ye ek shuruaati (learning) project hai; asal badi public website ke liye database, email/OTP password-reset aur post-moderation (galat content rokna) aage jodne chahiye. Kaho to bana doon! 🙏
