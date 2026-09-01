import fs from 'fs';
import path from 'path';

const _scriptDir = (typeof __dirname !== 'undefined' && __dirname) ? __dirname : process.cwd();
const DB_PATH = path.resolve(_scriptDir, 'markings_archive_db.json');

/**
 * Load the Markings Archive Database from disk
 */
export function loadMarkingsDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('⚠️ [MarkingManager] Error reading markings_archive_db.json:', err.message);
  }
  return { group_id: -1004322002704, clean_group_id: '4322002704', subjects: {} };
}

/**
 * Normalize subject code and aliases for marking schemes
 */
export function normalizeMarkingSubject(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim().replace(/^[\/_]/, '');

  const map = {
    'si': 'si',
    'sinhala': 'si',
    'sinhala_language': 'si',
    'sin': 'si',

    'bc': 'bc',
    'buddhist': 'bc',
    'buddhist_civ': 'bc',
    'buddhist_civilization': 'bc',
    'buddhism': 'bc',

    'geo': 'geo',
    'geography': 'geo',
    'geog': 'geo',

    'pl': 'pl',
    'political': 'pl',
    'pol': 'pl',
    'political_science': 'pl',
    'politics': 'pl',

    'hist': 'hist',
    'history': 'hist',
    'hi': 'hist',

    'bs': 'bs',
    'business': 'bs',
    'business_studies': 'bs',
    'bus': 'bs',

    'dr': 'dr',
    'drama': 'dr',
    'theatre': 'dr',
    'drama_theatre': 'dr',

    'mu': 'mu',
    'music': 'mu',
    'oriental_music': 'mu',
    'western_music': 'mu',
    'carnatic_music': 'mu',

    'dn': 'dn',
    'dancing': 'dn',
    'dance': 'dn',
    'natum': 'dn',

    'md': 'md',
    'media': 'md',
    'communication': 'md',
    'media_studies': 'md',

    'agri': 'agri',
    'agriculture': 'agri',
    'agricultural_science': 'agri',
    'ag': 'agri'
  };

  return map[s] || null;
}

/**
 * Match subject code by Forum Topic Thread ID
 */
export function getSubjectByThreadId(threadId) {
  if (!threadId) return null;
  const tid = parseInt(threadId, 10);
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
 * Build 11-Subject Picker Menu for /marking
 */
export function buildMarkingSubjectsMenu() {
  const text =
`📑 *A/L Marking Schemes — ලකුණු දීමේ පටිපාටි මධ්‍යස්ථානය*
━━━━━━━━━━━━━━━━━━━━━
🎓 උසස් පෙළ විභාගයේ සියලුම ප්‍රධාන විෂයයන් සඳහා වන **නිල විභාග ලකුණු දීමේ පටිපාටි (Marking Schemes)** අපගේ Telegram Group Topic තුළ අන්තර්ගත කර ඇත.

👇 **ඔබට අවශ්‍ය විෂය පහතින් තෝරන්න:**`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📜 සිංහල (Sinhala)', callback_data: 'mark_sub:si' },
        { text: '☸️ බෞද්ධ ශිෂ්ටාචාරය (BC)', callback_data: 'mark_sub:bc' }
      ],
      [
        { text: '🌍 භූගෝල විද්‍යාව (Geography)', callback_data: 'mark_sub:geo' },
        { text: '⚖️ දේශපාලන විද්‍යාව (Pol Sci)', callback_data: 'mark_sub:pl' }
      ],
      [
        { text: '🏛️ ඉතිහාසය (History)', callback_data: 'mark_sub:hist' },
        { text: '💼 ව්‍යාපාර අධ්‍යයනය (BS)', callback_data: 'mark_sub:bs' }
      ],
      [
        { text: '🎭 නාට්‍ය හා රංග කලාව (Drama)', callback_data: 'mark_sub:dr' },
        { text: '🎵 සංගීතය (Music)', callback_data: 'mark_sub:mu' }
      ],
      [
        { text: '💃 නර්තනය (Dancing)', callback_data: 'mark_sub:dn' },
        { text: '📺 මාධ්‍ය අධ්‍යයනය (Media)', callback_data: 'mark_sub:md' }
      ],
      [
        { text: '🌾 කෘෂි විද්‍යාව (Agriculture)', callback_data: 'mark_sub:agri' }
      ],
      [
        { text: '📄 පසුගිය විභාග ප්‍රශ්න පත්‍ර (Past Papers)', callback_data: 'pp_main' },
        { text: '📝 ආදර්ශ ප්‍රශ්න පත්‍ර (Model Papers)', callback_data: 'mp_main' }
      ]
    ]
  };

  return { text, keyboard };
}

