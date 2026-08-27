# 🤖 Telegram MCQ Quiz Bot — A/L Past Papers

මෙම Telegram Bot මගින් අ.පො.ස. (උසස් පෙළ) **දේශපාලන විද්‍යාව, ශ්‍රී ලංකා ඉතිහාසය, බෞද්ධ ශිෂ්ටාචාරය, සහ සිංහල** යන විෂයයන්හි පසුගිය ප්‍රශ්න පත්‍ර (Past Papers) Telegram තුළදීම (**Telegram WebApp**) හෝ Web Browser එකෙන් සිදු කළ හැක.

---

## 🛠️ 1. Telegram Bot එකක් සාදා ගැනීම (@BotFather)

1. ඔබගේ Telegram App එක තුළ **@BotFather** සෙවුම් කර ඔහු වෙත යන්න.
2. `/newbot` ලෙස Command එකක් යවන්න.
3. Bot සඳහා නමක් ලබා දෙන්න (උදා: `AL Past Paper Quiz Bot`).
4. Bot සඳහා Username එකක් ලබා දෙන්න (එය `bot` වලින් අවසන් විය යුතුය, උදා: `AL_MCQ_Quiz_bot`).
5. **BotFather විසින් ඔබට HTTP API Token එකක් ලබා දෙනු ඇත** (උදා: `7123456789:AAEF...`).

---

## ⚙️ 2. Setup & Installation (පරිගණකයේ ක්‍රියාත්මක කිරීම)

### 1 පියවර: `.env` File එක සැකසීම
ව්‍යාපෘති Folder එක තුළ ඇති `.env.example` file එක `.env` ලෙස Rename කරන්න (හෝ `.env` නමින් නව File එකක් සාදන්න):

```env
BOT_TOKEN=7123456789:YOUR_ACTUAL_TELEGRAM_BOT_TOKEN
BASE_URL=https://dmadushanka.github.io/A-L
```

### 2 පියවර: Node Packages Install කිරීම
Terminal / PowerShell එකෙහි පහත Command එක ක්‍රියාත්මක කරන්න:

```bash
npm install
```

### 3 පියවර: Bot එක Run කිරීම
Bot එක ක්‍රියාත්මක කිරීමට:

```bash
npm start
```

---

## 📱 Bot එකේ ක්‍රියාකාරී රටාව (Flow):

1. පරිශීලකයා **/start** යැවූ විට විෂයයන් (Subjects) ලැයිස්තුව පෙන්වයි.
2. විෂයයක් තෝරාගත් විට **පසුගිය ප්‍රශ්න පත්‍ර (Past Papers)** / **වෙනත් (Other)** තේරීමට පහසුකම ලැබෙයි.
3. **පසුගිය ප්‍රශ්න පත්‍ර** තෝරාගත් විට අදාළ වර්ෂයන් (Years) බොත්තම් ලෙස පෙන්වයි.
4. වර්ෂයක් තෝරාගත් විට **🚀 Open WebApp** (Telegram තුළදීම) හෝ **🌐 Open Browser** මගින් Quiz එක ඇරඹීමට හැකියාව ලැබෙයි.

---

## ☁️ 3. Bot එක 24/7 නොමිලේ Host කිරීම (Deployment)

Bot එක පරිගණකය Off කළද 24/7 ක්‍රියාත්මකව තැබීමට Render, Koyeb, හෝ Railway වැනි නොමිලේ ලබා දෙන Hosting සේවාවන් භාවිතා කළ හැක:

1. ඔබගේ මේ Project එක **GitHub Repository** එකට Commit & Push කරන්න.
2. **[Render.com](https://render.com)** හෝ **[Koyeb.com](https://koyeb.com)** වෙත ලොග් වී **New Background Worker / Web Service** තෝරන්න.
3. ඔබගේ GitHub Repository එක සම්බන්ධ කරන්න.
4. Build Command: `npm install`
5. Start Command: `node bot.js`
6. **Environment Variables** හි `BOT_TOKEN` සහ `BASE_URL` ඇතුළත් කරන්න.
