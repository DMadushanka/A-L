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

// 1b. Register or Update Group
export function registerGroup(chat) {
  const db = readDb();
  const chatId = chat.id || chat.chatId;
  if (!chatId || !chatId.toString().startsWith('-')) return;

  const title = chat.title || 'Telegram Group';

  db.groups[chatId] = {
    chatId,
    title,
    addedAt: db.groups[chatId]?.addedAt || new Date().toISOString()
  };

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

// 3. Get Ranked Leaderboard for a Paper (Top 20)
export function getLeaderboard(paperKey, limit = 20) {
  const db = readDb();
  const list = db.scores[paperKey] || [];

  // Sort descending by score, ascending by timeSec
  const sorted = [...list].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score; // Highest marks first
    }
    return a.timeSec - b.timeSec; // Faster completion time first
  });

  return sorted.slice(0, limit);
}

// 4. Get Overall Leaderboard across all papers
export function getOverallLeaderboard(limit = 20) {
  const db = readDb();
  const userTotals = {}; // userId -> { userId, name, username, totalScore, totalTimeSec, papersDone }

  Object.values(db.scores).forEach(paperScores => {
    paperScores.forEach(entry => {
      if (!userTotals[entry.userId]) {
        userTotals[entry.userId] = {
          userId: entry.userId,
          name: entry.name,
          username: entry.username,
          totalScore: 0,
          totalTimeSec: 0,
          papersDone: 0
        };
      }
      userTotals[entry.userId].totalScore += entry.score;
      userTotals[entry.userId].totalTimeSec += entry.timeSec;
      userTotals[entry.userId].papersDone += 1;
    });
  });

  const sorted = Object.values(userTotals).sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return a.totalTimeSec - b.totalTimeSec;
  });

  return sorted.slice(0, limit);
}

// 5. Add Scheduled Broadcast Job
export function addScheduledJob(job) {
  const db = readDb();
  db.schedules.push({
    id: Date.now().toString(),
    time: job.time, // ISO string or timestamp
    message: job.message,
    paperKey: job.paperKey || null,
    sent: false
  });
  writeDb(db);
}

// 6. Get Pending Scheduled Jobs
export function getPendingScheduledJobs() {
  const db = readDb();
  const now = new Date().getTime();

  return db.schedules.filter(j => !j.sent && new Date(j.time).getTime() <= now);
}

// 7. Mark Scheduled Job as Sent
export function markJobSent(jobId) {
  const db = readDb();
  const job = db.schedules.find(j => j.id === jobId);
  if (job) {
    job.sent = true;
    writeDb(db);
  }
}
