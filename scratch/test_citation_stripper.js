const sampleInput = `📌 (අ) කඳු / නිම්න ග්ලැසියර් බාදන භූ රූප:

• **සර්ක / කොරි / ක්වේම් (Cirque / Corrie / Cwm)**: ග්ලැසියර් බාදනයට ලක් වූ කඳු බැවුම්වල දැකිය හැකි, හාන්සි පුටුවක හැඩය ගත් ආවට හෝ ද්‍රෝණි හැඩැති නිම්න වේ [07_Geography_Notes_Tute.pdf, p. 47].
• **අරේට / ඇති බෙදුම / අසිපත් වැටිය (Arête)**: සර්ක දෙකක් එකිනෙකට පිටුපසින් හෝ ආසන්නව පිහිටා තිබීමේදී, ඒවා ක්‍රමයෙන් විශාල වී මැදින් ඉතිරි වන තියුණු ධාරයක් සහිත කඳු වැටි ලක්ෂණයකි [07_Geography_Notes_Tute.pdf, p. 49]. (උදා: ඇල්ප්ස් කඳු බැවුම්) [07_Geography_Notes_Tute.pdf, p. 49].
• **පිරමිඩාකාර මුදුන් (Pyramidal Peaks / Horn)**: කඳු මුදුනක සෑම පැත්තකින්ම ග්ලැසියර ගලා යමින් කඳු බැවුම් බාදනය කරන විට, කන්ද වටා සර්ක සහ අරේට නිර්මාණය වේ. එහිදී කඳු මුදුනේ ඇති ප්‍රතිරෝධී පාෂාණ කොටසක් පමණක් ඉතිරි වී උල් පිරමිඩාකාර හැඩයක් ගනී [07_Geography_Notes_Tute.pdf, p. 49]. (උදා: ස්විට්සර්ලන්තයේ මැටර්හෝන් කන්ද) [07_Geography_Notes_Tute.pdf, p. 49].
• **U හැඩැති නිම්න (U-Shaped Valleys)**: කඳු බැවුමක පිහිටි පූර්ව 'V' හැඩැති ගංගා නිම්නයක් ඔස්සේ ග්ලැසියර ගමන් කිරීමේදී, එහි පතුල මෙන්ම දෙපස ඉවුරු ද දැඩි බාදනයට ලක් වේ. එහි ප්‍රතිඵලයක් ලෙස නිම්නය පළලින් හා ගැඹුරින් වැඩි වී U හැඩයක් ගනී [07_Geography_Notes_Tute.pdf, p. 50, 51].
• **ලම්භ නිම්න / එල්ලෙන නිම්න (Hanging Valleys)**: ප්‍රධාන ග්ලැසියර නිම්නයට වඩා ශාඛා ග්ලැසියර නිම්නවල බාදනය සහ ගැඹුර අඩුය [07_Geography_Notes_Tute.pdf, p. 50, 51]. (උදා: කැලිෆෝනියාවේ යොසෙමිටි නිම්නය) [07_Geography_Notes_Tute.pdf, p. 51].`;

