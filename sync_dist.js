import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 0. Automatically build bundled CommonJS bot.cjs using Rollup
console.log('📦 Bundling bot.js -> bot.cjs via Rollup...');
try {
  execSync('npx rollup -c rollup.config.mjs', { stdio: 'inherit' });
  console.log('✅ Rollup bundle complete!');
} catch (err) {
  console.error('⚠️ Rollup bundle notice:', err.message);
}

// 1. Specific critical script and config files
const coreFiles = [
  'bot.js',
  'bot.cjs',
  'normal_quiz_manager.js',
  'map_quiz_manager.js',
  'marking_manager.js',
  'markings_archive_db.json',
  'past_papers_manager.js',
  'past_papers_archive_db.json',
  'model_papers_manager.js',
  'model_papers_archive_db.json',
  'map_app.html',
  'db.js',
  'mermaid_utils.js',
  'generate_pdf_note.py',
  'generate_sinhala_voice_note.py',
  'notebooklm_bridge.py',
  'render_morning_animation.py',
  'generate_morning_svg.js',
  'generate_table_sticker.py',
  'generate_subject_stickers.py',
  'schedule-utils.js',
  'morning_wallpapers.json',
  'morning_phrases.json',
  'morning_photos_unsplash.json',
  'pdf_notes_registry.json',
  'data_store.json',
  'saved_paper_quizzes.json',
  'storage_state.json',
  'timetable_sticker.webp',
  'timetable_card.png',
  'sticker_timetable_si.webp',
  'sticker_timetable_si.png',
  'sticker_timetable_bc.webp',
  'sticker_timetable_bc.png',
  'sticker_timetable_agri.webp',
  'sticker_timetable_agri.png',
  'sticker_timetable_hist.webp',
  'sticker_timetable_hist.png',
  'sticker_timetable_pl.webp',
  'sticker_timetable_pl.png',
  'sticker_timetable_bs.webp',
  'sticker_timetable_bs.png',
  'sticker_timetable_geo.webp',
  'sticker_timetable_geo.png',
  'sticker_timetable_md.webp',
  'sticker_timetable_md.png',
  'sticker_timetable_dr.webp',
  'sticker_timetable_dr.png',
  'sticker_timetable_mu.webp',
  'sticker_timetable_mu.png',
  'sticker_timetable_dn.webp',
  'sticker_timetable_dn.png',
  'setup_requirements.bat',
  'login_notebooklm.bat',
  'install_background_bot.bat',
  'package.json',
  'package-lock.json',
  '.env',
  'logo.png',
  'our_logo.png'
];

let syncCount = 0;

for (const f of coreFiles) {
  const src = path.join(rootDir, f);
  const dest = path.join(distDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[SYNC] ${f} -> dist/${f}`);
    syncCount++;
  }
}

// 2. All HTML, PNG, WEBP, and MD past-paper and visual asset files
const allFiles = fs.readdirSync(rootDir);
for (const file of allFiles) {
  const ext = path.extname(file).toLowerCase();
  if (['.html', '.png', '.webp', '.md'].includes(ext)) {
    // Avoid copying large temporary test outputs or scratch files if in root
    if (file.startsWith('test_') && file.endsWith('.pdf')) continue;
    const src = path.join(rootDir, file);
    const dest = path.join(distDir, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
      console.log(`[ASSET] ${file} -> dist/${file}`);
      syncCount++;
    }
  }
}

// 3. Ensure subdirectories exist and copy normal_quiz files
const subdirs = ['pdf_downloads', 'audio_downloads', 'audio_notes', 'diagram_cache', 'normal_quiz'];
for (const dir of subdirs) {
  const targetDir = path.join(distDir, dir);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`[DIR] Created dist/${dir}`);
  }
}

const normalQuizDir = path.join(rootDir, 'normal_quiz');
if (fs.existsSync(normalQuizDir)) {
  const nqFiles = fs.readdirSync(normalQuizDir);
  for (const f of nqFiles) {
    const src = path.join(normalQuizDir, f);
    const dest = path.join(distDir, 'normal_quiz', f);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
      console.log(`[NORMAL_QUIZ] normal_quiz/${f} -> dist/normal_quiz/${f}`);
      syncCount++;
    }
  }
}

console.log(`\nSuccessfully synced ${syncCount} files to dist/!`);