/**
 * Step A: Build Language Medium Selection Menu for a specific subject
 */
export function buildMarkingMediumMenu(subCode) {
  const db = loadMarkingsDb();
  const sub = db.subjects?.[subCode];

  if (!sub) {
    return buildMarkingSubjectsMenu();
  }

  const files = Object.values(sub.files || {});
  const totalCount = files.length;

  const sinhalaFiles = files.filter(f => f.medium === 'Sinhala_Medium' || !f.medium);
  const englishFiles = files.filter(f => f.medium === 'English_Medium');
  const tamilFiles = files.filter(f => f.medium === 'Tamil_Medium');

  const text =
`📑 *${sub.name}*
*ලකුණු දීමේ පටිපාටි (Marking Schemes)*
━━━━━━━━━━━━━━━━━━━━━
📌 **අදාළ Forum Topic එක:** \`${sub.topic_name || sub.name}\` (Thread: \`#${sub.topic_thread_id}\`)
📁 **ලබාගත හැකි සම්පූර්ණ ලකුණු සම්මුති ගණන:** \`${totalCount}\` ක්

👇 **කරුණාකර ඔබට අවශ්‍ය භාෂා මාධ්‍යය (Language Medium) තෝරන්න:**`;

  const inlineKeyboard = [];

  if (sinhalaFiles.length > 0) {
    inlineKeyboard.push([
      { text: `🇱🇰 සිංහල මාධ්‍යය (Sinhala Medium) [${sinhalaFiles.length}]`, callback_data: `mark_med:${subCode}:Sinhala_Medium` }
    ]);
  }
  if (englishFiles.length > 0) {
    inlineKeyboard.push([
      { text: `🇬🇧 English Medium [${englishFiles.length}]`, callback_data: `mark_med:${subCode}:English_Medium` }
    ]);
  }
  if (tamilFiles.length > 0) {
    inlineKeyboard.push([
      { text: `🇮🇳 தமிழ் மொழி (Tamil Medium) [${tamilFiles.length}]`, callback_data: `mark_med:${subCode}:Tamil_Medium` }
    ]);
  }

  inlineKeyboard.push([
    { text: '🔙 සියලුම විෂයයන් (All Subjects)', callback_data: 'mark_subjects' }
  ]);

  return {
    text,
    keyboard: { inline_keyboard: inlineKeyboard }
  };
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
 * Step B: Build Year Navigation Buttons for a subject & medium
 * Each Year Button is a Direct Navigation Link URL Button!
 */
export function buildMarkingYearsMenu(subCode, medium = 'Sinhala_Medium') {
  const db = loadMarkingsDb();
  const sub = db.subjects?.[subCode];

  if (!sub) {
    return buildMarkingSubjectsMenu();
  }

  const cleanGroupId = db.clean_group_id || '4322002704';
  const allFiles = Object.values(sub.files || {});
  const filtered = allFiles
    .filter(f => (f.medium || 'Sinhala_Medium') === medium)
    .sort((a, b) => {
      const ya = parseInt(a.year || '0', 10);
      const yb = parseInt(b.year || '0', 10);
      if (isNaN(ya) && isNaN(yb)) return 0;
      if (isNaN(ya)) return 1;
      if (isNaN(yb)) return -1;
      return yb - ya;
    });

  const mediumLabelMap = {
    'Sinhala_Medium': '🇱🇰 සිංහල මාධ්‍යය (Sinhala Medium)',
    'English_Medium': '🇬🇧 English Medium',
    'Tamil_Medium': '🇮🇳 தமிழ் மொழி (Tamil Medium)'
  };
  const mediumName = mediumLabelMap[medium] || medium;

  const text =
`📑 *${sub.name}*
🌐 **${mediumName}**
━━━━━━━━━━━━━━━━━━━━━
📂 **ලකුණු දීමේ පටිපාටි (Marking Schemes) ලැයිස්තුව:**
_පහතින් ඔබට අවශ්‍ය වර්ෂය මත Click කළ විට Group Forum Topic එක තුළ ඇති නිවැරදි File එක වෙත සෘජුවම Navigation Jump වේ._`;

  const inlineKeyboard = [];

  // Group years in 2-column or 1-column layout
  for (let i = 0; i < filtered.length; i += 2) {
    const row = [];
    const f1 = filtered[i];
    const link1 = getDirectMessageLink(f1, sub, cleanGroupId);
    row.push({
      text: `📄 ${f1.year || 'Marking'} Scheme ↗️`,
      url: link1
    });

    if (i + 1 < filtered.length) {
      const f2 = filtered[i + 1];
      const link2 = getDirectMessageLink(f2, sub, cleanGroupId);
      row.push({
        text: `📄 ${f2.year || 'Marking'} Scheme ↗️`,
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

  // Navigation Back Buttons
  inlineKeyboard.push([
    { text: '🔙 මාධ්‍යය තෝරන්න (Change Medium)', callback_data: `mark_sub:${subCode}` },
    { text: '🔙 සියලුම විෂයයන් (All Subjects)', callback_data: 'mark_subjects' }
  ]);

  return {
    text,
    keyboard: { inline_keyboard: inlineKeyboard }
  };
}

/**
 * Handle direct `/marking <sub_code> <year>` command
 */
export function buildMarkingDirectYearMessage(subCode, year) {
  const db = loadMarkingsDb();
  const sub = db.subjects?.[subCode];

  if (!sub) {
    return buildMarkingSubjectsMenu();
  }

  const cleanGroupId = db.clean_group_id || '4322002704';
  const allFiles = Object.values(sub.files || {});
  const matchingFiles = allFiles.filter(f => String(f.year) === String(year));

  if (matchingFiles.length === 0) {
    // If exact year not in DB, link to the topic thread directly!
    const topicLink = `https://t.me/c/${cleanGroupId}/${sub.topic_thread_id}`;
    const text =
`📑 *${sub.name} — ${year} Marking Scheme*
━━━━━━━━━━━━━━━━━━━━━
ℹ️ ${year} වර්ෂයට අදාළ ලකුණු දීමේ පටිපාටිය සෘජුවම සොයා ගැනීමට අදාළ Group Forum Topic එක වෙත පිවිසෙන්න.

📌 **Topic Thread:** \`${sub.name}\` (Thread: \`#${sub.topic_thread_id}\`)`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: `🚀 Open ${sub.name} Topic ↗️`, url: topicLink }
        ],
        [
          { text: `🔙 ${sub.name} සියලුම වර්ෂ (All Years)`, callback_data: `mark_sub:${subCode}` },
          { text: '🔙 විෂයයන් (Subjects)', callback_data: 'mark_subjects' }
        ]
      ]
    };
    return { text, keyboard };
  }

  // Primary file (prefer Sinhala Medium)
  const primary = matchingFiles.find(f => f.medium === 'Sinhala_Medium') || matchingFiles[0];
  const primaryLink = getDirectMessageLink(primary, sub, cleanGroupId);

  const mediumLabelMap = {
    'Sinhala_Medium': '🇱🇰 සිංහල මාධ්‍යය',
    'English_Medium': '🇬🇧 English Medium',
    'Tamil_Medium': '🇮🇳 தமிழ் மொழி'
  };
  const primaryLabel = mediumLabelMap[primary.medium] || primary.medium || 'සිංහල මාධ්‍යය';

  const text =
`📑 *${sub.name} — ${year} Marking Scheme*
━━━━━━━━━━━━━━━━━━━━━
📄 **ගොනු නාමය:** \`${primary.filename || `${year} Marking Scheme.pdf`}\`
🌐 **භාෂා මාධ්‍යය:** \`${primaryLabel}\`
📌 **Group Forum Topic:** \`${sub.name}\` (Thread: \`#${sub.topic_thread_id}\`)

👇 **පහත බොත්තම ඔබා Topic එක තුළ ඇති File එක වෙත සෘජුවම පිවිසෙන්න:**`;

  const inlineKeyboard = [
    [
      { text: `🚀 View ${year} Marking Scheme in Topic ↗️`, url: primaryLink }
    ]
  ];

  // If additional language mediums exist for this year
  const otherMediums = matchingFiles.filter(f => f !== primary);
  if (otherMediums.length > 0) {
    const medRow = otherMediums.map(f => {
      const label = mediumLabelMap[f.medium] || f.medium;
      return {
        text: `${label} ↗️`,
        url: getDirectMessageLink(f, sub, cleanGroupId)
      };
    });
    inlineKeyboard.push(medRow);
  }

  inlineKeyboard.push([
    { text: `🔙 ${sub.name} සියලුම වර්ෂ (All Years)`, callback_data: `mark_sub:${subCode}` },
    { text: '🔙 සියලුම විෂයයන් (All Subjects)', callback_data: 'mark_subjects' }
  ]);

  return {
    text,
    keyboard: { inline_keyboard: inlineKeyboard }
  };
}
