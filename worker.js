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

// Global State Storage for Active Sessions, Poll Maps & Custom Scheduling
const SESSIONS = {}; // chatId -> { subId, yearKey, paperKey, title, questions, qIndex, score, startTime }
const POLL_MAP = {}; // pollId -> { chatId, correctOption }
const CUSTOM_TIME_STATE = {}; // chatId -> { paperKey, time }
const SCHEDULED_QUIZZES = []; // array of { paperKey, targetTime, chatId, timeLabel, executed }

function scheduleQuiz(paperKey, delayMs, timeLabel, chatId) {
  const targetTime = Date.now() + delayMs;
  SCHEDULED_QUIZZES.push({
    paperKey,
    targetTime,
    timeLabel,
    chatId,
    executed: false
  });
  console.log(`⏰ Quiz ${paperKey} scheduled for ${new Date(targetTime).toISOString()} (${timeLabel})`);
}

async function checkAndRunScheduledQuizzes(env, ctx) {
  const now = Date.now();
  for (let i = 0; i < SCHEDULED_QUIZZES.length; i++) {
    const item = SCHEDULED_QUIZZES[i];
    if (!item.executed && now >= item.targetTime) {
      item.executed = true;
      console.log(`🚀 Scheduled time reached for ${item.paperKey}! Starting automated quiz...`);

      const subId = item.paperKey.split('_')[0];
      const yearKey = item.paperKey.split('_')[1];
      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        // 1. Send Automated Telegram Start Announcement
        await sendApi('sendMessage', {
          chat_id: item.chatId,
          text: `🚀 **${paperData.title} සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය!**\n\nපළමු ප්‍රශ්නය පහත දැක්වේ 👇`,
          parse_mode: 'Markdown'
        }, env);

        // 2. Trigger WhatsApp Poll Stream + Answer Booklet
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(processSingleWhatsAppPollStep(item.paperKey, 0, 20, env));
        } else {
          processSingleWhatsAppPollStep(item.paperKey, 0, 20, env);
        }
      }
    }
  }
}

function parseCustomTimeInput(inputStr) {
  if (!inputStr) return null;
  const str = inputStr.trim().toLowerCase();
  
  // 1. Relative mins/hours: '30m', '45m', '15 mins', '2h', '15'
  const relMatch = str.match(/^(\d+)\s*(m|min|mins|minutes|h|hr|hours)?$/);
  if (relMatch) {
    const val = parseInt(relMatch[1], 10);
    const unit = relMatch[2] || 'm';
    if (unit.startsWith('h')) {
      return { delayMs: val * 3600 * 1000, label: `තවත් පැය ${val} කින් (In ${val} Hours)` };
    } else {
      return { delayMs: val * 60 * 1000, label: `තවත් මිනිත්තු ${val} කින් (In ${val} Mins)` };
    }
  }

  // 2. Exact clock time: '20:30', '8:30', '19:45', '09:15'
  const timeMatch = str.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const mins = parseInt(timeMatch[2], 10);
    if (hours >= 0 && hours < 24 && mins >= 0 && mins < 60) {
      const target = new Date();
      target.setHours(hours, mins, 0, 0);
      if (target.getTime() <= Date.now()) {
        target.setDate(target.getDate() + 1);
      }
      const delayMs = target.getTime() - Date.now();
      const hStr = hours.toString().padStart(2, '0');
      const mStr = mins.toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'රාත්‍රී/සවස' : 'උදෑසන';
      return { delayMs, label: `පැය ${hStr}:${mStr} ට (${ampm})` };
    }
  }

  return null;
}

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

function parseJsArray(str) {
  try {
    return JSON.parse(str);
  } catch (e) {}

  try {
    // 1. Convert unquoted JS keys (q:, o:, c:, e:) to double quoted JSON keys ("q":, "o":, "c":, "e":)
    let jsonStr = str.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
    // 2. Remove any trailing commas inside objects or arrays
    jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');

    return JSON.parse(jsonStr);
  } catch (err) {
    return null;
  }
}

function getPaperImageUrl(paperKey) {
  if (!paperKey) return `${BASE_URL}/logo.png`;
  const parts = paperKey.split('_');
  const subId = parts[0];
  const yearKey = parts[1];
  const subData = QUIZ_DATA[subId];
  const paperData = subData?.papers[yearKey];
  if (paperData && paperData.img) {
    return `${BASE_URL}/${paperData.img}`;
  }
  return `${BASE_URL}/logo.png`;
}

