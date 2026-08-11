import os
import sys
import re
import base64
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

SUBJECT_THEMES = {
    'si': {
        'subject_name': 'සිංහල (Sinhala)',
        'header_gradient': 'linear-gradient(135deg, #065F46 0%, #047857 100%)',
        'border_color': '#047857',
        'section_bg': '#ECFDF5',
        'section_border': '#10B981',
        'section_title': '#065F46',
        'callout_bg': '#F0FDF4',
        'callout_border': '#22C55E',
        'callout_text': '#14532D',
        'sub_bullet_color': '#047857',
        'tg_card_bg': '#F0FDF4',
        'tg_card_border': '#10B981',
        'tg_link_color': '#059669',
        'sub_brand_color': '#A7F3D0',
        'meta_bg': 'rgba(255, 255, 255, 0.15)',
        'meta_border': 'rgba(255, 255, 255, 0.25)'
    },
    'bc': {
        'subject_name': 'බෞද්ධ ශිෂ්ටාචාරය (Buddhist Civilization)',
        'header_gradient': 'linear-gradient(135deg, #7C2D12 0%, #9A3412 100%)',
        'border_color': '#9A3412',
        'section_bg': '#FFF7ED',
        'section_border': '#F97316',
        'section_title': '#7C2D12',
        'callout_bg': '#FEF3C7',
        'callout_border': '#F59E0B',
        'callout_text': '#78350F',
        'sub_bullet_color': '#9A3412',
        'tg_card_bg': '#FFF7ED',
        'tg_card_border': '#F97316',
        'tg_link_color': '#EA580C',
        'sub_brand_color': '#FDE68A',
        'meta_bg': 'rgba(255, 255, 255, 0.15)',
        'meta_border': 'rgba(255, 255, 255, 0.25)'
    },
    'hi': {
        'subject_name': 'ඉතිහාසය (History)',
        'header_gradient': 'linear-gradient(135deg, #881337 0%, #9F1239 100%)',
        'border_color': '#881337',
        'section_bg': '#FFF1F2',
        'section_border': '#E11D48',
        'section_title': '#881337',
        'callout_bg': '#FFE4E6',
        'callout_border': '#F43F5E',
        'callout_text': '#4C0519',
        'sub_bullet_color': '#881337',
        'tg_card_bg': '#FFF1F2',
        'tg_card_border': '#E11D48',
        'tg_link_color': '#E11D48',
        'sub_brand_color': '#FECDD3',
        'meta_bg': 'rgba(255, 255, 255, 0.15)',
        'meta_border': 'rgba(255, 255, 255, 0.25)'
    },
    'pl': {
        'subject_name': 'දේශපාලන විද්‍යාව (Political Science)',
        'header_gradient': 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
        'border_color': '#1E3A8A',
        'section_bg': '#EFF6FF',
        'section_border': '#2563EB',
        'section_title': '#1E40AF',
        'callout_bg': '#EEF2FF',
        'callout_border': '#6366F1',
        'callout_text': '#312E81',
        'sub_bullet_color': '#1E40AF',
        'tg_card_bg': '#EFF6FF',
        'tg_card_border': '#2563EB',
        'tg_link_color': '#2563EB',
        'sub_brand_color': '#93C5FD',
        'meta_bg': 'rgba(255, 255, 255, 0.15)',
        'meta_border': 'rgba(255, 255, 255, 0.25)'
    },
    'bs': {
        'subject_name': 'ව්‍යාපාර අධ්‍යයනය (Business Studies)',
        'header_gradient': 'linear-gradient(135deg, #134E4A 0%, #0F766E 100%)',
        'border_color': '#0F766E',
        'section_bg': '#F0FDFA',
        'section_border': '#14B8A6',
        'section_title': '#134E4A',
        'callout_bg': '#ECFEFF',
        'callout_border': '#06B6D4',
        'callout_text': '#164E63',
        'sub_bullet_color': '#0F766E',
        'tg_card_bg': '#F0FDFA',
        'tg_card_border': '#14B8A6',
        'tg_link_color': '#0D9488',
        'sub_brand_color': '#99F6E4',
        'meta_bg': 'rgba(255, 255, 255, 0.15)',
        'meta_border': 'rgba(255, 255, 255, 0.25)'
    }
}

