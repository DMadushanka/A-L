import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { 
  registerUser, 
  registerGroup,
  unregisterGroup,
  recordScore, 
  getLeaderboard, 
  getOverallLeaderboard, 
  addScheduledJob, 
  getPendingScheduledJobs, 
  markJobSent,
  readDb 
} from './db.js';
import { parseScheduleDateTime } from './schedule-utils.js';

// Load environment variables
dotenv.config();

const BOT_TOKEN = (process.env.BOT_TOKEN || '').trim();
const BASE_URL = (process.env.BASE_URL || 'https://dmadushanka.github.io/A-L').trim();
const ADMIN_ID = (process.env.ADMIN_ID || '').trim();
const CHANNEL_URL = (process.env.CHANNEL_URL || '').trim();
const GROUP_URL = (process.env.GROUP_URL || '').trim();
const FB_PAGE_URL = (process.env.FB_PAGE_URL || process.env.Facebook_Page || '').trim();
const WA_CHANNEL_URL = (process.env.WA_CHANNEL_URL || 'https://whatsapp.com/channel/0029VbDIx2lHwXb4rvJNIV0D').trim();

// Global Error Handlers to keep the bot process alive 24/7
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err?.message || err);
});

// Tiny HTTP Server (Health Check Listener for 24/7 Uptime)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🎓 A/L MCQ Quiz Telegram Bot (@AL_MCQbot) is Running Live 24/7!');
}).listen(PORT, () => {
  console.log(`🌐 Health check HTTP server listening on port ${PORT}`);
});

// Database mapping of subjects, paper categories, and files
const QUIZ_DATA = {
  pl: {
    name: '🏛️ දේශපාලන විද්‍යාව (Political Science)',
    shortName: 'දේශපාලන විද්‍යාව',
    papers: {
      '2016': { title: 'දේශපාලන විද්‍යාව 2016 — MCQ 40', file: 'pl2016.html', img: 'pl2016.png' },
      '2017': { title: 'දේශපාලන විද්‍යාව 2017 — MCQ 40', file: 'pl2017.html', img: 'pl2017.png' },
      '2018': { title: 'දේශපාලන විද්‍යාව 2018 — MCQ 40', file: 'pl2018.html', img: 'pl2018.png' },
      '2019': { title: 'දේශපාලන විද්‍යාව 2019 — MCQ 40', file: 'pl2019.html', img: 'pl2019.png' },
      '2020': { title: 'දේශපාලන විද්‍යාව 2020 — MCQ 40', file: 'pl2020.html', img: 'pl2020.png' },
      '2021': { title: 'දේශපාලන විද්‍යාව 2021 — MCQ 40', file: 'pl2021.html', img: 'pl2021.png' },
      '2023': { title: 'දේශපාලන විද්‍යාව 2023 — MCQ 40', file: 'pl2023.html', img: 'pl2023.png' },
      '2024': { title: 'දේශපාලන විද්‍යාව 2024 — MCQ 40', file: 'pl2024.html', img: 'pl2024.png' },
      '2025': { title: 'දේශපාලන විද්‍යාව 2025 — MCQ 40', file: 'pl2025.html', img: 'pl2025.png' }
    }
  },
  hist: {
    name: '📜 ශ්‍රී ලංකා ඉතිහාසය (Sri Lanka History)',
    shortName: 'ශ්‍රී ලංකා ඉතිහාසය',
    papers: {
      '2015': { title: 'ශ්‍රී ලංකා ඉතිහාසය 2015 — MCQ 40', file: 'history2015.html', img: 'history2015.png' },
      '2016': { title: 'ශ්‍රී ලංකා ඉතිහාසය 2016 — MCQ 40', file: 'history2016.html', img: 'history2016.png' },
      '2017': { title: 'ශ්‍රී ලංකා ඉතිහාසය 2017 — MCQ 40', file: 'history2017.html', img: 'history2017.png' },
      '2018': { title: 'ශ්‍රී ලංකා ඉතිහාසය 2018 — MCQ 40', file: 'history2018.html', img: 'history2018.png' },
      '2019': { title: 'ශ්‍රී ලංකා ඉතිහාසය 2019 — MCQ 40', file: 'history2019.html', img: 'history2019.png' },
      '2020': { title: 'ශ්‍රී ලංකා ඉතිහාසය 2020 — MCQ 40', file: 'history2020.html', img: 'history2020.png' },
      '2022': { title: 'ශ්‍රී ලංකා ඉතිහාසය 2022 — MCQ 40', file: 'history2022.html', img: 'history2022.png' }
    }
  },
  bc: {
    name: '☸️ බෞද්ධ ශිෂ්ටාචාරය (Buddhist Civ)',
    shortName: 'බෞද්ධ ශිෂ්ටාචාරය',
    papers: {
      '2011': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2011 (BC-1)', file: 'BC1.html', img: 'BC1.png' },
      '2012': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2012 (BC-2)', file: 'BC2.html', img: 'BC2.png' },
      '2013': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2013 (BC-3)', file: 'BC3.html', img: 'BC3.png' },
      '2014': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2014 (BC-4)', file: 'BC4.html', img: 'BC4.png' },
      '2015': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2015 (BC-5)', file: 'BC5.html', img: 'BC5.png' },
      '2016': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2016 (BC-6)', file: 'BC6.html', img: 'BC6.png' },
      '2017': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2017 (BC-7)', file: 'BC7.html', img: 'BC7.png' },
      '2018': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2018 (BC-8)', file: 'BC8.html', img: 'BC8.png' },
      '2019': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2019 (BC-9)', file: 'BC9.html', img: 'BC9.png' },
      '2020': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2020 (BC-10)', file: 'BC10.html', img: 'BC10.png' },
      '2021': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2021 (BC-11)', file: 'BC11.html', img: 'BC11.png' },
      '2024_wp': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2024 (බස්නාහිර පළාත්) — MCQ 50', file: 'bc2024_wp.html', img: 'bc2024_wp.png', btnLabel: '2024 (බස්නාහිර)', isModel: true },
      '2026_central': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2026 (මධ්‍යම පළාත්) — MCQ 50', file: 'bc2026_central.html', img: '2026model_CentralP.png', btnLabel: '2026 (මධ්‍යම Model)', isModel: true },
      '2024_uva': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2024 (ඌව පළාත්) — MCQ 50', file: 'bc2024_uva.html', img: 'bc2024_uva.png', btnLabel: '2024 (ඌව පළාත්)', isModel: true },
      '2019_prototype': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2019 (ආදර්ශ / Prototype) — MCQ 50', file: 'bc2019_prototype.html', img: 'BCmo2019.png', btnLabel: '2019 (Prototype)', isModel: true },
      '2026_moe': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2026 (අධ්‍යාපන අමාත්‍යාංශය) — MCQ 50', file: 'bc2026_moe.html', img: 'bc2026_moe.png', btnLabel: '2026 (MOE Model)', isModel: true },
      '2026_model_p2': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2026 (ආදර්ශ II පත්‍රය — Structured & Essay)', file: 'bc2026_model_part2.html', img: 'bc2026_part2.png', btnLabel: '2026 Model Part 2', isModel: true, isPart2: true },
      '2026_master': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2026 (මාස්ටර් ප්‍රශ්න බැංකුව — MCQ 229)', file: 'bc2026_master.html', img: 'bc2026_master.png', btnLabel: '2026 (Master Bank)', isModel: true }
    }
  },
  sin: {
    name: '✍️ සිංහල (Sinhala Language)',
    shortName: 'සිංහල',
    papers: {
      '2019_nwp': { title: 'සිංහල 2019 (වයඹ පළාත) — I පත්‍රය MCQ 20', file: 'sinhala2019_nwp.html', img: 'logo.png', btnLabel: '2019 (වයඹ පළාත්)' },
      '2019_sp': { title: 'සිංහල 2019 (දකුණු පළාත) — I පත්‍රය MCQ 20', file: 'sinhala2019_sp.html', img: 'logo.png', btnLabel: '2019 (දකුණු පළාත්)' },
      '2020_nwp': { title: 'සිංහල 2020 (වයඹ පළාත) — I පත්‍රය MCQ 20', file: 'sinhala2020_nwp.html', img: 'logo.png', btnLabel: '2020 (වයඹ පළාත්)' },
      '2020_term2': { title: 'සිංහල 2020 (12 ශ්‍රේණිය 2 වාරය) — I පත්‍රය MCQ 20', file: 'sinhala2020_term2.html', img: 'logo.png', btnLabel: '2020 (12 ශ්‍රේණිය 2 වාරය)' },
      '2020': { title: 'සිංහල 2020 — I පත්‍රය MCQ', file: 'sinhala2020.html', img: 'sinhala2020.png' },
      '2021': { title: 'සිංහල 2021 — I පත්‍රය MCQ', file: 'sinhala2021.html', img: 'sinhala2021.png' },
      '2022': { title: 'සිංහල 2022 — I පත්‍රය MCQ', file: 'sinhala2022.html', img: 'sinhala2022.png' },
      '2024': { title: 'සිංහල 2024 — I පත්‍රය MCQ', file: 'sinhala2024.html', img: 'sinhala2024.png' },
      '2025': { title: 'සිංහල 2025 — I පත්‍රය MCQ', file: 'sinhala2025.html', img: 'sinhala2025.png' }
    }
  },
  bs: {
    name: '💼 ව්‍යාපාර අධ්‍යයනය (Business Studies)',
    shortName: 'ව්‍යාපාර අධ්‍යයනය',
    papers: {
      '2015': { title: 'ව්‍යාපාර අධ්‍යයනය 2015 — MCQ 30', file: 'bs2015.html', img: 'bs2015.png' }
    }
  }
};

// Database of Part II Questions & Detailed Marking Scheme Model Answers for Native Telegram Chat Reading
const PART2_QUESTIONS_DATA = {
  '2026_model_p2': {
    1: {
      title: 'ප්‍රශ්නය 01 (ව්‍යුහගත රචනා)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `📌 **ප්‍රශ්නය 01 / 08 (I කොටස — ව්‍යුහගත රචනා)**\n` +
        `*(ප්‍රශ්න 3න් 2කට පිළිතුරු සපයන්න. ලකුණු 20x2=40)*\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** වෛදික යුගයේ යාග පැවැත්වූ ප්‍රධාන පූජකවරුන් 04 දෙනා නම් කරන්න. (ලකුණු 04)\n` +
        `**(ii)** චතුර් වර්ණ ධර්මවලින් 'වෛශ්‍ය' වර්ණයට හිමි වූ 'ස්වධර්ම' 02ක් සඳහන් කරන්න. (ලකුණු 04)\n` +
        `**(iii)** අජිත කේසකම්බලී ශ්‍රමණයාගේ ප්‍රධාන දර්ශනය කුමක්ද? (ලකුණු 04)\n` +
        `**(iv)** බුදුසමය මඟින් 'ඊශ්වර නිර්මාණවාදය' විවේචනය කළ ප්‍රධාන තර්කයක් පැහැදිලි කරන්න. (ලකුණු 04)\n` +
        `**(v)** "ස්ත්‍රියට පරමාර්ථ සාධනය (අර්හත්භාවය) ලැබීමට ලිංගික භේදය බාධාවක් නොවේ." — බෞද්ධ මතය පැහැදිලි කරන්න. (ලකුණු 04)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** 1. හෝතෘ (Hotri) 2. අධ්වර්යු (Adhvaryu) 3. උද්ගාතෘ (Udgatri) 4. බ්‍රහ්මන් (Brahman)\n` +
        `**(ii)** ගෝරක්ෂා (ගව පාලනය), කෘෂිකර්මාන්තය, වාණිජ්‍යය (වෙළඳාම).\n` +
        `**(iii)** උච්ඡේදවාදය / භෞතිකවාදය (මරණින් මතු කිසිවක් ඉතිරි නොවේ, පින/පව හෝ පරලොවක් නැත).\n` +
        `**(iv)** ඊශ්වරයා සියල්ල මවන ලද්දේ නම් ලොව පවතින දුක, අසමානතාවය, පාපය හා හිංසනයටද වගකිව යුත්තේ ඔහුය (අංගුත්තර නිකාය තිත්ථදර්ශන සූත්‍රය).\n` +
        `**(v)** චිත්ත පරිශුද්ධියට ඡන්දය, වීර්යය, චිත්තය, විමංසා යන ඉද්ධිපාද අවශ්‍ය වේ. බුදුරජාණන් වහන්සේ යශෝධරා, මහාප්‍රජාපතී ගෝතමී, ඛේමා, උප්පලවණ්ණා ආදී මෙහෙණින් වහන්සේලා අර්හත්ඵලයට පත් වූ බව දේශනා කළහ.`
    },
    2: {
      title: 'ප්‍රශ්නය 02 (ව්‍යුහගත රචනා)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `📌 **ප්‍රශ්නය 02 / 08 (I කොටස — ව්‍යුහගත රචනා)**\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** ව්‍යග්ඝපජ්ජ සූත්‍රයේ දැක්වෙන දිට්ඨධම්මහිතත්ථ (මෙලොව දියුණුවට හේතු වන) සම්පදා 04 නම් කරන්න. (ලකුණු 04)\n` +
        `**(ii)** සිඟාලෝවාද සූත්‍රයට අනුව ධනය විනාශ වන 'අපාය මුඛ' 02ක් සඳහන් කරන්න. (ලකුණු 04)\n` +
        `**(iii)** බුදුසමයෙහි සඳහන් වන 'සුහද මිත්‍රයන්' (කල්‍යාණ මිත්‍රයන්) වර්ග 04 නම් කරන්න. (ලකුණු 04)\n` +
        `**(iv)** සිඟාලෝවාද සූත්‍රයේ එන ධන විභාජන ප්‍රතිපත්තිය විස්තර කරන්න. (ලකුණු 04)\n` +
        `**(v)** බුදුසමයෙහි තහනම් කර ඇති 'මිච්ඡා වණිජ්ජා' (මිථ්‍යා වෙළඳාම්) 05 නම් කරන්න. (ලකුණු 04)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** 1. උට්ඨාන සම්පදා 2. ආරක්ඛ සම්පදා 3. කල්‍යාණමිත්තතා 4. සමජීවිතා\n` +
        `**(ii)** මත්පැන් පානය, රාත්‍රී සමාජශාලා සංචාරය, සූදුව, පාපමිත්‍ර සේවනය, අලසකම.\n` +
        `**(iii)** 1. උපකාරක මිත්‍රයා 2. සමාන සුඛදුක්ඛ මිත්‍රයා 3. අත්ථක්ඛායී (අර්ථය කියාදෙන) මිත්‍රයා 4. අනුකම්පක මිත්‍රයා\n` +
        `**(iv)** 1/4ක් දෛනික පරිභෝජනයට, 2/4ක් (අඩක්) ව්‍යාපාර හා ආයෝජනයට, 1/4ක් ආපදා හා අනාගත අරමුදල් ලෙස ඉතිරි කිරීමට.\n` +
        `**(v)** 1. සත්ථ වණිජ්ජා (ආයුධ) 2. සත්ත වණිජ්ජා (වහලුන්/මිනිසුන්) 3. මංස වණිජ්ජා (මස්) 4. මජ්ජ වණිජ්ජා (මද්‍යසාර) 5. විස වණිජ්ජා (විෂ වර්ග).`
    },
    3: {
      title: 'ප්‍රශ්නය 03 (ව්‍යුහගත රචනා)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `📌 **ප්‍රශ්නය 03 / 08 (I කොටස — ව්‍යුහගත රචනා)**\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** ශ්‍රී ලංකාවේ ප්‍රථමයෙන් ඉදිකළ ස්තූපය සහ මෙහෙණවර නම් කරන්න. (ලකුණු 04)\n` +
        `**(ii)** මිහිඳු හිමියන් අනුරාධපුර මහමෙව්නාවේදී දේශනා කළ ප්‍රථම සූත්‍රය කුමක්ද? (ලකුණු 04)\n` +
        `**(iii)** මහින්දාගමනයට පෙර ලංකාවේ පැවති පූර්ව මහින්ද ඇදහිලි 03ක් සඳහන් කරන්න. (ලකුණු 04)\n` +
        `**(iv)** අනුරාධපුර යුගයේ රජවරුන්ට මහා විහාරීය භික්ෂූන් වහන්සේලා ලබාදුන් උපදේශක කාර්යභාරය පැහැදිලි කරන්න. (ලකුණු 04)\n` +
        `**(v)** අභයගිරි නිකාය ආරම්භ වීමට හේතු වූ ආගමික හා දේශපාලනික පසුබිම කෙටියෙන් විස්තර කරන්න. (ලකුණු 04)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** ප්‍රථම ස්තූපය: ථූපාරාමය | ප්‍රථම මෙහෙණවර: හත්ථාල්හක මෙහෙණවර\n` +
        `**(ii)** දේවදූත සූත්‍රය (මජ්ඣිම නිකාය)\n` +
        `**(iii)** යක්ෂ/නාග ඇදහිලි, වෘක්ෂ ඇදහිලි, පිත්‍රෘ/ප්‍රේත ඇදහිලි, නක්ෂත්‍ර/ජ්‍යොතිෂ ඇදහිලි.\n` +
        `**(iv)** රාජ්‍ය පාලනයේදී 'දස රාජ ධර්ම' අනුගමනය කිරීමට උපදෙස් දීම, රජු සෙබළුන් හා ප්‍රජාව සමඟ ධාර්මිකව කටයුතු කිරීමට මඟපෙන්වීම.\n` +
        `**(v)** වළගම්බා රජු ගිරි නිගණ්ඨයාගේ ආරාමය බිඳ අභයගිරි විහාරය කරවා මහාතිස්ස හිමියන්ට පූජා කිරීම සහ මහා විහාරීය කුලසංසර්ග චෝදනාව මත භික්ෂූන් වෙන්වීම.`
    },
    4: {
      title: 'ප්‍රශ්නය 04 (රචනා ප්‍රශ්න)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `✍️ **ප්‍රශ්නය 04 / 08 (II කොටස — රචනා ප්‍රශ්න)**\n` +
        `*(ප්‍රශ්න 5න් 3කට පිළිතුරු සපයන්න. ලකුණු 20x3=60)*\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** අග්ගඤ්ඤ සූත්‍රයේ සඳහන් මානව හා සමාජ පරිණාමීය අවස්ථා සහ 'මහාසම්මත' රජුගේ සම්භවය පැහැදිලි කරන්න. (ලකුණු 10)\n` +
        `**(ii)** චක්කවත්ති සීහනාද සූත්‍රයේ දැක්වෙන 'දස සක්විති වත්' අතුරින් ප්‍රධාන වත් 05ක් දක්වා එහි සමාජ-ආර්ථික වැදගත්කම විග්‍රහ කරන්න. (ලකුණු 10)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** • රසාපඨවි, පප්පටක, භද්දලතා, ස්වයංජාත ඇල්වී ආදී භෞතික පරිණාමය.\n` +
        `• මිනිසා තණ්හාවෙන් ඇල්වී අස්වැන්න තැන්පත් කිරීම නිසා පෞද්ගලික දේපළ අයිතිය, මායිම් ආරවුල් හා සොරකම ඇතිවීම.\n` +
        `• නීතිය හා සාමය පිණිස ජනයා විසින් සම්මත කරගත් 'මහාසම්මත' රජු තෝරා පත් කරගැනීම.\n\n` +
        `**(ii)** • ධම්මික රක්ඛාව (ධර්මානුකූල ආරක්ෂාව)\n` +
        `• අධනස්ස ධනනුප්පදානං (දිළිඳුන්ට ධනය ලබාදීම)\n` +
        `• සමණ බ්‍රාහ්මණ පරියුපාසනං (ශ්‍රමණ බ්‍රාහ්මණයන්ගෙන් උපදෙස් ලැබීම)\n` +
        `• මනුස්ස-පසු-පක්ඛි ආදී සියලු ජීවීන්ට ආරක්ෂාව දීම.\n` +
        `• සමාජයේ අපරාධ අඩුවීමට දිළිඳුකම නැති කිරීම අත්‍යවශ්‍ය බව පැහැදිලි කිරීම.`
    },
    5: {
      title: 'ප්‍රශ්නය 05 (රචනා ප්‍රශ්න)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `✍️ **ප්‍රශ්නය 05 / 08 (II කොටස — රචනා ප්‍රශ්න)**\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** 'සත්ථා දේවමනුස්සානං' බුදුගුණය ප්‍රජාතන්ත්‍රවාදී හා මානවවාදී නායකත්ව ලක්ෂණ සමඟ සසඳමින් පැහැදිලි කරන්න. (ලකුණු 10)\n` +
        `**(ii)** බුද්ධ චරිතයෙන් හෙළිවන උපදේශන, ගැටලු විසඳීමේ හා සංවාදශීලී නායකත්ව ලක්ෂණ උදාහරණ සහිතව විග්‍රහ කරන්න. (ලකුණු 10)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** • බුදුරජාණන් වහන්සේ දෙවි මිනිසුන්ගේ ශාස්තෘවරයා ලෙස සැමට එක හා සමානව කරුණාව දැක්වීම.\n` +
        `• කුල, වර්ණ, වයස්, ලිංගික භේදයකින් තොරව සුනීත, සෝපාක, රජ්ජුමාලා ආදීන්ට ධර්මාවබෝධය ලබාදීම.\n` +
        `• භික්ෂු සංඝයා සඳහා සංඝ සභා පැවැත්වීම හා සාමූහික ප්‍රජාතන්ත්‍රවාදී තීරණ ගැනීම.\n\n` +
        `**(ii)** • පටාචාරාවන්ගේ සහ කිසාගෝතමියගේ මහත් වූ සෝකය සමනය කළ අයුරු.\n` +
        `• කෝලිය-ශාක්‍ය රෝහිණී නදී ජල අර්බුදයේදී යුද්ධය වළක්වා සංවාදයෙන් ගැටලුව විසඳීම (ජලයද ලේද වටිනේ?)\n` +
        `• අංගුලිමාල දමනය හා සච්චක, උපාලි ගෘහපති ආදීන් සමඟ පැවැත්වූ සංවාදශීලී විග්‍රහයන්.`
    },
    6: {
      title: 'ප්‍රශ්නය 06 (රචනා ප්‍රශ්න)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `✍️ **ප්‍රශ්නය 06 / 08 (II කොටස — රචනා ප්‍රශ්න)**\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** ප්‍රථම හා තෙවන ධර්ම සංගායනාවල ඓතිහාසික පසුබිම, ධර්ම සංගායනා කිරීමට හේතු සහ ප්‍රතිඵල සැසඳීමක් කරන්න. (ලකුණු 10)\n` +
        `**(ii)** ධර්මපාල රජු විසින් ආරම්භ කරන ලද 'වික්‍රමශීලා' බෞද්ධ විශ්වවිද්‍යාලයේ අධ්‍යාපනික හා ජාත්‍යන්තර වැදගත්කම පැහැදිලි කරන්න. (ලකුණු 10)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** • **ප්‍රථම සංගායනාව**: සුභද්ද භික්ෂුවගේ අවගුණ බස් නිසා රජගහනුවර සප්තපණ්ණි ගුහාද්වාරයේදී මහාකස්සප හිමියන්ගේ මූලිකත්වයෙන් පැවැත්වීම. ධර්මය හා විනය සංග්‍රහ කිරීම.\n` +
        `• **තෙවන සංගායනාව**: අශෝක රජුගේ කාලයේ තීර්ථකයන් සංඝයා අතරට රිංගීම නිසා පැටලුණු සාසන අර්බුදයට පිළියම් ලෙස මොග්ගලීපුත්තතිස්ස හිමියන්ගේ මූලිකත්වයෙන් පැවැත්වීම. නවදෙසට ධර්මදූතයන් යැවීම.\n\n` +
        `**(ii)** • පාල වංශික ධර්මපාල රජු විසින් බිහාර් හි පිහිටුවීම.\n` +
        `• ද්වාරපණ්ඩිතවරුන් 6 දෙනා මඟින් විදේශීය සිසුන් ඇතුළත් කරගැනීම.\n` +
        `• දීපංකර ශ්‍රී ඥාන (අතීශ) හිමියන් ටිබෙටයට බුදුසමය ගෙන යාම.`
    },
    7: {
      title: 'ප්‍රශ්නය 07 (රචනා ප්‍රශ්න)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `✍️ **ප්‍රශ්නය 07 / 08 (II කොටස — රචනා ප්‍රශ්න)**\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** ඉන්දියාවේ සාංචි ස්තූපයේ නිර්මාණ ලක්ෂණ ලංකාවේ අනුරාධපුර යුගයේ ස්තූප නිර්මාණ සමඟ සසඳන්න. (ලකුණු 10)\n` +
        `**(ii)** ගන්ධාර සහ මථුරා බුද්ධ ප්‍රතිමා කලාවන්හි පැවති කලාත්මක හා සංස්කෘතික වෙනස්කම් පැහැදිලි කරන්න. (ලකුණු 10)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** • සාංචි ස්තූපය: අර්ධ ගෝලාකාර ගර්භය, ඡත්‍රාපලිය, තෝරණ 4 (North, South, East, West Toranas) හා වේදිකාව.\n` +
        `• ලංකාවේ ස්තූප: ඡත්‍රාපලිය වෙනුවට දේවතා කොටුව, කොත්කැරැල්ල, ඡත්‍රය, පෑස, ත්‍රිවිධ පේසා හා වාහල්කඩ ඉදිකිරීම.\n\n` +
        `**(ii)** • **ගන්ධාර කලාව**: ග්‍රීක-රෝම ආභාසය (Apollo රූප ලක්ෂණ), රැළි සහිත සිවුර, රැළි කොණ්ඩය, යථාර්ථවාදී මාංශ පේශී.\n` +
        `• **මථුරා කලාව**: දේශීය ඉන්දියානු ආභාසය, මහත සිරුර, පාරදෘශ්‍ය (ඇඟට ඇලුනු) සිවුර, මුහුණේ මන්දහාසය හා ආධ්‍යාත්මික බව.`
    },
    8: {
      title: 'ප්‍රශ්නය 08 (රචනා ප්‍රශ්න)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `✍️ **ප්‍රශ්නය 08 / 08 (II කොටස — රචනා ප්‍රශ්න)**\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** තායිලන්තයේ බුදුසමයේ ව්‍යාප්තිය සහ ශ්‍රී ලාංකේය සියම් නිකායික උපසම්පදාව නැවත පිහිටුවීමේදී තායිලන්තයෙන් ලැබුණු දායකත්වය විග්‍රහ කරන්න. (ලකුණු 10)\n` +
        `**(ii)** ජපානයේ ෂෝතොකු කුමරුගේ සේවය සහ 'සෙන් බුදුදහම' (Zen Buddhism) ජපන් සංස්කෘතියට කළ බලපෑම පැහැදිලි කරන්න. (ලකුණු 10)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** • ලංකාවේ උපසම්පදාව පිරිහී තිබූ 18 වන සියවසේදී කීර්ති ශ්‍රී රාජසිංහ රජු සහ වැලිවිට සරණංකර සංඝරාජ හිමියන්ගේ ඉල්ලීම පරිදි තායිලන්තයේ (සියම) උපාලි හිමියන් ප්‍රමුඛ ධර්මදූත පිරිස ලංකාවට පැමිණ 1753 දී සියම් නිකායික උපසම්පදාව පිහිටුවීම.\n\n` +
        `**(ii)** • ෂෝතොකු කුමරු (Prince Shotoku) ජපානයේ බුදුසමය රාජ්‍ය ආගම බවට පත් කිරීම, ව්‍යවස්ථාව සකස් කිරීම.\n` +
        `• සෙන් බුදුදහම (Zen Buddhism): ධ්‍යාන වැඩීම, චා-නො-යූ (තේ පැන් සංග්‍රහය - Tea Ceremony), ඉකෙබානා (මල් සැකසුම) සහ කඩු ශිල්පයට (Bushido) කළ බලපෑම.`
    }
  }
};

