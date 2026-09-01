import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'model_papers_archive_db.json');

let cachedDb = null;
let lastLoadTime = 0;

/**
 * Load the Model Papers database with caching
 */
export function loadModelPapersDb() {
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
    console.error('⚠️ [ModelPapers] Error reading model_papers_archive_db.json:', err.message);
  }

  return {
    group_id: -1004322002704,
    clean_group_id: "4322002704",
    subjects: {}
  };
}

/**
 * Normalize subject codes and aliases for Model Papers
 */
export function normalizeModelPaperSubject(input) {
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
 * Build 11-Subject Picker Menu for /model
 */
export function buildModelPapersSubjectsMenu() {
  const text =
`📝 *A/L Model Papers — ආදර්ශ ප්‍රශ්න පත්‍ර මධ්‍යස්ථානය*
━━━━━━━━━━━━━━━━━━━━━
🎓 උසස් පෙළ විභාගයේ සියලුම ප්‍රධාන විෂයයන් සඳහා වන **පළාත් අධ්‍යාපන දෙපාර්තමේන්තු සහ ජාතික මට්ටමේ ආදර්ශ ප්‍රශ්න පත්‍ර (Model Papers)** අපගේ Telegram Group Topic තුළ අන්තර්ගත කර ඇත.

👇 **ඔබට අවශ්‍ය විෂය පහතින් තෝරන්න:**`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📜 සිංහල (Sinhala)', callback_data: 'mp_sub_si' },
        { text: '☸️ බෞද්ධ ශිෂ්ටාචාරය (BC)', callback_data: 'mp_sub_bc' }
      ],
      [
        { text: '🏛️ ඉතිහාසය (History)', callback_data: 'mp_sub_hist' },
        { text: '⚖️ දේශපාලන විද්‍යාව (Pol Sci)', callback_data: 'mp_sub_pl' }
      ],
      [
        { text: '🌍 භූගෝල විද්‍යාව (Geography)', callback_data: 'mp_sub_geo' },
        { text: '💼 ව්‍යාපාර අධ්‍යයනය (BS)', callback_data: 'mp_sub_bs' }
      ],
      [
        { text: '🌾 කෘෂි විද්‍යාව (Agri)', callback_data: 'mp_sub_agri' },
        { text: '📡 මාධ්‍ය අධ්‍යයනය (Media)', callback_data: 'mp_sub_md' }
      ],
      [
        { text: '🎭 නාට්‍ය හා රංග කලාව (Drama)', callback_data: 'mp_sub_dr' },
        { text: '🎵 සංගීතය (Music)', callback_data: 'mp_sub_mu' }
      ],
      [
        { text: '💃 නැටුම් (Dancing)', callback_data: 'mp_sub_dn' }
      ],
      [
        { text: '📄 Past Papers', callback_data: 'pp_main' },
        { text: '🏫 Term Tests', callback_data: 'tt_main' },
        { text: '📑 Marking Schemes', callback_data: 'mark_subjects' }
      ]
    ]
  };

  return { text, keyboard };
}

/**
 * Build Model Papers List for a subject (Sinhala Medium only)
 * Inline URL buttons linking directly to topic messages.
 */
export function buildModelPapersListMenu(subCode) {
  const db = loadModelPapersDb();
  const sub = db.subjects?.[subCode];

  if (!sub) {
    return buildModelPapersSubjectsMenu();
  }

  const cleanGroupId = db.clean_group_id || '4322002704';
  const allFiles = Object.entries(sub.files || {}).map(([filename, file]) => ({
    ...file,
    file_key: filename
  }));

  // Sort by year DESC, then by province
  const sorted = allFiles.sort((a, b) => {
    const ya = parseInt(a.year || '0', 10);
    const yb = parseInt(b.year || '0', 10);
    if (ya !== yb) return yb - ya;
    return (a.btn_title || '').localeCompare(b.btn_title || '');
  });

  const icon = sub.icon || '📝';
  const text =
`${icon} *${sub.name}*
🌐 **🇱🇰 සිංහල මාධ්‍යය (Sinhala Medium)**
━━━━━━━━━━━━━━━━━━━━━
📂 **ආදර්ශ ප්‍රශ්න පත්‍ර (Model Papers) ලැයිස්තුව:**
_පහතින් ඔබට අවශ්‍ය ප්‍රශ්න පත්‍රය මත Click කළ විට Group Forum Topic එක තුළ ඇති නිවැරදි Model Paper File එක වෙත සෘජුවම Navigation Jump වේ._`;

  const inlineKeyboard = [];

  // Group into 2-column layout
  for (let i = 0; i < sorted.length; i += 2) {
    const row = [];
    const f1 = sorted[i];
    const link1 = getDirectMessageLink(f1, sub, cleanGroupId);
    const btnTitle1 = f1.btn_title ? `📖 ${f1.btn_title} ↗️` : `📖 ${f1.year || 'Model'} Paper ↗️`;
    row.push({
      text: btnTitle1,
      url: link1
    });

    if (i + 1 < sorted.length) {
      const f2 = sorted[i + 1];
      const link2 = getDirectMessageLink(f2, sub, cleanGroupId);
      const btnTitle2 = f2.btn_title ? `📖 ${f2.btn_title} ↗️` : `📖 ${f2.year || 'Model'} Paper ↗️`;
      row.push({
        text: btnTitle2,
        url: link2
      });
    }
    inlineKeyboard.push(row);
  }

  if (sorted.length === 0) {
    const fallbackLink = `https://t.me/c/${cleanGroupId}/${sub.topic_thread_id}`;
    inlineKeyboard.push([
      { text: `💬 Topic Thread එක වෙත යන්න (#${sub.topic_thread_id}) ↗️`, url: fallbackLink }
    ]);
  }

  // Navigation Back Buttons
  inlineKeyboard.push([
    { text: '🔙 සියලුම විෂයයන් (All Subjects)', callback_data: 'mp_main' }
  ]);

  return {
    text,
    keyboard: { inline_keyboard: inlineKeyboard }
  };
}

