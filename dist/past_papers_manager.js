import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'past_papers_archive_db.json');

let cachedDb = null;
let lastLoadTime = 0;

/**
 * Load the Past Papers database with caching
 */
export function loadPastPapersDb() {
  const now = Date.now();
  if (cachedDb && (now - lastLoadTime) < 30000) {
    return cachedDb;
  }

  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      cachedDb = JSON.parse(raw);
      lastLoadTime = now;
      return cachedDb;
    }
  } catch (err) {
    console.error('⚠️ [PastPapers] Error reading past_papers_archive_db.json:', err.message);
  }

  return {
    group_id: -1004322002704,
    clean_group_id: "4322002704",
    subjects: {}
  };
}

/**
 * Normalize subject codes and aliases for Past Papers
 */
export function normalizePastPaperSubject(input) {
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

  return null;
}

/**
 * Thread ID to subject code mapping
 */
export function getSubjectByThreadId(threadId) {
  if (!threadId) return null;
  const tid = Number(threadId);
  const threadMap = {
    4210: 'si',
    4215: 'bc',
    4216: 'geo',
    4217: 'pl',
    4220: 'hist',
    4221: 'bs',
    4222: 'dr',
    4223: 'mu',
    4224: 'dn',
    4225: 'md',
    5490: 'agri'
  };
  return threadMap[tid] || null;
}

/**
 * Helper to construct direct Telegram forum topic message link
 * Format: https://t.me/c/<clean_group_id>/<thread_id>/<message_id>
 */
export function getDirectMessageLink(file, sub, cleanGroupId = '4322002704') {
  if (!file) return `https://t.me/c/${cleanGroupId}`;
  const threadId = file.thread_id || sub?.topic_thread_id;
  const msgId = file.message_id;
  if (threadId && msgId) {
    return `https://t.me/c/${cleanGroupId}/${threadId}/${msgId}`;
  }
  if (msgId) {
    return `https://t.me/c/${cleanGroupId}/${msgId}`;
  }
  if (threadId) {
    return `https://t.me/c/${cleanGroupId}/${threadId}`;
  }
  return file.message_link || `https://t.me/c/${cleanGroupId}`;
}

/**
 * Build 11-Subject Picker Menu for /paper
 */
export function buildPastPapersSubjectsMenu() {
  const text =
`📄 *A/L Past Papers — පසුගිය විභාග ප්‍රශ්න පත්‍ර මධ්‍යස්ථානය*
━━━━━━━━━━━━━━━━━━━━━
🎓 උසස් පෙළ විභාගයේ සියලුම ප්‍රධාන විෂයයන් සඳහා වන **පසුගිය විභාග ප්‍රශ්න පත්‍ර (Past Papers)** අපගේ Telegram Group Topic තුළ අන්තර්ගත කර ඇත.

👇 **ඔබට අවශ්‍ය විෂය පහතින් තෝරන්න:**`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📜 සිංහල (Sinhala)', callback_data: 'pp_sub_si' },
        { text: '☸️ බෞද්ධ ශිෂ්ටාචාරය (BC)', callback_data: 'pp_sub_bc' }
      ],
      [
        { text: '🏛️ ඉතිහාසය (History)', callback_data: 'pp_sub_hist' },
        { text: '⚖️ දේශපාලන විද්‍යාව (Pol Sci)', callback_data: 'pp_sub_pl' }
      ],
      [
        { text: '🌍 භූගෝල විද්‍යාව (Geography)', callback_data: 'pp_sub_geo' },
        { text: '💼 ව්‍යාපාර අධ්‍යයනය (BS)', callback_data: 'pp_sub_bs' }
      ],
      [
        { text: '🌾 කෘෂි විද්‍යාව (Agri)', callback_data: 'pp_sub_agri' },
        { text: '📡 මාධ්‍ය අධ්‍යයනය (Media)', callback_data: 'pp_sub_md' }
      ],
      [
        { text: '🎭 නාට්‍ය හා රංග කලාව (Drama)', callback_data: 'pp_sub_dr' },
        { text: '🎵 සංගීතය (Music)', callback_data: 'pp_sub_mu' }
      ],
      [
        { text: '💃 නැටුම් (Dancing)', callback_data: 'pp_sub_dn' }
      ],
      [
        { text: '📝 ආදර්ශ ප්‍රශ්න පත්‍ර (Model Papers)', callback_data: 'mp_main' },
        { text: '📑 ලකුණු දීමේ පටිපාටි (Marking Schemes)', callback_data: 'mark_subjects' }
      ]
    ]
  };

  return { text, keyboard };
}