// Helper: Render Question by Question with Full Marking Scheme in Telegram Chat
async function renderPart2Question(chatId, messageId, subId, yearKey, qIndex = 1, queryId = null, isGroup = false) {
  if (queryId) {
    await safeAnswerCallback(queryId);
  }
  const paperData = QUIZ_DATA[subId]?.papers[yearKey];
  const qData = PART2_QUESTIONS_DATA[yearKey]?.[qIndex];
  const totalQ = 8;
  const quizUrl = `${BASE_URL}/${paperData?.file || 'bc2026_model_part2.html'}`;

  if (!qData) return;

  // Build Question Selector Row (1 to 4 and 5 to 8)
  const row1 = [];
  const row2 = [];
  for (let i = 1; i <= 4; i++) {
    const label = (i === qIndex) ? `· Q0${i} ·` : `Q0${i}`;
    row1.push({ text: label, callback_data: `part2_q_${subId}_${yearKey}_${i}` });
  }
  for (let i = 5; i <= 8; i++) {
    const label = (i === qIndex) ? `· Q0${i} ·` : `Q0${i}`;
    row2.push({ text: label, callback_data: `part2_q_${subId}_${yearKey}_${i}` });
  }

  const prevIdx = (qIndex > 1) ? qIndex - 1 : totalQ;
  const nextIdx = (qIndex < totalQ) ? qIndex + 1 : 1;

  const navRow = [
    { text: '◀️ පූර්ව (Prev)', callback_data: `part2_q_${subId}_${yearKey}_${prevIdx}` },
    { text: `📌 ${qIndex} / ${totalQ}`, callback_data: `part2_read_${subId}_${yearKey}` },
    { text: 'ඊළඟ (Next) ▶️', callback_data: `part2_q_${subId}_${yearKey}_${nextIdx}` }
  ];

  const webAppBtn = isGroup
    ? { text: '🚀 Open Interactive WebApp (App එක තුළින්)', url: quizUrl }
    : { text: '🚀 Open Interactive WebApp (App එක තුළින්)', web_app: { url: quizUrl } };

  const keyboard = {
    inline_keyboard: [
      row1,
      row2,
      navRow,
      [webAppBtn],
      [{ text: '⬅️ ප්‍රශ්න පත්‍ර තේරීමට (Back)', callback_data: `cat_${subId}_pp` }]
    ]
  };

  const fullText = `${qData.body}`;

  if (messageId) {
    try {
      await bot.editMessageText(fullText, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      return;
    } catch (e) {}
  }

  await bot.sendMessage(chatId, fullText, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  }).catch(e => console.error('Error sending Part 2 message:', e.message));
}

function parseCustomTimeInput(inputStr) {
  if (!inputStr) return null;
  const str = inputStr.trim().toLowerCase();
  
  const relMatch = str.match(/^(\d+)\s*(m|min|mins|minutes|h|hr|hours)?$/);
  if (relMatch) {
    const val = parseInt(relMatch[1], 10);
    const unit = relMatch[2] || 'm';
    if (unit.startsWith('h')) {
      return { delayMs: val * 3600 * 1000, label: `තවත් පැය ${val} කින් (In ${val} Hours)` };
    } else {
      return { delayMs: val * 60 * 1000, label: `තවත් මිනිත්තු ${val} කින් (In ${val} Mins)` };
    }
  }

  const timeMatch = str.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const mins = parseInt(timeMatch[2], 10);
    if (hours >= 0 && hours < 24 && mins >= 0 && mins < 60) {
      const target = new Date();
      target.setHours(hours, mins, 0, 0);
      if (target.getTime() <= Date.now()) {
        target.setDate(target.getDate() + 1);
      }
      const delayMs = target.getTime() - Date.now();
      const hStr = hours.toString().padStart(2, '0');
      const mStr = mins.toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'රාත්‍රී/සවස' : 'උදෑසන';
      return { delayMs, label: `පැය ${hStr}:${mStr} ට (${ampm})` };
    }
  }

  return null;
}

// State storage for active Native Telegram Poll sessions
const userPollSessions = {}; // chatId -> { subId, yearKey, paperKey, title, questions, qIndex, score, startTime }
const aiQuizSessions = {}; // chatId -> { creatorName, creatorMention, userScores }
const pollIdMap = {}; // pollId -> { chatId, correctOption }
const pendingCustomSchedule = {}; // chatId -> { subId, yearKey, paperKey }

// Helper: Check if user has Admin privileges
function isAdminUser(userId) {
  if (!ADMIN_ID) return true; // If no ADMIN_ID set, default to allow
  return userId && userId.toString() === ADMIN_ID;
}

// Helper: Clean text formatting for Telegram Poll limits
function cleanText(str, maxLen = 300) {
  if (!str) return '';
  let clean = str.replace(/<br\s*\/?>/gi, ' ')
                 .replace(/<[^>]+>/g, '')
                 .replace(/&nbsp;/gi, ' ')
                 .replace(/\s+/g, ' ')
                 .trim();
  if (clean.length > maxLen) {
    clean = clean.substring(0, maxLen - 3) + '...';
  }
  return clean;
}

// Helper: Escape Markdown V1 special characters for safe Telegram message delivery
function escapeMarkdown(str) {
  if (!str) return '';
  return String(str).replace(/[_*`\[\]]/g, '\\$&');
}

// Helper: Send message with automatic plain text fallback if Telegram Markdown parsing fails
async function safeSendMessage(chatId, text, options = {}) {
  try {
    return await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...options });
  } catch (err) {
    console.error(`Notice on safeSendMessage (Markdown failed, sending plain text):`, err.message);
    const cleanMsg = String(text).replace(/[*_`\[\]]/g, '');
    const cleanOpts = { ...options };
    delete cleanOpts.parse_mode;
    return await bot.sendMessage(chatId, cleanMsg, cleanOpts).catch((e2) => {
      console.error(`Error in safeSendMessage plain text fallback:`, e2.message);
      return null;
    });
  }
}

// Helper: Format seconds into minutes and seconds string (e.g. 3m 45s)
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// Helper: Calculate Target Date for Preset Schedule Options
function getTargetScheduleTime(type) {
  const now = new Date();
  if (type === 'now') return now;
  if (type === '15') return new Date(now.getTime() + 15 * 60 * 1000);
  if (type === '30') return new Date(now.getTime() + 30 * 60 * 1000);
  if (type === '60') return new Date(now.getTime() + 60 * 60 * 1000);
  
  if (type === 'tonight8') {
    const t = new Date();
    t.setHours(20, 0, 0, 0);
    if (t.getTime() <= now.getTime()) {
      t.setDate(t.getDate() + 1);
    }
    return t;
  }
  if (type === 'tomorrow8') {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    t.setHours(20, 0, 0, 0);
    return t;
  }
  return now;
}

// Helper: Dynamically extract QUESTIONS array from HTML file
function loadQuestionsFromHtml(filename) {
  try {
    const filePath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(filePath)) return null;

    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/const QUESTIONS = (\[[\s\S]*?\]);/);
    if (match) {
      const evalFn = new Function('return ' + match[1]);
      return evalFn();
    }
  } catch (e) {
    console.error(`Error reading questions from ${filename}:`, e.message);
  }
  return null;
}

// Helper: Safe answerCallbackQuery wrapper
async function safeAnswerCallback(queryId, text) {
  try {
    await bot.answerCallbackQuery(queryId, text ? { text } : undefined);
  } catch (err) {
    // Ignore expired callback query errors gracefully
  }
}

// Check if BOT_TOKEN is configured
if (!BOT_TOKEN || BOT_TOKEN === 'your_telegram_bot_token_here') {
  console.log('---------------------------------------------------------');
  console.log('⚠️  WARNING: BOT_TOKEN is not configured in .env file!');
  console.log('👉 Please edit .env file and set: BOT_TOKEN=123456789:YOUR_BOT_TOKEN');
  console.log('👉 Get a token from Telegram by chatting with @BotFather');
  console.log('---------------------------------------------------------');
  process.exit(0);
}

// Initialize Telegram Bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Fetch Bot Info dynamically for group link construction
let botUsername = 'AL_MCQbot';
bot.getMe().then(me => {
  if (me && me.username) {
    botUsername = me.username;
    console.log(`🤖 Logged in as Bot: @${botUsername}`);
  }
}).catch(err => console.log('Notice fetching bot info:', err.message));

// Configure Permanent In-Chat WebApp Menu Button (Left of input field)
const portalUrl = `${BASE_URL}/index.html`;

bot.setChatMenuButton({
  menu_button: JSON.stringify({
    type: 'web_app',
    text: '🎓 Quiz Portal',
    web_app: { url: portalUrl }
  })
}).catch(err => console.log('Menu Button setup notice:', err.message));

// Register Bot Command Autocomplete Registry for Telegram UI
bot.setMyCommands([
  { command: 'start', description: '🚀 ප්‍රධාන මෙනුව ආරම්භ කරන්න (Start Quiz Bot)' },
  { command: 'ai', description: '🤖 A/L MCQ HUB AI Tutor (ඕනෑම A/L ප්‍රශ්නයක් අහන්න)' },
  { command: 'image', description: '🎨 AI Image & Diagram Generator (නොමිලේ ඡායාරූප සෑදීම)' },
  { command: 'leaderboard', description: '🏆 උසස් පෙළ ලකුණු පුවරුව (Leaderboards & Ranks)' },
  { command: 'help', description: '📖 භාවිතය පිළිබඳ උපදෙස් (Help & Instructions)' },
  { command: 'myid', description: '👤 ඔබගේ Telegram User ID එක (View My ID)' }
]).catch(err => console.log('Notice setting commands:', err.message));

console.log('🚀 A/L MCQ Quiz Telegram Bot is starting...');
console.log(`🔗 WebApp Portal URL: ${portalUrl}`);
console.log(`🛡️ Configured ADMIN_ID: ${ADMIN_ID || 'None (Public Admin Mode)'}`);

// Helper: Automatically format raw Markdown tables (| col | col |) into Beautiful Telegram Emoji Cards
function formatTablesForTelegram(text) {
  if (!text) return text;
  const lines = text.split('\n');
  let inTable = false;
  let headers = [];
  let cardBlocks = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);

      if (trimmed.includes('---')) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        headers = cells;
        cardBlocks.push('\n📊 **වගුගත තොරතුරු (Structured Cards):**\n');
      } else {
        const title = cells[0] || 'තොරතුරු';
        let card = `🔹 **${title}**\n`;
        for (let j = 1; j < cells.length; j++) {
          const hName = headers[j] || `කරුණ ${j}`;
          card += `  • 📌 **${hName}:** ${cells[j]}\n`;
        }
        cardBlocks.push(card);
      }
    } else {
      if (inTable) {
        inTable = false;
        headers = [];
      }
      cardBlocks.push(line);
    }
  }

  return cardBlocks.join('\n');
}

// Helper: Format raw AI response text into clean, structured Telegram HTML
function formatAITextForTelegram(text) {
  if (!text) return '';

  let formatted = text;

  // 1. Remove all NotebookLM citation references like [1], [1, 2], [1-3], [12][13]
  formatted = formatted.replace(/\[\d+(?:\s*,\s*\d+|-?\d+)*\]/g, '');

  // 2. Clean raw LaTeX math arrow slashes (\\(\rightarrow\\), \rightarrow, \implies)
  formatted = formatted.replace(/\\\\?\(\s*\\?rightarrow\s*\\\\?\)/g, ' → ');
  formatted = formatted.replace(/\\\\?\(\s*\\?implies\s*\\\\?\)/g, ' ⇒ ');
  formatted = formatted.replace(/\\?rightarrow/g, ' → ');
  formatted = formatted.replace(/\\?implies/g, ' ⇒ ');
  formatted = formatted.replace(/\\\\?\([^\)]*\\\\?\)/g, '');
  formatted = formatted.replace(/\\\\/g, '');

  // 3. Clean up multiple spaces left behind after stripping citations & slashes
  formatted = formatted.replace(/[ \t]{2,}/g, ' ');
  formatted = formatted.replace(/ \./g, '.');
  formatted = formatted.replace(/ ,/g, ',');

  // 3. Convert raw Markdown tables if any before HTML escaping
  formatted = formatTablesForTelegram(formatted);

  // 4. Escape HTML special characters (&, <, >) to prevent parse crashes
  formatted = formatted.replace(/&/g, '&amp;');
  formatted = formatted.replace(/</g, '&lt;');
  formatted = formatted.replace(/>/g, '&gt;');

  // 5. Convert headers (### Header, ## Header, # Header) to styled HTML titles
  formatted = formatted.replace(/^[ \t]*#{1,4}\s*\*{0,2}(.*?)\*{0,2}\s*$/gm, (match, title) => {
    const cleanTitle = title.replace(/^[*_]+|[*_]+$/g, '').trim();
    if (!cleanTitle) return '';
    return `\n📌 <b>${cleanTitle}</b>\n─────────────────────`;
  });

  // 6. Convert double asterisks **bold** or double underscores __bold__ to <b>bold</b>
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  formatted = formatted.replace(/__(.*?)__/g, '<b>$1</b>');

  // 7. Clean up lines with raw nested asterisks "* *", "* -", "- *" into indented sub-bullets
  formatted = formatted.replace(/^[ \t]*[*•-]\s+[*•-]\s+/gm, '   ▸ ');
  formatted = formatted.replace(/^[ \t]{2,}[*•-]\s+/gm, '   ▸ ');

  // 8. Convert standard top-level list items ("* ", "- ") into clean "• "
  formatted = formatted.replace(/^[ \t]*[*•-]\s+/gm, '• ');

  // 9. Convert remaining single asterisk *italic* (not at line start) to <i>italic</i>
  formatted = formatted.replace(/(?<!\w)\*([^\*\n]+)\*(?!\w)/g, '<i>$1</i>');

  // 10. Clean up raw horizontal rules ("---", "___", "***")
  formatted = formatted.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '━━━━━━━━━━━━━━━━━━━━━');

  // 11. Format sub-headings like "• <b>නිදසුන්:</b>" or "• <b>උදාහරණ:</b>" into indented callouts
  formatted = formatted.replace(/•\s+<b>(නිදසුන්|උදාහරණ|සටහන|විශේෂ):<\/b>/gi, '   👉 <b>$1:</b>');

  // 12. Safely strip conversational ending follow-up question prompts (ONLY from the last 2 lines)
  const lines = formatted.trim().split('\n');
  for (let i = 0; i < 2; i++) {
    if (lines.length === 0) break;
    const lastLine = lines[lines.length - 1].trim();
    if (!lastLine) {
      lines.pop();
      continue;
    }
    const isFollowup = /(?:දෙන්නද|බලමු\s*ද|කරමු\s*ද|කැමති\s*ද|දන්නද|ද)\??\s*$/i.test(lastLine) &&
                       /(?:සකස්|සාකච්ඡා|විමසා|කතා|අධ්‍යයනය|පැහැදිලි|දැන|ලබා|ඊළඟට)/i.test(lastLine);
    const isDivider = /^[━─_-]{3,}$/.test(lastLine);
    if (isFollowup || isDivider) {
      lines.pop();
    } else {
      break;
    }
  }
  formatted = lines.join('\n');

  // 13. Remove excessive blank lines (more than 2 consecutive newlines)
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted.trim();
}

