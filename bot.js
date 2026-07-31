import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import http from 'http';
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

// Tiny HTTP Health Check Server (Required for Cloud Platforms like Koyeb, Render, Railway, Glitch to stay alive 24/7)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🎓 A/L MCQ Quiz Telegram Bot (@AL_MCQbot) is Running Live 24/7!');
}).listen(PORT, () => {
  console.log(`🌐 Health check HTTP server is listening on port ${PORT}`);
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
      '2021': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2021 (BC-11)', file: 'BC11.html', img: 'BC11.png' }
    }
  },
  sin: {
    name: '✍️ සිංහල (Sinhala Language)',
    shortName: 'සිංහල',
    papers: {
      '2020': { title: 'සිංහල 2020 — I පත්‍රය MCQ', file: 'sinhala2020.html', img: 'sinhala2020.png' },
      '2021': { title: 'සිංහල 2021 — I පත්‍රය MCQ', file: 'sinhala2021.html', img: 'sinhala2021.png' },
      '2022': { title: 'සිංහල 2022 — I පත්‍රය MCQ', file: 'sinhala2022.html', img: 'sinhala2022.png' },
      '2024': { title: 'සිංහල 2024 — I පත්‍රය MCQ', file: 'sinhala2024.html', img: 'sinhala2024.png' },
      '2025': { title: 'සිංහල 2025 — I පත්‍රය MCQ', file: 'sinhala2025.html', img: 'sinhala2025.png' }
    }
  }
};

// State storage for active Native Telegram Poll sessions
const userPollSessions = {}; // chatId -> { subId, yearKey, paperKey, title, questions, qIndex, score, startTime }
const pollIdMap = {}; // pollId -> { chatId, correctOption }

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
  { command: 'leaderboard', description: '🏆 උසස් පෙළ ලකුණු පුවරුව (Leaderboards & Ranks)' },
  { command: 'help', description: '📖 භාවිතය පිළිබඳ උපදෙස් (Help & Instructions)' },
  { command: 'myid', description: '👤 ඔබගේ Telegram User ID එක (View My ID)' }
]).catch(err => console.log('Notice setting commands:', err.message));

console.log('🚀 A/L MCQ Quiz Telegram Bot is starting...');
console.log(`🔗 WebApp Portal URL: ${portalUrl}`);
console.log(`🛡️ Configured ADMIN_ID: ${ADMIN_ID || 'None (Public Admin Mode)'}`);

// Helper: Zero-Manual-Interaction Automated WhatsApp Channel Publisher via Green API
async function autoPostToWhatsAppChannel(messageText) {
  const instanceId = (process.env.GREEN_API_INSTANCE || '710722698143').trim();
  const apiToken = (process.env.GREEN_API_TOKEN || 'b65f5e2285e54499a88b78d13354ba79f7fe2bd4c0d648049f').trim();
  const targetChat = (process.env.WA_TARGET_CHAT || '120363409065043686@g.us').trim();

  if (!instanceId || !apiToken) return false;

  const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: targetChat,
        message: messageText
      })
    });

    const data = await res.json();
    if (data && data.idMessage) {
      console.log(`🟢 100% Automated WhatsApp Post sent! Message ID: ${data.idMessage}`);
      return true;
    } else {
      console.log('Green API response:', JSON.stringify(data));
    }
  } catch (err) {
    console.error('Notice sending automated WA broadcast:', err.message);
  }
  return false;
}