/**
 * Build Year Navigation Buttons for a subject (Sinhala Medium only)
 * Each Year Button is a Direct Navigation Link URL Button!
 */
export function buildPastPapersYearsMenu(subCode) {
  const db = loadPastPapersDb();
  const sub = db.subjects?.[subCode];

  if (!sub) {
    return buildPastPapersSubjectsMenu();
  }

  const cleanGroupId = db.clean_group_id || '4322002704';
  const allFiles = Object.values(sub.files || {});
  const filtered = allFiles
    .sort((a, b) => {
      const ya = parseInt(a.year || '0', 10);
      const yb = parseInt(b.year || '0', 10);
      if (isNaN(ya) && isNaN(yb)) return 0;
      if (isNaN(ya)) return 1;
      if (isNaN(yb)) return -1;
      return yb - ya;
    });

  const icon = sub.icon || '📄';
  const text =
`${icon} *${sub.name}*
🌐 **🇱🇰 සිංහල මාධ්‍යය (Sinhala Medium)**
━━━━━━━━━━━━━━━━━━━━━
📂 **පසුගිය විභාග ප්‍රශ්න පත්‍ර (Past Papers) ලැයිස්තුව:**
_පහතින් ඔබට අවශ්‍ය වර්ෂය මත Click කළ විට Group Forum Topic එක තුළ ඇති නිවැරදි Past Paper File එක වෙත සෘජුවම Navigation Jump වේ._`;

  const inlineKeyboard = [];

  // Group years in 2-column layout
  for (let i = 0; i < filtered.length; i += 2) {
    const row = [];
    const f1 = filtered[i];
    const link1 = getDirectMessageLink(f1, sub, cleanGroupId);
    row.push({
      text: `📖 ${f1.year || 'Past'} Paper ↗️`,
      url: link1
    });

    if (i + 1 < filtered.length) {
      const f2 = filtered[i + 1];
      const link2 = getDirectMessageLink(f2, sub, cleanGroupId);
      row.push({
        text: `📖 ${f2.year || 'Past'} Paper ↗️`,
        url: link2
      });
    }
    inlineKeyboard.push(row);
  }

  if (filtered.length === 0) {
    const fallbackLink = `https://t.me/c/${cleanGroupId}/${sub.topic_thread_id}`;
    inlineKeyboard.push([
      { text: `💬 Topic Thread එක වෙත යන්න (#${sub.topic_thread_id}) ↗️`, url: fallbackLink }
    ]);
  }

  // Navigation Back Button
  inlineKeyboard.push([
    { text: '🔙 සියලුම විෂයයන් (All Subjects)', callback_data: 'pp_main' }
  ]);

  return {
    text,
    keyboard: { inline_keyboard: inlineKeyboard }
  };
}

/**
 * Handle direct `/paper <sub_code> <year>` command (or single-year preview card)
 */
