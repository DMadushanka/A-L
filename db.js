import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve(process.cwd(), 'data_store.json');

// Initial schema structure
const initialData = {
  users: {},      // chatId -> { chatId, name, username, joinedAt }
  groups: {},     // chatId -> { chatId, title, addedAt }
  scores: {},     // paperKey -> Array of { userId, name, username, score, total, timeSec, timestamp }
  schedules: []   // Array of { id, time, message, paperKey, sent }
};

// Helper: Ensure DB file exists
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

// Helper: Read DB
export function readDb() {
  initDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.groups) parsed.groups = {};
    return parsed;
  } catch (err) {
    console.error('Error reading data_store.json:', err.message);
    return initialData;
  }
}

// Helper: Write DB
export function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing data_store.json:', err.message);
  }
}

// 1. Register or Update User
export function registerUser(user) {
  const db = readDb();
  const chatId = user.id || user.chatId;
  if (!chatId || chatId.toString().startsWith('-')) return; // Ignore groups in user registration

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'ශිෂ්‍යයා';
  const username = user.username ? `@${user.username}` : '';

  db.users[chatId] = {
    chatId,
    name,
    username,
    joinedAt: db.users[chatId]?.joinedAt || new Date().toISOString()
  };

  writeDb(db);
}

// 1b. Register or Update Group (with Message Thread / Topic Tracking)
export function registerGroup(chat, threadId = null) {
  const db = readDb();
  const chatId = chat.id || chat.chatId;
  if (!chatId || !chatId.toString().startsWith('-')) return;

  const title = chat.title || 'Telegram Group';
  const existing = db.groups[chatId] || {
    chatId,
    title,
    threads: [],
    addedAt: new Date().toISOString()
  };

  existing.title = title;
  if (!Array.isArray(existing.threads)) existing.threads = [];
  if (threadId && !existing.threads.includes(threadId)) {
    existing.threads.push(threadId);
  }

  db.groups[chatId] = existing;
  writeDb(db);
}

// 1c. Unregister Group (if bot was kicked or removed)
export function unregisterGroup(chatId) {
  const db = readDb();
  if (db.groups[chatId]) {
    delete db.groups[chatId];
    writeDb(db);
  }
}

// 1d. Topic Subject Tracking by Forum Thread ID
export function setTopicSubjectForThread(chatId, threadId, subjectCode, topicName = '') {
  if (!chatId || !threadId || !subjectCode) return;
  const db = readDb();
  if (!db.topicSubjects) db.topicSubjects = {};
  const key = `${chatId}_${threadId}`;
  db.topicSubjects[key] = {
    chatId,
    threadId,
    subjectCode,
    topicName,
    updatedAt: new Date().toISOString()
  };
  writeDb(db);
}

export function getTopicSubjectForThread(chatId, threadId) {
  if (!chatId || !threadId) return null;
  const db = readDb();
  if (!db.topicSubjects) return null;
  const key = `${chatId}_${threadId}`;
  return db.topicSubjects[key]?.subjectCode || null;
}

// 2. Record Quiz Score
export function recordScore(paperKey, scoreData) {
  const db = readDb();
  if (!db.scores[paperKey]) {
    db.scores[paperKey] = [];
  }

  // Remove existing score entry for this user if new score is higher or faster
  const existingIdx = db.scores[paperKey].findIndex(s => s.userId === scoreData.userId);

  if (existingIdx !== -1) {
    const prev = db.scores[paperKey][existingIdx];
    // Update if higher score OR same score with faster time
    if (scoreData.score > prev.score || (scoreData.score === prev.score && scoreData.timeSec < prev.timeSec)) {
      db.scores[paperKey][existingIdx] = scoreData;
    }
  } else {
    db.scores[paperKey].push(scoreData);
  }

  writeDb(db);
}

// 3. Leaderboard
export function getLeaderboard(paperKey, limit = 10) {
  const db = readDb();
  const scores = db.scores[paperKey] || [];
  return [...scores]
    .sort((a, b) => b.score - a.score || a.timeSec - b.timeSec)
    .slice(0, limit);
}

// 4. Overall User Stats
export function getUserStats(userId) {
  const db = readDb();
  let totalQuizzes = 0;
  let totalScore = 0;
  let totalTimeSec = 0;

  for (const paperKey of Object.keys(db.scores)) {
    const userScore = db.scores[paperKey].find(s => s.userId === userId);
    if (userScore) {
      totalQuizzes++;
      totalScore += userScore.score;
      totalTimeSec += userScore.timeSec;
    }
  }

  return {
    totalQuizzes,
    totalScore,
    averageScore: totalQuizzes > 0 ? (totalScore / totalQuizzes).toFixed(1) : 0,
    totalTimeSec
  };
}

