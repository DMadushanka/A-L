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
      '2021': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2021 (BC-11)', file: 'BC11.html', img: 'BC11.png' },
      '2024_wp': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2024 (බස්නාහිර පළාත්) — MCQ 50', file: 'bc2024_wp.html', img: 'bc2024_wp.png', btnLabel: '2024 (බස්නාහිර)', isModel: true },
      '2026_central': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2026 (මධ්‍යම පළාත්) — MCQ 50', file: 'bc2026_central.html', img: '2026model_CentralP.png', btnLabel: '2026 (මධ්‍යම Model)', isModel: true },
      '2024_uva': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2024 (ඌව පළාත්) — MCQ 50', file: 'bc2024_uva.html', img: 'bc2024_uva.png', btnLabel: '2024 (ඌව පළාත්)', isModel: true },
      '2019_prototype': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2019 (ආදර්ශ / Prototype) — MCQ 50', file: 'bc2019_prototype.html', img: 'BCmo2019.png', btnLabel: '2019 (Prototype)', isModel: true },
      '2026_moe': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2026 (අධ්‍යාපන අමාත්‍යාංශය) — MCQ 50', file: 'bc2026_moe.html', img: 'bc2026_moe.png', btnLabel: '2026 (MOE Model)', isModel: true },
      '2026_model_p2': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2026 (ආදර්ශ II පත්‍රය — Structured & Essay)', file: 'bc2026_model_part2.html', img: 'bc2026_part2.png', btnLabel: '2026 Model Part 2', isModel: true, isPart2: true },
      '2026_master': { title: 'බෞද්ධ ශිෂ්ටාචාරය 2026 (මාස්ටර් ප්‍රශ්න බැංකුව — MCQ 229)', file: 'bc2026_master.html', img: 'bc2026_master.png', btnLabel: '2026 (Master Bank)', isModel: true }
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
  },
  bs: {
    name: '💼 ව්‍යාපාර අධ්‍යයනය (Business Studies)',
    shortName: 'ව්‍යාපාර අධ්‍යයනය',
    papers: {
      '2015': { title: 'ව්‍යාපාර අධ්‍යයනය 2015 — MCQ 30', file: 'bs2015.html', img: 'bs5.png' }
    }
  }
};