// Helper: Clean and create a safe filename from topic title
function sanitizePDFFilename(title) {
  if (!title) return 'A_L_MCQ_HUB_Study_Note';
  // Strip command prefixes like /ai_si, /ai_bc, /ai, /ai_hist, /ai_pl, /ai_bs
  let clean = title.replace(/^\/(ai|ai_si|ai_bc|ai_hist|ai_pl|ai_bs)\s*/i, '');
  // Remove illegal OS filename characters \ / : * ? " < > |
  clean = clean.replace(/[\\/:*?"<>|]/g, '');
  // Replace spaces with underscores
  clean = clean.trim().replace(/\s+/g, '_');
  // Truncate length to max 50 chars
  if (clean.length > 50) clean = clean.substring(0, 50);
  return clean ? `A_L_MCQ_HUB_${clean}` : 'A_L_MCQ_HUB_Study_Note';
}

// Helper: Generate structured Sinhala PDF Study Guide Document via Python Bridge
async function generatePDFNote(topicTitle, textContent) {
  if (!textContent || !textContent.trim()) return null;

  try {
    const pdfDir = path.resolve(process.cwd(), 'pdf_downloads');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    const timeId = Date.now().toString(36);
    const safeFilename = sanitizePDFFilename(topicTitle);
    const tempTxtPath = path.join(pdfDir, `temp_note_${timeId}.txt`);
    const outPdfPath = path.join(pdfDir, `${safeFilename}_${timeId}.pdf`);

    // Write text to temp file
    fs.writeFileSync(tempTxtPath, textContent, 'utf8');

    const pythonScript = path.resolve(process.cwd(), 'generate_pdf_note.py');
    const safeTitle = (topicTitle || 'උසස් පෙළ අධ්‍යයන සටහන').replace(/["'\\]/g, ' ');

    await new Promise((resolve) => {
      const pyProc = spawn('python', [pythonScript, safeTitle, tempTxtPath, outPdfPath]);
      let errOutput = '';
      pyProc.stderr.on('data', (d) => errOutput += d.toString());
      pyProc.on('close', (code) => {
        if (code === 0 && fs.existsSync(outPdfPath)) {
          resolve(outPdfPath);
        } else {
          console.error('PDF Generation python error:', errOutput);
          resolve(null);
        }
      });
    });

    // Clean up temp txt file
    if (fs.existsSync(tempTxtPath)) fs.unlink(tempTxtPath, () => {});

    if (fs.existsSync(outPdfPath)) return outPdfPath;
    return null;
  } catch (err) {
    console.error('Error generating PDF note:', err.message);
    return null;
  }
}

// Helper: Dynamic Syllabus & Marking Scheme Search Engine (RAG Grounding)
function findRelevantSyllabusContext(userPrompt) {
  if (!userPrompt) return '';
  const query = userPrompt.toLowerCase();
  const yearMatch = query.match(/\b(20[0-2][0-9])\b/);
  const requestedYear = yearMatch ? yearMatch[1] : null;

  let matchedContexts = [];

  function matchesYearConstraint(textLower) {
    if (!requestedYear) return true;
    if (textLower.includes(requestedYear)) return true;
    const yearsInText = textLower.match(/\b(20[0-2][0-9])\b/g);
    if (yearsInText && yearsInText.length > 0 && !yearsInText.includes(requestedYear)) {
      return false;
    }
    return true;
  }

  // 1. Search PART2_QUESTIONS_DATA marking schemes
  Object.values(PART2_QUESTIONS_DATA).forEach(paper => {
    Object.values(paper).forEach(qObj => {
      if (qObj.body) {
        const bodyText = qObj.body.toLowerCase();
        if (!matchesYearConstraint(bodyText)) return;
        const words = query.split(/\s+/).filter(w => w.length > 3);
        const matches = words.filter(w => bodyText.includes(w));
        if (matches.length >= 2 || bodyText.includes(query)) {
          matchedContexts.push(qObj.body);
        }
      }
    });
  });

  // 2. Search local Markdown files for matching A/L questions & marking schemes
  try {
    const mdFiles = [
      'knowledge_base/gce-al-bc-master-chronological-compendium.md',
      'al-bc-2026-part2-model-paper.md',
      'al-bc-2026-master-shuffled-mcqs.md',
      'buddhist-civilization-moe-2026-mcqs.md'
    ];
    mdFiles.forEach(fileName => {
      const filePath = path.resolve(process.cwd(), fileName);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const sections = content.split(/\n(?=###|\n#|---\n)/);
        sections.forEach(sec => {
          const secLower = sec.toLowerCase();
          if (!matchesYearConstraint(secLower)) return;
          const words = query.split(/\s+/).filter(w => w.length > 3);
          const matches = words.filter(w => secLower.includes(w));
          if (matches.length >= 2) {
            matchedContexts.push(sec.trim().substring(0, 800));
          }
        });
      }
    });
  } catch (e) {}

  // 3. Search knowledge_base/ folder for custom NotebookLM notes & documents
  try {
    const kbDir = path.resolve(process.cwd(), 'knowledge_base');
    if (fs.existsSync(kbDir)) {
      const kbFiles = fs.readdirSync(kbDir).filter(f => f.endsWith('.txt') || f.endsWith('.md') || f.endsWith('.json'));
      kbFiles.forEach(fileName => {
        const filePath = path.join(kbDir, fileName);
        const content = fs.readFileSync(filePath, 'utf8');
        const paragraphs = content.split(/\n\s*\n/);
        paragraphs.forEach(para => {
          const paraLower = para.toLowerCase();
          if (!matchesYearConstraint(paraLower)) return;
          const words = query.split(/\s+/).filter(w => w.length > 3);
          const matches = words.filter(w => paraLower.includes(w));
          if (matches.length >= 2 || paraLower.includes(query)) {
            matchedContexts.push(`[NotebookLM Note (${fileName})]:\n${para.trim().substring(0, 800)}`);
          }
        });
      });
    }
  } catch (e) {}

  if (matchedContexts.length > 0) {
    return matchedContexts.slice(0, 4).join('\n---\n');
  }
  return '';
}

// Helper: Optional Python Bridge to query live Google NotebookLM Notebooks with automatic retry
async function askNotebookLMPython(userPrompt, notebookId, mode = 'query') {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await new Promise((resolve) => {
      const scriptPath = path.resolve(process.cwd(), 'notebooklm_bridge.py');
      if (!fs.existsSync(scriptPath)) {
        return resolve(null);
      }

      const pyProc = spawn('python', [scriptPath, notebookId, mode], {
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONUTF8: '1'
        }
      });

      let stdout = '';
      let stderr = '';

      pyProc.stdout.on('data', (d) => { stdout += d.toString('utf8'); });
      pyProc.stderr.on('data', (d) => { stderr += d.toString('utf8'); });

      // Send userPrompt via STDIN in UTF-8 to prevent Windows command line string corruption
      pyProc.stdin.write(userPrompt || '', 'utf8');
      pyProc.stdin.end();

      const timeoutMs = mode === 'audio' ? 720000 : 300000; // 12-min timeout for Audio Overview, 5-min for quiz/query
      const timeout = setTimeout(() => {
        try { pyProc.kill(); } catch (e) {}
        resolve(null);
      }, timeoutMs);

      pyProc.on('close', (code) => {
        clearTimeout(timeout);
        const output = stdout.trim();
        if (output.includes('AUDIO_FILE:')) {
          const match = output.match(/AUDIO_FILE:(.+)/);
          const titleMatch = output.match(/AUDIO_TITLE:(.+)/);
          const summaryMatch = output.match(/AUDIO_SUMMARY:(.+)/);
          if (match && match[1]) {
            return resolve({
              type: 'audio',
              path: match[1].trim(),
              title: titleMatch ? titleMatch[1].trim() : '',
              summary: summaryMatch ? summaryMatch[1].trim() : ''
            });
          }
        }
        if (code === 0 && output && !output.startsWith('ERROR:')) {
          resolve(output);
        } else {
          if (output.startsWith('ERROR:')) {
            console.error(`NotebookLM Bridge Attempt ${attempt} Notice:`, output);
          }
          resolve(null);
        }
      });
    });

    if (res) return res;
    if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
  }
  return null;
}

// Helper: Dynamically resolve subject-specific NotebookLM ID
function getSubjectNotebookId(userPrompt, explicitSubId = null) {
  let subKey = explicitSubId ? String(explicitSubId).trim().toLowerCase() : null;

  if (subKey) {
    if (['si', 'sin', 'sinhala'].includes(subKey)) subKey = 'SIN';
    else if (['bc', 'buddhist', 'buddhist_civilization'].includes(subKey)) subKey = 'BC';
    else if (['hi', 'hist', 'history'].includes(subKey)) subKey = 'HIST';
    else if (['pl', 'pol', 'political'].includes(subKey)) subKey = 'PL';
    else if (['bs', 'bus', 'business'].includes(subKey)) subKey = 'BS';
    else subKey = subKey.toUpperCase();

    const envKey = `NOTEBOOK_ID_${subKey}`;
    if (process.env[envKey] && process.env[envKey].trim()) {
      return process.env[envKey].trim();
    }
  }

  // Auto-detect subject keywords from question prompt
  const promptLower = (userPrompt || '').toLowerCase();
  if (promptLower.includes('සිංහල') || promptLower.includes('සන්ධි') || promptLower.includes('සමාස') || promptLower.includes('කාව්‍ය') || promptLower.includes('ව්‍යාකරණ')) {
    if (process.env.NOTEBOOK_ID_SIN && process.env.NOTEBOOK_ID_SIN.trim()) return process.env.NOTEBOOK_ID_SIN.trim();
  }
  if (promptLower.includes('දේශපාලන') || promptLower.includes('ආණ්ඩුක්‍රම') || promptLower.includes('ජනමාධ්‍ය') || promptLower.includes('පාලන')) {
    if (process.env.NOTEBOOK_ID_PL && process.env.NOTEBOOK_ID_PL.trim()) return process.env.NOTEBOOK_ID_PL.trim();
  }
  if (promptLower.includes('ඉතිහාසය') || promptLower.includes('ලංකා ඉතිහාස') || promptLower.includes('යුගය')) {
    if (process.env.NOTEBOOK_ID_HIST && process.env.NOTEBOOK_ID_HIST.trim()) return process.env.NOTEBOOK_ID_HIST.trim();
  }
  if (promptLower.includes('ව්‍යාපාර') || promptLower.includes('කළමනාකරණ') || promptLower.includes('ගිණුම්')) {
    if (process.env.NOTEBOOK_ID_BS && process.env.NOTEBOOK_ID_BS.trim()) return process.env.NOTEBOOK_ID_BS.trim();
  }
  if (promptLower.includes('බෞද්ධ') || promptLower.includes('ශිෂ්ටාචාරය') || promptLower.includes('තෙරවාද') || promptLower.includes('මහින්දාගමනය') || promptLower.includes('නිකාය') || promptLower.includes('සංගායනා') || promptLower.includes('සංඟායනා') || promptLower.includes('ධර්ම') || promptLower.includes('බුද්ධ')) {
    if (process.env.NOTEBOOK_ID_BC && process.env.NOTEBOOK_ID_BC.trim()) return process.env.NOTEBOOK_ID_BC.trim();
  }

  return (process.env.NOTEBOOK_ID || '').trim();
}

// Helper: 100% Exclusive Google NotebookLM Engine (Groq AI & Local RAG Disabled as explicitly requested)
async function askGeminiAI(userPrompt, explicitSubId = null) {
  const notebookId = getSubjectNotebookId(userPrompt, explicitSubId);

  if (notebookId) {
    try {
      const enrichedPrompt = 
        `${userPrompt}\n\n` +
        `[උපදෙස්: මෙම මාතෘකාවට අදාළව උසස් පෙළ විභාගයට පැමිණිය හැකි ප්‍රධාන විචාර ප්‍රශ්න, තේමාත්මක කරුණු, විචාර විග්‍රහයන් සහ විභාගයේදී භාවිත කළ හැකි සියලුම ප්‍රධාන උපුටාගැනීම් (Quotes) ඇතුළත් සවිස්තරාත්මක අධ්‍යයන සටහනක් (Comprehensive Detailed Study Note) සම්පූර්ණයෙන්ම සපයන්න.]`;

      const nbReply = await askNotebookLMPython(enrichedPrompt, notebookId);
      if (nbReply && nbReply.trim()) {
        return formatAITextForTelegram(nbReply);
      }
    } catch (e) {
      console.error('NotebookLM Python query error:', e.message);
    }
  }

  return '⚠️ **A/L MCQ HUB AI එකෙන් පිළිතුරු ලබා ගැනීමට නොහැකි විය.**\n\nමොහොතකින් නැවත `/ai ඔබගේ ප්‍රශ්නය` ලෙස යොමු කරන්න.';
}

// Helper: Dynamically extract the latest og:image URL & cache-busting version directly from HTML files
function getPaperImageUrl(paperKey) {
  if (!paperKey) return `https://dmadushanka.github.io/A-L/logo.png?v=${Date.now()}`;
  const parts = paperKey.split('_');
  const subId = parts[0];
  const yearKey = parts.slice(1).join('_');
  const subData = QUIZ_DATA[subId];
  const paperData = subData?.papers[yearKey];

  if (paperData && paperData.file) {
    try {
      const htmlPath = path.resolve(process.cwd(), paperData.file);
      if (fs.existsSync(htmlPath)) {
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        const match = htmlContent.match(/<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)["']/i);
        const stats = fs.statSync(htmlPath);
        const version = Math.floor(stats.mtimeMs);

        if (match) {
          const ogImgUrl = match[1].trim();
          const imgFilename = path.basename(ogImgUrl);
          
          // Check if image file exists to get image mtime for maximum precision
          const imgPath = path.resolve(process.cwd(), imgFilename);
          let imgVersion = version;
          if (fs.existsSync(imgPath)) {
            imgVersion = Math.floor(fs.statSync(imgPath).mtimeMs);
          }

          return `https://dmadushanka.github.io/A-L/${imgFilename}?v=${imgVersion}`;
        }
      }
    } catch (err) {
      console.error(`Notice extracting og:image for ${paperKey}:`, err.message);
    }
  }

  if (paperData && paperData.img) {
    const imgPath = path.resolve(process.cwd(), paperData.img);
    let v = Date.now();
    if (fs.existsSync(imgPath)) {
      v = Math.floor(fs.statSync(imgPath).mtimeMs);
    }
    return `https://dmadushanka.github.io/A-L/${paperData.img}?v=${v}`;
  }

  return `https://dmadushanka.github.io/A-L/logo.png?v=${Date.now()}`;
}

async function publishLiveQuizAnnouncement(paperKey, paperData, targetDate, isNow, jobId = null) {
  const db = readDb();
  const allUsers = Object.keys(db.users);
  const allGroups = Object.keys(db.groups || {});
  const targetGroupUrl = process.env.GROUP_URL || 'https://t.me/+wZUSJyEncD1mYjFl';
  const targetTimeMs = targetDate.getTime();
  const sentTargets = [];
  const initialRemSec = !isNow ? Math.max(0, Math.floor((targetTimeMs - Date.now()) / 1000)) : 0;
  const initialCountdownStr = !isNow ? formatCountdownText(initialRemSec) : '';

  const imageUrl = getPaperImageUrl(paperKey);
  const timeNotice = `⏰ **ආරම්භ වන වේලාව:** ${targetDate.toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })}`;
  const announceMsg = isNow ?
    `🚀 **සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය! (Live Quiz Started)**\n\n` +
    `📚 **ප්‍රශ්න පත්‍රය:** ${paperData.title}\n\n` +
    `💡 **විශේෂතා:** Native Telegram Polls, Instant Confetti 🎉, Leaderboards & Top 3 Winner Podiums!\n\n` +
    `👇 පහත **Start Live Quiz** ක්ලික් කර දැන්ම තරඟයට එකතු වන්න:` :
    `🚀 **විශේෂ දැනුම්දීමයි — ඉදිරි සජීවී ප්‍රශ්න පත්‍ර තරඟය (Upcoming Live Quiz)**\n\n` +
    `📚 **ප්‍රශ්න පත්‍රය:** ${paperData.title}\n` +
    `${timeNotice}\n\n` +
    `⏳ **සජීවී තරඟය ආරම්භ වීමට තව:**\n` +
    `🔥 **${initialCountdownStr}**\n\n` +
    `💡 **විශේෂතා:**\n` +
    `• 🥇 🥈 🥉 ප්‍රථම ස්ථාන 3 සඳහා Winner Podiums\n` +
    `• 📊 All-Island Top 20 ලකුණු පුවරුව\n` +
    `• Real-time Timer සහ Instant Confetti 🎉\n\n` +
    `⏳ නියමිත වේලාව පැමිණි සැනින් මෙම Chat එකටම ඍජුවම Native Quiz Polls පැමිණෙනු ඇත. සූදානම්ව සිටින්න!`;

  const announceKb = isNow ? {
    inline_keyboard: [
      [{ text: '🎯 දැන්ම තරඟයට එකතු වන්න (Start Live Quiz)', callback_data: `native_${paperKey}` }]
    ]
  } : undefined;

  for (const uid of allUsers) {
    try {
      let m = null;
      try {
        m = await bot.sendPhoto(uid, imageUrl, { caption: announceMsg, parse_mode: 'Markdown', reply_markup: announceKb });
      } catch (e) {
        m = await bot.sendMessage(uid, announceMsg, { parse_mode: 'Markdown', reply_markup: announceKb });
      }
      if (m && m.message_id && !isNow) {
        sentTargets.push({ chatId: uid, messageId: m.message_id });
      }
    } catch (e) {}
  }

  for (const gid of allGroups) {
    try {
      let m = null;
      try {
        m = await bot.sendPhoto(gid, imageUrl, { caption: announceMsg, parse_mode: 'Markdown', reply_markup: announceKb });
      } catch (e) {
        m = await bot.sendMessage(gid, announceMsg, { parse_mode: 'Markdown', reply_markup: announceKb });
      }
      if (m && m.message_id && !isNow) {
        sentTargets.push({ chatId: gid, messageId: m.message_id });
      }
    } catch (e) {
      if (e.message.includes('kicked') || e.message.includes('not found') || e.message.includes('deactivated')) {
        unregisterGroup(gid);
      }
    }
  }

  if (!isNow && sentTargets.length > 0) {
    startLiveCountdownEngine(paperKey, paperData.title, targetTimeMs, sentTargets, jobId);
  }

  return { sentTargets, announceMsg };
}

// Live Countdown Engine for Scheduled Telegram Announcements (Edits live clock in-place every 2s)
function startLiveCountdownEngine(paperKey, title, targetTime, targets, jobId) {
  const timer = setInterval(async () => {
    const now = Date.now();
    const remSec = Math.max(0, Math.floor((targetTime - now) / 1000));

    if (remSec <= 0) {
      clearInterval(timer);

      if (jobId) {
        markJobSent(jobId);
      }

      const startMsg = 
        `🚀 **සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය! (Live Quiz Started)**\n\n` +
        `📚 **ප්‍රශ්න පත්‍රය:** ${title}\n\n` +
        `💡 **විශේෂතා:** Native Telegram Polls, Instant Confetti 🎉, Leaderboards & Top 3 Winner Podiums!\n\n` +
        `👇 පහත **Start Live Quiz** ක්ලික් කර දැන්ම තරඟයට එකතු වන්න:`;

      const launchKb = {
        inline_keyboard: [
          [{ text: '🎯 දැන්ම තරඟයට එකතු වන්න (Start Live Quiz)', callback_data: `native_${paperKey}` }]
        ]
      };

      for (const t of targets) {
        try {
          await bot.editMessageText(startMsg, { chat_id: t.chatId, message_id: t.messageId, parse_mode: 'Markdown', reply_markup: launchKb });
        } catch(e) {}
      }
      return;
    }

    const countdownStr = formatCountdownText(remSec);
    const updatedAnnounceMsg = 
      `🚀 **විශේෂ දැනුම්දීමයි — ඉදිරි සජීවී ප්‍රශ්න පත්‍ර තරඟය (Upcoming Live Quiz)**\n\n` +
      `📚 **ප්‍රශ්න පත්‍රය:** ${title}\n` +
      `⏰ **ආරම්භ වන වේලාව:** ${new Date(targetTime).toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}\n\n` +
      `⏳ **සජීවී තරඟය ආරම්භ වීමට තව:**\n` +
      `🔥 **${countdownStr}**\n\n` +
      `💡 **විශේෂතා:**\n` +
      `• 🥇 🥈 🥉 ප්‍රථම ස්ථාන 3 සඳහා Winner Podiums\n` +
      `• 📊 All-Island Top 20 ලකුණු පුවරුව\n` +
      `• Real-time Timer සහ Instant Confetti 🎉\n\n` +
      `⏳ නියමිත වේලාව පැමිණි සැනින් මෙම Chat එකටම ඍජුවම Native Quiz Polls පැමිණෙනු ඇත. සූදානම්ව සිටින්න!`;

    for (const t of targets) {
      try {
        await bot.editMessageText(updatedAnnounceMsg, { chat_id: t.chatId, message_id: t.messageId, parse_mode: 'Markdown' });
      } catch(e) {}
    }
  }, 2000);
}

// Helper: Generate Persistent Bottom Reply Keyboard (Floating START bar)
function getPersistentReplyKeyboard() {
  return {
    keyboard: [
      [
        { text: '🚀 ආරම්භ කරන්න (Start Quiz)' },
        { text: '🏆 ලකුණු පුවරුව (Leaderboard)' }
      ]
    ],
    resize_keyboard: true,
    persistent: true
  };
}

// Helper: Generate Keyboard for Subject Selection & Community Links (Step 1)
// Note: WebApp buttons are ONLY allowed in Private Chats, so in Group Chats we use standard URL buttons!
function getSubjectKeyboard(isGroup = false) {
  const portalButton = isGroup
    ? { text: '✨ 🚀 Open Animated Quiz Portal (සියලුම ප්‍රශ්න)', url: portalUrl }
    : { text: '✨ 🚀 Open Animated Quiz Portal (සියලුම ප්‍රශ්න)', web_app: { url: portalUrl } };

  const keyboard = [
    [portalButton],
    [{ text: '🤖 A/L MCQ HUB AI ගුරුතුමා (Ask AI Tutor)', callback_data: 'ask_ai_prompt' }],
    [{ text: QUIZ_DATA.pl.name, callback_data: 'sub_pl' }],
    [{ text: QUIZ_DATA.hist.name, callback_data: 'sub_hist' }],
    [{ text: QUIZ_DATA.bc.name, callback_data: 'sub_bc' }],
    [{ text: QUIZ_DATA.sin.name, callback_data: 'sub_sin' }],
    [{ text: QUIZ_DATA.bs.name, callback_data: 'sub_bs' }],
    [
      { text: '🏆 All-Island Leaderboard (ලකුණු පුවරුව)', callback_data: 'view_top_overall' }
    ]
  ];

  // Telegram Group & Facebook Page Row
  const communityRow = [];
  if (GROUP_URL && GROUP_URL.startsWith('http')) {
    communityRow.push({ text: '💬 Discussion Group', url: GROUP_URL });
  }
  if (FB_PAGE_URL && FB_PAGE_URL.startsWith('http')) {
    communityRow.push({ text: '📘 Facebook Page', url: FB_PAGE_URL });
  }
  if (communityRow.length > 0) {
    keyboard.push(communityRow);
  }

  // 1-Click "Add Bot to Your Group" Deep Link
  const groupAddUrl = `https://t.me/${botUsername || 'AL_MCQbot'}?startgroup=true`;
  if (groupAddUrl.startsWith('http')) {
    keyboard.push([
      { text: '➕ Add Bot to Your Group (Group එකට එකතු කරන්න)', url: groupAddUrl }
    ]);
  }

  return { inline_keyboard: keyboard };
}

// Helper: Generate Category Keyboard (Step 2)
function getCategoryKeyboard(subId) {
  const keyboard = [
    [{ text: '📑 පසුගිය ප්‍රශ්න පත්‍ර (Past Papers)', callback_data: `cat_${subId}_pp` }]
  ];

  if (subId === 'bc') {
    keyboard.push([
      { text: '📜 II පත්‍රය (Structured & Essay Marking Scheme)', callback_data: `part2_read_bc_2026_model_p2` }
    ]);
  }

  keyboard.push([
    { text: '📚 වෙනත් (Model Papers & Revision)', callback_data: `cat_${subId}_other` }
  ]);
  keyboard.push([
    { text: '⬅️ ප්‍රධාන මෙනුවට (Back to Subjects)', callback_data: 'nav_subjects' }
  ]);

  return { inline_keyboard: keyboard };
}

// Helper: Generate Year/Paper Selection Grid (Step 3)
function getYearKeyboard(subId) {
  const subData = QUIZ_DATA[subId];
  const keys = Object.keys(subData.papers);
  
  const keyboard = [];
  let row = [];

  keys.forEach((key, index) => {
    const paperObj = subData.papers[key];
    const label = paperObj.btnLabel || key;
    row.push({ text: `📝 ${label}`, callback_data: `paper_${subId}_${key}` });
    if (row.length === 2 || index === keys.length - 1) {
      keyboard.push(row);
      row = [];
    }
  });

  keyboard.push([{ text: '⬅️ ආපසු (Back)', callback_data: `sub_${subId}` }]);
  return { inline_keyboard: keyboard };
}

// Helper: Clean Markdown formatting special characters from user inputs & names
function cleanMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/[_*`\[\]()]/g, '').trim();
}

// Helper: Generate Formatted Leaderboard & Podium Text
function generateLeaderboardMessage(title, ranks) {
  if (!ranks || ranks.length === 0) {
    return (
      `🏆 **${title} — ලකුණු පුවරුව**\n\n` +
      `ℹ️ තවමත් කිසිදු පරිශීලකයෙකු මෙම ප්‍රශ්න පත්‍රය අවසන් කර නොමැත.\n` +
      `පළමු ජයග්‍රාහකයා වීමට දැන්ම ප්‍රශ්න පත්‍රය ආරම්භ කරන්න!`
    );
  }

  const medals = ['🥇', '🥈', '🥉'];
  let text = `🏆 **${title} — ජයග්‍රාහකයින් සහ ලකුණු පුවරුව**\n\n`;

  // 1. Top 3 Winners Podium
  text += `🎖️ **ජයග්‍රාහී ප්‍රථම ස්ථාන 3 (Top 3 Winners):**\n`;
  const top3 = ranks.slice(0, 3);
  top3.forEach((r, idx) => {
    const medal = medals[idx] || '🎖️';
    const cleanStudentName = cleanMarkdown(r.name);
    const cleanUserTag = r.username ? ` (@${cleanMarkdown(r.username.replace(/^@/, ''))})` : '';
    const speed = formatDuration(r.timeSec || 0);
    text += `${medal} **${idx + 1} වන ස්ථානය:** ${cleanStudentName}${cleanUserTag}\n   🎯 ලකුණු: **${r.score}** | ⏱️ කාලය: **${speed}**\n\n`;
  });

  // 2. Top 20 Ranked Table
  text += `📊 **හොඳම ක්‍රීඩකයින් 20 දෙනාගේ ලැයිස්තුව (Top 20 Table):**\n`;
  ranks.forEach((r, idx) => {
    const rankNum = idx + 1;
    const cleanStudentName = cleanMarkdown(r.name);
    const cleanUserTag = r.username ? ` (@${cleanMarkdown(r.username.replace(/^@/, ''))})` : '';
    const speed = formatDuration(r.timeSec || 0);
    text += `${rankNum}. **${cleanStudentName}**${cleanUserTag} — 🎯 **${r.score}** | ⏱️ ${speed}\n`;
  });

  return text;
}

// Helper: Send Next Native Poll Question (Continuous 20-Second Group Timer Engine)
async function sendNextGroupNativePollStep(chatId) {
  const session = userPollSessions[chatId];
  if (!session) return;

  if (session.timerId) {
    clearTimeout(session.timerId);
    session.timerId = null;
  }

  const total = session.questions.length;

  if (session.qIndex >= total) {
    const timeSec = Math.max(1, Math.round((Date.now() - session.startTime) / 1000));

    // Calculate Group Leaderboard & Winner Podium
    const userList = Object.keys(session.userScores || {}).map(uid => ({
      userId: uid,
      name: session.userScores[uid].name,
      username: session.userScores[uid].username,
      score: session.userScores[uid].score,
      totalAnswered: session.userScores[uid].totalAnswered,
      wrongList: session.userScores[uid].wrongList || []
    }));

    userList.sort((a, b) => b.score - a.score || a.wrongList.length - b.wrongList.length);

    let leaderboardText = '';
    if (userList.length > 0) {
      const topWinners = userList.slice(0, 5);
      const podiums = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      const winnerLines = topWinners.map((u, idx) => {
        const icon = podiums[idx] || `${idx + 1}.`;
        const uPct = Math.round((u.score / total) * 100);
        const cleanStudentName = cleanMarkdown(u.name);
        const cleanUserTag = u.username ? ` (@${cleanMarkdown(u.username.replace(/^@/, ''))})` : '';
        return `${icon} **${cleanStudentName}**${cleanUserTag} — ${u.score}/${total} (${uPct}%)`;
      });

      leaderboardText = 
        `\n\n🏆 **සජීවී ප්‍රශ්න පත්‍ර තරඟාවලියේ ජයග්‍රාහකයින් (Live Competition Leaderboard)** 🥇🥈🥉\n` +
        `─────────────────────────\n` +
        winnerLines.join('\n') + `\n` +
        `─────────────────────────\n` +
        `🎉 **ජයග්‍රාහකයින් සියලු දෙනාටම අපගේ උණුසුම් සුභ පැතුම්! (Congratulations!)** 👏⚡`;
    }

    const finishMessage = 
      `🏆 **${session.title} — තරඟය සාර්ථකව අවසන්!**\n\n` +
      `⏱️ **ගත වූ කාලය:** ${formatDuration(timeSec)}\n` +
      `👥 **සහභාගී වූ සිසුන් ගණන:** ${userList.length || 1}` +
      leaderboardText + `\n\n` +
      `💡 **ඔබේ පුද්ගලික ලකුණු සහ වැරදුණු ප්‍රශ්න බලන්න පහත බොත්තම ඔබන්න:**`;

    const finishKeyboard = {
      inline_keyboard: [
        [{ text: '📊 මගේ ලකුණු සහ වැරදුණු ප්‍රශ්න (My Individual Summary)', callback_data: `my_report_${session.subId}_${session.yearKey}` }],
        [{ text: '🔄 නැවත තරඟය පවත්වන්න (Retry)', callback_data: `native_${session.subId}_${session.yearKey}` }],
        [{ text: '📑 වෙනත් ප්‍රශ්න පත්‍රයක් (Select Paper)', callback_data: `cat_${session.subId}_pp` }]
      ]
    };

    let sentFinish = false;
    let finishAttempts = 0;
    while (!sentFinish && finishAttempts < 3) {
      try {
        await bot.sendMessage(chatId, finishMessage, {
          parse_mode: 'Markdown',
          reply_markup: finishKeyboard
        });
        sentFinish = true;
      } catch (e) {
        finishAttempts++;
        console.error(`Attempt ${finishAttempts} error sending finish results to ${chatId}:`, e.message);
        // Fallback: Send WITHOUT parse_mode so Telegram renders plain text guaranteed!
        try {
          const plainFinishMsg = finishMessage.replace(/[*_`]/g, '');
          await bot.sendMessage(chatId, plainFinishMsg, {
            reply_markup: finishKeyboard
          });
          sentFinish = true;
        } catch (e2) {
          console.error('Fallback finish send error:', e2.message);
        }
        if (finishAttempts < 3 && !sentFinish) await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Save individual scores to DB
    for (const u of userList) {
      recordScore(session.paperKey, {
        userId: u.userId,
        name: u.name,
        username: u.username,
        score: u.score,
        total: total,
        timeSec: timeSec,
        timestamp: new Date().toISOString()
      });
    }

    delete userPollSessions[chatId];
    return;
  }

  const q = session.questions[session.qIndex];
  const qNum = session.qIndex + 1;

  let rawQText = q.q || `ප්‍රශ්නය ${qNum}`;
  rawQText = cleanText(rawQText, 250);
  rawQText = rawQText.replace(/^\d+[\.\)\-]?\s*/, '');

  const cleanQ = cleanText(`[${qNum}/${total}] ⏳ 15s | ${rawQText}`, 290);
  const cleanOpts = (q.o || q.options || []).map(o => cleanText(o, 98));
  
  // Ensure valid correct option index bounded by options array length
  let rawCorrectIdx = (q.correct !== undefined) ? q.correct : ((q.c !== undefined) ? q.c : 0);
  if (isNaN(rawCorrectIdx)) rawCorrectIdx = 0;
  if (rawCorrectIdx >= cleanOpts.length && rawCorrectIdx === cleanOpts.length) {
    rawCorrectIdx = cleanOpts.length - 1;
  }
  const correctIdx = Math.max(0, Math.min(Number(rawCorrectIdx), cleanOpts.length - 1));

  const rawExplain = cleanText(q.e || '', 185);
  const cleanExplain = rawExplain ? `💡 ${rawExplain}` : undefined;

  let pollMsg = null;
  let attempts = 0;
  while (!pollMsg && attempts < 3) {
    try {
      pollMsg = await bot.sendPoll(chatId, cleanQ, cleanOpts, {
        type: 'quiz',
        correct_option_id: correctIdx,
        explanation: cleanExplain,
        is_anonymous: false,
        open_period: 15
      });
    } catch (err) {
      attempts++;
      console.error(`Attempt ${attempts} error sending poll Q${qNum} to ${chatId}:`, err.message);
      if (attempts < 3) await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (pollMsg && pollMsg.poll) {
    pollIdMap[pollMsg.poll.id] = {
      chatId,
      qIndex: session.qIndex,
      correctOption: correctIdx
    };
  }

  session.qIndex++;
  // Wait 17 seconds (15s open_period + 2s reveal buffer for poll answer events) before next question or finish
  session.timerId = setTimeout(() => {
    try {
      sendNextGroupNativePollStep(chatId);
    } catch (err) {
      console.error('Error in sendNextGroupNativePollStep timer:', err.message);
    }
  }, 17000);
}

// Register Poll Answer Listener for Real-Time Group Leaderboards & AI Quiz Competitions
bot.on('poll_answer', (answer) => {
  try {
    const pollId = answer.poll_id;
    const mapping = pollIdMap[pollId];
    if (!mapping) return;

    const { chatId, qIndex, correctOption } = mapping;
    const user = answer.user;
    if (!user) return;

    const selectedOpt = (answer.option_ids && answer.option_ids.length > 0) ? answer.option_ids[0] : -1;

    // Track AI Quiz Competition Scores
    const aiSession = aiQuizSessions[chatId];
    if (aiSession) {
      aiSession.totalAnswers = (aiSession.totalAnswers || 0) + 1;
      aiSession.answeredQuestions = aiSession.answeredQuestions || {};
      aiSession.answeredQuestions[user.id] = aiSession.answeredQuestions[user.id] || new Set();

      if (!aiSession.userScores[user.id]) {
        const uName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'ශිෂ්‍යයා';
        const uHandle = user.username ? `@${user.username}` : uName;
        aiSession.userScores[user.id] = { name: uName, username: uHandle, score: 0 };
      }

      // Count score ONLY ONCE per question (qIndex) per user
      if (!aiSession.answeredQuestions[user.id].has(qIndex)) {
        aiSession.answeredQuestions[user.id].add(qIndex);
        if (selectedOpt === correctOption) {
          aiSession.userScores[user.id].score++;
        }
      }
    }

    // Track Standard Scheduled/Interactive Paper Sessions
    const session = userPollSessions[chatId];
    if (session) {
      session.answeredQuestions = session.answeredQuestions || {};
      session.answeredQuestions[user.id] = session.answeredQuestions[user.id] || new Set();

      if (!session.userScores[user.id]) {
        const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'ශිෂ්‍යයා';
        const username = user.username ? `@${user.username}` : '';
        session.userScores[user.id] = {
          name,
          username,
          score: 0,
          totalAnswered: 0,
          wrongList: []
        };
      }

      // Count score ONLY ONCE per question (qIndex) per user
      if (!session.answeredQuestions[user.id].has(qIndex)) {
        session.answeredQuestions[user.id].add(qIndex);
        const student = session.userScores[user.id];
        student.totalAnswered++;
        if (selectedOpt === correctOption) {
          student.score++;
        } else {
          student.wrongList.push({
            qNum: qIndex + 1,
            userAns: selectedOpt + 1,
            correctAns: correctOption + 1
          });
        }
      }
    }
  } catch (err) {
    console.error('Error handling poll answer:', err.message);
  }
});

// Background Task: Scheduled Broadcast Engine Safety Guard (Prevents duplicate background broadcasts)
const processedJobIds = new Set();

setInterval(async () => {
  try {
    const pendingJobs = getPendingScheduledJobs();
    if (pendingJobs.length === 0) return;

    for (const job of pendingJobs) {
      if (!job.id || processedJobIds.has(job.id)) continue;
      processedJobIds.add(job.id);
      markJobSent(job.id); // Mark IMMEDIATELY in DB and memory so no second loop can ever duplicate it!

      if (job.paperKey) {
        const parts = job.paperKey.split('_');
        const subId = parts[0];
        const yearKey = parts.slice(1).join('_');
        const subData = QUIZ_DATA[subId];
        const paperData = subData?.papers[yearKey];
        if (paperData) {
          await publishLiveQuizAnnouncement(job.paperKey, paperData, new Date(job.time), true, job.id);
        }
      } else if (job.message) {
        const db = readDb();
        const allUsers = Object.keys(db.users);
        const allGroups = Object.keys(db.groups || {});
        const text = `📢 **Scheduled Broadcast**\n\n${job.message}`;
        for (const uid of allUsers) {
          await bot.sendMessage(uid, text, { parse_mode: 'Markdown' }).catch(() => {});
        }
        for (const gid of allGroups) {
          await bot.sendMessage(gid, text, { parse_mode: 'Markdown' }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('Notice in scheduled broadcast safety guard:', err.message);
  }
}, 30000);

// Middleware: Auto Register User / Group & Custom Button Text Handler
bot.on('message', async (msg) => {
  if (msg.chat) {
    if (msg.chat.type === 'private' && msg.from) {
      registerUser(msg.from);
    } else if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
      registerGroup(msg.chat);
    }
  }

  if (msg.text) {
    console.log(`📩 Incoming message in [${msg.chat.type}] (Chat ID: ${msg.chat.id}) from ${msg.from?.first_name || 'User'}: "${msg.text}"`);

    const pending = pendingCustomSchedule[msg.chat.id];
    if (pending && msg.from && isAdminUser(msg.from.id)) {
      const targetDate = parseScheduleDateTime(msg.text);
      if (!targetDate) {
        await bot.sendMessage(msg.chat.id, '❌ වැරදි ආකෘතිය. කරුණාකර `YYYY-MM-DD HH:MM` ආකෘතියෙන් නැවත එවන්න.', { parse_mode: 'Markdown' });
      } else {
        const paperKey = pending.paperKey;
        const subId = pending.subId;
        const yearKey = pending.yearKey;
        const subData = QUIZ_DATA[subId];
        const paperData = subData?.papers[yearKey];
        if (!paperData) {
          await bot.sendMessage(msg.chat.id, '❌ තෝරාගත් ප්‍රශ්න පත්‍රය හමු නොවීය.', { parse_mode: 'Markdown' });
        } else {
          const isNow = targetDate.getTime() - Date.now() < 60000;
          const newJob = !isNow ? addScheduledJob({ time: targetDate.toISOString(), message: `🎯 **${paperData.title}** සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ වී ඇත!`, paperKey }) : null;
          await bot.sendMessage(msg.chat.id, isNow ? `✅ custom time එකට quiz එක දැන් ආරම්භ කර ඇත.` : `✅ custom time එකට quiz එක schedule කර ඇත.`, { parse_mode: 'Markdown' });
          await publishLiveQuizAnnouncement(paperKey, paperData, targetDate, isNow, newJob?.id || null);
        }
      }
      delete pendingCustomSchedule[msg.chat.id];
      return;
    }

    // Handle Custom Reply Keyboard buttons
    if (msg.text.includes('🚀 ආරම්භ කරන්න') || msg.text.includes('Start Quiz')) {
      sendStartMenu(msg.chat.id, msg.from, msg.chat.type !== 'private');
    } else if (msg.text.includes('🏆 ලකුණු පුවරුව') || msg.text.includes('Leaderboard')) {
      sendLeaderboardMenu(msg.chat.id);
    }
  }
});

// Listener: Auto Welcome when Bot is added to a Telegram Group & Register Group
bot.on('new_chat_members', async (msg) => {
  try {
    if (msg.chat && (msg.chat.type === 'group' || msg.chat.type === 'supergroup')) {
      registerGroup(msg.chat);
    }

    const newMembers = msg.new_chat_members || [];
    const me = await bot.getMe().catch(() => null);
    if (!me) return;

    const addedSelf = newMembers.some(m => m.id === me.id);
    if (addedSelf) {
      const chatId = msg.chat.id;
      const groupTitle = msg.chat.title || 'Group';

      console.log(`🎉 Bot added to new Group: "${groupTitle}" (ID: ${chatId})`);

      const groupWelcome = 
        `🎉 **ආයුබෝවන් ${groupTitle}!**\n\n` +
        `අ.පො.ස. (උසස් පෙළ) MCQ Quiz Bot (@${me.username}) මෙම Group එකට සාදරයෙන් එකතු විය! 🎓\n\n` +
        `සිසුන්ට සෘජුවම Group එක තුළදීම Past Papers & Poll Quizzes කිරීමට පහත බොත්තම් හෝ **/start** command එක භාවිතා කරන්න:`;

      await bot.sendMessage(chatId, groupWelcome, {
        parse_mode: 'Markdown',
        reply_markup: getSubjectKeyboard(true)
      }).catch(e => console.error('Group welcome send error:', e.message));
    }
  } catch (err) {
    console.error('Error handling new_chat_members:', err.message);
  }
});

// Listener: Auto Unregister Group when Bot is removed/kicked
bot.on('left_chat_member', async (msg) => {
  try {
    const leftMember = msg.left_chat_member;
    const me = await bot.getMe().catch(() => null);
    if (leftMember && me && leftMember.id === me.id) {
      console.log(`ℹ️ Bot removed from Group (ID: ${msg.chat.id})`);
      unregisterGroup(msg.chat.id);
    }
  } catch (err) {}
});

// Function: Send Main Start Menu with Persistent Reply Keyboard
function sendStartMenu(chatId, fromUser, isGroup = false) {
  const firstName = fromUser ? fromUser.first_name : 'යහළුවා';

  let welcomeMessage = 
    `✨ **ආයුබෝවන් ${firstName}!**\n\n` +
    `අ.පො.ස. (උසස් පෙළ) MCQ Quiz Bot වෙත සාදරයෙන් පිළිගනිමු! 🎓\n\n` +
    `ඔබට **Native Telegram Polls (Chat එකෙන්ම)**, **Live Competition Leaderboard**, හෝ **Telegram WebApp** මගින් Quiz කිරීමට ඔබගේ විෂය (Subject) පහතින් තෝරන්න:`;

  const links = [];
  if (GROUP_URL && GROUP_URL.startsWith('http')) links.push('💬 **Discussion Group**');
  if (FB_PAGE_URL && FB_PAGE_URL.startsWith('http')) links.push('📘 **Facebook Page**');

  if (links.length > 0) {
    welcomeMessage += `\n\nඅපගේ ${links.join(' සහ ')} එක සමඟ පහත බොත්තම් මගින් එක්වන්න:`;
  }

  // 1. Send persistent floating bottom keyboard (only in private chat for clean UX)
  if (!isGroup) {
    bot.sendMessage(chatId, '👇 පහත මෙනුවෙන් ඔබගේ විෂය තෝරන්න:', {
      reply_markup: getPersistentReplyKeyboard()
    }).catch(e => {});
  }

  // 2. Send Subject Selection Inline Keyboard
  bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: getSubjectKeyboard(isGroup)
  }).catch(e => console.error('Error sending start message:', e.message));
}

// Function: Send Leaderboard Menu
function sendLeaderboardMenu(chatId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: '🏆 All-Island Overall Leaderboard', callback_data: 'view_top_overall' }],
      [{ text: '📜 ශ්‍රී ලංකා ඉතිහාසය Top 20', callback_data: 'view_top_hist' }],
      [{ text: '🏛️ දේශපාලන විද්‍යාව Top 20', callback_data: 'view_top_pl' }],
      [{ text: '☸️ බෞද්ධ ශිෂ්ටාචාරය Top 20', callback_data: 'view_top_bc' }],
      [{ text: '✍️ සිංහල Top 20', callback_data: 'view_top_sin' }]
    ]
  };

  bot.sendMessage(chatId, `🏆 **උසස් පෙළ MCQ Leaderboards & Top 20 Ranks**\n\nඔබට පරීක්ෂණය කිරීමට අවශ්‍ය ලකුණු පුවරුව තෝරන්න:`, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

// Command: /start (Supports /start, /start@AL_MCQbot, and group start)
// Helper: Safely split and send long messages exceeding Telegram's 4096 character limit
async function sendLongMessage(chatId, text, options = { parse_mode: 'Markdown' }) {
  if (!text) return;
  const MAX_LENGTH = 3800;

  if (text.length <= MAX_LENGTH) {
    try {
      return await bot.sendMessage(chatId, text, options);
    } catch (err) {
      console.error('sendLongMessage single message error:', err.message);
      const cleanMsg = text.replace(/<[^>]+>/g, '').replace(/[*_`]/g, '');
      const plainOpts = { ...options };
      delete plainOpts.parse_mode;
      return await bot.sendMessage(chatId, cleanMsg, plainOpts).catch(() => null);
    }
  }

  // Split long text into clean paragraph chunks
  const chunks = [];
  let currentChunk = '';
  const lines = text.split('\n');

  for (const line of lines) {
    if ((currentChunk + '\n' + line).length > MAX_LENGTH) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  let lastSent = null;
  const isHTML = options && options.parse_mode === 'HTML';
  for (let i = 0; i < chunks.length; i++) {
    const chunkHeader = chunks.length > 1 ? (isHTML ? `📄 <b>(කොටස ${i + 1}/${chunks.length})</b>\n\n` : `📄 **(කොටස ${i + 1}/${chunks.length})**\n\n`) : '';
    const chunkText = chunkHeader + chunks[i];
    try {
      lastSent = await bot.sendMessage(chatId, chunkText, options);
    } catch (err) {
      console.error(`sendLongMessage chunk ${i + 1} error:`, err.message);
      const cleanMsg = chunkText.replace(/<[^>]+>/g, '').replace(/[*_`]/g, '');
      const plainOpts = { ...options };
      delete plainOpts.parse_mode;
      lastSent = await bot.sendMessage(chatId, cleanMsg, plainOpts).catch(() => null);
    }
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 400));
    }
  }
  return lastSent;
}