def resolve_theme(subject_code, topic_title, text_content):
    sub = (subject_code or '').strip().lower()
    if sub in ['si', 'sin', 'sinhala']:
        return SUBJECT_THEMES['si']
    if sub in ['bc', 'buddhist', 'buddhist_civilization']:
        return SUBJECT_THEMES['bc']
    if sub in ['hi', 'hist', 'history']:
        return SUBJECT_THEMES['hi']
    if sub in ['pl', 'pol', 'political']:
        return SUBJECT_THEMES['pl']
    if sub in ['bs', 'bus', 'business']:
        return SUBJECT_THEMES['bs']

    # Auto-detect subject from text & title
    combined = (str(topic_title) + " " + str(text_content)).lower()
    if any(k in combined for k in ['සිංහල', 'සන්ධි', 'සමාස', 'කාව්‍ය', 'ව්‍යාකරණ', 'නවකතාව', 'බැද්දේගම']):
        return SUBJECT_THEMES['si']
    if any(k in combined for k in ['බෞද්ධ', 'ශිෂ්ටාචාරය', 'සංගායනා', 'තෙරවාද', 'මහින්දාගමනය', 'නිකාය', 'ධර්ම', 'බුද්ධ']):
        return SUBJECT_THEMES['bc']
    if any(k in combined for k in ['ඉතිහාසය', 'අනුරාධපුර', 'පොළොන්නරුව', 'රාජධානිය', 'යුගය', 'මහවැලි']):
        return SUBJECT_THEMES['hi']
    if any(k in combined for k in ['දේශපාලන', 'ආණ්ඩුක්‍රම', 'ජනමාධ්‍ය', 'පාලන', 'ව්‍යවස්ථාව']):
        return SUBJECT_THEMES['pl']
    if any(k in combined for k in ['ව්‍යාපාර', 'කළමනාකරණ', 'ගිණුම්', 'ආර්ථික']):
        return SUBJECT_THEMES['bs']

    return SUBJECT_THEMES['pl']

def sanitize_text_for_pdf(text):
    if not text:
        return ""
    
    t = text

    # 1. Clean LaTeX arrow expressions (e.g. \\(\rightarrow\\), \rightarrow, \implies)
    t = re.sub(r'\\\\?\(\s*\\?rightarrow\s*\\\\?\)', ' → ', t)
    t = re.sub(r'\\\\?\(\s*\\?implies\s*\\\\?\)', ' ⇒ ', t)
    t = re.sub(r'\\?rightarrow', ' → ', t)
    t = re.sub(r'\\?implies', ' ⇒ ', t)
    t = re.sub(r'\\\\?\([^\)]*\\\\?\)', '', t)
    
    # 2. Strip NotebookLM citation tags [1], [1, 2]
    t = re.sub(r'\[\d+(?:\s*,\s*\d+|-?\d+)*\]', '', t)
    
    # 3. Clean up raw double slashes \\
    t = t.replace('\\\\', '').replace('\\', '')

    # 4. Clean up multiple spaces & dots
    t = re.sub(r'[ \t]{2,}', ' ', t)
    t = t.replace(' .', '.').replace(' ,', ',')

    # 5. Convert Markdown bold **text** or __text__ to <b>text</b>
    t = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'__(.*?)__', r'<b>\1</b>', t)

    # 6. Convert Markdown italic *text* to <i>text</i>
    t = re.sub(r'(?<!\w)\*([^\*\n]+)\*(?!\w)', r'<i>\1</i>', t)

    return t.strip()

def remove_ending_followup_captions(text):
    if not text:
        return ""
    
    lines = text.strip().split('\n')
    for _ in range(2):
        if not lines:
            break
        last_line = lines[-1].strip()
        if not last_line:
            lines.pop()
            continue
        
        is_followup = bool(re.search(r'(?:දෙන්නද|බලමු\s*ද|කරමු\s*ද|කැමති\s*ද|දන්නද|ද)\??\s*$', last_line, re.IGNORECASE)) and \
                      bool(re.search(r'(?:සකස්|සාකච්ඡා|විමසා|කතා|අධ්‍යයනය|පැහැදිලි|දැන|ලබා|ඊළඟට)', last_line, re.IGNORECASE))
        is_divider = bool(re.match(r'^[━─_-]{3,}$', last_line))
        
        if is_followup or is_divider:
            lines.pop()
        else:
            break

    return '\n'.join(lines).strip()