// Helper: Zero-Manual-Interaction Automated WhatsApp Channel Publisher via Green API for Cloudflare Worker
async function autoPostToWhatsAppChannel(messageText, imageUrl = null, env = {}) {
  const instanceId = (env.GREEN_API_INSTANCE || '710722698143').trim();
  const apiToken = (env.GREEN_API_TOKEN || 'b65f5e2285e54499a88b78d13354ba79f7fe2bd4c0d648049f').trim();
  const targetChat = (env.WA_TARGET_CHAT || '120363409065043686@g.us').trim();

  if (!instanceId || !apiToken) return false;

  try {
    if (imageUrl) {
      const res = await fetch(`https://api.green-api.com/waInstance${instanceId}/sendFileByUrl/${apiToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: targetChat,
          urlFile: imageUrl,
          fileName: 'al_mcq_hub_banner.png',
          caption: messageText
        })
      });
      const data = await res.json();
      if (data && data.idMessage) {
        console.log(`🟢 WhatsApp Image Banner Post sent from Worker! Message ID: ${data.idMessage}`);
        return true;
      }
    }

    const textRes = await fetch(`https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: targetChat,
        message: messageText
      })
    });
    const textData = await textRes.json();
    if (textData && textData.idMessage) {
      console.log(`🟢 WhatsApp Text Post sent from Worker! Message ID: ${textData.idMessage}`);
      return true;
    }
  } catch (err) {
    console.error('Error auto-posting to WA from Worker:', err.message);
  }
  return false;
}