bot.onText(/\/start/i, (msg) => {
  const isGroup = msg.chat.type !== 'private';
  sendStartMenu(msg.chat.id, msg.from, isGroup);
});

// Command: /pin_guide or /guide or /features (Pin AI Features Announcement in Group)
bot.onText(/\/(pin_guide|guide|features)(@\w+)?/i, async (msg) => {
  const chatId = msg.chat.id;
  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';

  const announcementMsg = 
    `📢 **උසස් පෙළ (A/L) සිසුන් සඳහා විශේෂ නිවේදනයයි!** 🌟\n\n` +
    `🎯 **A/L MCQ HUB — AI සජීවී නවතම මෙවලම් සහ විශේෂාංග දැන් සක්‍රීයයි!** 🚀\n\n` +
    `දැන් ඔබට ස්වයංක්‍රීයව ඔබගේ විෂය කරුණු ඇසුරෙන් **සජීවී Quiz Competitions**, **Audio Podcasts** සහ **AI ප්‍රශ්න පිළිතුරු** ක්ෂණිකව සාදාගත හැක! 🎓✨\n\n` +
    `--- \n\n` +
    `### 🧩 1. සජීවී AI Quiz Competitions (Live Polls with 20s Timers)\n` +
    `ඔබට අවශ්‍ය ඕනෑම මාතෘකාවකින් ප්‍රශ්න ගණන සටහන් කර **සජීවී තරඟයක්** ආරම්භ කරන්න:\n` +
    `• 🇱🇰 **සිංහල:** \`/quiz_si සමාස, සන්ධි 20 mcqs\`\n` +
    `• ☸️ **බෞද්ධ ශිෂ්ටාචාරය:** \`/quiz_bc සංගායනා 15 mcqs\`\n` +
    `• 🏛️ **ඉතිහාසය:** \`/quiz_hist අනුරාධපුර යුගය 20 mcqs\`\n` +
    `• ⚖️ **දේශපාලන විද්‍යාව:** \`/quiz_pl ආණ්ඩුක්‍රම ව්‍යවස්ථාව 15 mcqs\`\n` +
    `• 💼 **ව්‍යාපාර අධ්‍යයනය:** \`/quiz_bs කළමනාකරණය 20 mcqs\`\n\n` +
    `*(⏱️ සෑම ප්‍රශ්නයකටම තත්පර 20 ක කාලයක් හිමිවන අතර, තරඟය අවසානයේ ජයග්‍රාහකයින්ගේ **Leaderboard** සහ Quiz එක නිර්මාණය කළ සාමාජිකයාට **විශේෂ ස්තුතිය** පළ කෙරේ! 🏆)*\n\n` +
    `--- \n\n` +
    `### 🎙️ 2. සිංහල Audio Overview (AI Deep Dive Podcasts)\n` +
    `ඔබගේ විෂය කරුණු ඇසුරෙන් 100% සිංහල හඬින් යුත් **සවිස්තරාත්මක Audio Podcast** එකක් ලබාගන්න:\n` +
    `• 🇱🇰 \`/audio_si සිංහල ව්‍යාකරණ\`\n` +
    `• ☸️ \`/audio_bc මහින්දාගමනය\`\n` +
    `• 🏛️ \`/audio_hist ලංකා ඉතිහාසය\`\n` +
    `• ⚖️ \`/audio_pl දේශපාලන විද්‍යාව\`\n` +
    `• 💼 \`/audio_bs ව්‍යාපාර අධ්‍යයනය\`\n\n` +
    `*(🎧 හඬ පටය සෑදී අවසන් වූ වහාම සෘජුවම Audio File එකක් ලෙස ගෲප් එකටම ලැබෙනු ඇත!)*\n\n` +
    `--- \n\n` +
    `### 🤖 3. විෂයානුබද්ධ AI Tutor (Subject-Wise AI Question Answering)\n` +
    `ඔබගේ විෂය නිර්දේශයේ ඕනෑම ප්‍රශ්නයකට ක්ෂණිකව නිවැරදි විග්‍රහයන් ලබාගන්න:\n` +
    `• 🇱🇰 \`/ai_si සන්ධි සහ සමාස අතර වෙනස කුමක්ද?\` \n` +
    `• ☸️ \`/ai_bc අභයගිරි නිකාය ආරම්භ වීමට හේතු මොනවාද?\` \n` +
    `• 🏛️ \`/ai_hist පොළොන්නරු යුගයේ වාරි පද්ධතිය\` \n` +
    `• ⚖️ \`/ai_pl 1978 ආණ්ඩුක්‍රම ව්‍යවස්ථාවේ මූලික ලක්ෂණ\` \n` +
    `• 💼 \`/ai_bs අලෙවිකරණ මිශ්‍රණය යනු කුමක්ද?\` \n\n` +
    `--- \n\n` +
    `### 🎨 4. AI Diagram & Image Generator\n` +
    `ඕනෑම රූපසටහනක් හෝ ඡායාරූපයක් නොමිලේ නිර්මාණය කරගන්න:\n` +
    `• 🎨 \`/image අනුරාධපුර රුවන්වැලිසෑය\`\n` +
    `• 🎨 \`/image Political Science Parliament Diagram 4k\`\n\n` +
    `💡 **දැන්ම ඉහත Commands භාවිත කරමින් ඔබගේ උසස් පෙළ අධ්‍යයන කටයුතු තවත් පහසු කරගන්න!** 📚🔥`;

  try {
    const sentMsg = await bot.sendMessage(chatId, announcementMsg, { parse_mode: 'Markdown' });
    if (isGroup) {
      bot.pinChatMessage(chatId, sentMsg.message_id, { disable_notification: false }).catch(() => {});
    }
  } catch (e) {
    console.error('Error in /pin_guide:', e.message);
  }
});

