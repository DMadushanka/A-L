import fs from 'fs';
import path from 'path';

const _scriptDir = (typeof __dirname !== 'undefined' && __dirname) ? __dirname : process.cwd();
const MAP_LOCATIONS_FILE = path.resolve(_scriptDir, 'normal_quiz', 'map_locations.json');

let cachedMapData = null;

/**
 * Load and cache map locations dataset
 */
export function loadMapLocations() {
  if (cachedMapData) return cachedMapData;
  try {
    if (fs.existsSync(MAP_LOCATIONS_FILE)) {
      const raw = fs.readFileSync(MAP_LOCATIONS_FILE, 'utf8');
      cachedMapData = JSON.parse(raw);
      return cachedMapData;
    }
  } catch (e) {
    console.error('⚠️ [MapQuizManager] Failed to load map_locations.json:', e.message);
  }
  return { maps: {} };
}

/**
 * Build the Main Map Marking Menu message and Inline Keyboard
 * Supports Telegram Mini App (TWA) + In-Chat Fast Drills
 */
export function buildMapHubMessage(baseUrl = 'https://dmadushanka.github.io/A-L', isGroup = false) {
  // Ensure HTTPS and append dynamic version to bust Telegram WebView cache
  const cacheBuster = Date.now();
  let webAppUrl = `${baseUrl.replace(/\/$/, '')}/map_app.html?v=${cacheBuster}`;
  if (!webAppUrl.startsWith('https://') && !webAppUrl.startsWith('http://localhost')) {
    webAppUrl = `https://${webAppUrl.replace(/^http:\/\//, '')}`;
  }

  const text = 
`🗺️ *A/L සිතියම් සලකුණු කිරීමේ පුහුණු මධ්‍යස්ථානය (Map Marking Hub)*
━━━━━━━━━━━━━━━━━━━━━
🎓 *A/L විභාගයේ අනිවාර්ය සිතියම් ප්‍රශ්නයට 100% ක් ලකුණු ලබාගන්න!*

📌 *විෂයයන්:*
• 📜 **ඉතිහාසය (History):** පුරාණ වරාය, රාජධානි, සිද්ධස්ථාන, සටන්බිම්
• 🌍 **භූගෝල විද්‍යාව (Geography):** ගංගා, උස්බිම්, ඛනිජ කලාප, වරායවල්

✨ **ඔබට අවශ්‍ය ක්‍රමය තෝරන්න:**
1️⃣ **📱 අන්තර්ක්‍රියාකාරී සිතියම (Interactive Mini App):**
   _Telegram තුළම සිතියම Touch කර නිවැරදි ස්ථාන සලකුණු කර ලකුණු ලබාගන්න._

2️⃣ **⚡ ක්ෂණික ප්‍රශ්නාවලිය (In-Chat Quiz):**
   _Chat එක තුළදීම සිතියම් ප්‍රශ්න වලට පිළිතුරු සපයන්න._`;

  const slAppButton = isGroup
    ? { text: '🇱🇰 ශ්‍රී ලංකා සිතියම් App 🗺️', url: `${webAppUrl}?map=sri_lanka` }
    : { text: '🇱🇰 ශ්‍රී ලංකා සිතියම් App 🗺️', web_app: { url: `${webAppUrl}?map=sri_lanka` } };

  const worldAppButton = isGroup
    ? { text: '🌍 ලෝක සිතියම් App (Geography) 🌐', url: `${webAppUrl}?map=world_geo` }
    : { text: '🌍 ලෝක සිතියම් App (Geography) 🌐', web_app: { url: `${webAppUrl}?map=world_geo` } };

  const keyboard = {
    inline_keyboard: [
      [
        slAppButton
      ],
      [
        worldAppButton
      ],
      [
        { text: '📜 ඉතිහාසය (ශ්‍රී ලංකා සිතියම)', callback_data: 'map_quiz:history:sri_lanka' },
        { text: '🌍 භූගෝල (ලෝක සිතියම)', callback_data: 'map_quiz:geo:world_geo' }
      ],
      [
        { text: '🇱🇰 භූගෝල (ශ්‍රී ලංකා සිතියම)', callback_data: 'map_quiz:geo:sri_lanka' },
        { text: '🎲 මිශ්‍ර සිතියම් පුහුණුව', callback_data: 'map_quiz:all:sri_lanka' }
      ],
      [
        { text: '🔙 ප්‍රධාන මෙනුවට (Main Menu)', callback_data: 'nav_subjects' }
      ]
    ]
  };

  return { text, keyboard };
}

