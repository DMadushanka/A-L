import nodeCrypto from 'crypto';

// Polyfill global crypto.getRandomValues for pkg / packaged Node environments
if (typeof globalThis.crypto === 'undefined') {
  try {
    globalThis.crypto = nodeCrypto.webcrypto || nodeCrypto;
  } catch (e) {
    globalThis.crypto = nodeCrypto;
  }
}
if (typeof globalThis.crypto.getRandomValues !== 'function') {
  globalThis.crypto.getRandomValues = function getRandomValues(buffer) {
    return nodeCrypto.randomFillSync(buffer);
  };
}

import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';

const _scriptDir = (typeof __dirname !== 'undefined' && __dirname) ? __dirname : process.cwd();
import {
  registerUser,
  registerGroup,
  unregisterGroup,
  setTopicSubjectForThread,
  getTopicSubjectForThread,
  recordScore,
  getLeaderboard,
  getOverallLeaderboard,
  addScheduledJob,
  getPendingScheduledJobs,
  markJobSent,
  readDb,
  getMorningSettings,
  updateMorningSettings,
  getNextMorningPhrase,
  getCuratedMorningWallpaper,
  getQuizScheduleSettings,
  updateQuizScheduleSettings,
  isQuizScheduleTriggered,
  recordQuizScheduleTrigger,
  DEFAULT_QUIZ_SCHEDULE
} from './db.js';
import { createMorningWishFile } from './generate_morning_svg.js';
import { parseScheduleDateTime } from './schedule-utils.js';
import { extractMermaidDiagrams, generateMermaidPakoUrl, renderHighResDiagramPng } from './mermaid_utils.js';
import {
  initializeNormalQuizzes,
  getSubjectData,
  getQuizByNumber,
  buildSubjectMenuMessage,
  buildSubjectQuizzesMessage
} from './normal_quiz_manager.js';
import {
  buildMapHubMessage,
  generateInChatMapQuestion,
  evaluateInChatMapAnswer,
  formatMiniAppResult
} from './map_quiz_manager.js';

// Load environment variables
dotenv.config();

const BOT_TOKEN = (process.env.BOT_TOKEN || '').trim();
const BASE_URL = (process.env.BASE_URL || 'https://dmadushanka.github.io/A-L').trim();
const ADMIN_ID = (process.env.ADMIN_ID || '').trim();
const CHANNEL_URL = (process.env.CHANNEL_URL || '').trim();
const GROUP_URL = (process.env.GROUP_URL || '').trim();
const FB_PAGE_URL = (process.env.FB_PAGE_URL || process.env.Facebook_Page || '').trim();
const WA_CHANNEL_URL = (process.env.WA_CHANNEL_URL || 'https://whatsapp.com/channel/0029VbDIx2lHwXb4rvJNIV0D').trim();

// Subject Notebook IDs with guaranteed defaults
const NOTEBOOK_ID_BC = (process.env.NOTEBOOK_ID_BC || process.env.NOTEBOOK_ID || 'cb5c3e92-b77c-4a84-9b7f-11d543a1d46c').trim();
const NOTEBOOK_ID_SIN = (process.env.NOTEBOOK_ID_SIN || process.env.NOTEBOOK_ID_SI || '73d6198b-9f59-4a2e-9c3c-593dfad82659').trim();
const NOTEBOOK_ID_PL = (process.env.NOTEBOOK_ID_PL || process.env.NOTEBOOK_ID_POL || 'fc3afbee-ff1c-4b48-95cd-691fb4aab237').trim();
const NOTEBOOK_ID_HIST = (process.env.NOTEBOOK_ID_HIST || process.env.NOTEBOOK_ID_HI || '82f1b2ea-2426-4ad1-b4b3-60bb861ed11c').trim();
const NOTEBOOK_ID_BS = (process.env.NOTEBOOK_ID_BS || process.env.NOTEBOOK_ID_BUS || '7d27a31c-ca6e-40d8-90f0-f4b01612931f').trim();
const NOTEBOOK_ID_GEO = (process.env.NOTEBOOK_ID_GEO || process.env.NOTEBOOK_ID_GEOG || '2675dd34-4763-461a-a463-e482692aa1e2').trim();
const NOTEBOOK_ID_AGRI = (process.env.NOTEBOOK_ID_AGRI || process.env.NOTEBOOK_ID_AG || '205cd5c1-c1ea-4bcb-ba6b-fe5d7682056d').trim();
const NOTEBOOK_ID_MD = (process.env.NOTEBOOK_ID_MD || process.env.NOTEBOOK_ID_MEDIA || '51b4ceba-e0f4-45e0-b78b-93081a2de2f8').trim();
const NOTEBOOK_ID_DRAMA = (process.env.NOTEBOOK_ID_DRAMA || process.env.NOTEBOOK_ID_DR || '26538c99-6466-4ae8-88ef-2c641e0084bf').trim();
const NOTEBOOK_ID_MUSIC = (process.env.NOTEBOOK_ID_MUSIC || process.env.NOTEBOOK_ID_MU || '403039d0-afdc-426a-83e7-dc724a07620d').trim();
const NOTEBOOK_ID_DANCING = (process.env.NOTEBOOK_ID_DANCING || process.env.NOTEBOOK_ID_DN || 'b84c9546-e9ff-482f-a3f4-92cad00b225d').trim();
const NOTEBOOK_ID_MORNING = (process.env.NOTEBOOK_ID_MORNING_WISHES || '36327268-9588-45a0-bde6-bde2ee7b8ee8').trim();

// Global Error Handlers to keep the bot process alive 24/7
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err?.message || err);
});

// Tiny HTTP Server (Health Check & Static Map App Web View for 24/7 Uptime)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  if (urlPath === '/map_app.html' || urlPath === '/map' || urlPath === '/sithiyam') {
    const filePath = path.resolve(_scriptDir, 'map_app.html');
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(filePath));
    }
  } else if (urlPath.startsWith('/normal_quiz/')) {
    const filePath = path.resolve(_scriptDir, urlPath.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(fs.readFileSync(filePath));
    }
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🎓 A/L MCQ Quiz Telegram Bot (@AL_MCQbot) is Running Live 24/7!');
}).listen(PORT, () => {
  console.log(`🌐 Health check & static HTTP server listening on port ${PORT}`);
});

// Initialize and partition normal 50-MCQ quizzes under brand A/L MCQ HUB
initializeNormalQuizzes();

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
  },
  agri: {
    name: '🌾 කෘෂි විද්‍යාව (Agricultural Science)',
    shortName: 'කෘෂි විද්‍යාව',
    papers: {}
  },
  geo: {
    name: '🌍 භූගෝල විද්‍යාව (Geography)',
    shortName: 'භූගෝල විද්‍යාව',
    papers: {}
  },
  md: {
    name: '📡 සන්නිවේදනය හා මාධ්‍ය අධ්‍යයනය (Media Studies)',
    shortName: 'මාධ්‍ය අධ්‍යයනය',
    papers: {}
  },
  drama: {
    name: '🎭 නාට්‍ය හා රංග කලාව (Drama & Theatre)',
    shortName: 'නාට්‍ය හා රංග කලාව',
    papers: {}
  },
  music: {
    name: '🎵 සංගීතය (Music)',
    shortName: 'සංගීතය',
    papers: {}
  },
  dancing: {
    name: '💃 නර්තනය (Dancing)',
    shortName: 'නර්තනය',
    papers: {}
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
    } catch (e) { }
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
const voiceNoteTopicMap = new Map(); // shortId -> { topic, subCode }

// Helper: Check if user has Admin privileges
function isAdminUser(userId) {
  const adminConfig = (process.env.ADMIN_ID || ADMIN_ID || '').trim();
  if (!adminConfig) return true; // If no ADMIN_ID set, default to allow
  const uid = userId ? String(userId).trim() : '';
  const adminIds = adminConfig.split(',').map(id => id.trim()).filter(Boolean);
  return adminIds.includes(uid);
}

// Helper: Enforce access control for Direct Private Messages
// Only Admin is allowed to use the Bot directly in Private Chat (DM/PM).
// Regular users can only use the bot inside the Telegram Group.
async function enforceDirectAccessControl(msg) {
  const isPrivateChat = msg && msg.chat && msg.chat.type === 'private';
  if (!isPrivateChat) {
    // In Telegram groups & supergroups, all users have 100% full access
    return true;
  }

  const userId = msg.from ? msg.from.id : msg.chat.id;
  if (isAdminUser(userId)) {
    // Admin has full direct access in private chat
    return true;
  }

  // Non-admin attempting direct chat with bot in private DM
  const groupLink = GROUP_URL || 'https://t.me/+wZUSJyEncD1mYjFl';
  const groupJoinKb = {
    inline_keyboard: [
      [{ text: '👥 A/L Telegram Group එකට එක්වන්න (Join Group)', url: groupLink }],
      [{ text: '📢 WhatsApp Channel එකට එක්වන්න', url: WA_CHANNEL_URL || 'https://whatsapp.com/channel/0029VbDIx2lHwXb4rvJNIV0D' }]
    ]
  };

  const restrictedMsg =
    `🔒 **A/L MCQ HUB — සෘජු ප්‍රවේශය සීමා කර ඇත (Direct Access Notice)**\n\n` +
    `ආයුබෝවන්! මෙම Bot සෘජුව (Private Chat / Direct Message) භාවිත කිරීම **පරිපාලකවරුන් (Admin) සඳහා පමණක්** සීමා කර ඇත.\n\n` +
    `👥 **ඔබට A/L MCQ HUB හි සියලුම පහසුකම් නොමිලේ ලබා ගැනීමට අපගේ නිල Telegram සමූහයට (Group) සම්බන්ධ වන්න:**\n` +
    `• 🤖 **AI Tutor** (ඕනෑම A/L විෂය කරුණක් විමසීම)\n` +
    `• 🧩 **Live Quiz Polls** (සජීවී MCQ තරඟ)\n` +
    `• 🎙️ **Audio Overview & Voice Notes** (හඬ පට)\n` +
    `• 📝 **Model Exam Papers & Marking Schemes**\n\n` +
    `👉 **පහත බොත්තම මඟින් අපගේ නිල Telegram සමූහයට (Group) සම්බන්ධ වී එහිදී Bot භාවිත කරන්න!** 📚✨`;

  await bot.sendMessage(msg.chat.id, restrictedMsg, {
    parse_mode: 'Markdown',
    reply_markup: groupJoinKb,
    disable_web_page_preview: true
  }).catch(() => { });

  return false;
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
async function safeAnswerCallback(queryId, text = null, showAlert = false) {
  try {
    const opts = {};
    if (text) opts.text = text;
    if (showAlert) opts.show_alert = showAlert;
    await bot.answerCallbackQuery(queryId, Object.keys(opts).length > 0 ? opts : undefined);
  } catch (err) {
    // Ignore expired callback query errors gracefully
  }
}

// Helper: Format duration in Sinhala (e.g. "මිනිත්තු 03 තත්පර 45")
function formatRemainingDurationSinhala(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins > 0 && secs > 0) {
    return `මිනිත්තු ${String(mins).padStart(2, '0')} තත්පර ${String(secs).padStart(2, '0')}`;
  } else if (mins > 0) {
    return `මිනිත්තු ${String(mins).padStart(2, '0')}`;
  } else {
    return `තත්පර ${String(secs).padStart(2, '0')}`;
  }
}

// Helper: Build text progress bar (e.g. [████████░░░░] 65%)
function buildProgressBar(percent, length = 12) {
  const p = Math.min(100, Math.max(0, Math.round(percent)));
  const filledCount = Math.round((p / 100) * length);
  const emptyCount = Math.max(0, length - filledCount);
  return `[${'█'.repeat(filledCount)}${'░'.repeat(emptyCount)}] ${p}%`;
}

// Helper: Resolve transparent sticker path for subject advertisement
function getSubjectTransparentSticker(subCode) {
  const normSub = (subCode || 'general').toLowerCase();
  const subMap = {
    'si': 'si', 'sin': 'si', 'sinhala': 'si',
    'bc': 'bc', 'buddhist': 'bc',
    'agri': 'agri', 'ag': 'agri', 'agriculture': 'agri', 'agricultural': 'agri', 'krushi': 'agri',
    'hist': 'hist', 'hi': 'hist', 'history': 'hist',
    'pl': 'pl', 'pol': 'pl', 'politics': 'pl', 'political': 'pl',
    'bs': 'bs', 'bus': 'bs', 'business': 'bs',
    'geo': 'geo', 'geog': 'geo', 'geography': 'geo'
  };
  const resolvedSub = subMap[normSub] || 'general';
  const specificPath = path.resolve(process.cwd(), `assets/stickers/transparent_sticker_${resolvedSub}.png`);
  if (fs.existsSync(specificPath)) return specificPath;
  const generalPath = path.resolve(process.cwd(), `assets/stickers/transparent_sticker_general.png`);
  if (fs.existsSync(generalPath)) return generalPath;
  return null;
}

// Helper: Start Live Progress Tracker with Real-time Countdown Status Card
async function startLiveProgressTracker({
  chatId,
  threadId = null,
  replyToMsgId = null,
  feature = 'quiz', // 'quiz' | 'ai' | 'audio' | 'paper'
  subCode = null,
  userTopic = '',
  requestedBy = 'ශිෂ්‍යයා',
  totalDurationSec = 240 // quiz=240, ai=240, audio=900, paper=300
}) {
  const replyOpts = {
    ...(replyToMsgId ? { reply_to_message_id: replyToMsgId } : {}),
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  const featureMeta = {
    quiz: { name: 'Live AI Quiz Competition', icon: '🧩' },
    ai: { name: 'A/L AI Tutor Study Guide & Notes', icon: '🤖' },
    audio: { name: 'A/L MCQ HUB AI Audio Podcast', icon: '🎙️' },
    paper: { name: 'A/L Model Exam Paper & Scheme', icon: '📝' }
  }[feature] || { name: 'A/L MCQ HUB AI Generator', icon: '⚡' };

  const subMeta = getSubjectHelpText(subCode) || { name: 'උසස් පෙළ විෂය කරුණු' };
  const startTime = Date.now();
  const cleanTopic = escapeMarkdown(userTopic || 'විෂය නිර්දේශය');
  const safeReqUser = escapeMarkdown(requestedBy || 'සාමාජිකයා');

  // Send Initial Countdown Status Card
  const initialText =
    `⏳ **${featureMeta.icon} ${featureMeta.name} සකස් වෙමින් පවතී (Generating)...**\n\n` +
    `👤 **ඉල්ලුම් කළේ:** ${safeReqUser}\n` +
    `📚 **විෂය:** ${subMeta.name} | 📌 **මාතෘකාව:** ${cleanTopic}\n\n` +
    `📊 **ප්‍රගතිය:** \`${buildProgressBar(0)}\`\n` +
    `⏱️ **ඇස්තමේන්තුගත කාලය:** **${formatRemainingDurationSinhala(totalDurationSec)}** (${Math.round(totalDurationSec / 60)}m)\n\n` +
    `💡 *A/L MCQ HUB AI පද්ධතිය හරහා සකස් වෙමින් පවතී. කරුණාකර සුළු මොහොතක් රැඳී සිටින්න...* 🔥`;

  let statusMsg = await safeSendMessage(chatId, initialText, replyOpts);

  // 3. Periodic countdown interval (ticks every 15s to update remaining time & progress)
  const intervalId = setInterval(async () => {
    try {
      if (!statusMsg || !statusMsg.message_id) return;
      const elapsedSec = (Date.now() - startTime) / 1000;
      const remainingSec = Math.max(5, totalDurationSec - elapsedSec);
      const rawPercent = Math.min(96, Math.floor((elapsedSec / totalDurationSec) * 100));

      const updatedText =
        `⏳ **${featureMeta.icon} ${featureMeta.name} සකස් වෙමින් පවතී (Generating)...**\n\n` +
        `👤 **ඉල්ලුම් කළේ:** ${safeReqUser}\n` +
        `📚 **විෂය:** ${subMeta.name} | 📌 **මාතෘකාව:** ${cleanTopic}\n\n` +
        `📊 **ප්‍රගතිය:** \`${buildProgressBar(rawPercent)}\`\n` +
        `⏱️ **ඉතිරි කාලය:** **${formatRemainingDurationSinhala(remainingSec)}** (Remaining)\n\n` +
        `💡 *A/L MCQ HUB AI පද්ධතිය හරහා සකස් වෙමින් පවතී. කරුණාකර සුළු මොහොතක් රැඳී සිටින්න...* 🔥`;

      await bot.editMessageText(updatedText, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown'
      }).catch(() => { });
    } catch (editErr) { }
  }, 15000);

  return {
    stop: async () => {
      clearInterval(intervalId);
      if (statusMsg && statusMsg.message_id) {
        await bot.deleteMessage(chatId, statusMsg.message_id).catch(() => { });
      }
    }
  };
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

// Register Bot Command Autocomplete Registry for Telegram UI (Auto-shows when user types '/')
const publicBotCommands = [
  { command: 'start', description: '🚀 ප්‍රධාන මෙනුව ආරම්භ කරන්න (Main Menu & Quiz Hub)' },
  { command: 'map', description: '🗺️ Map Marking Hub (සිතියම් සලකුණු කිරීමේ පුහුණුව)' },
  { command: 'ai', description: '🤖 AI Tutor & Study Notes (විෂය කරුණු / සටහන් ලබාගැනීම)' },
  { command: 'quiz', description: '🧩 Live MCQ Quiz (සජීවී MCQ ප්‍රශ්නාවලි තරඟය)' },
  { command: 'paper', description: '📝 Model Exam Papers (ආදර්ශ පත්‍ර & Marking Schemes)' },
  { command: 'audio', description: '🎙️ AI Audio Podcast (සවිස්තරාත්මක ශ්‍රව්‍ය පාඩම්)' },
  { command: 'voice', description: '🔊 Sinhala Voice Notes (සිංහල හඬ අධ්‍යයන සටහන්)' },
  { command: 'allnotes', description: '📚 Study Notes Library (විෂය සටහන් පුස්තකාලය)' },
  { command: 'morning', description: '🌅 Morning Motivational Card (උදෑසන සුභපැතුම්)' },
  { command: 'leaderboard', description: '🏆 All-Island Leaderboards (ලකුණු පුවරුව)' },
  { command: 'image', description: '🎨 AI Educational Diagrams (රූපසටහන් නිර්මාණය)' },
  { command: 'guide', description: '📌 Bot Features & Guide (විශේෂාංග මඟපෙන්වීම)' },
  { command: 'help', description: '📖 උපදෙස් සහ Command ලැයිස්තුව (Help & Instructions)' },
  { command: 'myid', description: '👤 ඔබගේ Telegram User ID එක (View My ID)' }
];

const adminBotCommands = [
  ...publicBotCommands,
  { command: 'admin', description: '⚙️ Admin Dashboard & Control Panel' },
  { command: 'quiz_schedule', description: '⏰ Configure Automated Quiz Schedules' },
  { command: 'morning_settings', description: '🌅 Configure Morning Wish Schedules' },
  { command: 'stop', description: '🛑 Stop Ongoing Quiz Session' }
];

// Register for default, group, private, and admin scopes so typing '/' triggers full command list
bot.setMyCommands(publicBotCommands, { scope: { type: 'default' } }).catch(() => { });
bot.setMyCommands(publicBotCommands, { scope: { type: 'all_group_chats' } }).catch(() => { });
bot.setMyCommands(publicBotCommands, { scope: { type: 'all_private_chats' } }).catch(() => { });
bot.setMyCommands(adminBotCommands, { scope: { type: 'all_chat_administrators' } }).catch(() => { });

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

  // Replace raw Mermaid diagram code blocks with a clean informative Telegram badge
  formatted = formatted.replace(/`{3,}\s*mermaid\b[\s\S]*?`{3,}/gi, '\n📊 <b>[රූප සටහන (Diagram): ඉහත ඡායාරූපය සහ පහත PDF අධ්‍යයන සටහන බලන්න]</b>\n');
  formatted = formatted.replace(/`{3,}\s*(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|quadrantChart)\b[\s\S]*?`{3,}/gi, '\n📊 <b>[රූප සටහන (Diagram): ඉහත ඡායාරූපය සහ පහත PDF අධ්‍යයන සටහන බලන්න]</b>\n');
  formatted = formatted.replace(/`{3,}[\s\S]*?(?:-->|---|==>|stateDiagram|quadrantChart|mindmap|timeline)[\s\S]*?`{3,}/gi, '\n📊 <b>[රූප සටහන (Diagram): ඉහත ඡායාරූපය සහ පහත PDF අධ්‍යයන සටහන බලන්න]</b>\n');

  // 1. Comprehensive Citation & Source Stripping (Files, Pages, Bracket Tags)
  // 1a. Strip bracketed file citations e.g. [07_Geography_Notes_Tute.pdf, p. 47], [notes.pdf, p. 12]
  formatted = formatted.replace(/\[[^\]]*?\.(?:pdf|txt|docx|doc|html|md|epub)[^\]]*?\]/gi, '');
  // 1b. Strip parenthesized file citations e.g. (07_Geography_Notes_Tute.pdf, p. 47)
  formatted = formatted.replace(/\([^\)]*?\.(?:pdf|txt|docx|doc|html|md|epub)[^\)]*?\)/gi, '');
  // 1c. Strip bracketed numeric citations e.g. [1], [1, 2], [1-3]
  formatted = formatted.replace(/\[\d+(?:\s*,\s*\d+|-?\d+)*\]/g, '');
  // 1d. Strip bracketed page references e.g. [p. 47], [pp. 47-50], [page 47], [p. 50, 51]
  formatted = formatted.replace(/\[\s*(?:p\.|pp\.|page|pages)\s*\d+[^\]]*\]/gi, '');
  // 1e. Strip parenthesized page references e.g. (p. 47), (pp. 47-50)
  formatted = formatted.replace(/\(\s*(?:p\.|pp\.|page|pages)\s*\d+[^\)]*\)/gi, '');
  // 1f. Strip explicit source tags e.g. [Source: ...], [මුලාශ්‍රය: ...], (Source: ...)
  formatted = formatted.replace(/\[\s*(?:source|සූත්‍ර|මුලාශ්‍රය|මූලාශ්‍රය|මූලාශ්‍ර|ගොනුව|පිටුව)\s*:[^\]]*\]/gi, '');
  formatted = formatted.replace(/\(\s*(?:source|සූත්‍ර|මුලාශ්‍රය|මූලාශ්‍රය|මූලාශ්‍ර|ගොනුව|පිටුව)\s*:[^\)]*\)/gi, '');
  // 1g. Strip trailing isolated page numbers e.g. ", p. 47" or ". p. 47"
  formatted = formatted.replace(/(?:,\s*|\.\s*|\s+)p\.\s*\d+(?:\s*,\s*\d+|-?\d+)*/gi, '');

  // 2. Clean raw LaTeX math arrow slashes (\\(\rightarrow\\), \rightarrow, \implies)
  formatted = formatted.replace(/\\\\?\(\s*\\?rightarrow\s*\\\\?\)/g, ' → ');
  formatted = formatted.replace(/\\\\?\(\s*\\?implies\s*\\\\?\)/g, ' ⇒ ');
  formatted = formatted.replace(/\\?rightarrow/g, ' → ');
  formatted = formatted.replace(/\\?implies/g, ' ⇒ ');
  formatted = formatted.replace(/\\\\?\([^\)]*\\\\?\)/g, '');
  formatted = formatted.replace(/\\\\/g, '');

  // 3. Clean up punctuation spaces left behind after citation stripping
  formatted = formatted.replace(/[ \t]{2,}/g, ' ');
  formatted = formatted.replace(/ \./g, '.');
  formatted = formatted.replace(/ ,/g, ',');
  formatted = formatted.replace(/\(\s*\)/g, '');
  formatted = formatted.replace(/\[\s*\]/g, '');

  // 4. Convert raw Markdown tables if any before HTML escaping
  formatted = formatTablesForTelegram(formatted);

  // 5. If text already has raw <b>, <i>, or entities from a prior call, unwrap them first (Idempotent protection)
  formatted = formatted.replace(/<\/?b>/gi, '**');
  formatted = formatted.replace(/<\/?i>/gi, '*');
  formatted = formatted.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

  // 6. Escape HTML special characters (&, <, >) to prevent parse crashes
  formatted = formatted.replace(/&/g, '&amp;');
  formatted = formatted.replace(/</g, '&lt;');
  formatted = formatted.replace(/>/g, '&gt;');

  // 7. Convert headers (### Header, ## Header, # Header) to styled HTML titles
  formatted = formatted.replace(/^[ \t]*#{1,4}\s*\*{0,2}(.*?)\*{0,2}\s*$/gm, (match, title) => {
    const cleanTitle = title.replace(/^[*_]+|[*_]+$/g, '').trim();
    if (!cleanTitle) return '';
    return `\n📌 <b>${cleanTitle}</b>`;
  });

  // 8. Convert double asterisks **bold** or double underscores __bold__ to <b>bold</b>
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  formatted = formatted.replace(/__(.*?)__/g, '<b>$1</b>');

  // 9. Clean up lines with raw nested asterisks "* *", "* -", "- *" into indented sub-bullets
  formatted = formatted.replace(/^[ \t]*[*•-]\s+[*•-]\s+/gm, '   ▸ ');
  formatted = formatted.replace(/^[ \t]{2,}[*•-]\s+/gm, '   ▸ ');

  // 10. Convert standard top-level list items ("* ", "- ") into clean "• "
  formatted = formatted.replace(/^[ \t]*[*•-]\s+/gm, '• ');

  // 11. Format inline examples like (උදා: ඇල්ප්ස් කඳු බැවුම්) into clean indented sub-lines
  formatted = formatted.replace(/\(උදා:\s*([^\)]+)\)/gi, '\n   👉 <b>උදා:</b> <i>$1</i>');

  // 12. Format sub-headings like "• <b>නිදසුන්:</b>" or "• <b>උදාහරණ:</b>" into indented callouts
  formatted = formatted.replace(/•\s+<b>(නිදසුන්|උදාහරණ|සටහන|විශේෂ):<\/b>/gi, '   👉 <b>$1:</b>');

  // 13. Convert remaining single asterisk *italic* (not at line start) to <i>italic</i>
  formatted = formatted.replace(/(?<!\w)\*([^\*\n]+)\*(?!\w)/g, '<i>$1</i>');

  // 14. Clean up raw horizontal rules ("---", "___", "***")
  formatted = formatted.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '──────────────');

  // 15. Safely strip conversational ending follow-up question prompts (ONLY from the last 2 lines)
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

  // 16. Remove excessive blank lines (more than 2 consecutive newlines)
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted.trim();
}

// Helper: Transliterate Sinhala text to clean, readable Singlish / Latin alphanumeric characters
function transliterateSinhalaToSinglish(text) {
  if (!text) return '';
  let str = String(text).trim();

  // Strip command prefixes like /ai, /ai_si, /paper_si, /quiz_si, /audio etc.
  str = str.replace(/^\/(ai|paper|quiz|audio)(?:_[a-z]+)?\s*/i, '');
  str = str.replace(/^(\d{1,2})[\.\)\-]\s*/, ''); // Strip leading item numbering like "01. " but preserve years like "2024"

  // Common education terms translation / mapping for instant clear names
  const commonMap = [
    [/ප්‍රශ්න\s*පත්‍රය/gi, 'Exam_Paper'],
    [/ප්‍රශ්න\s*පත්‍ර/gi, 'Exam_Paper'],
    [/පසුගිය\s*ප්‍රශ්න\s*පත්‍රය/gi, 'Past_Paper'],
    [/පසුගිය\s*ප්‍රශ්න/gi, 'Past_Paper'],
    [/පසුගිය/gi, 'Past'],
    [/ආදර්ශ\s*ප්‍රශ්න\s*පත්‍රය/gi, 'Model_Paper'],
    [/ආදර්ශ\s*ප්‍රශ්න/gi, 'Model_Paper'],
    [/ආදර්ශ/gi, 'Model'],
    [/අධ්‍යයන\s*සටහන/gi, 'Study_Note'],
    [/කෙටි\s*සටහන/gi, 'Short_Note'],
    [/සටහන/gi, 'Note'],
    [/ලකුණු\s*දීමේ\s*පටිපාටිය/gi, 'Marking_Scheme'],
    [/ව්‍යුහගත/gi, 'Structured'],
    [/රචනා/gi, 'Essay'],
    [/බහුවරණ/gi, 'MCQs'],
    [/ශ්‍රී\s*ලංකා(?:වේ)?/gi, 'Sri_Lanka'],
    [/බෞද්ධ\s*ශිෂ්ටාචාරය/gi, 'Buddhist_Civ'],
    [/දේශපාලන\s*විද්‍යාව/gi, 'Political_Science'],
    [/භූගෝල\s*විද්‍යාව/gi, 'Geography'],
    [/ව්‍යාපාර\s*අධ්‍යයනය/gi, 'Business_Studies'],
    [/නාට්‍ය\s*හා\s*රංග\s*කලාව/gi, 'Drama'],
    [/නාට්‍ය\s*හා\s*රංගකලාව/gi, 'Drama'],
    [/නාට්‍ය/gi, 'Drama'],
    [/සංගීතය/gi, 'Music'],
    [/නර්තනය/gi, 'Dancing'],
    [/මාධ්‍ය\s*අධ්‍යයනය/gi, 'Media_Studies'],
    [/ජනමාධ්‍ය/gi, 'Mass_Media'],
    [/මාධ්‍ය/gi, 'Media'],
    [/ඉතිහාසය/gi, 'History'],
    [/සිංහල/gi, 'Sinhala'],
    [/සමාස/gi, 'Samasa'],
    [/සන්ධි/gi, 'Sandhi'],
    [/ව්‍යාකරණ/gi, 'Wyakarana'],
    [/සංගායනා/gi, 'Sangayana'],
    [/ආණ්ඩුක්‍රම/gi, 'Constitution'],
    [/ව්‍යවස්ථාව/gi, 'Constitution'],
    [/කළමනාකරණය/gi, 'Management'],
    [/දේශගුණය/gi, 'Climate'],
    [/කාලගුණය/gi, 'Weather'],
    [/භූ\s*විෂමතාව/gi, 'Topography'],
    [/අභයගිරි/gi, 'Abhayagiri'],
    [/මහා\s*විහාර/gi, 'Maha_Vihara'],
    [/අනුරාධපුර/gi, 'Anuradhapura'],
    [/පොළොන්නරු/gi, 'Polonnaruwa'],
    [/සීගිරිය/gi, 'Sigiriya'],
    [/කාශ්‍යප/gi, 'Kashyapa']
  ];

  for (const [pat, rep] of commonMap) {
    str = str.replace(pat, rep);
  }

  // Unicode consonant & vowel mapping
  const consonants = {
    'ක': 'k', 'ඛ': 'kh', 'ග': 'g', 'ඝ': 'gh', 'ඞ': 'n', 'ඟ': 'ng',
    'ච': 'ch', 'ඡ': 'chh', 'ජ': 'j', 'ඣ': 'jh', 'ඤ': 'gn', 'ඥ': 'gn', 'ඦ': 'nj',
    'ට': 't', 'ඨ': 'th', 'ඩ': 'd', 'ඪ': 'dh', 'ණ': 'n', 'ඬ': 'nd',
    'ත': 't', 'ථ': 'th', 'ද': 'd', 'ධ': 'dh', 'න': 'n', 'ඳ': 'nd',
    'ප': 'p', 'ඵ': 'ph', 'බ': 'b', 'භ': 'bh', 'ම': 'm', 'ඹ': 'mb',
    'ය': 'y', 'ර': 'r', 'ල': 'l', 'ව': 'w', 'ශ': 'sh', 'ෂ': 'sh', 'ස': 's', 'හ': 'h', 'ළ': 'l', 'ෆ': 'f'
  };

  const vowels = {
    'අ': 'a', 'ආ': 'aa', 'ඇ': 'ae', 'ඈ': 'aae', 'ඉ': 'i', 'ඊ': 'ee',
    'උ': 'u', 'ඌ': 'oo', 'ඍ': 'ri', 'එ': 'e', 'ඒ': 'e', 'ඓ': 'ai', 'ඔ': 'o', 'ඕ': 'o', 'ඖ': 'au'
  };

  const signs = {
    '්': '', 'ා': 'a', 'ැ': 'ae', 'ෑ': 'aae', 'ි': 'i', 'ී': 'ee',
    'ු': 'u', 'ූ': 'oo', 'ෘ': 'ru', 'ෙ': 'e', 'ේ': 'e', 'ෛ': 'ai',
    'ො': 'o', 'ෝ': 'o', 'ෞ': 'au', 'ං': 'ng', 'ඃ': 'h'
  };

  let out = '';
  const len = str.length;
  let i = 0;
  while (i < len) {
    const ch = str[i];
    if (vowels[ch]) {
      out += vowels[ch];
      i++;
    } else if (consonants[ch]) {
      const next = str[i + 1];
      if (next === '්') {
        out += consonants[ch];
        i += 2;
      } else if (next && signs[next] !== undefined) {
        out += consonants[ch] + signs[next];
        i += 2;
      } else if (next === '්‍ර') {
        out += consonants[ch] + 'ra';
        i += 2;
      } else if (next === '්‍ය') {
        out += consonants[ch] + 'ya';
        i += 2;
      } else {
        out += consonants[ch] + 'a';
        i++;
      }
    } else if (/[a-zA-Z0-9_-]/.test(ch)) {
      out += ch;
      i++;
    } else if (/\s/.test(ch)) {
      out += '_';
      i++;
    } else {
      i++;
    }
  }

  out = out.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (!out) return '';
  return out.split('_').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
}

// Helper: Format Clean & Descriptive PDF Filename with Subject Tag & Singlish/English Title
function formatPdfFilename(subCode, rawTitle, type = 'Note') {
  const SUBJECT_TAGS = {
    si: 'AL_Sinhala', sin: 'AL_Sinhala', sinhala: 'AL_Sinhala',
    bc: 'AL_Buddhist_Civ', buddhist: 'AL_Buddhist_Civ',
    geo: 'AL_Geography', geog: 'AL_Geography', geography: 'AL_Geography',
    pl: 'AL_Political_Science', pol: 'AL_Political_Science', political: 'AL_Political_Science',
    hi: 'AL_History', hist: 'AL_History', history: 'AL_History',
    bs: 'AL_Business_Studies', bus: 'AL_Business_Studies', business: 'AL_Business_Studies',
    dr: 'AL_Drama', drama: 'AL_Drama', theatre: 'AL_Drama',
    mu: 'AL_Music', music: 'AL_Music', sangeetha: 'AL_Music',
    dn: 'AL_Dancing', dance: 'AL_Dancing', dancing: 'AL_Dancing', narthana: 'AL_Dancing',
    md: 'AL_Media', media: 'AL_Media',
    log: 'AL_Logic', logic: 'AL_Logic'
  };

  const tag = (subCode && SUBJECT_TAGS[String(subCode).toLowerCase()]) || 'AL_MCQ_HUB';
  const singlishTitle = transliterateSinhalaToSinglish(rawTitle || '');

  const cleanType = type ? `_${type}` : '';
  const titlePart = singlishTitle ? `_${singlishTitle}` : '';

  let filename = `[${tag}]${titlePart}${cleanType}`;
  // Ensure no duplicate type tags
  filename = filename.replace(/_(Note|Paper|Exam_Paper|Past_Paper|Model_Paper|Study_Guide)_(Note|Paper|Exam_Paper|Past_Paper|Model_Paper|Study_Guide)/gi, '_$1');
  // Truncate length to max 70 chars
  if (filename.length > 70) {
    filename = filename.substring(0, 70);
  }
  return filename;
}

