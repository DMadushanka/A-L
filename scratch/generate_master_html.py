import re, json

file_path = "al-bc-2026-master-shuffled-mcqs.md"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

parts = re.split(r'##\s+II\s+කොටස|\n##\s+Answer\s+Key', text, maxsplit=1)
q_text = parts[0]
a_text = parts[1] if len(parts) > 1 else ""

ans_map = {}
ans_pattern = re.compile(r'####\s*(\d+)\.\s*නිවැරදි\s*පිළිතුර:\s*(\d+)([^\n]*)\n(.*?)(?=\n####|\Z)', re.DOTALL)
for match in ans_pattern.finditer(a_text):
    q_num = int(match.group(1))
    ans_val = int(match.group(2)) - 1
    inline_ans = match.group(3).strip()
    block = match.group(4).strip()
    
    exp_match = re.search(r'\*\s*\*\*විවරණය[^*]*\*\*:\s*(.*)', block, re.DOTALL)
    if exp_match:
        explanation = exp_match.group(1).strip()
        explanation = re.sub(r'^\*\s*', '', explanation).strip()
    else:
        explanation = block.strip()
    
    ans_map[q_num] = {
        "correct": ans_val,
        "explanation": explanation
    }

q_blocks = re.split(r'\n####\s*(\d+)\.\s*', q_text)
questions_list = []

for i in range(1, len(q_blocks), 2):
    q_num = int(q_blocks[i])
    content = q_blocks[i+1]
    
    lines = [line.strip() for line in content.split('\n') if line.strip()]
    if not lines:
        continue
    
    q_title = lines[0]
    
    options = []
    opt_pattern = re.compile(r'^[1-5]\)\s*(.*)')
    for line in lines[1:]:
        m = opt_pattern.match(line)
        if m:
            opt = m.group(1).strip()
            options.append(opt)
    
    ans_info = ans_map.get(q_num, {"correct": 0, "explanation": "නිවැරදි පිළිතුර විවරණය සහිතයි."})
    
    questions_list.append({
        "qNum": q_num,
        "q": f"{q_num:02d}. {q_title}",
        "options": options,
        "correct": ans_info["correct"],
        "explanation": ans_info["explanation"]
    })

print(f"Extracted {len(questions_list)} questions for HTML generation.")