/**
 * Generate a random In-Chat Map MCQ question
 */
export function generateInChatMapQuestion(subject = 'all', mapKey = 'sri_lanka') {
  const data = loadMapLocations();
  const mapMeta = data.maps?.[mapKey];
  if (!mapMeta || !mapMeta.locations || mapMeta.locations.length === 0) {
    return null;
  }

  let pool = mapMeta.locations;
  if (subject !== 'all') {
    pool = mapMeta.locations.filter(l => l.subject?.includes(subject));
  }
  if (pool.length < 4) pool = mapMeta.locations;

  // Pick random target location
  const targetIndex = Math.floor(Math.random() * pool.length);
  const target = pool[targetIndex];

  // Pick 3 distractors
  const distractors = mapMeta.locations
    .filter(l => l.id !== target.id)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  // Combine and shuffle options
  const allOptions = [target, ...distractors].sort(() => 0.5 - Math.random());

  const optionsText = allOptions.map((opt, i) => {
    const letters = ['A', 'B', 'C', 'D'];
    return `${letters[i]}) ${opt.name_si}`;
  }).join('\n');

  // Relative location hint
  let locHint = '';
  if (mapKey === 'world_geo') {
    locHint = `🌐 **වර්ගීකරණය:** ${target.category_si || 'ලෝක භූගෝල විද්‍යා ස්ථානයක්'}`;
  } else {
    const lat = target.coords.lat;
    const lng = target.coords.lng;
    const xDir = lng < 80.2 ? 'බටහිර' : (lng > 81.2 ? 'නැගෙනහිර' : 'මධ්‍යම');
    const yDir = lat < 6.8 ? 'දකුණු' : (lat > 8.5 ? 'උතුරු' : 'මධ්‍යම');
    locHint = `🧭 **පිහිටීම ඉඟිය:** ශ්‍රී ලංකාවේ **${yDir}-${xDir}** ප්‍රදේශය ආශ්‍රිතව පිහිටා ඇත.`;
  }

  const questionText = 
`🗺️ *සිතියම් ප්‍රශ්නාවලිය — ${mapMeta.name_si}*
━━━━━━━━━━━━━━━━━━━━━
📍 **ස්ථාන විස්තරය:**
_${target.description}_

${locHint}

❓ **මෙම විස්තරයට අදාළ නිවැරදි ස්ථානය කුමක්ද?**

${optionsText}`;

  const inlineButtons = [];
  const letters = ['A', 'B', 'C', 'D'];
  
  for (let i = 0; i < allOptions.length; i += 2) {
    const row = [];
    row.push({
      text: `${letters[i]}. ${allOptions[i].name_si.split(' ')[0]}`,
      callback_data: `map_ans:${allOptions[i].id}:${target.id}:${subject}:${mapKey}`
    });
    if (i + 1 < allOptions.length) {
      row.push({
        text: `${letters[i+1]}. ${allOptions[i+1].name_si.split(' ')[0]}`,
        callback_data: `map_ans:${allOptions[i+1].id}:${target.id}:${subject}:${mapKey}`
      });
    }
    inlineButtons.push(row);
  }

  inlineButtons.push([
    { text: '🔄 වෙනත් ප්‍රශ්නයක්', callback_data: `map_quiz:${subject}:${mapKey}` },
    { text: '🗺️ සිතියම් Hub එකට', callback_data: 'open_map_hub' }
  ]);

  return {
    text: questionText,
    keyboard: { inline_keyboard: inlineButtons },
    target
  };
}

