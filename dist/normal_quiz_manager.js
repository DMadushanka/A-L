import fs from 'fs';
import path from 'path';

const _scriptDir = (typeof __dirname !== 'undefined' && __dirname) ? __dirname : process.cwd();
const NORMAL_QUIZ_DIR = path.resolve(_scriptDir, 'normal_quiz');

export const SUBJECTS_CONFIG = {
  bc: {
    code: 'bc',
    name: '☸️ බෞද්ධ ශිෂ්ටාචාරය (Buddhist Civilization)',
    shortName: 'බෞද්ධ ශිෂ්ටාචාරය',
    englishName: 'Buddhist Civilization',
    icon: '☸️',
    rawFile: 'bc_mcq.json',
    description: 'ථෙරවාද බුදුදහම, ඉන්දියානු හා ශ්‍රී ලාංකේය බෞද්ධ සංස්කෘතිය හා ඉතිහාසය'
  },
  geo: {
    code: 'geo',
    name: '🌍 භූගෝල විද්‍යාව (Geography)',
    shortName: 'භූගෝල විද්‍යාව',
    englishName: 'Geography',
    icon: '🌍',
    rawFile: 'geo_mcq.json',
    description: 'භෞතික භූගෝල විද්‍යාව, මානව හා ප්‍රායෝගික භූගෝල විද්‍යාව'
  },
  md: {
    code: 'md',
    name: '📡 සන්නිවේදනය හා මාධ්‍ය අධ්‍යයනය (Media Studies)',
    shortName: 'මාධ්‍ය අධ්‍යයනය',
    englishName: 'Media Studies',
    icon: '📡',
    rawFile: 'md_mcq.json',
    description: 'සන්නිවේදන න්‍යාය, ජනමාධ්‍ය, පුවත්පත් කලාව හා මාධ්‍ය නීතිය'
  },
  si: {
    code: 'si',
    name: '✍️ සිංහල භාෂාව හා සාහිත්‍යය (Sinhala Language)',
    shortName: 'සිංහල',
    englishName: 'Sinhala Language',
    icon: '✍️',
    rawFile: 'si_mcq.json',
    description: 'සිංහල ව්‍යාකරණය, භාෂා රීති, සාහිත්‍යය හා විචාර'
  }
};

const ITEMS_PER_PAGE = 12; // 12 quizzes per page (6 rows x 2 columns)
const MCQS_PER_QUIZ = 50;

// In-memory cache for fast response
let cachedSubjectQuizzes = null;

/**
 * Clean question text by stripping leading numbers e.g. "(01) ", "1. ", "01 - "
 */
function cleanQuestionText(qText) {
  if (!qText) return '';
  return qText
    .replace(/^[\(\[\{]?\s*\d+\s*[\)\]\}]?[\.\:\-\s]*/, '')
    .trim();
}

/**
 * Clean options array
 */
function cleanOptionsList(opts) {
  if (!Array.isArray(opts)) return [];
  return opts.map(opt => (typeof opt === 'string' ? opt.trim() : String(opt || '')));
}

/**
 * Parse raw file data into unified question objects: { q, o, c, e }
 */