html_content = f"""<!DOCTYPE html>
<html lang="si">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>බෞද්ධ ශිෂ්ටාචාරය 2026 — මාස්ටර් බහුවරණ ප්‍රශ්න බැංකුව (MCQ 229)</title>
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="A/L Past Paper Quiz App">
  <meta property="og:url" content="https://dmadushanka.github.io/A-L/bc2026_master.html">
  <meta property="og:title" content="බෞද්ධ ශිෂ්ටාචාරය 2026 — මාස්ටර් බහුවරණ ප්‍රශ්න බැංකුව MCQ 229">
  <meta property="og:description" content="▶ [ 🚀 බෞද්ධ ශිෂ්ටාචාරය 2026 සමස්ත විෂය නිර්දේශයම ආවරණය වන Master Shuffled MCQ 229 ප්‍රශ්න පත්‍රය ආරම්භ කිරීමට මෙතැන ක්ලික් කරන්න ➔ ]">
  <meta property="og:image" content="https://dmadushanka.github.io/A-L/bc2026_moe.png">
  <meta property="og:image:secure_url" content="https://dmadushanka.github.io/A-L/bc2026_moe.png">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="බෞද්ධ ශිෂ්ටාචාරය 2026 — මාස්ටර් බහුවරණ ප්‍රශ්න බැංකුව MCQ 229">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://dmadushanka.github.io/A-L/bc2026_master.html">
  <meta name="twitter:title" content="බෞද්ධ ශිෂ්ටාචාරය 2026 — මාස්ටර් බහුවරණ ප්‍රශ්න බැංකුව MCQ 229">
  <meta name="twitter:description" content="▶ [ 🚀 බෞද්ධ ශිෂ්ටාචාරය 2026 සමස්ත විෂය නිර්දේශයම ආවරණය වන Master Shuffled MCQ 229 ප්‍රශ්න පත්‍රය ආරම්භ කිරීමට මෙතැන ක්ලික් කරන්න ➔ ]">
  <meta name="twitter:image" content="https://dmadushanka.github.io/A-L/bc2026_moe.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Sinhala:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg-dark: #09120c;
      --bg-card: rgba(18, 36, 24, 0.88);
      --bg-card-solid: #122418;
      --border-card: rgba(16, 185, 129, 0.28);
      
      --emerald-primary: #10b981;
      --emerald-light: #d1fae5;
      --emerald-glow: rgba(16, 185, 129, 0.45);

      --amber-accent: #f59e0b;
      --amber-glow: rgba(245, 158, 11, 0.35);

      --good: #10b981;
      --good-soft: #34d399;
      --good-bg: rgba(16, 185, 129, 0.16);

      --bad: #f43f5e;
      --bad-soft: #fb7185;
      --bad-bg: rgba(244, 63, 94, 0.16);

      --text-main: #f0fdf4;
      --text-muted: #94a3b8;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      font-family: 'Plus Jakarta Sans', 'Noto Serif Sinhala', serif;
      background: radial-gradient(circle at 50% 0%, #153220 0%, var(--bg-dark) 75%);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem 1rem 3rem;
      overflow-x: hidden;
    }}

    .container {{
      width: 100%;
      max-width: 880px;
    }}

    .header-card {{
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      backdrop-filter: blur(16px);
      border-radius: 20px;
      padding: 1.8rem 1.5rem;
      text-align: center;
      margin-bottom: 1.8rem;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
      position: relative;
      overflow: hidden;
    }}

    .header-card::before {{
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
      background: linear-gradient(90deg, #10b981, #f59e0b, #3b82f6, #10b981);
      background-size: 300% 100%;
      animation: gradientFlow 6s linear infinite;
    }}

    @keyframes gradientFlow {{
      0% {{ background-position: 0% 0%; }}
      100% {{ background-position: 300% 0%; }}
    }}

    .badge-bar {{
      display: flex;
      justify-content: center;
      gap: 0.6rem;
      flex-wrap: wrap;
      margin-bottom: 0.8rem;
    }}

    .badge {{
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid var(--emerald-primary);
      color: #6ee7b7;
      padding: 0.35rem 0.9rem;
      border-radius: 50px;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }}

    .title {{
      font-size: 1.6rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 0.6rem;
      line-height: 1.4;
    }}

    .subtitle {{
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.6;
    }}

    .stats-bar {{
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.8rem;
      margin-top: 1.2rem;
    }}

    .stat-box {{
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 0.8rem 0.5rem;
      text-align: center;
    }}

    .stat-val {{
      font-size: 1.4rem;
      font-weight: 800;
      color: #34d399;
    }}

    .stat-lbl {{
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.2rem;
    }}

    .q-card {{
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 20px;
      padding: 1.8rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
      position: relative;
    }}

    .q-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.2rem;
      padding-bottom: 0.8rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }}

    .q-num-badge {{
      background: linear-gradient(135deg, var(--emerald-primary), #059669);
      color: #fff;
      padding: 0.35rem 0.8rem;
      border-radius: 8px;
      font-weight: 800;
      font-size: 0.9rem;
    }}

    .q-text {{
      font-size: 1.12rem;
      font-weight: 700;
      line-height: 1.65;
      color: #ffffff;
      margin-bottom: 1.4rem;
    }}

    .options-grid {{
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
    }}

    .opt-btn {{
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 1rem 1.2rem;
      color: var(--text-main);
      font-family: inherit;
      font-size: 0.98rem;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.8rem;
      line-height: 1.5;
    }}

    .opt-btn:hover:not(:disabled) {{
      background: rgba(16, 185, 129, 0.12);
      border-color: var(--emerald-primary);
      transform: translateX(4px);
    }}

    .opt-btn.correct {{
      background: var(--good-bg) !important;
      border-color: var(--good) !important;
      color: var(--good-soft) !important;
      font-weight: 700;
    }}

    .opt-btn.wrong {{
      background: var(--bad-bg) !important;
      border-color: var(--bad) !important;
      color: var(--bad-soft) !important;
    }}

    .exp-box {{
      margin-top: 1.2rem;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-left: 4px solid #3b82f6;
      border-radius: 12px;
      padding: 1.2rem;
      display: none;
      animation: fadeIn 0.3s ease;
    }}

    .exp-box.show {{
      display: block;
    }}

    .exp-title {{
      font-size: 0.9rem;
      font-weight: 800;
      color: #60a5fa;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }}

    .exp-text {{
      font-size: 0.92rem;
      line-height: 1.6;
      color: #cbd5e1;
    }}

    .controls-bar {{
      display: flex;
      justify-content: space-between;
      gap: 0.8rem;
      margin-top: 1.5rem;
      flex-wrap: wrap;
    }}

    .nav-btn {{
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
      padding: 0.75rem 1.4rem;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.92rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }}

    .nav-btn:hover:not(:disabled) {{
      background: rgba(16, 185, 129, 0.2);
      border-color: var(--emerald-primary);
    }}

    .nav-btn:disabled {{
      opacity: 0.3;
      cursor: not-allowed;
    }}

    .pager-select {{
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border-card);
      color: #fff;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      font-family: inherit;
      font-weight: 700;
      font-size: 0.9rem;
    }}

    @keyframes fadeIn {{
      from {{ opacity: 0; transform: translateY(6px); }}
      to {{ opacity: 1; transform: translateY(0); }}
    }}
  </style>
</head>

<body>
  <div class="container">
    <div class="header-card">
      <div class="badge-bar">
        <span class="badge">☸️ A/L BUDDHIST CIV</span>
        <span class="badge">🔥 MASTER MCQ BANK</span>
        <span class="badge">🎯 229 QUESTIONS</span>
      </div>
      <h1 class="title">බෞද්ධ ශිෂ්ටාචාරය 2026 — මාස්ටර් බහුවරණ ප්‍රශ්න බැංකුව</h1>
      <p class="subtitle">සමස්ත විෂය නිර්දේශයම ආවරණය වන පරිදි අහඹු ලෙස මාරු කරන ලද (Shuffled) ප්‍රශ්න 229ක් සහ නිල පිළිතුරු විග්‍රහය (Detailed Explanations)</p>
      
      <div class="stats-bar">
        <div class="stat-box">
          <div class="stat-val" id="statScore">0 / 0</div>
          <div class="stat-lbl">ලකුණු සංඛ්‍යාව</div>
        </div>
        <div class="stat-box">
          <div class="stat-val" id="statProgress">1 / 229</div>
          <div class="stat-lbl">ප්‍රශ්න අංකය</div>
        </div>
        <div class="stat-box">
          <div class="stat-val" id="statPercent">0%</div>
          <div class="stat-lbl">ප්‍රතිශතය</div>
        </div>
      </div>
    </div>

    <div class="q-card" id="quizContainer">
      <!-- Dynamic Question Content -->
    </div>

    <div class="controls-bar">
      <button class="nav-btn" id="prevBtn" onclick="prevQ()">◀️ පසුපසට</button>
      <select class="pager-select" id="pagerSelect" onchange="jumpToQ(this.value)">
        <!-- Options generated dynamically -->
      </select>
      <button class="nav-btn" id="nextBtn" onclick="nextQ()">ඊළඟට ▶️</button>
    </div>
  </div>

  <script>
    const QUESTIONS = {json.dumps(questions_list, ensure_ascii=False)};

    let currentIdx = 0;
    let userAnswers = {{}};
    let score = 0;

    function initQuiz() {{
      const select = document.getElementById('pagerSelect');
      select.innerHTML = '';
      QUESTIONS.forEach((q, idx) => {{
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `ප්‍රශ්නය ${{idx + 1}} / ${{QUESTIONS.length}}`;
        select.appendChild(opt);
      }});
      renderQuestion();
    }}

    function renderQuestion() {{
      const qData = QUESTIONS[currentIdx];
      const container = document.getElementById('quizContainer');
      const userAns = userAnswers[currentIdx];
      const isAnswered = userAns !== undefined;

      document.getElementById('statProgress').textContent = `${{currentIdx + 1}} / ${{QUESTIONS.length}}`;
      document.getElementById('pagerSelect').value = currentIdx;

      document.getElementById('prevBtn').disabled = currentIdx === 0;
      document.getElementById('nextBtn').disabled = currentIdx === QUESTIONS.length - 1;

      let optionsHtml = '';
      const optLabels = ['(1)', '(2)', '(3)', '(4)', '(5)'];
      
      qData.options.forEach((optText, optIdx) => {{
        let extraClass = '';
        if (isAnswered) {{
          if (optIdx === qData.correct) {{
            extraClass = 'correct';
          }} else if (optIdx === userAns) {{
            extraClass = 'wrong';
          }}
        }}

        optionsHtml += `
          <button class="opt-btn ${{extraClass}}" 
                  ${{isAnswered ? 'disabled' : ''}} 
                  onclick="selectOption(${{optIdx}})">
            <span style="font-weight:800;">${{optLabels[optIdx] || optIdx + 1}}</span>
            <span>${{optText}}</span>
          </button>
        `;
      }});

      let expHtml = '';
      if (isAnswered) {{
        expHtml = `
          <div class="exp-box show">
            <div class="exp-title">💡 නිල පිළිතුරු විග්‍රහය (Marking Scheme & Academic Explanation):</div>
            <div class="exp-text">${{qData.explanation}}</div>
          </div>
        `;
      }}

      container.innerHTML = `
        <div class="q-header">
          <span class="q-num-badge">ප්‍රශ්නය ${{currentIdx + 1}} / ${{QUESTIONS.length}}</span>
        </div>
        <div class="q-text">${{qData.q}}</div>
        <div class="options-grid">
          ${{optionsHtml}}
        </div>
        ${{expHtml}}
      `;
    }}

    function selectOption(optIdx) {{
      if (userAnswers[currentIdx] !== undefined) return;
      
      userAnswers[currentIdx] = optIdx;
      if (optIdx === QUESTIONS[currentIdx].correct) {{
        score++;
      }}
      
      updateStats();
      renderQuestion();
    }}

    function updateStats() {{
      const answeredCount = Object.keys(userAnswers).length;
      document.getElementById('statScore').textContent = `${{score}} / ${{answeredCount}}`;
      const pct = answeredCount > 0 ? Math.round((score / answeredCount) * 100) : 0;
      document.getElementById('statPercent').textContent = `${{pct}}%`;
    }}

    function prevQ() {{
      if (currentIdx > 0) {{
        currentIdx--;
        renderQuestion();
      }}
    }}

    function nextQ() {{
      if (currentIdx < QUESTIONS.length - 1) {{
        currentIdx++;
        renderQuestion();
      }}
    }}

    function jumpToQ(idxStr) {{
      currentIdx = parseInt(idxStr, 10);
      renderQuestion();
    }}

    window.onload = initQuiz;
  </script>
</body>
</html>
"""

with open("bc2026_master.html", "w", encoding="utf-8") as f:
    f.write(html_content)

print("bc2026_master.html successfully generated!")