/**
 * Handle student answer for in-chat quiz
 */
export function evaluateInChatMapAnswer(selectedId, correctId, subject, mapKey) {
  const data = loadMapLocations();
  const mapMeta = data.maps?.[mapKey];
  const allLocs = mapMeta?.locations || [];

  const correctLoc = allLocs.find(l => l.id === correctId);
  const selectedLoc = allLocs.find(l => l.id === selectedId);

  const isCorrect = (selectedId === correctId);

  let responseText = '';
  if (isCorrect) {
    responseText = 
`🎯 *නියමයි! ඔබේ පිළිතුර 100% ක් නිවැරදියි.* (+10 ලකුණු)
━━━━━━━━━━━━━━━━━━━━━
📍 **${correctLoc?.name_si}**
ℹ️ ${correctLoc?.description || ''}
${correctLoc?.exam_points ? '\n💡 *විභාග කරුණු:*\n' + correctLoc.exam_points : ''}`;
  } else {
    responseText = 
`❌ *පිළිතුර වැරදියි!* (0 ලකුණු)
━━━━━━━━━━━━━━━━━━━━━
ඔබ තේරූ පිළිතුර: **${selectedLoc?.name_si || 'නොදනී'}**
✅ නිවැරදි පිළිතුර: **${correctLoc?.name_si || 'නොදනී'}**

ℹ️ **විස්තරය:** ${correctLoc?.description || ''}
${correctLoc?.exam_points ? '\n💡 *විභාග කරුණු:*\n' + correctLoc.exam_points : ''}`;
  }

  const nextKeyboard = {
    inline_keyboard: [
      [
        { text: '➡️ මීළඟ සිතියම් ප්‍රශ්නය (Next)', callback_data: `map_quiz:${subject}:${mapKey}` }
      ],
      [
        { text: '🗺️ සිතියම් මෙනුවට (Map Hub)', callback_data: 'open_map_hub' }
      ]
    ]
  };

  return {
    isCorrect,
    text: responseText,
    keyboard: nextKeyboard
  };
}

/**
 * Process and format results sent back from Telegram Mini App (TWA)
 */
export function formatMiniAppResult(payload) {
  const score = payload.score || 0;
  const maxScore = payload.maxScore || 100;
  const percentage = payload.percentage || Math.round((score / maxScore) * 100);

  let badge = '🥉';
  let comment = 'උත්සාහය අත්නොහරින්න, තවදුරටත් පුහුණු වන්න!';
  if (percentage >= 80) {
    badge = '🥇';
    comment = 'විශිෂ්ට සාමාර්ථයක්! ඔබ සිතියම් ලකුණු කිරීමට ඉතා දක්ෂයි.';
  } else if (percentage >= 50) {
    badge = '🥈';
    comment = 'හොඳ ප්‍රගතියක්! තව ටිකක් පුහුණු වී 100% කරා යන්න.';
  }

  const text = 
`🏆 *අන්තර්ක්‍රියාකාරී සිතියම් විභාග ප්‍රතිඵලය (Exam Card)*
━━━━━━━━━━━━━━━━━━━━━
${badge} **ලකුණු:** \`${score} / ${maxScore}\` (*${percentage}%*)
📊 **ශ්‍රේණිය:** ${comment}

💡 *දිනපතා සිතියම් පුහුණු වීමෙන් A/L විභාගයේ සම්පූර්ණ ලකුණු පහසුවෙන්ම ලබාගත හැක!*`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔄 නැවත සිතියම පුහුණු වන්න', callback_data: 'open_map_hub' }
      ]
    ]
  };

  return { text, keyboard, percentage };
}