// Helper: Start Live AI Quiz Competition with Native Telegram Polls & 20-Second Timers
async function startAIQuizCompetition(msg, chatId, userTopic, subCode = null) {
  const reqUser = msg.from || {};
  const reqName = [reqUser.first_name, reqUser.last_name].filter(Boolean).join(' ') || 'ශිෂ්‍යයා';
  const reqUsername = reqUser.username ? `@${reqUser.username}` : reqName;
  const safeReqUsername = escapeMarkdown(reqUsername);

  aiQuizSessions[chatId] = {
    creatorName: reqName,
    creatorMention: reqUsername,
    userScores: {}
  };

  // Immediate chat action typing status
  bot.sendChatAction(chatId, 'typing').catch(() => {});
  const chatActionInterval = setInterval(() => {
    bot.sendChatAction(chatId, 'typing').catch(() => {});
  }, 4000);

  const initialMsg = await safeSendMessage(
    chatId,
    `📩 **ඔබගේ Quiz ඉල්ලීම සජීවීව භාරගන්නා ලදී (Request Received)!** ⌛\n\n` +
    `🏆 **A/L MCQ HUB Live AI Quiz Competition සකස් වෙමින් පවතී...**\n\n` +
    `👤 **තරඟය ආරම්භ කළේ:** ${safeReqUsername}\n` +
    `📌 **මාතෘකාව:** ${userTopic || 'උසස් පෙළ විෂය කරුණු'}\n\n` +
    `⏳ **කරුණාකර අවධානයෙන් සිටින්න (Wait Time Notification):**\n` +
    `• ඔබ විධානය (Command) ලබා දුන් පසු A/L MCQ HUB AI විසින් ප්‍රශ්න පත්‍රය සකස් කරන තෙක් **මිනිත්තු 2 ක් හෝ 3 ක් කරුණාකර සුළු මොහොතක් රැඳී සිටින්න.** ⏱️\n` +
    `• ප්‍රශ්න සකස් වූ වහාම **සෑම ප්‍රශ්නයකටම තත්පර 20 ක කාලයක් (20s Timer)** සහිතව සජීවීව ලැබෙනු ඇත. 📝🔥`,
    { reply_to_message_id: msg.message_id }
  );

  const notebookId = getSubjectNotebookId(userTopic, subCode || 'bc') || 'cb5c3e92-b77c-4a84-9b7f-11d543a1d46c';
  console.log(`🧩 Quiz Competition requested for chat ${chatId} by ${reqUsername} (subCode=${subCode || 'auto'}): topic="${userTopic}"`);

  const resText = await askNotebookLMPython(userTopic, notebookId, 'quiz');
  clearInterval(chatActionInterval);

  if (initialMsg && initialMsg.message_id) {
    bot.deleteMessage(chatId, initialMsg.message_id).catch(() => {});
  }

  if (resText) {
    const parsedQuestions = parseQuizTextToJSON(resText);

    if (parsedQuestions && parsedQuestions.length > 0) {
      await safeSendMessage(
        chatId,
        `🏆 **A/L MCQ HUB — Live AI Quiz Competition (${parsedQuestions.length} MCQ Polls)**\n\n` +
        `👤 **නිර්මාණය කළේ:** ${safeReqUsername}\n` +
        `⏱️ **සෑම ප්‍රශ්නයකටම තත්පර 20 ක කාලයක් (20 Seconds Timer) හිමි වේ.**\n` +
        `🔥 සූදානම් වන්න! පළමු ප්‍රශ්නය දැන් සජීවීව ලැබෙනු ඇත...`
      );

      await new Promise(r => setTimeout(r, 2000));

      let consecutiveInactiveCount = 0;

      for (let i = 0; i < parsedQuestions.length; i++) {
        if (!aiQuizSessions[chatId] || aiQuizSessions[chatId].isStopped) {
          console.log(`🛑 AI Quiz Competition in chat ${chatId} was manually stopped before question ${i + 1}`);
          break;
        }

        const qObj = parsedQuestions[i];
        const cleanQ = `[Q${i + 1}/${parsedQuestions.length}] ${qObj.q}`.substring(0, 290);
        const cleanOpts = qObj.o.map(o => o.substring(0, 95));
        const correctIdx = Math.min(Math.max(0, qObj.c), cleanOpts.length - 1);
        const cleanExplain = qObj.e ? `💡 ${qObj.e.substring(0, 190)}` : undefined;

        const answersBefore = aiQuizSessions[chatId] ? (aiQuizSessions[chatId].totalAnswers || 0) : 0;

        const pollMsg = await bot.sendPoll(chatId, cleanQ, cleanOpts, {
          type: 'quiz',
          correct_option_id: correctIdx,
          explanation: cleanExplain,
          is_anonymous: false,
          open_period: 20
        }).catch(async (e) => {
          console.error(`Error sending poll Q${i + 1}:`, e.message);
          return null;
        });

        if (pollMsg && pollMsg.poll) {
          pollIdMap[pollMsg.poll.id] = {
            chatId,
            qIndex: i,
            correctOption: correctIdx
          };
        }

        // Wait 22 seconds (20s open_period + 2s reveal buffer) for ALL questions, including the final question
        await new Promise(r => setTimeout(r, 22000));

        if (!aiQuizSessions[chatId] || aiQuizSessions[chatId].isStopped) {
          console.log(`🛑 AI Quiz Competition in chat ${chatId} was manually stopped after question ${i + 1}`);
          break;
        }

        const answersAfter = aiQuizSessions[chatId] ? (aiQuizSessions[chatId].totalAnswers || 0) : 0;
        if (answersAfter === answersBefore) {
          consecutiveInactiveCount++;
        } else {
          consecutiveInactiveCount = 0; // Reset counter if at least 1 person answered
        }

        if (consecutiveInactiveCount >= 4) {
          await safeSendMessage(
            chatId,
            `🛑 **අඛණ්ඩව ප්‍රශ්න 4ක් සඳහා කිසිදු සාමාජිකයෙකු පිළිතුරු ලබා නොදුන් බැවින් Quiz Competition තරඟය ස්වයංක්‍රීයව නතර කරන ලදී (Auto-Stopped Due to Inactivity).**\n\n` +
            `💡 *නැවත තරඟයක් ආරම්භ කිරීමට \`/quiz\` හෝ \`/quiz_si\` ලෙස එවන්න.*`
          );
          break;
        }
      }

      // Allow 3 seconds extra buffer for all final poll_answer events to finish processing
      await new Promise(r => setTimeout(r, 3000));

      const aiSession = aiQuizSessions[chatId];
      if (aiSession && !aiSession.isStopped) {
        const sortedWinners = (aiSession && aiSession.userScores) ? 
          Object.values(aiSession.userScores).sort((a, b) => b.score - a.score) : [];

        let completionMsg = 
          `🏆 **A/L MCQ HUB — Live AI Quiz Competition ජයග්‍රාහකයින් (Winners Leaderboard)**\n\n`;

        if (sortedWinners.length > 0) {
          const medalIcons = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'];
          sortedWinners.forEach((w, idx) => {
            const rankTag = idx < 3 ? medalIcons[idx] : `🏅 ${idx + 1}th Place`;
            const safeWinner = escapeMarkdown(w.username || w.name);
            const safeScore = Math.min(Math.max(0, w.score), parsedQuestions.length);
            completionMsg += `${rankTag}: **${safeWinner}** — **${safeScore}/${parsedQuestions.length}** ලකුණු 🎉\n`;
          });
          completionMsg += `\n✨ ජයග්‍රහණය කළ සහ තරඟයට සාර්ථකව එක්වූ සියලුම සාමාජිකයින්ට අපගේ උණුසුම් සුබ පැතුම්! 👏🎉\n\n`;
        } else {
          completionMsg += `✨ තරඟයට එක්වූ සියලුම සාමාජිකයින්ට අපගේ උණුසුම් සුබ පැතුම්! 👏\n\n`;
        }

        completionMsg += 
          `🙏 **මෙම AI Quiz තරඟය නිර්මාණය කර දීමට මූලික වූ ${safeReqUsername} සාමාජිකයාට අපගේ විශේෂ ස්තුතිය!** ❤️\n\n` +
          `-----------------------------------------\n` +
          `💡 **නැවත ඔබ කැමති මාතෘකාවකින් Quiz එකක් ආරම්භ කිරීමට:**\n` +
          `⏳ *(විධානය ලබා දුන් පසු ප්‍රශ්න පත්‍රය සකස් වන තෙක් මිනිත්තු 2-3 ක් රැඳී සිටින්න)*\n\n` +
          `👉 **විෂය අනුව Commands භාවිත කරන ආකාරය:**\n` +
          `• 🇱🇰 **සිංහල:** \`/quiz_si සමාස, සන්ධි 20 mcqs\`\n` +
          `• ☸️ **බෞද්ධ ශිෂ්ටාචාරය:** \`/quiz_bc සංගායනා 15 mcqs\`\n` +
          `• 🏛️ **ඉතිහාසය:** \`/quiz_hist අනුරාධපුර යුගය 20 mcqs\`\n` +
          `• ⚖️ **දේශපාලන විද්‍යාව:** \`/quiz_pl ආණ්ඩුක්‍රම ව්‍යවස්ථාව 15 mcqs\`\n` +
          `• 💼 **ව්‍යාපාර අධ්‍යයනය:** \`/quiz_bs කළමනාකරණය 20 mcqs\``;

        await safeSendMessage(chatId, completionMsg);
      }
      delete aiQuizSessions[chatId];

    } else {
      // Fallback: NotebookLM returned a rich AI Study Guide instead of MCQs!
      console.log(`ℹ️ Quiz parser found 0 MCQs, delivering full AI Study Guide & PDF for chat ${chatId}`);
      const formattedReply = 
        `🤖 <b>A/L MCQ HUB AI Tutor — සවිස්තරාත්මක අධ්‍යයන සටහන:</b>\n\n` +
        `${formatAITextForTelegram(resText)}\n\n` +
        `💡 <i>තවත් ප්‍රශ්නයක් ඇසීමට <code>/ai ඔබගේ ප්‍රශ්නය</code> (හෝ <code>/ai_si</code>, <code>/ai_bc</code>) ලෙස එවන්න.</i>`;

      await sendLongMessage(chatId, formattedReply, { parse_mode: 'HTML', reply_to_message_id: msg.message_id }).catch(e => console.error('Error sending AI study note fallback:', e.message));

      // Generate & send PDF document
      bot.sendChatAction(chatId, 'upload_document').catch(() => {});
      const pdfPath = await generatePDFNote(userTopic, resText);
      if (pdfPath && fs.existsSync(pdfPath)) {
        const cleanPrompt = escapeMarkdown(userTopic || 'අධ්‍යයන සටහන');
        await bot.sendDocument(chatId, pdfPath, {
          caption: `📄 <b>A/L MCQ HUB AI Tutor — Structured PDF Study Guide</b>\n\n` +
                   `📌 <b>මාතෘකාව:</b> ${cleanPrompt}\n\n` +
                   `💡 <i>ඔබට මෙම සම්පූර්ණ අධ්‍යයන සටහන PDF ගොනුවක් ලෙස Download කර මුද්‍රණය (Print) කරගත හැක.</i>`,
          parse_mode: 'HTML',
          reply_to_message_id: msg.message_id
        }).catch(e => console.error('Error sending PDF document fallback:', e.message));
        fs.unlink(pdfPath, () => {});
      }
      delete aiQuizSessions[chatId];
    }
  } else {
    await safeSendMessage(chatId, `⚠️ **Quiz ජනනය කිරීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.**`, { reply_to_message_id: msg.message_id });
    delete aiQuizSessions[chatId];
  }
}