// Database of Part II Questions & Detailed Marking Scheme Model Answers for Native Telegram Chat Reading
const PART2_QUESTIONS_DATA = {
  '2026_model_p2': {
    1: {
      title: 'ප්‍රශ්නය 01 (ව්‍යුහගත රචනා)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `📌 **ප්‍රශ්නය 01 / 08 (I කොටස — ව්‍යුහගත රචනා)**\n` +
        `*(ප්‍රශ්න 3න් 2කට පිළිතුරු සපයන්න. ලකුණු 20x2=40)*\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** වෛදික යුගයේ යාග පැවැත්වූ ප්‍රධාන පූජකවරුන් 04 දෙනා නම් කරන්න. (ලකුණු 04)\n` +
        `**(ii)** චතුර් වර්ණ ධර්මවලින් 'වෛශ්‍ය' වර්ණයට හිමි වූ 'ස්වධර්ම' 02ක් සඳහන් කරන්න. (ලකුණු 04)\n` +
        `**(iii)** අජිත කේසකම්බලී ශ්‍රමණයාගේ ප්‍රධාන දර්ශනය කුමක්ද? (ලකුණු 04)\n` +
        `**(iv)** බුදුසමය මඟින් 'ඊශ්වර නිර්මාණවාදය' විවේචනය කළ ප්‍රධාන තර්කයක් පැහැදිලි කරන්න. (ලකුණු 04)\n` +
        `**(v)** "ස්ත්‍රියට පරමාර්ථ සාධනය (අර්හත්භාවය) ලැබීමට ලිංගික භේදය බාධාවක් නොවේ." — බෞද්ධ මතය පැහැදිලි කරන්න. (ලකුණු 04)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** 1. හෝතෘ (Hotri) 2. අධ්වර්යු (Adhvaryu) 3. උද්ගාතෘ (Udgatri) 4. බ්‍රහ්මන් (Brahman)\n` +
        `**(ii)** ගෝරක්ෂා (ගව පාලනය), කෘෂිකර්මාන්තය, වාණිජ්‍යය (වෙළඳාම).\n` +
        `**(iii)** උච්ඡේදවාදය / භෞතිකවාදය (මරණින් මතු කිසිවක් ඉතිරි නොවේ, පින/පව හෝ පරලොවක් නැත).\n` +
        `**(iv)** ඊශ්වරයා සියල්ල මවන ලද්දේ නම් ලොව පවතින දුක, අසමානතාවය, පාපය හා හිංසනයටද වගකිව යුත්තේ ඔහුය (අංගුත්තර නිකාය තිත්ථදර්ශන සූත්‍රය).\n` +
        `**(v)** චිත්ත පරිශුද්ධියට ඡන්දය, වීර්යය, චිත්තය, විමංසා යන ඉද්ධිපාද අවශ්‍ය වේ. බුදුරජාණන් වහන්සේ යශෝධරා, මහාප්‍රජාපතී ගෝතමී, ඛේමා, උප්පලවණ්ණා ආදී මෙහෙණින් වහන්සේලා අර්හත්ඵලයට පත් වූ බව දේශනා කළහ.`
    },
    2: {
      title: 'ප්‍රශ්නය 02 (ව්‍යුහගත රචනා)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `📌 **ප්‍රශ්නය 02 / 08 (I කොටස — ව්‍යුහගත රචනා)**\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** ව්‍යග්ඝපජ්ජ සූත්‍රයේ දැක්වෙන දිට්ඨධම්මහිතත්ථ (මෙලොව දියුණුවට හේතු වන) සම්පදා 04 නම් කරන්න. (ලකුණු 04)\n` +
        `**(ii)** සිඟාලෝවාද සූත්‍රයට අනුව ධනය විනාශ වන 'අපාය මුඛ' 02ක් සඳහන් කරන්න. (ලකුණු 04)\n` +
        `**(iii)** බුදුසමයෙහි සඳහන් වන 'සුහද මිත්‍රයන්' (කල්‍යාණ මිත්‍රයන්) වර්ග 04 නම් කරන්න. (ලකුණු 04)\n` +
        `**(iv)** සිඟාලෝවාද සූත්‍රයේ එන ධන විභාජන ප්‍රතිපත්තිය විස්තර කරන්න. (ලකුණු 04)\n` +
        `**(v)** බුදුසමයෙහි තහනම් කර ඇති 'මිච්ඡා වණිජ්ජා' (මිථ්‍යා වෙළඳාම්) 05 නම් කරන්න. (ලකුණු 04)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** 1. උට්ඨාන සම්පදා 2. ආරක්ඛ සම්පදා 3. කල්‍යාණමිත්තතා 4. සමජීවිතා\n` +
        `**(ii)** මත්පැන් පානය, රාත්‍රී සමාජශාලා සංචාරය, සූදුව, පාපමිත්‍ර සේවනය, අලසකම.\n` +
        `**(iii)** 1. උපකාරක මිත්‍රයා 2. සමාන සුඛදුක්ඛ මිත්‍රයා 3. අත්ථක්ඛායී (අර්ථය කියාදෙන) මිත්‍රයා 4. අනුකම්පක මිත්‍රයා\n` +
        `**(iv)** 1/4ක් දෛනික පරිභෝජනයට, 2/4ක් (අඩක්) ව්‍යාපාර හා ආයෝජනයට, 1/4ක් ආපදා හා අනාගත අරමුදල් ලෙස ඉතිරි කිරීමට.\n` +
        `**(v)** 1. සත්ථ වණිජ්ජා (ආයුධ) 2. සත්ත වණිජ්ජා (වහලුන්/මිනිසුන්) 3. මංස වණිජ්ජා (මස්) 4. මජ්ජ වණිජ්ජා (මද්‍යසාර) 5. විස වණිජ්ජා (විෂ වර්ග).`
    },
    3: {
      title: 'ප්‍රශ්නය 03 (ව්‍යුහගත රචනා)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `📌 **ප්‍රශ්නය 03 / 08 (I කොටස — ව්‍යුහගත රචනා)**\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** ශ්‍රී ලංකාවේ ප්‍රථමයෙන් ඉදිකළ ස්තූපය සහ මෙහෙණවර නම් කරන්න. (ලකුණු 04)\n` +
        `**(ii)** මිහිඳු හිමියන් අනුරාධපුර මහමෙව්නාවේදී දේශනා කළ ප්‍රථම සූත්‍රය කුමක්ද? (ලකුණු 04)\n` +
        `**(iii)** මහින්දාගමනයට පෙර ලංකාවේ පැවති පූර්ව මහින්ද ඇදහිලි 03ක් සඳහන් කරන්න. (ලකුණු 04)\n` +
        `**(iv)** අනුරාධපුර යුගයේ රජවරුන්ට මහා විහාරීය භික්ෂූන් වහන්සේලා ලබාදුන් උපදේශක කාර්යභාරය පැහැදිලි කරන්න. (ලකුණු 04)\n` +
        `**(v)** අභයගිරි නිකාය ආරම්භ වීමට හේතු වූ ආගමික හා දේශපාලනික පසුබිම කෙටියෙන් විස්තර කරන්න. (ලකුණු 04)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** ප්‍රථම ස්තූපය: ථූපාරාමය | ප්‍රථම මෙහෙණවර: හත්ථාල්හක මෙහෙණවර\n` +
        `**(ii)** දේවදූත සූත්‍රය (මජ්ඣිම නිකාය)\n` +
        `**(iii)** යක්ෂ/නාග ඇදහිලි, වෘක්ෂ ඇදහිලි, පිත්‍රෘ/ප්‍රේත ඇදහිලි, නක්ෂත්‍ර/ජ්‍යොතිෂ ඇදහිලි.\n` +
        `**(iv)** රාජ්‍ය පාලනයේදී 'දස රාජ ධර්ම' අනුගමනය කිරීමට උපදෙස් දීම, රජු සෙබළුන් හා ප්‍රජාව සමඟ ධාර්මිකව කටයුතු කිරීමට මඟපෙන්වීම.\n` +
        `**(v)** වළගම්බා රජු ගිරි නිගණ්ඨයාගේ ආරාමය බිඳ අභයගිරි විහාරය කරවා මහාතිස්ස හිමියන්ට පූජා කිරීම සහ මහා විහාරීය කුලසංසර්ග චෝදනාව මත භික්ෂූන් වෙන්වීම.`
    },
    4: {
      title: 'ප්‍රශ්නය 04 (රචනා ප්‍රශ්න)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `✍️ **ප්‍රශ්නය 04 / 08 (II කොටස — රචනා ප්‍රශ්න)**\n` +
        `*(ප්‍රශ්න 5න් 3කට පිළිතුරු සපයන්න. ලකුණු 20x3=60)*\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** අග්ගඤ්ඤ සූත්‍රයේ සඳහන් මානව හා සමාජ පරිණාමීය අවස්ථා සහ 'මහාසම්මත' රජුගේ සම්භවය පැහැදිලි කරන්න. (ලකුණු 10)\n` +
        `**(ii)** චක්කවත්ති සීහනාද සූත්‍රයේ දැක්වෙන 'දස සක්විති වත්' අතුරින් ප්‍රධාන වත් 05ක් දක්වා එහි සමාජ-ආර්ථික වැදගත්කම විග්‍රහ කරන්න. (ලකුණු 10)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** • රසාපඨවි, පප්පටක, භද්දලතා, ස්වයංජාත ඇල්වී ආදී භෞතික පරිණාමය.\n` +
        `• මිනිසා තණ්හාවෙන් ඇල්වී අස්වැන්න තැන්පත් කිරීම නිසා පෞද්ගලික දේපළ අයිතිය, මායිම් ආරවුල් හා සොරකම ඇතිවීම.\n` +
        `• නීතිය හා සාමය පිණිස ජනයා විසින් සම්මත කරගත් 'මහාසම්මත' රජු තෝරා පත් කරගැනීම.\n\n` +
        `**(ii)** • ධම්මික රක්ඛාව (ධර්මානුකූල ආරක්ෂාව)\n` +
        `• අධනස්ස ධනනුප්පදානං (දිළිඳුන්ට ධනය ලබාදීම)\n` +
        `• සමණ බ්‍රාහ්මණ පරියුපාසනං (ශ්‍රමණ බ්‍රාහ්මණයන්ගෙන් උපදෙස් ලැබීම)\n` +
        `• මනුස්ස-පසු-පක්ඛි ආදී සියලු ජීවීන්ට ආරක්ෂාව දීම.\n` +
        `• සමාජයේ අපරාධ අඩුවීමට දිළිඳුකම නැති කිරීම අත්‍යවශ්‍ය බව පැහැදිලි කිරීම.`
    },
    5: {
      title: 'ප්‍රශ්නය 05 (රචනා ප්‍රශ්න)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `✍️ **ප්‍රශ්නය 05 / 08 (II කොටස — රචනා ප්‍රශ්න)**\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** 'සත්ථා දේවමනුස්සානං' බුදුගුණය ප්‍රජාතන්ත්‍රවාදී හා මානවවාදී නායකත්ව ලක්ෂණ සමඟ සසඳමින් පැහැදිලි කරන්න. (ලකුණු 10)\n` +
        `**(ii)** බුද්ධ චරිතයෙන් හෙළිවන උපදේශන, ගැටලු විසඳීමේ හා සංවාදශීලී නායකත්ව ලක්ෂණ උදාහරණ සහිතව විග්‍රහ කරන්න. (ලකුණු 10)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** • බුදුරජාණන් වහන්සේ දෙවි මිනිසුන්ගේ ශාස්තෘවරයා ලෙස සැමට එක හා සමානව කරුණාව දැක්වීම.\n` +
        `• කුල, වර්ණ, වයස්, ලිංගික භේදයකින් තොරව සුනීත, සෝපාක, රජ්ජුමාලා ආදීන්ට ධර්මාවබෝධය ලබාදීම.\n` +
        `• භික්ෂු සංඝයා සඳහා සංඝ සභා පැවැත්වීම හා සාමූහික ප්‍රජාතන්ත්‍රවාදී තීරණ ගැනීම.\n\n` +
        `**(ii)** • පටාචාරාවන්ගේ සහ කිසාගෝතමියගේ මහත් වූ සෝකය සමනය කළ අයුරු.\n` +
        `• කෝලිය-ශාක්‍ය රෝහිණී නදී ජල අර්බුදයේදී යුද්ධය වළක්වා සංවාදයෙන් ගැටලුව විසඳීම (ජලයද ලේද වටිනේ?)\n` +
        `• අංගුලිමාල දමනය හා සච්චක, උපාලි ගෘහපති ආදීන් සමඟ පැවැත්වූ සංවාදශීලී විග්‍රහයන්.`
    },
    6: {
      title: 'ප්‍රශ්නය 06 (රචනා ප්‍රශ්න)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `✍️ **ප්‍රශ්නය 06 / 08 (II කොටස — රචනා ප්‍රශ්න)**\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** ප්‍රථම හා තෙවන ධර්ම සංගායනාවල ඓතිහාසික පසුබිම, ධර්ම සංගායනා කිරීමට හේතු සහ ප්‍රතිඵල සැසඳීමක් කරන්න. (ලකුණු 10)\n` +
        `**(ii)** ධර්මපාල රජු විසින් ආරම්භ කරන ලද 'වික්‍රමශීලා' බෞද්ධ විශ්වවිද්‍යාලයේ අධ්‍යාපනික හා ජාත්‍යන්තර වැදගත්කම පැහැදිලි කරන්න. (ලකුණු 10)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** • **ප්‍රථම සංගායනාව**: සුභද්ද භික්ෂුවගේ අවගුණ බස් නිසා රජගහනුවර සප්තපණ්ණි ගුහාද්වාරයේදී මහාකස්සප හිමියන්ගේ මූලිකත්වයෙන් පැවැත්වීම. ධර්මය හා විනය සංග්‍රහ කිරීම.\n` +
        `• **තෙවන සංගායනාව**: අශෝක රජුගේ කාලයේ තීර්ථකයන් සංඝයා අතරට රිංගීම නිසා පැටලුණු සාසන අර්බුදයට පිළියම් ලෙස මොග්ගලීපුත්තතිස්ස හිමියන්ගේ මූලිකත්වයෙන් පැවැත්වීම. නවදෙසට ධර්මදූතයන් යැවීම.\n\n` +
        `**(ii)** • පාල වංශික ධර්මපාල රජු විසින් බිහාර් හි පිහිටුවීම.\n` +
        `• ද්වාරපණ්ඩිතවරුන් 6 දෙනා මඟින් විදේශීය සිසුන් ඇතුළත් කරගැනීම.\n` +
        `• දීපංකර ශ්‍රී ඥාන (අතීශ) හිමියන් ටිබෙටයට බුදුසමය ගෙන යාම.`
    },
    7: {
      title: 'ප්‍රශ්නය 07 (රචනා ප්‍රශ්න)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `✍️ **ප්‍රශ්නය 07 / 08 (II කොටස — රචනා ප්‍රශ්න)**\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** ඉන්දියාවේ සාංචි ස්තූපයේ නිර්මාණ ලක්ෂණ ලංකාවේ අනුරාධපුර යුගයේ ස්තූප නිර්මාණ සමඟ සසඳන්න. (ලකුණු 10)\n` +
        `**(ii)** ගන්ධාර සහ මථුරා බුද්ධ ප්‍රතිමා කලාවන්හි පැවති කලාත්මක හා සංස්කෘතික වෙනස්කම් පැහැදිලි කරන්න. (ලකුණු 10)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** • සාංචි ස්තූපය: අර්ධ ගෝලාකාර ගර්භය, ඡත්‍රාපලිය, තෝරණ 4 (North, South, East, West Toranas) හා වේදිකාව.\n` +
        `• ලංකාවේ ස්තූප: ඡත්‍රාපලිය වෙනුවට දේවතා කොටුව, කොත්කැරැල්ල, ඡත්‍රය, පෑස, ත්‍රිවිධ පේසා හා වාහල්කඩ ඉදිකිරීම.\n\n` +
        `**(ii)** • **ගන්ධාර කලාව**: ග්‍රීක-රෝම ආභාසය (Apollo රූප ලක්ෂණ), රැළි සහිත සිවුර, රැළි කොණ්ඩය, යථාර්ථවාදී මාංශ පේශී.\n` +
        `• **මථුරා කලාව**: දේශීය ඉන්දියානු ආභාසය, මහත සිරුර, පාරදෘශ්‍ය (ඇඟට ඇලුනු) සිවුර, මුහුණේ මන්දහාසය හා ආධ්‍යාත්මික බව.`
    },
    8: {
      title: 'ප්‍රශ්නය 08 (රචනා ප්‍රශ්න)',
      body: 
        `📜 **බෞද්ධ ශිෂ්ටාචාරය 2026 — ආදර්ශ II පත්‍රය**\n` +
        `✍️ **ප්‍රශ්නය 08 / 08 (II කොටස — රචනා ප්‍රශ්න)**\n\n` +
        `**[ප්‍රශ්න පත්‍රය]**\n` +
        `**(i)** තායිලන්තයේ බුදුසමයේ ව්‍යාප්තිය සහ ශ්‍රී ලාංකේය සියම් නිකායික උපසම්පදාව නැවත පිහිටුවීමේදී තායිලන්තයෙන් ලැබුණු දායකත්වය විග්‍රහ කරන්න. (ලකුණු 10)\n` +
        `**(ii)** ජපානයේ ෂෝතොකු කුමරුගේ සේවය සහ 'සෙන් බුදුදහම' (Zen Buddhism) ජපන් සංස්කෘතියට කළ බලපෑම පැහැදිලි කරන්න. (ලකුණු 10)\n\n` +
        `💡 **[නිල ලකුණු දීමේ පටිපාටිය & පිළිතුරු විග්‍රහය (Marking Scheme)]**\n` +
        `**(i)** • ලංකාවේ උපසම්පදාව පිරිහී තිබූ 18 වන සියවසේදී කීර්ති ශ්‍රී රාජසිංහ රජු සහ වැලිවිට සරණංකර සංඝරාජ හිමියන්ගේ ඉල්ලීම පරිදි තායිලන්තයේ (සියම) උපාලි හිමියන් ප්‍රමුඛ ධර්මදූත පිරිස ලංකාවට පැමිණ 1753 දී සියම් නිකායික උපසම්පදාව පිහිටුවීම.\n\n` +
        `**(ii)** • ෂෝතොකු කුමරු (Prince Shotoku) ජපානයේ බුදුසමය රාජ්‍ය ආගම බවට පත් කිරීම, ව්‍යවස්ථාව සකස් කිරීම.\n` +
        `• සෙන් බුදුදහම (Zen Buddhism): ධ්‍යාන වැඩීම, චා-නො-යූ (තේ පැන් සංග්‍රහය - Tea Ceremony), ඉකෙබානා (මල් සැකසුම) සහ කඩු ශිල්පයට (Bushido) කළ බලපෑම.`
    }
  }
};