// 5. Global Leaderboard (Top performers across all quizzes)
export function getGlobalLeaderboard(limit = 10) {
  const db = readDb();
  const userMap = {};

  for (const paperKey of Object.keys(db.scores)) {
    for (const score of db.scores[paperKey]) {
      if (!userMap[score.userId]) {
        userMap[score.userId] = {
          userId: score.userId,
          name: score.name,
          username: score.username,
          totalScore: 0,
          totalQuizzes: 0,
          totalTimeSec: 0
        };
      }
      userMap[score.userId].totalScore += score.score;
      userMap[score.userId].totalQuizzes++;
      userMap[score.userId].totalTimeSec += score.timeSec;
    }
  }

  return Object.values(userMap)
    .sort((a, b) => b.totalScore - a.totalScore || a.totalTimeSec - b.totalTimeSec)
    .slice(0, limit);
}

export const getOverallLeaderboard = getGlobalLeaderboard;

// 6. User Streak Tracking
export function recordUserActivity(userId) {
  const db = readDb();
  const today = new Date().toISOString().split('T')[0];

  if (!db.streaks[userId]) {
    db.streaks[userId] = {
      currentStreak: 1,
      bestStreak: 1,
      lastActiveDate: today
    };
    writeDb(db);
    return db.streaks[userId];
  }

  const streak = db.streaks[userId];
  if (streak.lastActiveDate === today) {
    return streak;
  }

  const lastDate = new Date(streak.lastActiveDate);
  const curDate = new Date(today);
  const diffDays = Math.round((curDate - lastDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    streak.currentStreak += 1;
    if (streak.currentStreak > streak.bestStreak) {
      streak.bestStreak = streak.currentStreak;
    }
  } else if (diffDays > 1) {
    streak.currentStreak = 1;
  }

  streak.lastActiveDate = today;
  writeDb(db);
  return streak;
}

export function getUserStreak(userId) {
  const db = readDb();
  return db.streaks[userId] || { currentStreak: 0, bestStreak: 0, lastActiveDate: null };
}

// 7. Scheduled Jobs Tracking
export function addScheduledJob(job) {
  const db = readDb();
  const newJob = {
    id: Date.now().toString(),
    sent: false,
    ...job
  };
  db.schedules.push(newJob);
  writeDb(db);
  return newJob;
}

export function getPendingScheduledJobs() {
  const db = readDb();
  const now = new Date();
  return db.schedules.filter(j => !j.sent && new Date(j.time) <= now);
}

export function markJobSent(jobId) {
  const db = readDb();
  const job = db.schedules.find(j => j.id === jobId);
  if (job) {
    job.sent = true;
    writeDb(db);
  }
}

// 8. Morning Wishes Settings & Phrase Tracking
export function getMorningSettings() {
  const db = readDb();
  if (!db.morningSettings) {
    db.morningSettings = {
      scheduledTime: '05:00', // Default 5:00 AM (Asia/Colombo)
      enabled: true,
      lastSentDate: null,
      lastPhraseIndex: -1
    };
    writeDb(db);
  }
  return db.morningSettings;
}

export function updateMorningSettings(settings) {
  const db = readDb();
  db.morningSettings = {
    ...getMorningSettings(),
    ...settings
  };
  writeDb(db);
  return db.morningSettings;
}

export function getNextMorningPhrase() {
  const phrasesPath = path.resolve(process.cwd(), 'morning_phrases.json');
  let phrases = [];
  if (fs.existsSync(phrasesPath)) {
    try {
      phrases = JSON.parse(fs.readFileSync(phrasesPath, 'utf8'));
    } catch (e) {
      console.error('Error reading morning_phrases.json:', e.message);
    }
  }

  if (phrases.length === 0) {
    return {
      id: 1,
      greeting: 'සුබ උදෑසනක්!',
      message: 'අද දවස ඔබගේ සියලුම අධ්‍යාපනික අරමුණු සැබෑ වන ජයග්‍රාහී දිනයක් වේවා!',
      fullText: 'සුබ උදෑසනක්! අද දවස ඔබගේ සියලුම අධ්‍යාපනික අරමුණු සැබෑ වන ජයග්‍රාහී දිනයක් වේවා!',
      category: 'Motivation'
    };
  }

  const settings = getMorningSettings();
  const nextIndex = (typeof settings.lastPhraseIndex === 'number' ? settings.lastPhraseIndex + 1 : 0) % phrases.length;
  updateMorningSettings({ lastPhraseIndex: nextIndex });

  return phrases[nextIndex];
}

export function getCuratedMorningWallpaper(phraseId) {
  const possiblePaths = [
    path.resolve(process.cwd(), 'morning_wallpapers.json'),
    path.resolve(process.cwd(), 'morning_wallpapwer.json')
  ];
  for (const wpPath of possiblePaths) {
    if (fs.existsSync(wpPath)) {
      try {
        const wallpapers = JSON.parse(fs.readFileSync(wpPath, 'utf8'));
        if (Array.isArray(wallpapers) && wallpapers.length > 0) {
          const idx = ((phraseId || 1) - 1) % wallpapers.length;
          return wallpapers[idx >= 0 ? idx : 0];
        }
      } catch (e) {
        console.error(`Error reading ${path.basename(wpPath)}:`, e.message);
      }
    }
  }
  return null;
}

// 9. Automated Multi-Subject 2x Daily Mega Quiz Scheduler Settings
export const DEFAULT_QUIZ_SCHEDULE = {
  enabled: true,
  roundsCount: 3,
  questionsPerRound: 30,
  subjects: {
    si: {
      subCode: 'si',
      name: 'සිංහල භාෂාව හා සාහිත්‍යය',
      morningTime: '05:15',
      eveningTime: '18:15',
      topic: 'සිංහල ව්‍යාකරණ හා සාහිත්‍යය'
    },
    bc: {
      subCode: 'bc',
      name: 'බෞද්ධ ශිෂ්ටාචාරය',
      morningTime: '05:35',
      eveningTime: '18:45',
      topic: 'බෞද්ධ ශිෂ්ටාචාරය නිර්දේශය'
    },
    agri: {
      subCode: 'agri',
      name: 'කෘෂි විද්‍යාව',
      morningTime: '05:55',
      eveningTime: '19:15',
      topic: 'කෘෂි විද්‍යාව නිර්දේශය'
    },
    hist: {
      subCode: 'hist',
      name: 'ඉතිහාසය',
      morningTime: '06:15',
      eveningTime: '19:45',
      topic: 'ලංකා හා ලෝක ඉතිහාසය'
    },
    pl: {
      subCode: 'pl',
      name: 'දේශපාලන විද්‍යාව',
      morningTime: '06:30',
      eveningTime: '20:15',
      topic: 'දේශපාලන විද්‍යාව මූලධර්ම හා ආණ්ඩුක්‍රම'
    },
    bs: {
      subCode: 'bs',
      name: 'ව්‍යාපාර අධ්‍යයනය',
      morningTime: '06:45',
      eveningTime: '20:45',
      topic: 'ව්‍යාපාර කළමනාකරණය හා පරිසරය'
    },
    geo: {
      subCode: 'geo',
      name: 'භූගෝල විද්‍යාව',
      morningTime: '07:00',
      eveningTime: '21:15',
      topic: 'භෞතික හා මානව භූගෝල විද්‍යාව'
    },
    md: {
      subCode: 'md',
      name: 'සන්නිවේදනය හා මාධ්‍ය අධ්‍යයනය',
      morningTime: '07:15',
      eveningTime: '21:30',
      topic: 'සන්නිවේදනය හා මාධ්‍ය අධ්‍යයනය නිර්දේශය'
    },
    drama: {
      subCode: 'drama',
      name: 'නාට්‍ය හා රංග කලාව',
      morningTime: '07:30',
      eveningTime: '21:45',
      topic: 'නාට්‍ය හා රංග කලාව නිර්දේශය'
    },
    music: {
      subCode: 'music',
      name: 'සංගීතය',
      morningTime: '07:45',
      eveningTime: '22:00',
      topic: 'සංගීතය නිර්දේශය'
    },
    dancing: {
      subCode: 'dancing',
      name: 'නර්තනය',
      morningTime: '08:00',
      eveningTime: '22:15',
      topic: 'නර්තනය නිර්දේශය'
    }
  }
};

export function getQuizScheduleSettings() {
  const db = readDb();
  if (!db.quizScheduleSettings) {
    db.quizScheduleSettings = {
      ...DEFAULT_QUIZ_SCHEDULE,
      lastTriggered: {}
    };
    writeDb(db);
  }
  if (!db.quizScheduleSettings.subjects) {
    db.quizScheduleSettings.subjects = { ...DEFAULT_QUIZ_SCHEDULE.subjects };
    writeDb(db);
  } else {
    let changed = false;
    for (const [key, subVal] of Object.entries(DEFAULT_QUIZ_SCHEDULE.subjects)) {
      if (!db.quizScheduleSettings.subjects[key]) {
        db.quizScheduleSettings.subjects[key] = subVal;
        changed = true;
      }
    }
    if (changed) writeDb(db);
  }
  if (!db.quizScheduleSettings.lastTriggered) {
    db.quizScheduleSettings.lastTriggered = {};
  }
  return db.quizScheduleSettings;
}

export function updateQuizScheduleSettings(settings) {
  const db = readDb();
  db.quizScheduleSettings = {
    ...getQuizScheduleSettings(),
    ...settings
  };
  writeDb(db);
  return db.quizScheduleSettings;
}

export function isQuizScheduleTriggered(dateStr, subCode, slot) {
  const settings = getQuizScheduleSettings();
  const key = `${dateStr}_${subCode}_${slot}`;
  return !!settings.lastTriggered?.[key];
}

export function recordQuizScheduleTrigger(dateStr, subCode, slot) {
  const db = readDb();
  if (!db.quizScheduleSettings) db.quizScheduleSettings = getQuizScheduleSettings();
  if (!db.quizScheduleSettings.lastTriggered) db.quizScheduleSettings.lastTriggered = {};
  const key = `${dateStr}_${subCode}_${slot}`;
  db.quizScheduleSettings.lastTriggered[key] = new Date().toISOString();
  writeDb(db);
}