// Command: /stop or /stop_quiz or /stopquiz or /cancel or /end_quiz (Manually Stop Active Quiz Sessions)
bot.onText(/\/(stop|stop_quiz|stopquiz|cancel|end_quiz)(@\w+)?/i, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from || {};
  const reqName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'සාමාජිකයා';
  const reqUsername = user.username ? `@${user.username}` : reqName;
  const safeReqUsername = escapeMarkdown(reqUsername);

  let stoppedAny = false;

  // 1. Stop Active Live AI Quiz Competition
  if (aiQuizSessions[chatId]) {
    aiQuizSessions[chatId].isStopped = true;
    delete aiQuizSessions[chatId];
    stoppedAny = true;
  }

  // 2. Stop Standard Scheduled / Interactive Paper Session
  if (userPollSessions[chatId]) {
    if (userPollSessions[chatId].timerId) {
      clearTimeout(userPollSessions[chatId].timerId);
    }
    delete userPollSessions[chatId];
    stoppedAny = true;
  }

  if (stoppedAny) {
    await safeSendMessage(
      chatId,
      `🛑 **A/L MCQ HUB — Quiz Competition තරඟය සාර්ථකව නතර කරන ලදී (Quiz Stopped Successfully)!**\n\n` +
      `👤 **නතර කළේ:** ${safeReqUsername}\n\n` +
      `💡 *නැවත අලුත් තරඟයක් ආරම්භ කිරීමට \`/quiz_si\`, \`/quiz_bc\`, හෝ \`/quiz_hist\` ලෙස එවන්න.*`,
      { reply_to_message_id: msg.message_id }
    );
  } else {
    await safeSendMessage(
      chatId,
      `ℹ️ **දැනට මෙම චැට් එක තුළ සක්‍රීය Quiz තරඟයක් පවත්නේ නැත (No Active Quiz Running).**\n\n` +
      `💡 *නව තරඟයක් ආරම්භ කිරීමට \`/quiz_si\` හෝ \`/quiz_bc\` ලෙස එවන්න.*`,
      { reply_to_message_id: msg.message_id }
    );
  }
});

// Command: /ai <prompt> or /ask <prompt> or /ai_si <prompt> etc.
bot.onText(/\/(ai|ask)(?:_([a-z]+))?(@\w+)?\s*(.*)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  let subCode = match[2] ? match[2].trim().toLowerCase() : null;
  let userPrompt = match[4] ? match[4].trim() : '';

  // Support space syntax: /ai si ..., /ai sin ..., /ai bc ..., /ai hist ..., /ai pl ..., /ai bs ...
  if (!subCode && userPrompt) {
    const parts = userPrompt.split(/\s+/);
    const candidate = parts[0].toLowerCase();
    if (['si', 'sin', 'sinhala', 'bc', 'buddhist', 'hi', 'hist', 'history', 'pl', 'pol', 'bs', 'bus'].includes(candidate)) {
      subCode = candidate;
      userPrompt = parts.slice(1).join(' ');
    }
  }

  // If prompt explicitly requests MCQs/Quiz/Competition, auto-route to Quiz Competition!
  const isExplicitQuizRequest = userPrompt.match(/\b(mcq|mcqs|quiz|quez|competition|බහුවරණ|ක්විස්|තරඟය|mcq\s*ප්‍රශ්න|බහුවරණ\s*ප්‍රශ්න)\b/i) &&
                                !userPrompt.match(/\b(විචාර|සටහන|විස්තර|පැහැදිලි|උපුටාගැනීම්|රචනා|විභාග\s*ප්‍රශ්න|අධ්‍යයන)\b/i);

  if (isExplicitQuizRequest) {
    return startAIQuizCompetition(msg, chatId, userPrompt, subCode);
  }

  if (!userPrompt) {
    const usageMsg = 
      `🤖 **A/L MCQ HUB AI Tutor — භාවිත කරන ආකාරය**\n\n` +
      `ඔබට ඇති ඕනෑම උසස් පෙළ ප්‍රශ්නයක් අසන්න:\n\n` +
      `👉 **සාමාන්‍ය ආකෘතිය:** \`/ai ඔබගේ ප්‍රශ්නය\`\n` +
      `👉 **විශේෂිත විෂය සටහන් (Subject-Specific):**\n` +
      `• \`/ai_si\` හෝ \`/ai si\` — සිංහල (Sinhala)\n` +
      `• \`/ai_bc\` හෝ \`/ai bc\` — බෞද්ධ ශිෂ්ටාචාරය (Buddhist Civ)\n` +
      `• \`/ai_hist\` හෝ \`/ai hist\` — ඉතිහාසය (History)\n` +
      `• \`/ai_pl\` හෝ \`/ai pl\` — දේශපාලන විද්‍යාව (Political Science)\n` +
      `• \`/ai_bs\` හෝ \`/ai bs\` — ව්‍යාපාර අධ්‍යයනය (Business Studies)\n\n` +
      `📌 **උදාහරණ:**\n` +
      `• \`/ai_si සන්ධි යනු කුමක්ද?\` \n` +
      `• \`/ai_bc අභයගිරි නිකාය ආරම්භ වීමට හේතු මොනවාද?\` \n` +
      `• \`/ai_hist අනුරාධපුර රාජධානියේ සංවර්ධනය\``;

    return bot.sendMessage(chatId, usageMsg, { parse_mode: 'Markdown' }).catch(() => {});
  }

  console.log(`🤖 A/L MCQ HUB AI Request received from ${chatId} (subCode=${subCode || 'auto'}): "${userPrompt}"`);
  bot.sendChatAction(chatId, 'typing').catch(() => {});
  const statusMsg = await bot.sendMessage(
    chatId,
    '🤖 **A/L MCQ HUB AI විසින් පිළිතුර සූදානම් කරමින් පවතී... ⌛**',
    {
      parse_mode: 'Markdown',
      reply_to_message_id: msg.message_id
    }
  ).catch(() => null);

  try {
    const aiAnswer = await askGeminiAI(userPrompt, subCode);
    console.log(`🤖 A/L MCQ HUB AI Response obtained (${aiAnswer ? aiAnswer.length : 0} chars)`);

    if (statusMsg && statusMsg.message_id) {
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
    }

    const formattedReply = 
      `🤖 <b>A/L MCQ HUB AI Tutor පිළිතුර:</b>\n\n` +
      `${aiAnswer}\n\n` +
      `💡 <i>තවත් ප්‍රශ්නයක් ඇසීමට <code>/ai ඔබගේ ප්‍රශ්නය</code> (හෝ <code>/ai_si</code>, <code>/ai_bc</code>) ලෙස එවන්න.</i>`;

    await sendLongMessage(chatId, formattedReply, { parse_mode: 'HTML', reply_to_message_id: msg.message_id }).catch(e => console.error('Error sending AI response:', e.message));

    // Send PDF Study Guide Document as downloadable file
    bot.sendChatAction(chatId, 'upload_document').catch(() => {});
    const pdfPath = await generatePDFNote(userPrompt, aiAnswer);
    if (pdfPath && fs.existsSync(pdfPath)) {
      const cleanPrompt = escapeMarkdown(userPrompt || 'අධ්‍යයන සටහන');
      await bot.sendDocument(chatId, pdfPath, {
        caption: `📄 <b>A/L MCQ HUB AI Tutor — Structured PDF Study Guide</b>\n\n` +
                 `📌 <b>මාතෘකාව:</b> ${cleanPrompt}\n\n` +
                 `💡 <i>ඔබට මෙම සම්පූර්ණ අධ්‍යයන සටහන PDF ගොනුවක් ලෙස Download කර මුද්‍රණය (Print) කරගත හැක.</i>`,
        parse_mode: 'HTML',
        reply_to_message_id: msg.message_id
      }).catch(e => console.error('Error sending PDF document:', e.message));

      // Clean up temporary PDF file after sending
      fs.unlink(pdfPath, () => {});
    }
  } catch (err) {
    console.error('Error in /ai command execution:', err.message);
    if (statusMsg && statusMsg.message_id) {
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
    }
    bot.sendMessage(chatId, '⚠️ **පිළිතුර යැවීමේදී තාවකාලික දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.**', { reply_to_message_id: msg.message_id }).catch(() => {});
  }
});

// Command: /image <prompt> or /draw <prompt> (100% Free AI Image Generator)
bot.onText(/\/(image|draw)(@\w+)?\s*(.*)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[3] ? match[3].trim() : '';

  if (!prompt) {
    const usageMsg = 
      `🎨 **A/L MCQ HUB AI Image Generator — භාවිත කරන ආකාරය**\n\n` +
      `ඕනෑම රූපසටහනක් හෝ ඡායාරූපයක් නොමිලේ නිර්මාණය කරගන්න:\n\n` +
      `👉 **ආකෘතිය:** \`/image ඔබගේ රූපයේ විස්තරය\`\n\n` +
      `📌 **උදාහරණ:**\n` +
      `• \`/image අනුරාධපුර රුවන්වැලිසෑය\` \n` +
      `• \`/image Ancient Buddhist Temple Sri Lanka 4k\` \n` +
      `• \`/image Political Science Parliament Diagram\``;

    return bot.sendMessage(chatId, usageMsg, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id }).catch(() => {});
  }

  bot.sendChatAction(chatId, 'upload_photo').catch(() => {});
  const statusMsg = await bot.sendMessage(
    chatId,
    '🎨 **AI විසින් ඔබගේ ඡායාරූපය නිර්මාණය කරමින් පවතී... ⌛**',
    {
      parse_mode: 'Markdown',
      reply_to_message_id: msg.message_id
    }
  ).catch(() => null);

  try {
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
    
    await bot.sendPhoto(chatId, imageUrl, {
      caption: `🎨 **A/L MCQ HUB AI Image Generator**\n\n📌 **විස්තරය (Prompt):** ${prompt}\n\n💡 *තවත් ඡායාරූපයක් සාදා ගැනීමට \`/image විස්තරය\` ලෙස එවන්න.*`,
      parse_mode: 'Markdown',
      reply_to_message_id: msg.message_id
    });

    if (statusMsg && statusMsg.message_id) {
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
    }
  } catch (err) {
    console.error('Error in AI Image Gen:', err.message);
    if (statusMsg && statusMsg.message_id) {
      bot.editMessageText('❌ **ඡායාරූපය සාදා ගැනීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.**', { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: 'Markdown' }).catch(() => {});
    }
  }
});

// Command: /audio or /podcast (A/L MCQ HUB Audio Overview / Deep Dive AI Podcast Generator)
bot.onText(/\/(audio|podcast)(?:_([a-z]+))?(@\w+)?\s*(.*)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  let subCode = match[2] ? match[2].trim().toLowerCase() : null;
  let userTopic = match[4] ? match[4].trim() : '';

  const reqUser = msg.from || {};
  const reqName = [reqUser.first_name, reqUser.last_name].filter(Boolean).join(' ') || 'ශිෂ්‍යයා';
  const reqUsername = reqUser.username ? `@${reqUser.username}` : reqName;
  const safeReqUsername = escapeMarkdown(reqUsername);

  if (!subCode && userTopic) {
    const parts = userTopic.split(/\s+/);
    const candidate = parts[0].toLowerCase();
    if (['si', 'sin', 'sinhala', 'bc', 'buddhist', 'hi', 'hist', 'history', 'pl', 'pol', 'bs', 'bus'].includes(candidate)) {
      subCode = candidate;
      userTopic = parts.slice(1).join(' ');
    }
  }

  // Immediate record_audio chat action status
  bot.sendChatAction(chatId, 'record_audio').catch(() => {});
  const chatActionInterval = setInterval(() => {
    bot.sendChatAction(chatId, 'record_audio').catch(() => {});
  }, 4000);

  const initialMsg = await safeSendMessage(
    chatId,
    `📩 **ඔබගේ Audio Podcast ඉල්ලීම සජීවීව භාරගන්නා ලදී (Request Received)!** ⌛\n\n` +
    `🎙️ **A/L MCQ HUB Audio Overview (Deep Dive AI Podcast) ජනනය කිරීම ආරම්භ කර ඇත...**\n\n` +
    `👤 **ඉල්ලුම් කළේ:** ${safeReqUsername}\n` +
    `⏳ **කරුණාකර අවධානයෙන් සිටින්න (Wait Time Notification):**\n` +
    `• A/L MCQ HUB AI මඟින් ඔබගේ විෂය කරුණු ඇසුරෙන් සවිස්තරාත්මක audio podcast එකක් සකස් කරනු ලබයි.\n` +
    `• මෙම ක්‍රියාවලිය සඳහා **මිනිත්තු 3 සිට 5 දක්වා (සමහර විට මිනිත්තු 10 ක් දක්වා)** කාලයක් ගත විය හැක.\n` +
    `• හඬ පටය සෑදී අවසන් වූ වහාම එය **සෘජුවම මෙම Telegram චැට් එකට Audio File එකක් ලෙස ලැබෙනු ඇත.** 🎧\n\n` +
    `💡 *විෂය තේරීමට: \`/audio_si\` (සිංහල), \`/audio_bc\` (බෞද්ධ ශිෂ්ටාචාරය), \`/audio_hist\` (ඉතිහාසය)*`,
    { reply_to_message_id: msg.message_id }
  );

  const notebookId = getSubjectNotebookId(userTopic, subCode || 'bc') || 'cb5c3e92-b77c-4a84-9b7f-11d543a1d46c';
  console.log(`🎙️ Audio Overview requested for chat ${chatId} by ${reqUsername} (subCode=${subCode || 'auto'}): topic="${userTopic}"`);
  
  const res = await askNotebookLMPython(userTopic, notebookId, 'audio');
  clearInterval(chatActionInterval);

  if (res && res.type === 'audio' && fs.existsSync(res.path)) {
    if (initialMsg && initialMsg.message_id) {
      bot.deleteMessage(chatId, initialMsg.message_id).catch(() => {});
    }
    const stats = fs.statSync(res.path);

    let subjectName = 'උසස් පෙළ A/L Syllabus';
    const s = (subCode || '').toLowerCase();
    if (['si', 'sin', 'sinhala'].includes(s)) subjectName = 'උසස් පෙළ සිංහල (Sinhala)';
    else if (['bc', 'buddhist'].includes(s)) subjectName = 'උසස් පෙළ බෞද්ධ ශිෂ්ටාචාරය (Buddhist Civ)';
    else if (['hi', 'hist', 'history'].includes(s)) subjectName = 'උසස් පෙළ ඉතිහාසය (History)';
    else if (['pl', 'pol', 'political'].includes(s)) subjectName = 'උසස් පෙළ දේශපාලන විද්‍යාව (Political Science)';
    else if (['bs', 'bus', 'business'].includes(s)) subjectName = 'උසස් පෙළ ව්‍යාපාර අධ්‍යයනය (Business Studies)';

    const captionText = 
      `🎙️ **A/L MCQ HUB — AI Audio Overview Podcast** 🎧\n\n` +
      `📌 **මාතෘකාව (Topic):** ${userTopic || 'විෂය කරුණු විග්‍රහය'}\n` +
      `📚 **විෂය (Subject):** ${subjectName}\n` +
      `👤 **ඉල්ලුම් කළේ:** ${safeReqUsername}\n\n` +
      `💡 **විස්තරය (Description):**\n` +
      `${res.summary || 'උසස් පෙළ විෂය නිර්දේශයේ කරුණු ඇසුරෙන් 100% සිංහල හඬින් නිර්මාණය කරන ලද සවිස්තරාත්මක AI Audio Podcast එක.'}\n\n` +
      `✨ *A/L MCQ HUB AI මඟින් සජීවීව නිර්මාණය කර Telegram වෙත එවනු ලැබීය.*`;

    if (stats.size > 48 * 1024 * 1024) {
      await bot.sendDocument(chatId, res.path, { caption: captionText, parse_mode: 'Markdown', reply_to_message_id: msg.message_id }).catch(() => {});
    } else {
      await bot.sendAudio(chatId, res.path, { caption: captionText, parse_mode: 'Markdown', title: userTopic || res.title || 'A/L AI Podcast', performer: 'A/L MCQ HUB AI', reply_to_message_id: msg.message_id }).catch(async () => {
        await bot.sendDocument(chatId, res.path, { caption: captionText, parse_mode: 'Markdown', reply_to_message_id: msg.message_id }).catch(() => {});
      });
    }
  } else {
    if (initialMsg && initialMsg.message_id) {
      bot.deleteMessage(chatId, initialMsg.message_id).catch(() => {});
    }
    await safeSendMessage(
      chatId,
      `⚠️ **Audio Overview ජනනය කිරීමේදී ප්‍රමාදයක් සිදු විය.**\n\nA/L MCQ HUB හි ගොනුව සකස් වෙමින් පවතී. කරුණාකර මිනිත්තු කිහිපයකින් නැවත \`/audio\` ලෙස ලබා දෙන්න.`,
      { reply_to_message_id: msg.message_id }
    );
  }
});