// Helper: Perpetual Self-Chaining Automated WhatsApp Group Poll Quiz Streamer on Worker
async function processSingleWhatsAppPollStep(paperKey, qIndex = 0, intervalSec = 20, env = {}, ctx = null, origin = 'https://a-l.gayanmadushanka1610.workers.dev') {
  if (!paperKey) return;
  const parts = paperKey.split('_');
  const subId = parts[0];
  const yearKey = parts[1];

  const subData = QUIZ_DATA[subId];
  const paperData = subData?.papers[yearKey];
  if (!paperData) return;

  const questions = await fetchQuestionsFromHtml(paperData.file);
  if (!questions || questions.length === 0) return;

  const totalQ = questions.length;
  if (qIndex >= totalQ) {
    // Send Final Completion Card
    const finishMsg = 
      `═════════════════════════\n` +
      `🏆 *${paperData.title}*\n` +
      `🎯 *ප්‍රශ්න පත්‍ර තරඟය සාර්ථකව අවසන්!* ⚡\n` +
      `═════════════════════════\n\n` +
      `🎉 සහභාගී වූ සියලුම සිසුන්ට ස්තූතියි!`;
    await autoPostToWhatsAppChannel(finishMsg, null, env);
    return;
  }

  const instanceId = (env.GREEN_API_INSTANCE || '710722698143').trim();
  const apiToken = (env.GREEN_API_TOKEN || 'b65f5e2285e54499a88b78d13354ba79f7fe2bd4c0d648049f').trim();
  const targetChat = (env.WA_TARGET_CHAT || '120363409065043686@g.us').trim();

  // Send Start Intro Banner Card
  const waIntro = 
    `═════════════════════════\n` +
    `🎓 *${paperData.title}*\n` +
    `═════════════════════════\n\n` +
    `🎯 *Native WhatsApp Poll Quiz* එක දැන් මෙම Group එක තුළින්ම ආරම්භ වේ!\n` +
    `📝 මුළු ප්‍රශ්න ගණන: MCQ ${totalQ}\n` +
    `⚡ සියලුම ප්‍රශ්න පෝලිමට පහතින් නිකුත් වන අතර, අවසානයේ සම්පූර්ණ පිළිතුරු පත්‍රය ලැබෙනු ඇත.\n\n` +
    `👇 *පළමු ප්‍රශ්නය පහත දැක්වේ:*`;
  const introImgUrl = getPaperImageUrl(paperKey);
  await autoPostToWhatsAppChannel(waIntro, introImgUrl, env);

  // Fast 10ms WhatsApp poll stream for all questions (Questions ONLY)
  for (let i = 0; i < totalQ; i++) {
    const q = questions[i];
    const qNum = i + 1;

    const opts = q.options || q.o || [];
    let rawQText = q.q || `ප්‍රශ්නය ${qNum}`;
    rawQText = cleanText(rawQText, 1000);
    rawQText = rawQText.replace(/^\d+[\.\)\-]?\s*/, '');

    const cleanQ = cleanText(`[${qNum}/${totalQ}] ${rawQText}`, 1024);
    const cleanOpts = opts.map((o, idx) => {
      let optText = cleanText(o, 90);
      optText = optText.replace(/^[\(\[\{]?\d+[\)\]\}]?\s*/, '');
      return { optionName: cleanText(`${idx + 1}. ${optText}`, 95) };
    });

    try {
      // Send Native WhatsApp Poll
      await fetch(`https://api.green-api.com/waInstance${instanceId}/sendPoll/${apiToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: targetChat,
          message: cleanQ,
          options: cleanOpts,
          multipleAnswers: false
        })
      });

      // Fast 10ms Cloudflare Worker delay
      if (i < totalQ - 1) {
        await new Promise(res => setTimeout(res, 10));
      }
    } catch (err) {
      console.error(`Error in Worker WA Fast Streamer Q${qNum}:`, err.message);
    }
  }

  // Brief 1-second pause before posting Final Answer Key Booklet
  await new Promise(res => setTimeout(res, 1000));

  // Build Comprehensive Answer Key Booklet Card
  let bookletLines = [];
  for (let k = 0; k < totalQ; k++) {
    const qObj = questions[k];
    const opts = qObj.options || qObj.o || [];
    const correctIdx = (qObj.correct !== undefined) ? qObj.correct : ((qObj.c !== undefined) ? qObj.c : 0);
    const rawAnsText = (opts && opts[correctIdx]) ? opts[correctIdx] : '';
    let ansText = cleanText(rawAnsText, 80);
    ansText = ansText.replace(/^[\(\[\{]?\d+[\)\]\}]?\s*/, '');
    
    const numStr = (k + 1).toString().padStart(2, '0');
    bookletLines.push(`${numStr}. (${correctIdx + 1}) ${ansText}`);
  }

  const bookletMsg = 
    `═════════════════════════\n` +
    `🏆 *${paperData.title}*\n` +
    `📋 *සම්පූර්ණ නිවැරදි පිළිතුරු පත්‍රය (Answer Key Booklet)* ⚡\n` +
    `═════════════════════════\n\n` +
    `📌 *නිවැරදි පිළිතුරු සටහන (MCQ 01 - ${totalQ}):*\n\n` +
    bookletLines.join('\n') + `\n\n` +
    `─────────────────────────\n` +
    `🎉 සහභාගී වූ සියලුම සිසුන්ට සුභ පැතුම්!`;

  await autoPostToWhatsAppChannel(bookletMsg, null, env);
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
      return parseJsArray(match[1]);
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
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(checkAndRunScheduledQuizzes(env, ctx));
    }
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
      try {
        const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
        const info = await infoRes.json();

        if (info?.result?.url === workerUrl) {
          return new Response(JSON.stringify({ ok: true, status: 'already_active_24_7', url: workerUrl, info: info.result }, null, 2), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(workerUrl)}`);
        const result = await setRes.json();
        return new Response(JSON.stringify(result, null, 2), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Endpoint 4: Register 24/7 Green API WhatsApp Webhook on Cloudflare Worker
    if (url.pathname === '/setup-wa-webhook') {
      const instanceId = env.GREEN_API_INSTANCE || '710722698143';
      const apiToken = env.GREEN_API_TOKEN || 'b65f5e2285e54499a88b78d13354ba79f7fe2bd4c0d648049f';
      const waWebhookUrl = `${url.origin}/wa-webhook`;
      try {
        const res = await fetch(`https://api.green-api.com/waInstance${instanceId}/setSettings/${apiToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookUrl: waWebhookUrl,
            outgoingWebhook: 'yes',
            stateWebhook: 'yes',
            incomingWebhook: 'yes',
            pollMessageWebhook: 'yes',
            delaySendMessagesMilliseconds: 20000
          })
        });
        const result = await res.json();
        return new Response(JSON.stringify({ ok: true, status: 'wa_webhook_set_24_7', url: waWebhookUrl, result }, null, 2), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Endpoint 5: Automated Native WhatsApp Group Poll Quiz Step Streamer Endpoint
    if (url.pathname === '/stream-wa-step') {
      const paperKey = url.searchParams.get('paperKey');
      const qIndex = parseInt(url.searchParams.get('qIndex') || '0', 10);
      const intervalSec = parseInt(url.searchParams.get('intervalSec') || '25', 10);
      const origin = url.origin;
      const nextUrl = `${origin}/stream-wa-step?paperKey=${encodeURIComponent(paperKey)}&qIndex=${qIndex + 1}&intervalSec=${intervalSec}`;

      if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil((async () => {
          await processSingleWhatsAppPollStep(paperKey, qIndex, intervalSec, env);
          try {
            await new Promise(r => setTimeout(r, 2000));
            await fetch(nextUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }
            });
          } catch (err) {
            console.error('Error fetching next step:', err);
          }
        })());
      } else {
        processSingleWhatsAppPollStep(paperKey, qIndex, intervalSec, env);
      }

      return new Response(JSON.stringify({ ok: true, paperKey, qIndex }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Endpoint 6: Automated Scheduled Quiz Execution Trigger Endpoint
    if (url.pathname === '/trigger-scheduled') {
      const paperKey = url.searchParams.get('paperKey');
      const delaySec = parseInt(url.searchParams.get('delaySec') || '0', 10);
      const chatId = url.searchParams.get('chatId');

      if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil((async () => {
          if (delaySec > 0) {
            await new Promise(r => setTimeout(r, Math.min(delaySec, 86400) * 1000));
          }
          
          const subId = paperKey.split('_')[0];
          const yearKey = paperKey.split('_')[1];
          const subData = QUIZ_DATA[subId];
          const paperData = subData?.papers[yearKey];

          if (paperData) {
            // 1. Send Automated Telegram Quiz Start Announcement
            if (chatId) {
              await sendApi('sendMessage', {
                chat_id: chatId,
                text: `🚀 **${paperData.title} සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය!**\n\nපළමු ප්‍රශ්නය පහත දැක්වේ 👇`,
                parse_mode: 'Markdown'
              }, env);
            }

            // 2. Start WhatsApp Fast Poll Stream + Answer Booklet
            await processSingleWhatsAppPollStep(paperKey, 0, 20, env);
          }
        })());
      } else {
        const subId = paperKey.split('_')[0];
        const yearKey = paperKey.split('_')[1];
        const subData = QUIZ_DATA[subId];
        const paperData = subData?.papers[yearKey];
        if (paperData && chatId) {
          await sendApi('sendMessage', {
            chat_id: chatId,
            text: `🚀 **${paperData.title} සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය!**\n\nපළමු ප්‍රශ්නය පහත දැක්වේ 👇`,
            parse_mode: 'Markdown'
          }, env);
        }
        processSingleWhatsAppPollStep(paperKey, 0, 20, env);
      }

      return new Response(JSON.stringify({ ok: true, scheduled: paperKey, delaySec }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (request.method === 'POST') {
      try {
        const update = await request.json();
        await handleUpdate(update, env, ctx);
      } catch (err) {
        console.error('Error handling webhook update:', err);
      }
      return new Response('OK', { status: 200 });
    }
    return new Response('🎓 A/L MCQ Quiz Telegram Bot (@AL_MCQbot) Cloudflare Worker is Live 24/7!', { status: 200 });
  },
  async scheduled(event, env, ctx) {
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(checkAndRunScheduledQuizzes(env, ctx));
    } else {
      await checkAndRunScheduledQuizzes(env, ctx);
    }
  }
};

async function sendApi(method, payload, env) {
  const BOT_TOKEN = (env && env.BOT_TOKEN) ? env.BOT_TOKEN : '8463293577:AAF2N2_PIP1WIoZE32Q_RMTQ8l1vr_6uXfc';
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

async function handleUpdate(update, env, ctx) {
  const GROUP_URL = (env && env.GROUP_URL) ? env.GROUP_URL : 'https://t.me/+wZUSJyEncD1mYjFl';
  const FB_PAGE_URL = (env && env.FB_PAGE_URL) ? env.FB_PAGE_URL : 'https://facebook.com/ALMSQHUB';
  const WA_CHANNEL_URL = (env && env.WA_CHANNEL_URL) ? env.WA_CHANNEL_URL : 'https://chat.whatsapp.com/GVqkNJtrwqLLSsiFOjF2b4';

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

    // Check if Admin is inputting custom manual scheduled time
    if (CUSTOM_TIME_STATE[chatId] && !text.startsWith('/')) {
      const state = CUSTOM_TIME_STATE[chatId];
      const parsedTime = parseCustomTimeInput(text);

      if (!parsedTime) {
        await sendApi('sendMessage', {
          chat_id: chatId,
          text: `❌ **වේලාව නිරවුල් නැත!**\n\nකරුණාකර පහත මාදිලියකින් එකක් ටයිප් කර යවන්න (Type valid time):\n• \`20:30\` (රාත්‍රී 8:30 ට)\n• \`19:45\` (සවස 7:45 ට)\n• \`30m\` (තවත් මිනිත්තු 30කින්)\n• \`2h\` (තවත් පැය 2කින්)`,
          parse_mode: 'Markdown'
        }, env);
        return;
      }

      delete CUSTOM_TIME_STATE[chatId];
      const { delayMs, label } = parsedTime;
      const paperKey = state.paperKey;
      const parts = paperKey.split('_');
      const subId = parts[0];
      const yearKey = parts[1];
      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        // 1. Instant WhatsApp Announcement Broadcast
        const targetGroupUrl = (env && env.GROUP_URL) ? env.GROUP_URL : 'https://t.me/+wZUSJyEncD1mYjFl';
        const waMsgText = 
          `═════════════════════════\n` +
          `🎓 *A/L MCQ HUB* — සජීවී ප්‍රශ්න පත්‍ර තරඟය Schedule කරන ලදී!\n` +
          `═════════════════════════\n\n` +
          `📚 *ප්‍රශ්න පත්‍රය:* ${paperData.title}\n` +
          `⏰ *ආරම්භ වන වේලාව:* ${label}\n\n` +
          `👇 *දැන්ම තරඟයට එකතු වන්න:*\n` +
          `${targetGroupUrl}`;

        const paperImgUrl = getPaperImageUrl(paperKey);
        await autoPostToWhatsAppChannel(waMsgText, paperImgUrl, env);

        // 2. Instant Telegram Announcement Message (No button, automated execution)
        const tgAnnounce = 
          `⏰ **සජීවී ප්‍රශ්න පත්‍ර තරඟය Schedule කරන ලදී! (Quiz Scheduled)**\n\n` +
          `📚 **ප්‍රශ්න පත්‍රය:** ${paperData.title}\n` +
          `⏰ **ආරම්භ වන වේලාව:** ${label}\n\n` +
          `🔔 නියමිත වේලාව පැමිණි සැනින් මෙම Group එක වෙත ප්‍රශ්න පත්‍රය ස්වයංක්‍රීයව ලැබෙනු ඇත!`;

        await sendApi('sendMessage', {
          chat_id: chatId,
          text: tgAnnounce,
          parse_mode: 'Markdown'
        }, env);

        // 3. Register persistent schedule trigger on Worker via dedicated endpoint
        const triggerUrl = `${url.origin}/trigger-scheduled?paperKey=${encodeURIComponent(paperKey)}&delaySec=${Math.round(delayMs / 1000)}&chatId=${encodeURIComponent(chatId)}`;
        const fetchOpts = {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        };
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(fetch(triggerUrl, fetchOpts).catch(e => console.error('Trigger error:', e)));
        } else {
          fetch(triggerUrl, fetchOpts).catch(e => console.error('Trigger error:', e));
        }

        await sendApi('sendMessage', {
          chat_id: chatId,
          text: `✅ **${paperData.title}** සාර්ථකව **${label}** සඳහා Schedule කරන ලදී! ⚡`,
          parse_mode: 'Markdown'
        }, env);
      }
      return;
    }

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
    } else if (text.startsWith('/admin')) {
      const fromId = msg.from ? String(msg.from.id) : '';
      const ADMIN_ID = (env && env.ADMIN_ID) ? String(env.ADMIN_ID) : '2035260032';

      if (fromId !== ADMIN_ID && fromId !== '2035260032' && fromId !== '5813878261') {
        await sendApi('sendMessage', {
          chat_id: chatId,
          text: '⛔ **ඔබට Admin මෙනුව භාවිත කිරීමට අවසර නොමැත.**',
          parse_mode: 'Markdown'
        }, env);
        return;
      }

      const adminMsg = 
        `🛡️ **A/L MCQ HUB — Admin Control Panel** ⚡\n\n` +
        `ගරු Admin තුමනි, ඔබ සාදරයෙන් පිළිගනිමු! පහත පහසුකම් භාවිත කිරීමට බොත්තමක් තෝරන්න:`;

      const adminKb = {
        inline_keyboard: [
          [{ text: '🚀 සජීවී Quiz එකක් දැන්ම Publish කරන්න', callback_data: 'adm_quiz_select' }],
          [{ text: '⏰ ඉදිරි වේලාවකට Quiz එකක් Schedule කරන්න', callback_data: 'adm_quiz_select_sch' }],
          [{ text: '📊 Registered Users & Groups Stats', callback_data: 'adm_stats' }],
          [{ text: '⬅️ ප්‍රධාන මෙනුවට (Back)', callback_data: 'nav_subjects' }]
        ]
      };

      await sendApi('sendMessage', {
        chat_id: chatId,
        text: adminMsg,
        parse_mode: 'Markdown',
        reply_markup: adminKb
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
    } else if (data === 'adm_stats') {
      await sendApi('answerCallbackQuery', { callback_query_id: query.id, text: '📊 Stats loaded!' }, env);
      await sendApi('sendMessage', {
        chat_id: chatId,
        text: '📊 **A/L MCQ HUB — Statistics** ⚡\n\n✅ Telegram Bot is Live 24/7 on Cloudflare Worker!',
        parse_mode: 'Markdown'
      }, env);
    } else if (data === 'adm_quiz_select' || data === 'adm_quiz_select_sch') {
      const isSch = data.includes('_sch');
      const prefix = isSch ? 'adm_sch_sub_' : 'adm_sel_sub_';
      const text = `🎯 **Admin Panel — ${isSch ? 'Schedule Quiz' : 'Publish Quiz Now'}**\n\nකරුණාකර ප්‍රශ්න පත්‍රය තෝරා ගැනීම සඳහා විෂය (Subject) තෝරන්න:`;
      const kb = {
        inline_keyboard: [
          [{ text: QUIZ_DATA.pl.name, callback_data: `${prefix}pl` }],
          [{ text: QUIZ_DATA.hist.name, callback_data: `${prefix}hist` }],
          [{ text: QUIZ_DATA.bc.name, callback_data: `${prefix}bc` }],
          [{ text: QUIZ_DATA.sin.name, callback_data: `${prefix}sin` }]
        ]
      };
      await sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: kb
      }, env);
    } else if (data.startsWith('adm_sel_sub_') || data.startsWith('adm_sch_sub_')) {
      const isSch = data.startsWith('adm_sch_sub_');
      const subId = data.replace('adm_sel_sub_', '').replace('adm_sch_sub_', '');
      const subData = QUIZ_DATA[subId];
      if (subData) {
        const keys = Object.keys(subData.papers);
        const keyboard = [];
        let row = [];
        keys.forEach((key, idx) => {
          const cb = isSch ? `adm_sch_p_${subId}_${key}` : `adm_pub_now_${subId}_${key}`;
          row.push({ text: `📝 ${key}`, callback_data: cb });
          if (row.length === 3 || idx === keys.length - 1) {
            keyboard.push(row);
            row = [];
          }
        });
        keyboard.push([{ text: '⬅️ ආපසු (Back)', callback_data: isSch ? 'adm_quiz_select_sch' : 'adm_quiz_select' }]);

        await sendApi('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text: `📑 **${subData.shortName} — ${isSch ? 'Schedule Quiz' : 'Publish Quiz Now'}**\n\nප්‍රශ්න පත්‍රය (Year) තෝරන්න:`,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        }, env);
      }
    } else if (data.startsWith('adm_pub_now_')) {
      const parts = data.split('_'); // ['adm', 'pub', 'now', 'pl', '2016']
      const subId = parts[3];
      const yearKey = parts[4];
      const paperKey = `${subId}_${yearKey}`;
      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        const announceMsg = 
          `🚀 **සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය! (Live Quiz Started)**\n\n` +
          `📚 **ප්‍රශ්න පත්‍රය:** ${paperData.title}\n\n` +
          `💡 **විශේෂතා:** Native Telegram Polls, Instant Confetti 🎉, Leaderboards & Top 3 Winner Podiums!\n\n` +
          `👇 පහත **Start Live Quiz** ක්ලික් කර දැන්ම තරඟයට එකතු වන්න:`;

        const announceKb = {
          inline_keyboard: [
            [{ text: '🎯 දැන්ම තරඟයට එකතු වන්න (Start Live Quiz)', callback_data: `native_${paperKey}` }]
          ]
        };

        await sendApi('sendMessage', {
          chat_id: chatId,
          text: announceMsg,
          parse_mode: 'Markdown',
          reply_markup: announceKb
        }, env);

        // Automated WhatsApp Group Broadcast Trigger from Worker
        const targetGroupUrl = (env && env.GROUP_URL) ? env.GROUP_URL : 'https://t.me/+wZUSJyEncD1mYjFl';
        const waMsgText = 
          `═════════════════════════\n` +
          `🎓 *A/L MCQ HUB* — සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය!\n` +
          `═════════════════════════\n\n` +
          `📚 *ප්‍රශ්න පත්‍රය:* ${paperData.title}\n\n` +
          `👇 *දැන්ම තරඟයට එකතු වන්න:*\n` +
          `${targetGroupUrl}`;

        const paperImgUrl = getPaperImageUrl(paperKey);
        await autoPostToWhatsAppChannel(waMsgText, paperImgUrl, env);

        // Start Automated WhatsApp Group Poll Quiz Streamer directly on Worker
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(processSingleWhatsAppPollStep(paperKey, 0, 20, env));
        } else {
          processSingleWhatsAppPollStep(paperKey, 0, 20, env);
        }

        await sendApi('answerCallbackQuery', { callback_query_id: query.id, text: '✅ Quiz Published & WhatsApp Group Polls Started!' }, env);
      }
    } else if (data.startsWith('adm_sch_p_')) {
      const parts = data.split('_'); // ['adm', 'sch', 'p', 'pl', '2016']
      const subId = parts[3];
      const yearKey = parts[4];
      const paperKey = `${subId}_${yearKey}`;
      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        const text = 
          `⏰ **Schedule Quiz — ${paperData.title}**\n\n` +
          `කරුණාකර ප්‍රශ්න පත්‍ර තරඟය ආරම්භ කිරීමට අවශ්‍ය වේලාව තෝරන්න:`;
        const kb = {
          inline_keyboard: [
            [{ text: '✏️ Custom Time (මැනුවලි වේලාව ලියන්න)', callback_data: `adm_custom_${paperKey}` }],
            [{ text: '🕒 ඊළඟ පැයේදී (In 1 Hour)', callback_data: `adm_set_1h_${paperKey}` }],
            [{ text: '🕗 අද රාත්‍රී 8:00 ට (Today 8:00 PM)', callback_data: `adm_set_2000_${paperKey}` }],
            [{ text: '🕘 අද රාත්‍රී 9:00 ට (Today 9:00 PM)', callback_data: `adm_set_2100_${paperKey}` }],
            [{ text: '📅 හෙට පෙ.ව. 9:00 ට (Tomorrow 9:00 AM)', callback_data: `adm_set_tom9_${paperKey}` }],
            [{ text: '⬅️ ආපසු (Back)', callback_data: `adm_sch_sub_${subId}` }]
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
    } else if (data.startsWith('adm_custom_')) {
      const paperKey = data.replace('adm_custom_', '');
      const parts = paperKey.split('_');
      const subId = parts[0];
      const yearKey = parts[1];
      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        CUSTOM_TIME_STATE[chatId] = { paperKey, time: Date.now() };

        const text = 
          `✏️ **Manual Time Entry — ${paperData.title}**\n\n` +
          `කරුණාකර ප්‍රශ්න පත්‍රය Schedule කිරීමට අවශ්‍ය වේලාව පහතින් ටයිප් කර යවන්න (Type valid time below):\n\n` +
          `💡 **උදාහරණ (Examples):**\n` +
          `• \`20:30\` (අද/හෙට රාත්‍රී 8:30 ට)\n` +
          `• \`19:45\` (අද/හෙට සවස 7:45 ට)\n` +
          `• \`09:15\` (උදෑසන 9:15 ට)\n` +
          `• \`30m\` (තවත් මිනිත්තු 30 කින්)\n` +
          `• \`2h\` (තවත් පැය 2 කින්)`;

        await sendApi('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown'
        }, env);
      }
    } else if (data.startsWith('adm_set_')) {
      const parts = data.split('_'); // ['adm', 'set', '1h', 'pl', '2016']
      const timeTag = parts[2];
      const subId = parts[3];
      const yearKey = parts[4];
      const paperKey = `${subId}_${yearKey}`;
      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        let delayMs = 0;
        let timeLabel = '';

        if (timeTag === '1h') {
          delayMs = 60 * 60 * 1000;
          timeLabel = 'පැයකින් (In 1 Hour)';
        } else if (timeTag === '2000') {
          const t8 = new Date();
          t8.setHours(20, 0, 0, 0);
          if (t8.getTime() <= Date.now()) t8.setDate(t8.getDate() + 1);
          delayMs = t8.getTime() - Date.now();
          timeLabel = 'අද/හෙට රාත්‍රී 8:00 ට (8:00 PM)';
        } else if (timeTag === '2100') {
          const t9 = new Date();
          t9.setHours(21, 0, 0, 0);
          if (t9.getTime() <= Date.now()) t9.setDate(t9.getDate() + 1);
          delayMs = t9.getTime() - Date.now();
          timeLabel = 'අද/හෙට රාත්‍රී 9:00 ට (9:00 PM)';
        } else if (timeTag === 'tom9') {
          const tm9 = new Date();
          tm9.setDate(tm9.getDate() + 1);
          tm9.setHours(9, 0, 0, 0);
          delayMs = tm9.getTime() - Date.now();
          timeLabel = 'හෙට පෙ.ව. 9:00 ට (Tomorrow 9:00 AM)';
        }

        // 1. Instant WhatsApp Announcement Broadcast
        const targetGroupUrl = (env && env.GROUP_URL) ? env.GROUP_URL : 'https://t.me/+wZUSJyEncD1mYjFl';
        const waMsgText = 
          `═════════════════════════\n` +
          `🎓 *A/L MCQ HUB* — සජීවී ප්‍රශ්න පත්‍ර තරඟය Schedule කරන ලදී!\n` +
          `═════════════════════════\n\n` +
          `📚 *ප්‍රශ්න පත්‍රය:* ${paperData.title}\n` +
          `⏰ *ආරම්භ වන වේලාව:* ${timeLabel}\n\n` +
          `👇 *දැන්ම තරඟයට එකතු වන්න:*\n` +
          `${targetGroupUrl}`;

        const paperImgUrl = getPaperImageUrl(paperKey);
        await autoPostToWhatsAppChannel(waMsgText, paperImgUrl, env);

        // 2. Instant Telegram Announcement Message (No button, automated execution)
        const tgAnnounce = 
          `⏰ **සජීවී ප්‍රශ්න පත්‍ර තරඟය Schedule කරන ලදී! (Quiz Scheduled)**\n\n` +
          `📚 **ප්‍රශ්න පත්‍රය:** ${paperData.title}\n` +
          `⏰ **ආරම්භ වන වේලාව:** ${timeLabel}\n\n` +
          `🔔 නියමිත වේලාව පැමිණි සැනින් මෙම Group එක වෙත ප්‍රශ්න පත්‍රය ස්වයංක්‍රීයව ලැබෙනු ඇත!`;

        await sendApi('sendMessage', {
          chat_id: chatId,
          text: tgAnnounce,
          parse_mode: 'Markdown'
        }, env);

        // 3. Register persistent schedule trigger on Worker via dedicated endpoint
        const triggerUrl = `${url.origin}/trigger-scheduled?paperKey=${encodeURIComponent(paperKey)}&delaySec=${Math.round(delayMs / 1000)}&chatId=${encodeURIComponent(chatId)}`;
        const fetchOpts = {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        };
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(fetch(triggerUrl, fetchOpts).catch(e => console.error('Trigger error:', e)));
        } else {
          fetch(triggerUrl, fetchOpts).catch(e => console.error('Trigger error:', e));
        }

        await sendApi('answerCallbackQuery', { callback_query_id: query.id, text: `✅ Quiz Scheduled for ${timeLabel}!` }, env);
      }
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