// Helper: Clean and create a safe filename from topic title (fallback)
function sanitizePDFFilename(title, subCode = 'auto') {
  return formatPdfFilename(subCode, title, 'Note');
}

// Helper: Generate structured Sinhala PDF Study Guide or Exam Paper Document via Python Bridge
// subjectCode: 'si' | 'bc' | 'hi' | 'pl' | 'bs' | 'auto' — drives colour theme selection
// mode: 'note' | 'paper' — drives HTML PDF template layout
async function generatePDFNote(topicTitle, textContent, subjectCode = 'auto', mode = 'note', persistentFilename = null) {
  if (!textContent || !textContent.trim()) return null;

  try {
    const pdfDir = path.resolve(process.cwd(), 'pdf_downloads');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    const safeFilename = persistentFilename || formatPdfFilename(subjectCode, topicTitle, mode === 'paper' ? 'Exam_Paper' : 'Note');
    const outPdfPath = path.join(pdfDir, `${safeFilename}.pdf`);

    const timeId = Date.now().toString(36);
    const tempTxtPath = path.join(pdfDir, `temp_${mode}_${timeId}.txt`);

    // Write text to temp file
    fs.writeFileSync(tempTxtPath, textContent, 'utf8');

    const pythonScript = path.resolve(process.cwd(), 'generate_pdf_note.py');
    const safeTitle = (topicTitle || (mode === 'paper' ? 'උසස් පෙළ ආදර්ශ විභාග ප්‍රශ්න පත්‍රය' : 'උසස් පෙළ අධ්‍යයන සටහන')).replace(/["'\\]/g, ' ');
    const safeSubCode = (subjectCode || 'auto').replace(/[^a-z]/gi, '').toLowerCase();

    await new Promise((resolve) => {
      const pyProc = spawn('python', [pythonScript, safeTitle, tempTxtPath, outPdfPath, safeSubCode, mode]);
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
    if (fs.existsSync(tempTxtPath)) fs.unlink(tempTxtPath, () => { });

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
  } catch (e) { }

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
  } catch (e) { }

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

      console.log(`[NotebookLM] Querying notebook ${notebookId} (mode=${mode}, attempt=${attempt})...`);

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

      const timeoutMs = mode === 'audio' ? 720000 : 420000; // 12-min for Audio, 7-min for quiz/query
      const timeout = setTimeout(() => {
        try { pyProc.kill(); } catch (e) { }
        console.error(`[NotebookLM] Process timed out after ${timeoutMs / 1000}s`);
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
          console.log(`[NotebookLM] Successfully received ${output.length} characters response.`);
          resolve(output);
        } else {
          if (output.startsWith('ERROR:') || stderr) {
            console.error(`NotebookLM Bridge Attempt ${attempt} Notice:`, output || stderr);
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

// Helper: Generate Native Sinhala Voice Study Note via generate_sinhala_voice_note.py
async function generateSinhalaVoiceStudyNote(topic, notebookId = null, subjectCode = 'auto', voiceName = 'si-LK-ThiliniNeural') {
  return new Promise((resolve) => {
    const scriptDir = typeof _scriptDir !== 'undefined' ? _scriptDir : process.cwd();
    const pyScript = path.join(scriptDir, 'generate_sinhala_voice_note.py');
    const args = ['-X', 'utf8', pyScript, topic];
    if (notebookId) args.push('--notebook-id', notebookId);
    if (subjectCode) args.push('--subject-code', subjectCode);
    if (voiceName) args.push('--voice', voiceName);

    const pyProc = spawn('python', args, {
      cwd: scriptDir,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
    });

    let stdout = '';
    let stderr = '';
    pyProc.stdout.on('data', (d) => { stdout += d.toString('utf8'); });
    pyProc.stderr.on('data', (d) => {
      const txt = d.toString('utf8');
      stderr += txt;
      if (txt.includes('🎙️') || txt.includes('🔊') || txt.includes('Chunk')) {
        console.log(`[VoiceNote] ${txt.trim()}`);
      }
    });

    const timeout = setTimeout(() => {
      try { pyProc.kill(); } catch (e) { }
      console.error('[VoiceNote] Process timed out after 300s');
      resolve(null);
    }, 300000);

    pyProc.on('close', (code) => {
      clearTimeout(timeout);
      const output = stdout.trim();
      if (output.includes('VOICE_FILE:')) {
        const fileMatch = output.match(/VOICE_FILE:(.+)/);
        const titleMatch = output.match(/VOICE_TITLE:(.+)/);
        const summaryMatch = output.match(/VOICE_SUMMARY:(.+)/);
        const scriptMatch = output.match(/VOICE_SCRIPT:([\s\S]*)/);
        if (fileMatch && fileMatch[1]) {
          return resolve({
            type: 'voice',
            path: fileMatch[1].trim(),
            title: titleMatch ? titleMatch[1].trim() : topic,
            summary: summaryMatch ? summaryMatch[1].trim() : '',
            script: scriptMatch ? scriptMatch[1].trim() : ''
          });
        }
      }
      if (stderr) {
        console.error('[VoiceNote] Notice:', stderr.trim());
      }
      resolve(null);
    });
  });
}

// Helper: Normalize subject codes and aliases into canonical codes
function normalizeSubjectCode(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  if (['si', 'sin', 'sinhala', 'sinhala_language', 'සිංහල', 'සිංහල භාෂාව', 'සිංහල සාහිත්‍යය'].includes(s)) return 'si';
  if (['bc', 'buddhist', 'buddhist_civ', 'buddhist_civilization', 'බෞද්ධ', 'බෞද්ධ ශිෂ්ටාචාරය', 'ශිෂ්ටාචාරය'].includes(s)) return 'bc';
  if (['agri', 'ag', 'agriculture', 'agricultural', 'agricultural_science', 'krushi', 'කෘෂි', 'කෘෂිකර්ම', 'කෘෂි විද්‍යාව'].includes(s)) return 'agri';
  if (['hist', 'hi', 'history', 'ඉතිහාසය', 'ඉතිහාස', 'ශ්‍රී ලංකා ඉතිහාසය'].includes(s)) return 'hist';
  if (['pl', 'pol', 'political', 'political_science', 'politics', 'දේශපාලන', 'දේශපාලන විද්‍යාව'].includes(s)) return 'pl';
  if (['bs', 'bus', 'business', 'business_studies', 'commerce', 'ව්‍යාපාර', 'ව්‍යාපාර අධ්‍යයනය', 'වාණිජ'].includes(s)) return 'bs';
  if (['geo', 'geog', 'geography', 'භූගෝල', 'භූගෝල විද්‍යාව'].includes(s)) return 'geo';
  if (['md', 'media', 'mass_media', 'මාධ්‍ය', 'මාධ්‍ය අධ්‍යයනය', 'ජනමාධ්‍ය', 'ජනසන්නිවේදනය', 'සන්නිවේදන'].includes(s)) return 'md';
  if (['dr', 'drama', 'theatre', 'නාට්‍ය', 'නාට්‍ය හා රංග කලාව', 'නාට්‍ය හා රංගකලාව', 'රංග කලාව'].includes(s)) return 'dr';
  if (['mu', 'music', 'සංගීතය', 'සංගීත'].includes(s)) return 'mu';
  if (['dn', 'dance', 'dancing', 'නැටුම්', 'නර්තනය', 'නර්තන'].includes(s)) return 'dn';
  if (['morning', 'wishes', 'goodmorning'].includes(s)) return 'morning';
  return null;
}

// Distinctive subject keyword dictionaries to detect cross-subject conflicts accurately
const SUBJECT_KEYWORDS_MAP = {
  si: [
    'සන්ධි', 'සමාස', 'කර්මධාරය', 'ද්වන්ද', 'තත්පුරුෂ', 'බහුව්‍රීහි', 'අව්‍යයීභාව',
    'ව්‍යංජන', 'විභක්ති', 'ආඛ්‍යාත', 'කර්මකාරක', 'කර්තෘකාරක', 'තත්සම', 'තද්භව', 'නිපාත', 'උපසර්ග',
    'සිදත් සඟරා', 'ගුරුළුගෝමී', 'අමාවතුර', 'බුත්සරණ', 'ධර්මසේන', 'සද්ධර්මරත්නාවලිය', 'කාව්‍යශේඛර',
    'සැළලිහිණි', 'ගුත්තිල', 'මුනිදාස කුමාරතුංග', 'මාටින් වික්‍රමසිංහ', 'සිංහල භාෂාව', 'සිංහල සාහිත්‍ය',
    'පද බෙදීම', 'අක්ෂර වින්‍යාසය', 'ව්‍යාකරණ',
  ],
  bc: [
    'බෞද්ධ ශිෂ්ටාචාරය', 'ථෙරවාද', 'මහායාන', 'සංගායනා', 'සංඟායනා', 'අභයගිරි', 'ජේතවන', 'මහාවිහාර',
    'මිහිඳු', 'දේවානම්පියතිස්ස', 'ත්‍රිපිටක', 'අලුවිහාර', 'සූත්‍ර පිටකය', 'විනය පිටකය', 'අභිධර්ම',
    'අශෝක රජු', 'පරිනිර්වාණ', 'බුද්ධ චරිතය', 'ධර්මදූත', 'ආරාමික', 'චතුරාර්ය සත්‍ය', 'ආර්ය අෂ්ටාංගික',
    'ප්‍රතීත්‍යසමුත්පාද', 'කර්මය සහ පුනර්භවය', 'භික්ෂුණී ශාසනය', 'දස වස්තුක'
  ],
  hist: [
    'මහාවංශය', 'දීපවංශය', 'චූලවංශය', 'කෝල්බෲක්', 'කැමරන්', 'ඩොනමෝර්', 'සෝල්බරි', 'උඩරට ගිවිසුම',
    'කැප්පිටිපොළ', '1818', '1848', 'මාතලේ කැරැල්ල', 'විජයබාහු', 'පරාක්‍රමබාහු', 'නිශ්ශංකමල්ල',
    'සීගිරිය කාශ්‍යප', 'ධාතුසේන', 'අනුරාධපුර යුගය', 'පොළොන්නරු යුගය', 'දඹදෙණි යුගය', 'කුරුණෑගල යුගය',
    'ගම්පොළ යුගය', 'කෝට්ටේ යුගය', 'සීතාවක යුගය', 'මහනුවර යුගය', 'පෘතුගීසි පාලනය', 'ලන්දේසි පාලනය',
    'ඉංග්‍රීසි පාලනය', 'ලංකා ඉතිහාසය', 'ශ්‍රී ලංකා ඉතිහාසය', 'නරේන්ද්‍රසිංහ', 'නායක්කාර්'
  ],
  pl: [
    'ආණ්ඩුක්‍රම ව්‍යවස්ථාව', '1978 ව්‍යවස්ථාව', '1972 ජනරජ', '13 වන සංශෝධනය', '19 වන සංශෝධනය',
    '20 වන සංශෝධනය', '21 වන සංශෝධනය', 'විධායක ජනාධිපති', 'පාර්ලිමේන්තු ක්‍රමය', 'සර්වජන ඡන්ද',
    'සමානුපාතික ඡන්ද', 'බලතල බෙදීම', 'ව්‍යවස්ථාදායකය', 'විධායකය', 'අධිකරණය', 'එක්සත් ජාතීන්ගේ',
    'ජාත්‍යන්තර සබඳතා', 'මානව හිමිකම්', 'ප්‍රජාතන්ත්‍රවාදය', 'රාජ්‍ය න්‍යාය', 'දේශපාලන පක්ෂ', 'දේශපාලන විද්‍යාව'
  ],
  bs: [
    'කළමනාකරණය', 'කළමනාකරණ මූලධර්ම', 'අලෙවිකරණ', 'අලෙවිකරණ මිශ්‍රණය', '4Ps', '7Ps', 'ගිණුම්කරණය',
    'ද්විත්ව සටහන්', 'ශේෂ පත්‍රය', 'ලාභ අලාභ', 'කොටස් වෙළෙඳපොළ', 'SEC', 'CSE', 'මූල්‍ය කළමනාකරණය',
    'මානව සම්පත් කළමනාකරණය', 'ව්‍යවසායකත්වය', 'තනි පුද්ගල ව්‍යාපාර', 'හවුල් ව්‍යාපාර', 'සමාගම්',
    'බැංකු පද්ධතිය', 'මහ බැංකුව', 'මුදල් හා බැංකු', 'ව්‍යාපාර අධ්‍යයනය'
  ],
  geo: [
    'භූගෝල විද්‍යාව', 'භූ විෂමතාව', 'තහඩු භූකලනය', 'පෘථිවි අභ්‍යන්තරය', 'මෝසම් සුළං', 'නිරිතදිග මෝසම',
    'ඊසානදිග මෝසම', 'වර්ෂාපතනය', 'දේශගුණය', 'කාලගුණය', 'ගංගා නිම්න', 'මහවැලි ගඟ', 'පිදුරුතලගාල',
    'ජනගහන ව්‍යාප්තිය', 'නාගරීකරණය', 'සිතියම් විද්‍යාව', 'සමෝච්ච රේඛා', 'ජීව ගෝලය', 'පාංශු ඛාදනය', 'මොහොරොවිසික්'
  ],
  agri: [
    'කෘෂි විද්‍යාව', 'කෘෂිකර්ම', 'පාංශු කාණ්ඩ', 'රතු කහ පොඩ්සොලික්', 'රතු දුඹුරු පස', 'RBE',
    'පස සහ ශාක', 'ශාක පෝෂණය', 'නයිට්‍රජන් ඌනතාව', 'පොස්පරස්', 'පොටෑසියම්', 'බිංදු ජලසම්පාදන',
    'විසුරුම් ජලසම්පාදන', 'හරිතාගාර', 'ශාක ප්‍රචාරණය', 'බද්ධ කිරීම', 'පළිබෝධ පාලනය', 'කෘෂි රසායන',
    'සත්ත්ව පාලනය', 'කිරි ගව', 'කුකුළු පාලනය', 'පශ්චාත් අස්වනු'
  ],
  md: [
    'මාධ්‍ය අධ්‍යයනය', 'ජනමාධ්‍ය', 'ජනසන්නිවේදනය', 'ගුවන්විදුලි', 'රූපවාහිනී', 'පුවත්පත්',
    'සන්නිවේදන ආකෘති', 'ලැස්වෙල් ආකෘතිය', 'ෂැනන් සහ වීවර්', 'මාධ්‍ය නීතිය', 'මාධ්‍ය ආචාරධර්ම',
    'ප්‍රචාරණය', 'මහජන සම්බන්ධතා', 'සමාජ මාධ්‍ය'
  ],
  dr: [
    'නාට්‍ය හා රංග කලාව', 'නාට්‍ය', 'නාඩගම්', 'නූර්ති', 'සොකරි', 'කෝලම්', 'මනමේ', 'සිංහබාහු',
    'එදිරිවීර සරච්චන්ද්‍ර', 'රංග කලාව', 'අංග රචනය', 'ආලෝකකරණය', 'රංග වස්ත්‍ර', 'ග්‍රීක නාට්‍ය', 'බටහිර නාට්‍ය'
  ],
  mu: [
    'සංගීතය', 'උත්තර භාරතීය', 'රාගධාරී', 'ශුද්ධ ස්වර', 'විකෘත ස්වර', 'තත් භාණ්ඩ', 'සුසිර භාණ්ඩ',
    'ඝන භාණ්ඩ', 'අවනද්ධ භාණ්ඩ', 'ඛයාල්', 'ධෲපද්', 'තාල පද්ධතිය', 'සප්තකය', 'ස්වර ලිපි', 'රාග'
  ],
  dn: [
    'නැටුම්', 'නර්තනය', 'උඩරට නැටුම්', 'පහතරට නැටුම්', 'සබරගමු නැටුම්', 'වන්නම්', 'දහඅට සන්නිය',
    'කොහොඹා කංකාරිය', 'කරඬු නැටුම', 'බෙර වාදනය', 'නර්තන සම්ප්‍රදාය'
  ]
};

// Helper: Detect subject from user's prompt text based on distinct syllabus keywords
function detectSubjectFromContent(userPrompt) {
  if (!userPrompt) return null;
  const promptLower = String(userPrompt).toLowerCase();

  for (const [subCode, keywords] of Object.entries(SUBJECT_KEYWORDS_MAP)) {
    for (const kw of keywords) {
      if (promptLower.includes(kw.toLowerCase())) {
        return subCode;
      }
    }
  }
  return null;
}

// Helper: Check if a user's prompt or requested subject conflicts with the current Forum Topic Subject
function validateTopicSubjectMatch({ explicitSubCode, userPrompt, topicSubject }) {
  const currentSub = normalizeSubjectCode(topicSubject);
  if (!currentSub) {
    // Not in a subject-specific forum topic (e.g. general chat or DM)
    const normExplicit = normalizeSubjectCode(explicitSubCode);
    return {
      isAllowed: true,
      currentTopicSubject: null,
      effectiveSubCode: normExplicit || null
    };
  }

  // 1. Check if user explicitly asked for a DIFFERENT subject via command suffix (e.g. /ai_si in bc topic) or arg prefix
  const normExplicit = normalizeSubjectCode(explicitSubCode);
  if (normExplicit && normExplicit !== currentSub) {
    return {
      isAllowed: false,
      currentTopicSubject: currentSub,
      targetSubject: normExplicit,
      reason: 'explicit_mismatch'
    };
  }

  // 2. Check if the question text or content distinctly belongs to another subject
  const detectedContentSub = detectSubjectFromContent(userPrompt);
  if (detectedContentSub && detectedContentSub !== currentSub) {
    return {
      isAllowed: false,
      currentTopicSubject: currentSub,
      targetSubject: detectedContentSub,
      reason: 'content_mismatch'
    };
  }

  // Allowed: Question is for this topic's subject!
  return {
    isAllowed: true,
    currentTopicSubject: currentSub,
    effectiveSubCode: currentSub
  };
}

// Helper: Build polite refusal & redirection message when a user tries to access another subject inside a topic
function buildTopicSubjectRestrictionMessage(currentSubjectCode, targetSubjectCode) {
  const currentMeta = getSubjectHelpText(currentSubjectCode) || { name: (currentSubjectCode || '').toUpperCase() };
  const targetMeta = targetSubjectCode ? (getSubjectHelpText(targetSubjectCode) || { name: targetSubjectCode.toUpperCase() }) : null;

  let msg = `⛔ <b>A/L MCQ HUB — විෂය සීමා කිරීමේ දැනුම්දීම (Topic Subject Restriction)</b>\n\n`;
  msg += `📌 මෙම Topic එක <b>${currentMeta.name}</b> විෂය සඳහා පමණක් වෙන් කර ඇත.\n`;
  msg += `<i>(This topic is strictly dedicated to ${currentMeta.name} only.)</i>\n\n`;

  if (targetMeta) {
    msg += `⚠️ ඔබ විමසූ ප්‍රශ්නය / විධානය <b>${targetMeta.name}</b> විෂයට අදාළ වේ.\n\n`;
    msg += `👉 කරුණාකර අපගේ Telegram Group එකෙහි ඇති <b>${targetMeta.name}</b> Topic එක වෙත ගොස් ඔබගේ ප්‍රශ්නය විමසන්න.\n`;
    msg += `<i>(Please switch to the <b>${targetMeta.name}</b> topic in this group to ask this question.)</i>\n\n`;
  } else {
    msg += `👉 කරුණාකර මෙම Topic එක තුළ <b>${currentMeta.name}</b> විෂයට අදාළ ප්‍රශ්න පමණක් විමසන්න. වෙනත් විෂයයන් සඳහා අදාළ Topic එක තෝරාගන්න.\n\n`;
  }

  msg += `💡 <b>මෙම Topic එකේදී භාවිත කළ හැකි නිවැරදි Commands:</b>\n`;
  if (currentMeta.aiExample) msg += `• <code>/ai ${currentMeta.aiExample}</code>\n`;
  if (currentMeta.quizExample) msg += `• <code>/quiz ${currentMeta.quizExample}</code>\n`;
  if (currentMeta.audioExample) msg += `• <code>/audio ${currentMeta.audioExample}</code>\n`;
  if (currentMeta.paperExample) msg += `• <code>/paper ${currentMeta.paperExample}</code>\n`;

  return msg;
}

// Helper: Dynamically resolve subject-specific NotebookLM ID with strict single-subject enforcement
function getSubjectNotebookId(userPrompt, explicitSubId = null) {
  if (explicitSubId) {
    const raw = String(explicitSubId).trim();
    // Direct UUID or Notebook ID passed
    if (raw.includes('-') && raw.length > 20) {
      return raw;
    }
  }

  const subKey = normalizeSubjectCode(explicitSubId);

  if (subKey) {
    if (subKey === 'si') return NOTEBOOK_ID_SIN;
    if (subKey === 'bc') return NOTEBOOK_ID_BC;
    if (subKey === 'hist') return NOTEBOOK_ID_HIST;
    if (subKey === 'pl') return NOTEBOOK_ID_PL;
    if (subKey === 'bs') return NOTEBOOK_ID_BS;
    if (subKey === 'geo') return NOTEBOOK_ID_GEO;
    if (subKey === 'agri') return NOTEBOOK_ID_AGRI;
    if (subKey === 'md') return NOTEBOOK_ID_MD;
    if (subKey === 'dr') return NOTEBOOK_ID_DRAMA;
    if (subKey === 'mu') return NOTEBOOK_ID_MUSIC;
    if (subKey === 'dn') return NOTEBOOK_ID_DANCING;
    if (subKey === 'morning') return NOTEBOOK_ID_MORNING;

    const envKey = `NOTEBOOK_ID_${subKey.toUpperCase()}`;
    if (process.env[envKey] && process.env[envKey].trim()) {
      return process.env[envKey].trim();
    }
  }

  // If no explicit subject provided, detect from content
  const detected = detectSubjectFromContent(userPrompt);
  if (detected) {
    return getSubjectNotebookId(userPrompt, detected);
  }

  return NOTEBOOK_ID_BC;
}

// Helper: 100% Exclusive Google NotebookLM Engine with strict subject grounding
async function askGeminiAI(userPrompt, explicitSubId = null) {
  const normSub = normalizeSubjectCode(explicitSubId);
  const notebookId = getSubjectNotebookId(userPrompt, normSub);

  if (notebookId) {
    try {
      const isMorning = notebookId === NOTEBOOK_ID_MORNING;
      let finalPrompt = (userPrompt || '').trim();
      if (!isMorning) {
        const meta = getSubjectHelpText(normSub);
        const subName = meta ? meta.name : 'උසස් පෙළ විෂය නිර්දේශය';
        if (finalPrompt.length <= 25 && !finalPrompt.includes('සටහන') && !finalPrompt.includes('ලබා දෙන්න') && !finalPrompt.includes('විස්තර')) {
          finalPrompt = `[විෂය: ${subName}] උසස් පෙළ විෂය නිර්දේශයේ ${finalPrompt} පිළිබඳ සවිස්තරාත්මක අධ්‍යයන සටහනක් සකස් කරන්න.`;
        } else {
          finalPrompt = `[විෂය: ${subName}]\n${finalPrompt}`;
        }
      }

      const nbReply = await askNotebookLMPython(finalPrompt, notebookId);
      if (nbReply && nbReply.trim()) {
        return nbReply.trim();
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
    } catch (e) { }
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
        } catch (e) { }
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
      } catch (e) { }
    }
  }, 2000);
}

// Helper: Generate Persistent Bottom Reply Keyboard (Floating START bar)
function getPersistentReplyKeyboard() {
  return {
    keyboard: [
      [
        { text: '🚀 ආරම්භ කරන්න (Start Quiz)' },
        { text: '🗺️ සිතියම් පුහුණුව (Map Marking)' }
      ],
      [
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
    [{ text: '🗺️ සිතියම් සලකුණු කිරීමේ පුහුණුව (Map Marking Hub)', callback_data: 'open_map_hub' }],
    [{ text: QUIZ_DATA.pl.name, callback_data: 'sub_pl' }],
    [{ text: QUIZ_DATA.hist.name, callback_data: 'sub_hist' }],
    [{ text: QUIZ_DATA.bc.name, callback_data: 'sub_bc' }],
    [{ text: QUIZ_DATA.sin.name, callback_data: 'sub_sin' }],
    [{ text: QUIZ_DATA.bs.name, callback_data: 'sub_bs' }],
    [{ text: QUIZ_DATA.agri.name, callback_data: 'sub_agri' }],
    [{ text: QUIZ_DATA.geo.name, callback_data: 'sub_geo' }],
    [{ text: QUIZ_DATA.md.name, callback_data: 'sub_md' }],
    [{ text: QUIZ_DATA.drama.name, callback_data: 'sub_drama' }],
    [{ text: QUIZ_DATA.music.name, callback_data: 'sub_music' }],
    [{ text: QUIZ_DATA.dancing.name, callback_data: 'sub_dancing' }],
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
  if (subId === 'agri') {
    return {
      inline_keyboard: [
        [{ text: '🤖 A/L AI Tutor — කෘෂි විද්‍යාව (/ai_agri)', callback_data: 'ask_ai_agri' }],
        [{ text: '🧩 සජීවී AI Quiz තරඟය (/quiz_agri)', callback_data: 'quiz_ai_agri' }],
        [{ text: '🎙️ A/L MCQ HUB AI Podcast (/audio_agri)', callback_data: 'audio_ai_agri' }],
        [{ text: '🎧 සිංහල Voice Study Note (/voice_agri)', callback_data: 'voice_ai_agri' }],
        [{ text: '📄 ආදර්ශ විභාග ප්‍රශ්න පත්‍ර (/paper_agri)', callback_data: 'paper_ai_agri' }],
        [{ text: '📚 සියලුම PDF සටහන් (Saved Notes)', callback_data: 'allnotes_sub_agri' }],
        [{ text: '⬅️ ප්‍රධාන මෙනුවට (Back to Subjects)', callback_data: 'nav_subjects' }]
      ]
    };
  }

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

    const { chatId, sessionKey, qIndex, correctOption } = mapping;
    const user = answer.user;
    if (!user) return;

    const selectedOpt = (answer.option_ids && answer.option_ids.length > 0) ? answer.option_ids[0] : -1;

    // Track AI Quiz Competition Scores
    const aiSession = (sessionKey && aiQuizSessions[sessionKey]) || aiQuizSessions[chatId];
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
    const session = (sessionKey && userPollSessions[sessionKey]) || userPollSessions[chatId];
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
          await bot.sendMessage(uid, text, { parse_mode: 'Markdown' }).catch(() => { });
        }
        for (const gid of allGroups) {
          await bot.sendMessage(gid, text, { parse_mode: 'Markdown' }).catch(() => { });
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
      registerGroup(msg.chat, msg.message_thread_id || null);
    }
  }

  // Handle Telegram Mini App (TWA) results sent via Telegram.WebApp.sendData()
  if (msg.web_app_data && msg.web_app_data.data) {
    try {
      const payload = JSON.parse(msg.web_app_data.data);
      if (payload.type === 'map_exam_result') {
        const { text, keyboard, percentage } = formatMiniAppResult(payload);
        if (msg.from) {
          recordScore(msg.from.id, msg.from.first_name || 'User', 'map', payload.score || 0);
        }
        return bot.sendMessage(msg.chat.id, text, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
          ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {})
        });
      }
    } catch (err) {
      console.error('⚠️ [TWA] Error parsing web_app_data:', err.message);
    }
  }

  if (msg.text) {
    console.log(`📩 Incoming message in [${msg.chat.type}] (Chat ID: ${msg.chat.id}) from ${msg.from?.first_name || 'User'}: "${msg.text}"`);

    // Direct /map or /sithiyam command handler
    if (msg.text.startsWith('/map') || msg.text.startsWith('/sithiyam') || msg.text.includes('🗺️ සිතියම්')) {
      if (!await enforceDirectAccessControl(msg)) return;
      const { text, keyboard } = buildMapHubMessage(BASE_URL);
      return bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
        ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {})
      });
    }

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
      if (!await enforceDirectAccessControl(msg)) return;
      sendStartMenu(msg.chat.id, msg.from, msg.chat.type !== 'private');
    } else if (msg.text.includes('🏆 ලකුණු පුවරුව') || msg.text.includes('Leaderboard')) {
      if (!await enforceDirectAccessControl(msg)) return;
      sendLeaderboardMenu(msg.chat.id);
    }
  }
});

// Listener: Auto Welcome when Bot is added to a Telegram Group & Register Group
bot.on('new_chat_members', async (msg) => {
  try {
    if (msg.chat && (msg.chat.type === 'group' || msg.chat.type === 'supergroup')) {
      registerGroup(msg.chat, msg.message_thread_id || null);
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
  } catch (err) { }
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
    }).catch(e => { });
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
// Helper: Balance unclosed HTML tags across message chunks for Telegram
function balanceHtmlChunk(text) {
  const supportedTags = ['b', 'strong', 'i', 'em', 'code', 'pre', 'u', 's', 'a'];
  const openStack = [];

  const tagRegex = /<\/?([a-z0-9]+)(?:\s+[^>]*)?>/gi;
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    if (!supportedTags.includes(tagName)) continue;

    const isClosing = fullTag.startsWith('</');
    if (isClosing) {
      const lastIdx = openStack.lastIndexOf(tagName);
      if (lastIdx !== -1) {
        openStack.splice(lastIdx, 1);
      }
    } else {
      openStack.push(tagName);
    }
  }

  let balanced = text;
  for (let i = openStack.length - 1; i >= 0; i--) {
    balanced += `</${openStack[i]}>`;
  }

  return { balancedText: balanced, unclosedTags: openStack };
}