// Helper: Parse Quiz Text or JSON into clean question objects for native Telegram Polls
function parseQuizTextToJSON(text) {
  const questions = [];
  if (!text) return questions;

  // Attempt 1: Direct JSON parsing
  try {
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].q && parsed[0].o) {
        return parsed.map(item => ({
          q: String(item.q || '').replace(/^[\d\.\s#]+/, '').trim(),
          o: Array.isArray(item.o) ? item.o.map(opt => String(opt).replace(/^\(\d+\)\s*/, '').trim()) : [],
          c: typeof item.c === 'number' ? Math.max(0, item.c) : 0,
          e: String(item.e || '').replace(/^(සහ හේතුව:|හේතුව:|විග්‍රහය:)\s*/i, '').trim()
        }));
      }
    }
  } catch (e) {}

  // Attempt 2: Text Markdown Parsing (e.g. ### ප්‍රශ්නය 01 ... (1) ... (2) ... (3) ... (4) ...)
  const qBlocks = text.split(/(?:###\s*ප්‍රශ්නය|\bප්‍රශ්නය\b\s*\d+)/i).filter(b => b.trim().length > 20);
  
  for (const block of qBlocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    let qText = '';
    const options = [];
    let correctIdx = 0;
    let explanation = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const optMatch = line.match(/^(?:\(\d+\)|\d+[\.\)])\s*(.+)/);
      const corrMatch = line.match(/(?:නිවැරදි පිළිතුර|සම්මත පිළිතුර|Correct Answer)\s*[:\-]?\s*(?:\(?(\d+)\)?)?\s*(.*)/i);
      const expMatch = line.match(/(?:විවරණය|විග්‍රහය|හේතුව|Explanation)\s*[:\-]?\s*(.*)/i);

      if (optMatch && options.length < 5) {
        options.push(optMatch[1].trim());
      } else if (corrMatch) {
        if (corrMatch[1]) {
          correctIdx = Math.max(0, parseInt(corrMatch[1], 10) - 1);
        }
        if (corrMatch[2] && !explanation) {
          explanation = corrMatch[2].trim();
        }
      } else if (expMatch) {
        explanation = expMatch[1].trim() || (lines[i+1] ? lines[i+1].trim() : '');
      } else if (options.length === 0 && !line.startsWith('---') && !line.startsWith('#')) {
        qText += (qText ? ' ' : '') + line;
      }
    }

    qText = qText.replace(/^[\d\.\s:#]+/, '').trim();

    if (qText && options.length >= 2) {
      questions.push({
        q: qText.substring(0, 290),
        o: options.map(opt => opt.substring(0, 95)),
        c: Math.min(correctIdx, options.length - 1),
        e: explanation.substring(0, 190)
      });
    }
  }

  return questions;
}

// Command: /quiz or /quez or /test or /competition (A/L MCQ HUB Native Telegram Quiz Polls Generator)
bot.onText(/\/(quiz|quez|test|competition)(?:_([a-z]+))?(@\w+)?\s*(.*)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  let subCode = match[2] ? match[2].trim().toLowerCase() : null;
  let userTopic = match[4] ? match[4].trim() : '';

  if (!subCode && userTopic) {
    const parts = userTopic.split(/\s+/);
    const candidate = parts[0].toLowerCase();
    if (['si', 'sin', 'sinhala', 'bc', 'buddhist', 'hi', 'hist', 'history', 'pl', 'pol', 'bs', 'bus'].includes(candidate)) {
      subCode = candidate;
      userTopic = parts.slice(1).join(' ');
    }
  }

  return startAIQuizCompetition(msg, chatId, userTopic, subCode);
});