/**
 * Handle direct `/model <sub_code> <year/province>` query
 */
export function buildModelPaperDirectMessage(subCode, queryTerm) {
  const db = loadModelPapersDb();
  const sub = db.subjects?.[subCode];

  if (!sub) {
    return buildModelPapersSubjectsMenu();
  }

  const cleanGroupId = db.clean_group_id || '4322002704';
  const allFiles = Object.entries(sub.files || {}).map(([filename, file], index) => ({
    ...file,
    file_key: String(index),
    orig_name: filename
  }));

  const q = String(queryTerm || '').trim().toLowerCase();

  // Normalize search terms for provinces
  const provinceAliasMap = {
    'western': 'western', 'බස්නාහිර': 'western', 'wp': 'western',
    'uva': 'uva', 'ඌව': 'uva',
    'southern': 'southern', 'දකුණු': 'southern', 'sp': 'southern',
    'sabaragamuwa': 'sabaragamuwa', 'සබරගමුව': 'sabaragamuwa',
    'north western': 'north western', 'වයඹ': 'north western', 'nwp': 'north western', 'wayamba': 'north western',
    'central': 'central', 'මධ්‍යම': 'central', 'cp': 'central',
    'eastern': 'eastern', 'නැගෙනහිර': 'eastern', 'ep': 'eastern',
    'north central': 'north central', 'උතුරු මැද': 'north central', 'ncp': 'north central'
  };

  const matchingFiles = allFiles.filter(f => {
    const yearMatch = q.includes(String(f.year)) || String(f.year) === q;
    const titleMatch = (f.display_title || '').toLowerCase().includes(q) || (f.btn_title || '').toLowerCase().includes(q) || (f.filename || '').toLowerCase().includes(q);
    const provMatch = (f.province || '').toLowerCase().includes(q) || (f.province_si || '').includes(q);

    // Check alias match
    let aliasMatch = false;
    for (const [alias, target] of Object.entries(provinceAliasMap)) {
      if (q.includes(alias) && ((f.province || '').toLowerCase().includes(target) || (f.btn_title || '').toLowerCase().includes(target))) {
        aliasMatch = true;
        break;
      }
    }

    return yearMatch || titleMatch || provMatch || aliasMatch;
  });

  const icon = sub.icon || '📝';

  // Case 1: No match found
  if (matchingFiles.length === 0) {
    const topicLink = `https://t.me/c/${cleanGroupId}/${sub.topic_thread_id}`;
    const text =
`${icon} *${sub.name} — Model Papers*
━━━━━━━━━━━━━━━━━━━━━
ℹ️ "${queryTerm}" සෙවුමට ගැළපෙන ආදර්ශ ප්‍රශ්න පත්‍රයක් හමු නොවීය. අදාළ Group Forum Topic එක වෙත පිවිස සොයා බලන්න.

📌 **Topic Thread:** \`${sub.name}\` (Thread: \`#${sub.topic_thread_id}\`)`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: `🚀 Open ${sub.name} Topic ↗️`, url: topicLink }
        ],
        [
          { text: `🔙 ${sub.name} සියලු Model Papers`, callback_data: `mp_sub_${subCode}` },
          { text: '🔙 සියලුම විෂයයන් (All Subjects)', callback_data: 'mp_main' }
        ]
      ]
    };
    return { text, keyboard };
  }

  // Case 2: Exactly 1 match found -> Single Preview Card with Direct Jump and Download buttons
  if (matchingFiles.length === 1) {
    const f = matchingFiles[0];
    const primaryLink = getDirectMessageLink(f, sub, cleanGroupId);
    const provSi = f.province_si || (f.province ? f.province : 'ජාතික මට්ටමේ');

    const text =
`${icon} *${sub.name} — ${f.display_title || `${f.year} Model Paper`}*
━━━━━━━━━━━━━━━━━━━━━
📅 **වර්ෂය:** \`${f.year} A/L\`
🏛️ **පළාත / මූලාශ්‍රය:** \`${provSi}\`
📄 **ගොනු නාමය:** \`${f.filename}\`
🌐 **භාෂා මාධ්‍යය:** \`🇱🇰 සිංහල මාධ්‍යය\`
📌 **Group Forum Topic:** \`${sub.name}\` (Thread: \`#${sub.topic_thread_id}\`)

👇 **පහත බොත්තම ඔබා Topic එක තුළ ඇති File එක වෙත සෘජුවම පිවිසෙන්න හෝ PDF එක මෙහිදීම ලබාගන්න:**`;

    const inlineKeyboard = [
      [
        { text: `🚀 ${f.btn_title || f.year} Model Paper වෙත යන්න ↗️`, url: primaryLink }
      ]
    ];

    if (f.file_id) {
      inlineKeyboard.push([
        { text: `📥 මෙම Chat එකට PDF එක එවන්න`, callback_data: `mp_cached_${subCode}_${f.file_key}` }
      ]);
    }

    inlineKeyboard.push([
      { text: `🔙 ${sub.name} සියලු Model Papers`, callback_data: `mp_sub_${subCode}` },
      { text: '🔙 සියලුම විෂයයන් (All Subjects)', callback_data: 'mp_main' }
    ]);

    return {
      text,
      keyboard: { inline_keyboard: inlineKeyboard }
    };
  }

  // Case 3: Multiple matches found (e.g. 2026 has multiple provinces) -> Filtered List Sub-menu
  const text =