def build_pdf_html(topic_title, raw_content, logo_base64="", subject_code="auto"):
    theme = resolve_theme(subject_code, topic_title, raw_content)
    clean_raw = remove_ending_followup_captions(raw_content)
    sanitized_title = sanitize_text_for_pdf(topic_title) or "උසස් පෙළ අධ්‍යයන සටහන"
    date_str = datetime.now().strftime('%Y-%m-%d')

    lines = clean_raw.split('\n')
    body_html_parts = []
    
    in_example_block = False
    example_items = []

    def flush_example_block():
        nonlocal example_items
        if not example_items:
            return
        items_html = "".join([f"<div class='example-item'>{item}</div>" for item in example_items])
        body_html_parts.append(f"<div class='callout-box'>{items_html}</div>")
        example_items = []

    for line in lines:
        raw_line = line.strip()
        if not raw_line:
            if in_example_block:
                flush_example_block()
                in_example_block = False
            continue

        clean_l = sanitize_text_for_pdf(raw_line)
        if not clean_l:
            continue

        # Convert Headers (### or 📌) into Styled Card Headers
        if raw_line.startswith('###') or raw_line.startswith('##') or raw_line.startswith('📌') or raw_line.startswith('#'):
            if in_example_block:
                flush_example_block()
                in_example_block = False

            title_text = re.sub(r'^[#📌\s*]+', '', clean_l).strip()
            if title_text:
                body_html_parts.append(f"<div class='section-card'><div class='section-title'>📌 {title_text}</div></div>")
            continue

        # Convert Horizontal Dividers (---, ___, ━━━━)
        if re.match(r'^[-\*_]{3,}$', raw_line) or '━━━━' in raw_line or '────' in raw_line:
            if in_example_block:
                flush_example_block()
                in_example_block = False
            body_html_parts.append("<hr class='divider'/>")
            continue

        # Detect Examples / Callout Boxes (👉 or නිදසුන්: or උදාහරණ:)
        if '👉' in raw_line or 'නිදසුන්:' in raw_line or 'උදාහරණ:' in raw_line:
            in_example_block = True
            example_items.append(clean_l)
            continue

        if in_example_block:
            if raw_line.startswith('•') or raw_line.startswith('*') or raw_line.startswith('-') or raw_line.startswith('▸'):
                example_items.append(clean_l)
                continue
            else:
                flush_example_block()
                in_example_block = False

        # Convert Nested Sub-bullets (   ▸ or * *)
        if raw_line.startswith('▸') or raw_line.startswith('   ▸') or raw_line.startswith('* *') or raw_line.startswith('- -'):
            bullet_text = re.sub(r'^[▸\*\-\s]+', '', clean_l)
            body_html_parts.append(f"<div class='sub-bullet'>▸ {bullet_text}</div>")
            continue

        # Convert Top-level Bullets (• or * or -)
        if raw_line.startswith('•') or raw_line.startswith('*') or raw_line.startswith('-'):
            bullet_text = re.sub(r'^[•\*\-\s]+', '', clean_l)
            body_html_parts.append(f"<div class='bullet'>• {bullet_text}</div>")
            continue

        # Standard Paragraph
        body_html_parts.append(f"<p class='paragraph'>{clean_l}</p>")

    if in_example_block:
        flush_example_block()

    # Add Clickable Telegram Group Join Card at the bottom of the PDF note
    body_html_parts.append("""
        <div class="telegram-join-card">
            📢 <b>අපගේ A/L MCQ HUB Telegram සජීවී අධ්‍යයන සමූහයට එක්වන්න:</b><br/>
            <a href="https://t.me/+wZUSJyEncD1mYjFl" target="_blank" class="tg-link">👉 මෙතැනින් Click කර Telegram Group එකට Join වන්න (https://t.me/+wZUSJyEncD1mYjFl)</a>
        </div>
    """)

    content_html = "\n".join(body_html_parts)

    logo_img_tag = f"<img src='{logo_base64}' class='logo-img'/>" if logo_base64 else "<div class='logo-placeholder'>🎓</div>"
    watermark_html = f"<div class='watermark'><img src='{logo_base64}' class='watermark-img'/></div>" if logo_base64 else ""

    html_template = f"""<!DOCTYPE html>
<html lang="si">
<head>
    <meta charset="UTF-8">
    <title>{sanitized_title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;500;600;700&display=swap');

        * {{
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}

        body {{
            font-family: 'Noto Sans Sinhala', 'Nirmala UI', 'Iskoola Pota', 'Segoe UI', sans-serif;
            color: #1F2937;
            background-color: #FFFFFF;
            margin: 0;
            padding: 0;
            font-size: 9.8pt;
            line-height: 1.58;
            position: relative;
        }}

        /* Outer Page Border Frame (stays inside Playwright print margins, no bleed) */
        .page-border-frame {{
            position: fixed;
            top: 2mm;
            bottom: 2mm;
            left: 2mm;
            right: 2mm;
            border: 3px double {theme['border_color']};
            border-radius: 6px;
            pointer-events: none;
            z-index: 999;
        }}

        /* Content Container */
        .content-wrapper {{
            padding: 4px 8px;
            position: relative;
        }}

        /* Center Transparent Watermark Logo */
        .watermark {{
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 320px;
            height: 340px;
            opacity: 0.06;
            z-index: -1000;
            pointer-events: none;
        }}

        .watermark-img {{
            width: 100%;
            height: 100%;
            object-fit: contain;
        }}

        /* Subject Header Card */
        .header-card {{
            background: {theme['header_gradient']};
            border-radius: 8px;
            padding: 12px 16px;
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            margin-bottom: 14px;
            page-break-inside: avoid;
            break-inside: avoid;
        }}

        .header-left {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}

        .logo-img {{
            width: 46px;
            height: 46px;
            border-radius: 6px;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }}

        .header-title-box {{
            display: flex;
            flex-direction: column;
        }}

        .main-brand {{
            font-size: 13.5pt;
            font-weight: 700;
            letter-spacing: 0.3px;
            color: #FFFFFF;
            margin: 0;
        }}

        .sub-brand {{
            font-size: 8.8pt;
            color: {theme['sub_brand_color']};
            margin-top: 2px;
            font-weight: 500;
        }}

        .header-meta {{
            text-align: right;
            font-size: 8.5pt;
            color: #FFFFFF;
            background: {theme['meta_bg']};
            padding: 5px 10px;
            border-radius: 6px;
            border: 1px solid {theme['meta_border']};
        }}

        .header-meta a {{
            color: #FFFFFF;
            text-decoration: underline;
            font-weight: 600;
        }}

        /* Section Title Cards */
        .section-card {{
            background-color: {theme['section_bg']};
            border-left: 4.5px solid {theme['section_border']};
            border-radius: 4px 8px 8px 4px;
            padding: 6px 12px;
            margin-top: 14px;
            margin-bottom: 8px;
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: avoid;
            break-after: avoid;
        }}

        .section-title {{
            font-size: 11pt;
            font-weight: 700;
            color: {theme['section_title']};
        }}

        /* Paragraphs & Lists */
        .paragraph {{
            margin: 0 0 8px 0;
            text-align: justify;
            page-break-inside: avoid;
            break-inside: avoid;
        }}

        .bullet {{
            margin: 0 0 5px 12px;
            page-break-inside: avoid;
            break-inside: avoid;
        }}

        .sub-bullet {{
            margin: 0 0 4px 24px;
            color: {theme['sub_bullet_color']};
            font-weight: 500;
            page-break-inside: avoid;
            break-inside: avoid;
        }}

        /* Callout Box / Example Box */
        .callout-box {{
            background-color: {theme['callout_bg']};
            border-left: 4px solid {theme['callout_border']};
            border-radius: 4px 8px 8px 4px;
            padding: 8px 12px;
            margin: 8px 0 10px 0;
            color: {theme['callout_text']};
            font-size: 9.5pt;
            page-break-inside: avoid;
            break-inside: avoid;
        }}

        .example-item {{
            margin-bottom: 4px;
        }}

        .example-item:last-child {{
            margin-bottom: 0;
        }}

        .divider {{
            border: 0;
            height: 1px;
            background-color: #E5E7EB;
            margin: 12px 0;
        }}

        /* Clickable Telegram Join Card */
        .telegram-join-card {{
            background-color: {theme['tg_card_bg']};
            border: 1.5px dashed {theme['tg_card_border']};
            border-radius: 8px;
            padding: 10px 14px;
            margin-top: 16px;
            margin-bottom: 12px;
            text-align: center;
            font-size: 9pt;
            color: #1E293B;
            page-break-inside: avoid;
            break-inside: avoid;
        }}

        .tg-link {{
            color: {theme['tg_link_color']};
            font-weight: 700;
            text-decoration: underline;
            font-size: 9.5pt;
        }}
    </style>
</head>
<body>
    <div class="page-border-frame"></div>

    <div class="content-wrapper">
        {watermark_html}

        <div class="header-card">
            <div class="header-left">
                {logo_img_tag}
                <div class="header-title-box">
                    <div class="main-brand">A/L MCQ HUB AI TUTOR</div>
                    <div class="sub-brand">උසස් පෙළ {theme['subject_name']} අධ්‍යයන සටහන</div>
                </div>
            </div>
            <div class="header-meta">
                <div><b>මාතෘකාව:</b> {sanitized_title}</div>
                <div>🔗 <a href="https://t.me/+wZUSJyEncD1mYjFl" target="_blank">Telegram Group Join</a></div>
                <div>🗓️ {date_str}</div>
            </div>
        </div>

        <div class="content-body">
            {content_html}
        </div>
    </div>
</body>
</html>
"""
    return html_template