// Listener for Voice Messages (Speech-to-Text Transcribe & Auto AI Answer)
async function handleVoiceQuestion(msg) {
  const chatId = msg.chat.id;
  const fileObj = msg.voice || msg.audio;
  if (!fileObj) return;

  const fileId = fileObj.file_id;
  const statusMsg = await bot.sendMessage(chatId, '🎙️ **ඔබගේ හඬ පණිවිඩයට සවන්දෙමින් පවතී (Listening & Transcribing)... ⌛**', { parse_mode: 'Markdown' }).catch(() => null);

  try {
    const fileLink = await bot.getFileLink(fileId);
    const audioRes = await fetch(fileLink);
    const audioArrayBuffer = await audioRes.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/ogg' });
    formData.append('file', blob, 'audio.ogg');
    formData.append('model', 'whisper-large-v3-turbo');

    const groqKey = (process.env.GROQ_API_KEY || '').trim();
    const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`
      },
      body: formData
    });

    const whisperData = await whisperRes.json();
    const transcribedText = whisperData?.text;

    if (transcribedText && transcribedText.trim()) {
      if (statusMsg && statusMsg.message_id) {
        bot.editMessageText(`🎙️ **ඔබ ඇසූ ප්‍රශ්නය (Transcribed Text):**\n\n"${transcribedText}"\n\n🤖 **A/L MCQ HUB AI විසින් පිළිතුර සූදානම් කරමින් පවතී... ⌛**`, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown'
        }).catch(() => {});
      }

      const aiAnswer = await askGeminiAI(transcribedText);
      if (statusMsg && statusMsg.message_id) {
        bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
      }
      const replyMsg = 
        `🎙️ **ඔබ ඇසූ හඬ ප්‍රශ්නය:**\n` +
        `"${transcribedText}"\n\n` +
        `🤖 **A/L MCQ HUB AI Tutor පිළිතුර:**\n\n` +
        `${aiAnswer}`;

      await sendLongMessage(chatId, replyMsg);
    } else {
      bot.sendMessage(chatId, '❌ **ඔබගේ හඬ පණිවිඩය පැහැදිලිව හඳුනා ගැනීමට නොහැකි විය. කරුණාකර නැවත පැහැදිලිව පවසන්න.**', { parse_mode: 'Markdown' }).catch(() => {});
    }
  } catch (err) {
    console.error('Error handling voice question:', err.message);
    bot.sendMessage(chatId, '❌ **හඬ පණිවිඩය තේරුම් ගැනීමේදී දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.**', { parse_mode: 'Markdown' }).catch(() => {});
  }
}

bot.on('voice', handleVoiceQuestion);
bot.on('audio', handleVoiceQuestion);

// Listener for Photo Uploads (OCR Question Extractor & Auto AI Answer)
bot.on('photo', async (msg) => {
  if (msg.caption && msg.caption.startsWith('/')) return;

  const chatId = msg.chat.id;
  const photo = msg.photo[msg.photo.length - 1];
  if (!photo) return;

  const fileId = photo.file_id;
  const statusMsg = await bot.sendMessage(chatId, '📸 **ඡායාරූපයේ ඇති ප්‍රශ්න සටහන් කියවමින් පවතී (Reading Image Text)... ⌛**', { parse_mode: 'Markdown' }).catch(() => null);

  try {
    const photoUrl = await bot.getFileLink(fileId);
    const ocrApiUrl = `https://api.ocr.space/parse/imageurl?apikey=helloworld&url=${encodeURIComponent(photoUrl)}&isOverlayRequired=false`;

    const ocrRes = await fetch(ocrApiUrl);
    const ocrData = await ocrRes.json();
    const extractedText = ocrData?.ParsedResults?.[0]?.ParsedText;

    if (extractedText && extractedText.trim().length > 3) {
      const cleanPrompt = extractedText.trim();
      
      const aiAnswer = await askGeminiAI(cleanPrompt);
      if (statusMsg && statusMsg.message_id) {
        bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
      }
      const replyMsg = 
        `📸 **ඡායාරූපයෙන් කියවූ ප්‍රශ්නය:**\n` +
        `"${cleanPrompt}"\n\n` +
        `🤖 **A/L MCQ HUB AI Tutor පිළිතුර:**\n\n` +
        `${aiAnswer}`;

      await sendLongMessage(chatId, replyMsg);
    } else {
      if (statusMsg && statusMsg.message_id) {
        bot.editMessageText(`📸 **ඡායාරූපය සාර්ථකව ලැබුණි!**\n\n💡 ඔබගේ ඡායාරූපයේ ඇති ප්‍රශ්නයට පිළිතුර ලබා ගැනීමට, ඡායාරූපය සමඟ \`/ai [ප්‍රශ්නය]\` ලෙස Caption යොදා එවන්න.`, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown'
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Error reading photo question:', err.message);
  }
});

// Command: /myid
bot.onText(/\/myid/i, (msg) => {
  const chatId = msg.chat.id;
  const fromId = msg.from ? msg.from.id : chatId;
  const name = msg.from ? [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') : 'User';

  bot.sendMessage(chatId, `👤 **${name}** ඔබගේ Telegram User ID එක:\n\n\`${fromId}\`\n\n💡 මෙම ID එක \`.env\` ගොනුවේ \`ADMIN_ID=${fromId}\` ලෙස ඇතුළත් කිරීමෙන් Admin බලතල ලබාගත හැක.`, {
    parse_mode: 'Markdown'
  });
});

// Command: /leaderboard or /top
bot.onText(/\/(leaderboard|top)/i, (msg) => {
  sendLeaderboardMenu(msg.chat.id);
});

// Command: /admin (Admin Control Dashboard)
bot.onText(/\/admin/i, (msg) => {
  const chatId = msg.chat.id;
  const fromId = msg.from ? msg.from.id : chatId;

  if (!isAdminUser(fromId)) {
    const deniedText = 
      `⛔ **ඔබට Admin බලතල නොමැත.**\n\n` +
      `👤 ඔබගේ Telegram User ID එක: \`${fromId}\`\n\n` +
      `👉 ඔබගේ නව Telegram Account එක Admin කිරීමට \`.env\` ගොනුවේ පහත පරිදි ඇතුළත් කරන්න:\n` +
      `\`ADMIN_ID=${fromId}\``;

    return bot.sendMessage(chatId, deniedText, { parse_mode: 'Markdown' });
  }

  const db = readDb();
  const totalUsers = Object.keys(db.users).length;
  const totalGroups = Object.keys(db.groups || {}).length;

  const adminText = 
    `🛡️ **Admin Control Panel — Live Quiz & Broadcast Manager**\n\n` +
    `📊 **ලියාපදිංචි සිසුන් ගණන:** ${totalUsers}\n` +
    `👥 **ලියාපදිංචි Groups ගණන:** ${totalGroups}\n\n` +
    `කරුණාකර ඔබ කිරීමට කැමති ක්‍රියාව පහතින් තෝරන්න:`;

  const adminKeyboard = {
    inline_keyboard: [
      [
        { text: '🚀 Publish Live Quiz & Schedule Time', callback_data: 'adm_sched_step1' }
      ],
      [
        { text: '📢 Instant Broadcast Message', callback_data: 'adm_broadcast_prompt' }
      ],
      [
        { text: '📊 ලියාපදිංචි සිසුන් හා Groups (Stats)', callback_data: 'adm_stats' }
      ]
    ]
  };

  bot.sendMessage(chatId, adminText, { parse_mode: 'Markdown', reply_markup: adminKeyboard });
});

// Command: /broadcast <message>
bot.onText(/\/broadcast (.+)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const fromId = msg.from ? msg.from.id : chatId;
  if (!isAdminUser(fromId)) return;

  const broadcastMsg = match[1];
  const db = readDb();
  const allUsers = Object.keys(db.users);
  const allGroups = Object.keys(db.groups || {});
  const totalTargets = allUsers.length + allGroups.length;

  await bot.sendMessage(chatId, `📢 **Broadcast ආරම්භ විය!** සිසුන් ${allUsers.length} දෙනෙකු සහ Groups ${allGroups.length} ක් වෙත යැවෙමින් පවතී...`);

  let count = 0;
  for (const targetId of [...allUsers, ...allGroups]) {
    try {
      await bot.sendMessage(targetId, `📢 **විශේෂ දැනුම්දීමයි:**\n\n${broadcastMsg}`, { parse_mode: 'Markdown' });
      count++;
    } catch (e) {
      if (e.message.includes('kicked') || e.message.includes('not found') || e.message.includes('deactivated')) {
        if (targetId.toString().startsWith('-')) unregisterGroup(targetId);
      }
    }
  }

  await bot.sendMessage(chatId, `✅ Broadcast සාර්ථකව අවසන්! සිසුන් සහ Groups **${count}/${totalTargets}** ක් වෙත පණිවිඩය ලැබුණි.`);
});

// Command: /schedule <YYYY-MM-DD HH:MM> <message>
bot.onText(/\/schedule (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) (.+)/i, (msg, match) => {
  const chatId = msg.chat.id;
  const fromId = msg.from ? msg.from.id : chatId;
  if (!isAdminUser(fromId)) return;

  const timeStr = match[1];
  const message = match[2];
  const schedDate = parseScheduleDateTime(timeStr);

  if (!schedDate) {
    return bot.sendMessage(chatId, '❌ දිනය සහ වේලාව වැරදියි. ආකෘතිය: `YYYY-MM-DD HH:MM` (උදා: `2026-07-31 20:00`)', { parse_mode: 'Markdown' });
  }

  addScheduledJob({
    time: schedDate.toISOString(),
    message: message
  });

  bot.sendMessage(chatId, `✅ පණිවිඩය සාර්ථකව Schedule කරන ලදී!\n⏰ වේලාව: **${timeStr}**\n📝 පණිවිඩය: ${message}`, { parse_mode: 'Markdown' });
});

// Command: /help
bot.onText(/\/help/i, (msg) => {
  const chatId = msg.chat.id;
  const helpText = 
    `📖 **භාවිතය පිළිබඳ උපදෙස්:**\n\n` +
    `1. **/start** command එක යවා විෂයයන් තෝරන්න.\n` +
    `2. **/leaderboard** යවා Top 3 Winners සහ Top 20 පුවරුව බලන්න.\n` +
    `3. **/myid** යවා ඔබගේ Telegram User ID එක පරීක්ෂා කරන්න.\n` +
    `4. **🎯 Native Telegram Polls**, **🚀 Open WebApp**, හෝ **🌐 Open Browser** මගින් පරීක්ෂණයට මුහුණ දෙන්න.\n\n` +
    `💡 **විශේෂාංග:**\n` +
    `• MCQ 40 සඳහා නිවැරදි විග්‍රහයන්\n` +
    `• Instant Confetti 🎉 & Explanation Tooltips\n` +
    `• 🥇 🥈 🥉 Top 3 Winner Podium & Top 20 Rankings`;

  bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

// Callback Query Handler
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;
  const fromId = query.from ? query.from.id : chatId;
  const isGroup = query.message.chat.type !== 'private';

  if (query.from) registerUser(query.from);

  try {
    if (data === 'ask_ai_prompt') {
      const text = 
        `🤖 **A/L MCQ HUB AI ගුරුතුමා (A/L MCQ HUB AI Tutor)**\n\n` +
        `ඔබට ඇති ඕනෑම උසස් පෙළ MCQ ප්‍රශ්නයක්, විෂය කරුණක්, හෝ සැකයක් සිංහලෙන් අසා පැහැදිලි කරගත හැක.\n\n` +
        `👉 **භාවිතා කරන ආකාරය:**\n` +
        `Chat එකේ **/ai ඔබගේ ප්‍රශ්නය** ලෙස ටයිප් කර එවන්න.\n\n` +
        `📌 **උදාහරණ:**\n` +
        `• \`/ai අග්ගඤ්ඤ සූත්‍රයේ දැක්වෙන මහාසම්මත රජුගේ සම්භවය පැහැදිලි කරන්න.\` \n` +
        `• \`/ai ඊශ්වර නිර්මාණවාදය යනු කුමක්ද?\` \n` +
        `• \`/ai 2024 බස්නාහිර පළාත් පත්‍රයේ 10 ප්‍රශ්නය විග්‍රහ කරන්න.\``;

      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(e => {});
      await safeAnswerCallback(query.id);
      return;
    }

    // ------------------- ADMIN LIVE QUIZ SCHEDULER WIZARD -------------------
    
    // Admin Step 1: Select Subject for Live Quiz
    if (data === 'adm_sched_step1' || data === 'adm_quiz_select' || data === 'adm_quiz_select_sch') {
      if (!isAdminUser(fromId)) {
        await safeAnswerCallback(query.id, '⛔ ඔබට මෙයට අවසර නොමැත.');
        return;
      }

      const isSch = data.includes('_sch');
      const text = `🚀 **Publish Live Quiz — ${isSch ? 'Schedule' : 'Step 1/3'}: විෂය තෝරන්න**\n\nසජීවීව පැවැත්වීමට අවශ්‍ය විෂය පහතින් තෝරන්න:`;
      const kb = {
        inline_keyboard: [
          [{ text: QUIZ_DATA.pl.name, callback_data: 'adm_sub_pl' }],
          [{ text: QUIZ_DATA.hist.name, callback_data: 'adm_sub_hist' }],
          [{ text: QUIZ_DATA.bc.name, callback_data: 'adm_sub_bc' }],
          [{ text: QUIZ_DATA.sin.name, callback_data: 'adm_sub_sin' }],
          [{ text: QUIZ_DATA.bs.name, callback_data: 'adm_sub_bs' }],
          [{ text: '⬅️ ආපසු (Admin Menu)', callback_data: 'adm_home' }]
        ]
      };

      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: kb }).catch(e => {});
      await safeAnswerCallback(query.id);
      return;
    }

    // Admin Step 2: Select Paper Year
    if (data.startsWith('adm_sub_')) {
      if (!isAdminUser(fromId)) {
        await safeAnswerCallback(query.id, '⛔ ඔබට මෙයට අවසර නොමැත.');
        return;
      }

      const subId = data.replace('adm_sub_', '');
      const subData = QUIZ_DATA[subId];

      if (subData) {
        const text = `🚀 **Publish Live Quiz — පියවර 2/3: ප්‍රශ්න පත්‍රය තෝරන්න**\n\n**විෂය:** ${subData.name}\nසජීවීව පැවැත්වීමට අවශ්‍ය වර්ෂය තෝරන්න:`;
        const keys = Object.keys(subData.papers);

        const keyboard = [];
        let row = [];
        keys.forEach((key, idx) => {
          const paperObj = subData.papers[key];
          const label = paperObj.btnLabel || key;
          row.push({ text: `📝 ${label}`, callback_data: `adm_paper_${subId}_${key}` });
          if (row.length === 2 || idx === keys.length - 1) {
            keyboard.push(row);
            row = [];
          }
        });
        keyboard.push([{ text: '⬅️ ආපසු (Back)', callback_data: 'adm_sched_step1' }]);

        await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }).catch(e => {});
      }
      await safeAnswerCallback(query.id);
      return;
    }

    // Admin Step 3: Select Schedule Time
    if (data.startsWith('adm_paper_')) {
      if (!isAdminUser(fromId)) {
        await safeAnswerCallback(query.id, '⛔ ඔබට මෙයට අවසර නොමැත.');
        return;
      }

      const parts = data.split('_');
      const subId = parts[2];
      const yearKey = parts.slice(3).join('_');

      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        const text = 
          `🚀 **Publish Live Quiz — පියවර 3/3: ආරම්භක වේලාව තෝරන්න**\n\n` +
          `🎯 **තෝරාගත් පත්‍රය:** ${paperData.title}\n\n` +
          `සිසුන්ට මෙම තරඟය ආරම්භ කිරීමට අවශ්‍ය වේලාව පහතින් තෝරන්න:`;

        const kb = {
          inline_keyboard: [
            [{ text: '⚡ දැන්ම සජීවීව ආරම්භ කරන්න (Publish & Start Now)', callback_data: `adm_pub_now_${subId}_${yearKey}` }],
            [{ text: '⏱️ මිනිත්තු 15කින් (In 15 Minutes)', callback_data: `adm_pub_15_${subId}_${yearKey}` }],
            [{ text: '⏱️ මිනිත්තු 30කින් (In 30 Minutes)', callback_data: `adm_pub_30_${subId}_${yearKey}` }],
            [{ text: '⏰ පැයකින් (In 1 Hour)', callback_data: `adm_pub_60_${subId}_${yearKey}` }],
            [{ text: '🌙 අද රාත්‍රී 8.00 ට (Tonight 8:00 PM)', callback_data: `adm_pub_tonight8_${subId}_${yearKey}` }],
            [{ text: '☀️ හෙට රාත්‍රී 8.00 ට (Tomorrow 8:00 PM)', callback_data: `adm_pub_tomorrow8_${subId}_${yearKey}` }],
            [{ text: '🗓️ Custom Date/Time', callback_data: `adm_custom_time_init_${subId}_${yearKey}` }],
            [{ text: '⬅️ ආපසු (Back)', callback_data: `adm_sub_${subId}` }]
          ]
        };

        await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: kb }).catch(e => {});
      }
      await safeAnswerCallback(query.id);
      return;
    }

    if (data.startsWith('adm_custom_time_init_')) {
      if (!isAdminUser(fromId)) {
        await safeAnswerCallback(query.id, '⛔ ඔබට මෙයට අවසර නොමැත.');
        return;
      }

      const parts = data.split('_');
      const subId = parts[4];
      const yearKey = parts.slice(5).join('_');
      const paperKey = `${subId}_${yearKey}`;

      pendingCustomSchedule[chatId] = { subId, yearKey, paperKey };
      const text = `🗓️ **Custom Time for Live Quiz**\n\nකරුණාකර පහත ආකෘතියෙන් පිළිතුරක් එවන්න:\n\n\`YYYY-MM-DD HH:MM\`\n\nඋදාහරණය: \`2026-08-01 20:30\``;

      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }).catch(e => {});
      await safeAnswerCallback(query.id);
      return;
    }

    // Admin Step 4: Finalize & Schedule Live Quiz
    if (data.startsWith('adm_pub_')) {
      if (!isAdminUser(fromId)) {
        await safeAnswerCallback(query.id, '⛔ ඔබට මෙයට අවසර නොමැත.');
        return;
      }

      const parts = data.split('_');
      const timeType = parts[2];
      const subId = parts[3];
      const yearKey = parts.slice(4).join('_');
      const paperKey = `${subId}_${yearKey}`;

      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        const targetDate = getTargetScheduleTime(timeType);
        const isNow = timeType === 'now' || (targetDate.getTime() - Date.now() < 60000);
        const dateFormatted = targetDate.toLocaleString('en-GB', { timeZone: 'Asia/Colombo' });

        // Calculate human readable countdown if in future
        let timeNotice = `⏰ **ආරම්භ වන වේලාව:** ${dateFormatted}`;
        if (!isNow) {
          const diffMins = Math.max(1, Math.round((targetDate.getTime() - Date.now()) / (60 * 1000)));
          if (diffMins > 60) {
            const hours = (diffMins / 60).toFixed(1);
            timeNotice += ` (තව පැය ${hours}කින් ආරම්භ වේ ⏳)`;
          } else {
            timeNotice += ` (තව මිනිත්තු ${diffMins}කින් ආරම්භ වේ ⏳)`;
          }
        }

        // Register Scheduled Job ONLY if it's scheduled for future
        let newJobId = null;
        if (!isNow) {
          const newJob = addScheduledJob({
            time: targetDate.toISOString(),
            message: `🎯 **${paperData.title}** සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ වී ඇත!`,
            paperKey: paperKey
          });
          if (newJob) newJobId = newJob.id;
        }

        const db = readDb();
        const allUsers = Object.keys(db.users);
        const allGroups = Object.keys(db.groups || {});

        // 1. Send Confirmation to Admin
        const confirmText = isNow ?
          `✅ **සජීවී ප්‍රශ්න පත්‍ර තරඟය සජීවීව Publish කර ආරම්භ කරන ලදී!**\n\n` +
          `📚 **ප්‍රශ්න පත්‍රය:** ${paperData.title}\n` +
          `📢 සියලුම ලියාපදිංචි සිසුන් (${allUsers.length}) සහ Groups (${allGroups.length}) වෙත තරඟය ආරම්භ කළ බවට Notification යවන ලදී.` :
          `✅ **සජීවී ප්‍රශ්න පත්‍ර තරඟය සාර්ථකව Schedule කරන ලදී!**\n\n` +
          `📚 **ප්‍රශ්න පත්‍රය:** ${paperData.title}\n` +
          `${timeNotice}\n\n` +
          `📢 සියලුම ලියාපදිංචි සිසුන් (${allUsers.length}) සහ Groups (${allGroups.length}) වෙත තරඟ දැනුම්දීම යවන ලදී.`;

        await bot.editMessageText(confirmText, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }).catch(e => {});

        await publishLiveQuizAnnouncement(paperKey, paperData, targetDate, isNow, newJobId);

        const targetGroupUrl = process.env.GROUP_URL || (typeof GROUP_URL !== 'undefined' ? GROUP_URL : 'https://t.me/+wZUSJyEncD1mYjFl');

        // 4. Send 1-Click WhatsApp Channel Post Link to Admin
        const waPostText = encodeURIComponent(
          `🎓 A/L MCQ HUB — ${isNow ? 'සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය!' : 'ඉදිරි සජීවී ප්‍රශ්න පත්‍ර තරඟය!'}\n\n` +
          `📚 ප්‍රශ්න පත්‍රය: ${paperData.title}\n` +
          `${!isNow ? timeNotice.replace(/\*/g, '') + '\n' : ''}` +
          `💡 විශේෂතා: Real-time Timer, All-Island Leaderboards & Podiums 🎉\n\n` +
          `👇 පහත ලින්ක් එක ක්ලික් කර දැන්ම තරඟයට එකතු වන්න:\n` +
          `${targetGroupUrl}`
        );

        const waShareUrl = `https://api.whatsapp.com/send?text=${waPostText}`;

        await bot.sendMessage(chatId, `📲 **WhatsApp Channel එකට 1-Click මගින් Post කරන්න:**\nපහත බොත්තම ක්ලික් කර ඔබගේ WhatsApp Channel එකට මෙම Quiz එක සෘජුවම Post කරන්න:`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🟢 WhatsApp Channel එකට Share කරන්න (1-Click Post)', url: waShareUrl }]
            ]
          }
        }).catch(e => {});
      }
      await safeAnswerCallback(query.id);
      return;
    }

    // Admin Broadcast Prompt Option
    if (data === 'adm_broadcast_prompt') {
      if (!isAdminUser(fromId)) {
        await safeAnswerCallback(query.id, '⛔ ඔබට මෙයට අවසර නොමැත.');
        return;
      }

      const text = 
        `📢 **Instant Broadcast Message**\n\n` +
        `සියලුම ලියාපදිංචි සිසුන්ට සහ Groups වලට සෘජුවම පණිවිඩයක් යැවීමට පහත පරිදි Command එක Type කර යවන්න:\n\n` +
        `👉 \`/broadcast ඔබගේ පණිවිඩය මෙතැනට\`\n\n` +
        `උදාහරණයක් ලෙස:\n` +
        `\`/broadcast අද රාත්‍රී 8.00 ට 2020 ඉතිහාසය පත්‍රය සජීවීව පැවැත්වේ.\``;

      const kb = { inline_keyboard: [[{ text: '⬅️ ආපසු (Admin Menu)', callback_data: 'adm_home' }]] };
      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: kb }).catch(e => {});
      await safeAnswerCallback(query.id);
      return;
    }

    // Admin Home Menu
    if (data === 'adm_home') {
      if (!isAdminUser(fromId)) {
        await safeAnswerCallback(query.id, '⛔ ඔබට මෙයට අවසර නොමැත.');
        return;
      }

      const db = readDb();
      const totalUsers = Object.keys(db.users).length;
      const totalGroups = Object.keys(db.groups || {}).length;

      const adminText = 
        `🛡️ **Admin Control Panel — Live Quiz & Broadcast Manager**\n\n` +
        `📊 **ලියාපදිංචි සිසුන් ගණන:** ${totalUsers}\n` +
        `👥 **ලියාපදිංචි Groups ගණන:** ${totalGroups}\n\n` +
        `කරුණාකර ඔබ කිරීමට කැමති ක්‍රියාව පහතින් තෝරන්න:`;

      const adminKeyboard = {
        inline_keyboard: [
          [{ text: '🚀 Publish Live Quiz & Schedule Time', callback_data: 'adm_sched_step1' }],
          [{ text: '📢 Instant Broadcast Message', callback_data: 'adm_broadcast_prompt' }],
          [{ text: '📊 ලියාපදිංචි සිසුන් හා Groups (Stats)', callback_data: 'adm_stats' }]
        ]
      };

      await bot.editMessageText(adminText, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: adminKeyboard }).catch(e => {});
      await safeAnswerCallback(query.id);
      return;
    }

    // Admin Stats Query
    if (data === 'adm_stats') {
      if (!isAdminUser(fromId)) {
        await safeAnswerCallback(query.id, '⛔ ඔබට මෙයට අවසර නොමැත.');
        return;
      }

      const db = readDb();
      const totalUsers = Object.keys(db.users).length;
      const totalGroups = Object.keys(db.groups || {}).length;
      const totalScoresRecorded = Object.values(db.scores).reduce((acc, curr) => acc + curr.length, 0);

      const statsText = 
        `📊 **Bot Statistics Report**\n\n` +
        `👤 **ලියාපදිංචි සිසුන් ගණන:** ${totalUsers}\n` +
        `👥 **ලියාපදිංචි Groups ගණන:** ${totalGroups}\n` +
        `📝 **අවසන් කළ ප්‍රශ්න පත්‍ර ගණන:** ${totalScoresRecorded}\n` +
        `📑 **සක්‍රීය ප්‍රශ්න පත්‍ර ගණන:** 32+`;

      const kb = { inline_keyboard: [[{ text: '⬅️ ආපසු (Admin Menu)', callback_data: 'adm_home' }]] };
      await bot.editMessageText(statsText, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: kb }).catch(e => {});
      await safeAnswerCallback(query.id);
      return;
    }

    // ------------------- USER NAVIGATION & QUIZ HANDLERS -------------------

    // 1. Back to Main Subject Selection
    if (data === 'nav_subjects') {
      const text = `🎯 **කරුණාකර ඔබගේ විෂය (Subject) තෝරන්න:**`;
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: getSubjectKeyboard(isGroup)
      }).catch(e => {});
      await safeAnswerCallback(query.id);
      return;
    }

    // 2. View Overall Leaderboard
    if (data === 'view_top_overall') {
      const overall = getOverallLeaderboard(20);
      let text = `🏆 **A/L MCQ All-Island Overall Leaderboard (Top 20)**\n\n`;

      if (overall.length === 0) {
        text += `ℹ️ තවමත් කිසිදු ලකුණු සටහනක් නොමැත.`;
      } else {
        const medals = ['🥇', '🥈', '🥉'];
        text += `🎖️ **Top 3 Overall Champions:**\n`;
        overall.slice(0, 3).forEach((r, idx) => {
          const userTag = r.username ? ` (${r.username})` : '';
          text += `${medals[idx]} **${r.name}**${userTag} — 🎯 ලකුණු: **${r.totalScore}** (ප්‍රශ්න පත්‍ර ${r.papersDone}යි)\n`;
        });

        text += `\n📊 **Top 20 Full Ranking Table:**\n`;
        overall.forEach((r, idx) => {
          const userTag = r.username ? ` (${r.username})` : '';
          text += `${idx + 1}. **${r.name}**${userTag} — 🎯 **${r.totalScore}** marks (${formatDuration(r.totalTimeSec)})\n`;
        });
      }

      const backKb = { inline_keyboard: [[{ text: '⬅️ ආපසු (Back)', callback_data: 'nav_subjects' }]] };
      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: backKb }).catch(e => {});
      await safeAnswerCallback(query.id);
      return;
    }

    // 3. Subject Selected -> Show Category Menu
    if (data.startsWith('sub_')) {
      const subId = data.replace('sub_', '');
      const subData = QUIZ_DATA[subId];

      if (subData) {
        const text = 
          `📘 **තෝරාගත් විෂය:** ${subData.name}\n\n` +
          `කරුණාකර ඔබ සෙවීමට කැමති කාණ්ඩය තෝරන්න:`;

        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: getCategoryKeyboard(subId)
        }).catch(e => {});
      }
      await safeAnswerCallback(query.id);
      return;
    }

    // 4. Category Selected -> Past Papers (Show Year Grid)
    if (data.startsWith('cat_') && data.endsWith('_pp')) {
      const subId = data.replace('cat_', '').replace('_pp', '');
      const subData = QUIZ_DATA[subId];

      if (subData) {
        const text = 
          `📑 **${subData.shortName} — පසුගිය ප්‍රශ්න පත්‍ර**\n\n` +
          `ඔබ පරීක්ෂණය කිරීමට කැමති **වර්ෂය (Year)** තෝරන්න:`;

        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: getYearKeyboard(subId)
        }).catch(e => {});
      }
      await safeAnswerCallback(query.id);
      return;
    }

    // 5. Category Selected -> Other (Model Papers & Info)
    if (data.startsWith('cat_') && data.endsWith('_other')) {
      const subId = data.replace('cat_', '').replace('_other', '');
      const subData = QUIZ_DATA[subId];

      if (subData) {
        const text = 
          `📚 **${subData.shortName} — වෙනත් ප්‍රශ්න පත්‍ර හා පුනරීක්ෂණ**\n\n` +
          `ℹ️ ළඟදීම අලුත් ආදර්ශ ප්‍රශ්න පත්‍ර (Model Papers) සහ ඒකක අනුව සැකසූ MCQ ප්‍රශ්න එකතු කරනු ලැබේ.\n\n` +
          `වත්මන් පසුගිය ප්‍රශ්න පත්‍ර සිදු කිරීමට පහත බොත්තම ක්ලික් කරන්න:`;

        const keyboard = {
          inline_keyboard: [
            [{ text: '📑 පසුගිය ප්‍රශ්න පත්‍ර (Past Papers)', callback_data: `cat_${subId}_pp` }],
            [{ text: '⬅️ ආපසු (Back)', callback_data: `sub_${subId}` }]
          ]
        };

        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        }).catch(e => {});
      }
      await safeAnswerCallback(query.id);
      return;
    }

    // 6. Paper Selected -> Display Rich Launch Card
    if (data.startsWith('paper_')) {
      const parts = data.split('_');
      const subId = parts[1];
      const yearKey = parts.slice(2).join('_');

      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        const quizUrl = `${BASE_URL}/${paperData.file}`;
        const imgUrl = `${BASE_URL}/${paperData.img}`;

        const paperKey = `${subId}_${yearKey}`;
        const ranks = getLeaderboard(paperKey, 3);
        let top3Summary = '';
        if (ranks.length > 0) {
          top3Summary = `\n🏆 **Top Leader:** 🥇 ${ranks[0].name} (${ranks[0].score}/40 — ${formatDuration(ranks[0].timeSec)})\n`;
        }

        const cardCaption = 
          `🎯 **${paperData.title}**\n\n` +
          `📚 **විෂය:** ${subData.name}\n` +
          `💡 **විශේෂාංග:** Instant Confetti 🎉, Leaderboards & Top 3 Winner Podiums.\n` +
          `${top3Summary}\n` +
          `👇 ඔබ පරීක්ෂණය කිරීමට කැමති ක්‍රමය තෝරන්න:`;

        const webAppOption = isGroup
          ? { text: '🚀 Open Interactive WebApp (App එක තුළින්)', url: quizUrl }
          : { text: '🚀 Open Interactive WebApp (App එක තුළින්)', web_app: { url: quizUrl } };

        const launchKeyboard = {
          inline_keyboard: [
            [
              { text: '🎯 Native Telegram Polls (Chat එකෙන්ම)', callback_data: `native_${subId}_${yearKey}` }
            ],
            [
              { text: '🏆 ලකුණු පුවරුව (View Leaderboard)', callback_data: `lb_${subId}_${yearKey}` }
            ],
            [
              webAppOption
            ],
            [
              { text: '🌐 Open Browser (Browser එකෙන්)', url: quizUrl }
            ],
            [
              { text: '🔄 වෙනත් වර්ෂයක් (Select Year)', callback_data: `cat_${subId}_pp` }
            ]
          ]
        };

        try {
          await bot.sendPhoto(chatId, imgUrl, {
            caption: cardCaption,
            parse_mode: 'Markdown',
            reply_markup: launchKeyboard
          });
        } catch (photoErr) {
          console.error('Error sending photo, falling back to sendMessage:', photoErr.message);
          await bot.sendMessage(chatId, cardCaption, {
            parse_mode: 'Markdown',
            reply_markup: launchKeyboard
          }).catch(e => console.error('Error sending fallback message:', e.message));
        }
      } else {
        console.error(`Paper data not found for subId: ${subId}, yearKey: ${yearKey}`);
      }

      await safeAnswerCallback(query.id);
      return;
    }

    // 7. View Specific Paper Leaderboard
    if (data.startsWith('lb_')) {
      const parts = data.split('_');
      const subId = parts[1];
      const yearKey = parts.slice(2).join('_');
      const paperKey = `${subId}_${yearKey}`;

      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      const ranks = getLeaderboard(paperKey, 20);
      const text = generateLeaderboardMessage(paperData ? paperData.title : 'ප්‍රශ්න පත්‍රය', ranks);

      const backKb = { inline_keyboard: [[{ text: '⬅️ ආපසු (Back)', callback_data: `paper_${subId}_${yearKey}` }]] };
      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: backKb }).catch(e => {});
      await safeAnswerCallback(query.id);
      return;
    }

    // 8. Native Quiz Mode Selected -> Start Native Telegram Poll Session
    if (data.startsWith('native_')) {
      const parts = data.split('_');
      const subId = parts[1];
      const yearKey = parts.slice(2).join('_');
      const paperKey = `${subId}_${yearKey}`;

      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        const qList = loadQuestionsFromHtml(paperData.file);

        if (!qList || qList.length === 0) {
          await bot.sendMessage(chatId, '❌ ප්‍රශ්න පත්‍රයේ ප්‍රශ්න පූරණය කිරීමට නොහැකි විය.').catch(e => {});
          await safeAnswerCallback(query.id);
          return;
        }

        const userName = query.from ? [query.from.first_name, query.from.last_name].filter(Boolean).join(' ') : 'ශිෂ්‍යයා';
        const userUsername = query.from?.username ? `@${query.from.username}` : '';

        // Initialize User Poll Session with Start Time & Live Timer
        userPollSessions[chatId] = {
          subId,
          yearKey,
          paperKey,
          title: paperData.title,
          questions: qList,
          qIndex: 0,
          score: 0,
          timerId: null,
          userScores: {},
          userName,
          userUsername,
          startTime: Date.now()
        };

        await bot.sendMessage(chatId, `🏁 **${paperData.title}** Native Telegram Quiz ආරම්භ විය!\nපළමු ප්‍රශ්නය පහත දැක්වේ 👇`, {
          parse_mode: 'Markdown'
        }).catch(e => {});

        // Send first poll & start continuous 20s step streamer
        sendNextGroupNativePollStep(chatId);
      }

      await safeAnswerCallback(query.id);
      return;
    }

    // 9. Individual Summary Report Query Handler
    if (data.startsWith('my_report_')) {
      const fromUser = query.from;
      let userRecord = null;

      for (const sessionKey in userPollSessions) {
        const session = userPollSessions[sessionKey];
        if (session && session.userScores && session.userScores[fromUser.id]) {
          userRecord = session.userScores[fromUser.id];
          break;
        }
      }

      if (!userRecord) {
        await safeAnswerCallback(query.id, 'ℹ️ මෙම තරඟය සඳහා ඔබගේ ලකුණු සටහනක් හමු නොවුණි.');
        return;
      }

      const totalAns = userRecord.totalAnswered || 1;
      const userScore = userRecord.score || 0;
      const wrongList = userRecord.wrongList || [];

      let wrongText = '';
      if (wrongList.length === 0) {
        wrongText = '🎉 ඔබ සියලුම ප්‍රශ්නවලට 100% නිවැරදි පිළිතුරු සපයා ඇත! (No Errors!)';
      } else {
        const wrongLines = wrongList.slice(0, 10).map(w => `• Q${w.qNum < 10 ? '0' + w.qNum : w.qNum}: ඔබ දුන් පිළිතුර (${w.userAns}) ❌ | නිවැරදි පිළිතුර (${w.correctAns}) ✅`);
        wrongText = `❌ ඔබට වැරදුණු ප්‍රශ්න (${wrongList.length}):\n` + wrongLines.join('\n');
      }

      const personalReport = 
        `📊 ඔබගේ පුද්ගලික ලකුණු සටහන (My Quiz Summary)\n` +
        `👤 නම: ${userRecord.name}\n` +
        `🎯 ලබාගත් ලකුණු: ${userScore} / ${totalAns} (${Math.round((userScore / totalAns) * 100)}%)\n\n` +
        wrongText;

      await bot.answerCallbackQuery(query.id, {
        text: personalReport,
        show_alert: true
      }).catch(e => {});
      return;
    }

  } catch (err) {
    console.error('Error handling callback query:', err);
    await safeAnswerCallback(query.id, 'දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.');
  }
});

console.log('✅ Telegram Bot Ready! Listening for messages, poll answers & leaderboards...');
