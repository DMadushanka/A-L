// Cloudflare Worker script for A/L MCQ Quiz Telegram Bot (@AL_MCQbot)
// 100% Free Forever deployment on Cloudflare Workers (No Credit Card Required)
// Supports Native Telegram Poll Quizzes, WebApps, Leaderboards, Admin Wizards & Group Chats

const BASE_URL = 'https://dmadushanka.github.io/A-L';

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

// Global State Storage for Active Sessions & Poll Maps
const SESSIONS = {}; // chatId -> { subId, yearKey, paperKey, title, questions, qIndex, score, startTime }
const POLL_MAP = {}; // pollId -> { chatId, correctOption }

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

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// Fetch questions dynamically from GitHub Pages HTML
async function fetchQuestionsFromHtml(file) {
  try {
    const url = `${BASE_URL}/${file}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/const QUESTIONS = (\[[\s\S]*?\]);/);
    if (match) {
      const evalFn = new Function('return ' + match[1]);
      return evalFn();
    }
  } catch (e) {
    console.error('Error fetching questions:', e);
  }
  return null;
}

// Active WhatsApp Group Poll Vote Cache on Cloudflare Worker
const WA_GROUP_POLL_VOTES = {}; // stanzaId -> { voterId: { name, optionIdx } }

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Endpoint 1: Green API Webhook Listener
    if (url.pathname === '/wa-webhook' && request.method === 'POST') {
      try {
        const update = await request.json();
        if (update && update.typeMessage === 'pollUpdateMessage') {
          const pData = update.pollMessageData;
          const stanzaId = pData?.stanzaId;
          const senderId = update.senderId || update.senderData?.sender || '';
          const senderName = update.senderName || update.senderData?.senderName || senderId.split('@')[0] || 'Student';

          if (stanzaId && Array.isArray(pData.votes)) {
            if (!WA_GROUP_POLL_VOTES[stanzaId]) WA_GROUP_POLL_VOTES[stanzaId] = {};
            pData.votes.forEach((vOpt, optIdx) => {
              const voters = vOpt.optionVoters || [];
              voters.forEach(vId => {
                const sName = (vId === senderId && senderName) ? senderName : vId.split('@')[0];
                WA_GROUP_POLL_VOTES[stanzaId][vId] = {
                  name: sName,
                  optionIdx: optIdx
                };
              });
            });
            console.log(`🟢 Stored WhatsApp Poll Vote on Worker for StanzaID: ${stanzaId}`);
          }
        }
      } catch (err) {
        console.error('Error in WA Webhook on Worker:', err);
      }
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Endpoint 2: Fetch stored poll votes by stanzaId for bot.js
    if (url.pathname === '/get-wa-votes') {
      const stanzaId = url.searchParams.get('stanzaId');
      const votes = stanzaId && WA_GROUP_POLL_VOTES[stanzaId] ? WA_GROUP_POLL_VOTES[stanzaId] : {};
      return new Response(JSON.stringify(votes), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Endpoint 3: Register 24/7 Telegram Webhook on Cloudflare Worker
    if (url.pathname === '/setup-telegram-webhook') {
      const token = env.BOT_TOKEN || '8463293577:AAF2N2_PIP1WIoZE32Q_RMTQ8l1vr_6uXfc';
      const workerUrl = `${url.origin}`;
      const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(workerUrl)}`);
      const result = await res.json();
      return new Response(JSON.stringify(result, null, 2), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (request.method === 'POST') {
      try {
        const update = await request.json();
        await handleUpdate(update, env);
      } catch (err) {
        console.error('Error handling webhook update:', err);
      }
      return new Response('OK', { status: 200 });
    }
    return new Response('🎓 A/L MCQ Quiz Telegram Bot (@AL_MCQbot) Cloudflare Worker is Live 24/7!', { status: 200 });
  }
};