function splitLongMessageHtml(text, maxLen = 3800) {
  if (!text) return [];
  if (text.length <= maxLen) return [text];

  const chunks = [];
  let currentChunk = '';
  const lines = text.split('\n');
  let openPrefix = '';

  for (const line of lines) {
    if ((currentChunk + '\n' + line).length > maxLen) {
      if (currentChunk.trim()) {
        const { balancedText, unclosedTags } = balanceHtmlChunk(currentChunk.trim());
        chunks.push(balancedText);
        openPrefix = unclosedTags.map(t => `<${t}>`).join('');
      }
      currentChunk = openPrefix + (openPrefix ? '\n' : '') + line;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }

  if (currentChunk.trim()) {
    const { balancedText } = balanceHtmlChunk(currentChunk.trim());
    chunks.push(balancedText);
  }

  return chunks;
}

// Helper: Safely split and send long messages exceeding Telegram's 4096 character limit
async function sendLongMessage(chatId, text, options = { parse_mode: 'Markdown' }) {
  if (!text) return;
  const MAX_LENGTH = 3800;
  const isHTML = options && options.parse_mode === 'HTML';

  const cleanFallback = (raw) => {
    return raw
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/<[^>]+>/g, '')
      .replace(/[*_`]/g, '')
      .trim();
  };

  if (text.length <= MAX_LENGTH) {
    try {
      return await bot.sendMessage(chatId, text, options);
    } catch (err) {
      console.error('sendLongMessage single message error:', err.message);
      const cleanMsg = cleanFallback(text);
      const plainOpts = { ...options };
      delete plainOpts.parse_mode;
      return await bot.sendMessage(chatId, cleanMsg, plainOpts).catch(() => null);
    }
  }

  // Split long text into clean paragraph chunks
  const chunks = isHTML ? splitLongMessageHtml(text, MAX_LENGTH) : [];
  if (!isHTML) {
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
  }

  let lastSent = null;
  for (let i = 0; i < chunks.length; i++) {
    const chunkHeader = chunks.length > 1 ? (isHTML ? `📄 <b>(කොටස ${i + 1}/${chunks.length})</b>\n\n` : `📄 **(කොටස ${i + 1}/${chunks.length})**\n\n`) : '';
    const chunkText = chunkHeader + chunks[i];
    try {
      lastSent = await bot.sendMessage(chatId, chunkText, options);
    } catch (err) {
      console.error(`sendLongMessage chunk ${i + 1} error:`, err.message);
      const cleanMsg = cleanFallback(chunkText);
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

bot.onText(/\/start/i, async (msg) => {
  if (!await enforceDirectAccessControl(msg)) return;
  const isGroup = msg.chat.type !== 'private';
  sendStartMenu(msg.chat.id, msg.from, isGroup);
});

// Helper: Build comprehensive Pinned Instruction for a specific Forum Topic Subject
function buildTopicPinnedInstruction(subCode) {
  const code = normalizeSubjectCode(subCode) || 'si';
  const meta = getSubjectHelpText(code) || {
    name: 'A/L Subject',
    icon: '🎓',
    aiExample: 'පාඩම පැහැදිලි කරන්න',
    quizExample: '20 mcqs',
    audioExample: 'විෂය කරුණු',
    voiceExample: 'පාඩම් සාරාංශය',
    paperExample: '2024 පසුගිය ප්‍රශ්න පත්‍රය'
  };

  const text =
    `📌 <b>${meta.icon} A/L MCQ HUB — ${meta.name} නිල උපදෙස් හා නීති මාලාව (Topic Guide)</b> 📌\n\n` +
    `සාදරයෙන් පිළිගනිමු! මෙම Forum Topic එක <b>${meta.name}</b> විෂය සඳහා පමණක් විශේෂයෙන් වෙන් කර ඇත.\n\n` +
    `🔒 <b>විෂය සීමා කිරීම (Dedicated Subject AI Engine):</b>\n` +
    `මෙම Topic එක තුළ ඔබ විමසන සියලුම ප්‍රශ්න සඳහා පිළිතුරු සැපයෙන්නේ <b>${meta.name}</b> නිල NotebookLM AI සටහන් ඇසුරෙන් පමණි. කරුණාකර වෙනත් විෂයයන් වල ප්‍රශ්න මේ තුළ යොමු නොකර අදාළ Topic එක වෙත යොමු කරන්න.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🚀 <b>භාවිත කළ හැකි ප්‍රධාන Commands සහ උදාහරණ:</b>\n\n` +
    `🤖 <b>1. AI විෂය සටහන් හා ප්‍රශ්න (AI Tutor):</b>\n` +
    `• <code>/ai ${meta.aiExample}</code>\n` +
    `<i>(ඔබට ඇති ඕනෑම විෂය කරුණක්, විචාරයක් හෝ ගැටලුවක් සිංහලෙන් අසන්න.)</i>\n\n` +
    `🧩 <b>2. සජීවී බහුවරණ තරඟ (Live Quiz Polls with 20s Timers):</b>\n` +
    `• <code>/quiz ${meta.quizExample}</code>\n` +
    `<i>(මාතෘකාව සහ ප්‍රශ්න ගණන ලබා දී සජීවී තරඟයක් අරඹන්න. Leaderboard & Winner Podiums හිමිවේ!)</i>\n\n` +
    `🎙️ <b>3. සිංහල ශ්‍රව්‍ය පාඩම් (Sinhala Voice Notes):</b>\n` +
    `• <code>/voice ${meta.voiceExample || meta.audioExample}</code>\n` +
    `<i>(100% සිංහල ස්වභාවික හඬින් යුත් කෙටි ශ්‍රව්‍ය පාඩමක් ක්ෂණිකව ලබාගන්න.)</i>\n\n` +
    `🎧 <b>4. AI Deep Dive Audio Podcast:</b>\n` +
    `• <code>/audio ${meta.audioExample}</code>\n` +
    `<i>(සම්පූර්ණ පාඩමම ආවරණය වන සවිස්තරාත්මක AI Podcast එකක් ලබාගන්න.)</i>\n\n` +
    `📄 <b>5. පසුගිය හා ආදර්ශ විභාග ප්‍රශ්න පත්‍ර (Exam Papers & Marking Schemes):</b>\n` +
    `• <code>/paper ${meta.paperExample}</code>\n` +
    `<i>(Part I MCQ + Part II රචනා + Marking Scheme සමඟ Full PDF ලබාගන්න.)</i>\n\n` +
    `📚 <b>6. සම්පූර්ණ විෂය නිර්දේශයේ PDF සටහන්:</b>\n` +
    `• <code>/allnotes</code> (හෝ <code>/notes</code>)\n\n` +
    `📸 <b>7. ඡායාරූප ප්‍රශ්න (Photo OCR):</b>\n` +
    `• ඔබගේ පොතේ හෝ ප්‍රශ්න පත්‍රයේ ඡායාරූපයක් එවන්න. AI මඟින් ක්ෂණිකව කියවා විග්‍රහය ලබාදේ.\n\n` +
    `🎙️ <b>8. හඬ ප්‍රශ්න (Voice Message):</b>\n` +
    `• ඔබගේ ගැටලුව Voice Note එකක් ලෙස එවන්න. AI විසින් හඳුනාගෙන පිළිතුරු සපයනු ඇත.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ <b>වැදගත් නීති (Topic Rules):</b>\n` +
    `1. මෙම Topic එක තුළ <b>${meta.name}</b> විෂයට අදාළ කරුණු පමණක් සාකච්ඡා කරන්න.\n` +
    `2. Spam කිරීමෙන් හෝ අසභ්‍ය පණිවිඩ යැවීමෙන් වළකින්න.\n` +
    `3. වැඩිදුර විස්තර සඳහා <code>/help</code> භාවිත කරන්න.`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: `🎯 ${meta.name} Quiz අරඹන්න`, callback_data: `help_act_quiz_${code}` },
        { text: `🎙️ Voice Note ලබාගන්න`, callback_data: `help_act_voice_${code}` }
      ],
      [
        { text: `📄 Exam Paper ලබාගන්න`, callback_data: `help_act_paper_${code}` },
        { text: `📖 සම්පූර්ණ Help බලන්න`, callback_data: `help_sub_${code}` }
      ]
    ]
  };

  return { text, keyboard };
}

// Helper: Build Master Group Help Guide
function buildMainHelpGuide() {
  const text =
    `🏛️ <b>A/L MCQ HUB — සම්පූර්ණ භාවිත උපදෙස් මාලාව (Master Guide)</b> 🌟\n\n` +
    `A/L MCQ HUB යනු උසස් පෙළ (A/L) සිසුන් සඳහාම නිර්මාණය කරන ලද ලංකාවේ ප්‍රමුඛතම AI අධ්‍යාපනික පද්ධතියයි. පහත දැක්වෙන්නේ Bot හි සියලුම පහසුකම් භාවිත කරන ආකාරයයි:\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🎯 <b>1. ප්‍රධාන පහසුකම් සහ Commands:</b>\n\n` +
    `🤖 <b>/ai [ප්‍රශ්නය]</b> — 100% නිල විෂය නිර්දේශයේ NotebookLM AI ගුරුතුමාගෙන් පිළිතුරු ලබා ගැනීම.\n` +
    `🎯 <b>/normal_quiz</b> — 4,800+ MCQs අඩංගු විෂය ප්‍රශ්න බැංකුවෙන් 50-MCQ Sets තෝරා Live Quiz තරඟ පැවැත්වීම.\n` +
    `🧩 <b>/quiz [මාතෘකාව] [ගණන] mcqs</b> — සජීවී බහුවරණ තරඟ (Live Polls with 20s Timers) පැවැත්වීම.\n` +
    `🎙️ <b>/voice [මාතෘකාව]</b> — ස්වභාවික සිංහල හඬින් යුත් Voice Study Notes ක්ෂණිකව ලබා ගැනීම.\n` +
    `🎧 <b>/audio [මාතෘකාව]</b> — සම්පූර්ණ විෂය කරුණු ආවරණය වන AI Deep Dive Audio Podcasts.\n` +
    `📄 <b>/paper [වසර හෝ මාතෘකාව]</b> — පසුගිය සහ ආදර්ශ විභාග ප්‍රශ්න පත්‍ර (Part I + Part II + Marking Scheme) PDF ලබා ගැනීම.\n` +
    `📚 <b>/allnotes</b> — විෂය නිර්දේශයේ සියලුම ප්‍රධාන පාඩම් වල Core PDF Study Notes බාගත කිරීම.\n` +
    `🎨 <b>/image [විස්තරය]</b> — විෂය කරුණු වලට අදාළ 4K Diagrams සහ සිතියම් සාදා ගැනීම.\n` +
    `⏰ <b>/quiz_schedule</b> — දිනපතා Mega Quiz කාලසටහන් Stickers ලබා ගැනීම.\n` +
    `🏆 <b>/leaderboard</b> — Top 3 Winners සහ Top 20 All-Island ලකුණු පුවරුව බැලීම.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🎓 <b>2. Forum Topics පද්ධතිය සහ විෂය සීමා කිරීම (Topic Isolation):</b>\n` +
    `අපගේ Telegram Group එක තුළ සෑම විෂයකටම වෙන්වූ Topic පවතී. ඔබ අසන ඕනෑම ප්‍රශ්නයක් එම විෂයට අදාළ Topic එක තුළ පමණක් යොමු කරන්න. Bot විසින් එම විෂයට වෙන්වූ NotebookLM AI වෙතින් පමණක් පිළිතුරු සපයයි.\n\n` +
    `👇 <b>විෂය අනුව උපදෙස් හා උදාහරණ බැලීමට පහතින් තෝරන්න:</b>`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🇱🇰 සිංහල', callback_data: 'help_sub_si' },
        { text: '☸️ බෞද්ධ ශිෂ්ටාචාරය', callback_data: 'help_sub_bc' }
      ],
      [
        { text: '🏛️ ඉතිහාසය', callback_data: 'help_sub_hist' },
        { text: '⚖️ දේශපාලන විද්‍යාව', callback_data: 'help_sub_pl' }
      ],
      [
        { text: '💼 ව්‍යාපාර අධ්‍යයනය', callback_data: 'help_sub_bs' },
        { text: '🌍 භූගෝල විද්‍යාව', callback_data: 'help_sub_geo' }
      ],
      [
        { text: '🌾 කෘෂි විද්‍යාව', callback_data: 'help_sub_agri' },
        { text: '📡 මාධ්‍ය අධ්‍යයනය', callback_data: 'help_sub_md' }
      ],
      [
        { text: '🎭 නාට්‍ය හා රංග කලාව', callback_data: 'help_sub_dr' },
        { text: '🎵 සංගීතය', callback_data: 'help_sub_mu' }
      ],
      [
        { text: '💃 නැටුම්', callback_data: 'help_sub_dn' },
        { text: '📜 නීති හා රීති (Rules)', callback_data: 'help_rules' }
      ]
    ]
  };

  return { text, keyboard };
}

// Helper: Build Subject-Specific Deep Dive Help Guide
function buildSubjectHelpGuide(subCode) {
  const code = normalizeSubjectCode(subCode) || 'si';
  const meta = getSubjectHelpText(code) || { name: 'A/L Subject', icon: '🎓' };

  const text =
    `📖 <b>${meta.icon} A/L MCQ HUB — ${meta.name} උපදෙස් මාර්ගෝපදේශය (Help Guide)</b>\n\n` +
    `මෙම විෂය සඳහා A/L MCQ HUB හි සක්‍රීය සියලුම විශේෂාංග සහ නිවැරදි Commands පහත දැක්වේ:\n\n` +
    `🤖 <b>1. AI විෂය සටහන් හා විග්‍රහ (AI Tutor):</b>\n` +
    `• <code>/ai ${meta.aiExample || 'පාඩම පැහැදිලි කරන්න'}</code>\n` +
    `<i>(උසස් පෙළ ${meta.name} විෂය නිර්දේශයේ ඕනෑම සංකල්පයක් පැහැදිලි කරවා ගැනීමට.)</i>\n\n` +
    `🧩 <b>2. සජීවී බහුවරණ තරඟ (Live Quiz Polls):</b>\n` +
    `• <code>/quiz ${meta.quizExample || '20 mcqs'}</code>\n` +
    `<i>(තත්පර 20 ක Timer එක සහිතව ගෲප් එකේ මිතුරන් සමඟ තරඟ කිරීමට.)</i>\n\n` +
    `🎙️ <b>3. සිංහල ශ්‍රව්‍ය පාඩම (Sinhala Voice Note):</b>\n` +
    `• <code>/voice ${meta.voiceExample || meta.audioExample || 'පාඩම'}</code>\n` +
    `<i>(100% ස්වභාවික සිංහල කටහඬින් යුත් අධ්‍යයන සටහනක් ක්ෂණිකව ලබා ගැනීමට.)</i>\n\n` +
    `🎧 <b>4. AI Deep Dive Audio Podcast:</b>\n` +
    `• <code>/audio ${meta.audioExample || 'විෂය කරුණු'}</code>\n` +
    `<i>(සම්පූර්ණ පාඩම ආවරණය වන දීර්ඝ AI Podcast එකක් ලබා ගැනීමට.)</i>\n\n` +
    `📄 <b>5. පසුගිය හා ආදර්ශ විභාග ප්‍රශ්න පත්‍ර (Exam Papers):</b>\n` +
    `• <code>/paper ${meta.paperExample || 'පසුගිය ප්‍රශ්න පත්‍රය'}</code>\n` +
    `<i>(MCQ + රචනා + Marking Scheme සහිත සම්පූර්ණ PDF ලබා ගැනීමට.)</i>\n\n` +
    `📚 <b>6. Core Syllabus PDF සටහන්:</b>\n` +
    `• <code>/allnotes ${code}</code> (හෝ <code>/notes</code>)\n\n` +
    `🔒 <b>මතක තබා ගන්න:</b> මෙම Topic එක තුළ ක්‍රියාත්මක වන්නේ <b>${meta.name}</b> NotebookLM AI සටහන් පමණි.`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: `🎯 ${meta.name} Quiz අරඹන්න`, callback_data: `help_act_quiz_${code}` },
        { text: `🎙️ Voice Note ලබාගන්න`, callback_data: `help_act_voice_${code}` }
      ],
      [
        { text: `📄 Exam Paper ලබාගන්න`, callback_data: `help_act_paper_${code}` },
        { text: `⬅️ ප්‍රධාන Help මෙනුව`, callback_data: 'help_main' }
      ]
    ]
  };

  return { text, keyboard };
}

// Command: /pin_guide, /pin_topic, /pin_subject, /pin (Pin Subject Instructions or Group Announcement)
bot.onText(/\/(pin_guide|pin_topic|pin_subject|pin_all_topics|guide|features)(?:_([a-z0-9_]+))?(?:@\w+)?\s*(.*)/i, async (msg, match) => {
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  const { threadId, topicSubject } = getThreadContext(msg);
  const rawArg = (match[2] || match[3] || '').trim();
  const subCode = normalizeSubjectCode(rawArg) || topicSubject;

  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  if (!isAdminUser(msg.from?.id)) {
    return bot.sendMessage(chatId, '⛔ **මෙම විධානය භාවිතා කළ හැක්කේ Bot Admin ට පමණි.**', replyOpts).catch(() => { });
  }

  // If inside a subject topic or specific subject requested -> Pin Subject Instruction!
  if (subCode) {
    const guide = buildTopicPinnedInstruction(subCode);
    try {
      const sentMsg = await bot.sendMessage(chatId, guide.text, {
        parse_mode: 'HTML',
        reply_markup: guide.keyboard,
        ...(threadId ? { message_thread_id: threadId } : {})
      });
      if (isGroup && sentMsg && sentMsg.message_id) {
        bot.pinChatMessage(chatId, sentMsg.message_id, { disable_notification: false }).catch(() => { });
      }
    } catch (e) {
      console.error('Error pinning subject guide:', e.message);
    }
    return;
  }

  // Otherwise, pin the general master announcement
  const masterGuide = buildMainHelpGuide();
  try {
    const sentMsg = await bot.sendMessage(chatId, masterGuide.text, {
      parse_mode: 'HTML',
      reply_markup: masterGuide.keyboard,
      ...(threadId ? { message_thread_id: threadId } : {})
    });
    if (isGroup && sentMsg && sentMsg.message_id) {
      bot.pinChatMessage(chatId, sentMsg.message_id, { disable_notification: false }).catch(() => { });
    }
  } catch (e) {
    console.error('Error in /pin_guide master:', e.message);
  }
});

// Helper: Extract Telegram Forum Topic Thread ID and detect topic subject code
function getThreadContext(msg) {
  const threadId = (msg && msg.message_thread_id) ? msg.message_thread_id : null;
  const chatId = msg && msg.chat ? msg.chat.id : null;
  let topicSubject = null;

  const topicObj = msg?.forum_topic_created || msg?.reply_to_message?.forum_topic_created || msg?.forum_topic_edited || msg?.reply_to_message?.forum_topic_edited;
  if (topicObj && topicObj.name) {
    const topicName = (topicObj.name || '').toLowerCase();
    if (topicName.includes('මාධ්‍ය') || topicName.includes('media') || topicName.includes('සන්නිවේදන')) topicSubject = 'md';
    else if (topicName.includes('භූගෝල') || topicName.includes('geography') || topicName.includes('geog')) topicSubject = 'geo';
    else if (topicName.includes('ඉතිහාස') || topicName.includes('history') || topicName.includes('hist')) topicSubject = 'hist';
    else if (topicName.includes('සිංහල') || topicName.includes('sinhala')) topicSubject = 'si';
    else if (topicName.includes('කෘෂි') || topicName.includes('agri') || topicName.includes('agriculture') || topicName.includes('krushi') || topicName.includes('ගොවිතැන්')) topicSubject = 'agri';
    else if (topicName.includes('දේශපාලන') || topicName.includes('political') || topicName.includes('politics')) topicSubject = 'pl';
    else if (topicName.includes('බෞද්ධ') || topicName.includes('ශිෂ්ටාචාර') || topicName.includes('buddhist')) topicSubject = 'bc';
    else if (topicName.includes('සංගීත') || topicName.includes('music')) topicSubject = 'mu';
    else if (topicName.includes('ව්‍යාපාර') || topicName.includes('business') || topicName.includes('වාණිජ')) topicSubject = 'bs';
    else if (topicName.includes('නැටුම්') || topicName.includes('නර්තන') || topicName.includes('dance') || topicName.includes('dancing')) topicSubject = 'dn';
    else if (topicName.includes('නාට්‍ය') || topicName.includes('රංග කලාව') || topicName.includes('drama') || topicName.includes('theatre')) topicSubject = 'dr';

    if (chatId && threadId && topicSubject) {
      setTopicSubjectForThread(chatId, threadId, topicSubject, topicObj.name);
    }
  }

  // Persistent Thread -> Subject Lookup from DB / in-memory cache
  if (!topicSubject && chatId && threadId) {
    topicSubject = getTopicSubjectForThread(chatId, threadId);
  }

  return { threadId, topicSubject };
}

// Helper: Get subject-specific help metadata & examples
function getSubjectHelpText(subCode) {
  const code = normalizeSubjectCode(subCode) || (subCode ? String(subCode).toLowerCase() : '');
  const subjects = {
    si: {
      name: 'සිංහල (Sinhala)',
      icon: '🇱🇰',
      quizExample: 'සමාස, සන්ධි 20 mcqs',
      audioExample: 'සිංහල ව්‍යාකරණ',
      voiceExample: 'සමාස පද වර්ගීකරණය',
      aiExample: 'සන්ධි සහ සමාස අතර වෙනස කුමක්ද?',
      paperExample: '2024 පසුගිය ප්‍රශ්න පත්‍රය'
    },
    bc: {
      name: 'බෞද්ධ ශිෂ්ටාචාරය (Buddhist Civ)',
      icon: '☸️',
      quizExample: 'සංගායනා 15 mcqs',
      audioExample: 'මහින්දාගමනය',
      voiceExample: 'මහින්දාගමනය සහ එහි ප්‍රතිඵල',
      aiExample: 'අභයගිරි නිකාය ආරම්භ වීමට හේතු මොනවාද?',
      paperExample: '2023 පසුගිය ප්‍රශ්න පත්‍රය'
    },
    hist: {
      name: 'ඉතිහාසය (History)',
      icon: '🏛️',
      quizExample: 'අනුරාධපුර යුගය 20 mcqs',
      audioExample: 'ලංකා ඉතිහාසය',
      voiceExample: '1833 කෝල්බෲක් ප්‍රතිසංස්කරණ',
      aiExample: 'පොළොන්නරු යුගයේ වාරි පද්ධතිය',
      paperExample: '2021 පසුගිය ප්‍රශ්න පත්‍රය'
    },
    pl: {
      name: 'දේශපාලන විද්‍යාව (Political Science)',
      icon: '⚖️',
      quizExample: 'ආණ්ඩුක්‍රම ව්‍යවස්ථාව 15 mcqs',
      audioExample: 'දේශපාලන විද්‍යාව',
      voiceExample: 'ශ්‍රී ලංකාවේ ව්‍යවස්ථා විකාශනය',
      aiExample: '1978 ආණ්ඩුක්‍රම ව්‍යවස්ථාවේ මූලික ලක්ෂණ',
      paperExample: '2024 පසුගිය ප්‍රශ්න පත්‍රය'
    },
    bs: {
      name: 'ව්‍යාපාර අධ්‍යයනය (Business Studies)',
      icon: '💼',
      quizExample: 'කළමනාකරණය 20 mcqs',
      audioExample: 'ව්‍යාපාර අධ්‍යයනය',
      voiceExample: 'කළමනාකරණ මූලධර්ම සහ 4Ps',
      aiExample: 'අලෙවිකරණ මිශ්‍රණය යනු කුමක්ද?',
      paperExample: '2024 ආදර්ශ ප්‍රශ්න පත්‍රය'
    },
    geo: {
      name: 'භූගෝල විද්‍යාව (Geography)',
      icon: '🌍',
      quizExample: 'භූ විෂමතාව 20 mcqs',
      audioExample: 'ශ්‍රී ලංකාවේ දේශගුණය',
      voiceExample: 'ශ්‍රී ලංකාවේ ප්‍රධාන භූරූප',
      aiExample: 'ශ්‍රී ලංකාවේ ප්‍රධාන ගංගා ගැන විස්තර කරන්න',
      paperExample: '2023 පසුගිය ප්‍රශ්න පත්‍රය'
    },
    dr: {
      name: 'නාට්‍ය හා රංග කලාව (Drama)',
      icon: '🎭',
      quizExample: 'දේශීය නාට්‍ය සම්ප්‍රදාය 15 mcqs',
      audioExample: 'සොකරි නාට්‍ය කලාව',
      voiceExample: 'නූර්ති සහ නාඩගම් සම්ප්‍රදාය',
      aiExample: 'නූර්ති සහ නාඩගම් අතර වෙනස',
      paperExample: '2024 ආදර්ශ ප්‍රශ්න පත්‍රය'
    },
    mu: {
      name: 'සංගීතය (Music)',
      icon: '🎵',
      quizExample: 'රාග සහ තාල 15 mcqs',
      audioExample: 'උත්තර භාරතීය රාගධාරී සංගීතය',
      voiceExample: 'උත්තර භාරතීය රාග සහ තාල',
      aiExample: 'ශුද්ධ ස්වර සහ විකෘත ස්වර',
      paperExample: '2023 පසුගිය ප්‍රශ්න පත්‍රය'
    },
    dn: {
      name: 'නැටුම් / නර්තනය (Dancing)',
      icon: '💃',
      quizExample: 'උඩරට පහතරට නර්තන 15 mcqs',
      audioExample: 'වන්නම් සහ තාල පද්ධතිය',
      voiceExample: 'උඩරට සහ පහතරට නර්තන සම්ප්‍රදාය',
      aiExample: 'කෝලම් සහ සන්නි නැටුම් සම්ප්‍රදාය',
      paperExample: '2024 පසුගිය ප්‍රශ්න පත්‍රය'
    },
    md: {
      name: 'මාධ්‍ය අධ්‍යයනය (Media Studies)',
      icon: '📡',
      quizExample: 'ජනමාධ්‍ය 15 mcqs',
      audioExample: 'ජන සන්නිවේදන මූලධර්ම',
      voiceExample: 'ජන සන්නිවේදන ආකෘති සහ න්‍යාය',
      aiExample: 'ජනමාධ්‍ය සහ ප්‍රජාතන්ත්‍රවාදය',
      paperExample: '2024 ආදර්ශ ප්‍රශ්න පත්‍රය'
    },
    agri: {
      name: 'කෘෂි විද්‍යාව (Agricultural Science)',
      icon: '🌾',
      quizExample: 'පස සහ ශාක පෝෂණය 20 mcqs',
      audioExample: 'කෘෂි විද්‍යාව',
      voiceExample: 'පාංශු කාණ්ඩ සහ ශාක පෝෂණය',
      aiExample: 'ශ්‍රී ලංකාවේ ප්‍රධාන පාංශු කාණ්ඩ සහ ඒවායේ ලක්ෂණ',
      paperExample: '2024 ආදර්ශ ප්‍රශ්න පත්‍රය'
    }
  };

  return subjects[code] || null;
}

// --- Persistent PDF Study Notes & Historical Chat Jump Registry ---
const PDF_REGISTRY_PATH = path.resolve(process.cwd(), 'pdf_notes_registry.json');

// Helper: Generate Direct Telegram Deep Jump Link for Historical Chat Messages
function generateTelegramMessageLink(chatId, messageId, threadId = null, chatUsername = null) {
  if (!chatId || !messageId) return null;
  if (chatUsername) {
    if (threadId) return `https://t.me/${chatUsername}/${threadId}/${messageId}`;
    return `https://t.me/${chatUsername}/${messageId}`;
  }
  const strId = String(chatId);
  if (strId.startsWith('-100')) {
    const stripped = strId.replace(/^-100/, '');
    if (threadId) return `https://t.me/c/${stripped}/${threadId}/${messageId}`;
    return `https://t.me/c/${stripped}/${messageId}`;
  }
  return null;
}

// Helper: Load persistent PDF notes index
function loadPdfRegistry() {
  if (fs.existsSync(PDF_REGISTRY_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(PDF_REGISTRY_PATH, 'utf8'));
    } catch (e) {
      console.error('Error loading pdf notes registry:', e.message);
    }
  }
  return [];
}

// Helper: Save persistent PDF notes index
function savePdfRegistry(registry) {
  try {
    fs.writeFileSync(PDF_REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving pdf notes registry:', e.message);
  }
}

// Helper: Register newly generated / sent PDF study note into persistent index
function registerPdfNote({ subCode, title, filePath, chatId = null, threadId = null, messageId = null, chatUsername = null, fileId = null, type = 'note' }) {
  const registry = loadPdfRegistry();
  const filename = filePath ? path.basename(filePath) : null;
  const link = (chatId && messageId) ? generateTelegramMessageLink(chatId, messageId, threadId, chatUsername) : null;

  const existingIdx = registry.findIndex(r => (filename && r.filename === filename) || (r.subCode === subCode && r.title === title));

  const cleanShortTitle = (title || '').replace(/^(අපොස|උසස් පෙළ|A\/L|\d+[\.\)\-]?)\s*/i, '').trim().substring(0, 28);

  const entry = {
    id: (existingIdx >= 0 && registry[existingIdx].id) || `${subCode}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    subCode: (subCode || 'si').toLowerCase(),
    title: (title || 'අධ්‍යයන සටහන').trim(),
    shortTitle: cleanShortTitle || (title || 'සටහන').trim().substring(0, 24),
    filePath: filePath || (existingIdx >= 0 ? registry[existingIdx].filePath : null),
    filename: filename || (existingIdx >= 0 ? registry[existingIdx].filename : null),
    fileId: fileId || (existingIdx >= 0 ? registry[existingIdx].fileId : null),
    chatId: chatId || (existingIdx >= 0 ? registry[existingIdx].chatId : null),
    threadId: threadId || (existingIdx >= 0 ? registry[existingIdx].threadId : null),
    messageId: messageId || (existingIdx >= 0 ? registry[existingIdx].messageId : null),
    link: link || (existingIdx >= 0 ? registry[existingIdx].link : null),
    type: type,
    createdAt: (existingIdx >= 0 && registry[existingIdx].createdAt) || new Date().toISOString()
  };

  if (existingIdx >= 0) {
    registry[existingIdx] = { ...registry[existingIdx], ...entry };
  } else {
    registry.push(entry);
  }

  savePdfRegistry(registry);
  return entry;
}

// Helper: Query all existing PDF notes for a given subject
function getExistingPdfNotes(subCode = null) {
  const registry = loadPdfRegistry();
  return registry.filter(r => {
    if (subCode && r.subCode !== subCode.toLowerCase()) return false;
    if (r.filePath && fs.existsSync(r.filePath)) return true;
    if (r.link || r.fileId) return true;
    return false;
  });
}

// Helper: Build Subject-Specific PDF Notes Menu showing all existing notes with direct jump buttons
function buildSubjectNotesMessage(subCode) {
  let code = (subCode || '').toLowerCase();
  if (code === 'sin' || code === 'sinhala') code = 'si';
  if (code === 'buddhist') code = 'bc';
  if (code === 'history' || code === 'hi') code = 'hist';
  if (code === 'pol' || code === 'political') code = 'pl';
  if (code === 'bus' || code === 'business') code = 'bs';
  if (code === 'geography' || code === 'geog') code = 'geo';
  if (code === 'media' || code === 'mass_media') code = 'md';
  if (code === 'drama' || code === 'theatre') code = 'dr';
  if (code === 'music' || code === 'sangeetha') code = 'mu';
  if (code === 'dance' || code === 'dancing') code = 'dn';

  const subjectsMeta = {
    si: { name: 'සිංහල (Sinhala)', icon: '🇱🇰' },
    bc: { name: 'බෞද්ධ ශිෂ්ටාචාරය (Buddhist Civ)', icon: '☸️' },
    pl: { name: 'දේශපාලන විද්‍යාව (Political Science)', icon: '⚖️' },
    hist: { name: 'ශ්‍රී ලංකා ඉතිහාසය (History)', icon: '🏛️' },
    geo: { name: 'භූගෝල විද්‍යාව (Geography)', icon: '🌍' },
    bs: { name: 'ව්‍යාපාර අධ්‍යයනය (Business Studies)', icon: '💼' },
    md: { name: 'මාධ්‍ය අධ්‍යයනය (Media Studies)', icon: '📡' },
    dr: { name: 'නාට්‍ය හා රංගකලාව (Drama)', icon: '🎭' },
    mu: { name: 'සංගීතය (Music)', icon: '🎵' },
    dn: { name: 'නර්තනය (Dancing)', icon: '💃' }
  };

  const meta = subjectsMeta[code] || { name: code.toUpperCase(), icon: '📚' };
  const notes = getExistingPdfNotes(code);

  if (notes.length === 0) {
    const emptyMsg =
      `📚 **A/L MCQ HUB — ${meta.icon} ${meta.name}**\n` +
      `📑 **සුරකින ලද PDF අධ්‍යයන සටහන් (Saved Notes)**\n\n` +
      `ℹ️ **දැනට මෙම විෂය යටතේ සකස් කර සුරකින ලද PDF සටහන් නොමැත.**\n\n` +
      `💡 *නව PDF සටහනක් සාදා ගැනීමට: \`/ai_${code} [ඔබගේ පාඩම හෝ මාතෘකාව]\` ලෙස Chat එකට එවන්න.*`;

    const kb = {
      inline_keyboard: [
        [{ text: '🔄 සියලුම විෂයන් (All Subjects)', callback_data: 'allnotes_menu' }]
      ]
    };
    return { text: emptyMsg, reply_markup: kb };
  }

  let msgText =
    `📚 **A/L MCQ HUB — ${meta.icon} ${meta.name}**\n` +
    `📑 **මෙම විෂයෙහි සුරකින ලද සියලුම PDF සටහන් (${notes.length})**\n\n` +
    `පහත දැක්වෙන්නේ මේ වන විට Chat එකට එක් කර ඇති PDF අධ්‍යයන සටහන් වේ. අදාළ පණිවිඩය වෙත සෘජුවම ගොස් PDF ගොනුව විවෘත කිරීමට (Direct Open) පහතින් ඇති බොත්තම ඔබන්න:\n\n`;

  notes.forEach((n, idx) => {
    const num = idx + 1 < 10 ? `0${idx + 1}` : idx + 1;
    if (n.link) {
      msgText += `📌 **${num}.** [${n.title}](${n.link})\n`;
    } else {
      msgText += `📌 **${num}.** ${n.title}\n`;
    }
  });

  msgText += `\n💡 *නව PDF සටහනක් සාදා ගැනීමට: \`/ai_${code} ඔබගේ මාතෘකාව\` ලෙස එවන්න.*`;

  const inline_keyboard = [];
  for (let i = 0; i < notes.length; i += 2) {
    const row = [];
    const n1 = notes[i];
    const num1 = i + 1 < 10 ? `0${i + 1}` : i + 1;
    if (n1.link) {
      row.push({ text: `📖 ${num1}. ${n1.shortTitle}`, url: n1.link });
    } else {
      row.push({ text: `📥 ${num1}. ${n1.shortTitle}`, callback_data: `open_note_${n1.id}` });
    }

    if (i + 1 < notes.length) {
      const n2 = notes[i + 1];
      const num2 = i + 2 < 10 ? `0${i + 2}` : i + 2;
      if (n2.link) {
        row.push({ text: `📖 ${num2}. ${n2.shortTitle}`, url: n2.link });
      } else {
        row.push({ text: `📥 ${num2}. ${n2.shortTitle}`, callback_data: `open_note_${n2.id}` });
      }
    }
    inline_keyboard.push(row);
  }

  inline_keyboard.push([
    { text: '🔄 වෙනත් විෂයක් තෝරන්න (Select Subject)', callback_data: 'allnotes_menu' }
  ]);

  return { text: msgText, reply_markup: { inline_keyboard } };
}

// Helper: Build Main Subject Selector Menu for /allnotes with existing note counts
function buildAllNotesMainMenu() {
  const msgText =
    `📚 **A/L MCQ HUB — සියලුම විෂයන්හි PDF අධ්‍යයන සටහන් (All Subject Study Notes)**\n\n` +
    `උසස් පෙළ විෂය නිර්දේශයේ මේ වන විට සකස් කර සුරකින ලද සියලුම PDF Study Guides වෙත සෘජුවම පිවිසීමට ඔබගේ විෂය පහතින් තෝරන්න:\n\n` +
    `💡 *ඔබ Forum Topic එකක් තුළ සිටී නම් \`/allnotes\` ලෙස එවූ විට සෘජුවම එම විෂයේ සියලුම සටහන් විවෘත වේ.*`;

  const subjectsList = [
    { code: 'si', name: '🇱🇰 සිංහල (Sinhala)' },
    { code: 'bc', name: '☸️ බෞද්ධ ශිෂ්ටාචාරය' },
    { code: 'pl', name: '⚖️ දේශපාලන විද්‍යාව' },
    { code: 'hist', name: '🏛️ ශ්‍රී ලංකා ඉතිහාසය' },
    { code: 'geo', name: '🌍 භූගෝල විද්‍යාව' },
    { code: 'bs', name: '💼 ව්‍යාපාර අධ්‍යයනය' },
    { code: 'md', name: '📡 මාධ්‍ය අධ්‍යයනය' },
    { code: 'dr', name: '🎭 නාට්‍ය හා රංගකලාව' },
    { code: 'mu', name: '🎵 සංගීතය (Music)' },
    { code: 'dn', name: '💃 නර්තනය (Dancing)' },
    { code: 'agri', name: '🌾 කෘෂි විද්‍යාව (Agri Science)' }
  ];

  const inline_keyboard = [];
  for (let i = 0; i < subjectsList.length; i += 2) {
    const row = [];
    const s1 = subjectsList[i];
    const s1Count = getExistingPdfNotes(s1.code).length;
    const s1Label = s1Count > 0 ? `${s1.name} (${s1Count})` : s1.name;
    row.push({ text: s1Label, callback_data: `allnotes_sub_${s1.code}` });

    if (i + 1 < subjectsList.length) {
      const s2 = subjectsList[i + 1];
      const s2Count = getExistingPdfNotes(s2.code).length;
      const s2Label = s2Count > 0 ? `${s2.name} (${s2Count})` : s2.name;
      row.push({ text: s2Label, callback_data: `allnotes_sub_${s2.code}` });
    }
    inline_keyboard.push(row);
  }

  return { text: msgText, reply_markup: { inline_keyboard } };
}

// --- 24/7 Automated Daily Morning Wishes & Animated SVG Inspiration System ---

// Helper: Format date with Sinhala and English month in brackets (e.g. '2026 නිකිණි(August) 16, ඉරිදා')
function formatMorningDate(date = new Date()) {
  const months = [
    { si: 'දුරුතු', en: 'January' },
    { si: 'නවම්', en: 'February' },
    { si: 'මැදින්', en: 'March' },
    { si: 'බක්', en: 'April' },
    { si: 'වෙසක්', en: 'May' },
    { si: 'පොසොන්', en: 'June' },
    { si: 'ඇසළ', en: 'July' },
    { si: 'නිකිණි', en: 'August' },
    { si: 'බිනර', en: 'September' },
    { si: 'වප්', en: 'October' },
    { si: 'ඉල්', en: 'November' },
    { si: 'උඳුවප්', en: 'December' }
  ];

  const days = [
    'ඉරිදා',
    'සඳුදා',
    'අඟහරුවාදා',
    'බදාදා',
    'බ්‍රහස්පතින්දා',
    'සිකුරාදා',
    'සෙනසුරාදා'
  ];

  const colomboDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Colombo' }));
  const year = colomboDate.getFullYear();
  const monthIdx = colomboDate.getMonth();
  const dayNum = colomboDate.getDate();
  const dayOfWeek = colomboDate.getDay();

  const monthObj = months[monthIdx] || { si: 'නිකිණි', en: 'August' };
  const dayName = days[dayOfWeek] || 'ඉරිදා';

  return `${year} ${monthObj.si}(${monthObj.en}) ${dayNum}, ${dayName}`;
}

// Helper: Download background image as Base64 data URI so SVG renders instantly without network delay
async function downloadImageAsBase64(url, timeoutMs = 8000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mime = res.headers.get('content-type') || 'image/jpeg';
      return `data:${mime};base64,${base64}`;
    }
  } catch (e) {
    console.error('Image download note (using vector gradient fallback):', e.message);
  }
  return null;
}