// Helper: Render Question by Question with Full Marking Scheme in Telegram Chat
async function renderPart2Question(chatId, messageId, subId, yearKey, qIndex = 1, env = {}, queryId = null, isGroup = false) {
  if (queryId) {
    await sendApi('answerCallbackQuery', { callback_query_id: queryId }, env);
  }
  const paperData = QUIZ_DATA[subId]?.papers[yearKey];
  const qData = PART2_QUESTIONS_DATA[yearKey]?.[qIndex];
  const totalQ = 8;
  const quizUrl = `${BASE_URL}/${paperData?.file || 'bc2026_model_part2.html'}`;

  if (!qData) return;

  // Build Question Selector Row (1 to 4 and 5 to 8)
  const row1 = [];
  const row2 = [];
  for (let i = 1; i <= 4; i++) {
    const label = (i === qIndex) ? `· Q0${i} ·` : `Q0${i}`;
    row1.push({ text: label, callback_data: `part2_q_${subId}_${yearKey}_${i}` });
  }
  for (let i = 5; i <= 8; i++) {
    const label = (i === qIndex) ? `· Q0${i} ·` : `Q0${i}`;
    row2.push({ text: label, callback_data: `part2_q_${subId}_${yearKey}_${i}` });
  }

  // Navigation Row
  const prevQ = qIndex > 1 ? qIndex - 1 : totalQ;
  const nextQ = qIndex < totalQ ? qIndex + 1 : 1;
  const navRow = [
    { text: `◀️ Q0${prevQ}`, callback_data: `part2_q_${subId}_${yearKey}_${prevQ}` },
    { text: `📖 ${qIndex} / ${totalQ}`, callback_data: `part2_q_${subId}_${yearKey}_${qIndex}` },
    { text: `Q0${nextQ} ▶️`, callback_data: `part2_q_${subId}_${yearKey}_${nextQ}` }
  ];

  const webAppBtn = isGroup
    ? { text: '🚀 Interactive WebApp', url: quizUrl }
    : { text: '🚀 Interactive WebApp', web_app: { url: quizUrl } };

  // Action Row
  const actionRow = [
    webAppBtn,
    { text: '⬅️ ආපසු (Back)', callback_data: `paper_${subId}_${yearKey}` }
  ];

  const inlineKeyboard = [
    row1,
    row2,
    navRow,
    actionRow
  ];

  const text = qData.body;

  const res = await sendApi('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  }, env);

  if (!res.ok) {
    await sendApi('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    }, env);
  }
}

// Global State Storage for Active Sessions, Poll Maps & Custom Scheduling
const SESSIONS = {}; // chatId -> { subId, yearKey, paperKey, title, questions, qIndex, score, startTime }
const CUSTOM_TIME_STATE = {}; // chatId -> { paperKey, time }
const SCHEDULED_QUIZZES = []; // array of { paperKey, targetTime, chatId, timeLabel, executed }
const AUTHORIZED_ADMIN_IDS = ['2035260032', '5813878261'];
let GLOBAL_QUIZ_STOPPED_IN_MEMORY = false;

function isAdminUser(fromId, env) {
  if (!fromId) return false;
  const idStr = String(fromId).trim();
  if (AUTHORIZED_ADMIN_IDS.includes(idStr)) return true;
  if (env && env.ADMIN_ID && String(env.ADMIN_ID).trim() === idStr) return true;
  return false;
}

async function clearGreenApiQueue(env = {}) {
  const waInstance = (env.GREEN_API_INSTANCE || '710722698143').trim();
  const waToken = (env.GREEN_API_TOKEN || 'b65f5e2285e54499a88b78d13354ba79f7fe2bd4c0d648049f').trim();

  try {
    const res1 = await fetch(`https://api.green-api.com/waInstance${waInstance}/clearMessagesQueue/${waToken}`);
    const data1 = await res1.json();
    console.log('🟢 Green API WhatsApp Queue cleared (api.green-api.com):', data1);
  } catch (e) {
    console.error('Error clearing WA queue (api):', e.message);
  }

  try {
    const res2 = await fetch(`https://7107.api.greenapi.com/waInstance${waInstance}/clearMessagesQueue/${waToken}`);
    const data2 = await res2.json();
    console.log('🟢 Green API WhatsApp Queue cleared (7107.api.greenapi.com):', data2);
  } catch (e) {
    console.error('Error clearing WA queue (7107):', e.message);
  }
}

async function requestStopQuiz(paperKey = 'all', env = {}) {
  GLOBAL_QUIZ_STOPPED_IN_MEMORY = true;
  await clearGreenApiQueue(env);
  try {
    const cache = caches.default;
    const cacheUrl = 'https://a-l.gayanmadushanka1610.workers.dev/quiz-stopped-flag';
    await cache.put(cacheUrl, new Response('true', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));
    console.log(`🛑 Global Stop Signal written to Cloudflare Cache API & Green API Queues Cleared!`);
  } catch (e) {
    console.error('Error writing stop signal to cache:', e);
  }
}

async function isQuizStopped(paperKey) {
  if (GLOBAL_QUIZ_STOPPED_IN_MEMORY) return true;
  try {
    const cache = caches.default;
    const cacheUrl = 'https://a-l.gayanmadushanka1610.workers.dev/quiz-stopped-flag';
    const match = await cache.match(cacheUrl);
    if (match) {
      const txt = await match.text();
      if (txt === 'true') {
        GLOBAL_QUIZ_STOPPED_IN_MEMORY = true;
        return true;
      }
    }
  } catch (e) {}
  return false;
}

async function clearQuizStopFlags() {
  GLOBAL_QUIZ_STOPPED_IN_MEMORY = false;
  try {
    const cache = caches.default;
    const cacheUrl = 'https://a-l.gayanmadushanka1610.workers.dev/quiz-stopped-flag';
    await cache.delete(cacheUrl);
    console.log(`🟢 Global Stop Signal cleared from Cloudflare Cache API!`);
  } catch (e) {}
}

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
      const yearKey = item.paperKey.split('_').slice(1).join('_');
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

let SAVED_TG_GROUP_ID = '-1004322002704';

function getTelegramTargetChat(env, fallbackChatId) {
  if (env && env.TG_TARGET_CHAT && env.TG_TARGET_CHAT.trim() !== '') {
    return env.TG_TARGET_CHAT.trim();
  }
  if (SAVED_TG_GROUP_ID) {
    return SAVED_TG_GROUP_ID;
  }
  if (fallbackChatId && String(fallbackChatId).startsWith('-')) {
    return String(fallbackChatId).trim();
  }
  return '-1004322002704';
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
  const yearKey = parts.slice(1).join('_');
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

// Helper: Zero-Manual-Interaction Automated Telegram Broadcast Publisher via Green API Telegram Instance for Cloudflare Worker
async function autoPostToTelegramViaGreenApi(messageText, imageUrl = null, env = {}) {
  const instanceId = (env.GREEN_API_TG_INSTANCE || '410022698261').trim();
  const apiToken = (env.GREEN_API_TG_TOKEN || '17e510a2ebf3421f911f9cb223cde00dedda659906f2477d9a').trim();
  const targetChat = getTelegramTargetChat(env, '-1004322002704');

  if (!instanceId || !apiToken) return false;

  try {
    if (imageUrl && targetChat) {
      const res = await fetch(`https://api.green-api.com/tgInstance${instanceId}/sendFileByUrl/${apiToken}`, {
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
      if (data && (data.idMessage || data.id || data.status)) {
        console.log(`🟢 Green API Telegram Image Post sent! ID: ${data.idMessage || data.id}`);
        return true;
      }
    }

    if (targetChat) {
      const textRes = await fetch(`https://api.green-api.com/tgInstance${instanceId}/sendMessage/${apiToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: targetChat,
          message: messageText
        })
      });
      const textData = await textRes.json();
      if (textData && (textData.idMessage || textData.id || textData.status)) {
        console.log(`🟢 Green API Telegram Text Post sent! ID: ${textData.idMessage || textData.id}`);
        return true;
      }
    }
  } catch (err) {
    console.error('Error auto-posting to TG via Green API from Worker:', err.message);
  }
  return false;
}

// Helper: Perpetual Self-Chaining Automated WhatsApp Group Poll Quiz Streamer on Worker
async function processSingleWhatsAppPollStep(paperKey, qIndex = 0, intervalSec = 20, env = {}, ctx = null, origin = 'https://a-l.gayanmadushanka1610.workers.dev') {
  if (!paperKey) return;
  const parts = paperKey.split('_');
  const subId = parts[0];
  const yearKey = parts.slice(1).join('_');

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
    if (await isQuizStopped(paperKey)) {
      console.log(`🛑 Active WhatsApp poll stream immediately aborted by Admin for ${paperKey}!`);
      return;
    }
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

async function savePollMapping(pollId, data) {
  try {
    const cache = caches.default;
    const cacheUrl = `https://a-l.gayanmadushanka1610.workers.dev/poll-map/${pollId}`;
    await cache.put(cacheUrl, new Response(JSON.stringify(data), {
      headers: { 'Cache-Control': 'public, max-age=86400' }
    }));
  } catch (e) {
    console.error('Error saving poll mapping:', e);
  }
}

async function getPollMapping(pollId) {
  try {
    const cache = caches.default;
    const cacheUrl = `https://a-l.gayanmadushanka1610.workers.dev/poll-map/${pollId}`;
    const match = await cache.match(cacheUrl);
    if (match) {
      return await match.json();
    }
  } catch (e) {}
  return null;
}

async function getGroupActiveQIndex(chatId, paperKey) {
  try {
    const cache = caches.default;
    const cacheUrl = `https://a-l.gayanmadushanka1610.workers.dev/group-qindex/${chatId}/${paperKey}`;
    const match = await cache.match(cacheUrl);
    if (match) {
      const data = await match.json();
      return data.activeQIndex !== undefined ? data.activeQIndex : 0;
    }
  } catch (e) {}
  return 0;
}

async function setGroupActiveQIndex(chatId, paperKey, activeQIndex) {
  try {
    const cache = caches.default;
    const cacheUrl = `https://a-l.gayanmadushanka1610.workers.dev/group-qindex/${chatId}/${paperKey}`;
    await cache.put(cacheUrl, new Response(JSON.stringify({ activeQIndex }), {
      headers: { 'Cache-Control': 'public, max-age=86400' }
    }));
  } catch (e) {}
}

async function recordUserPollAnswer(chatId, paperKey, user, qIndex, selectedOption, correctOption) {
  if (!user || !user.id) return;
  const userId = String(user.id);
  const cacheKey = `user-stats/${chatId}/${paperKey}`;
  const cache = caches.default;
  const cacheUrl = `https://a-l.gayanmadushanka1610.workers.dev/${cacheKey}`;

  let statsMap = {};
  try {
    const match = await cache.match(cacheUrl);
    if (match) {
      statsMap = await match.json();
    }
  } catch (e) {}

  if (!statsMap[userId]) {
    const name = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user.username || 'Student');
    statsMap[userId] = {
      name: name,
      score: 0,
      totalAnswered: 0,
      wrongList: []
    };
  }

  const userRecord = statsMap[userId];
  const qNum = qIndex + 1;
  const isCorrect = (selectedOption === correctOption);

  userRecord.totalAnswered++;
  if (isCorrect) {
    userRecord.score++;
  } else {
    userRecord.wrongList.push({
      qNum: qNum,
      userAns: selectedOption + 1,
      correctAns: correctOption + 1
    });
  }

  try {
    await cache.put(cacheUrl, new Response(JSON.stringify(statsMap), {
      headers: { 'Cache-Control': 'public, max-age=86400' }
    }));
  } catch (e) {}
}

async function getUserQuizStats(chatId, paperKey) {
  try {
    const cacheKey = `user-stats/${chatId}/${paperKey}`;
    const cache = caches.default;
    const cacheUrl = `https://a-l.gayanmadushanka1610.workers.dev/${cacheKey}`;
    const match = await cache.match(cacheUrl);
    if (match) {
      return await match.json();
    }
  } catch (e) {}
  return {};
}

async function resetUserQuizStats(chatId, paperKey) {
  try {
    const cacheKey = `user-stats/${chatId}/${paperKey}`;
    const cache = caches.default;
    const cacheUrl = `https://a-l.gayanmadushanka1610.workers.dev/${cacheKey}`;
    await cache.delete(cacheUrl);
  } catch (e) {}
}

async function sendNextNativePollStep(chatId, paperKey, qIndex = 0, score = 0, startTime = Date.now(), env = {}) {
  if (!paperKey) return;
  if (qIndex === 0 && String(chatId).startsWith('-')) {
    await setGroupActiveQIndex(chatId, paperKey, 0);
  }
  const parts = paperKey.split('_');
  const subId = parts[0];
  const yearKey = parts.slice(1).join('_');

  const subData = QUIZ_DATA[subId];
  const paperData = subData?.papers[yearKey];
  if (!paperData) return;

  const questions = await fetchQuestionsFromHtml(paperData.file);
  if (!questions || questions.length === 0) return;

  const totalQ = questions.length;

  if (qIndex >= totalQ) {
    const timeSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));

    // Build Live Competition Leaderboard Podium
    const allStatsMap = await getUserQuizStats(chatId, paperKey);
    const userList = Object.keys(allStatsMap).map(uid => ({
      userId: uid,
      name: allStatsMap[uid].name,
      score: allStatsMap[uid].score,
      totalAnswered: allStatsMap[uid].totalAnswered,
      wrongCount: (allStatsMap[uid].wrongList || []).length
    }));

    userList.sort((a, b) => b.score - a.score || a.wrongCount - b.wrongCount);

    let leaderboardText = '';
    if (userList.length > 0) {
      const topWinners = userList.slice(0, 5);
      const podiums = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      const winnerLines = topWinners.map((u, idx) => {
        const icon = podiums[idx] || `${idx + 1}.`;
        const uPct = Math.round((u.score / totalQ) * 100);
        return `${icon} **${u.name}** — ${u.score}/${totalQ} (${uPct}%)`;
      });

      leaderboardText = 
        `\n\n🏆 **සජීවී ප්‍රශ්න පත්‍ර තරඟාවලියේ ජයග්‍රාහකයින් (Live Competition Leaderboard)** 🥇🥈🥉\n` +
        `─────────────────────────\n` +
        winnerLines.join('\n') + `\n` +
        `─────────────────────────\n` +
        `🎉 **ජයග්‍රාහකයින් සියලු දෙනාටම අපගේ උණුසුම් සුභ පැතුම්! (Congratulations!)** 👏⚡`;
    }

    const resultMessage = 
      `🏆 **${paperData.title} — තරඟය සාර්ථකව අවසන්!**\n\n` +
      `⏱️ **ගත වූ කාලය:** ${formatDuration(timeSec)}\n` +
      `👥 **සහභාගී වූ සිසුන් ගණන:** ${userList.length || 1}` +
      leaderboardText + `\n\n` +
      `💡 **ඔබේ පුද්ගලික ලකුණු සහ වැරදුණු ප්‍රශ්න බලන්න පහත බොත්තම ඔබන්න:**`;

    const finishKeyboard = {
      inline_keyboard: [
        [{ text: '📊 මගේ ලකුණු සහ වැරදුණු ප්‍රශ්න (My Individual Summary)', callback_data: `my_report_${subId}_${yearKey}` }],
        [{ text: '🔄 නැවත තරඟය පවත්වන්න (Retry)', callback_data: `native_${subId}_${yearKey}` }],
        [{ text: '📑 වෙනත් ප්‍රශ්න පත්‍රයක් (Select Paper)', callback_data: `cat_${subId}_pp` }]
      ]
    };

    await sendApi('sendMessage', {
      chat_id: chatId,
      text: resultMessage,
      parse_mode: 'Markdown',
      reply_markup: finishKeyboard
    }, env);
    return;
  }

  const q = questions[qIndex];
  const qNum = qIndex + 1;

  let rawQText = q.q || `ප්‍රශ්නය ${qNum}`;
  rawQText = cleanText(rawQText, 250);
  rawQText = rawQText.replace(/^\d+[\.\)\-]?\s*/, '');

  const cleanQ = cleanText(`[${qNum}/${totalQ}] ${rawQText}`, 290);
  const cleanOpts = (q.o || q.options || []).map(o => cleanText(o, 98));
  const correctIdx = (q.correct !== undefined) ? q.correct : ((q.c !== undefined) ? q.c : 0);

  const rawExplain = cleanText(q.e || '', 185);
  const cleanExplain = rawExplain ? `💡 ${rawExplain}` : undefined;

  const pollRes = await sendApi('sendPoll', {
    chat_id: chatId,
    question: cleanQ,
    options: cleanOpts,
    type: 'quiz',
    correct_option_id: correctIdx,
    explanation: cleanExplain,
    is_anonymous: false
  }, env);

  if (pollRes.ok && pollRes.result) {
    const pollId = pollRes.result.poll.id;
    await savePollMapping(pollId, {
      chatId,
      paperKey,
      qIndex,
      score,
      correctOption: correctIdx,
      startTime
    });
  } else {
    await sendNextNativePollStep(chatId, paperKey, qIndex + 1, score, startTime, env);
  }
}

// Helper: Pure Native Telegram Group Poll Quiz Launcher
async function processSingleTelegramPollStep(paperKey, env = {}, sendHeader = true) {
  if (!paperKey) return;
  const parts = paperKey.split('_');
  const subId = parts[0];
  const yearKey = parts.slice(1).join('_');

  const subData = QUIZ_DATA[subId];
  const paperData = subData?.papers[yearKey];
  if (!paperData) return;

  const tgTarget = getTelegramTargetChat(env, '-1004322002704');

  if (sendHeader) {
    const startText = `🚀 **${paperData.title} Native Telegram Quiz තරඟය දැන් ආරම්භ විය!**\n\nපළමු ප්‍රශ්නය පහත දැක්වේ 👇`;
    const paperImgUrl = getPaperImageUrl(paperKey);
    const photoRes = await sendApi('sendPhoto', {
      chat_id: tgTarget,
      photo: paperImgUrl,
      caption: startText,
      parse_mode: 'Markdown'
    }, env);

    if (!photoRes.ok) {
      await sendApi('sendMessage', {
        chat_id: tgTarget,
        text: startText,
        parse_mode: 'Markdown'
      }, env);
    }
  }

  await sendNextNativePollStep(tgTarget, paperKey, 0, 0, Date.now(), env);
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
          const yearKey = paperKey.split('_').slice(1).join('_');
          const subData = QUIZ_DATA[subId];
          const paperData = subData?.papers[yearKey];

          if (paperData) {
            const paperImgUrl = getPaperImageUrl(paperKey);
            const startText = `🚀 **${paperData.title} සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය!**\n\nපළමු ප්‍රශ්නය පහත දැක්වේ 👇`;

            // 1. Send Automated Telegram Quiz Start Announcement with Photo Banner
            if (chatId) {
              const photoRes = await sendApi('sendPhoto', {
                chat_id: chatId,
                photo: paperImgUrl,
                caption: startText,
                parse_mode: 'Markdown'
              }, env);

              if (!photoRes.ok) {
                await sendApi('sendMessage', {
                  chat_id: chatId,
                  text: startText,
                  parse_mode: 'Markdown'
                }, env);
              }
            }

            // 2. Start Both WhatsApp & Telegram Group Poll Streams
            await processSingleWhatsAppPollStep(paperKey, 0, 20, env);
            await processSingleTelegramPollStep(paperKey, env);
          }
        })());
      } else {
        const subId = paperKey.split('_')[0];
        const yearKey = paperKey.split('_').slice(1).join('_');
        const subData = QUIZ_DATA[subId];
        const paperData = subData?.papers[yearKey];
        if (paperData && chatId) {
          const paperImgUrl = getPaperImageUrl(paperKey);
          const startText = `🚀 **${paperData.title} සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය!**\n\nපළමු ප්‍රශ්නය පහත දැක්වේ 👇`;
          const photoRes = await sendApi('sendPhoto', {
            chat_id: chatId,
            photo: paperImgUrl,
            caption: startText,
            parse_mode: 'Markdown'
          }, env);

          if (!photoRes.ok) {
            await sendApi('sendMessage', {
              chat_id: chatId,
              text: startText,
              parse_mode: 'Markdown'
            }, env);
          }
        }
        processSingleWhatsAppPollStep(paperKey, 0, 20, env);
        processSingleTelegramPollStep(paperKey, env);
      }

      return new Response(JSON.stringify({ ok: true, scheduled: paperKey, delaySec }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Endpoint 7: Automated Native Telegram Group Poll Quiz Step Streamer Endpoint
    if (url.pathname === '/stream-tg-step') {
      const paperKey = url.searchParams.get('paperKey');
      const qIndex = parseInt(url.searchParams.get('qIndex') || '0', 10);
      const intervalSec = parseInt(url.searchParams.get('intervalSec') || '25', 10);
      const origin = url.origin;

      if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(processSingleTelegramPollStep(paperKey, qIndex, intervalSec, env, ctx, origin));
      } else {
        processSingleTelegramPollStep(paperKey, qIndex, intervalSec, env, ctx, origin);
      }

      return new Response(JSON.stringify({ ok: true, paperKey, qIndex }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
      [{ text: QUIZ_DATA.sin.name, callback_data: 'sub_sin' }],
      [{ text: QUIZ_DATA.bs.name, callback_data: 'sub_bs' }]
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

    // Auto-capture Telegram Group Chat ID whenever an update arrives from a group
    if (isGroup && String(chatId).startsWith('-')) {
      SAVED_TG_GROUP_ID = String(chatId);
      console.log(`📌 Captured Telegram Group Chat ID: ${SAVED_TG_GROUP_ID}`);
    }

    if (text.startsWith('/setgroup')) {
      SAVED_TG_GROUP_ID = String(chatId);
      await sendApi('sendMessage', {
        chat_id: chatId,
        text: `✅ **මෙම Telegram Group එක (ID: \`${chatId}\`) Broadcasts සඳහා සාර්ථකව Register කරන ලදී!** ⚡\n\nමින්පසු Admin විසින් Schedule හෝ Publish කරන සියලුම Quiz Broadcasts මෙම Group එක වෙත ස්වයංක්‍රීයව ලැබෙනු ඇත.`,
        parse_mode: 'Markdown'
      }, env);
      return;
    }

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
      const yearKey = parts.slice(1).join('_');
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

        // 2. Instant Telegram Announcement Message with Image Banner to Telegram Group (Via Bot API & Green API Telegram Instance)
        const tgAnnounce = 
          `⏰ **සජීවී ප්‍රශ්න පත්‍ර තරඟය Schedule කරන ලදී! (Quiz Scheduled)**\n\n` +
          `📚 **ප්‍රශ්න පත්‍රය:** ${paperData.title}\n` +
          `⏰ **ආරම්භ වන වේලාව:** ${label}\n\n` +
          `🔔 නියමිත වේලාව පැමිණි සැනින් මෙම Group එක වෙත ප්‍රශ්න පත්‍රය ස්වයංක්‍රීයව ලැබෙනු ඇත!`;

        const tgTarget = getTelegramTargetChat(env, chatId);
        await autoPostToTelegramViaGreenApi(tgAnnounce, paperImgUrl, env);

        const tgPhotoRes = await sendApi('sendPhoto', {
          chat_id: tgTarget,
          photo: paperImgUrl,
          caption: tgAnnounce,
          parse_mode: 'Markdown'
        }, env);

        if (!tgPhotoRes.ok) {
          await sendApi('sendMessage', {
            chat_id: tgTarget,
            text: tgAnnounce,
            parse_mode: 'Markdown'
          }, env);
        }

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
    } else if (text.startsWith('/stopquiz') || text.startsWith('/stop')) {
      const fromId = msg.from ? String(msg.from.id) : '';

      if (!isAdminUser(fromId, env)) {
        await sendApi('sendMessage', {
          chat_id: chatId,
          text: '⛔ **ඔබට මෙම මෙනුව භාවිත කිරීමට අවසර නොමැත! (Unauthorized)**',
          parse_mode: 'Markdown'
        }, env);
        return;
      }

      await requestStopQuiz('all', env);

      // 1. WhatsApp Cancellation Card
      const waStopMsg = 
        `═════════════════════════\n` +
        `🛑 *A/L MCQ HUB* — සජීවී ප්‍රශ්න පත්‍ර තරඟය අත්හිටුවන ලදී!\n` +
        `═════════════════════════\n\n` +
        `⚠️ Admin විසින් සක්‍රීය ප්‍රශ්න පත්‍ර තරඟය තාවකාලිකව නවත්වන ලදී.`;
      await autoPostToWhatsAppChannel(waStopMsg, null, env);

      // 2. Telegram Group Cancellation Card
      const tgTarget = getTelegramTargetChat(env, chatId);
      if (tgTarget) {
        const tgStopMsg = 
          `🛑 **සජීවී ප්‍රශ්න පත්‍ර තරඟය අත්හිටුවන ලදී! (Quiz Stopped by Admin)**\n\n` +
          `⚠️ Admin විසින් සක්‍රීය ප්‍රශ්න පත්‍ර තරඟය තාවකාලිකව නවත්වන ලදී.`;
        await autoPostToTelegramViaGreenApi(tgStopMsg, null, env);
        await sendApi('sendMessage', {
          chat_id: tgTarget,
          text: tgStopMsg,
          parse_mode: 'Markdown'
        }, env);
      }

      await sendApi('sendMessage', {
        chat_id: chatId,
        text: `✅ **සක්‍රීය Quiz තරඟය සාර්ථකව නවත්වන ලදී! (Quiz Stopped Successfully)** 🛑`,
        parse_mode: 'Markdown'
      }, env);
    } else if (text.startsWith('/admin')) {
      const fromId = msg.from ? String(msg.from.id) : '';

      if (!isAdminUser(fromId, env)) {
        await sendApi('sendMessage', {
          chat_id: chatId,
          text: '⛔ **ඔබට Admin මෙනුව භාවිත කිරීමට අවසර නොමැත! (Unauthorized)**',
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
          [{ text: '🛑 සක්‍රීය Quiz එක වහාම නවත්වන්න (Stop Active Quiz)', callback_data: 'adm_stop_quiz' }],
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

  // Handle Native Telegram Poll Answers (Persistent Cross-Isolate Flow)
  if (update.poll_answer) {
    const answer = update.poll_answer;
    const pollId = answer.poll_id;
    const selectedOptions = answer.option_ids;

    const mapping = await getPollMapping(pollId);
    if (mapping) {
      const { chatId, paperKey, qIndex, score, correctOption, startTime } = mapping;
      let newScore = score || 0;

      if (selectedOptions && selectedOptions[0] === correctOption) {
        newScore++;
      }

      const isGroup = String(chatId).startsWith('-');

      if (isGroup) {
        // Prevent duplicate question posts in Telegram Groups when multiple users answer the same poll
        const currentGroupQIndex = await getGroupActiveQIndex(chatId, paperKey);
        
        if (qIndex + 1 > currentGroupQIndex) {
          await setGroupActiveQIndex(chatId, paperKey, qIndex + 1);
          await sendNextNativePollStep(chatId, paperKey, qIndex + 1, newScore, startTime, env);
        } else {
          console.log(`ℹ️ Group poll answer for Q${qIndex + 1} ignored for group progression as Q${currentGroupQIndex + 1} is already active.`);
        }
      } else {
        await sendNextNativePollStep(chatId, paperKey, qIndex + 1, newScore, startTime, env);
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
    const fromId = query.from ? String(query.from.id) : '';

    // Enforce strict admin security on all Admin menu buttons
    if (data.startsWith('adm_')) {
      if (!isAdminUser(fromId, env)) {
        await sendApi('answerCallbackQuery', {
          callback_query_id: query.id,
          text: '⛔ ඔබට Admin මෙනුව භාවිත කිරීමට අවසර නොමැත! (Unauthorized Access)',
          show_alert: true
        }, env);
        return;
      }
    }

    if (data === 'nav_subjects') {
      await sendApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: '🎯 **කරුණාකර ඔබගේ විෂය (Subject) තෝරන්න:**',
        parse_mode: 'Markdown',
        reply_markup: getSubjectKeyboard(isGroup)
      }, env);
    } else if (data === 'adm_stop_quiz') {
      await requestStopQuiz('all', env);

      const waStopMsg = 
        `═════════════════════════\n` +
        `🛑 *A/L MCQ HUB* — සජීවී ප්‍රශ්න පත්‍ර තරඟය අත්හිටුවන ලදී!\n` +
        `═════════════════════════\n\n` +
        `⚠️ Admin විසින් සක්‍රීය ප්‍රශ්න පත්‍ර තරඟය තාවකාලිකව නවත්වන ලදී.`;
      await autoPostToWhatsAppChannel(waStopMsg, null, env);

      const tgTarget = getTelegramTargetChat(env, chatId);
      if (tgTarget) {
        const tgStopMsg = 
          `🛑 **සජීවී ප්‍රශ්න පත්‍ර තරඟය අත්හිටුවන ලදී! (Quiz Stopped by Admin)**\n\n` +
          `⚠️ Admin විසින් සක්‍රීය ප්‍රශ්න පත්‍ර තරඟය තාවකාලිකව නවත්වන ලදී.`;
        await autoPostToTelegramViaGreenApi(tgStopMsg, null, env);
        await sendApi('sendMessage', {
          chat_id: tgTarget,
          text: tgStopMsg,
          parse_mode: 'Markdown'
        }, env);
      }

      await sendApi('answerCallbackQuery', { callback_query_id: query.id, text: '🛑 Quiz stopped successfully!' }, env);
      await sendApi('sendMessage', {
        chat_id: chatId,
        text: `✅ **සක්‍රීය Quiz තරඟය සාර්ථකව නවත්වන ලදී! (Quiz Stopped Successfully)** 🛑`,
        parse_mode: 'Markdown'
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
          [{ text: QUIZ_DATA.sin.name, callback_data: `${prefix}sin` }],
          [{ text: QUIZ_DATA.bs.name, callback_data: `${prefix}bs` }]
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
          const paperObj = subData.papers[key];
          const label = paperObj.btnLabel || key;
          const cb = isSch ? `adm_sch_p_${subId}_${key}` : `adm_pub_now_${subId}_${key}`;
          row.push({ text: `📝 ${label}`, callback_data: cb });
          if (row.length === 2 || idx === keys.length - 1) {
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
      await clearQuizStopFlags();
      const parts = data.split('_');
      const subId = parts[3];
      const yearKey = parts.slice(4).join('_');
      const paperKey = `${subId}_${yearKey}`;
      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        const paperImgUrl = getPaperImageUrl(paperKey);
        const tgTarget = getTelegramTargetChat(env, chatId);
        const quizUrl = `${BASE_URL}/${paperData.file}`;
        const targetGroupUrl = (env && env.GROUP_URL) ? env.GROUP_URL : 'https://t.me/+wZUSJyEncD1mYjFl';

        if (paperData.isPart2) {
          // Native Part II Presentation Card (Not MCQ Quiz)
          const part2Announce = 
            `📜 **${paperData.title}**\n\n` +
            `🎓 **අ.පො.ස. (උසස් පෙළ) II පත්‍රය — පළකරන ලදී! (Part II Paper Published)**\n\n` +
            `✍️ **ප්‍රශ්න පත්‍ර ව්‍යුහය:** ව්‍යුහගත හා රචනා ප්‍රශ්න 08ක් (Structured & Essay Questions)\n` +
            `💡 **විශේෂතා:** සම්පූර්ණ ප්‍රශ්න පත්‍රය සහ නිල පිළිතුරු විග්‍රහය (Marking Scheme) ඇතුළත් වේ.\n\n` +
            `👇 **ප්‍රශ්න පත්‍රය හා පිළිතුරු කියවීමට පහත බොත්තමක් තෝරන්න:**`;

          const part2Keyboard = {
            inline_keyboard: [
              [
                { text: '🚀 Open Interactive WebApp (App එක තුළින්)', web_app: { url: quizUrl } }
              ],
              [
                { text: '📖 Read Questions & Marking Scheme in Chat', callback_data: `part2_read_${subId}_${yearKey}` }
              ],
              [
                { text: '🌐 Open Browser (Browser එකෙන්)', url: quizUrl }
              ]
            ]
          };

          const tgTargetGroup = getTelegramTargetChat(env, '-1004322002704');

          // 1. Post to Telegram Group via Bot API with Photo Banner & Interactive Buttons
          const photoRes = await sendApi('sendPhoto', {
            chat_id: tgTargetGroup,
            photo: paperImgUrl,
            caption: part2Announce,
            parse_mode: 'Markdown',
            reply_markup: part2Keyboard
          }, env);

          if (!photoRes.ok) {
            await sendApi('sendMessage', {
              chat_id: tgTargetGroup,
              text: part2Announce,
              parse_mode: 'Markdown',
              reply_markup: part2Keyboard
            }, env);
          }

          // 2. Post to Telegram Group via Green API Telegram Instance Broadcast
          await autoPostToTelegramViaGreenApi(part2Announce, paperImgUrl, env);

          // 3. WhatsApp Channel Broadcast for Part II Paper
          const waPart2Text = 
            `═════════════════════════\n` +
            `🎓 *A/L MCQ HUB* — නව II පත්‍රය (Structured & Essay) පළකරන ලදී!\n` +
            `═════════════════════════\n\n` +
            `📜 *ප්‍රශ්න පත්‍රය:* ${paperData.title}\n` +
            `✍️ *විශේෂතා:* ව්‍යුහගත හා රචනා ප්‍රශ්න 8ක් සහ නිල ලකුණු දීමේ පටිපාටිය (Marking Scheme)\n\n` +
            `👇 *දැන්ම පත්‍රය කියවන්න:*\n` +
            `${targetGroupUrl}`;

          await autoPostToWhatsAppChannel(waPart2Text, paperImgUrl, env);
          await sendApi('answerCallbackQuery', { callback_query_id: query.id, text: '✅ Part II Paper Published to Telegram & WhatsApp Groups!' }, env);
          return;
        }

        const announceMsg = 
          `🚀 **සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය! (Live Quiz Started)**\n\n` +
          `📚 **ප්‍රශ්න පත්‍රය:** ${paperData.title}\n\n` +
          `💡 **විශේෂතා:** Native Telegram Polls, Instant Confetti 🎉, Leaderboards & Top 3 Winner Podiums!\n\n` +
          `👇 **පළමු ප්‍රශ්නය පහත දැක්වේ:**`;

        const photoRes = await sendApi('sendPhoto', {
          chat_id: tgTarget,
          photo: paperImgUrl,
          caption: announceMsg,
          parse_mode: 'Markdown'
        }, env);

        if (!photoRes.ok) {
          await sendApi('sendMessage', {
            chat_id: tgTarget,
            text: announceMsg,
            parse_mode: 'Markdown'
          }, env);
        }

        // Automated WhatsApp Group Broadcast Trigger from Worker
        const waMsgText = 
          `═════════════════════════\n` +
          `🎓 *A/L MCQ HUB* — සජීවී ප්‍රශ්න පත්‍ර තරඟය දැන් ආරම්භ විය!\n` +
          `═════════════════════════\n\n` +
          `📚 *ප්‍රශ්න පත්‍රය:* ${paperData.title}\n\n` +
          `👇 *දැන්ම තරඟයට එකතු වන්න:*\n` +
          `${targetGroupUrl}`;

        await autoPostToWhatsAppChannel(waMsgText, paperImgUrl, env);

        // Start Automated WhatsApp & Telegram Poll Quiz Streamers directly on Worker
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(processSingleWhatsAppPollStep(paperKey, 0, 20, env));
          ctx.waitUntil(processSingleTelegramPollStep(paperKey, env, false));
        } else {
          processSingleWhatsAppPollStep(paperKey, 0, 20, env);
          processSingleTelegramPollStep(paperKey, env, false);
        }

        await sendApi('answerCallbackQuery', { callback_query_id: query.id, text: '✅ Quiz Published & WhatsApp/Telegram Group Polls Started!' }, env);
      }
    } else if (data.startsWith('adm_sch_p_')) {
      const parts = data.split('_');
      const subId = parts[3];
      const yearKey = parts.slice(4).join('_');
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
      const yearKey = parts.slice(1).join('_');
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
      const parts = data.split('_');
      const timeTag = parts[2];
      const subId = parts[3];
      const yearKey = parts.slice(4).join('_');
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

        // 2. Instant Telegram Announcement Message with Image Banner to Telegram Group (Via Bot API & Green API Telegram Instance)
        const tgAnnounce = 
          `⏰ **සජීවී ප්‍රශ්න පත්‍ර තරඟය Schedule කරන ලදී! (Quiz Scheduled)**\n\n` +
          `📚 **ප්‍රශ්න පත්‍රය:** ${paperData.title}\n` +
          `⏰ **ආරම්භ වන වේලාව:** ${timeLabel}\n\n` +
          `🔔 නියමිත වේලාව පැමිණි සැනින් මෙම Group එක වෙත ප්‍රශ්න පත්‍රය ස්වයංක්‍රීයව ලැබෙනු ඇත!`;

        const tgTarget = getTelegramTargetChat(env, chatId);
        await autoPostToTelegramViaGreenApi(tgAnnounce, paperImgUrl, env);

        const tgPhotoRes = await sendApi('sendPhoto', {
          chat_id: tgTarget,
          photo: paperImgUrl,
          caption: tgAnnounce,
          parse_mode: 'Markdown'
        }, env);

        if (!tgPhotoRes.ok) {
          await sendApi('sendMessage', {
            chat_id: tgTarget,
            text: tgAnnounce,
            parse_mode: 'Markdown'
          }, env);
        }

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
        const hasModel = Object.values(subData.papers).some(p => p.isModel);
        const inlineKb = [
          [{ text: '📑 පසුගිය ප්‍රශ්න පත්‍ර (Past Papers)', callback_data: `cat_${subId}_pp` }]
        ];
        if (hasModel) {
          inlineKb.push([{ text: '🎯 ආදර්ශ / පළාත් ප්‍රශ්න පත්‍ර (Model Papers)', callback_data: `cat_${subId}_mp` }]);
        }
        inlineKb.push([{ text: '⬅️ ප්‍රධාන මෙනුවට (Back)', callback_data: 'nav_subjects' }]);

        const text = `📘 **තෝරාගත් විෂය:** ${subData.name}\n\nකරුණාකර ඔබ සෙවීමට කැමති කාණ්ඩය තෝරන්න:`;
        await sendApi('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: inlineKb }
        }, env);
      }
    } else if (data.startsWith('cat_') && (data.endsWith('_pp') || data.endsWith('_mp'))) {
      const isModelOnly = data.endsWith('_mp');
      const subId = data.replace('cat_', '').replace('_pp', '').replace('_mp', '');
      const subData = QUIZ_DATA[subId];
      if (subData) {
        let keys = Object.keys(subData.papers);
        if (isModelOnly) {
          keys = keys.filter(k => subData.papers[k].isModel);
        } else {
          const pastKeys = keys.filter(k => !subData.papers[k].isModel);
          if (pastKeys.length > 0) keys = pastKeys;
        }

        const keyboard = [];
        let row = [];
        keys.forEach((key, idx) => {
          const paperObj = subData.papers[key];
          const label = paperObj.btnLabel || key;
          row.push({ text: `📝 ${label}`, callback_data: `paper_${subId}_${key}` });
          if (row.length === 2 || idx === keys.length - 1) {
            keyboard.push(row);
            row = [];
          }
        });
        keyboard.push([{ text: '⬅️ ආපසු (Back)', callback_data: `sub_${subId}` }]);

        const catTitle = isModelOnly ? 'ආදර්ශ / පළාත් ප්‍රශ්න පත්‍ර (Model Papers)' : 'පසුගිය ප්‍රශ්න පත්‍ර (Past Papers)';
        await sendApi('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text: `📑 **${subData.shortName} — ${catTitle}**\n\nප්‍රශ්න පත්‍රය තෝරන්න:`,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        }, env);
      }
    } else if (data.startsWith('paper_')) {
      await sendApi('answerCallbackQuery', { callback_query_id: query.id }, env);
      const parts = data.split('_');
      const subId = parts[1];
      const yearKey = parts.slice(2).join('_');
      const subData = QUIZ_DATA[subId];
      const paperData = subData?.papers[yearKey];

      if (paperData) {
        const quizUrl = `${BASE_URL}/${paperData.file}`;
        const imgUrl = `${BASE_URL}/${paperData.img}`;

        const webAppOption = isGroup
          ? { text: '🚀 Open Interactive WebApp (App එක තුළින්)', url: quizUrl }
          : { text: '🚀 Open Interactive WebApp (App එක තුළින්)', web_app: { url: quizUrl } };

        let launchKeyboard;
        let cardText;

        if (paperData.isPart2) {
          launchKeyboard = {
            inline_keyboard: [
              [
                webAppOption
              ],
              [
                { text: '📖 Read Questions & Marking Scheme in Chat', callback_data: `part2_read_${subId}_${yearKey}` }
              ],
              [
                { text: '🌐 Open Browser (Browser එකෙන්)', url: quizUrl }
              ],
              [
                { text: '⬅️ ආපසු (Back)', callback_data: `cat_${subId}_mp` }
              ]
            ]
          };

          cardText = 
            `📜 **${paperData.title}**\n\n` +
            `📚 **විෂය:** ${subData.name}\n` +
            `✍️ **ප්‍රශ්න පත්‍රය:** II පත්‍රය (ව්‍යුහගත හා රචනා ප්‍රශ්න 8ක්)\n` +
            `💡 **විශේෂතා:** සම්පූර්ණ ප්‍රශ්න පත්‍රය සහ නිල පිළිතුරු විග්‍රහය (Marking Scheme) ඇතුළත් වේ.\n\n` +
            `👇 **ඔබ පරීක්ෂණය කිරීමට කැමති ක්‍රමය තෝරන්න:**`;
        } else {
          launchKeyboard = {
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
                { text: '⬅️ ආපසු (Back)', callback_data: `cat_${subId}_pp` }
              ]
            ]
          };

          const mcqCount = paperData.title.includes('MCQ 229') ? 'MCQ 229 (Master Shuffled Bank)' : (paperData.title.includes('MCQ 50') ? 'MCQ 50' : 'MCQ 40');
          cardText = 
            `🎯 **${paperData.title}**\n\n` +
            `📚 **විෂය:** ${subData.name}\n` +
            `📜 **ප්‍රශ්න ගණන:** ${mcqCount}\n` +
            `💡 **විශේෂතා:** සමස්ත විෂය නිර්දේශයම ආවරණය වන පරිදි අහඹු ලෙස මාරු කරන ලද (Shuffled) ප්‍රශ්න 229ක් සහ නිල පිළිතුරු විග්‍රහයන් ඇතුළත් වේ.\n\n` +
            `👇 **ඔබ පරීක්ෂණය කිරීමට කැමති ක්‍රමය තෝරන්න:**`;
        }

        // Primary: Edit current menu message in-place for instant responsive UX
        const editRes = await sendApi('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text: cardText,
          parse_mode: 'Markdown',
          reply_markup: launchKeyboard
        }, env);

        if (!editRes.ok) {
          // Fallback: Send a photo message if edit fails
          await sendApi('sendPhoto', {
            chat_id: chatId,
            photo: imgUrl,
            caption: cardText,
            parse_mode: 'Markdown',
            reply_markup: launchKeyboard
          }, env);
        }
      }
    } else if (data.startsWith('part2_read_')) {
      const parts = data.split('_');
      const subId = parts[2];
      const yearKey = parts.slice(3).join('_');
      await renderPart2Question(chatId, messageId, subId, yearKey, 1, env, query.id, isGroup);
    } else if (data.startsWith('part2_q_')) {
      const parts = data.split('_');
      const subId = parts[2];
      const qIndexStr = parts[parts.length - 1];
      const qIndex = parseInt(qIndexStr, 10) || 1;
      const yearKey = parts.slice(3, parts.length - 1).join('_');
      await renderPart2Question(chatId, messageId, subId, yearKey, qIndex, env, query.id, isGroup);
    } else if (data.startsWith('my_report_')) {
      const parts = data.split('_');
      const subId = parts[2];
      const yearKey = parts.slice(3).join('_');
      const paperKey = `${subId}_${yearKey}`;

      const allStatsMap = await getUserQuizStats(chatId, paperKey);
      const userRecord = allStatsMap[fromId];

      if (!userRecord || userRecord.totalAnswered === 0) {
        await sendApi('answerCallbackQuery', {
          callback_query_id: query.id,
          text: '⚠️ ඔබ මෙම ප්‍රශ්න පත්‍ර තරඟයට සහභාගී වී පිළිතුරු සපයා නොමැත!',
          show_alert: true
        }, env);
        return;
      }

      const totalAns = userRecord.totalAnswered;
      const userScore = userRecord.score;
      const wrongList = userRecord.wrongList || [];

      let wrongText = '';
      if (wrongList.length === 0) {
        wrongText = '🎉 ඔබ සියලුම ප්‍රශ්නවලට 100% නිවැරදි පිළිතුරු සපයා ඇත! (No Errors!)';
      } else {
        const wrongLines = wrongList.slice(0, 10).map(w => `• Q${w.qNum < 10 ? '0' + w.qNum : w.qNum}: ඔබ දුන් පිළිතුර (${w.userAns}) ❌ | නිවැරදි පිළිතුර (${w.correctAns}) ✅`);
        wrongText = `❌ ඔබට වැරදුණු ප්‍රශ්න (${wrongList.length}):\n` + wrongLines.join('\n');
      }

      const personalReport = 
        `📊 ඔබගේ පුද්ගලික ලකුණු සටහන (My Quiz Summary)\n` +
        `👤 නම: ${userRecord.name}\n` +
        `🎯 ලබාගත් ලකුණු: ${userScore} / ${totalAns} (${Math.round((userScore / totalAns) * 100)}%)\n\n` +
        wrongText;

      await sendApi('answerCallbackQuery', {
        callback_query_id: query.id,
        text: personalReport,
        show_alert: true
      }, env);
      return;
    } else if (data.startsWith('native_')) {
      const parts = data.split('_');
      const subId = parts[1];
      const yearKey = parts.slice(2).join('_');
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
          chatId,
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

        // Send first native poll via persistent step streamer
        await sendNextNativePollStep(chatId, paperKey, 0, 0, Date.now(), env);
      }
    }

    await sendApi('answerCallbackQuery', { callback_query_id: query.id }, env);
  }
}
