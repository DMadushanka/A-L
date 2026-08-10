import os
import sys
import re
import base64
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

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

def build_pdf_html(topic_title, raw_content, logo_base64=""):
    sanitized_title = sanitize_text_for_pdf(topic_title) or "උසස් පෙළ අධ්‍යයන සටහන"
    date_str = datetime.now().strftime('%Y-%m-%d')

    lines = raw_content.split('\n')
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

    content_html = "\n".join(body_html_parts)

    logo_img_tag = f"<img src='{logo_base64}' class='logo-img'/>" if logo_base64 else "<div class='logo-placeholder'>🎓</div>"

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
            font-size: 10.5pt;
            line-height: 1.65;
        }}

        /* Header Card */
        .header-card {{
            background: linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%);
            border-radius: 10px;
            padding: 16px 20px;
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }}

        .header-left {{
            display: flex;
            align-items: center;
            gap: 14px;
        }}

        .logo-img {{
            width: 52px;
            height: 52px;
            border-radius: 8px;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }}

        .header-title-box {{
            display: flex;
            flex-direction: column;
        }}

        .main-brand {{
            font-size: 15pt;
            font-weight: 700;
            letter-spacing: 0.3px;
            color: #FFFFFF;
            margin: 0;
        }}

        .sub-brand {{
            font-size: 9.5pt;
            color: #93C5FD;
            margin-top: 2px;
        }}

        .header-meta {{
            text-align: right;
            font-size: 9pt;
            color: #E0E7FF;
            background: rgba(255, 255, 255, 0.1);
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.15);
        }}

        /* Section Title Cards */
        .section-card {{
            background-color: #EFF6FF;
            border-left: 4px solid #2563EB;
            border-radius: 4px 8px 8px 4px;
            padding: 8px 14px;
            margin-top: 16px;
            margin-bottom: 10px;
            page-break-after: avoid;
        }}

        .section-title {{
            font-size: 12pt;
            font-weight: 700;
            color: #1E40AF;
        }}

        /* Paragraphs & Lists */
        .paragraph {{
            margin: 0 0 8px 0;
            text-align: justify;
        }}

        .bullet {{
            margin: 0 0 5px 14px;
        }}

        .sub-bullet {{
            margin: 0 0 4px 28px;
            color: #374151;
        }}

        /* Callout Box / Example Box */
        .callout-box {{
            background-color: #ECFDF5;
            border-left: 4px solid #10B981;
            border-radius: 4px 8px 8px 4px;
            padding: 10px 14px;
            margin: 10px 0 12px 0;
            color: #065F46;
            font-size: 10pt;
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
            margin: 14px 0;
        }}
    </style>
</head>
<body>
    <div class="header-card">
        <div class="header-left">
            {logo_img_tag}
            <div class="header-title-box">
                <div class="main-brand">A/L MCQ HUB AI TUTOR</div>
                <div class="sub-brand">උසස් පෙළ විෂය කරුණු සහ අධ්‍යයන සටහන (G.C.E. A/L Study Note)</div>
            </div>
        </div>
        <div class="header-meta">
            <div><b>මාතෘකාව:</b> {sanitized_title}</div>
            <div>🗓️ {date_str}</div>
        </div>
    </div>

    <div class="content-body">
        {content_html}
    </div>
</body>
</html>
"""
    return html_template

def generate_pdf_study_note(topic_title, raw_content, output_path):
    # Encode logo image to base64
    logo_base64 = ""
    possible_logos = ['our_logo.png', 'c:/bak/projects/AL BC/A-L-main/our_logo.png', 'logo.png']
    for lp in possible_logos:
        if os.path.exists(lp):
            with open(lp, "rb") as f:
                encoded = base64.b64encode(f.read()).decode('utf-8')
                logo_base64 = f"data:image/png;base64,{encoded}"
            break

    html_content = build_pdf_html(topic_title, raw_content, logo_base64)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_content(html_content, wait_until="load", timeout=15000)
        
        page.pdf(
            path=output_path,
            format="A4",
            margin={
                "top": "14mm",
                "bottom": "16mm",
                "left": "12mm",
                "right": "12mm"
            },
            print_background=True,
            display_header_footer=True,
            footer_template="""
                <div style="font-family: 'Noto Sans Sinhala', 'Nirmala UI', sans-serif; font-size: 8pt; color: #6B7280; width: 100%; padding: 0 12mm; display: flex; justify-content: space-between;">
                    <span>📚 Generated by A/L MCQ HUB AI Tutor | Telegram: @AL_MCQbot</span>
                    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
                </div>
            """,
            header_template="<div></div>"
        )
        browser.close()

    return output_path

if __name__ == '__main__':
    if len(sys.argv) >= 4:
        title = sys.argv[1]
        text_file = sys.argv[2]
        out_pdf = sys.argv[3]
        
        with open(text_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        generate_pdf_study_note(title, content, out_pdf)
        print(f"SUCCESS: Playwright PDF created at {out_pdf}")
    else:
        print("Usage: python generate_pdf_note.py <topic_title> <text_file_path> <output_pdf_path>")