// Helper: Render SVG card into animated GIF for native Telegram in-chat autoplay
function renderSvgToGif(svgPath) {
  return new Promise((resolve) => {
    if (!svgPath) return resolve(null);
    const gifPath = svgPath.replace('.svg', '.gif');
    const py = spawn('python', ['render_morning_animation.py', svgPath, gifPath]);
    const timer = setTimeout(() => {
      try { py.kill(); } catch (e) { }
      resolve(fs.existsSync(gifPath) ? gifPath : null);
    }, 45000); // 45s timeout safeguard

    py.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && fs.existsSync(gifPath)) {
        resolve(gifPath);
      } else {
        resolve(null);
      }
    });
    py.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
  });
}

// Helper: Robust parser for NotebookLM 1200x633 image prompt and caption output
function parseMorningAiResponse(rawText, fallbackPhrase) {
  let imagePrompt = '';
  let captionText = '';

  if (!rawText) {
    return {
      imagePrompt: 'Breathtaking 1200x633 px clean morning sunrise landscape wallpaper, golden beams of light over soft misty hills, no text, clean nature scenery, ultra high resolution 8k',
      captionText: fallbackPhrase?.fullText || 'අද දවස ඔබේ විභාග සිහිනය සැබෑ කරගන්නා ජයග්‍රාහී දිනයක් වේවා!'
    };
  }

  const clean = rawText.replace(/\r/g, '');

  // 1. Extract Image Prompt
  const imgRegex = /(?:\[IMAGE_PROMPT\]|IMAGE_PROMPT|IMAGE PROMPT)[\s\S]*?(?:(?:\r?\n){1,2})([\s\S]*?)(?=(?:\[CAPTION\]|CAPTION|##\s*2|\*\*2|\*{3,}|$))/i;
  const imgMatch = clean.match(imgRegex);

  if (imgMatch && imgMatch[1]) {
    imagePrompt = imgMatch[1]
      .replace(/^[\s*#:\-]+/gm, '')
      .replace(/\*+/g, '')
      .replace(/\[\d+(?:,\s*\d+)*\]/g, '')
      .trim();
  }

  // 2. Extract Caption
  const capRegex = /(?:\[CAPTION\]|CAPTION)[\s\S]*?(?:(?:\r?\n){1,2})([\s\S]*?)(?=(?:\*{3,}|🌅|\Z))/i;
  const capMatch = clean.match(capRegex);

  if (capMatch && capMatch[1]) {
    captionText = capMatch[1]
      .replace(/^[\s*#:\-]+/gm, '')
      .replace(/\*+/g, '')
      .replace(/\[\d+(?:,\s*\d+)*\]/g, '')
      .replace(/\[\d+-\d+\]/g, '')
      .trim();
    captionText = captionText.split(/🌅|\?|🧩/)[0].trim();
  }

  // Fallback: If captionText still contains "IMAGE_PROMPT" or wasn't found
  if (!captionText || captionText.includes('IMAGE_PROMPT')) {
    const lines = clean.split('\n');
    const sinhalaLines = lines.filter(l => /[\u0D80-\u0DFF]/.test(l) && !l.includes('IMAGE_PROMPT') && !l.includes('IMAGE PROMPT'));
    if (sinhalaLines.length > 0) {
      captionText = sinhalaLines.join('\n').replace(/\*+|#+|\[\d+\]/g, '').trim();
    } else {
      captionText = fallbackPhrase?.fullText || 'අද දවස සාර්ථක අධ්‍යාපනික දිනයක් වේවා!';
    }
  }

  // Clean duplicate header preamble from caption text
  captionText = captionText.replace(/^(?:[\s\S]*?(?:උදෑසන සුබ පැතුම|සුබ පැතුම)[\s\S]*?["”]\s*)/i, '').trim();
  if (!captionText) captionText = fallbackPhrase?.fullText || 'අද දවස සාර්ථක දිනයක් වේවා!';

  if (!imagePrompt || /[\u0D80-\u0DFF]/.test(imagePrompt)) {
    imagePrompt = 'Breathtaking 1400x1000 px clean morning sunrise landscape wallpaper, golden beams of light over soft misty hills and peaceful lake, radiant glowing sky, no text, clean nature scenery, ultra high resolution 8k';
  }

  return { imagePrompt, captionText };
}

// Helper: Generate and send daily morning wish with animated SVG/GIF card and NotebookLM motivation
async function generateAndSendDailyMorningWish(targetChatId = null, threadId = null, forced = false) {
  try {
    const phrase = getNextMorningPhrase();
    let imagePrompt = '';
    let captionText = '';
    let bgImageUrl = null;
    let base64Bg = null;

    try {
      const prompt =
        `අද දවසේ උදෑසන ප්‍රාර්ථනා පාඨය: "${phrase.fullText}"\n\n` +
        `ඉහත ප්‍රාර්ථනා පාඨයේ (Phrase) ගැඹුරු අර්ථය, තේමාව සහ හැඟීමට (Meaning, Theme & Emotion) මනාව ගැළපෙන පරිදි පහත කොටස් 2 පමණක් ලබා දෙන්න:\n\n` +
        `1. [IMAGE_PROMPT]: ඉහත පාඨයේ තේමාවට (Meaning/Theme) උපරිමයෙන්ම ගැළපෙන 1400x1000 px ප්‍රමාණයේ අලංකාර උදෑසන දර්ශනයක් සහිත ඡායාරූප විස්තරය (Detailed Artistic Image Generation Prompt in English).\n` +
        `   - පාඨයේ අර්ථය අනුව දර්ශනය ගලපන්න (උදා: පාඩම් මේසය ගැන නම් inspiring study desk with morning sunlight; සන්සුන් මනස ගැන නම් serene lake sunrise; අධිෂ්ඨානය/ජයග්‍රහණය ගැන නම් mountain peak sunrise; ගමන/ඉලක්ක ගැන නම් glowing morning pathway ආදී වශයෙන්).\n` +
        `   - මෙම ඡායාරූපය තුළ කිසිදු අකුරක් හෝ Text නොතිබිය යුතුය (Strictly NO text, NO words, NO letters, NO typography, clean background image).\n` +
        `   - 1400x1000 aspect ratio, ultra-high-definition 8k digital art wallpaper විලාසයෙන් ඉංග්‍රීසි භාෂාවෙන් image prompt එක ලබා දෙන්න.\n\n` +
        `2. [CAPTION]: ඉහත ප්‍රාර්ථනා පාඨය සමඟින් උසස් පෙළ (A/L) සිසුන් සඳහා දිරිගන්වන සුළු, පාඨයේ අර්ථය තවදුරටත් මතු කෙරෙන කෙටි ධනාත්මක සිතුවිල්ලක් (Sinhala Caption).\n\n` +
        `කරුණාකර ඉහත ආකෘතියට පමණක් පිළිතුරු සපයන්න.`;

      const rawAi = await askNotebookLMPython(prompt, NOTEBOOK_ID_MORNING, 'query');
      const parsed = parseMorningAiResponse(rawAi, phrase);
      imagePrompt = parsed.imagePrompt;
      captionText = parsed.captionText;
    } catch (err) {
      console.error('Error fetching morning wish from NotebookLM:', err.message);
      captionText = phrase.fullText;
    }

    // Select curated high-resolution Unsplash morning photography matching the phrase
    const curatedWp = getCuratedMorningWallpaper(phrase.id);
    if (curatedWp && curatedWp.url) {
      bgImageUrl = curatedWp.url;
    } else {
      const cleanImgPrompt = `${imagePrompt}, clean background, no text, no letters, no typography, 8k wallpaper`;
      bgImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanImgPrompt)}?width=1400&height=1000&nologo=true&seed=${(phrase.id * 7919) % 100000}`;
    }

    // Download image as base64 for instant local rendering without network delay
    base64Bg = await downloadImageAsBase64(bgImageUrl, 8000);

    // Generate Animated SVG Document (1400x1000 resolution with embedded clean background image)
    const svgPath = createMorningWishFile(phrase, null, base64Bg || bgImageUrl);

    // Render animated GIF from SVG for native in-chat animation playback in Telegram
    const gifPath = await renderSvgToGif(svgPath);
    const dateFormatted = formatMorningDate();

    // Format safe caption for Telegram (Show full thought up to 650 chars)
    const safeCaptionText = captionText.length > 650
      ? captionText.substring(0, 640).replace(/[,.;\s]+[^\s]*$/, '') + '...'
      : captionText;

    let captionHtml =
      `🌅 <b>A/L MCQ HUB — දවසේ උදෑසන සුබ පැතුම (Morning Wish)</b>\n\n` +
      `✨ <b>${phrase.greeting}</b>\n` +
      `📌 <i>"${phrase.message}"</i>\n\n` +
      (safeCaptionText ? `💡 <b>දවසේ ධනාත්මක සිතුවිල්ල:</b>\n<i>${safeCaptionText}</i>\n\n` : '') +
      `📅 <b>දිනය:</b> ${dateFormatted}\n` +
      `🎯 <b>#උදෑසන_ප්‍රාර්ථනාව #${phrase.id}</b> | <b>#AL_MCQ_HUB</b>`;

    if (captionHtml.length > 950) {
      captionHtml = captionHtml.substring(0, 900) + '...\n\n🎯 <b>#උදෑසන_ප්‍රාර්ථනාව</b>';
    }

    // 1. Single target chat (manual command / test)
    if (targetChatId) {
      const opts = {
        caption: captionHtml,
        parse_mode: 'HTML',
        ...(threadId ? { message_thread_id: threadId } : {})
      };

      // If animated GIF was successfully rendered, send as animation (native Telegram in-chat autoplay)
      if (gifPath && fs.existsSync(gifPath)) {
        try {
          await bot.sendAnimation(targetChatId, gifPath, opts);
          return { success: true, phrase, gifPath, svgPath };
        } catch (animErr) {
          console.error('sendAnimation error, trying document fallback:', animErr.message);
        }
      }

      // Fallback: Send SVG Document
      if (svgPath && fs.existsSync(svgPath)) {
        await bot.sendDocument(targetChatId, svgPath, opts, {
          filename: `morning_wish_${phrase.id}.svg`,
          contentType: 'image/svg+xml'
        }).catch(async () => {
          await bot.sendMessage(targetChatId, captionHtml, {
            parse_mode: 'HTML',
            ...(threadId ? { message_thread_id: threadId } : {})
          });
        });
      } else {
        await bot.sendMessage(targetChatId, captionHtml, {
          parse_mode: 'HTML',
          ...(threadId ? { message_thread_id: threadId } : {})
        });
      }
      return { success: true, phrase, svgPath };
    }

    // 2. Broadcast mode (Scheduled daily morning send to all groups, all subject topics, and target chat)
    const db = readDb();
    const groupEntries = Object.values(db.groups || {});
    const tgTargetChat = (process.env.TG_TARGET_CHAT || '').trim();

    if (tgTargetChat && !db.groups?.[tgTargetChat]) {
      groupEntries.push({ chatId: tgTargetChat, threads: [] });
    }

    console.log(`📢 Broadcasting Morning Wish #${phrase.id} to ${groupEntries.length} registered groups across all subject topics...`);

    for (const group of groupEntries) {
      const gid = group.chatId;
      const threads = (Array.isArray(group.threads) && group.threads.length > 0)
        ? group.threads
        : [null]; // If group has no topics, broadcast once to main feed

      for (const tId of threads) {
        try {
          const opts = {
            caption: captionHtml,
            parse_mode: 'HTML',
            ...(tId ? { message_thread_id: tId } : {})
          };

          if (gifPath && fs.existsSync(gifPath)) {
            await bot.sendAnimation(gid, gifPath, opts);
          } else if (svgPath && fs.existsSync(svgPath)) {
            await bot.sendDocument(gid, svgPath, opts, {
              filename: `morning_wish_${phrase.id}.svg`,
              contentType: 'image/svg+xml'
            });
          } else {
            await bot.sendMessage(gid, captionHtml, opts);
          }
          // Small throttle delay between topic sends to respect Telegram rate limits
          await new Promise(r => setTimeout(r, 500));
        } catch (e) {
          console.error(`Failed to send morning wish to group ${gid} topic ${tId}:`, e.message);
          try {
            const shortCaption = `🌅 <b>${phrase.greeting}</b>\n📌 <i>"${phrase.message}"</i>\n\n🎯 <b>#උදෑසන_ප්‍රාර්ථනාව #${phrase.id}</b>`;
            const fallbackOpts = {
              caption: shortCaption,
              parse_mode: 'HTML',
              ...(tId ? { message_thread_id: tId } : {})
            };
            if (gifPath && fs.existsSync(gifPath)) {
              await bot.sendAnimation(gid, gifPath, fallbackOpts);
            } else {
              await bot.sendMessage(gid, shortCaption, fallbackOpts);
            }
          } catch (e2) { }
        }
      }
    }

    // Update last sent date in Colombo timezone
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
    updateMorningSettings({ lastSentDate: todayStr });

    return { success: true, phrase, svgPath };
  } catch (err) {
    console.error('Error in generateAndSendDailyMorningWish:', err.message);
    return { success: false, error: err.message };
  }
}

// Helper: Generate fallback curriculum questions if NotebookLM is unreachable or slow
function getFallbackQuestionsForSubject(subCode, count = 30) {
  const normSub = (subCode || 'bc').toLowerCase();
  const pool = {
    si: [
      { q: "සිංහල භාෂාවේ ප්‍රකෘති ස්වර ගණන කීයද?", o: ["12", "14", "18", "20"], c: 1, e: "සිංහල හෝඩියේ ප්‍රකෘති ස්වර 14කි (අ, ආ, ඇ, ඈ, ඉ, ඊ, උ, ඌ, ඍ, ඎ, ඏ, ඐ, එ, ඒ, ඔ, ඕ අතුරින්)." },
      { q: "පූර්ව ස්වර ලෝප සන්ධියට නිදසුනක් නොවන්නේ කුමක්ද?", o: ["ගුරුතුමා", "නෙතැබි", "දෙසැටක්", "ගනඳුර"], c: 0, e: "ගුරුතුමා යනු ස්වර ලෝප සන්ධියක් නොවේ." },
      { q: "කර්මධාරය සමාසයට නිදසුන කුමක්ද?", o: ["නිල්මහනෙල්", "මහණදම්", "ගුරුදෙගුරු", "රජගෙදර"], c: 0, e: "විශේෂණ හා විශේෂ්‍ය පද එක්වී සෑදෙන සමාසය කර්මධාරය සමාසයයි." },
      { q: "අමාවතුර කෘතියේ කතුවරයා කවුද?", o: ["ගුරුළුගෝමී", "විද්‍යාචක්‍රවර්තී", "මයුරපාද පරිවේණාධිපති", "ධර්මසේන හිමි"], c: 0, e: "අමාවතුර ගුරුළුගෝමීන්ගේ විශිෂ්ට කෘතියකි." },
      { q: "බුත්සරණ කෘතිය අයත් වන යුගය කුමක්ද?", o: ["පොළොන්නරු යුගය", "දඹදෙණි යුගය", "කුරුණෑගල යුගය", "කෝට්ටේ යුගය"], c: 0, e: "බුත්සරණ පොළොන්නරු යුගයේ විද්‍යාචක්‍රවර්තීන් විසින් රචිතය." }
    ],
    bc: [
      { q: "ප්‍රථම ධර්ම සංගායනාව පැවැත්වුණේ කවර ස්ථානයකද?", o: ["රජගහනුවර සප්තපණ්ණී ලෙන් ද්වාරයේ", "වෛශාලියේ වාලුකාරාමයේ", "පාටලීපුත්‍රයේ අශෝකාරාමයේ", "මාතලේ අලුවිහාරයේ"], c: 0, e: "ප්‍රථම සංගායනාව රජගහනුවර සප්තපණ්ණී ලෙන් ද්වාරයේදී පැවැත්විණි." },
      { q: "දෙවන ධර්ම සංගායනාවට හේතු වූයේ කවර කරුණක්ද?", o: ["දස වස්තුක අධර්මය", "මහාදේවගේ පංච වස්තුව", "භික්ෂූන්ගේ ලාභ සත්කාර ගැටලු", "ධර්මය ග්‍රන්ථාරූඪ කිරීම"], c: 0, e: "වජ්ජිපුත්තක භික්ෂූන්ගේ දස වස්තුව දෙවන සංගායනාවට හේතු විය." },
      { q: "ලක්දිවට බුදුදහම හඳුන්වා දෙන ලද්දේ කාගේ රාජ්‍ය සමයේද?", o: ["දේවානම්පියතිස්ස රජු", "දුටුගැමුණු රජු", "වළගම්බා රජු", "මහාසෙන් රජු"], c: 0, e: "දේවානම්පියතිස්ස රජ සමයේ මිහිඳු මහ රහතන් වහන්සේ වැඩම කළහ." },
      { q: "අභයගිරි විහාරය ආරම්භ කරන ලද්දේ කවර රජු විසින්ද?", o: ["වට්ටගාමිණී අභය (වළගම්බා) රජු", "දුටුගැමුණු රජු", "ධාතුසේන රජු", "මහාසෙන් රජු"], c: 0, e: "ගිරි නිගණ්ඨයාගේ ආරාමය තිබූ තැන වළගම්බා රජු අභයගිරිය කරවන ලදී." },
      { q: "ත්‍රිපිටකය ප්‍රථම වරට ග්‍රන්ථාරූඪ කරන ලද්දේ කවර ස්ථානයේදීද?", o: ["මාතලේ අලුවිහාරයේදී", "අනුරාධපුර මහාවිහාරයේදී", "මිහින්තලයේදී", "තිස්සමහාරාමයේදී"], c: 0, e: "ක්‍රි.පූ. 1 වන සියවසේ වළගම්බා රජ සමයේ මාතලේ අලුවිහාරයේදී ග්‍රන්ථාරූඪ විය." }
    ],
    agri: [
      { q: "ශ්‍රී ලංකාවේ තෙත් කලාපයේ බහුලව දක්නට ලැබෙන ප්‍රධාන පාංශු කාණ්ඩය කුමක්ද?", o: ["රතු කහ පොඩ්සොලික් පස (Red Yellow Podzolic)", "රතු දුඹුරු පස (RBE)", "මැටි පස (Regosols)", "හුණුගල් පස (Calcic)"], c: 0, e: "තෙත් කලාපයේ බහුලවම ඇත්තේ රතු කහ පොඩ්සොලික් පසයි." },
      { q: "පැලෑටි වල නයිට්‍රජන් ඌනතාවයේ ප්‍රධාන ලක්ෂණය කුමක්ද?", o: ["පරණ පත්‍ර කහ පැහැ වීම (Chlorosis)", "නව පත්‍ර කුරු වීම", "මල් හැලී යාම", "මුල් කුණුවීම"], c: 0, e: "නයිට්‍රජන් චලනය වන පෝෂකයක් බැවින් මුලින්ම පරණ පත්‍ර කහ වේ." },
      { q: "ජල සම්පාදනයේදී ඉහළම කාර්යක්ෂමතාවක් සහිත ක්‍රමය කුමක්ද?", o: ["බිංදු ජල සම්පාදනය (Drip Irrigation)", "විසුරුම් ජල සම්පාදනය", "කානු ජල සම්පාදනය", "ගංවතුර ක්‍රමය"], c: 0, e: "බිංදු ජල සම්පාදනයේ කාර්යක්ෂමතාව 90% කටත් වඩා වැඩිය." },
      { q: "හරිතාගාර තුළ වගා කිරීමේ ප්‍රධාන වාසිය කුමක්ද?", o: ["පරිසර සාධක පාලනය කර වසර පුරා අස්වනු ලැබීම", "පොහොර අවශ්‍ය නොවීම", "ජලය අනවශ්‍ය වීම", "පළිබෝධ සම්පූර්ණයෙන්ම නැති වීම"], c: 0, e: "උෂ්ණත්වය, ආර්ද්‍රතාව ආදී පරිසර සාධක පාලනය කළ හැක." },
      { q: "ශාක ප්‍රචාරණයේදී කෘත්‍රීම වෘක්ෂීය ප්‍රචාරණ ක්‍රමයක් වන්නේ කුමක්ද?", o: ["බද්ධ කිරීම (Grafting)", "බීජ මඟින් ප්‍රචාරණය", "බීජාණු මඟින් ප්‍රචාරණය", "ස්වභාවික රයිසෝම"], c: 0, e: "බද්ධ කිරීම කෘත්‍රීම ශාක ප්‍රචාරණ ක්‍රමයකි." }
    ],
    hist: [
      { q: "මහාවංශයේ ප්‍රථම භාගය රචනා කළ කතුවරයා කවුද?", o: ["මහානාම හිමි", "ධම්මකිත්ති හිමි", "තිබ්බටුවාවේ සිද්ධාර්ථ බුද්ධරක්ෂිත හිමි", "හික්කඩුවේ සුමංගල හිමි"], c: 0, e: "මහාවංශයේ පළමු භාගය 5 වන සියවසේ මහානාම හිමියන් විසින් රචිතය." },
      { q: "මහා පරාක්‍රමබාහු රජුගේ අගනුවර වූයේ කුමක්ද?", o: ["පොළොන්නරුව", "අනුරාධපුරය", "දඹදෙණිය", "කුරුණෑගල"], c: 0, e: "මහා පරාක්‍රමබාහු රජු පොළොන්නරුවේ සිට මුළු රටම එක්සේසත් කළේය." },
      { q: "ශ්‍රී ලංකාවේ අවසන් ස්වාධීන සිංහල රජු කවුද?", o: ["ශ්‍රී වික්‍රම රාජසිංහ", "කීර්ති ශ්‍රී රාජසිංහ", "ශ්‍රී වීරපරාක්‍රම නරේන්ද්‍රසිංහ", "විමලධර්මසූරිය I"], c: 2, e: "නරේන්ද්‍රසිංහ රජු ලංකාවේ අන්තිම සිංහල ලේ සහිත රජු වන අතර පසුව නායක්කාර් වංශිකයෝ රජ වූහ." },
      { q: "කන්ද උඩරට ගිවිසුම අත්සන් කරන ලද්දේ කවර වර්ෂයේද?", o: ["1815 මාර්තු 2", "1796 පෙබරවාරි 15", "1803 ජූනි 23", "1818 නොවැම්බර් 26"], c: 0, e: "1815 මාර්තු 02 දින මඟුල් මඩුවේදී උඩරට ගිවිසුම අත්සන් කෙරිණි." },
      { q: "කෝල්බෲක් කැමරන් ප්‍රතිසංස්කරණ ක්‍රියාත්මක වූයේ කවදාද?", o: ["1833", "1910", "1931", "1947"], c: 0, e: "1833 දී ව්‍යවස්ථාදායක හා විධායක සභා පිහිටුවමින් කෝල්බෲක් ප්‍රතිසංස්කරණ ආවේය." }
    ],
    pl: [
      { q: "1978 ශ්‍රී ලංකා ආණ්ඩුක්‍රම ව්‍යවස්ථාවේ ප්‍රධාන ලක්ෂණය කුමක්ද?", o: ["විධායක ජනාධිපති ක්‍රමය", "වෙස්ට්මිනිස්ටර් පාර්ලිමේන්තු ආකෘතිය", "ඒකමණ්ඩල සෙනෙට් සභාව", "පූර්ණ සභාපති පාලනය"], c: 0, e: "1978 ව්‍යවස්ථාවෙන් විධායක ජනාධිපති ධුරය හඳුන්වා දෙන ලදී." },
      { q: "13 වන ආණ්ඩුක්‍රම ව්‍යවස්ථා සංශෝධනය මඟින් හඳුන්වා දුන්නේ කුමක්ද?", o: ["පළාත් සභා ක්‍රමය (Provincial Councils)", "සමානුපාතික ඡන්ද ක්‍රමය", "ජනාධිපති කොමිෂන්", "ජනමත විචාරණ ක්‍රමය"], c: 0, e: "1987 දී 13 වන සංශෝධනය මඟින් පළාත් සභා ස්ථාපිත කෙරිණි." },
      { q: "ප්‍රජාතන්ත්‍රවාදයේ මූලික කුළුණු 3 වන්නේ මොනවාද?", o: ["ව්‍යවස්ථාදායකය, විධායකය, අධිකරණය", "ජනාධිපති, අගමැති, කථානායක", "පොලිසිය, හමුදාව, බන්ධනාගාර", "පාර්ලිමේන්තුව, පළාත් සභාව, ප්‍රාදේශීය සභාව"], c: 0, e: "බලතල බෙදීමේ න්‍යාය අනුව ව්‍යවස්ථාදායකය, විධායකය හා අධිකරණය ප්‍රධාන වේ." },
      { q: "ශ්‍රී ලංකාවේ සර්වජන ඡන්ද බලය හිමි වූයේ කවර වර්ෂයේද?", o: ["1931 ඩොනමෝර් ආණ්ඩුක්‍රමය", "1947 සෝල්බරි ආණ්ඩුක්‍රමය", "1972 ජනරජ ව්‍යවස්ථාව", "1910 කෲව් මැකලම්"], c: 0, e: "1931 ඩොනමෝර් කොමිසම මඟින් ආසියාවේ ප්‍රථම වරට සර්වජන ඡන්ද බලය ලැබිණි." },
      { q: "එක්සත් ජාතීන්ගේ සංවිධානයේ (UN) ප්‍රධාන ආරක්ෂක මණ්ඩලයේ ස්ථිර සාමාජික රටවල් ගණන කීයද?", o: ["5", "10", "15", "20"], c: 0, e: "ස්ථිර සාමාජිකයන් 5 දෙනෙකි (USA, UK, France, Russia, China)." }
    ],
    bs: [
      { q: "ව්‍යාපාර පරිසරයේ බාහිර පරිසර සාධකයක් නොවන්නේ කුමක්ද?", o: ["ආයතනික සංස්කෘතිය (Corporate Culture)", "ආර්ථික පරිසරය", "දේශපාලන පරිසරය", "තාක්ෂණික පරිසරය"], c: 0, e: "ආයතනික සංස්කෘතිය අභ්‍යන්තර පරිසර සාධකයකි." },
      { q: "කළමනාකරණයේ මූලික කෘත්‍යයන් 4 වන්නේ මොනවාද?", o: ["සැලසුම්කරණය, සංවිධානය, මෙහෙයවීම, පාලනය", "නිෂ්පාදනය, අලෙවිකරණය, මූල්‍ය, මානව සම්පත්", "මිලදී ගැනීම, විකිණීම, ගිණුම්කරණය, ප්‍රවාහනය", "ආයෝජනය, ණය ගැනීම, ලාභ බෙදීම, ඉතිරි කිරීම"], c: 0, e: "POLC (Planning, Organizing, Leading, Controlling) කළමනාකරණ කෘත්‍යයන් වේ." },
      { q: "අලෙවිකරණ මිශ්‍රමයේ (4Ps) අංග 4 කුමක්ද?", o: ["භාණ්ඩය, මිල, ස්ථානය, ප්‍රවර්ධනය", "මිනිසුන්, ක්‍රියාවලිය, භෞතික සාක්ෂි, ස්ථානය", "නිෂ්පාදනය, පැකේජය, මිල, ලාභය", "ප්‍රචාරණය, ප්‍රවර්ධනය, පාරිභෝගිකයා, වෙළෙඳපොළ"], c: 0, e: "Product, Price, Place, Promotion යනු 4Ps වේ." },
      { q: "ද්විත්ව සටහන් ගිණුම්කරණ න්‍යාය අනුව වත්කම් වැඩිවීම සටහන් වන්නේ කවර පැත්තේද?", o: ["හර පැත්තේ (Debit)", "බැර පැත්තේ (Credit)", "ශේෂ පත්‍රයේ පමණි", "ලාභ අලාභ ගිණුමේ"], c: 0, e: "වත්කම් සහ වියදම් වැඩිවීම් හර (Dr) වේ." },
      { q: "කොටස් වෙළෙඳපොළේ සුරැකුම්පත් ගනුදෙනු නියාමනය කරන්නේ කවුද?", o: ["ශ්‍රී ලංකා සුරැකුම්පත් හා විනිමය කොමිෂන් සභාව (SEC)", "මහ බැංකුව (CBSL)", "කොළඹ කොටස් වෙළෙඳපොළ (CSE)", "වාණිජ බැංකු"], c: 0, e: "SEC ආයතනය මඟින් සුරැකුම්පත් වෙළෙඳපොළ නියාමනය කරයි." }
    ],
    geo: [
      { q: "ශ්‍රී ලංකාවේ දිගම ගංගාව කුමක්ද?", o: ["මහවැලි ගඟ (335 km)", "මල්වතු ඔය", "කැළණි ගඟ", "කළු ගඟ"], c: 0, e: "මහවැලි ගඟ කිලෝමීටර් 335 ක් දිගැති දිගම ගංගාවයි." },
      { q: "ශ්‍රී ලංකාවේ උසම කඳු මුදුන කුමක්ද?", o: ["පිදුරුතලගාල (2524 m)", "කිරිගල්පොත්ත", "තොටුපොළ කන්ද", "ශ්‍රී පාදය"], c: 0, e: "පිදුරුතලගාල උස මීටර් 2524 කි." },
      { q: "ශ්‍රී ලංකාවට වැඩිම වර්ෂාපතනයක් ලබා දෙන මෝසම් සුළං ප්‍රවාහය කුමක්ද?", o: ["නිරිතදිග මෝසම (Southwest Monsoon)", "ඊසානදිග මෝසම", "පළමු අන්තර් මෝසම", "දෙවන අන්තර් මෝසම"], c: 0, e: "නිරිතදිග මෝසම මඟින් තෙත් කලාපයට අධික වර්ෂාවක් ලැබේ." },
      { q: "ලෝකයේ විශාලතම සාගරය කුමක්ද?", o: ["පැසිෆික් සාගරය (Pacific Ocean)", "අත්ලාන්තික් සාගරය", "ඉන්දියන් සාගරය", "ආක්ටික් සාගරය"], c: 0, e: "පැසිෆික් සාගරය පෘථිවියේ විශාලතම සාගරයයි." },
      { q: "පෘථිවි අභ්‍යන්තරයේ කබොල සහ ප්‍රාවරණය අතර සීමාව හඳුන්වන්නේ කුමන නමකින්ද?", o: ["මොහොරොවිසික් අසන්තතිය (Moho)", "ගුටෙන්බර්ග් අසන්තතිය", "ලෙහ්මාන් අසන්තතිය", "කොන්රඩ් අසන්තතිය"], c: 0, e: "කබොල හා ප්‍රාවරණය අතර Moho අසන්තතිය පිහිටයි." }
    ]
  };

  const subjectPool = pool[normSub] || pool['bc'];
  const results = [];
  while (results.length < count) {
    for (const q of subjectPool) {
      if (results.length >= count) break;
      results.push({ ...q });
    }
  }
  return results.slice(0, count);
}

// --- 24/7 Automated Multi-Subject 2x Daily 3-Round Mega Quiz System ---
async function runMegaScheduledQuizSession(subCode, slotType = 'morning', targetChatId = null, targetThreadId = null) {
  const normSub = (subCode || 'bc').toLowerCase();
  const qSettings = getQuizScheduleSettings();
  const subConfig = qSettings.subjects?.[normSub] || DEFAULT_QUIZ_SCHEDULE.subjects[normSub] || {
    subCode: normSub,
    name: 'උසස් පෙළ විෂය කරුණු',
    topic: 'විෂය නිර්දේශය ප්‍රශ්නාවලිය'
  };

  const meta = getSubjectHelpText(normSub) || { name: subConfig.name };
  const notebookId = getSubjectNotebookId(subConfig.topic, normSub) || NOTEBOOK_ID_BC;
  const stickerPath = getSubjectTransparentSticker(normSub);
  const slotTitle = slotType === 'morning' ? '🌅 උදෑසන (Morning Session)' : (slotType === 'manual' ? '⚡ විශේෂ තරඟාවලිය (Live Session)' : '🌆 සවස (Evening Session)');
  const dateFormatted = new Date().toLocaleDateString('si-LK', { timeZone: 'Asia/Colombo' });

  // 1. Determine target chats
  const targets = [];
  if (targetChatId) {
    targets.push({ chatId: targetChatId, threadId: targetThreadId });
  } else {
    const db = readDb();
    const groupEntries = Object.values(db.groups || {});
    if (groupEntries.length > 0) {
      for (const grp of groupEntries) {
        const gid = grp.chatId || grp.id;
        if (!gid) continue;
        let resolvedThreadId = null;
        if (db.topicSubjects) {
          for (const [key, tObj] of Object.entries(db.topicSubjects)) {
            if (tObj.chatId === gid && tObj.subjectCode === normSub && tObj.threadId) {
              resolvedThreadId = tObj.threadId;
              break;
            }
          }
        }
        targets.push({ chatId: gid, threadId: resolvedThreadId });
      }
    } else if (process.env.TG_TARGET_CHAT) {
      targets.push({ chatId: process.env.TG_TARGET_CHAT, threadId: null });
    }
  }

  if (targets.length === 0) {
    console.log(`[MegaQuizScheduler] No groups found to run scheduled quiz for ${normSub}.`);
    return;
  }

  console.log(`🚀 [MegaQuizScheduler] Starting 3-Round Mega Quiz for ${subConfig.name} (${slotTitle}) across ${targets.length} chat(s)...`);

  for (const target of targets) {
    const { chatId, threadId } = target;
    const targetThreadId = threadId ? Number(threadId) : null;
    const sessionKey = targetThreadId ? `${chatId}_${targetThreadId}` : String(chatId);
    const threadOpts = targetThreadId ? { message_thread_id: targetThreadId } : {};

    // 2. Send 100% Transparent Advertisement Sticker
    if (stickerPath && fs.existsSync(stickerPath)) {
      try {
        await bot.sendSticker(chatId, stickerPath, threadOpts).catch(async () => {
          await bot.sendPhoto(chatId, stickerPath, threadOpts).catch(() => { });
        });
      } catch (stkErr) {
        console.warn(`[MegaQuizScheduler] sendSticker warning:`, stkErr.message);
      }
    }

    // 3. Send Official Tournament Announcement Banner
    const introMsg =
      `🏆 **A/L MCQ HUB — ${meta.name} දෛනික Mega Quiz තරඟාවලිය (${slotTitle})** ⚡\n\n` +
      `📅 **දිනය:** ${dateFormatted}\n` +
      `🎯 **තරඟ වට (Rounds):** වට 3ක් (3 Mega Rounds)\n` +
      `❓ **මුළු ප්‍රශ්න සංඛ්‍යාව:** MCQs 90 (වටයකට ප්‍රශ්න 30 බැගින්)\n` +
      `⏱️ **කාලය:** සෑම ප්‍රශ්නයකටම තත්පර 20 ක කාලයක් (20s Timer)\n\n` +
      `🔥 **සියලුම සිසුන් සූදානම් වන්න! Round 1 (ප්‍රශ්න 30) දැන් සජීවීව ආරම්භ වේ...** 🚀`;

    await safeSendMessage(chatId, introMsg, threadOpts);
    await new Promise(r => setTimeout(r, 3000));

    // 4. Cumulative Mega Session Scores Tracker
    const megaCumulativeScores = {};
    let totalQuestionsExecuted = 0;

    for (let roundNum = 1; roundNum <= 3; roundNum++) {
      console.log(`[MegaQuizScheduler] [Chat ${chatId}] Starting Round ${roundNum}/3 for ${normSub}...`);

      if (roundNum > 1) {
        await safeSendMessage(
          chatId,
          `🎯 **Round ${roundNum}/3 — ${meta.name} (තවත් අලුත්ම ප්‍රශ්න 30ක්)** දැන් සජීවීව ආරම්භ වේ! 🔥`,
          threadOpts
        );
        await new Promise(r => setTimeout(r, 2000));
      }

      // Generate 30 MCQs for this round
      const progressTracker = await startLiveProgressTracker({
        chatId,
        threadId: targetThreadId,
        feature: 'quiz',
        subCode: normSub,
        userTopic: `${subConfig.topic} (Round ${roundNum} 30 mcqs)`,
        requestedBy: `A/L Mega Scheduler (${slotTitle})`,
        totalDurationSec: 180
      });

      const roundPrompt = `${subConfig.topic} round ${roundNum} 30 mcqs`;
      const resText = await askNotebookLMPython(roundPrompt, notebookId, 'quiz');
      await progressTracker.stop();

      let parsedQuestions = [];
      if (resText) {
        parsedQuestions = parseQuizTextToJSON(resText);
      }

      if (!parsedQuestions || parsedQuestions.length < 5) {
        console.warn(`[MegaQuizScheduler] NotebookLM returned ${parsedQuestions?.length || 0} questions. Using fallback curriculum questions...`);
        parsedQuestions = getFallbackQuestionsForSubject(normSub, 30);
      }

      if (!parsedQuestions || parsedQuestions.length === 0) {
        await safeSendMessage(
          chatId,
          `⚠️ **Round ${roundNum} සඳහා ප්‍රශ්න සකස් කර ගැනීමේදී තාක්ෂණික දෝෂයක් මතු විය. ඊළඟ වටය වෙත යොමු කෙරේ...**`,
          threadOpts
        );
        continue;
      }

      // Reset round session
      aiQuizSessions[sessionKey] = {
        creatorName: 'A/L Mega Quiz System',
        creatorMention: '@AL_MCQbot',
        userScores: {},
        threadId: targetThreadId,
        totalAnswers: 0
      };

      await safeSendMessage(
        chatId,
        `⚡ **[Round ${roundNum}/3] ${meta.name} ප්‍රශ්න ${parsedQuestions.length}ක් සජීවීව ලැබෙනු ඇත.**\n` +
        `⏱️ **සෑම ප්‍රශ්නයකටම තත්පර 20 ක කාලයක් හිමි වේ. සූදානම් වන්න!**`,
        threadOpts
      );
      await new Promise(r => setTimeout(r, 2500));

      let consecutiveInactiveCount = 0;
      let roundAborted = false;

      for (let i = 0; i < parsedQuestions.length; i++) {
        if (!aiQuizSessions[sessionKey] || aiQuizSessions[sessionKey].isStopped) {
          roundAborted = true;
          break;
        }

        const qObj = parsedQuestions[i];
        const cleanQ = `[Round ${roundNum} | Q${i + 1}/${parsedQuestions.length}] ${qObj.q}`.substring(0, 290);
        const cleanOpts = qObj.o.map(o => o.substring(0, 95));
        const correctIdx = Math.min(Math.max(0, qObj.c), cleanOpts.length - 1);
        const cleanExplain = qObj.e ? `💡 ${qObj.e.substring(0, 190)}` : undefined;
        const answersBefore = aiQuizSessions[sessionKey]?.totalAnswers || 0;

        let pollMsg = null;
        try {
          pollMsg = await bot.sendPoll(chatId, cleanQ, cleanOpts, {
            type: 'quiz',
            correct_option_id: correctIdx,
            explanation: cleanExplain,
            is_anonymous: false,
            open_period: 20,
            ...threadOpts
          });
        } catch (e1) {
          try {
            pollMsg = await bot.sendPoll(chatId, cleanQ, cleanOpts, {
              type: 'quiz',
              correct_option_id: correctIdx,
              is_anonymous: false,
              open_period: 20,
              ...threadOpts
            });
          } catch (e2) {
            try {
              pollMsg = await bot.sendPoll(chatId, cleanQ, cleanOpts, {
                type: 'regular',
                is_anonymous: false,
                open_period: 20,
                ...threadOpts
              });
            } catch (e3) { }
          }
        }

        if (pollMsg && pollMsg.poll) {
          pollIdMap[pollMsg.poll.id] = {
            chatId,
            sessionKey,
            qIndex: i,
            correctOption: correctIdx
          };
        }

        await new Promise(r => setTimeout(r, 22000));

        if (!aiQuizSessions[sessionKey] || aiQuizSessions[sessionKey].isStopped) {
          roundAborted = true;
          break;
        }

        const answersAfter = aiQuizSessions[sessionKey]?.totalAnswers || 0;
        if (answersAfter === answersBefore && pollMsg) {
          consecutiveInactiveCount++;
        } else {
          consecutiveInactiveCount = 0;
        }

        if (consecutiveInactiveCount >= 4) {
          await safeSendMessage(
            chatId,
            `🛑 **අඛණ්ඩව ප්‍රශ්න 4ක් සඳහා කිසිදු සාමාජිකයෙකු පිළිතුරු ලබා නොදුන් බැවින් මෙම Mega Session එක ස්වයංක්‍රීයව නතර කරන ලදී (Auto-Stopped Due to Inactivity).**`,
            threadOpts
          );
          roundAborted = true;
          break;
        }
      }

      totalQuestionsExecuted += parsedQuestions.length;

      const roundSession = aiQuizSessions[sessionKey];
      if (roundSession && roundSession.userScores) {
        for (const [uid, uInfo] of Object.entries(roundSession.userScores)) {
          if (!megaCumulativeScores[uid]) {
            megaCumulativeScores[uid] = {
              userId: uid,
              name: uInfo.name || 'ශිෂ්‍යයා',
              username: uInfo.username || uInfo.name || 'ශිෂ්‍යයා',
              score: 0
            };
          }
          megaCumulativeScores[uid].score += uInfo.score;
        }
      }

      delete aiQuizSessions[sessionKey];

      if (roundAborted) {
        console.log(`[MegaQuizScheduler] Mega quiz session aborted in chat ${chatId} during round ${roundNum}.`);
        break;
      }

      const roundWinners = roundSession?.userScores ?
        Object.values(roundSession.userScores).sort((a, b) => b.score - a.score) : [];

      let roundMsg = `📊 **A/L MCQ HUB — Round ${roundNum}/3 ජයග්‍රාහකයින් (Round Leaderboard)**\n\n`;
      if (roundWinners.length > 0) {
        roundWinners.slice(0, 5).forEach((w, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏅';
          roundMsg += `${medal} ${idx + 1}. **${escapeMarkdown(w.username || w.name)}** — **${w.score}/${parsedQuestions.length}** ලකුණු 🎉\n`;
        });
      } else {
        roundMsg += `✨ මෙම වටයට එක්වූ සියලුම සාමාජිකයින්ට ස්තුතියි! 👏\n`;
      }

      await safeSendMessage(chatId, roundMsg, threadOpts);

      if (roundNum < 3) {
        await safeSendMessage(
          chatId,
          `⏳ **Round ${roundNum} සාර්ථකව අවසන්!** 🎉\n\n` +
          `🔥 **Round ${roundNum + 1} (තවත් අලුත්ම ප්‍රශ්න 30ක්) තත්පර 10කින් ආරම්භ වේ...** සූදානම් වන්න! ⚡`,
          threadOpts
        );
        await new Promise(r => setTimeout(r, 10000));
      }
    }

    // 5. Grand Mega Championship Overall Leaderboard
    const grandWinners = Object.values(megaCumulativeScores).sort((a, b) => b.score - a.score);
    let finalMsg =
      `🏆 **A/L MCQ HUB — ${meta.name} Mega Quiz Championship අවසන් ලකුණු පුවරුව (Grand Leaderboard)** 👑\n\n` +
      `📅 **දිනය:** ${dateFormatted} | 🎯 **තරඟ වට:** 3/3 සම්පූර්ණයි\n` +
      `❓ **මුළු ප්‍රශ්න සංඛ්‍යාව:** ${totalQuestionsExecuted} MCQs\n\n`;

    if (grandWinners.length > 0) {
      const medals = ['🥇 1st Place (චැම්පියන්)', '🥈 2nd Place (අනුශූරයා)', '🥉 3rd Place (තෙවන ස්ථානය)'];
      grandWinners.forEach((w, idx) => {
        const medalTag = idx < 3 ? medals[idx] : `🏅 ${idx + 1} වන ස්ථානය`;
        finalMsg += `${medalTag}: **${escapeMarkdown(w.username || w.name)}** — **${w.score}/${totalQuestionsExecuted}** ලකුණු 🌟\n`;
      });
      finalMsg += `\n🎉 **අද දින Mega Quiz තරඟාවලියේ විශිෂ්ට ජයග්‍රහණ ලැබූ සියලුම සාමාජිකයින්ට අපගේ උණුසුම් සුබ පැතුම්!** 👏\n\n`;
    } else {
      finalMsg += `✨ අද දින Mega Quiz තරඟාවලියට සාර්ථකව එක්වූ සියලුම සාමාජිකයින්ට අපගේ උණුසුම් සුබ පැතුම්! 👏\n\n`;
    }

    finalMsg +=
      `💡 *ඊළඟ සැලසුම්ගත Mega Quiz තරඟාවලිය නියමිත වේලාවට සජීවීව ආරම්භ වනු ඇත.* 🔥`;

    await safeSendMessage(chatId, finalMsg, threadOpts);
  }
}

// 24/7 Daily Automated Morning Wishes & Multi-Subject Mega Quiz Scheduler (Asia/Colombo Timezone)
setInterval(async () => {
  try {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Colombo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }); // "HH:MM" e.g. "06:00"

    const todayDate = now.toLocaleDateString('en-CA', {
      timeZone: 'Asia/Colombo'
    }); // "YYYY-MM-DD" e.g. "2026-08-16"

    // 1. Morning Wish Scheduler
    const mSettings = getMorningSettings();
    if (mSettings && mSettings.enabled) {
      if (currentTime === mSettings.scheduledTime && mSettings.lastSentDate !== todayDate) {
        console.log(`⏰ [Morning Scheduler] Triggering scheduled morning wish at ${currentTime} (Colombo time) for ${todayDate}...`);
        await generateAndSendDailyMorningWish();
      }
    }

    // 2. Multi-Subject 2x Daily Mega Quiz Scheduler
    const qSettings = getQuizScheduleSettings();
    if (qSettings && qSettings.enabled && qSettings.subjects) {
      for (const [subKey, subSched] of Object.entries(qSettings.subjects)) {
        // Morning Window (5:00 AM - 7:00 AM)
        if (subSched.morningTime && currentTime === subSched.morningTime) {
          if (!isQuizScheduleTriggered(todayDate, subKey, 'morning')) {
            recordQuizScheduleTrigger(todayDate, subKey, 'morning');
            console.log(`⏰ [Quiz Scheduler] Triggering ${subSched.name} Morning Mega Quiz at ${currentTime}...`);
            runMegaScheduledQuizSession(subKey, 'morning').catch(e => console.error(`Error in scheduled quiz for ${subKey}:`, e.message));
          }
        }
        // Evening Window (6:00 PM - 10:00 PM)
        if (subSched.eveningTime && currentTime === subSched.eveningTime) {
          if (!isQuizScheduleTriggered(todayDate, subKey, 'evening')) {
            recordQuizScheduleTrigger(todayDate, subKey, 'evening');
            console.log(`⏰ [Quiz Scheduler] Triggering ${subSched.name} Evening Mega Quiz at ${currentTime}...`);
            runMegaScheduledQuizSession(subKey, 'evening').catch(e => console.error(`Error in scheduled quiz for ${subKey}:`, e.message));
          }
        }
      }
    }
  } catch (e) {
    console.error('Error in 24/7 scheduler interval:', e.message);
  }
}, 30000); // Check every 30 seconds

// Helper: Run Active Question Flow for AI Quiz Competitions
async function runLiveQuizQuestions(chatId, threadId, sessionKey, reqUser, parsedQuestions, subCode, userTopic) {
  const reqName = [reqUser.first_name, reqUser.last_name].filter(Boolean).join(' ') || 'ශිෂ්‍යයා';
  const reqUsername = reqUser.username ? `@${reqUser.username}` : reqName;
  const safeReqUsername = escapeMarkdown(reqUsername);
  const targetThreadId = threadId ? Number(threadId) : null;
  const threadOpts = targetThreadId ? { message_thread_id: targetThreadId } : {};

  aiQuizSessions[sessionKey] = aiQuizSessions[sessionKey] || {
    creatorName: reqName,
    creatorMention: reqUsername,
    userScores: {},
    threadId: targetThreadId
  };

  const displayTitle = userTopic ? escapeMarkdown(userTopic) : 'Live AI Quiz Competition';
  const bannerHeader = displayTitle.startsWith('A/L MCQ HUB') ? displayTitle : `A/L MCQ HUB — ${displayTitle}`;

  await safeSendMessage(
    chatId,
    `🏆 **${bannerHeader} (${parsedQuestions.length} MCQ Polls)**\n\n` +
    `👤 **ආරම්භ කළේ:** ${safeReqUsername}\n` +
    `⏱️ **සෑම ප්‍රශ්නයකටම තත්පර 20 ක කාලයක් (20 Seconds Timer) හිමි වේ.**\n` +
    `🔥 සූදානම් වන්න! පළමු ප්‍රශ්නය දැන් සජීවීව ලැබෙනු ඇත...`,
    threadOpts
  );

  await new Promise(r => setTimeout(r, 2000));

  let consecutiveInactiveCount = 0;

  for (let i = 0; i < parsedQuestions.length; i++) {
    if (!aiQuizSessions[sessionKey] || aiQuizSessions[sessionKey].isStopped) {
      console.log(`🛑 AI Quiz Competition in chat ${chatId} (thread=${targetThreadId || 'none'}) was manually stopped before question ${i + 1}`);
      break;
    }

    const qObj = parsedQuestions[i];
    const cleanQ = `[Q${i + 1}/${parsedQuestions.length}] ${qObj.q}`.substring(0, 290);
    const cleanOpts = qObj.o.map(o => o.substring(0, 95));
    const correctIdx = Math.min(Math.max(0, qObj.c), cleanOpts.length - 1);
    const cleanExplain = qObj.e ? `💡 ${qObj.e.substring(0, 190)}` : undefined;

    const answersBefore = aiQuizSessions[sessionKey] ? (aiQuizSessions[sessionKey].totalAnswers || 0) : 0;

    let pollMsg = null;
    const targetThreadId = threadId ? Number(threadId) : null;
    const threadOpts = targetThreadId ? { message_thread_id: targetThreadId } : {};

    // Attempt 1: Native Quiz Poll with 20s Timer & Explanation
    try {
      pollMsg = await bot.sendPoll(chatId, cleanQ, cleanOpts, {
        type: 'quiz',
        correct_option_id: correctIdx,
        explanation: cleanExplain,
        is_anonymous: false,
        open_period: 20,
        ...threadOpts
      });
    } catch (err1) {
      console.error(`Attempt 1 failed for poll Q${i + 1}:`, err1.message);
      // Attempt 2: Quiz Poll without explanation (explanation sometimes causes 400 Bad Request)
      try {
        pollMsg = await bot.sendPoll(chatId, cleanQ, cleanOpts, {
          type: 'quiz',
          correct_option_id: correctIdx,
          is_anonymous: false,
          open_period: 20,
          ...threadOpts
        });
      } catch (err2) {
        console.error(`Attempt 2 failed for poll Q${i + 1}:`, err2.message);
        // Attempt 3: Regular Poll (in case group permissions restrict quiz polls)
        try {
          pollMsg = await bot.sendPoll(chatId, cleanQ, cleanOpts, {
            type: 'regular',
            is_anonymous: false,
            open_period: 20,
            ...threadOpts
          });
        } catch (err3) {
          console.error(`Attempt 3 failed for poll Q${i + 1}:`, err3.message);
          // Attempt 4: Text formatted question if group completely blocks sendPoll
          try {
            const textFallback =
              `📝 **[Q${i + 1}/${parsedQuestions.length}] ${qObj.q}**\n\n` +
              cleanOpts.map((opt, oi) => `🔹 **(${oi + 1})** ${opt}`).join('\n') +
              `\n\n⏱️ **තත්පර 20 කින් නිවැරදි පිළිතුර විවරණය සමඟින් ලැබෙනු ඇත...**`;
            await safeSendMessage(chatId, textFallback, threadOpts);
          } catch (err4) {
            console.error(`Attempt 4 text fallback failed for Q${i + 1}:`, err4.message);
          }
        }
      }
    }

    if (pollMsg && pollMsg.poll) {
      pollIdMap[pollMsg.poll.id] = {
        chatId,
        sessionKey,
        qIndex: i,
        correctOption: correctIdx
      };
    }

    // Wait 22 seconds (20s open_period + 2s reveal buffer) for ALL questions, including the final question
    await new Promise(r => setTimeout(r, 22000));

    if (!aiQuizSessions[sessionKey] || aiQuizSessions[sessionKey].isStopped) {
      console.log(`🛑 AI Quiz Competition in chat ${chatId} (thread=${threadId || 'none'}) was manually stopped after question ${i + 1}`);
      break;
    }

    const answersAfter = aiQuizSessions[sessionKey] ? (aiQuizSessions[sessionKey].totalAnswers || 0) : 0;
    if (answersAfter === answersBefore && pollMsg) {
      consecutiveInactiveCount++;
    } else {
      consecutiveInactiveCount = 0; // Reset counter if at least 1 person answered or fallback mode
    }

    if (consecutiveInactiveCount >= 4) {
      const restartHint = subCode ? `/quiz_${subCode}` : '/quiz';
      await safeSendMessage(
        chatId,
        `🛑 **අඛණ්ඩව ප්‍රශ්න 4ක් සඳහා කිසිදු සාමාජිකයෙකු පිළිතුරු ලබා නොදුන් බැවින් Quiz Competition තරඟය ස්වයංක්‍රීයව නතර කරන ලදී (Auto-Stopped Due to Inactivity).**\n\n` +
        `💡 *නැවත තරඟයක් ආරම්භ කිරීමට \`${restartHint}\` ලෙස එවන්න.*`,
        threadOpts
      );
      break;
    }
  }

  // Allow 3 seconds extra buffer for all final poll_answer events to finish processing
  await new Promise(r => setTimeout(r, 3000));

  const aiSession = aiQuizSessions[sessionKey];
  if (aiSession && !aiSession.isStopped) {
    const sortedWinners = (aiSession && aiSession.userScores) ?
      Object.values(aiSession.userScores).sort((a, b) => b.score - a.score) : [];

    const displayTitle = userTopic ? escapeMarkdown(userTopic) : 'Live AI Quiz Competition';
    const bannerHeader = displayTitle.startsWith('A/L MCQ HUB') ? displayTitle : `A/L MCQ HUB — ${displayTitle}`;

    let completionMsg =
      `🏆 **${bannerHeader} ජයග්‍රාහකයින් (Winners Leaderboard)**\n\n`;

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

    let restartUsageText = '';
    const meta = getSubjectHelpText(subCode);
    if (meta) {
      restartUsageText =
        `💡 **නැවත ${meta.name} විෂයෙන් Quiz එකක් ආරම්භ කිරීමට:**\n` +
        `• \`/quiz_${subCode} ${meta.quizExample}\`\n\n` +
        `📚 **අනෙකුත් විශේෂාංග:**\n` +
        `• \`/audio_${subCode} ${meta.audioExample}\`\n` +
        `• \`/ai_${subCode} ${meta.aiExample}\``;
    } else {
      restartUsageText =
        `💡 **නැවත ඔබ කැමති මාතෘකාවකින් Quiz එකක් ආරම්භ කිරීමට:**\n` +
        `⏳ *(විධානය ලබා දුන් පසු ප්‍රශ්න පත්‍රය සකස් වන තෙක් මිනිත්තු 2-3 ක් රැඳී සිටින්න)*\n\n` +
        `👉 **විෂය අනුව Commands භාවිත කරන ආකාරය:**\n` +
        `• 🇱🇰 **සිංහල:** \`/quiz_si සමාස, සන්ධි 20 mcqs\`\n` +
        `• ☸️ **බෞද්ධ ශිෂ්ටාචාරය:** \`/quiz_bc සංගායනා 15 mcqs\`\n` +
        `• 🏛️ **ඉතිහාසය:** \`/quiz_hist අනුරාධපුර යුගය 20 mcqs\`\n` +
        `• ⚖️ **දේශපාලන විද්‍යාව:** \`/quiz_pl ආණ්ඩුක්‍රම ව්‍යවස්ථාව 15 mcqs\`\n` +
        `• 💼 **ව්‍යාපාර අධ්‍යයනය:** \`/quiz_bs කළමනාකරණය 20 mcqs\``;
    }

    completionMsg +=
      `🙏 **මෙම AI Quiz තරඟය නිර්මාණය කර දීමට මූලික වූ ${safeReqUsername} සාමාජිකයාට අපගේ විශේෂ ස්තුතිය!** ❤️\n\n` +
      `-----------------------------------------\n` +
      `${restartUsageText}`;

    await safeSendMessage(chatId, completionMsg, threadOpts);
  }
  delete aiQuizSessions[sessionKey];
}

// Helper: Start Live AI Quiz Competition with Native Telegram Polls & 20-Second Timers
async function startAIQuizCompetition(msg, chatId, userTopic, subCode = null) {
  const { threadId, topicSubject } = getThreadContext(msg);
  const targetThreadId = threadId ? Number(threadId) : null;
  const effectiveSubCode = subCode || topicSubject;
  const sessionKey = targetThreadId ? `${chatId}_${targetThreadId}` : String(chatId);
  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(targetThreadId ? { message_thread_id: targetThreadId } : {})
  };

  const reqUser = msg.from || {};
  const reqName = [reqUser.first_name, reqUser.last_name].filter(Boolean).join(' ') || 'ශිෂ්‍යයා';
  const reqUsername = reqUser.username ? `@${reqUser.username}` : reqName;
  const safeReqUsername = escapeMarkdown(reqUsername);

  aiQuizSessions[sessionKey] = {
    creatorName: reqName,
    creatorMention: reqUsername,
    userScores: {},
    threadId: targetThreadId
  };

  // Immediate chat action typing status
  bot.sendChatAction(chatId, 'typing', targetThreadId ? { message_thread_id: targetThreadId } : {}).catch(() => { });
  const chatActionInterval = setInterval(() => {
    bot.sendChatAction(chatId, 'typing', threadId ? { message_thread_id: threadId } : {}).catch(() => { });
  }, 4000);

  const progressTracker = await startLiveProgressTracker({
    chatId,
    threadId: targetThreadId,
    replyToMsgId: msg.message_id,
    feature: 'quiz',
    subCode: effectiveSubCode,
    userTopic,
    requestedBy: reqUsername,
    totalDurationSec: 240
  });

  const notebookId = getSubjectNotebookId(userTopic, effectiveSubCode || 'bc') || 'cb5c3e92-b77c-4a84-9b7f-11d543a1d46c';
  console.log(`🧩 Quiz Competition requested for chat ${chatId} (thread=${threadId || 'none'}) by ${reqUsername} (subCode=${effectiveSubCode || 'auto'}): topic="${userTopic}"`);

  const resText = await askNotebookLMPython(userTopic, notebookId, 'quiz');
  clearInterval(chatActionInterval);
  await progressTracker.stop();

  if (resText) {
    const parsedQuestions = parseQuizTextToJSON(resText);

    if (parsedQuestions && parsedQuestions.length > 0) {
      await runLiveQuizQuestions(chatId, threadId, sessionKey, reqUser, parsedQuestions, effectiveSubCode, userTopic);
    } else {
      // Fallback: NotebookLM returned a rich AI Study Guide instead of MCQs!
      console.log(`ℹ️ Quiz parser found 0 MCQs, delivering full AI Study Guide & PDF for chat ${chatId}`);
      const formattedReply =
        `🤖 <b>A/L MCQ HUB AI Tutor — සවිස්තරාත්මක අධ්‍යයන සටහන:</b>\n\n` +
        `${formatAITextForTelegram(resText)}\n\n` +
        `💡 <i>තවත් ප්‍රශ්නයක් ඇසීමට <code>/ai ඔබගේ ප්‍රශ්නය</code> (හෝ <code>/ai_si</code>, <code>/ai_bc</code>) ලෙස එවන්න.</i>`;

      await sendLongMessage(chatId, formattedReply, { parse_mode: 'HTML', ...replyOpts }).catch(e => console.error('Error sending AI study note fallback:', e.message));

      // Generate & send PDF document (pass subCode for subject colour theme)
      bot.sendChatAction(chatId, 'upload_document', threadId ? { message_thread_id: threadId } : {}).catch(() => { });
      const pdfFilename = formatPdfFilename(effectiveSubCode, userTopic, 'Study_Guide');
      const pdfPath = await generatePDFNote(userTopic, resText, effectiveSubCode || 'auto', 'note', pdfFilename);
      if (pdfPath && fs.existsSync(pdfPath)) {
        const cleanPrompt = escapeMarkdown(userTopic || 'අධ්‍යයන සටහන');
        await bot.sendDocument(chatId, pdfPath, {
          caption: `📄 <b>A/L MCQ HUB AI Tutor — Structured PDF Study Guide</b>\n\n` +
            `📌 <b>මාතෘකාව:</b> ${cleanPrompt}\n\n` +
            `💡 <i>ඔබට මෙම සම්පූර්ණ අධ්‍යයන සටහන PDF ගොනුවක් ලෙස Download කර මුද්‍රණය (Print) කරගත හැක.</i>`,
          parse_mode: 'HTML',
          ...replyOpts
        }, {
          filename: `${pdfFilename}.pdf`,
          contentType: 'application/pdf'
        }).catch(e => console.error('Error sending PDF document fallback:', e.message));
        fs.unlink(pdfPath, () => { });
      }
      delete aiQuizSessions[sessionKey];
    }
  } else {
    await safeSendMessage(chatId, `⚠️ **Quiz ජනනය කිරීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.**`, replyOpts);
    delete aiQuizSessions[sessionKey];
  }
}

// Command: /stop or /stop_quiz or /stopquiz or /cancel or /end_quiz (Manually Stop Active Quiz Sessions)
bot.onText(/\/(stop|stop_quiz|stopquiz|cancel|end_quiz)(@\w+)?/i, async (msg) => {
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const { threadId, topicSubject } = getThreadContext(msg);
  const sessionKey = threadId ? `${chatId}_${threadId}` : String(chatId);
  const user = msg.from || {};
  const reqName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'සාමාජිකයා';
  const reqUsername = user.username ? `@${user.username}` : reqName;
  const safeReqUsername = escapeMarkdown(reqUsername);
  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  let stoppedAny = false;

  // 1. Stop Active Live AI Quiz Competition
  if (aiQuizSessions[sessionKey]) {
    aiQuizSessions[sessionKey].isStopped = true;
    delete aiQuizSessions[sessionKey];
    stoppedAny = true;
  }

  // 2. Stop Standard Scheduled / Interactive Paper Session
  if (userPollSessions[sessionKey] || userPollSessions[chatId]) {
    const s = userPollSessions[sessionKey] || userPollSessions[chatId];
    if (s && s.timerId) {
      clearTimeout(s.timerId);
    }
    delete userPollSessions[sessionKey];
    delete userPollSessions[chatId];
    stoppedAny = true;
  }

  if (stoppedAny) {
    const restartCmd = topicSubject ? `/quiz_${topicSubject}` : '/quiz';
    await safeSendMessage(
      chatId,
      `🛑 **A/L MCQ HUB — Quiz Competition තරඟය සාර්ථකව නතර කරන ලදී (Quiz Stopped Successfully)!**\n\n` +
      `👤 **නතර කළේ:** ${safeReqUsername}\n\n` +
      `💡 *නැවත අලුත් තරඟයක් ආරම්භ කිරීමට \`${restartCmd}\` ලෙස එවන්න.*`,
      replyOpts
    );
  } else {
    const restartCmd = topicSubject ? `/quiz_${topicSubject}` : '/quiz';
    await safeSendMessage(
      chatId,
      `ℹ️ **දැනට මෙම චැට් එක තුළ සක්‍රීය Quiz තරඟයක් පවත්නේ නැත (No Active Quiz Running).**\n\n` +
      `💡 *නව තරඟයක් ආරම්භ කිරීමට \`${restartCmd}\` ලෙස එවන්න.*`,
      replyOpts
    );
  }
});

// Helper: Deliver AI Tutor Note & PDF Study Guide Document
async function triggerAITutorNote(chatId, fromUser, subCode, userPrompt, replyToMsgId = null, threadId = null) {
  const replyOpts = {
    ...(replyToMsgId ? { reply_to_message_id: replyToMsgId } : {}),
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  console.log(`🤖 A/L MCQ HUB AI Request received from ${chatId} (thread=${threadId || 'none'}, subCode=${subCode || 'auto'}): "${userPrompt}"`);
  bot.sendChatAction(chatId, 'typing', threadId ? { message_thread_id: threadId } : {}).catch(() => { });

  const reqUsername = fromUser ? (fromUser.username ? `@${fromUser.username}` : [fromUser.first_name, fromUser.last_name].filter(Boolean).join(' ')) : 'ශිෂ්‍යයා';
  const progressTracker = await startLiveProgressTracker({
    chatId,
    threadId,
    replyToMsgId,
    feature: 'ai',
    subCode,
    userTopic: userPrompt,
    requestedBy: reqUsername,
    totalDurationSec: 240
  });

  try {
    const aiAnswer = await askGeminiAI(userPrompt, subCode);
    console.log(`🤖 A/L MCQ HUB AI Response obtained (${aiAnswer ? aiAnswer.length : 0} chars)`);
    await progressTracker.stop();

    const formattedReply =
      `🤖 <b>A/L MCQ HUB AI Tutor පිළිතුර:</b>\n\n` +
      `${formatAITextForTelegram(aiAnswer)}\n\n` +
      `💡 <i>තවත් ප්‍රශ්නයක් ඇසීමට <code>/ai ඔබගේ ප්‍රශ්නය</code> (හෝ <code>/ai_si</code>, <code>/ai_bc</code>) ලෙස එවන්න.</i>`;

    await sendLongMessage(chatId, formattedReply, { parse_mode: 'HTML', ...replyOpts }).catch(e => console.error('Error sending AI response:', e.message));

    // Deliver any dynamic Mermaid diagrams as high-resolution in-chat photos
    const diagData = extractMermaidDiagrams(aiAnswer, subCode || 'auto');
    if (diagData && diagData.diagrams && diagData.diagrams.length > 0) {
      bot.sendChatAction(chatId, 'upload_photo', threadId ? { message_thread_id: threadId } : {}).catch(() => { });
      const cleanPrompt = escapeMarkdown(userPrompt || 'අධ්‍යයන සටහන');
      for (const diag of diagData.diagrams) {
        try {
          const photoTarget = await renderHighResDiagramPng(diag.code, subCode || 'auto') || diag.url;
          await bot.sendPhoto(chatId, photoTarget, {
            caption: `📊 <b>A/L MCQ HUB AI Tutor — රූප සටහන (Diagram)</b>\n\n` +
              `📌 <b>මාතෘකාව / Point:</b> ${cleanPrompt}\n\n` +
              `💡 <i>මෙම රූප සටහන පහත PDF අධ්‍යයන සටහන තුළද අන්තර්ගත වේ.</i>`,
            parse_mode: 'HTML',
            ...replyOpts
          });
        } catch (diagErr) {
          console.error('Notice sending diagram photo:', diagErr.message);
        }
      }
    }

    // Send PDF Study Guide Document as downloadable file (pass subCode for subject colour theme)
    bot.sendChatAction(chatId, 'upload_document', threadId ? { message_thread_id: threadId } : {}).catch(() => { });
    const pdfFilename = formatPdfFilename(subCode, userPrompt, 'Study_Note');
    const pdfPath = await generatePDFNote(userPrompt, aiAnswer, subCode || 'auto', 'note', pdfFilename);
    if (pdfPath && fs.existsSync(pdfPath)) {
      const cleanPrompt = escapeMarkdown(userPrompt || 'අධ්‍යයන සටහන');
      const sentDoc = await bot.sendDocument(chatId, pdfPath, {
        caption: `📄 <b>A/L MCQ HUB AI Tutor — Structured PDF Study Guide</b>\n\n` +
          `📌 <b>මාතෘකාව:</b> ${cleanPrompt}\n\n` +
          `💡 <i>ඔබට මෙම සම්පූර්ණ අධ්‍යයන සටහන PDF ගොනුවක් ලෙස Download කර මුද්‍රණය (Print) කරගත හැක.</i>`,
        parse_mode: 'HTML',
        ...replyOpts
      }, {
        filename: `${pdfFilename}.pdf`,
        contentType: 'application/pdf'
      }).catch(e => console.error('Error sending PDF document:', e.message));

      if (sentDoc) {
        registerPdfNote({
          subCode: subCode,
          title: userPrompt,
          filePath: pdfPath,
          chatId: chatId,
          threadId: threadId,
          messageId: sentDoc.message_id,
          chatUsername: sentDoc.chat?.username || null,
          fileId: sentDoc.document?.file_id || null,
          type: 'note'
        });
      }
    }
  } catch (err) {
    console.error('Error in triggerAITutorNote execution:', err.message);
    if (statusMsg && statusMsg.message_id) {
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => { });
    }
    bot.sendMessage(chatId, '⚠️ **පිළිතුර යැවීමේදී තාවකාලික දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.**', replyOpts).catch(() => { });
  }
}

// Command: /ai <prompt> or /ask <prompt> or /ai_si <prompt> etc.
bot.onText(/\/(ai|ask)(?:_([a-z0-9_]+))?(@\w+)?\s*(.*)/i, async (msg, match) => {
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const { threadId, topicSubject } = getThreadContext(msg);
  let rawSubArg = match[2] ? match[2].trim().toLowerCase() : null;
  let userPrompt = match[4] ? match[4].trim() : '';

  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  // Support space syntax: /ai si ..., /ai sin ..., /ai bc ..., /ai hist ..., /ai pl ..., /ai bs ...
  if (!rawSubArg && userPrompt) {
    const parts = userPrompt.split(/\s+/);
    const candidate = normalizeSubjectCode(parts[0]);
    if (candidate) {
      rawSubArg = parts[0];
      userPrompt = parts.slice(1).join(' ');
    }
  }

  // Topic Subject Isolation Validation
  const validation = validateTopicSubjectMatch({
    explicitSubCode: rawSubArg,
    userPrompt,
    topicSubject
  });

  if (!validation.isAllowed) {
    const warningText = buildTopicSubjectRestrictionMessage(validation.currentTopicSubject, validation.targetSubject);
    return bot.sendMessage(chatId, warningText, { parse_mode: 'HTML', ...replyOpts });
  }

  const effectiveSubCode = validation.effectiveSubCode || topicSubject;

  // If prompt explicitly requests MCQs/Quiz/Competition, auto-route to Quiz Competition!
  const isExplicitQuizRequest = userPrompt.match(/\b(mcq|mcqs|quiz|quez|competition|බහුවරණ|ක්විස්|තරඟය|mcq\s*ප්‍රශ්න|බහුවරණ\s*ප්‍රශ්න)\b/i) &&
    !userPrompt.match(/\b(විචාර|සටහන|විස්තර|පැහැදිලි|උපුටාගැනීම්|රචනා|විභාග\s*ප්‍රශ්න|අධ්‍යයන)\b/i);

  if (isExplicitQuizRequest) {
    return startAIQuizCompetition(msg, chatId, userPrompt, effectiveSubCode);
  }

  if (!userPrompt) {
    if (effectiveSubCode) {
      const meta = getSubjectHelpText(effectiveSubCode);
      const sName = meta ? meta.name : effectiveSubCode.toUpperCase();
      const ex = meta ? meta.aiExample : 'සටහන පැහැදිලි කරන්න';
      const usageMsg =
        `🤖 **A/L MCQ HUB — ${sName} AI Tutor**\n\n` +
        `ඔබට ඇති ඕනෑම ${sName} ප්‍රශ්නයක් අසන්න:\n\n` +
        `👉 **භාවිත කරන ආකාරය:** \`/ai ඔබගේ ප්‍රශ්නය\` (හෝ \`/ai_${effectiveSubCode} ඔබගේ ප්‍රශ්නය\`)\n\n` +
        `📌 **උදාහරණ:**\n` +
        `• \`/ai ${ex}\``;
      return bot.sendMessage(chatId, usageMsg, { parse_mode: 'Markdown', ...replyOpts }).catch(() => { });
    }

    const usageMsg =
      `🤖 **A/L MCQ HUB AI Tutor — භාවිත කරන ආකාරය**\n\n` +
      `ඔබට ඇති ඕනෑම උසස් පෙළ ප්‍රශ්නයක් අසන්න:\n\n` +
      `👉 **සාමාන්‍ය ආකෘතිය:** \`/ai ඔබගේ ප්‍රශ්නය\`\n` +
      `👉 **විශේෂිත විෂය සටහන් (Subject-Specific):**\n` +
      `• \`/ai_si\` හෝ \`/ai si\` — සිංහල (Sinhala)\n` +
      `• \`/ai_bc\` හෝ \`/ai bc\` — බෞද්ධ ශිෂ්ටාචාරය (Buddhist Civ)\n` +
      `• \`/ai_hist\` හෝ \`/ai hist\` — ඉතිහාසය (History)\n` +
      `• \`/ai_pl\` හෝ \`/ai pl\` — දේශපාලන විද්‍යාව (Political Science)\n` +
      `• \`/ai_bs\` හෝ \`/ai bs\` — ව්‍යාපාර අධ්‍යයනය (Business Studies)\n` +
      `• \`/ai_geo\` හෝ \`/ai geo\` — භූගෝල විද්‍යාව (Geography)\n` +
      `• \`/ai_md\` හෝ \`/ai md\` — මාධ්‍ය අධ්‍යයනය (Media Studies)\n` +
      `• \`/ai_agri\` හෝ \`/ai agri\` — කෘෂි විද්‍යාව (Agri Science)\n\n` +
      `📌 **උදාහරණ:**\n` +
      `• \`/ai_si සන්ධි යනු කුමක්ද?\` \n` +
      `• \`/ai_bc අභයගිරි නිකාය ආරම්භ වීමට හේතු මොනවාද?\` \n` +
      `• \`/ai_agri ශ්‍රී ලංකාවේ ප්‍රධාන පාංශු කාණ්ඩ සහ ඒවායේ ලක්ෂණ\` \n` +
      `• \`/ai_geo ශ්‍රී ලංකාවේ ප්‍රධාන ගංගා ගැන විස්තර කරන්න\` \n` +
      `• \`/ai_md ජනමාධ්‍ය සහ ප්‍රජාතන්ත්‍රවාදය අතර සම්බන්ධය\``;

    return bot.sendMessage(chatId, usageMsg, { parse_mode: 'Markdown', ...replyOpts }).catch(() => { });
  }

  return triggerAITutorNote(chatId, msg.from, effectiveSubCode, userPrompt, msg.message_id, threadId);
});

// Command: /allnotes or /notes (Browse & Download All Core Syllabus PDF Study Notes per Subject)
bot.onText(/\/(allnotes|notes|all_notes)(?:_([a-z]+))?(@\w+)?\s*(.*)/i, async (msg, match) => {
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const { threadId, topicSubject } = getThreadContext(msg);
  let subCode = match[2] ? match[2].trim().toLowerCase() : topicSubject;
  let userArg = match[4] ? match[4].trim().toLowerCase() : '';

  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  if (!subCode && userArg) {
    const parts = userArg.split(/\s+/);
    const candidate = parts[0].toLowerCase();
    if (['si', 'sin', 'sinhala', 'bc', 'buddhist', 'hi', 'hist', 'history', 'pl', 'pol', 'political', 'bs', 'bus', 'business', 'geo', 'geog', 'geography', 'md', 'media', 'dr', 'drama', 'mu', 'music', 'dn', 'dance', 'dancing', 'agri', 'ag', 'agriculture', 'agricultural', 'krushi'].includes(candidate)) {
      subCode = candidate;
    }
  }

  if (subCode) {
    const noteMenu = buildSubjectNotesMessage(subCode);
    if (noteMenu) {
      return bot.sendMessage(chatId, noteMenu.text, {
        parse_mode: 'Markdown',
        reply_markup: noteMenu.reply_markup,
        ...replyOpts
      }).catch(e => console.error('Error sending allnotes subject menu:', e.message));
    }
  }

  const mainMenu = buildAllNotesMainMenu();
  return bot.sendMessage(chatId, mainMenu.text, {
    parse_mode: 'Markdown',
    reply_markup: mainMenu.reply_markup,
    ...replyOpts
  }).catch(e => console.error('Error sending allnotes main menu:', e.message));
});

// Command: /morning or /wish (Generate and send animated morning wish immediately)
bot.onText(/^\/(morning|wish|goodmorning)(?:@\w+)?(?:\s|$)/i, async (msg) => {
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const { threadId } = getThreadContext(msg);
  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  bot.sendChatAction(chatId, 'upload_document', threadId ? { message_thread_id: threadId } : {}).catch(() => { });
  const statusMsg = await bot.sendMessage(
    chatId,
    '🌅 **අද දවසේ උදෑසන සුබ පැතුම සහ Animated SVG Card එක සූදානම් වෙමින් පවතී... ⌛**',
    { parse_mode: 'Markdown', ...replyOpts }
  ).catch(() => null);

  const result = await generateAndSendDailyMorningWish(chatId, threadId, true);

  if (statusMsg && statusMsg.message_id) {
    bot.deleteMessage(chatId, statusMsg.message_id).catch(() => { });
  }

  if (!result || !result.success) {
    bot.sendMessage(chatId, '⚠️ **උදෑසන සුබ පැතුම ලබා ගැනීමේදී දෝෂයක් සිදු විය.**', replyOpts).catch(() => { });
  }
});

// Command: /schedule_morning <HH:MM> or /set_morning <HH:MM> (Admin: Configure daily morning wishes time)
bot.onText(/\/(schedule_morning|set_morning)(@\w+)?\s*(.*)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const { threadId } = getThreadContext(msg);
  const timeArg = match[3] ? match[3].trim() : '';
  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  const isUserAdmin = !ADMIN_ID || String(msg.from?.id) === String(ADMIN_ID);
  if (!isUserAdmin) {
    return bot.sendMessage(chatId, '⛔ **මෙම විධානය භාවිතා කළ හැක්කේ Bot Admin ට පමණි.**', replyOpts).catch(() => { });
  }

  const timeMatch = timeArg.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (!timeMatch) {
    const currentSettings = getMorningSettings();
    const helpMsg =
      `⏰ **A/L MCQ HUB — උදෑසන සුබ පැතුම් කාලසටහන (Morning Wishes Schedule)**\n\n` +
      `දිනපතා ස්වයංක්‍රීයව උදෑසන සුබ පැතුම් සහ Animated SVG කාඩ්පත Chat එකට ලැබෙන වේලාව සැකසීමට:\n\n` +
      `👉 **ආකෘතිය:** \`/schedule_morning [පැය:මිනිත්තු (24 Hours)]\`\n\n` +
      `📌 **උදාහරණ:**\n` +
      `• \`/schedule_morning 06:00\` (උදෑසන 6.00 ට)\n` +
      `• \`/schedule_morning 05:30\` (උදෑසන 5.30 ට)\n` +
      `• \`/schedule_morning 07:15\` (උදෑසන 7.15 ට)\n\n` +
      `⚙️ **දැනට නියමිත වේලාව:** \`${currentSettings.scheduledTime || '06:00'}\` (ශ්‍රී ලංකා වේලාවෙන්)\n` +
      `🟢 **තත්ත්වය:** ${currentSettings.enabled ? 'සක්‍රියයි (Active)' : 'අක්‍රියයි (Disabled)'}`;

    return bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown', ...replyOpts }).catch(() => { });
  }

  const formattedTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  updateMorningSettings({ scheduledTime: formattedTime, enabled: true });

  await bot.sendMessage(
    chatId,
    `✅ **උදෑසන සුබ පැතුම් කාලසටහන සාර්ථකව යාවත්කාලීන කරන ලදී!**\n\n` +
    `⏰ **නව නියමිත වේලාව:** \`${formattedTime}\` (ශ්‍රී ලංකා වේලාවෙන් / Asia:Colombo)\n` +
    `📑 **ප්‍රාර්ථනා සංඛ්‍යාව:** සුරකින ලද ප්‍රාර්ථනා 500+ අතුරින් දිනපතා අලුත් සුබ පැතුමක් ස්වයංක්‍රීයව ලැබෙනු ඇත.\n` +
    `🎨 **ආකෘතිය:** Animated Vector SVG Graphic Card + A/L MCQ HUB Daily Motivation.`,
    { parse_mode: 'Markdown', ...replyOpts }
  ).catch(() => { });
});

// Command: /morning_settings (Admin: View Morning Wishes System Status)
bot.onText(/\/morning_settings(@\w+)?/i, async (msg) => {
  const chatId = msg.chat.id;
  const { threadId } = getThreadContext(msg);
  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  const isUserAdmin = !ADMIN_ID || String(msg.from?.id) === String(ADMIN_ID);
  if (!isUserAdmin) {
    return bot.sendMessage(chatId, '⛔ **මෙම විධානය භාවිතා කළ හැක්කේ Bot Admin ට පමණි.**', replyOpts).catch(() => { });
  }

  const settings = getMorningSettings();
  const msgText =
    `🌅 **A/L MCQ HUB — Morning Wishes Settings & Status**\n\n` +
    `⚙️ **දෛනික කාලසටහන (Scheduled Time):** \`${settings.scheduledTime || '06:00'}\` (Asia/Colombo)\n` +
    `🟢 **ස්වයංක්‍රීය විකාශනය (Auto Broadcast):** ${settings.enabled ? 'සක්‍රියයි (Enabled)' : 'අක්‍රියයි (Disabled)'}\n` +
    `📅 **අවසන් වරට යැවූ දිනය (Last Sent):** \`${settings.lastSentDate || 'තවම යවා නොමැත'}\`\n` +
    `🔢 **අවසන් සුබ පැතුම් අංකය (Last Phrase Index):** #${(settings.lastPhraseIndex ?? -1) + 1} / 504\n` +
    `🤖 **A/L MCQ HUB Knowledge Source:** \`${NOTEBOOK_ID_MORNING}\`\n\n` +
    `💡 *වේලාව වෙනස් කිරීමට: \`/schedule_morning 06:00\`*\n` +
    `💡 *ක්ෂණිකව පරීක්ෂා කිරීමට: \`/morning\`*`;

  return bot.sendMessage(chatId, msgText, { parse_mode: 'Markdown', ...replyOpts }).catch(() => { });
});

// Command: /quiz_schedule or /schedule_quiz (Admin: View/Configure Multi-Subject Quiz Schedule)
bot.onText(/^\/(quiz_schedule|schedule_quiz)(?:@\w+)?(?:\s|$)/i, async (msg) => {
  const chatId = msg.chat.id;
  const { threadId } = getThreadContext(msg);
  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  const isUserAdmin = !ADMIN_ID || String(msg.from?.id) === String(ADMIN_ID);
  if (!isUserAdmin) {
    return bot.sendMessage(chatId, '⛔ <b>මෙම විධානය භාවිතා කළ හැක්කේ Bot Admin ට පමණි.</b>', { parse_mode: 'HTML', ...replyOpts }).catch(() => { });
  }

  // 1. Send Crystal Clear Timetable Sticker (.webp) or High-Res Image (.png)
  const stickerPath = path.resolve(_scriptDir, 'timetable_sticker.webp');
  const pngPath = path.resolve(_scriptDir, 'timetable_card.png');

  if (fs.existsSync(stickerPath)) {
    await bot.sendSticker(chatId, stickerPath, replyOpts).catch(async (err) => {
      console.warn('⚠️ Could not send timetable sticker, falling back to PNG photo:', err.message);
      if (fs.existsSync(pngPath)) {
        await bot.sendPhoto(chatId, pngPath, replyOpts).catch(() => { });
      }
    });
  } else if (fs.existsSync(pngPath)) {
    await bot.sendPhoto(chatId, pngPath, replyOpts).catch(() => { });
  }

  const msgText =
    `🎓 <b>A/L MCQ HUB - දෛනික Mega Quiz කාලසටහන ⏰</b>\n\n` +
    `දිනපතා <b>MCQ 90 ක්</b> (ප්‍රශ්න 30 බැගින් වූ වට 3ක්) සමඟින් ඔබේ A/L ප්‍රතිඵලය ඉහළ නංවා ගන්න! එක් එක් විෂයයන් සඳහා ස්වයංක්‍රීයව තරඟ ක්‍රියාත්මක වන වේලාවන් ඉහත Sticker / Card එකෙහි පැහැදිලිව දක්වා ඇත.\n\n` +
    `<blockquote>💡 <b>ක්ෂණිකව තරඟයක් අරඹන්න! (Instant Quiz)</b>\n` +
    `කාලසටහන තෙක් මඟ නොබලා ඕනෑම මොහොතක Quiz එකක් ආරම්භ කිරීමට <code>/trigger_quiz</code> සමඟ ඉහත වගුවේ ඇති <b>විෂය කේතය</b> (Subject Code) ලබා දෙන්න.\n` +
    `<i>උදාහරණ:</i> සිංහල සඳහා <code>/trigger_quiz si</code>, කෘෂි විද්‍යාව සඳහා <code>/trigger_quiz agri</code> ලෙස යොදන්න.</blockquote>`;

  return bot.sendMessage(chatId, msgText, { parse_mode: 'HTML', ...replyOpts }).catch(() => { });
});

// Command: /trigger_quiz <subCode> (Admin: Manually trigger a scheduled 3-round Mega Quiz immediately)
bot.onText(/\/(trigger_quiz|quiz_now)(@\w+)?\s*([a-zA-Z_]+)?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const { threadId } = getThreadContext(msg);
  const subCodeArg = (match[3] || 'bc').trim().toLowerCase();
  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  const isUserAdmin = !ADMIN_ID || String(msg.from?.id) === String(ADMIN_ID);
  if (!isUserAdmin) {
    return bot.sendMessage(chatId, '⛔ **මෙම විධානය භාවිතා කළ හැක්කේ Bot Admin ට පමණි.**', replyOpts).catch(() => { });
  }

  await bot.sendMessage(
    chatId,
    `🚀 **${subCodeArg.toUpperCase()} සඳහා 3-Round Mega Quiz Session (90 MCQs) ක්ෂණිකව ආරම්භ කරමින් පවතී...**`,
    { parse_mode: 'Markdown', ...replyOpts }
  ).catch(() => { });

  runMegaScheduledQuizSession(subCodeArg, 'manual', chatId, threadId).catch(err => {
    console.error('Error running manual triggered quiz:', err.message);
    bot.sendMessage(chatId, `⚠️ **Mega Quiz ආරම්භ කිරීමේදී දෝෂයක් මතු විය:** ${err.message}`, replyOpts).catch(() => { });
  });
});


// Command: /image <prompt> or /draw <prompt> (100% Free AI Image Generator)
bot.onText(/\/(image|draw)(@\w+)?\s*(.*)/i, async (msg, match) => {
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const { threadId } = getThreadContext(msg);
  const prompt = match[3] ? match[3].trim() : '';
  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  if (!prompt) {
    const usageMsg =
      `🎨 **A/L MCQ HUB AI Image Generator — භාවිත කරන ආකාරය**\n\n` +
      `ඕනෑම රූපසටහනක් හෝ ඡායාරූපයක් නොමිලේ නිර්මාණය කරගන්න:\n\n` +
      `👉 **ආකෘතිය:** \`/image ඔබගේ රූපයේ විස්තරය\`\n\n` +
      `📌 **උදාහරණ:**\n` +
      `• \`/image අනුරාධපුර රුවන්වැලිසෑය\` \n` +
      `• \`/image Ancient Buddhist Temple Sri Lanka 4k\` \n` +
      `• \`/image Political Science Parliament Diagram\``;

    return bot.sendMessage(chatId, usageMsg, { parse_mode: 'Markdown', ...replyOpts }).catch(() => { });
  }

  bot.sendChatAction(chatId, 'upload_photo', threadId ? { message_thread_id: threadId } : {}).catch(() => { });
  const statusMsg = await bot.sendMessage(
    chatId,
    '🎨 **AI විසින් ඔබගේ ඡායාරූපය නිර්මාණය කරමින් පවතී... ⌛**',
    { parse_mode: 'Markdown', ...replyOpts }
  ).catch(() => null);

  try {
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;

    await bot.sendPhoto(chatId, imageUrl, {
      caption: `🎨 **A/L MCQ HUB AI Image Generator**\n\n📌 **විස්තරය (Prompt):** ${prompt}\n\n💡 *තවත් ඡායාරූපයක් සාදා ගැනීමට \`/image විස්තරය\` ලෙස එවන්න.*`,
      parse_mode: 'Markdown',
      ...replyOpts
    });

    if (statusMsg && statusMsg.message_id) {
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => { });
    }
  } catch (err) {
    console.error('Error in AI Image Gen:', err.message);
    if (statusMsg && statusMsg.message_id) {
      bot.editMessageText('❌ **ඡායාරූපය සාදා ගැනීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.**', { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: 'Markdown' }).catch(() => { });
    }
  }
});

// Command: /audio or /podcast (A/L MCQ HUB Audio Overview / Deep Dive AI Podcast Generator)
// Command: /audio or /podcast (A/L MCQ HUB Audio Overview / Deep Dive AI Podcast Generator)
bot.onText(/\/(audio|podcast)(?:_([a-z0-9_]+))?(@\w+)?\s*(.*)/i, async (msg, match) => {
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const { threadId, topicSubject } = getThreadContext(msg);
  let rawSubArg = match[2] ? match[2].trim().toLowerCase() : null;
  let userTopic = match[4] ? match[4].trim() : '';

  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  const reqUser = msg.from || {};
  const reqName = [reqUser.first_name, reqUser.last_name].filter(Boolean).join(' ') || 'ශිෂ්‍යයා';
  const reqUsername = reqUser.username ? `@${reqUser.username}` : reqName;

  if (!rawSubArg && userTopic) {
    const parts = userTopic.split(/\s+/);
    const candidate = normalizeSubjectCode(parts[0]);
    if (candidate) {
      rawSubArg = parts[0];
      userTopic = parts.slice(1).join(' ');
    }
  }

  // Topic Subject Isolation Validation
  const validation = validateTopicSubjectMatch({
    explicitSubCode: rawSubArg,
    userPrompt: userTopic,
    topicSubject
  });

  if (!validation.isAllowed) {
    const warningText = buildTopicSubjectRestrictionMessage(validation.currentTopicSubject, validation.targetSubject);
    return bot.sendMessage(chatId, warningText, { parse_mode: 'HTML', ...replyOpts });
  }

  const effectiveSubCode = validation.effectiveSubCode || topicSubject;

  if (!userTopic && effectiveSubCode) {
    const meta = getSubjectHelpText(effectiveSubCode);
    const sName = meta ? meta.name : effectiveSubCode.toUpperCase();
    const ex = meta ? meta.audioExample : 'විෂය කරුණු';
    const usageMsg =
      `🎙️ **A/L MCQ HUB — ${sName} AI Audio Podcast**\n\n` +
      `ඔබට අවශ්‍ය ${sName} මාතෘකාව ඇසුරෙන් 100% සිංහල Audio Podcast එකක් ලබාගන්න:\n\n` +
      `👉 **භාවිත කරන ආකාරය:** \`/audio <මාතෘකාව>\` (හෝ \`/audio_${effectiveSubCode} <මාතෘකාව>\`)\n\n` +
      `📌 **උදාහරණ:**\n` +
      `• \`/audio ${ex}\``;
    return bot.sendMessage(chatId, usageMsg, { parse_mode: 'Markdown', ...replyOpts }).catch(() => { });
  }

  await triggerAudioOverviewPodcast(chatId, msg.from, effectiveSubCode, userTopic, msg.message_id, threadId);
});

// Helper: Deliver Full DeepMind AI Audio Overview Podcast (NotebookLM)
async function triggerAudioOverviewPodcast(chatId, reqUser, subCode, userTopic, replyToMsgId = null, threadId = null) {
  const replyOpts = {
    ...(replyToMsgId ? { reply_to_message_id: replyToMsgId } : {}),
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  const reqName = [reqUser?.first_name, reqUser?.last_name].filter(Boolean).join(' ') || 'ශිෂ්‍යයා';
  const reqUsername = reqUser?.username ? `@${reqUser.username}` : reqName;
  const safeReqUsername = escapeMarkdown(reqUsername);

  bot.sendChatAction(chatId, 'record_audio', threadId ? { message_thread_id: threadId } : {}).catch(() => { });
  const chatActionInterval = setInterval(() => {
    bot.sendChatAction(chatId, 'record_audio', threadId ? { message_thread_id: threadId } : {}).catch(() => { });
  }, 4000);

  const progressTracker = await startLiveProgressTracker({
    chatId,
    threadId,
    replyToMsgId,
    feature: 'audio',
    subCode,
    userTopic,
    requestedBy: reqUsername,
    totalDurationSec: 900 // 15 mins for full deep AI audio podcast
  });

  const notebookId = getSubjectNotebookId(userTopic, subCode || 'bc') || 'cb5c3e92-b77c-4a84-9b7f-11d543a1d46c';
  console.log(`🎙️ Audio Overview requested for chat ${chatId} (thread=${threadId || 'none'}) by ${reqUsername} (subCode=${subCode || 'auto'}): topic="${userTopic}"`);

  const res = await askNotebookLMPython(userTopic, notebookId, 'audio');
  clearInterval(chatActionInterval);
  await progressTracker.stop();

  if (res && res.type === 'audio' && fs.existsSync(res.path)) {
    const stats = fs.statSync(res.path);
    const meta = getSubjectHelpText(subCode);
    const subjectName = meta ? meta.name : 'උසස් පෙළ A/L Syllabus';

    const captionText =
      `🎙️ **A/L MCQ HUB — AI Audio Overview Podcast** 🎧\n\n` +
      `📌 **මාතෘකාව (Topic):** ${userTopic || 'විෂය කරුණු විග්‍රහය'}\n` +
      `📚 **විෂය (Subject):** ${subjectName}\n` +
      `👤 **ඉල්ලුම් කළේ:** ${safeReqUsername}\n\n` +
      `💡 **විස්තරය (Description):**\n` +
      `${res.summary || 'උසස් පෙළ විෂය නිර්දේශයේ කරුණු ඇසුරෙන් 100% සිංහල හඬින් නිර්මාණය කරන ලද සවිස්තරාත්මක AI Audio Podcast එක.'}\n\n` +
      `✨ *A/L MCQ HUB AI මඟින් සජීවීව නිර්මාණය කර Telegram වෙත එවනු ලැබීය.*`;

    if (stats.size > 48 * 1024 * 1024) {
      await bot.sendDocument(chatId, res.path, { caption: captionText, parse_mode: 'Markdown', ...replyOpts }).catch(() => { });
    } else {
      await bot.sendAudio(chatId, res.path, { caption: captionText, parse_mode: 'Markdown', title: userTopic || res.title || 'A/L AI Podcast', performer: 'A/L MCQ HUB AI', ...replyOpts }).catch(async () => {
        await bot.sendDocument(chatId, res.path, { caption: captionText, parse_mode: 'Markdown', ...replyOpts }).catch(() => { });
      });
    }
  } else {
    if (initialMsg && initialMsg.message_id) {
      bot.deleteMessage(chatId, initialMsg.message_id).catch(() => { });
    }
    await safeSendMessage(
      chatId,
      `⚠️ **Audio Overview ජනනය කිරීමේදී ප්‍රමාදයක් සිදු විය.**\n\nA/L MCQ HUB හි ගොනුව සකස් වෙමින් පවතී. කරුණාකර මිනිත්තු කිහිපයකින් නැවත \`/audio\` ලෙස ලබා දෙන්න.`,
      replyOpts
    );
  }
}

// Command: /voice or /listen_note (Native Sinhala Voice Study Note & Audio Podcast Generator)
bot.onText(/\/(voice|listen_note|voice_note|sinhala_voice)(?:_([a-z0-9_]+))?(@\w+)?\s*(.*)/i, async (msg, match) => {
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const { threadId, topicSubject } = getThreadContext(msg);
  let rawSubArg = match[2] ? match[2].trim().toLowerCase() : null;
  let userTopic = match[4] ? match[4].trim() : '';

  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  const reqUser = msg.from || {};
  const reqName = [reqUser.first_name, reqUser.last_name].filter(Boolean).join(' ') || 'ශිෂ්‍යයා';
  const reqUsername = reqUser.username ? `@${reqUser.username}` : reqName;
  const safeReqUsername = escapeMarkdown(reqUsername);

  if (!rawSubArg && userTopic) {
    const parts = userTopic.split(/\s+/);
    const candidate = normalizeSubjectCode(parts[0]);
    if (candidate) {
      rawSubArg = parts[0];
      userTopic = parts.slice(1).join(' ');
    }
  }

  // Topic Subject Isolation Validation
  const validation = validateTopicSubjectMatch({
    explicitSubCode: rawSubArg,
    userPrompt: userTopic,
    topicSubject
  });

  if (!validation.isAllowed) {
    const warningText = buildTopicSubjectRestrictionMessage(validation.currentTopicSubject, validation.targetSubject);
    return bot.sendMessage(chatId, warningText, { parse_mode: 'HTML', ...replyOpts });
  }

  const effectiveSubCode = validation.effectiveSubCode || topicSubject;

  if (!userTopic) {
    const meta = getSubjectHelpText(effectiveSubCode || 'bc');
    const sName = meta ? meta.name : (effectiveSubCode ? effectiveSubCode.toUpperCase() : 'A/L විෂය නිර්දේශය');
    const ex = meta ? (meta.voiceExample || meta.audioExample) : '1833 කෝල්බෲක් ප්‍රතිසංස්කරණ';
    const usageMsg =
      `🎙️ **A/L MCQ HUB — සිංහල Audio Study Guide & Podcast** 🎧\n\n` +
      `ඔබට අවශ්‍ය ඕනෑම පාඩමක් හෝ සංකල්පයක් 100% සිංහලෙන් කියාදෙන **ස්වභාවික ශ්‍රව්‍ය පාඩමක් (Voice Note / Audio Podcast)** ක්ෂණිකව ලබාගන්න:\n\n` +
      `👉 **භාවිත කරන ආකාරය:** \`/voice <මාතෘකාව>\` (හෝ \`/listen_note <මාතෘකාව>\`)\n` +
      `👉 **විෂය අනුව:** \`/voice_si\`, \`/voice_bc\`, \`/voice_hist\`, \`/voice_pl\`, \`/voice_bs\`, \`/voice_geo\`, \`/voice_agri\`, \`/voice_md\`, \`/voice_dr\`, \`/voice_mu\`, \`/voice_dn\`\n\n` +
      `📌 **උදාහරණ (Examples):**\n` +
      `• \`/voice ${ex}\`\n` +
      `• \`/voice ශ්‍රී ලංකාවේ ව්‍යවස්ථා විකාශනය\`\n` +
      `• \`/voice_agri පස සහ ශාක පෝෂණය\`\n` +
      `• \`/voice_si සමාස පද වර්ගීකරණය\`\n` +
      `• \`/voice_bc මහින්දාගමනය සහ එහි ප්‍රතිඵල\``;
    return bot.sendMessage(chatId, usageMsg, { parse_mode: 'Markdown', ...replyOpts }).catch(() => { });
  }

  // Send immediate record_audio chat action
  bot.sendChatAction(chatId, 'record_audio', threadId ? { message_thread_id: threadId } : {}).catch(() => { });
  const chatActionInterval = setInterval(() => {
    bot.sendChatAction(chatId, 'record_audio', threadId ? { message_thread_id: threadId } : {}).catch(() => { });
  }, 4000);

  const progressTracker = await startLiveProgressTracker({
    chatId,
    threadId,
    replyToMsgId: msg.message_id,
    feature: 'audio',
    subCode: effectiveSubCode,
    userTopic,
    requestedBy: reqUsername,
    totalDurationSec: 240
  });

  const notebookId = getSubjectNotebookId(userTopic, effectiveSubCode || 'auto');
  console.log(`🎙️ Sinhala Voice Note requested for chat ${chatId} (thread=${threadId || 'none'}) by ${reqUsername}: topic="${userTopic}"`);

  const res = await generateSinhalaVoiceStudyNote(userTopic, notebookId, effectiveSubCode || 'auto');
  clearInterval(chatActionInterval);
  await progressTracker.stop();

  if (res && res.type === 'voice' && fs.existsSync(res.path)) {
    const meta = getSubjectHelpText(subCode);
    const subjectName = meta ? meta.name : 'උසස් පෙළ A/L Syllabus';

    const captionText =
      `🎙️ **A/L MCQ HUB — සිංහල Audio Study Guide** 🎧\n\n` +
      `📌 **මාතෘකාව (Topic):** ${userTopic}\n` +
      `📚 **විෂය (Subject):** ${subjectName}\n` +
      `👤 **ඉල්ලුම් කළේ:** ${safeReqUsername}\n\n` +
      `💡 **සාරාංශය (Audio Summary):**\n` +
      `${res.summary || 'උසස් පෙළ විෂය නිර්දේශයේ කරුණු ඇසුරෙන් 100% සිංහල හඬින් නිර්මාණය කරන ලද ශ්‍රව්‍ය අධ්‍යයන සටහන.'}\n\n` +
      `📖 *මෙම පාඩමේ සවිස්තරාත්මක PDF සටහන ලබා ගැනීමට* \`/ai ${userTopic}\` *ලෙස එවන්න.*`;

    const subCodeClean = subCode || 'auto';
    const shortVoiceId = Date.now().toString(36).substring(3) + Math.random().toString(36).substring(2, 5);
    voiceNoteTopicMap.set(shortVoiceId, { topic: userTopic, subCode: subCodeClean });
    if (voiceNoteTopicMap.size > 500) {
      const firstKey = voiceNoteTopicMap.keys().next().value;
      voiceNoteTopicMap.delete(firstKey);
    }

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '🎙️ 100% Real AI Podcast අසන්න', callback_data: `vnaud_${shortVoiceId}` }
        ],
        [
          { text: '📄 PDF සටහන ලබාගන්න', callback_data: `vnpdf_${shortVoiceId}` }
        ]
      ]
    };

    const fileOpts = {
      filename: path.basename(res.path) || 'sinhala_voice_note.mp3',
      contentType: 'audio/mpeg'
    };

    try {
      await bot.sendAudio(chatId, res.path, {
        caption: captionText,
        parse_mode: 'Markdown',
        title: userTopic || 'Sinhala Audio Study Guide',
        performer: 'A/L MCQ HUB AI Tutor',
        reply_markup: inlineKeyboard,
        ...replyOpts
      }, fileOpts);
    } catch (sendErr) {
      console.warn('[VoiceNote] sendAudio failed, falling back to sendVoice/sendDocument:', sendErr.message);
      try {
        await bot.sendVoice(chatId, res.path, {
          caption: captionText,
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard,
          ...replyOpts
        }, fileOpts);
      } catch (voiceErr) {
        console.warn('[VoiceNote] sendVoice failed, falling back to sendDocument:', voiceErr.message);
        await bot.sendDocument(chatId, res.path, {
          caption: captionText,
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard,
          ...replyOpts
        }, fileOpts).catch((docErr) => {
          console.error('[VoiceNote] sendDocument failed:', docErr.message);
        });
      }
    }
  } else {
    if (initialMsg && initialMsg.message_id) {
      bot.deleteMessage(chatId, initialMsg.message_id).catch(() => { });
    }
    await safeSendMessage(
      chatId,
      `⚠️ **සිංහල Audio Study Guide සකස් කිරීමේදී සුළු දෝෂයක් සිදු විය.**\n\nකරුණාකර මොහොතකින් නැවත \`/voice ${userTopic}\` ලෙස උත්සාහ කරන්න.`,
      replyOpts
    );
  }
});