export function buildPastPaperDirectYearMessage(subCode, year) {
  const db = loadPastPapersDb();
  const sub = db.subjects?.[subCode];

  if (!sub) {
    return buildPastPapersSubjectsMenu();
  }

  const cleanGroupId = db.clean_group_id || '4322002704';
  const allFiles = Object.values(sub.files || {});
  const matchingFiles = allFiles.filter(f => String(f.year) === String(year));

  const icon = sub.icon || '📄';

  if (matchingFiles.length === 0) {
    // If exact year not in DB, link to the topic thread directly!
    const topicLink = `https://t.me/c/${cleanGroupId}/${sub.topic_thread_id}`;
    const text =
`${icon} *${sub.name} — ${year} Past Paper*
━━━━━━━━━━━━━━━━━━━━━
ℹ️ ${year} වර්ෂයට අදාළ පසුගිය විභාග ප්‍රශ්න පත්‍රය සෘජුවම සොයා ගැනීමට අදාළ Group Forum Topic එක වෙත පිවිසෙන්න.

📌 **Topic Thread:** \`${sub.name}\` (Thread: \`#${sub.topic_thread_id}\`)`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: `🚀 Open ${sub.name} Topic ↗️`, url: topicLink }
        ],
        [
          { text: `🔙 ${sub.name} සියලුම වර්ෂ (All Years)`, callback_data: `pp_sub_${subCode}` },
          { text: '🔙 සියලුම විෂයයන් (All Subjects)', callback_data: 'pp_main' }
        ]
      ]
    };
    return { text, keyboard };
  }

  const primary = matchingFiles[0];
  const primaryLink = getDirectMessageLink(primary, sub, cleanGroupId);

  const text =
`${icon} *${sub.name} — ${year} Past Paper*
━━━━━━━━━━━━━━━━━━━━━
📄 **ගොනු නාමය:** \`${primary.filename || `${year} Past Paper.pdf`}\`
🌐 **භාෂා මාධ්‍යය:** \`🇱🇰 සිංහල මාධ්‍යය\`
📌 **Group Forum Topic:** \`${sub.name}\` (Thread: \`#${sub.topic_thread_id}\`)

👇 **පහත බොත්තම ඔබා Topic එක තුළ ඇති File එක වෙත සෘජුවම පිවිසෙන්න හෝ PDF එක මෙහිදීම බාගත කරගන්න:**`;

  const inlineKeyboard = [
    [
      { text: `🚀 ${year} Past Paper වෙත යන්න (Direct Jump) ↗️`, url: primaryLink }
    ]
  ];

  if (primary.file_id) {
    inlineKeyboard.push([
      { text: `📥 මෙම Chat එකට PDF එක එවන්න`, callback_data: `pp_cached_${subCode}_${year}` }
    ]);
  }

  inlineKeyboard.push([
    { text: `🔙 ${sub.name} සියලු Past Papers`, callback_data: `pp_sub_${subCode}` },
    { text: '🔙 සියලුම විෂයයන් (All Subjects)', callback_data: 'pp_main' }
  ]);

  return {
    text,
    keyboard: { inline_keyboard: inlineKeyboard }
  };
}

/**
 * Format document caption when sending cached PDF
 */
export function formatPastPaperCaption(subCode, fileObj) {
  const db = loadPastPapersDb();
  const sub = db.subjects?.[subCode] || {};
  const icon = sub.icon || '📄';
  const subName = sub.name || 'උසස් පෙළ විෂය';
  const subTag = sub.tag || subCode.toUpperCase();
  const year = fileObj.year || 'A/L';
  const filename = fileObj.filename || `${year} Past Paper.pdf`;

  return `<b>${icon} ${subName} — 📄 පසුගිය විභාග ප්‍රශ්න පත්‍රය (Past Paper)</b>
━━━━━━━━━━━━━━━━━━━━
📅 <b>වර්ෂය:</b> ${year} A/L
🎯 <b>මාධ්‍යය:</b> 🇱🇰 සිංහල මාධ්‍යය
📂 <b>ලිපිගොනුව:</b> <code>${filename}</code>

💡 <i>පසුගිය විභාග ප්‍රශ්න රටාව හා කාල කළමනාකරණය පුහුණු වීමට පිළිතුරු ලියා අධ්‍යයනය කරන්න.</i>

🎓 <b>A/L MCQ HUB</b> — උසස් පෙළ සජීවී වේදිකාව 🚀
#PastPaper #${subTag} #AL_${year} #PastExamPaper`;
}
