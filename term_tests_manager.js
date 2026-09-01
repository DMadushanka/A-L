import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'term_tests_archive_db.json');

let cachedDb = null;
let lastLoadTime = 0;

/**
 * Load the Term Tests database with caching
 */
export function loadTermTestsDb() {
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
    console.error('⚠️ [TermTests] Error reading term_tests_archive_db.json:', err.message);
  }

  return {
    group_id: -1004322002704,
    clean_group_id: "4322002704",
    subjects: {}
  };
}

/**
 * Normalize subject codes and aliases for Term Tests
 */
export function normalizeTermTestSubject(input) {
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
 * Build 11-Subject Picker Menu for /term
 */
export function buildTermTestsSubjectsMenu() {
  const text =
`🏫 *A/L Term Test Papers — වාර විභාග ප්‍රශ්න පත්‍ර මධ්‍යස්ථානය*
━━━━━━━━━━━━━━━━━━━━━
🎓 උසස් පෙළ 12 සහ 13 ශ්‍රේණි සඳහා වන **ප්‍රමුඛ පාසල් සහ පළාත් අධ්‍යාපන දෙපාර්තමේන්තු වාර විභාග ප්‍රශ්න පත්‍ර (Term Test Papers)** අපගේ Telegram Group Topic තුළ අන්තර්ගත කර ඇත.

👇 **ඔබට අවශ්‍ය විෂය පහතින් තෝරන්න:**`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📜 සිංහල (Sinhala)', callback_data: 'tt_sub_si' },
        { text: '☸️ බෞද්ධ ශිෂ්ටාචාරය (BC)', callback_data: 'tt_sub_bc' }
      ],
      [
        { text: '🏛️ ඉතිහාසය (History)', callback_data: 'tt_sub_hist' },
        { text: '⚖️ දේශපාලන විද්‍යාව (Pol Sci)', callback_data: 'tt_sub_pl' }
      ],
      [
        { text: '🌍 භූගෝල විද්‍යාව (Geography)', callback_data: 'tt_sub_geo' },
        { text: '💼 ව්‍යාපාර අධ්‍යයනය (BS)', callback_data: 'tt_sub_bs' }
      ],
      [
        { text: '🌾 කෘෂි විද්‍යාව (Agri)', callback_data: 'tt_sub_agri' },
        { text: '📡 මාධ්‍ය අධ්‍යයනය (Media)', callback_data: 'tt_sub_md' }
      ],
      [
        { text: '🎭 නාට්‍ය හා රංග කලාව (Drama)', callback_data: 'tt_sub_dr' },
        { text: '🎵 සංගීතය (Music)', callback_data: 'tt_sub_mu' }
      ],
      [
        { text: '💃 නැටුම් (Dancing)', callback_data: 'tt_sub_dn' }
      ],
      [
        { text: '📄 Past Papers', callback_data: 'pp_main' },
        { text: '📝 Model Papers', callback_data: 'mp_main' },
        { text: '📑 Marking Schemes', callback_data: 'mark_subjects' }
      ]
    ]
  };

  return { text, keyboard };
}

/**
 * Build Grade Selection Menu for a subject (Grade 12 / Grade 13 / All)
 */