// Helper: Parse Quiz Text or JSON into clean question objects for native Telegram Polls
function parseQuizTextToJSON(text) {
  const questions = [];
  if (!text) return questions;

  let cleanedText = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```$/m, '')
    .trim();

  // Helper to normalize and add a question object
  function pushParsedItem(item) {
    if (!item) return;
    const rawQ = String(item.q || item.question || '').replace(/^[\d\.\s#:\(\)]+/, '').trim();
    let rawOpts = Array.isArray(item.o || item.options) ? (item.o || item.options) : [];

    let cleanOpts = rawOpts
      .map(opt => String(opt || '').replace(/^(?:[\(\[]?\d+[\)\]\.\:]|[\(\[]?[a-z][\)\]\.\:]|[\(\[]?[අ-ෆ][\)\]\.\:])\s*/i, '').trim())
      .filter(Boolean);

    const uniqueOpts = [];
    const seen = new Set();
    for (let oi = 0; oi < cleanOpts.length; oi++) {
      let optStr = cleanOpts[oi];
      if (seen.has(optStr.toLowerCase())) {
        optStr = `${optStr} (${oi + 1})`;
      }
      seen.add(optStr.toLowerCase());
      uniqueOpts.push(optStr.substring(0, 95));
    }

    if (rawQ && uniqueOpts.length >= 2) {
      let rawC = item.c !== undefined ? item.c : (item.correct !== undefined ? item.correct : (item.answer !== undefined ? item.answer : 0));
      let cNum = 0;
      if (typeof rawC === 'number') {
        cNum = rawC;
      } else if (typeof rawC === 'string') {
        const numMatch = rawC.match(/\d+/);
        cNum = numMatch ? parseInt(numMatch[0], 10) : 0;
      }

      if (cNum >= 1 && cNum <= uniqueOpts.length && cNum === uniqueOpts.length) {
        cNum = cNum - 1;
      }
      cNum = Math.min(Math.max(0, cNum), uniqueOpts.length - 1);

      const rawE = String(item.e || item.explanation || item.reason || '').replace(/^(?:සහ\s*හේතුව|හේතුව|විග්‍රහය|විවරණය|Explanation)\s*[:\-]?\s*/i, '').trim();

      questions.push({
        q: rawQ.substring(0, 290),
        o: uniqueOpts.slice(0, 5),
        c: cNum,
        e: rawE.substring(0, 190)
      });
    }
  }

  // Strategy 1: Direct JSON or JSON array block
  try {
    const jsonMatch = cleanedText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      let jsonStr = jsonMatch[0]
        .replace(/,\s*([\]}])/g, '$1') // Remove trailing commas
        .replace(/[\u201C\u201D]/g, '"') // Replace curly quotes
        .replace(/[\u2018\u2019]/g, "'");

      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const item of parsed) {
          pushParsedItem(item);
        }
        if (questions.length > 0) return questions;
      }
    }
  } catch (e) { }

  // Strategy 1.5: Object-by-Object JSON extraction (handles unclosed arrays or trailing tokens)
  try {
    const objectMatches = cleanedText.match(/\{\s*"q"\s*:\s*"[\s\S]*?"e"\s*:\s*"[\s\S]*?"\s*\}/g);
    if (objectMatches && objectMatches.length > 0) {
      for (const objStr of objectMatches) {
        try {
          const cleanObjStr = objStr
            .replace(/,\s*([\]}])/g, '$1')
            .replace(/[\u201C\u201D]/g, '"');
          const obj = JSON.parse(cleanObjStr);
          pushParsedItem(obj);
        } catch (errObj) {
          const qMatch = objStr.match(/"q"\s*:\s*"([^"]+)"/);
          const oMatch = objStr.match(/"o"\s*:\s*\[([\s\S]*?)\]/);
          const cMatch = objStr.match(/"c"\s*:\s*(\d+)/);
          const eMatch = objStr.match(/"e"\s*:\s*"([^"]+)"/);
          if (qMatch && oMatch) {
            const rawOpts = (oMatch[1].match(/"([^"]+)"/g) || []).map(s => s.replace(/^"|"$/g, ''));
            pushParsedItem({
              q: qMatch[1],
              o: rawOpts,
              c: cMatch ? parseInt(cMatch[1], 10) : 0,
              e: eMatch ? eMatch[1] : ''
            });
          }
        }
      }
      if (questions.length > 0) return questions;
    }
  } catch (e) { }

  // Strategy 1.6: Regex block field extraction for open-ended or malformed JSON blocks
  try {
    const qBlocks = cleanedText.split(/\{\s*"q"\s*:/i);
    if (qBlocks.length > 1) {
      for (let bi = 1; bi < qBlocks.length; bi++) {
        const block = '{"q":' + qBlocks[bi];
        const qMatch = block.match(/"q"\s*:\s*"([^"]+)"/i);
        const oMatch = block.match(/"o"\s*:\s*\[([\s\S]*?)\]/i);
        const cMatch = block.match(/"c"\s*:\s*(\d+)/i);
        const eMatch = block.match(/"e"\s*:\s*"([^"]+)"/i);

        if (qMatch && oMatch) {
          const rawOpts = (oMatch[1].match(/"([^"]+)"/g) || []).map(s => s.replace(/^"|"$/g, ''));
          pushParsedItem({
            q: qMatch[1],
            o: rawOpts,
            c: cMatch ? parseInt(cMatch[1], 10) : 0,
            e: eMatch ? eMatch[1] : ''
          });
        }
      }
      if (questions.length > 0) return questions;
    }
  } catch (e) { }

  // Strategy 2: Line by line text markdown parser
  const lines = cleanedText.split('\n');
  let curQ = null;

  for (let li = 0; li < lines.length; li++) {
    const rawLine = lines[li].trim();
    if (!rawLine) continue;

    // Check if line is Correct Answer / Explanation
    const corrMatch = rawLine.match(/(?:නිවැරදි පිළිතුර|සම්මත පිළිතුර|නිවැරදි වරණය|පිළිතුර|Correct Answer|Correct Option|Answer)\s*[:\-]?\s*(?:\(?(\d+|[a-e]|[අ-ෆ])\)?)?\s*(.*)/i);
    const expMatch = rawLine.match(/(?:විවරණය|විග්‍රහය|හේතුව|පැහැදිලි කිරීම|Explanation|Reason)\s*[:\-]?\s*(.*)/i);

    // Option matcher: e.g. "(1) ...", "1. ...", "A) ...", "(A) ...", "(අ) ..."
    const optMatch = !corrMatch && !expMatch ? rawLine.match(/^(?:[\(\[]?(\d{1,2}|[a-e]|[අ-ෆ])[\)\]\.\:]\s+)(.+)/i) : null;

    // Check if line is a Question Header
    let isQHeader = false;
    if (corrMatch || expMatch) {
      isQHeader = false;
    } else if (/^(?:#{1,4}\s*)?(?:\*{1,2})?(?:ප්‍රශ්නය\s*\d+|\bQ\d+[\.:\-]?)(?:\*{1,2})?[\s\.\:\-]/i.test(rawLine) ||
      /^(?:###\s*)?ප්‍රශ්නය\s*\d+/i.test(rawLine)) {
      isQHeader = true;
    } else if (/^(?:\*{1,2})?\d{1,2}[\.\)](?:\*{1,2})?\s+/i.test(rawLine)) {
      if (!curQ || curQ.hasAnswer || (curQ.options.length >= 2 && optMatch && (optMatch[1] === '1' || !optMatch))) {
        isQHeader = true;
      }
    }

    if (isQHeader) {
      if (curQ && curQ.options.length >= 2) {
        questions.push(curQ);
      }
      const cleanHeader = rawLine
        .replace(/^(?:#{1,4}\s*)?(?:\*{1,2})?(?:ප්‍රශ්නය\s*\d+|\bQ\d+[\.:\-]?|\d{1,2}[\.\)])(?:\*{1,2})?[:\-\s]*/i, '')
        .replace(/^\*{1,2}|\*{1,2}$/g, '')
        .trim();

      curQ = {
        qText: cleanHeader,
        options: [],
        rawCorrect: 0,
        explanation: '',
        hasAnswer: false
      };
    } else if (corrMatch && curQ) {
      curQ.hasAnswer = true;
      if (corrMatch[1]) curQ.rawCorrect = corrMatch[1];
      if (corrMatch[2] && !curQ.explanation) curQ.explanation = corrMatch[2];
    } else if (expMatch && curQ) {
      curQ.explanation = expMatch[1] || (lines[li + 1] ? lines[li + 1].trim() : '');
    } else if (optMatch && curQ && !curQ.hasAnswer && curQ.options.length < 5) {
      curQ.options.push(optMatch[2].trim());
    } else if (curQ && curQ.options.length === 0 && !rawLine.startsWith('---') && !rawLine.startsWith('#')) {
      curQ.qText += (curQ.qText ? ' ' : '') + rawLine;
    }
  }

  if (curQ && curQ.options.length >= 2) {
    questions.push(curQ);
  }

  return questions.map(q => {
    const uniqueOpts = [];
    const seen = new Set();
    for (let oi = 0; oi < q.options.length; oi++) {
      let optStr = q.options[oi];
      if (seen.has(optStr.toLowerCase())) {
        optStr = `${optStr} (${oi + 1})`;
      }
      seen.add(optStr.toLowerCase());
      uniqueOpts.push(optStr.substring(0, 95));
    }

    let cIdx = 0;
    if (typeof q.rawCorrect === 'number') {
      cIdx = q.rawCorrect;
    } else if (typeof q.rawCorrect === 'string') {
      const val = q.rawCorrect.trim().toLowerCase();
      if (/^\d+$/.test(val)) {
        const num = parseInt(val, 10);
        cIdx = num > 0 ? num - 1 : 0;
      } else if (['a', 'b', 'c', 'd', 'e'].includes(val)) {
        cIdx = ['a', 'b', 'c', 'd', 'e'].indexOf(val);
      } else if (['අ', 'ආ', 'ඇ', 'ඈ', 'ඉ'].includes(val)) {
        cIdx = ['අ', 'ආ', 'ඇ', 'ඈ', 'ඉ'].indexOf(val);
      }
    }

    return {
      q: (q.qText || 'ප්‍රශ්නය').substring(0, 290),
      o: uniqueOpts.slice(0, 5),
      c: Math.min(Math.max(0, cIdx), uniqueOpts.length - 1),
      e: (q.explanation || '').substring(0, 190)
    };
  }).filter(q => q.q && q.o.length >= 2);
}

// Command: /normal_quiz or /normalquiz (A/L MCQ HUB 50-MCQ Categorized Master Quiz Bank)
bot.onText(/^\/(normal_quiz|normalquiz|normal_test|normal_competition)(?:_([a-z0-9_]+))?(?:@\w+)?(?:\s+(.*))?$/i, async (msg, match) => {
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const { threadId, topicSubject } = getThreadContext(msg);
  const rawSubArg = match[2] ? match[2].trim().toLowerCase() : null;
  const extraArg = match[3] ? match[3].trim() : '';

  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  // Determine if specific subject or quiz number was requested
  let targetSubCode = null;
  let targetQuizNum = null;

  if (rawSubArg) {
    // e.g. /normal_quiz_bc or /normal_quiz_bc_1
    const subParts = rawSubArg.split('_');
    targetSubCode = normalizeSubjectCode(subParts[0]);
    if (subParts[1] && !isNaN(parseInt(subParts[1], 10))) {
      targetQuizNum = parseInt(subParts[1], 10);
    }
  }

  if (extraArg) {
    const parts = extraArg.split(/\s+/);
    if (!targetSubCode) {
      targetSubCode = normalizeSubjectCode(parts[0]);
      if (parts[1] && !isNaN(parseInt(parts[1], 10))) {
        targetQuizNum = parseInt(parts[1], 10);
      }
    } else if (!targetQuizNum && !isNaN(parseInt(parts[0], 10))) {
      targetQuizNum = parseInt(parts[0], 10);
    }
  }

  // If topic has a bound subject and no explicit subject requested, default to that subject if supported
  const effectiveSubCode = targetSubCode || (topicSubject && ['bc', 'geo', 'md', 'si'].includes(topicSubject) ? topicSubject : null);

  // If both subject and quiz number specified -> directly start quiz competition!
  if (effectiveSubCode && targetQuizNum) {
    const quizObj = getQuizByNumber(effectiveSubCode, targetQuizNum);
    if (quizObj && quizObj.questions && quizObj.questions.length > 0) {
      const sessionKey = threadId ? `${chatId}_${threadId}` : String(chatId);
      if (aiQuizSessions[sessionKey] && !aiQuizSessions[sessionKey].isStopped) {
        return bot.sendMessage(chatId, '⚠️ **දැනටමත් සජීවී Quiz තරඟයක් ක්‍රියාත්මක වේ. එය අවසන් වන තෙක් රැඳී සිටින්න හෝ /stop_quiz ලෙස යොදන්න.**', replyOpts);
      }
      return runLiveQuizQuestions(
        chatId,
        threadId,
        sessionKey,
        msg.from || {},
        quizObj.questions,
        effectiveSubCode,
        quizObj.quiz_title
      );
    }
  }

  // If only subject specified -> show quizzes list for that subject
  if (effectiveSubCode) {
    const quizListMenu = buildSubjectQuizzesMessage(effectiveSubCode, 1);
    if (quizListMenu) {
      return bot.sendMessage(chatId, quizListMenu.text, {
        parse_mode: 'HTML',
        reply_markup: quizListMenu.reply_markup,
        ...replyOpts
      }).catch(e => console.error('Error sending normal quiz subject list:', e.message));
    }
  }

  // Otherwise -> Show Main Subject Selection Menu
  const mainSubjectMenu = buildSubjectMenuMessage();
  return bot.sendMessage(chatId, mainSubjectMenu.text, {
    parse_mode: 'HTML',
    reply_markup: mainSubjectMenu.reply_markup,
    ...replyOpts
  }).catch(e => console.error('Error sending normal quiz main menu:', e.message));
});

// Command: /quiz or /quez or /test or /competition (A/L MCQ HUB Native Telegram Quiz Polls Generator)
bot.onText(/^\/(quiz|quez|test|competition)(?:_([a-z0-9_]+))?(@\w+)?\s*(.*)/i, async (msg, match) => {
  const subCodeArg = (match[2] || '').toLowerCase();
  if (['schedule', 'now', 'stop', 'cancel', 'settings'].includes(subCodeArg)) {
    return; // Ignore sub-commands like /quiz_schedule or /quiz_now
  }
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const { threadId, topicSubject } = getThreadContext(msg);
  let rawSubArg = match[2] ? match[2].trim().toLowerCase() : null;
  let userTopic = match[4] ? match[4].trim() : '';

  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  if (!rawSubArg && userTopic) {
    const parts = userTopic.split(/\s+/);
    const candidate = normalizeSubjectCode(parts[0]);
    if (candidate) {
      rawSubArg = parts[0];
      userTopic = parts.slice(1).join(' ');
    }
  }

  // Topic Subject Isolation Validation
  const validation = validateTopicSubjectMatch({
    explicitSubCode: rawSubArg,
    userPrompt: userTopic,
    topicSubject
  });

  if (!validation.isAllowed) {
    const warningText = buildTopicSubjectRestrictionMessage(validation.currentTopicSubject, validation.targetSubject);
    return bot.sendMessage(chatId, warningText, { parse_mode: 'HTML', ...replyOpts });
  }

  const effectiveSubCode = validation.effectiveSubCode || topicSubject;
  return startAIQuizCompetition(msg, chatId, userTopic, effectiveSubCode);
});

// Helper: Split text into chunks
function chunkMessage(text, maxLen = 3800) {
  if (!text) return [];
  if (text.length <= maxLen) return [text];
  const chunks = [];
  const lines = text.split('\n');
  let cur = '';
  for (const line of lines) {
    if ((cur + '\n' + line).length > maxLen) {
      if (cur.trim()) chunks.push(cur.trim());
      cur = line;
    } else {
      cur += (cur ? '\n' : '') + line;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

// Helper: Parse Paper Generation Output
function parseNotebookPaperOutput(rawText) {
  if (!rawText) return { parsedQuestions: [], part2Text: '' };

  let parsedQuestions = [];
  let part2Text = '';

  const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].q) {
        parsedQuestions = parsed.map(item => ({
          q: String(item.q || '').replace(/^[\d\.\s#]+/, '').trim(),
          o: Array.isArray(item.o) ? item.o.map(opt => String(opt).replace(/^\(\d+\)\s*/, '').trim()) : [],
          c: typeof item.c === 'number' ? Math.max(0, item.c) : 0,
          e: String(item.e || '').replace(/^(සහ හේතුව:|හේතුව:|විග්‍රහය:)\s*/i, '').trim()
        }));
      }
    } catch (e) { }

    const afterJson = rawText.substring(jsonMatch.index + jsonMatch[0].length).trim();
    if (afterJson) {
      part2Text = afterJson;
    }
  }

  if (parsedQuestions.length === 0) {
    const splitParts = rawText.split(/(?:##\s*II\s*කොටස|#\s*II\s*කොටස|\bII\s*කොටස\b)/i);
    const mcqPart = splitParts[0] || '';
    part2Text = splitParts.slice(1).join('\n\n## II කොටස\n\n').trim();
    parsedQuestions = parseQuizTextToJSON(mcqPart);
  }

  if (!part2Text && !jsonMatch) {
    part2Text = rawText;
  }

  return { parsedQuestions, part2Text };
}

// Helper: Format Part II Structured & Essay Questions for Telegram Chat
function formatPart2ForChat(part2Text, topicTitle) {
  if (!part2Text) return '';
  let formatted = part2Text.trim();
  formatted = formatted.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, '$1');
  formatted = formatted.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, '$1');
  formatted = formatted.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, '$1');
  return `📝 **${topicTitle} — II කොටස (රචනා හා ව්‍යුහගත ප්‍රශ්න)**\n\n${formatted}`;
}

// Persistent Storage for Paper Quiz Sessions
const savedPaperQuizzesPath = path.resolve(process.cwd(), 'saved_paper_quizzes.json');
function savePaperQuiz(sessionId, quizData) {
  try {
    let data = {};
    if (fs.existsSync(savedPaperQuizzesPath)) {
      data = JSON.parse(fs.readFileSync(savedPaperQuizzesPath, 'utf8') || '{}');
    }
    data[sessionId] = quizData;
    fs.writeFileSync(savedPaperQuizzesPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving paper quiz session:', e.message);
  }
}

function loadPaperQuiz(sessionId) {
  try {
    if (fs.existsSync(savedPaperQuizzesPath)) {
      const data = JSON.parse(fs.readFileSync(savedPaperQuizzesPath, 'utf8') || '{}');
      return data[sessionId] || null;
    }
  } catch (e) { }
  return null;
}

// Helper: Generate and Deliver Full Exam Paper (Part I MCQs + Part II Essay + Marking Scheme + PDF)
async function generateAndSendPaper(chatId, fromUser, subCode, userTopic, replyToMsgId = null, threadId = null) {
  const replyOpts = {
    ...(replyToMsgId ? { reply_to_message_id: replyToMsgId } : {}),
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  if (!userTopic && !subCode) {
    const usageMsg =
      `📄 **A/L MCQ HUB — විභාග ප්‍රශ්න පත්‍ර (Exam Paper Generator)**\n\n` +
      `ඔබට අවශ්‍ය ඕනෑම විෂයක පසුගිය හෝ ආදර්ශ ප්‍රශ්න පත්‍රයක් Part I (MCQs) + Part II (රචනා) + Marking Scheme සමඟ ලබාගන්න:\n\n` +
      `👉 **භාවිත කරන ආකාරය (Usage):** \`/paper_<subject_code> <මාතෘකාව හෝ වසර>\`\n\n` +
      `📚 **විෂය කේත (Subject Codes):**\n` +
      `• \`/paper_pl 2024 පසුගිය ප්‍රශ්න පත්‍රය\` — දේශපාලන විද්‍යාව\n` +
      `• \`/paper_bc 2023 පසුගිය ප්‍රශ්න පත්‍රය\` — බෞද්ධ ශිෂ්ටාචාරය\n` +
      `• \`/paper_si 2022 පසුගිය ප්‍රශ්න පත්‍රය\` — සිංහල\n` +
      `• \`/paper_hist 2021 පසුගිය ප්‍රශ්න පත්‍රය\` — ඉතිහාසය\n` +
      `• \`/paper_bs 2024 ආදර්ශ ප්‍රශ්න පත්‍රය\` — ව්‍යාපාර අධ්‍යයනය\n` +
      `• \`/paper_geo 2023 පසුගිය ප්‍රශ්න පත්‍රය\` — භූගෝල විද්‍යාව\n` +
      `• \`/paper_dr 2024 ආදර්ශ ප්‍රශ්න පත්‍රය\` — නාට්‍ය හා රංගකලාව\n` +
      `• \`/paper_mu 2023 පසුගිය ප්‍රශ්න පත්‍රය\` — සංගීතය\n` +
      `• \`/paper_dn 2024 පසුගිය ප්‍රශ්න පත්‍රය\` — නර්තනය`;
    return bot.sendMessage(chatId, usageMsg, { parse_mode: 'Markdown', ...replyOpts }).catch(() => { });
  } else if (!userTopic && subCode) {
    const meta = getSubjectHelpText(subCode);
    const sName = meta ? meta.name : subCode.toUpperCase();
    const ex = meta ? meta.paperExample : '2024 පසුගිය ප්‍රශ්න පත්‍රය';
    const usageMsg =
      `📄 **A/L MCQ HUB — ${sName} විභාග ප්‍රශ්න පත්‍ර (Exam Paper Generator)**\n\n` +
      `ඔබට අවශ්‍ය ${sName} පසුගිය හෝ ආදර්ශ ප්‍රශ්න පත්‍රයක් Part I (MCQs) + Part II (රචනා) + Marking Scheme සමඟ ලබාගන්න:\n\n` +
      `👉 **භාවිත කරන ආකාරය (Usage):** \`/paper <වසර හෝ මාතෘකාව>\` (හෝ \`/paper_${subCode} <මාතෘකාව>\`)\n\n` +
      `📌 **උදාහරණ:**\n` +
      `• \`/paper ${ex}\`\n` +
      `• \`/paper ආදර්ශ ප්‍රශ්න පත්‍රය\``;
    return bot.sendMessage(chatId, usageMsg, { parse_mode: 'Markdown', ...replyOpts }).catch(() => { });
  }

  const reqUsername = fromUser ? (fromUser.username ? `@${fromUser.username}` : (fromUser.first_name || 'ශිෂ්‍යයා')) : 'ශිෂ්‍යයා';
  const safeReqUsername = escapeMarkdown(reqUsername);

  console.log(`📝 Exam Paper requested for chat ${chatId} (thread=${threadId || 'none'}) by ${reqUsername} (subCode=${subCode || 'auto'}): topic="${userTopic}"`);
  bot.sendChatAction(chatId, 'upload_document', threadId ? { message_thread_id: threadId } : {}).catch(() => { });

  const progressTracker = await startLiveProgressTracker({
    chatId,
    threadId,
    replyToMsgId,
    feature: 'paper',
    subCode,
    userTopic,
    requestedBy: reqUsername,
    totalDurationSec: 300 // 5 mins
  });

  try {
    const notebookId = getSubjectNotebookId(userTopic, subCode || 'bc') || 'cb5c3e92-b77c-4a84-9b7f-11d543a1d46c';
    const rawOutput = await askNotebookLMPython(userTopic, notebookId, 'paper');
    await progressTracker.stop();

    if (!rawOutput || !rawOutput.trim()) {
      return bot.sendMessage(chatId, '⚠️ **ප්‍රශ්න පත්‍රය ජනනය කිරීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.**', replyOpts).catch(() => { });
    }

    // --- Parse the two sections from NotebookLM output (JSON MCQs + Part II text) ---
    const { parsedQuestions, part2Text } = parseNotebookPaperOutput(rawOutput);

    const subData = QUIZ_DATA[subCode] || {};
    const subName = subData.shortName || (subCode ? subCode.toUpperCase() : 'විභාග');
    const cleanTopic = escapeMarkdown(userTopic || 'ආදර්ශ ප්‍රශ්න පත්‍රය');
    const topicTitle = userTopic ? `${subName} — ${userTopic}` : `${subName} ආදර්ශ ප්‍රශ්න පත්‍රය`;
    const paperTitleStr = escapeMarkdown(topicTitle);

    // Save questions into session memory & JSON file for interactive quizzes
    const quizSessionId = `${chatId}_${Date.now()}`;
    const mcqCount = parsedQuestions ? parsedQuestions.length : 0;

    savePaperQuiz(quizSessionId, {
      subCode: subCode || 'bc',
      topicTitle: topicTitle,
      userTopic: userTopic,
      questions: parsedQuestions || []
    });

    console.log(`✅ Exam Paper generated for chat ${chatId}: ${mcqCount} MCQs, Part II: ${part2Text ? part2Text.length : 0} chars`);

    // --- Deliver Part II Structured & Essay Questions to Chat directly in readable chunks ---
    if (part2Text && part2Text.trim().length > 30) {
      const formattedPart2 = formatPart2ForChat(part2Text, topicTitle);
      const chunks = chunkMessage(formattedPart2, 3800);
      for (const chunk of chunks) {
        if (chunk.trim().length > 10) {
          await safeSendMessage(chatId, chunk.trim(), { parse_mode: 'Markdown', ...(threadId ? { message_thread_id: threadId } : {}) });
        }
      }
    }

    // --- Build Full Exam Paper PDF Content (Part I MCQs + Part II + Marking Scheme) ---
    let fullPdfContent = `# ${topicTitle}\n\n`;
    if (parsedQuestions && parsedQuestions.length > 0) {
      fullPdfContent += `## I කොටස — බහුවරණ ප්‍රශ්න (Part I — Multiple Choice Questions)\n\n`;
      parsedQuestions.forEach((q, idx) => {
        fullPdfContent += `**${idx + 1}. ${(q.q || '').replace(/^\d+[\.\)\-]?\s*/, '')}**\n`;
        (q.o || []).forEach((opt, oIdx) => {
          fullPdfContent += `(${oIdx + 1}) ${opt}  `;
        });
        fullPdfContent += `\n\n`;
      });
    }

    if (part2Text && part2Text.trim().length > 30) {
      fullPdfContent += `\n${part2Text.trim()}\n\n`;
    }

    if (parsedQuestions && parsedQuestions.length > 0 && !part2Text.includes('පිළිතුරු විග්‍රහය')) {
      fullPdfContent += `\n# I කොටස නිල ලකුණු දීමේ පටිපාටිය සහ පිළිතුරු විග්‍රහය\n\n`;
      parsedQuestions.forEach((q, idx) => {
        fullPdfContent += `**${idx + 1}. නිවැරදි පිළිතුර: (${(q.c || 0) + 1})**\n• ${q.e || 'නිවැරදි පිළිතුර'}\n\n`;
      });
    }

    // --- Generate PDF Note ---
    bot.sendChatAction(chatId, 'upload_document', threadId ? { message_thread_id: threadId } : {}).catch(() => { });
    const pdfFilename = formatPdfFilename(subCode, userTopic || topicTitle, 'Exam_Paper');
    const pdfPath = await generatePDFNote(topicTitle, fullPdfContent, subCode || 'auto', 'paper', pdfFilename);

    // --- Build quiz start button with paper name and MCQ count ---
    const mcqBtnLabel = mcqCount > 0
      ? `🎯 ${topicTitle.substring(0, 28)} — MCQ Quiz ආරම්භ කරන්න (${mcqCount})`
      : `🎯 ${topicTitle.substring(0, 38)} — MCQ Quiz ආරම්භ කරන්න`;
    const launchKb = {
      inline_keyboard: [
        [{ text: mcqBtnLabel, callback_data: `start_paper_quiz_${quizSessionId}` }]
      ]
    };

    if (pdfPath && fs.existsSync(pdfPath)) {
      const sentDoc = await bot.sendDocument(chatId, pdfPath, {
        caption: `📄 <b>A/L MCQ HUB — ${paperTitleStr}</b>\n\n` +
          `📌 <b>මාතෘකාව:</b> ${cleanTopic}\n` +
          `👤 <b>ඉල්ලුම් කළේ:</b> ${safeReqUsername}\n\n` +
          `📝 <i>සම්පූර්ණ ප්‍රශ්න පත්‍රය (Part I MCQ + Part II රචනා + Marking Scheme) PDF ගොනුව. MCQ Quiz ආරම්භ කිරීමට පහත බොත්තම ඔබන්න.</i>`,
        parse_mode: 'HTML',
        reply_markup: launchKb,
        ...replyOpts
      }, {
        filename: `${pdfFilename}.pdf`,
        contentType: 'application/pdf'
      }).catch(e => console.error('Error sending Paper PDF:', e.message));

      if (sentDoc) {
        registerPdfNote({
          subCode: subCode || 'bc',
          title: topicTitle,
          filePath: pdfPath,
          chatId: chatId,
          threadId: threadId,
          messageId: sentDoc.message_id,
          chatUsername: sentDoc.chat?.username || null,
          fileId: sentDoc.document?.file_id || null,
          type: 'paper'
        });
      }
    } else {
      await bot.sendMessage(chatId,
        `✅ **${topicTitle}**\n\n` +
        `📌 **MCQ Quiz:** ${mcqCount} ප්‍රශ්න සුරකිනු ලැබිණ.\n` +
        `💡 *MCQ Quiz ආරම්භ කිරීමට පහත බොත්තම ඔබන්න:*`,
        { parse_mode: 'Markdown', reply_markup: launchKb, ...replyOpts }
      ).catch(() => { });
    }

  } catch (err) {
    console.error('Error in generateAndSendPaper execution:', err.message);
    if (statusMsg && statusMsg.message_id) {
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => { });
    }
    bot.sendMessage(chatId, '⚠️ **ප්‍රශ්න පත්‍රය යැවීමේදී තාවකාලික දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.**', replyOpts).catch(() => { });
  }
}

