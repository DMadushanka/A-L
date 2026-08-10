function removeEndingFollowupCaptions(text) {
  if (!text) return '';
  let t = text.trim();

  // Pattern 1: Strip trailing lines starting with conversational emojis/words and ending in question marks/phrases
  t = t.replace(/[\r\n\s]*(?:[🔍💬💭🗨️🗯️❓💡🤔👉📌]|\bමෙම\b|\bතවත්\b|\bඔබට\b|\bඔබ\b|\bඊළඟ\b|\bවැඩිදුර\b).*?(?:සාකච්ඡා|විමසා|කතා|අධ්‍යයනය|පැහැදිලි|දැන|ලබා|බලමු|කරමු|කැමති).*?(?:බලමු\s*ද|කරමු\s*ද|කැමති\s*ද|ද)\??\s*$/gsi, '');

  // Pattern 2: Strip any trailing single-line prompt containing question marks or "බලමු ද?"
  t = t.replace(/[\r\n\s]*[^\n]+?(?:සාකච්ඡා|විමසා|කතා|අධ්‍යයනය|පැහැදිලි).*?(?:බලමු\s*ද|කරමු\s*ද|කැමති\s*ද)\??\s*$/gsi, '');

  // Pattern 3: Strip any leftover trailing horizontal lines (──────)
  t = t.replace(/[\r\n\s]*[━─_-]{3,}[\r\n\s]*$/gsi, '');

  return t.trim();
}

const sample1 = `සිළිඳුගේ චරිතය පිළිබඳව පූර්ණ විවේචනාත්මක අධ්‍යයනයක් මෙසේ සිදු කළ හැක.

─────────────────────
🔍 "බැද්දේගම" නවකතාවේ එන බාබෙഹാමි ආරච්චිගේ හෝ බබුන් අප්පුගේ චරිත නිරූපණයන් ද මේ අයුරින්ම සාකච්ඡා කර බලමු ද?`;

const sample2 = `මෙම සන්ධි ක්‍රම ඇසුරෙන් විභාගයේදී අසනු ලබන වියරණ ගැටලු හෝ සන්ධි පද වෙන් කිරීමේ ගැටලු කිහිපයක් සාකච්ඡා කිරීමට ඔබ කැමති ද?`;

console.log('--- TEST 1 ---');
console.log(removeEndingFollowupCaptions(sample1));
console.log('--- TEST 2 ---');
console.log(removeEndingFollowupCaptions(sample2));