function extractRawQuestions(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[NormalQuiz] File not found: ${filePath}`);
    return [];
  }

  try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(rawContent);
    const rawList = Array.isArray(parsed)
      ? (parsed[0]?.questions ? parsed[0].questions : parsed)
      : [];

    const unifiedList = [];

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      const q = cleanQuestionText(item.question || item.q || '');
      const o = cleanOptionsList(item.options || item.o || []);
      let c = item.correct_option_id !== undefined ? Number(item.correct_option_id) : (item.c !== undefined ? Number(item.c) : 0);

      // Verify correct option bounds
      if (isNaN(c) || c < 0 || c >= o.length) {
        c = 0;
      }

      // Determine explanation or correct answer text
      let e = item.explanation || item.e || '';
      if (!e && item.correct_answer) {
        e = `නිවැරදි පිළිතුර: ${item.correct_answer}`;
      } else if (!e && o[c]) {
        e = `නිවැරදි පිළිතුර: ${o[c]}`;
      }

      if (q && o.length >= 2) {
        unifiedList.push({ q, o, c, e });
      }
    }

    return unifiedList;
  } catch (err) {
    console.error(`[NormalQuiz] Error parsing ${filePath}:`, err.message);
    return [];
  }
}

/**
 * Load all subject questions, divide into 50-MCQ sets, and save partitioned files
 */
export function initializeNormalQuizzes(forceReload = false) {
  if (cachedSubjectQuizzes && !forceReload) {
    return cachedSubjectQuizzes;
  }

  const result = {};

  for (const [subCode, cfg] of Object.entries(SUBJECTS_CONFIG)) {
    const filePath = path.join(NORMAL_QUIZ_DIR, cfg.rawFile);
    const questions = extractRawQuestions(filePath);
    const totalQuestions = questions.length;
    const totalQuizzes = Math.ceil(totalQuestions / MCQS_PER_QUIZ);

    const quizzes = [];

    for (let qIdx = 0; qIdx < totalQuizzes; qIdx++) {
      const startIdx = qIdx * MCQS_PER_QUIZ;
      const endIdx = Math.min(startIdx + MCQS_PER_QUIZ, totalQuestions);
      const quizQuestions = questions.slice(startIdx, endIdx);
      const quizNum = qIdx + 1;
      const padNum = String(quizNum).padStart(2, '0');
      const startNum = startIdx + 1;
      const endNum = endIdx;

      const quizTitle = `A/L MCQ HUB — ${cfg.shortName} Quiz ${padNum} (MCQ ${startNum}-${endNum})`;
      const quizId = `${subCode}_${padNum}`;

      quizzes.push({
        quiz_id: quizId,
        subject_code: subCode,
        subject_name: cfg.name,
        brand: 'A/L MCQ HUB',
        quiz_title: quizTitle,
        quiz_num: quizNum,
        total_quizzes: totalQuizzes,
        range: `${startNum} - ${endNum}`,
        mcq_count: quizQuestions.length,
        questions: quizQuestions
      });
    }

    result[subCode] = {
      ...cfg,
      totalQuestions,
      totalQuizzes,
      quizzes
    };

    // Save standardized 50-MCQ partitioned JSON for each subject into normal_quiz folder
    try {
      const partitionedPath = path.join(NORMAL_QUIZ_DIR, `${subCode}_50mcq_quizzes.json`);
      fs.writeFileSync(partitionedPath, JSON.stringify({
        brand: 'A/L MCQ HUB',
        subject: cfg.name,
        subject_code: subCode,
        total_questions: totalQuestions,
        total_quizzes: totalQuizzes,
        quizzes: quizzes
      }, null, 2), 'utf8');
    } catch (writeErr) {
      console.warn(`[NormalQuiz] Could not write partitioned file for ${subCode}:`, writeErr.message);
    }
  }

  cachedSubjectQuizzes = result;
  console.log(`✅ [NormalQuiz] Successfully loaded & partitioned 4 subjects into 50-MCQ sets (${Object.values(result).reduce((acc, s) => acc + s.totalQuizzes, 0)} Quizzes total) under brand A/L MCQ HUB`);
  return result;
}

/**
 * Get subject metadata and quizzes
 */
export function getSubjectData(subCode) {
  const all = cachedSubjectQuizzes || initializeNormalQuizzes();
  return all[subCode] || null;
}

/**
 * Get a specific quiz (1-based index)
 */
export function getQuizByNumber(subCode, quizNum) {
  const sub = getSubjectData(subCode);
  if (!sub || !sub.quizzes) return null;
  const num = parseInt(quizNum, 10);
  return sub.quizzes.find(q => q.quiz_num === num) || null;
}

/**
 * Build the Main Subject Selection Menu (HTML Message + Inline Keyboard)
 */
export function buildSubjectMenuMessage() {
  const all = cachedSubjectQuizzes || initializeNormalQuizzes();

  let text =
    `📚 <b>A/L MCQ HUB — Normal Quiz ප්‍රශ්නාවලී මධ්‍යස්ථානය</b> 🎯\n\n` +
    `අපගේ විෂය ප්‍රවීණ ආචාර්ය මණ්ඩලය විසින් සකස් කරන ලද <b>MCQ 4,800+</b> කින් සමන්විත දැවැන්ත බහුවරණ ප්‍රශ්න බැංකුව (Master MCQ Bank) වෙත සාදරයෙන් පිළිගනිමු!\n\n` +
    `🔹 සෑම ප්‍රශ්නාවලියක්ම <b>ප්‍රශ්න 50 (50 MCQs)</b> බැගින් පරිච්ඡේද අනුව පිළිවෙළට බෙදා ඇත.\n` +
    `⏱️ <b>සෑම ප්‍රශ්නයකටම තත්පර 20 ක කාල සීමාවක්</b> සහිත සජීවී තරඟ (Live Quiz Competitions) ලෙස ක්‍රියාත්මක වේ.\n` +
    `🏆 අවසානයේදී ජයග්‍රාහකයින්ගේ සජීවී Leaderboard එක ප්‍රකාශයට පත් කෙරේ.\n\n` +
    `👇 <b>ඔබට අවශ්‍ය විෂය පහතින් තෝරන්න (Select Subject):</b>`;

  const keyboard = [];

  for (const [code, data] of Object.entries(all)) {
    keyboard.push([
      {
        text: `${data.icon} ${data.shortName} (${data.totalQuizzes} Quizzes • ${data.totalQuestions} MCQs)`,
        callback_data: `nq_sub:${code}:1`
      }
    ]);
  }

  keyboard.push([
    { text: '❌ මෙනුව වසන්න (Close)', callback_data: 'nq_close' }
  ]);

  return {
    text,
    reply_markup: { inline_keyboard: keyboard }
  };
}

/**
 * Build Paginated Quiz List for a Subject (HTML Message + Inline Keyboard)
 */
export function buildSubjectQuizzesMessage(subCode, page = 1) {
  const sub = getSubjectData(subCode);
  if (!sub) return null;

  const totalQuizzes = sub.quizzes.length;
  const totalPages = Math.ceil(totalQuizzes / ITEMS_PER_PAGE) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));

  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, totalQuizzes);
  const currentQuizzes = sub.quizzes.slice(startIdx, endIdx);

  const startQuizNum = startIdx + 1;
  const endQuizNum = endIdx;

  let text =
    `${sub.icon} <b>A/L MCQ HUB — ${sub.shortName} Normal Quizzes</b>\n` +
    `📊 <b>මුළු ප්‍රශ්නාවලි:</b> ${totalQuizzes} Quizzes (${sub.totalQuestions} MCQs)\n` +
    `📄 <b>පිටුව:</b> ${currentPage} / ${totalPages} (Quizzes ${String(startQuizNum).padStart(2, '0')} - ${String(endQuizNum).padStart(2, '0')})\n` +
    `📝 <i>${sub.description}</i>\n\n` +
    `💡 <b>පහතින් ඔබට අවශ්‍ය Quiz එක තෝරා ක්ලික් කරන්න.</b>\n` +
    `<i>එවිට මෙම සමූහය/චැට් එක තුළ සජීවීව 50 MCQ Quiz Competition තරඟය ආරම්භ වේ!</i>`;

  const keyboard = [];

  // Build 2-column grid for quizzes
  for (let i = 0; i < currentQuizzes.length; i += 2) {
    const row = [];
    const q1 = currentQuizzes[i];
    const pad1 = String(q1.quiz_num).padStart(2, '0');
    row.push({
      text: `🎯 Quiz ${pad1} (${q1.range})`,
      callback_data: `nq_start:${subCode}:${q1.quiz_num}`
    });

    if (i + 1 < currentQuizzes.length) {
      const q2 = currentQuizzes[i + 1];
      const pad2 = String(q2.quiz_num).padStart(2, '0');
      row.push({
        text: `🎯 Quiz ${pad2} (${q2.range})`,
        callback_data: `nq_start:${subCode}:${q2.quiz_num}`
      });
    }

    keyboard.push(row);
  }

  // Pagination navigation row
  const navRow = [];
  if (currentPage > 1) {
    navRow.push({ text: '⬅️ පෙර පිටුව', callback_data: `nq_page:${subCode}:${currentPage - 1}` });
  }

  navRow.push({ text: `📄 ${currentPage}/${totalPages}`, callback_data: `nq_page:${subCode}:${currentPage}` });

  if (currentPage < totalPages) {
    navRow.push({ text: 'ඊළඟ පිටුව ➡️', callback_data: `nq_page:${subCode}:${currentPage + 1}` });
  }

  keyboard.push(navRow);

  // Back to Subject Selection button
  keyboard.push([
    { text: '🔙 සියලු විෂයයන් (All Subjects)', callback_data: 'nq_menu' },
    { text: '❌ වසන්න (Close)', callback_data: 'nq_close' }
  ]);

  return {
    text,
    reply_markup: { inline_keyboard: keyboard }
  };
}