// Command: /paper or /exam or /testpaper (G.C.E. A/L Model Exam Paper & Marking Scheme Generator)
bot.onText(/\/(paper|exam|testpaper)(?:_([a-z0-9_]+))?(@\w+)?\s*(.*)/i, async (msg, match) => {
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const { threadId, topicSubject } = getThreadContext(msg);
  let rawSubArg = match[2] ? match[2].trim().toLowerCase() : null;
  let userTopic = match[4] ? match[4].trim() : '';

  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  if (!rawSubArg && userTopic) {
    const parts = userTopic.split(/\s+/);
    const candidate = normalizeSubjectCode(parts[0]);
    if (candidate) {
      rawSubArg = parts[0];
      userTopic = parts.slice(1).join(' ');
    }
  }

  // Topic Subject Isolation Validation
  const validation = validateTopicSubjectMatch({
    explicitSubCode: rawSubArg,
    userPrompt: userTopic,
    topicSubject
  });

  if (!validation.isAllowed) {
    const warningText = buildTopicSubjectRestrictionMessage(validation.currentTopicSubject, validation.targetSubject);
    return bot.sendMessage(chatId, warningText, { parse_mode: 'HTML', ...replyOpts });
  }

  const effectiveSubCode = validation.effectiveSubCode || topicSubject;
  return generateAndSendPaper(chatId, msg.from, effectiveSubCode, userTopic, msg.message_id, threadId);
});