`${icon} *${sub.name} — Model Papers (${queryTerm})*
━━━━━━━━━━━━━━━━━━━━━
📂 **සොයාගත් ආදර්ශ ප්‍රශ්න පත්‍ර (${matchingFiles.length}):**
_පහතින් ඔබට අවශ්‍ය ප්‍රශ්න පත්‍රය මත Click කර Group Forum Topic එක තුළ ඇති File එක වෙත සෘජුවම පිවිසෙන්න:_`;

  const inlineKeyboard = [];
  for (let i = 0; i < matchingFiles.length; i += 2) {
    const row = [];
    const f1 = matchingFiles[i];
    const link1 = getDirectMessageLink(f1, sub, cleanGroupId);
    row.push({
      text: `📖 ${f1.btn_title || f1.year} ↗️`,
      url: link1
    });

    if (i + 1 < matchingFiles.length) {
      const f2 = matchingFiles[i + 1];
      const link2 = getDirectMessageLink(f2, sub, cleanGroupId);
      row.push({
        text: `📖 ${f2.btn_title || f2.year} ↗️`,
        url: link2
      });
    }
    inlineKeyboard.push(row);
  }

  inlineKeyboard.push([
    { text: `🔙 ${sub.name} සියලු Model Papers`, callback_data: `mp_sub_${subCode}` },
    { text: '🔙 සියලුම විෂයයන් (All Subjects)', callback_data: 'mp_main' }
  ]);

  return {
    text,
    keyboard: { inline_keyboard: inlineKeyboard }
  };
}

/**
 * Format document caption when sending cached PDF
 */
export function formatModelPaperCaption(subCode, fileObj) {
  const db = loadModelPapersDb();
  const sub = db.subjects?.[subCode] || {};
  const icon = sub.icon || '📝';
  const subName = sub.name || 'උසස් පෙළ විෂය';
  const subTag = sub.tag || subCode.toUpperCase();
  const year = fileObj.year || 'A/L';
  const provSi = fileObj.province_si || (fileObj.province ? fileObj.province : 'ජාතික මට්ටමේ');
  const filename = fileObj.filename || `${year} Model Paper.pdf`;

  return `<b>${icon} ${subName} — 📝 ආදර්ශ ප්‍රශ්න පත්‍රය (Model Paper)</b>
━━━━━━━━━━━━━━━━━━━━
📅 <b>වර්ෂය:</b> ${year} A/L
🏛️ <b>පළාත / මූලාශ්‍රය:</b> ${provSi}
🎯 <b>මාධ්‍යය:</b> 🇱🇰 සිංහල මාධ්‍යය
📂 <b>ලිපිගොනුව:</b> <code>${filename}</code>

💡 <i>ආදර්ශ ප්‍රශ්න පත්‍ර විසඳීමෙන් විභාග ප්‍රශ්න රටාව පිළිබඳ පුළුල් අවබෝධයක් හා පුහුණුවක් ලබාගන්න.</i>

🎓 <b>A/L MCQ HUB</b> — උසස් පෙළ සජීවී වේදිකාව 🚀
#ModelPaper #${subTag} #AL_${year} #ModelExamPaper`;
}
