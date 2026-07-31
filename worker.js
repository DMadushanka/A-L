// Cloudflare Worker script for A/L MCQ Quiz Telegram Bot (@AL_MCQbot)
// 100% Free Forever deployment on Cloudflare Workers (No Credit Card Required)

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

export default {
  async fetch(request, env, ctx) {
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

async function handleUpdate(update, env) {
  const BOT_TOKEN = env.BOT_TOKEN;
  const GROUP_URL = env.GROUP_URL || '';
  const FB_PAGE_URL = env.FB_PAGE_URL || '';
  const ADMIN_ID = env.ADMIN_ID || '';

  const apiUrl = (method) => `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

  const sendApi = async (method, payload) => {
    return fetch(apiUrl(method), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());
  };

  // Helper: Get Subject Keyboard
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

    if (text.startsWith('/start') || text.includes('ஆරම්භ') || text.includes('Start')) {
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
      });
    } else if (text.startsWith('/help')) {
      await sendApi('sendMessage', {
        chat_id: chatId,
        text: `📖 **උපදෙස්:**\n\n/start යවා විෂයයන් තෝරා පරීක්ෂණ ආරම්භ කරන්න.`,
        parse_mode: 'Markdown'
      });
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
      });
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
        });
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
        });
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

        const launchKeyboard = {
          inline_keyboard: [
            [{ text: '🚀 Open Interactive WebApp', url: quizUrl }],
            [{ text: '🌐 Open Browser', url: quizUrl }],
            [{ text: '🔄 වෙනත් වර්ෂයක් (Select Year)', callback_data: `cat_${subId}_pp` }]
          ]
        };

        await sendApi('sendPhoto', {
          chat_id: chatId,
          photo: imgUrl,
          caption: `🎯 **${paperData.title}**\n\n📚 **විෂය:** ${subData.name}\n📜 **ප්‍රශ්න ගණන:** MCQ 40`,
          parse_mode: 'Markdown',
          reply_markup: launchKeyboard
        });
      }
    }

    await sendApi('answerCallbackQuery', { callback_query_id: query.id });
  }
}