export function buildTermTestsGradeMenu(subCode) {
  const db = loadTermTestsDb();
  const sub = db.subjects?.[subCode];

  if (!sub) {
    return buildTermTestsSubjectsMenu();
  }

  const allFiles = Object.values(sub.files || {});
  const gr13Files = allFiles.filter(f => String(f.grade).includes('13') || String(f.filename || '').includes('13') || String(f.display_title || '').includes('13'));
  const gr12Files = allFiles.filter(f => String(f.grade).includes('12') || String(f.filename || '').includes('12') || String(f.display_title || '').includes('12'));

  const icon = sub.icon || '🏫';
  const text =
`${icon} *${sub.name} — වාර විභාග ප්‍රශ්න පත්‍ර (Term Test Papers)*
━━━━━━━━━━━━━━━━━━━━━
🎓 **12 හා 13 ශ්‍රේණි සඳහා වන ප්‍රශ්න පත්‍ර තෝරාගන්න:**

📊 **දැනට පවතින ප්‍රශ්න පත්‍ර:**
• 🎓 **13 ශ්‍රේණිය:** ${gr13Files.length} Papers
• 📖 **12 ශ්‍රේණිය:** ${gr12Files.length} Papers
• 📂 **සමස්ත එකතුව:** ${allFiles.length} Papers

👇 **ඔබට අවශ්‍ය ශ්‍රේණිය පහතින් තෝරන්න:**`;

  const cleanGroupId = db.clean_group_id || '4322002704';
  const topicLink = `https://t.me/c/${cleanGroupId}/${sub.topic_thread_id}`;

  const inlineKeyboard = [];
  if (allFiles.length > 0) {
    inlineKeyboard.push([
      { text: `🎓 13 ශ්‍රේණිය (Grade 13) [${gr13Files.length}]`, callback_data: `tt_gr_${subCode}_13` },
      { text: `📖 12 ශ්‍රේණිය (Grade 12) [${gr12Files.length}]`, callback_data: `tt_gr_${subCode}_12` }
    ]);
    inlineKeyboard.push([
      { text: `📂 සියලුම ප්‍රශ්න පත්‍ර (All Papers) [${allFiles.length}]`, callback_data: `tt_gr_${subCode}_all` }
    ]);
  } else {
    inlineKeyboard.push([
      { text: `🚀 ${sub.name} Topic Thread එක වෙත යන්න (#${sub.topic_thread_id}) ↗️`, url: topicLink }
    ]);
  }

  inlineKeyboard.push([
    { text: '🔙 සියලුම විෂයයන් (All Subjects)', callback_data: 'tt_main' }
  ]);

  const keyboard = {
    inline_keyboard: inlineKeyboard
  };

  return { text, keyboard };
}

/**
 * Build Term Test Papers List for a subject and grade
 * Inline URL buttons linking directly to topic messages.
 */
export function buildTermTestsListMenu(subCode, gradeFilter = 'all') {
  const db = loadTermTestsDb();
  const sub = db.subjects?.[subCode];

  if (!sub) {
    return buildTermTestsSubjectsMenu();
  }

  const cleanGroupId = db.clean_group_id || '4322002704';
  const allFiles = Object.entries(sub.files || {}).map(([filename, file]) => ({
    ...file,
    file_key: filename
  }));

  let filtered = allFiles;
  let gradeTitle = 'සියලුම ශ්‍රේණි (Grade 12 & 13)';

  if (gradeFilter === '13') {
    filtered = allFiles.filter(f => String(f.grade).includes('13') || String(f.filename || '').includes('13') || String(f.display_title || '').includes('13'));
    gradeTitle = '🎓 13 ශ්‍රේණිය (Grade 13)';
  } else if (gradeFilter === '12') {
    filtered = allFiles.filter(f => String(f.grade).includes('12') || String(f.filename || '').includes('12') || String(f.display_title || '').includes('12'));
    gradeTitle = '📖 12 ශ්‍රේණිය (Grade 12)';
  }

  // Sort by year DESC, then term DESC
  const sorted = filtered.sort((a, b) => {
    const ya = parseInt(a.year || '0', 10);
    const yb = parseInt(b.year || '0', 10);
    if (ya !== yb) return yb - ya;
    return (a.btn_title || '').localeCompare(b.btn_title || '');
  });

  const icon = sub.icon || '🏫';
  const text =
`${icon} *${sub.name} — ${gradeTitle}*
🌐 **🇱🇰 සිංහල මාධ්‍යය (Sinhala Medium)**
━━━━━━━━━━━━━━━━━━━━━
📂 **වාර විභාග ප්‍රශ්න පත්‍ර (Term Test Papers) ලැයිස්තුව:**
_පහතින් ඔබට අවශ්‍ය ප්‍රශ්න පත්‍රය මත Click කළ විට Group Forum Topic එක තුළ ඇති නිවැරදි Term Test File එක වෙත සෘජුවම Navigation Jump වේ._`;

  const inlineKeyboard = [];

  // Group into 2-column layout
  for (let i = 0; i < sorted.length; i += 2) {
    const row = [];
    const f1 = sorted[i];
    const link1 = getDirectMessageLink(f1, sub, cleanGroupId);
    const btnTitle1 = f1.btn_title ? `📖 ${f1.btn_title} ↗️` : `📖 ${f1.year || 'Term'} Paper ↗️`;
    row.push({
      text: btnTitle1,
      url: link1
    });

    if (i + 1 < sorted.length) {
      const f2 = sorted[i + 1];
      const link2 = getDirectMessageLink(f2, sub, cleanGroupId);
      const btnTitle2 = f2.btn_title ? `📖 ${f2.btn_title} ↗️` : `📖 ${f2.year || 'Term'} Paper ↗️`;
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
    { text: '🔙 ශ්‍රේණි තේරීම (Grade Menu)', callback_data: `tt_sub_${subCode}` },
    { text: '🔙 සියලුම විෂයයන් (All Subjects)', callback_data: 'tt_main' }
  ]);

  return {
    text,
    keyboard: { inline_keyboard: inlineKeyboard }
  };
}