function formatAITextForTelegram(text) {
  if (!text) return '';

  let formatted = text;

  // 1. Strip ALL NotebookLM citation references, file paths (.pdf, .txt, .docx), page numbers, and source tags
  formatted = formatted.replace(/\[[^\]]*?\.(?:pdf|txt|docx|doc|html|md|epub)[^\]]*?\]/gi, '');
  formatted = formatted.replace(/\([^\)]*?\.(?:pdf|txt|docx|doc|html|md|epub)[^\)]*?\)/gi, '');
  formatted = formatted.replace(/\[\d+(?:\s*,\s*\d+|-?\d+)*\]/g, '');
  formatted = formatted.replace(/\[\s*(?:p\.|pp\.|page|pages)\s*\d+[^\]]*\]/gi, '');
  formatted = formatted.replace(/\(\s*(?:p\.|pp\.|page|pages)\s*\d+[^\)]*\)/gi, '');
  formatted = formatted.replace(/\[\s*(?:source|සූත්‍ර|මුලාශ්‍රය|මූලාශ්‍රය|මූලාශ්‍ර|ගොනුව|පිටුව)\s*:[^\]]*\]/gi, '');
  formatted = formatted.replace(/\(\s*(?:source|සූත්‍ර|මුලාශ්‍රය|මූලාශ්‍රය|මූලාශ්‍ර|ගොනුව|පිටුව)\s*:[^\)]*\)/gi, '');
  formatted = formatted.replace(/(?:,\s*|\.\s*|\s+)p\.\s*\d+(?:\s*,\s*\d+|-?\d+)*/gi, '');

  // 2. Clean raw LaTeX math arrow slashes
  formatted = formatted.replace(/\\\\?\(\s*\\?rightarrow\s*\\\\?\)/g, ' → ');
  formatted = formatted.replace(/\\\\?\(\s*\\?implies\s*\\\\?\)/g, ' ⇒ ');
  formatted = formatted.replace(/\\?rightarrow/g, ' → ');
  formatted = formatted.replace(/\\?implies/g, ' ⇒ ');
  formatted = formatted.replace(/\\\\?\([^\)]*\\\\?\)/g, '');
  formatted = formatted.replace(/\\\\/g, '');

  // 3. Clean up punctuation spaces left behind after citation stripping
  formatted = formatted.replace(/[ \t]{2,}/g, ' ');
  formatted = formatted.replace(/ \./g, '.');
  formatted = formatted.replace(/ ,/g, ',');
  formatted = formatted.replace(/\(\s*\)/g, '');
  formatted = formatted.replace(/\[\s*\]/g, '');

  // 4. Escape HTML special characters (&, <, >)
  formatted = formatted.replace(/&/g, '&amp;');
  formatted = formatted.replace(/</g, '&lt;');
  formatted = formatted.replace(/>/g, '&gt;');

  // 5. Convert headers (### Header, ## Header, # Header) to styled HTML titles
  formatted = formatted.replace(/^[ \t]*#{1,4}\s*\*{0,2}(.*?)\*{0,2}\s*$/gm, (match, title) => {
    const cleanTitle = title.replace(/^[*_]+|[*_]+$/g, '').trim();
    if (!cleanTitle) return '';
    return `\n📌 <b>${cleanTitle}</b>\n─────────────────────`;
  });

  // 6. Convert double asterisks **bold** or double underscores __bold__ to <b>bold</b>
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  formatted = formatted.replace(/__(.*?)__/g, '<b>$1</b>');

  // 7. Clean up lines with raw nested asterisks into indented sub-bullets
  formatted = formatted.replace(/^[ \t]*[*•-]\s+[*•-]\s+/gm, '   ▸ ');
  formatted = formatted.replace(/^[ \t]{2,}[*•-]\s+/gm, '   ▸ ');

  // 8. Convert standard top-level list items ("* ", "- ") into clean bullet items
  formatted = formatted.replace(/^[ \t]*[*•-]\s+/gm, '🔹 ');

  // 9. Format inline examples like (උදා: ඇල්ප්ස් කඳු බැවුම්) nicely
  formatted = formatted.replace(/\(උදා:\s*([^\)]+)\)/gi, '\n   👉 <b>උදා:</b> <i>$1</i>');

  // 10. Format sub-headings like "🔹 <b>නිදසුන්:</b>" into indented callouts
  formatted = formatted.replace(/🔹\s*<b>(නිදසුන්|උදාහරණ|සටහන|විශේෂ):<\/b>/gi, '   👉 <b>$1:</b>');

  // 11. Convert remaining single asterisk *italic* to <i>italic</i>
  formatted = formatted.replace(/(?<!\w)\*([^\*\n]+)\*(?!\w)/g, '<i>$1</i>');

  // 12. Clean up raw horizontal rules
  formatted = formatted.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '━━━━━━━━━━━━━━━━━━━━━');

  // 13. Ensure empty line separation between top-level bullet concepts for clear visual spacing
  formatted = formatted.replace(/\n(?=🔹)/g, '\n\n');

  // 14. Remove excessive blank lines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted.trim();
}

console.log(formatAITextForTelegram(sampleInput));