// Helper: Run Native WhatsApp Poll Quiz directly inside WhatsApp Group
async function runNativeWhatsAppGroupQuiz(paperKey) {
  if (!paperKey) return;
  const parts = paperKey.split('_');
  const subId = parts[0];
  const yearKey = parts[1];

  const subData = QUIZ_DATA[subId];
  const paperData = subData?.papers[yearKey];
  if (!paperData) return;

  const questions = loadQuestionsFromHtml(paperData.file);
  if (!questions || questions.length === 0) return;

  console.log(`🚀 Starting Native WhatsApp Poll Quiz for ${paperData.title} in WhatsApp Group...`);

  const instanceId = (process.env.GREEN_API_INSTANCE || '710722698143').trim();
  const apiToken = (process.env.GREEN_API_TOKEN || 'b65f5e2285e54499a88b78d13354ba79f7fe2bd4c0d648049f').trim();
  const targetChat = (process.env.WA_TARGET_CHAT || '120363409065043686@g.us').trim();

  // Send Intro Card to WhatsApp Group
  const waIntro = `🎓 *${paperData.title}*\n\n🎯 Native WhatsApp Poll Quiz එක දැන් මෙම Group එක තුළින්ම ආරම්භ වේ!\nපළමු ප්‍රශ්නය පහත දැක්වේ 👇`;
  await autoPostToWhatsAppChannel(waIntro);

  // Send Question 1 as Native WhatsApp Poll
  const q1 = questions[0];
  const q1Title = cleanText(`[1/${questions.length}] ${q1.q}`, 250);
  const q1Opts = (q1.o || []).map((o, idx) => ({ optionName: cleanText(`${idx + 1}. ${o}`, 90) }));

  try {
    await fetch(`https://api.green-api.com/waInstance${instanceId}/sendPoll/${apiToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: targetChat,
        message: q1Title,
        options: q1Opts,
        multipleAnswers: false
      })
    });
    console.log(`🟢 Native WhatsApp Poll Q1 sent to group!`);
  } catch (err) {
    console.error('Error sending Native WA Poll:', err.message);
  }
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
    [{ text: QUIZ_DATA.pl.name, callback_data: 'sub_pl' }],
    [{ text: QUIZ_DATA.hist.name, callback_data: 'sub_hist' }],
    [{ text: QUIZ_DATA.bc.name, callback_data: 'sub_bc' }],
    [{ text: QUIZ_DATA.sin.name, callback_data: 'sub_sin' }],
    [
      { text: '🏆 All-Island Leaderboard (ලකුණු පුවරුව)', callback_data: 'view_top_overall' }
    ]
  ];

  // Dedicated Full-Width WhatsApp Channel Button
  if (WA_CHANNEL_URL && WA_CHANNEL_URL.startsWith('http')) {
    keyboard.push([
      { text: '🟢 Join Official WhatsApp Channel (WhatsApp චැනලය)', url: WA_CHANNEL_URL }
    ]);
  }

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
  return {
    inline_keyboard: [
      [{ text: '📑 පසුගිය ප්‍රශ්න පත්‍ර (Past Papers)', callback_data: `cat_${subId}_pp` }],
      [{ text: '📚 වෙනත් (Model Papers & Revision)', callback_data: `cat_${subId}_other` }],
      [{ text: '⬅️ ප්‍රධාන මෙගුවට (Back to Subjects)', callback_data: 'nav_subjects' }]
    ]
  };
}

// Helper: Generate Year/Paper Selection Grid (Step 3)
function getYearKeyboard(subId) {
  const subData = QUIZ_DATA[subId];
  const keys = Object.keys(subData.papers);
  
  const keyboard = [];
  let row = [];

  keys.forEach((key, index) => {
    row.push({ text: `📝 ${key}`, callback_data: `paper_${subId}_${key}` });
    if (row.length === 3 || index === keys.length - 1) {
      keyboard.push(row);
      row = [];
    }
  });

  keyboard.push([{ text: '⬅️ ආපසු (Back)', callback_data: `sub_${subId}` }]);
  return { inline_keyboard: keyboard };
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
    const userTag = r.username ? ` (${r.username})` : '';
    const speed = formatDuration(r.timeSec || 0);
    text += `${medal} **${idx + 1} වන ස්ථානය:** ${r.name}${userTag}\n   🎯 ලකුණු: **${r.score}** | ⏱️ කාලය: **${speed}**\n\n`;
  });

  // 2. Top 20 Ranked Table
  text += `📊 **හොඳම ක්‍රීඩකයින් 20 දෙනාගේ ලැයිස්තුව (Top 20 Table):**\n`;
  ranks.forEach((r, idx) => {
    const rankNum = idx + 1;
    const userTag = r.username ? ` (${r.username})` : '';
    const speed = formatDuration(r.timeSec || 0);
    text += `${rankNum}. **${r.name}**${userTag} — 🎯 **${r.score}** | ⏱️ ${speed}\n`;
  });

  return text;
}

// Helper: Send Next Native Poll Question
async function sendNextNativePoll(chatId) {
  const session = userPollSessions[chatId];
  if (!session) return;

  if (session.qIndex >= session.questions.length) {
    // Session Complete - Calculate Time Taken & Record Score in DB
    const total = session.questions.length;
    const score = session.score;
    const timeSec = Math.max(1, Math.round((Date.now() - session.startTime) / 1000));
    const pct = Math.round((score / total) * 100);

    // Save to Persistent DB
    recordScore(session.paperKey, {
      userId: chatId,
      name: session.userName,
      username: session.userUsername,
      score: score,
      total: total,
      timeSec: timeSec,
      timestamp: new Date().toISOString()
    });

    // Fetch updated Leaderboard & Podium
    const ranks = getLeaderboard(session.paperKey, 20);
    const lbText = generateLeaderboardMessage(session.title, ranks);

    let verdict = '🎉 විශිෂ්ටයි! ඔබ උසස් පෙළ පරීක්ෂණය සාර්ථකව නිම කළා.';
    if (pct < 50) verdict = '👍 මූලික අවබෝධයක් ඇත — තවදුරටත් පුහුණු වන්න.';
    else if (pct < 75) verdict = '🌟 හොඳයි! තවදුරටත් පුනරීක්ෂණය කරන්න.';

    const resultMessage = 
      `🏆 **පරීක්ෂණය සාර්ථකව අවසන්!**\n\n` +
      `🎯 **ඔබගේ ලකුණු:** ${score} / ${total} (${pct}%)\n` +
      `⏱️ **ගත වූ කාලය:** ${formatDuration(timeSec)}\n` +
      `📚 **ප්‍රශ්න පත්‍රය:** ${session.title}\n\n` +
      `${verdict}\n\n` +
      `───────────────────\n` +
      `${lbText}`;

    const finishKeyboard = {
      inline_keyboard: [
        [{ text: '🔄 නැවත උත්සාහ කරන්න (Retry)', callback_data: `native_${session.subId}_${session.yearKey}` }],
        [{ text: '📑 වෙනත් ප්‍රශ්න පත්‍රයක් (Select Paper)', callback_data: `cat_${session.subId}_pp` }]
      ]
    };

    await bot.sendMessage(chatId, resultMessage, {
      parse_mode: 'Markdown',
      reply_markup: finishKeyboard
    }).catch(e => console.error('Error sending result:', e.message));

    delete userPollSessions[chatId];
    return;
  }

  // Get current question
  const q = session.questions[session.qIndex];
  const qNum = session.qIndex + 1;
  const totalQ = session.questions.length;

  let rawQText = q.q || `ප්‍රශ්නය ${qNum}`;
  rawQText = cleanText(rawQText, 250);
  rawQText = rawQText.replace(/^\d+[\.\)\-]?\s*/, '');

  const cleanQ = cleanText(`[${qNum}/${totalQ}] ${rawQText}`, 290);
  const cleanOpts = (q.o || []).map(o => cleanText(o, 98));
  
  const rawExplain = cleanText(q.e || '', 185);
  const cleanExplain = rawExplain ? `💡 ${rawExplain}` : undefined;

  try {
    const pollMsg = await bot.sendPoll(chatId, cleanQ, cleanOpts, {
      type: 'quiz',
      correct_option_id: q.c,
      explanation: cleanExplain,
      is_anonymous: false
    });

    // Register Poll ID mapping
    pollIdMap[pollMsg.poll.id] = {
      chatId,
      correctOption: q.c
    };

  } catch (err) {
    console.error(`Error sending poll Q${qNum} to ${chatId}:`, err.message);
    session.qIndex++;
    sendNextNativePoll(chatId);
  }
}

// Background Task: Scheduled Broadcast Engine (Runs every 30 seconds)
// Triggers Native Telegram Polls directly when schedule time is reached!
setInterval(async () => {
  try {
    const pendingJobs = getPendingScheduledJobs();
    if (pendingJobs.length === 0) return;

    const db = readDb();
    const allUsers = Object.keys(db.users);
    const allGroups = Object.keys(db.groups || {});
    const allTargets = [...new Set([...allUsers, ...allGroups])];

    for (const job of pendingJobs) {
      console.log(`⏰ Executing scheduled broadcast job [${job.id}] to ${allUsers.length} users and ${allGroups.length} groups...`);
      
      const broadcastText = 
        `🚀 **සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය! (Live Quiz Started)**\n\n` +
        `${job.message}\n\n` +
        `👇 පහත **Start Live Quiz** ක්ලික් කර දැන්ම තරඟයට එකතු වන්න:`;

      // Native Poll Quiz Launch Button (Works 100% in both Private Chat and Groups!)
      const launchKb = job.paperKey ? {
        inline_keyboard: [
          [{ text: '🎯 දැන්ම තරඟයට එකතු වන්න (Start Live Quiz)', callback_data: `native_${job.paperKey}` }]
        ]
      } : undefined;

      for (const targetChatId of allTargets) {
        const isGroup = targetChatId.toString().startsWith('-');
        try {
          await bot.sendMessage(targetChatId, broadcastText, {
            parse_mode: 'Markdown',
            reply_markup: launchKb
          });
        } catch (err) {
          if (err.message.includes('kicked') || err.message.includes('not found') || err.message.includes('deactivated')) {
            if (isGroup) unregisterGroup(targetChatId);
          }
        }
      }

      // Zero-Manual-Interaction 100% Automated WhatsApp Channel Auto-Post
      const waMsgText = `🎓 A/L MCQ HUB — සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය!\n\n${job.message}\n\n👇 දැන්ම තරඟයට එකතු වන්න:\nhttps://t.me/${botUsername || 'AL_MCQbot'}?start=native_${job.paperKey || ''}`;
      await autoPostToWhatsAppChannel(waMsgText);

      // Launch Native WhatsApp Poll Quiz directly inside WhatsApp Group
      if (job.paperKey) {
        await runNativeWhatsAppGroupQuiz(job.paperKey);
      }

      markJobSent(job.id);
    }
  } catch (err) {
    console.error('Error in scheduled broadcast engine:', err.message);
  }
}, 30000);