/**
 * Handle direct `/term <sub_code> <grade/year/term/province>` query
 */
export function buildTermTestDirectMessage(subCode, queryTerm) {
  const db = loadTermTestsDb();
  const sub = db.subjects?.[subCode];

  if (!sub) {
    return buildTermTestsSubjectsMenu();
  }

  const cleanGroupId = db.clean_group_id || '4322002704';
  const allFiles = Object.entries(sub.files || {}).map(([filename, file], index) => ({
    ...file,
    file_key: String(index),
    orig_name: filename
  }));

  const q = String(queryTerm || '').trim().toLowerCase();

  const matchingFiles = allFiles.filter(f => {
    const yearMatch = q.includes(String(f.year)) || String(f.year) === q;
    const gradeMatch = q.includes(String(f.grade)) || (f.grade && String(f.grade).toLowerCase().includes(q));
    const termMatch = (f.term && String(f.term).toLowerCase().includes(q)) || (f.term_si && f.term_si.includes(q));
    const provMatch = (f.province && f.province.toLowerCase().includes(q)) || (f.province_si && f.province_si.includes(q));
    const titleMatch = (f.display_title || '').toLowerCase().includes(q) || (f.btn_title || '').toLowerCase().includes(q) || (f.filename || '').toLowerCase().includes(q);

    return yearMatch || gradeMatch || termMatch || provMatch || titleMatch;
  });

  const icon = sub.icon || '🏫';

  // Case 1: No match found
  if (matchingFiles.length === 0) {
    const topicLink = `https://t.me/c/${cleanGroupId}/${sub.topic_thread_id}`;
    const text =
`${icon} *${sub.name} — Term Test Papers*
━━━━━━━━━━━━━━━━━━━━━
ℹ️ "${queryTerm}" සෙවුමට ගැළපෙන වාර විභාග ප්‍රශ්න පත්‍රයක් හමු නොවීය. අදාළ Group Forum Topic එක වෙත පිවිස සොයා බලන්න.

📌 **Topic Thread:** \`${sub.name}\` (Thread: \`#${sub.topic_thread_id}\`)`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: `🚀 Open ${sub.name} Topic ↗️`, url: topicLink }
        ],
        [
          { text: `🔙 ${sub.name} වාර විභාග ප්‍රශ්න පත්‍ර`, callback_data: `tt_sub_${subCode}` },
          { text: '🔙 සියලුම විෂයයන් (All Subjects)', callback_data: 'tt_main' }
        ]
      ]
    };
    return { text, keyboard };
  }

  // Case 2: Exactly 1 match found -> Single Preview Card with Direct Jump and Download buttons
  if (matchingFiles.length === 1) {
    const f = matchingFiles[0];
    const primaryLink = getDirectMessageLink(f, sub, cleanGroupId);
    const provSi = f.province_si || (f.province ? f.province : 'පාසල් / පළාත් මට්ටමේ');
    const gradeSi = f.grade ? `${f.grade} ශ්‍රේණිය` : '12/13 ශ්‍රේණිය';
    const termSi = f.term_si || (f.term ? `${f.term} වන වාරය` : 'වාර විභාගය');

    const text =
`${icon} *${sub.name} — ${f.display_title || `${f.year} Term Test Paper`}*
━━━━━━━━━━━━━━━━━━━━━
📚 **ශ්‍රේණිය:** \`${gradeSi}\`
📅 **වර්ෂය සහ වාරය:** \`${f.year || 'A/L'} | ${termSi}\`
🏛️ **පළාත / පාසල:** \`${provSi}\`
📄 **ගොනු නාමය:** \`${f.filename}\`
🌐 **භාෂා මාධ්‍යය:** \`🇱🇰 සිංහල මාධ්‍යය\`
📌 **Group Forum Topic:** \`${sub.name}\` (Thread: \`#${sub.topic_thread_id}\`)

👇 **පහත බොත්තම ඔබා Topic එක තුළ ඇති File එක වෙත සෘජුවම පිවිසෙන්න හෝ PDF එක මෙහිදීම ලබාගන්න:**`;

    const inlineKeyboard = [
      [
        { text: `🚀 ${f.btn_title || f.year} Term Test වෙත යන්න ↗️`, url: primaryLink }
      ]
    ];

    if (f.file_id) {
      inlineKeyboard.push([
        { text: `📥 මෙම Chat එකට PDF එක එවන්න`, callback_data: `tt_cached_${subCode}_${f.file_key}` }
      ]);
    }

    inlineKeyboard.push([
      { text: `🔙 ${sub.name} වාර විභාග ප්‍රශ්න පත්‍ර`, callback_data: `tt_sub_${subCode}` },
      { text: '🔙 සියලුම විෂයයන් (All Subjects)', callback_data: 'tt_main' }
    ]);

    return {
      text,
      keyboard: { inline_keyboard: inlineKeyboard }
    };
  }

  // Case 3: Multiple matches found -> Filtered List Sub-menu
  const text =