// Listener for Voice Messages (Speech-to-Text Transcribe & Auto AI Answer with Topic Isolation)
async function handleVoiceQuestion(msg) {
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const { threadId, topicSubject } = getThreadContext(msg);
  const fileObj = msg.voice || msg.audio;
  if (!fileObj) return;

  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  const fileId = fileObj.file_id;
  const statusMsg = await bot.sendMessage(chatId, '🎙️ **ඔබගේ හඬ පණිවිඩයට සවන්දෙමින් පවතී (Listening & Transcribing)... ⌛**', { parse_mode: 'Markdown', ...replyOpts }).catch(() => null);

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
      // Validate Topic Subject Match
      const validation = validateTopicSubjectMatch({
        userPrompt: transcribedText,
        topicSubject
      });

      if (statusMsg && statusMsg.message_id) {
        bot.deleteMessage(chatId, statusMsg.message_id).catch(() => { });
      }

      if (!validation.isAllowed) {
        const warningText = buildTopicSubjectRestrictionMessage(validation.currentTopicSubject, validation.targetSubject);
        return bot.sendMessage(chatId, warningText, { parse_mode: 'HTML', ...replyOpts });
      }

      const effectiveSub = validation.effectiveSubCode || topicSubject;
      return triggerAITutorNote(chatId, msg.from, effectiveSub, transcribedText, msg.message_id, threadId);
    } else {
      bot.sendMessage(chatId, '❌ **ඔබගේ හඬ පණිවිඩය පැහැදිලිව හඳුනා ගැනීමට නොහැකි විය. කරුණාකර නැවත පැහැදිලිව පවසන්න.**', { parse_mode: 'Markdown', ...replyOpts }).catch(() => { });
    }
  } catch (err) {
    console.error('Error handling voice question:', err.message);
    bot.sendMessage(chatId, '❌ **හඬ පණිවිඩය තේරුම් ගැනීමේදී දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.**', { parse_mode: 'Markdown', ...replyOpts }).catch(() => { });
  }
}

bot.on('voice', handleVoiceQuestion);
bot.on('audio', handleVoiceQuestion);

