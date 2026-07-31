import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const BASE_URL = process.env.BASE_URL || 'https://dmadushanka.github.io/A-L';

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
const userPollSessions = {}; // chatId -> { subId, yearKey, title, questions, qIndex, score }
const pollIdMap = {}; // pollId -> { chatId, correctOption }

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

// Configure Permanent In-Chat WebApp Menu Button
const portalUrl = `${BASE_URL}/index.html`;

bot.setChatMenuButton({
  menu_button: JSON.stringify({
    type: 'web_app',
    text: '🎓 Quiz Portal',
    web_app: { url: portalUrl }
  })
}).catch(err => console.log('Menu Button setup notice:', err.message));

console.log('🚀 A/L MCQ Quiz Telegram Bot is starting...');
console.log(`🔗 WebApp Portal URL: ${portalUrl}`);

// Helper: Generate Keyboard for Subject Selection (Step 1)
function getSubjectKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✨ 🚀 Open Animated Quiz Portal (සියලුම ප්‍රශ්න)', web_app: { url: portalUrl } }
      ],
      [{ text: QUIZ_DATA.pl.name, callback_data: 'sub_pl' }],
      [{ text: QUIZ_DATA.hist.name, callback_data: 'sub_hist' }],
      [{ text: QUIZ_DATA.bc.name, callback_data: 'sub_bc' }],
      [{ text: QUIZ_DATA.sin.name, callback_data: 'sub_sin' }]
    ]
  };
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

// Helper: Send Next Native Poll Question
async function sendNextNativePoll(chatId) {
  const session = userPollSessions[chatId];
  if (!session) return;

  if (session.qIndex >= session.questions.length) {
    // Session Complete - Send Final Results Card
    const total = session.questions.length;
    const score = session.score;
    const pct = Math.round((score / total) * 100);

    let verdict = '🎉 විශිෂ්ටයි! ඔබ උසස් පෙළ පරීක්ෂණය සාර්ථකව නිම කළා.';
    if (pct < 50) verdict = '👍 මූලික අවබෝධයක් ඇත — තවදුරටත් පුහුණු වන්න.';
    else if (pct < 75) verdict = '🌟 හොඳයි! තවදුරටත් පුනරීක්ෂණය කරන්න.';

    const resultMessage = 
      `🏆 **පරීක්ෂණය සාර්ථකව අවසන්!**\n\n` +
      `🎯 **ලබාගත් ලකුණු:** ${score} / ${total} (${pct}%)\n` +
      `📚 **ප්‍රශ්න පත්‍රය:** ${session.title}\n\n` +
      `${verdict}`;

    const finishKeyboard = {
      inline_keyboard: [
        [{ text: '🔄 නැවත උත්සාහ කරන්න (Retry)', callback_data: `native_${session.subId}_${session.yearKey}` }],
        [{ text: '📑 වෙනත් ප්‍රශ්න පත්‍රයක් (Select Paper)', callback_data: `cat_${session.subId}_pp` }]
      ]
    };

    await bot.sendMessage(chatId, resultMessage, {
      parse_mode: 'Markdown',
      reply_markup: finishKeyboard
    });

    delete userPollSessions[chatId];
    return;
  }

  // Get current question
  const q = session.questions[session.qIndex];
  const qNum = session.qIndex + 1;
  const totalQ = session.questions.length;

  let rawQText = q.q || `ප්‍රශ්නය ${qNum}`;
  
  // Clean HTML tags and formatting
  rawQText = cleanText(rawQText, 300);

  // Strip duplicate leading question numbers like "19. ", "19.", "19)", "19 - "
  rawQText = rawQText.replace(/^\d+[\.\)\-]?\s*/, '');

  const cleanQ = cleanText(`[${qNum}/${totalQ}] ${rawQText}`, 300);
  const cleanOpts = (q.o || []).map(o => cleanText(o, 100));
  const cleanExplain = cleanText(q.e || '', 200);

  try {
    const pollMsg = await bot.sendPoll(chatId, cleanQ, cleanOpts, {
      type: 'quiz',
      correct_option_id: q.c,
      explanation: cleanExplain ? `💡 ${cleanExplain}` : undefined,
      is_anonymous: false
    });

    // Register Poll ID mapping
    pollIdMap[pollMsg.poll.id] = {
      chatId,
      correctOption: q.c
    };

  } catch (err) {
    console.error(`Error sending poll Q${qNum} to ${chatId}:`, err.message);
    // If poll failed (e.g. format error), skip to next
    session.qIndex++;
    sendNextNativePoll(chatId);
  }
}