`${icon} *${sub.name} — Term Test Papers (${queryTerm})*
━━━━━━━━━━━━━━━━━━━━━
📂 **සොයාගත් වාර විභාග ප්‍රශ්න පත්‍ර (${matchingFiles.length}):**
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
    { text: `🔙 ${sub.name} වාර විභාග ප්‍රශ්න පත්‍ර`, callback_data: `tt_sub_${subCode}` },
    { text: '🔙 සියලුම විෂයයන් (All Subjects)', callback_data: 'tt_main' }
  ]);

  return {
    text,
    keyboard: { inline_keyboard: inlineKeyboard }
  };
}

/**
 * Format document caption when sending cached PDF
 */
export function formatTermTestCaption(subCode, fileObj) {
  const db = loadTermTestsDb();
  const sub = db.subjects?.[subCode] || {};
  const icon = sub.icon || '🏫';
  const subName = sub.name || 'උසස් පෙළ විෂය';
  const subTag = sub.tag || subCode.toUpperCase();
  const year = fileObj.year || 'A/L';
  const gradeSi = fileObj.grade ? `${fileObj.grade} ශ්‍රේණිය` : 'උසස් පෙළ';
  const termSi = fileObj.term_si || (fileObj.term ? `${fileObj.term} වන වාරය` : 'වාර විභාගය');
  const provSi = fileObj.province_si || (fileObj.province ? fileObj.province : 'පාසල් / පළාත් මට්ටමේ');
  const filename = fileObj.filename || `${year} Term Test Paper.pdf`;

  return `<b>${icon} ${subName} — 🏫 වාර විභාග ප්‍රශ්න පත්‍රය (Term Test Paper)</b>
━━━━━━━━━━━━━━━━━━━━
📚 <b>ශ්‍රේණිය:</b> ${gradeSi}
📅 <b>වර්ෂය සහ වාරය:</b> ${year} | ${termSi}
🏛️ <b>පළාත / පාසල:</b> ${provSi}
🎯 <b>මාධ්‍යය:</b> 🇱🇰 සිංහල මාධ්‍යය
📂 <b>ලිපිගොනුව:</b> <code>${filename}</code>

💡 <i>පාසල් සහ පළාත් මට්ටමේ වාර විභාග ප්‍රශ්න පත්‍රවලට පිළිතුරු සපයා ඔබගේ සූදානම මැන බලන්න.</i>

🎓 <b>A/L MCQ HUB</b> — උසස් පෙළ සජීවී වේදිකාව 🚀
#TermTest #${subTag} #AL_${year} #TermExam`;
}