async function sendApi(method, payload, env) {
  const BOT_TOKEN = env.BOT_TOKEN;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function sendNextNativePoll(chatId, env) {
  const session = SESSIONS[chatId];
  if (!session) return;

  if (session.qIndex >= session.questions.length) {
    const total = session.questions.length;
    const score = session.score;
    const timeSec = Math.max(1, Math.round((Date.now() - session.startTime) / 1000));
    const pct = Math.round((score / total) * 100);

    let verdict = '🎉 විශිෂ්ටයි! ඔබ උසස් පෙළ පරීක්ෂණය සාර්ථකව නිම කළා.';
    if (pct < 50) verdict = '👍 මූලික අවබෝධයක් ඇත — තවදුරටත් පුහුණු වන්න.';
    else if (pct < 75) verdict = '🌟 හොඳයි! තවදුරටත් පුනරීක්ෂණය කරන්න.';

    const resultMessage = 
      `🏆 **පරීක්ෂණය සාර්ථකව අවසන්!**\n\n` +
      `🎯 **ඔබගේ ලකුණු:** ${score} / ${total} (${pct}%)\n` +
      `⏱️ **ගත වූ කාලය:** ${formatDuration(timeSec)}\n` +
      `📚 **ප්‍රශ්න පත්‍රය:** ${session.title}\n\n` +
      `${verdict}`;

    const finishKeyboard = {
      inline_keyboard: [
        [{ text: '🔄 නැවත උත්සාහ කරන්න (Retry)', callback_data: `native_${session.subId}_${session.yearKey}` }],
        [{ text: '📑 වෙනත් ප්‍රශ්න පත්‍රයක් (Select Paper)', callback_data: `cat_${session.subId}_pp` }]
      ]
    };

    await sendApi('sendMessage', {
      chat_id: chatId,
      text: resultMessage,
      parse_mode: 'Markdown',
      reply_markup: finishKeyboard
    }, env);

    delete SESSIONS[chatId];
    return;
  }

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

  const pollRes = await sendApi('sendPoll', {
    chat_id: chatId,
    question: cleanQ,
    options: cleanOpts,
    type: 'quiz',
    correct_option_id: q.c,
    explanation: cleanExplain,
    is_anonymous: false
  }, env);

  if (pollRes.ok && pollRes.result) {
    POLL_MAP[pollRes.result.poll.id] = {
      chatId,
      correctOption: q.c
    };
  } else {
    session.qIndex++;
    await sendNextNativePoll(chatId, env);
  }
}

async function handleUpdate(update, env) {
  const GROUP_URL = env.GROUP_URL || '';
  const FB_PAGE_URL = env.FB_PAGE_URL || '';
  const WA_CHANNEL_URL = env.WA_CHANNEL_URL || 'https://whatsapp.com/channel/0029VbDIx2lHwXb4rvJNIV0D';

  const getSubjectKeyboard = (isGroup = false) => {
    const portalUrl = `${BASE_URL}/index.html`;
    const portalButton = isGroup
      ? { text: '✨ 🚀 Open Animated Quiz Portal (සියලුම ප්‍රශ්න)', url: portalUrl }
      : { text: '✨ 🚀 Open Animated Quiz Portal (සියලුම ප්‍රශ්න)', web_app: { url: portalUrl } };

    const keyboard = [
      [portalButton],
      [{ text: QUIZ_DATA.pl.name, callback_data: 'sub_pl' }],
      [{ text: QUIZ_DATA.hist.name, callback_data: 'sub_hist' }],
      [{ text: QUIZ_DATA.bc.name, callback_data: 'sub_bc' }],
      [{ text: QUIZ_DATA.sin.name, callback_data: 'sub_sin' }]
    ];

    // Dedicated Full-Width WhatsApp Channel Button
    if (WA_CHANNEL_URL) {
      keyboard.push([
        { text: '🟢 Join Official WhatsApp Channel (WhatsApp චැනලය)', url: WA_CHANNEL_URL }
      ]);
    }

    // Telegram Group & Facebook Page Row
    const communityRow = [];
    if (GROUP_URL) communityRow.push({ text: '💬 Discussion Group', url: GROUP_URL });
    if (FB_PAGE_URL) communityRow.push({ text: '📘 Facebook Page', url: FB_PAGE_URL });
    if (communityRow.length > 0) keyboard.push(communityRow);

    keyboard.push([{ text: '➕ Add Bot to Your Group', url: `https://t.me/AL_MCQbot?startgroup=true` }]);
    return { inline_keyboard: keyboard };
  };

  // Handle incoming message
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const isGroup = msg.chat.type !== 'private';
    const text = msg.text || '';

    if (text.startsWith('/start') || text.includes('ආරම්භ') || text.includes('Start')) {
      const firstName = msg.from ? msg.from.first_name : 'යහළුවා';
      const welcomeMessage = 
        `✨ **ආයුබෝවන් ${firstName}!**\n\n` +
        `අ.පො.ස. (උසස් පෙළ) MCQ Quiz Bot වෙත සාදරයෙන් පිළිගනිමු! 🎓\n\n` +
        `ඔබට **Native Telegram Polls (Chat එකෙන්ම)**, **Live Competition Leaderboard**, හෝ **Telegram WebApp** මගින් Quiz කිරීමට ඔබගේ විෂය (Subject) පහතින් තෝරන්න:`;

      await sendApi('sendMessage', {
        chat_id: chatId,
        text: welcomeMessage,
        parse_mode: 'Markdown',
        reply_markup: getSubjectKeyboard(isGroup)
      }, env);
    } else if (text.startsWith('/help')) {
      await sendApi('sendMessage', {
        chat_id: chatId,
        text: `📖 **උපදෙස්:**\n\n/start යවා විෂයයන් තෝරා පරීක්ෂණ ආරම්භ කරන්න.`,
        parse_mode: 'Markdown'
      }, env);
    }
  }

  // Handle Native Telegram Poll Answers
  if (update.poll_answer) {
    const answer = update.poll_answer;
    const pollId = answer.poll_id;
    const selectedOptions = answer.option_ids;

    const mapping = POLL_MAP[pollId];
    if (mapping) {
      const { chatId, correctOption } = mapping;
      delete POLL_MAP[pollId];

      const session = SESSIONS[chatId];
      if (session) {
        if (selectedOptions && selectedOptions[0] === correctOption) {
          session.score++;
        }
        session.qIndex++;
        await sendNextNativePoll(chatId, env);
      }
    }
  }

  // Handle Callback Queries (Buttons)
  if (update.callback_query) {
    const query = update.callback_query;
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;
    const isGroup = query.message.chat.type !== 'private';

    if (data === 'nav_subjects') {
      await sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: '🎯 **කරුණාකර ඔබගේ විෂය (Subject) තෝරන්න:**',
        parse_mode: 'Markdown',
        reply_markup: getSubjectKeyboard(isGroup)
      }, env);
    } else if (data.startsWith('sub_')) {
      const subId = data.replace('sub_', '');
      const subData = QUIZ_DATA[subId];
      if (subData) {
        const text = `📘 **තෝරාගත් විෂය:** ${subData.name}\n\nකරුණාකර ඔබ සෙවීමට කැමති කාණ්ඩය තෝරන්න:`;
        const kb = {
          inline_keyboard: [
            [{ text: '📑 පසුගිය ප්‍රශ්න පත්‍ර (Past Papers)', callback_data: `cat_${subId}_pp` }],
            [{ text: '⬅️ ප්‍රධාන මෙනුවට (Back)', callback_data: 'nav_subjects' }]
          ]
        };
        await sendApi('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: kb
        }, env);
      }
    } else if (data.startsWith('cat_') && data.endsWith('_pp')) {
      const subId = data.replace('cat_', '').replace('_pp', '');
      const subData = QUIZ_DATA[subId];
      if (subData) {
        const keys = Object.keys(subData.papers);
        const keyboard = [];
        let row = [];
        keys.forEach((key, idx) => {
          row.push({ text: `📝 ${key}`, callback_data: `paper_${subId}_${key}` });
          if (row.length === 3 || idx === keys.length - 1) {
            keyboard.push(row);
            row = [];
          }
        });
        keyboard.push([{ text: '⬅️ ආපසු (Back)', callback_data: `sub_${subId}` }]);

        await sendApi('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text: `📑 **${subData.shortName} — පසුගිය ප්‍රශ්න පත්‍ර**\n\nවර්ෂය (Year) තෝරන්න:`,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        }, env);
      }
    } else if (data.startsWith('paper_')) {
      const parts = data.split('_');
      const subId = parts[1];
      const yearKey = parts[2];
      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        const quizUrl = `${BASE_URL}/${paperData.file}`;
        const imgUrl = `${BASE_URL}/${paperData.img}`;

        const webAppOption = isGroup
          ? { text: '🚀 Open Interactive WebApp (App එක තුළින්)', url: quizUrl }
          : { text: '🚀 Open Interactive WebApp (App එක තුළින්)', web_app: { url: quizUrl } };

        const launchKeyboard = {
          inline_keyboard: [
            [
              { text: '🎯 Native Telegram Polls (Chat එකෙන්ම)', callback_data: `native_${subId}_${yearKey}` }
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

        await sendApi('sendPhoto', {
          chat_id: chatId,
          photo: imgUrl,
          caption: `🎯 **${paperData.title}**\n\n📚 **විෂය:** ${subData.name}\n📜 **ප්‍රශ්න ගණන:** MCQ 40\n\n👇 ඔබ පරීක්ෂණය කිරීමට කැමති ක්‍රමය තෝරන්න:`,
          parse_mode: 'Markdown',
          reply_markup: launchKeyboard
        }, env);
      }
    } else if (data.startsWith('native_')) {
      const parts = data.split('_'); // ['native', 'pl', '2016']
      const subId = parts[1];
      const yearKey = parts[2];
      const paperKey = `${subId}_${yearKey}`;

      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        const qList = await fetchQuestionsFromHtml(paperData.file);

        if (!qList || qList.length === 0) {
          await sendApi('sendMessage', {
            chat_id: chatId,
            text: '❌ ප්‍රශ්න පත්‍රයේ ප්‍රශ්න පූරණය කිරීමට නොහැකි විය.'
          }, env);
          await sendApi('answerCallbackQuery', { callback_query_id: query.id }, env);
          return;
        }

        const userName = query.from ? [query.from.first_name, query.from.last_name].filter(Boolean).join(' ') : 'ශිෂ්‍යයා';
        const userUsername = query.from?.username ? `@${query.from.username}` : '';

        // Initialize User Poll Session with Start Time
        SESSIONS[chatId] = {
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

        await sendApi('sendMessage', {
          chat_id: chatId,
          text: `🏁 **${paperData.title}** Native Telegram Quiz ආරම්භ විය!\nපළමු ප්‍රශ්නය පහත දැක්වේ 👇`,
          parse_mode: 'Markdown'
        }, env);

        // Send first native poll
        await sendNextNativePoll(chatId, env);
      }
    }

    await sendApi('answerCallbackQuery', { callback_query_id: query.id }, env);
  }
}