// Listener for Photo Uploads (OCR Question Extractor & Auto AI Answer with Topic Isolation)
bot.on('photo', async (msg) => {
  if (msg.caption && msg.caption.startsWith('/')) return;
  if (!await enforceDirectAccessControl(msg)) return;

  const chatId = msg.chat.id;
  const { threadId, topicSubject } = getThreadContext(msg);
  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  const photo = msg.photo[msg.photo.length - 1];
  if (!photo) return;

  const fileId = photo.file_id;
  const statusMsg = await bot.sendMessage(chatId, '📸 **ඡායාරූපයේ ඇති ප්‍රශ්න සටහන් කියවමින් පවතී (Reading Image Text)... ⌛**', { parse_mode: 'Markdown', ...replyOpts }).catch(() => null);

  try {
    const photoUrl = await bot.getFileLink(fileId);
    const ocrApiUrl = `https://api.ocr.space/parse/imageurl?apikey=helloworld&url=${encodeURIComponent(photoUrl)}&isOverlayRequired=false`;

    const ocrRes = await fetch(ocrApiUrl);
    const ocrData = await ocrRes.json();
    const extractedText = ocrData?.ParsedResults?.[0]?.ParsedText;

    if (extractedText && extractedText.trim().length > 3) {
      const cleanPrompt = extractedText.trim();

      // Topic Subject Isolation Validation
      const validation = validateTopicSubjectMatch({
        userPrompt: cleanPrompt,
        topicSubject
      });

      if (statusMsg && statusMsg.message_id) {
        bot.deleteMessage(chatId, statusMsg.message_id).catch(() => { });
      }

      if (!validation.isAllowed) {
        const warningText = buildTopicSubjectRestrictionMessage(validation.currentTopicSubject, validation.targetSubject);
        return bot.sendMessage(chatId, warningText, { parse_mode: 'HTML', ...replyOpts });
      }

      const effectiveSub = validation.effectiveSubCode || topicSubject;
      return triggerAITutorNote(chatId, msg.from, effectiveSub, cleanPrompt, msg.message_id, threadId);
    } else {
      if (statusMsg && statusMsg.message_id) {
        bot.editMessageText(`📸 **ඡායාරූපය සාර්ථකව ලැබුණි!**\n\n💡 ඔබගේ ඡායාරූපයේ ඇති ප්‍රශ්නයට පිළිතුර ලබා ගැනීමට, ඡායාරූපය සමඟ \`/ai [ප්‍රශ්නය]\` ලෙස Caption යොදා එවන්න.`, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown'
        }).catch(() => { });
      }
    }
  } catch (err) {
    console.error('Error reading photo question:', err.message);
  }
});

// Command: /set_topic or /bind_topic (Admin: Bind current forum topic thread to a subject)
bot.onText(/\/(set_topic|bind_topic)(?:_([a-z0-9_]+))?(?:@\w+)?\s*(.*)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const threadId = msg.message_thread_id;
  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  if (!isAdminUser(msg.from?.id)) {
    return bot.sendMessage(chatId, '⛔ **මෙම විධානය භාවිතා කළ හැක්කේ Bot Admin ට පමණි.**', replyOpts).catch(() => { });
  }

  if (!threadId) {
    return bot.sendMessage(chatId, '⚠️ **මෙම විධානය භාවිතා කළ හැක්කේ Telegram Forum Topic එකක් තුළ පමණි.**', replyOpts).catch(() => { });
  }

  const rawArg = (match[2] || match[3] || '').trim();
  const subCode = normalizeSubjectCode(rawArg);

  if (!subCode) {
    const helpMsg =
      `⚙️ **A/L MCQ HUB — Topic Subject Binding (විෂය සම්බන්ධ කිරීම)**\n\n` +
      `මෙම Forum Topic එක නිශ්චිත විෂයකට සීමා කිරීමට (Strictly Bind):\n\n` +
      `👉 **ආකෘතිය:** \`/set_topic [විෂය]\`\n\n` +
      `📌 **උදාහරණ:**\n` +
      `• \`/set_topic si\` (සිංහල)\n` +
      `• \`/set_topic bc\` (බෞද්ධ ශිෂ්ටාචාරය)\n` +
      `• \`/set_topic pl\` (දේශපාලන විද්‍යාව)\n` +
      `• \`/set_topic hist\` (ඉතිහාසය)\n` +
      `• \`/set_topic bs\` (ව්‍යාපාර අධ්‍යයනය)\n` +
      `• \`/set_topic geo\` (භූගෝල විද්‍යාව)\n` +
      `• \`/set_topic agri\` (කෘෂි විද්‍යාව)\n` +
      `• \`/set_topic md\` (මාධ්‍ය අධ්‍යයනය)\n` +
      `• \`/set_topic dr\` (නාට්‍ය හා රංග කලාව)\n` +
      `• \`/set_topic mu\` (සංගීතය)\n` +
      `• \`/set_topic dn\` (නැටුම්)`;
    return bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown', ...replyOpts }).catch(() => { });
  }

  const meta = getSubjectHelpText(subCode);
  setTopicSubjectForThread(chatId, threadId, subCode, meta ? meta.name : subCode.toUpperCase());

  return bot.sendMessage(
    chatId,
    `✅ **මෙම Forum Topic Thread එක ${meta.name} සමඟ සාර්ථකව සම්බන්ධ කරන ලදී!**\n\n` +
    `🔒 දැන් මෙම Topic එක තුළ ක්‍රියාත්මක වන්නේ **${meta.name}** විෂය සහ අදාළ NotebookLM සටහන් පමණි.`,
    { parse_mode: 'Markdown', ...replyOpts }
  ).catch(() => { });
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
bot.onText(/\/(leaderboard|top)/i, async (msg) => {
  if (!await enforceDirectAccessControl(msg)) return;
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

// --- SUBJECT TIMETABLE STICKERS & COMMANDS ---
const SUBJECT_TIMETABLES = {
  si: {
    code: 'si',
    name: 'සිංහල',
    icon: '📝',
    morning: '05:15 AM',
    evening: '06:15 PM',
    sticker: 'sticker_timetable_si.webp'
  },
  bc: {
    code: 'bc',
    name: 'බෞද්ධ ශිෂ්ටාචාරය',
    icon: '☸️',
    morning: '05:35 AM',
    evening: '06:45 PM',
    sticker: 'sticker_timetable_bc.webp'
  },
  agri: {
    code: 'agri',
    name: 'කෘෂි විද්‍යාව',
    icon: '🌱',
    morning: '05:55 AM',
    evening: '07:15 PM',
    sticker: 'sticker_timetable_agri.webp'
  },
  hist: {
    code: 'hist',
    name: 'ඉතිහාසය',
    icon: '🏛️',
    morning: '06:15 AM',
    evening: '07:45 PM',
    sticker: 'sticker_timetable_hist.webp'
  },
  pl: {
    code: 'pl',
    name: 'දේශපාලන විද්‍යාව',
    icon: '⚖️',
    morning: '06:30 AM',
    evening: '08:15 PM',
    sticker: 'sticker_timetable_pl.webp'
  },
  bs: {
    code: 'bs',
    name: 'ව්‍යාපාර අධ්‍යයනය',
    icon: '💼',
    morning: '06:45 AM',
    evening: '08:45 PM',
    sticker: 'sticker_timetable_bs.webp'
  },
  geo: {
    code: 'geo',
    name: 'භූගෝල විද්‍යාව',
    icon: '🌍',
    morning: '07:00 AM',
    evening: '09:15 PM',
    sticker: 'sticker_timetable_geo.webp'
  },
  md: {
    code: 'md',
    name: 'මාධ්‍ය අධ්‍යයනය',
    icon: '📡',
    morning: '07:15 AM',
    evening: '09:30 PM',
    sticker: 'sticker_timetable_md.webp'
  },
  dr: {
    code: 'dr',
    name: 'නාට්‍ය හා රංග කලාව',
    icon: '🎭',
    morning: '07:30 AM',
    evening: '09:45 PM',
    sticker: 'sticker_timetable_dr.webp'
  },
  mu: {
    code: 'mu',
    name: 'සංගීතය',
    icon: '🎵',
    morning: '07:45 AM',
    evening: '10:00 PM',
    sticker: 'sticker_timetable_mu.webp'
  },
  dn: {
    code: 'dn',
    name: 'නැටුම්',
    icon: '💃',
    morning: '08:00 AM',
    evening: '10:15 PM',
    sticker: 'sticker_timetable_dn.webp'
  }
};

function normalizeScheduleSubCode(input) {
  return normalizeSubjectCode(input);
}

function buildScheduleKeyboard(activeCode = null) {
  const rows = [
    [
      { text: `${activeCode === 'si' ? '✅ ' : ''}📝 සිංහල`, callback_data: 'sch_si' },
      { text: `${activeCode === 'bc' ? '✅ ' : ''}☸️ බෞද්ධ ශිෂ්ටාචාරය`, callback_data: 'sch_bc' }
    ],
    [
      { text: `${activeCode === 'agri' ? '✅ ' : ''}🌱 කෘෂි විද්‍යාව`, callback_data: 'sch_agri' },
      { text: `${activeCode === 'hist' ? '✅ ' : ''}🏛️ ඉතිහාසය`, callback_data: 'sch_hist' }
    ],
    [
      { text: `${activeCode === 'pl' ? '✅ ' : ''}⚖️ දේශපාලන විද්‍යාව`, callback_data: 'sch_pl' },
      { text: `${activeCode === 'bs' ? '✅ ' : ''}💼 ව්‍යාපාර අධ්‍යයනය`, callback_data: 'sch_bs' }
    ],
    [
      { text: `${activeCode === 'geo' ? '✅ ' : ''}🌍 භූගෝල විද්‍යාව`, callback_data: 'sch_geo' },
      { text: `${activeCode === 'md' ? '✅ ' : ''}📡 මාධ්‍ය අධ්‍යයනය`, callback_data: 'sch_md' }
    ],
    [
      { text: `${activeCode === 'dr' ? '✅ ' : ''}🎭 නාට්‍ය හා රංග කලාව`, callback_data: 'sch_dr' },
      { text: `${activeCode === 'mu' ? '✅ ' : ''}🎵 සංගීතය`, callback_data: 'sch_mu' }
    ],
    [
      { text: `${activeCode === 'dn' ? '✅ ' : ''}💃 නැටුම්`, callback_data: 'sch_dn' }
    ]
  ];
  if (activeCode) {
    rows.push([
      { text: `⚡ /trigger_quiz ${activeCode} (ක්ෂණිකව ඇරඹීමට)`, callback_data: `trig_${activeCode}` }
    ]);
  }
  return { inline_keyboard: rows };
}

async function sendSubjectTimetable(chatId, subCode, replyOpts = {}) {
  const normCode = normalizeScheduleSubCode(subCode);
  if (normCode && SUBJECT_TIMETABLES[normCode]) {
    const item = SUBJECT_TIMETABLES[normCode];
    const stickerFile = path.resolve(_scriptDir, item.sticker);
    if (fs.existsSync(stickerFile)) {
      await bot.sendSticker(chatId, stickerFile, replyOpts).catch(() => { });
    }
    const cap =
      `⏰ <b>${item.icon} ${item.name} — දෛනික Mega Quiz කාලසටහන</b>\n\n` +
      `🌅 <b>උදෑසන වටය (Morning Round):</b> <code>${item.morning}</code>\n` +
      `🌆 <b>සවස වටය (Evening Round):</b> <code>${item.evening}</code>\n` +
      `🔥 <b>දිනපතා වට 3 කින් MCQ 90 ක්!</b>\n\n` +
      `💡 <i>අනෙකුත් විෂයයන්හි කාලසටහන් බැලීමට පහතින් තෝරන්න:</i>`;
    return bot.sendMessage(chatId, cap, { parse_mode: 'HTML', reply_markup: buildScheduleKeyboard(normCode), ...replyOpts }).catch(() => { });
  }

  // If no specific subject given, check forum topic or default to Sinhala
  const defaultSub = 'si';
  const item = SUBJECT_TIMETABLES[defaultSub];
  const stickerFile = path.resolve(_scriptDir, item.sticker);
  if (fs.existsSync(stickerFile)) {
    await bot.sendSticker(chatId, stickerFile, replyOpts).catch(() => { });
  }
  const cap =
    `⏰ <b>A/L MCQ HUB — විෂය අනුව දෛනික කාලසටහන් (Timetable Stickers)</b>\n\n` +
    `ඔබට අවශ්‍ය විෂයයෙහි <b>පැහැදිලි Sticker එක</b> ලබා ගැනීමට පහත බොත්තමක් ඔබන්න:`;
  return bot.sendMessage(chatId, cap, { parse_mode: 'HTML', reply_markup: buildScheduleKeyboard(defaultSub), ...replyOpts }).catch(() => { });
}

// Command: /quiz_schedule or /timetable or /quiz_timetable
bot.onText(/^\/(quiz_schedule|schedule_quiz|timetable|quiz_timetable)(?:_([a-z]+))?(?:\s+([a-z]+))?(@\w+)?/i, async (msg, match) => {
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const { threadId, topicSubject } = getThreadContext(msg);
  const requestedSub = match[2] || match[3] || topicSubject;
  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };
  return sendSubjectTimetable(chatId, requestedSub, replyOpts);
});

// Command: /trigger_quiz <subject>
bot.onText(/^\/trigger_quiz(?:\s+([a-z0-9_]+))?(@\w+)?/i, async (msg, match) => {
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const { threadId, topicSubject } = getThreadContext(msg);
  const rawArg = match[1] ? match[1].trim() : topicSubject;
  const subCode = normalizeScheduleSubCode(rawArg) || topicSubject || 'si';
  return startAIQuizCompetition(msg, chatId, '', subCode);
});

// Command: /help or /guide or /instructions (Complete Topic-Aware Master Guide)
bot.onText(/\/(help|guide|instructions|bot_help)(?:_([a-z0-9_]+))?(?:@\w+)?\s*(.*)/i, async (msg, match) => {
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const { threadId, topicSubject } = getThreadContext(msg);
  const rawArg = (match[2] || match[3] || '').trim();
  const subCode = normalizeSubjectCode(rawArg) || topicSubject;

  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  // If inside a subject topic thread or explicit subject requested -> Show deep-dive guide for that subject!
  if (subCode) {
    const guide = buildSubjectHelpGuide(subCode);
    return bot.sendMessage(chatId, guide.text, {
      parse_mode: 'HTML',
      reply_markup: guide.keyboard,
      ...replyOpts
    }).catch(() => { });
  }

  // Otherwise, show Master Help Guide with subject switcher buttons
  const masterGuide = buildMainHelpGuide();
  return bot.sendMessage(chatId, masterGuide.text, {
    parse_mode: 'HTML',
    reply_markup: masterGuide.keyboard,
    ...replyOpts
  }).catch(() => { });
});

// Command: /map or /maps or /sithiyam or /map_quiz (A/L Interactive Map Marking & Quiz Hub)
bot.onText(/^\/(map|maps|sithiyam|map_quiz|mapquiz)(?:@\w+)?(?:\s+(.*))?$/i, async (msg, match) => {
  if (!await enforceDirectAccessControl(msg)) return;
  const chatId = msg.chat.id;
  const { threadId } = getThreadContext(msg);
  const isGroup = msg.chat && (msg.chat.type === 'group' || msg.chat.type === 'supergroup');
  const replyOpts = {
    reply_to_message_id: msg.message_id,
    ...(threadId ? { message_thread_id: threadId } : {})
  };

  const { text, keyboard } = buildMapHubMessage(BASE_URL, isGroup);
  return bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
    ...replyOpts
  }).catch(e => console.error('Error sending map hub message:', e.message));
});

// Listener for Web App Data Submission (e.g. Map Exam Results from Mini App)
bot.on('message', async (msg) => {
  if (msg.web_app_data && msg.web_app_data.data) {
    try {
      const data = JSON.parse(msg.web_app_data.data);
      if (data.type === 'map_exam_result') {
        const formatted = formatMiniAppResult(msg.from, data);
        recordScore(msg.from.id, msg.from.first_name || 'Student', 'map', data.score || 0);
        return bot.sendMessage(msg.chat.id, formatted, {
          parse_mode: 'Markdown',
          reply_to_message_id: msg.message_id,
          ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {})
        });
      }
    } catch (e) {
      console.error('Error handling web_app_data:', e.message);
    }
  }
});

// Callback Query Handler
bot.on('callback_query', async (query) => {
  const chatId = query.message ? query.message.chat.id : null;
  const messageId = query.message ? query.message.message_id : null;
  const data = query.data;
  const fromId = query.from ? query.from.id : chatId;
  const isGroup = query.message && (query.message.chat.type === 'group' || query.message.chat.type === 'supergroup');
  const threadId = query.message?.message_thread_id || null;

  if (query.from) registerUser(query.from);

  if (!isGroup && !isAdminUser(fromId)) {
    await safeAnswerCallback(query.id, '🔒 මෙම Bot භාවිතය Telegram Group එක තුළ පමණක් සක්‍රියයි. කරුණාකර අපගේ Group එකට එක්වන්න.', true);
    return;
  }

  try {
    // Map Marking Hub & Quizzes
    if (data === 'open_map_hub') {
      await safeAnswerCallback(query.id);
      const { text, keyboard } = buildMapHubMessage(BASE_URL, isGroup);
      return bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }).catch(async () => {
        await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard, ...(threadId ? { message_thread_id: threadId } : {}) });
      });
    }

    if (data && data.startsWith('map_quiz:')) {
      const parts = data.split(':');
      const sub = parts[1] || 'all';
      const mapKey = parts[2] || 'sri_lanka';
      await safeAnswerCallback(query.id, '🗺️ සිතියම් ප්‍රශ්නය සූදානම් කරමින් පවතී...');
      const q = generateInChatMapQuestion(sub, mapKey);
      if (!q) {
        return bot.sendMessage(chatId, '❌ සිතියම් ප්‍රශ්න හමු නොවීය.', { ...(threadId ? { message_thread_id: threadId } : {}) });
      }
      return bot.editMessageText(q.text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: q.keyboard
      }).catch(async () => {
        await bot.sendMessage(chatId, q.text, { parse_mode: 'Markdown', reply_markup: q.keyboard, ...(threadId ? { message_thread_id: threadId } : {}) });
      });
    }

    if (data && data.startsWith('map_ans:')) {
      const parts = data.split(':');
      const selectedId = parts[1];
      const correctId = parts[2];
      const sub = parts[3] || 'all';
      const mapKey = parts[4] || 'sri_lanka';

      const result = evaluateInChatMapAnswer(selectedId, correctId, sub, mapKey);
      if (result.isCorrect && query.from) {
        recordScore(query.from.id, query.from.first_name || 'User', 'map', 10);
      }
      await safeAnswerCallback(query.id, result.isCorrect ? '🎯 100% නිවැරදියි! (+10)' : '❌ පිළිතුර වැරදියි');
      return bot.editMessageText(result.text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: result.keyboard
      }).catch(async () => {
        await bot.sendMessage(chatId, result.text, { parse_mode: 'Markdown', reply_markup: result.keyboard, ...(threadId ? { message_thread_id: threadId } : {}) });
      });
    }

    // Interactive Help: Subject Deep-Dive
    if (data && data.startsWith('help_sub_')) {
      const subCode = data.replace('help_sub_', '');
      const guide = buildSubjectHelpGuide(subCode);
      await safeAnswerCallback(query.id);
      return bot.editMessageText(guide.text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: guide.keyboard
      }).catch(async () => {
        await bot.sendMessage(chatId, guide.text, { parse_mode: 'HTML', reply_markup: guide.keyboard, ...(threadId ? { message_thread_id: threadId } : {}) });
      });
    }

    // Interactive Help: Back to Master Menu
    if (data === 'help_main') {
      const masterGuide = buildMainHelpGuide();
      await safeAnswerCallback(query.id);
      return bot.editMessageText(masterGuide.text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: masterGuide.keyboard
      }).catch(async () => {
        await bot.sendMessage(chatId, masterGuide.text, { parse_mode: 'HTML', reply_markup: masterGuide.keyboard, ...(threadId ? { message_thread_id: threadId } : {}) });
      });
    }

    // Interactive Help: Group Rules
    if (data === 'help_rules') {
      const rulesText =
        `📜 <b>A/L MCQ HUB — Group & Topic නීති සහ මාර්ගෝපදේශ</b>\n\n` +
        `1. 🎯 <b>විෂය සීමා කිරීම (Topic Isolation):</b>\n` +
        `සෑම ප්‍රශ්නයක්ම අදාළ විෂය Forum Topic එක තුළ පමණක් යොමු කරන්න. වෙනත් විෂයයන් වල ප්‍රශ්න ඇසීමෙන් Bot විසින් ප්‍රතික්ෂේප කරනු ලැබේ.\n\n` +
        `2. ⏱️ <b>සජීවී Quiz තරඟ:</b>\n` +
        `සෑම ප්‍රශ්නයකටම තත්පර 20 ක කාලයක් හිමි වේ. Timer එක අවසන් වීමට පෙර පිළිතුරු සලකුණු කරන්න.\n\n` +
        `3. 🚫 <b>Spam & අනවශ්‍ය පණිවිඩ:</b>\n` +
        `අධ්‍යාපනික නොවන පණිවිඩ හෝ ප්‍රචාරක දැන්වීම් යැවීමෙන් වළකින්න.\n\n` +
        `4. 🤖 <b>AI පිළිතුරු:</b>\n` +
        `සියලුම විග්‍රහයන් NotebookLM වෙතින් 100% නිල A/L විෂය නිර්දේශයට අනුව සැපයේ.`;

      const rulesKb = {
        inline_keyboard: [
          [{ text: '⬅️ ආපසු (Main Menu)', callback_data: 'help_main' }]
        ]
      };
      await safeAnswerCallback(query.id);
      return bot.editMessageText(rulesText, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: rulesKb
      }).catch(() => { });
    }

    // Quick Actions from Help Guide: Quiz
    if (data && data.startsWith('help_act_quiz_')) {
      const subCode = data.replace('help_act_quiz_', '');
      await safeAnswerCallback(query.id, '🎯 Quiz තරඟය ආරම්භ වෙමින් පවතී...');
      return startAIQuizCompetition(query.message, chatId, '', subCode);
    }

    // Quick Actions from Help Guide: Voice Note
    if (data && data.startsWith('help_act_voice_')) {
      const subCode = data.replace('help_act_voice_', '');
      const meta = getSubjectHelpText(subCode);
      const ex = meta ? (meta.voiceExample || meta.audioExample) : 'විෂය කරුණු';
      await safeAnswerCallback(query.id, '🎙️ Voice Note ලබා ගැනීමට මාතෘකාව ලබා දෙන්න...');
      const hint = `🎙️ <b>${meta ? meta.name : subCode} Voice Note එකක් ලබා ගැනීමට:</b>\n\nChat එකෙහි <code>/voice ${ex}</code> ලෙස Type කර එවන්න!`;
      return bot.sendMessage(chatId, hint, { parse_mode: 'HTML', ...(threadId ? { message_thread_id: threadId } : {}) });
    }

    // Quick Actions from Help Guide: Exam Paper
    if (data && data.startsWith('help_act_paper_')) {
      const subCode = data.replace('help_act_paper_', '');
      const meta = getSubjectHelpText(subCode);
      const ex = meta ? meta.paperExample : '2024 පසුගිය ප්‍රශ්න පත්‍රය';
      await safeAnswerCallback(query.id, '📄 Exam Paper ලබා ගැනීමට...');
      const hint = `📄 <b>${meta ? meta.name : subCode} Exam Paper එකක් ලබා ගැනීමට:</b>\n\nChat එකෙහි <code>/paper ${ex}</code> ලෙස Type කර එවන්න!`;
      return bot.sendMessage(chatId, hint, { parse_mode: 'HTML', ...(threadId ? { message_thread_id: threadId } : {}) });
    }

    if (data && data.startsWith('sch_')) {
      const subCode = data.replace('sch_', '');
      const subName = SUBJECT_TIMETABLES[subCode]?.name || subCode;
      await safeAnswerCallback(query.id, `⏰ ${subName} කාලසටහන...`);
      const replyOpts = {
        ...(query.message?.message_thread_id ? { message_thread_id: query.message.message_thread_id } : {})
      };
      return sendSubjectTimetable(chatId, subCode, replyOpts);
    }

    if (data && data.startsWith('trig_')) {
      const subCode = data.replace('trig_', '');
      await safeAnswerCallback(query.id, `🚀 Quiz තරඟය ආරම්භ වෙමින් පවතී...`);
      return startAIQuizCompetition(query.message, chatId, '', subCode);
    }
    if (data && data.startsWith('vnaud_')) {
      const shortId = data.replace('vnaud_', '');
      const item = voiceNoteTopicMap.get(shortId);
      await safeAnswerCallback(query.id, '🎙️ NotebookLM AI Podcast සකස් කිරීම ආරම්භ විය...');
      if (item && item.topic) {
        await triggerAudioOverviewPodcast(chatId, query.from, item.subCode, item.topic, query.message.message_id, query.message.message_thread_id);
      } else {
        await bot.sendMessage(chatId, `🎙️ AI Podcast එකක් ලබා ගැනීමට \`/audio ඔබගේ මාතෘකාව\` ලෙස Chat එකට එවන්න.`, { parse_mode: 'Markdown' });
      }
      return;
    }

    if (data && data.startsWith('vnpdf_')) {
      const shortId = data.replace('vnpdf_', '');
      const item = voiceNoteTopicMap.get(shortId);
      await safeAnswerCallback(query.id, '📄 PDF සටහන සකස් කරමින් පවතී...');
      if (item && item.topic) {
        await triggerAITutorNote(chatId, query.from, item.subCode, item.topic, query.message.message_id, query.message.message_thread_id);
      } else {
        await bot.sendMessage(chatId, `📄 PDF අධ්‍යයන සටහනක් ලබා ගැනීමට \`/ai ඔබගේ මාතෘකාව\` ලෙස Chat එකට එවන්න.`, { parse_mode: 'Markdown' });
      }
      return;
    }

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

      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(e => { });
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

      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: kb }).catch(e => { });
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

        await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }).catch(e => { });
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

        await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: kb }).catch(e => { });
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

      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }).catch(e => { });
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

        await bot.editMessageText(confirmText, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }).catch(e => { });

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
        }).catch(e => { });
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
      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: kb }).catch(e => { });
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

      await bot.editMessageText(adminText, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: adminKeyboard }).catch(e => { });
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
      await bot.editMessageText(statsText, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: kb }).catch(e => { });
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
      }).catch(e => { });
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
      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: backKb }).catch(e => { });
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
        }).catch(e => { });
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
        }).catch(e => { });
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
        }).catch(e => { });
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
      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: backKb }).catch(e => { });
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
          await bot.sendMessage(chatId, '❌ ප්‍රශ්න පත්‍රයේ ප්‍රශ්න පූරණය කිරීමට නොහැකි විය.').catch(e => { });
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
        }).catch(e => { });

        // Send first poll & start continuous 20s step streamer
        sendNextGroupNativePollStep(chatId);
      }

      await safeAnswerCallback(query.id);
      return;
    }

    // 8.5 Start Exam Paper Saved MCQ Quiz Competition
    if (data.startsWith('start_paper_quiz_')) {
      const sessionId = data.replace('start_paper_quiz_', '');
      const paperQuiz = loadPaperQuiz(sessionId);
      if (!paperQuiz || !paperQuiz.questions || paperQuiz.questions.length === 0) {
        await safeAnswerCallback(query.id, '⚠️ මෙම ප්‍රශ්න පත්‍ර Quiz එක කල් ඉකුත් වී ඇත.');
        return;
      }
      await safeAnswerCallback(query.id, '🎯 MCQ Quiz තරඟය ආරම්භ වෙමින් පවතී...');
      const msgFake = {
        message_id: messageId,
        from: query.from,
        message_thread_id: query.message?.message_thread_id || null
      };
      const { threadId } = getThreadContext(msgFake);
      const sessionKey = threadId ? `${chatId}_${threadId}` : String(chatId);
      runLiveQuizQuestions(chatId, threadId, sessionKey, query.from, paperQuiz.questions, paperQuiz.subCode, paperQuiz.topicTitle);
      return;
    }

    // 8.6 /allnotes Open / Send Existing PDF Study Note Callback Handler
    if (data.startsWith('open_note_')) {
      const noteId = data.replace('open_note_', '');
      const registry = loadPdfRegistry();
      const noteObj = registry.find(n => n.id === noteId);

      if (!noteObj) {
        await safeAnswerCallback(query.id, '⚠️ මෙම අධ්‍යයන සටහන හමු නොවුණි.');
        return;
      }

      // If already has direct link in this chat, notify
      if (noteObj.link && noteObj.chatId === chatId) {
        await safeAnswerCallback(query.id, '📖 මෙම සටහන පෙර යවන ලද පණිවිඩය වෙත යොමු විය.');
        return;
      }

      if (noteObj.filePath && fs.existsSync(noteObj.filePath)) {
        await safeAnswerCallback(query.id, '📥 PDF සටහන විවෘත වෙමින් පවතී...');
        const msgFake = {
          message_id: messageId,
          from: query.from,
          message_thread_id: query.message?.message_thread_id || null
        };
        const { threadId } = getThreadContext(msgFake);
        const replyOpts = {
          ...(threadId ? { message_thread_id: threadId } : {})
        };

        bot.sendChatAction(chatId, 'upload_document', threadId ? { message_thread_id: threadId } : {}).catch(() => { });
        const sentDoc = await bot.sendDocument(chatId, noteObj.filePath, {
          caption: `📄 <b>A/L MCQ HUB — ${noteObj.title}</b>\n\n` +
            `💡 <i>ඔබට මෙම සම්පූර්ණ අධ්‍යයන සටහන PDF ගොනුවක් ලෙස Download කර මුද්‍රණය (Print) කරගත හැක.</i>`,
          parse_mode: 'HTML',
          ...replyOpts
        }, {
          filename: noteObj.filename || `${noteObj.id}.pdf`,
          contentType: 'application/pdf'
        }).catch(e => console.error('Error sending existing PDF note:', e.message));

        if (sentDoc) {
          registerPdfNote({
            subCode: noteObj.subCode,
            title: noteObj.title,
            filePath: noteObj.filePath,
            chatId: chatId,
            threadId: threadId,
            messageId: sentDoc.message_id,
            chatUsername: sentDoc.chat?.username || null,
            fileId: sentDoc.document?.file_id || null,
            type: noteObj.type || 'note'
          });
        }
        return;
      } else {
        await safeAnswerCallback(query.id, '⚠️ PDF ගොනුව තාවකාලිකව ලබාගත නොහැක.');
        return;
      }
    }

    // 8.7 /allnotes Subject Notes Submenu Callback Handler
    if (data.startsWith('allnotes_sub_')) {
      const subCode = data.replace('allnotes_sub_', '');
      const noteMenu = buildSubjectNotesMessage(subCode);
      if (noteMenu) {
        await safeAnswerCallback(query.id);
        await bot.editMessageText(noteMenu.text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: noteMenu.reply_markup
        }).catch(async () => {
          await bot.sendMessage(chatId, noteMenu.text, {
            parse_mode: 'Markdown',
            reply_markup: noteMenu.reply_markup,
            ...(query.message?.message_thread_id ? { message_thread_id: query.message.message_thread_id } : {})
          }).catch(() => { });
        });
      }
      return;
    }

    // 8.8 /allnotes Main Menu Callback Handler
    if (data === 'allnotes_menu') {
      const mainMenu = buildAllNotesMainMenu();
      await safeAnswerCallback(query.id);
      await bot.editMessageText(mainMenu.text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: mainMenu.reply_markup
      }).catch(async () => {
        await bot.sendMessage(chatId, mainMenu.text, {
          parse_mode: 'Markdown',
          reply_markup: mainMenu.reply_markup,
          ...(query.message?.message_thread_id ? { message_thread_id: query.message.message_thread_id } : {})
        }).catch(() => { });
      });
      return;
    }

    // 8.9 Normal Quiz: Back to Main Subject Selection Menu
    if (data === 'nq_menu') {
      const menu = buildSubjectMenuMessage();
      await safeAnswerCallback(query.id);
      await bot.editMessageText(menu.text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: menu.reply_markup
      }).catch(async () => {
        await bot.sendMessage(chatId, menu.text, {
          parse_mode: 'HTML',
          reply_markup: menu.reply_markup,
          ...(threadId ? { message_thread_id: threadId } : {})
        });
      });
      return;
    }

    // 8.10 Normal Quiz: Close Menu
    if (data === 'nq_close') {
      await safeAnswerCallback(query.id, '✅ මෙනුව වසන ලදී');
      return bot.deleteMessage(chatId, messageId).catch(() => { });
    }

    // 8.11 Normal Quiz: Subject Quizzes List or Page Switch
    if (data && (data.startsWith('nq_sub:') || data.startsWith('nq_page:'))) {
      const parts = data.split(':');
      const subCode = parts[1];
      const page = parseInt(parts[2] || '1', 10);
      const quizView = buildSubjectQuizzesMessage(subCode, page);
      if (!quizView) {
        await safeAnswerCallback(query.id, '⚠️ මෙම විෂය සඳහා Quiz හමු නොවීය.');
        return;
      }
      await safeAnswerCallback(query.id);
      await bot.editMessageText(quizView.text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: quizView.reply_markup
      }).catch(async () => {
        await bot.sendMessage(chatId, quizView.text, {
          parse_mode: 'HTML',
          reply_markup: quizView.reply_markup,
          ...(threadId ? { message_thread_id: threadId } : {})
        });
      });
      return;
    }

    // 8.12 Normal Quiz: Start 50-MCQ Live Quiz Competition
    if (data && data.startsWith('nq_start:')) {
      const parts = data.split(':');
      const subCode = parts[1];
      const quizNum = parseInt(parts[2] || '1', 10);
      const quizObj = getQuizByNumber(subCode, quizNum);

      if (!quizObj || !quizObj.questions || quizObj.questions.length === 0) {
        await safeAnswerCallback(query.id, '⚠️ මෙම Quiz එක සොයාගත නොහැකි විය.');
        return;
      }

      const msgFake = {
        message_id: messageId,
        from: query.from,
        message_thread_id: query.message?.message_thread_id || null
      };
      const { threadId: ctxThreadId } = getThreadContext(msgFake);
      const targetThreadId = ctxThreadId ? Number(ctxThreadId) : null;
      const sessionKey = targetThreadId ? `${chatId}_${targetThreadId}` : String(chatId);

      if (aiQuizSessions[sessionKey] && !aiQuizSessions[sessionKey].isStopped) {
        await safeAnswerCallback(query.id, '⚠️ දැනටමත් සජීවී Quiz තරඟයක් ක්‍රියාත්මක වේ. එය අවසන් වන තෙක් රැඳී සිටින්න.');
        return;
      }

      await safeAnswerCallback(query.id, `🎯 Quiz ${String(quizNum).padStart(2, '0')} ආරම්භ වෙමින් පවතී...`);
      runLiveQuizQuestions(
        chatId,
        targetThreadId,
        sessionKey,
        query.from,
        quizObj.questions,
        subCode,
        quizObj.quiz_title
      );
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
      }).catch(e => { });
      return;
    }

  } catch (err) {
    console.error('Error handling callback query:', err);
    await safeAnswerCallback(query.id, 'දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.');
  }
});

console.log('✅ Telegram Bot Ready! Listening for messages, poll answers & leaderboards...');