// Middleware: Auto Register User / Group & Custom Button Text Handler
bot.on('message', (msg) => {
  if (msg.chat) {
    if (msg.chat.type === 'private' && msg.from) {
      registerUser(msg.from);
    } else if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
      registerGroup(msg.chat);
    }
  }

  if (msg.text) {
    console.log(`📩 Incoming message in [${msg.chat.type}] (Chat ID: ${msg.chat.id}) from ${msg.from?.first_name || 'User'}: "${msg.text}"`);

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
bot.onText(/\/start/i, (msg) => {
  const isGroup = msg.chat.type !== 'private';
  sendStartMenu(msg.chat.id, msg.from, isGroup);
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

  const schedDate = new Date(timeStr);
  if (isNaN(schedDate.getTime())) {
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

// Listener for Native Poll Answer Events
bot.on('poll_answer', async (answer) => {
  const pollId = answer.poll_id;
  const selectedOptions = answer.option_ids;

  const mapping = pollIdMap[pollId];
  if (!mapping) return;

  const { chatId, correctOption } = mapping;
  delete pollIdMap[pollId];

  const session = userPollSessions[chatId];
  if (session) {
    if (selectedOptions && selectedOptions[0] === correctOption) {
      session.score++;
    }
    session.qIndex++;

    setTimeout(() => {
      sendNextNativePoll(chatId);
    }, 1200);
  }
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
    // ------------------- ADMIN LIVE QUIZ SCHEDULER WIZARD -------------------
    
    // Admin Step 1: Select Subject for Live Quiz
    if (data === 'adm_sched_step1') {
      if (!isAdminUser(fromId)) {
        await safeAnswerCallback(query.id, '⛔ ඔබට මෙයට අවසර නොමැත.');
        return;
      }

      const text = `🚀 **Publish Live Quiz — පියවර 1/3: විෂය තෝරන්න**\n\nසජීවීව පැවැත්වීමට අවශ්‍ය විෂය පහතින් තෝරන්න:`;
      const kb = {
        inline_keyboard: [
          [{ text: QUIZ_DATA.pl.name, callback_data: 'adm_sub_pl' }],
          [{ text: QUIZ_DATA.hist.name, callback_data: 'adm_sub_hist' }],
          [{ text: QUIZ_DATA.bc.name, callback_data: 'adm_sub_bc' }],
          [{ text: QUIZ_DATA.sin.name, callback_data: 'adm_sub_sin' }],
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
          row.push({ text: `📝 ${key}`, callback_data: `adm_paper_${subId}_${key}` });
          if (row.length === 3 || idx === keys.length - 1) {
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
      const yearKey = parts[3];

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
            [{ text: '⬅️ ආපසු (Back)', callback_data: `adm_sub_${subId}` }]
          ]
        };

        await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: kb }).catch(e => {});
      }
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
      const yearKey = parts[4];
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
        if (!isNow) {
          addScheduledJob({
            time: targetDate.toISOString(),
            message: `🎯 **${paperData.title}** සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ වී ඇත!`,
            paperKey: paperKey
          });
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

        // 2. Broadcast Announcement Card to All Registered Students & Groups
        const announceMsg = isNow ?
          `🚀 **සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය! (Live Quiz Started)**\n\n` +
          `📚 **ප්‍රශ්න පත්‍රය:** ${paperData.title}\n\n` +
          `💡 **විශේෂතා:** Native Telegram Polls, Instant Confetti 🎉, Leaderboards & Top 3 Winner Podiums!\n\n` +
          `👇 පහත **Start Live Quiz** ක්ලික් කර දැන්ම තරඟයට එකතු වන්න:` :
          `🚀 **විශේෂ දැනුම්දීමයි — ඉදිරි සජීවී ප්‍රශ්න පත්‍ර තරඟය (Upcoming Live Quiz)**\n\n` +
          `📚 **ප්‍රශ්න පත්‍රය:** ${paperData.title}\n` +
          `${timeNotice}\n\n` +
          `💡 **විශේෂතා:**\n` +
          `• 🥇 🥈 🥉 ප්‍රථම ස්ථාන 3 සඳහා Winner Podiums\n` +
          `• 📊 All-Island Top 20 ලකුණු පුවරුව\n` +
          `• Real-time Timer සහ Instant Confetti 🎉\n\n` +
          `⏳ නියමිත වේලාව පැමිණි සැනින් මෙම Chat එකටම ඍජුවම Native Quiz Polls පැමිණෙනු ඇත. සූදානම්ව සිටින්න!`;

        // If Scheduled for FUTURE: NO BUTTON IS ATTACHED (Prevents early quiz completion)
        // If Publish NOW: Attach Native Telegram Poll Launch button (`native_${paperKey}`)
        const announceKb = isNow ? {
          inline_keyboard: [
            [{ text: '🎯 දැන්ම තරඟයට එකතු වන්න (Start Live Quiz)', callback_data: `native_${paperKey}` }]
          ]
        } : undefined;

        // Send to Users
        for (const uid of allUsers) {
          try {
            await bot.sendMessage(uid, announceMsg, { parse_mode: 'Markdown', reply_markup: announceKb });
          } catch (e) { }
        }

        // Send to Groups
        for (const gid of allGroups) {
          try {
            await bot.sendMessage(gid, announceMsg, { parse_mode: 'Markdown', reply_markup: announceKb });
          } catch (e) {
            if (e.message.includes('kicked') || e.message.includes('not found') || e.message.includes('deactivated')) {
              unregisterGroup(gid);
            }
          }
        }

        // 3. Automated Zero-Manual-Interaction WhatsApp Channel Broadcast Trigger
        const waMsgText = `🎓 A/L MCQ HUB — ${isNow ? 'සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය! (Live Quiz Started)' : 'ඉදිරි සජීවී ප්‍රශ්න පත්‍ර තරඟ දැනුම්දීම (Upcoming Live Quiz)'}\n\n📚 **ප්‍රශ්න පත්‍රය:** ${paperData.title}\n${!isNow ? timeNotice.replace(/\*/g, '') + '\n' : ''}\n👇 දැන්ම තරඟයට එකතු වන්න:\nhttps://t.me/${botUsername || 'AL_MCQbot'}?start=native_${paperKey}`;
        await autoPostToWhatsAppChannel(waMsgText);

        if (isNow) {
          await runNativeWhatsAppGroupQuiz(paperKey);
        }

        // 4. Send 1-Click WhatsApp Channel Post Link to Admin
        const waPostText = encodeURIComponent(
          `🎓 A/L MCQ HUB — ${isNow ? 'සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය!' : 'ඉදිරි සජීවී ප්‍රශ්න පත්‍ර තරඟය!'}\n\n` +
          `📚 ප්‍රශ්න පත්‍රය: ${paperData.title}\n` +
          `${!isNow ? timeNotice.replace(/\*/g, '') + '\n' : ''}` +
          `💡 විශේෂතා: Real-time Timer, All-Island Leaderboards & Podiums 🎉\n\n` +
          `👇 පහත ලින්ක් එක ක්ලික් කර දැන්ම තරඟයට එකතු වන්න:\n` +
          `https://t.me/${botUsername}?start=native_${paperKey}`
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
      const yearKey = parts[2];

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
          `📜 **ප්‍රශ්න ගණන:** MCQ 40\n` +
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

        await bot.sendPhoto(chatId, imgUrl, {
          caption: cardCaption,
          parse_mode: 'Markdown',
          reply_markup: launchKeyboard
        }).catch(e => {});
      }

      await safeAnswerCallback(query.id);
      return;
    }

    // 7. View Specific Paper Leaderboard
    if (data.startsWith('lb_')) {
      const parts = data.split('_'); // ['lb', 'pl', '2016']
      const subId = parts[1];
      const yearKey = parts[2];
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
      const parts = data.split('_'); // ['native', 'pl', '2016']
      const subId = parts[1];
      const yearKey = parts[2];
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

        // Initialize User Poll Session with Start Time
        userPollSessions[chatId] = {
          subId,
          yearKey,
          paperKey,
          title: paperData.title,
          questions: qList,
          qIndex: 0,
          score: 0,
          userName,
          userUsername,
          startTime: Date.now()
        };

        await bot.sendMessage(chatId, `🏁 **${paperData.title}** Native Telegram Quiz ආරම්භ විය!\nපළමු ප්‍රශ්නය පහත දැක්වේ 👇`, {
          parse_mode: 'Markdown'
        }).catch(e => {});

        // Send first poll
        sendNextNativePoll(chatId);
      }

      await safeAnswerCallback(query.id);
      return;
    }

  } catch (err) {
    console.error('Error handling callback query:', err);
    await safeAnswerCallback(query.id, 'දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.');
  }
});

console.log('✅ Telegram Bot Ready! Listening for messages, poll answers & leaderboards...');