def generate_pdf_study_note(topic_title, raw_content, output_path, subject_code="auto"):
    theme = resolve_theme(subject_code, topic_title, raw_content)
    
    # Encode logo image to base64
    logo_base64 = ""
    possible_logos = ['our_logo.png', 'c:/bak/projects/AL BC/A-L-main/our_logo.png', 'logo.png']
    for lp in possible_logos:
        if os.path.exists(lp):
            with open(lp, "rb") as f:
                encoded = base64.b64encode(f.read()).decode('utf-8')
                logo_base64 = f"data:image/png;base64,{encoded}"
            break

    html_content = build_pdf_html(topic_title, raw_content, logo_base64, subject_code=subject_code)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_content(html_content, wait_until="load", timeout=15000)
        
        page.pdf(
            path=output_path,
            format="A4",
            margin={
                "top": "18mm",
                "bottom": "22mm",
                "left": "14mm",
                "right": "14mm"
            },
            print_background=True,
            display_header_footer=True,
            footer_template=f"""
                <div style="font-family: 'Noto Sans Sinhala', 'Nirmala UI', sans-serif; font-size: 8pt; color: #4B5563; width: 100%; padding: 0 14mm; margin-bottom: 1.5mm; display: flex; justify-content: space-between; align-items: center;">
                    <span>🎓 <b>A/L MCQ HUB AI Tutor ({theme['subject_name']})</b> | <a href="https://t.me/+wZUSJyEncD1mYjFl" style="color: {theme['border_color']}; text-decoration: underline;">Telegram Group Join</a></span>
                    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
                </div>
            """,
            header_template="<div></div>"
        )
        browser.close()

    return output_path

if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) >= 4:
        title = sys.argv[1]
        text_file = sys.argv[2]
        out_pdf = sys.argv[3]
        sub_code = sys.argv[4] if len(sys.argv) >= 5 else "auto"
        
        with open(text_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        generate_pdf_study_note(title, content, out_pdf, subject_code=sub_code)
        print("SUCCESS: Playwright PDF created successfully")
    else:
        print("Usage: python generate_pdf_note.py <topic_title> <text_file_path> <output_pdf_path> [subject_code]")