// Command: /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'යහළුවා';

  const welcomeMessage = 
    `✨ **ආයුබෝවන් ${firstName}!**\n\n` +
    `අ.පො.ස. (උසස් පෙළ) MCQ Quiz Bot වෙත සාදරයෙන් පිළිගනිමු! 🎓\n\n` +
    `ඔබට **Native Telegram Polls (Chat එකෙන්ම)** හෝ **Telegram WebApp** මගින් Quiz කිරීමට ඔබගේ විෂය (Subject) පහතින් තෝරන්න:`;

  bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: getSubjectKeyboard()
  });
});

// Command: /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpText = 
    `📖 **භාවිතය පිළිබඳ උපදෙස්:**\n\n` +
    `1. **/start** command එක යවා විෂයයන් තෝරන්න.\n` +
    `2. පසුගිය ප්‍රශ්න පත්‍ර තෝරා වර්ෂය මත Click කරන්න.\n` +
    `3. **🎯 Native Telegram Polls** (Chat එකෙන්ම), **🚀 Open WebApp**, හෝ **🌐 Open Browser** මගින් පරීක්ෂණයට මුහුණ දෙන්න.\n\n` +
    `💡 **විශේෂාංග:**\n` +
    `• MCQ 40 සඳහා නිවැරදි විග්‍රහයන්\n` +
    `• Real-time Timer සහ Score Gauge\n` +
    `• Instant Confetti 🎉 & Explanation Tooltips`;

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

    // Small delay before sending next poll for smooth user experience
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

  try {
    // 1. Back to Main Subject Selection
    if (data === 'nav_subjects') {
      const text = `🎯 **කරුණාකර ඔබගේ විෂය (Subject) තෝරන්න:**`;
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: getSubjectKeyboard()
      });
      await bot.answerCallbackQuery(query.id);
      return;
    }

    // 2. Subject Selected -> Show Category Menu (Past Papers vs Other)
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
        });
      }
      await bot.answerCallbackQuery(query.id);
      return;
    }

    // 3. Category Selected -> Past Papers (Show Year Grid)
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
        });
      }
      await bot.answerCallbackQuery(query.id);
      return;
    }

    // 4. Category Selected -> Other (Model Papers & Info)
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
        });
      }
      await bot.answerCallbackQuery(query.id);
      return;
    }

    // 5. Paper Selected -> Display Rich Launch Card (Native Polls, WebApp, Browser)
    if (data.startsWith('paper_')) {
      const parts = data.split('_'); // ['paper', 'pl', '2016']
      const subId = parts[1];
      const yearKey = parts[2];

      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        const quizUrl = `${BASE_URL}/${paperData.file}`;
        const imgUrl = `${BASE_URL}/${paperData.img}`;

        const cardCaption = 
          `🎯 **${paperData.title}**\n\n` +
          `📚 **විෂය:** ${subData.name}\n` +
          `📜 **ප්‍රශ්න ගණන:** MCQ 40\n` +
          `💡 **විශේෂාංග:** ඓතිහාසික/විෂයානුබද්ධ විග්‍රහයන්, Instant Confetti 🎉 & Native Telegram Polls.\n\n` +
          `👇 ඔබ පරීක්ෂණය කිරීමට කැමති ක්‍රමය තෝරන්න:`;

        const launchKeyboard = {
          inline_keyboard: [
            [
              { text: '🎯 Native Telegram Polls (Chat එකෙන්ම)', callback_data: `native_${subId}_${yearKey}` }
            ],
            [
              { text: '🚀 Open Interactive WebApp (App එක තුළින්)', web_app: { url: quizUrl } }
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
        });
      }

      await bot.answerCallbackQuery(query.id);
      return;
    }

    // 6. Native Quiz Mode Selected -> Start Native Telegram Poll Session
    if (data.startsWith('native_')) {
      const parts = data.split('_'); // ['native', 'pl', '2016']
      const subId = parts[1];
      const yearKey = parts[2];

      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        const qList = loadQuestionsFromHtml(paperData.file);

        if (!qList || qList.length === 0) {
          await bot.sendMessage(chatId, '❌ ප්‍රශ්න පත්‍රයේ ප්‍රශ්න පූරණය කිරීමට නොහැකි විය.');
          await bot.answerCallbackQuery(query.id);
          return;
        }

        // Initialize User Poll Session
        userPollSessions[chatId] = {
          subId,
          yearKey,
          title: paperData.title,
          questions: qList,
          qIndex: 0,
          score: 0
        };

        await bot.sendMessage(chatId, `🏁 **${paperData.title}** Native Telegram Quiz ආරම්භ විය!\nපළමු ප්‍රශ්නය පහත දැක්වේ 👇`, {
          parse_mode: 'Markdown'
        });

        // Send first poll
        sendNextNativePoll(chatId);
      }

      await bot.answerCallbackQuery(query.id);
      return;
    }

  } catch (err) {
    console.error('Error handling callback query:', err);
    await bot.answerCallbackQuery(query.id, { text: 'දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.' });
  }
});

console.log('✅ Telegram Bot Ready! Listening for messages & poll answers...');
