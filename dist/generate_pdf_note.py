# -*- coding: utf-8 -*-
import os
import sys
import re
import base64
import subprocess
from io import BytesIO
from datetime import datetime
from pathlib import Path
def ensure_pdf_dependencies():
    missing = []
    try:
        import playwright
    except ImportError:
        missing.append("playwright")
    try:
        import pypdf
    except ImportError:
        missing.append("pypdf")
    try:
        import reportlab
    except ImportError:
        missing.append("reportlab")

    if missing:
        print(f"[SETUP] Missing PDF packages ({', '.join(missing)}). Installing automatically...", file=sys.stderr, flush=True)
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", *missing, "--quiet"])
            if "playwright" in missing:
                subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium", "--quiet"])
        except Exception as e:
            print(f"ERROR: Failed to auto-install PDF dependencies: {e}", file=sys.stderr, flush=True)

ensure_pdf_dependencies()

def ensure_playwright_installed():
    pass

from playwright.sync_api import sync_playwright
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
import json
import zlib
import urllib.request
import hashlib

def split_into_balanced_lines(text, max_chars=14):
    """
    Non-recursive, robust line wrapper for Sinhala & English diagram text.
    Guarantees no RecursionError and handles slashes, commas, and long words cleanly.
    """
    text = text.strip()
    if not text:
        return []

    if len(text) <= max_chars:
        return [text]

    # If it contains " / ", process each part cleanly
    if " / " in text:
        parts = text.split(" / ")
        final_lines = []
        for i, p in enumerate(parts):
            p = p.strip()
            if not p:
                continue
            p_lines = split_into_balanced_lines(p, max_chars)
            if i > 0 and p_lines:
                p_lines[0] = f"/ {p_lines[0]}"
            final_lines.extend(p_lines)
        return final_lines

    # Tokenize by whitespace while preserving punctuation attached to words
    words = text.split()
    if not words:
        return [text]

    lines = []
    cur_line = ""

    for w in words:
        if len(w) > max_chars:
            if cur_line:
                lines.append(cur_line)
                cur_line = ""
            for k in range(0, len(w), max_chars):
                chunk = w[k:k+max_chars]
                if k + max_chars < len(w):
                    lines.append(chunk)
                else:
                    cur_line = chunk
            continue

        if not cur_line:
            cur_line = w
        elif len(cur_line) + len(w) + 1 <= max_chars:
            cur_line += " " + w
        else:
            lines.append(cur_line)
            cur_line = w

    if cur_line:
        lines.append(cur_line)

    return lines

def format_sinhala_mermaid_labels(code, max_line_len=14, wrap_edges=True):
    """
    Prepares node (and optionally edge) label text for Mermaid rendering using
    native markdown-string syntax (A["`some text`"]). Mermaid v10+ automatically
    measures real DOM font metrics and auto-wraps text within the node box,
    guaranteeing zero text overflow or cropping on complex scripts like Sinhala.
    For specialized diagram types (mindmap, timeline, sequenceDiagram, stateDiagram,
    quadrantChart, pie), native syntax is preserved directly.
    """
    if not code:
        return code

    clean = code.strip()
    first_line = clean.split('\n')[0].strip().lower()

    # If it is a specialized non-flowchart diagram, preserve clean native syntax with anti-clipping padding
    non_flowcharts = ['mindmap', 'timeline', 'sequencediagram', 'statediagram', 'statediagram-v2', 'quadrantchart', 'pie', 'erdiagram', 'journey', 'classdiagram', 'gantt']
    if any(first_line.startswith(kw) for kw in non_flowcharts):
        if 'statediagram' in first_line:
            lines = clean.split('\n')
            padded_lines = []
            for ln in lines:
                if ':' in ln and '-->' in ln:
                    parts = ln.split(':', 1)
                    padded_lines.append(f"{parts[0]}:  {parts[1].strip()}  ")
                else:
                    padded_lines.append(ln)
            return '\n'.join(padded_lines)
        return clean

    def clean_label_content(raw):
        text = re.sub(r'<br\s*/?>|\\n', '\n', raw)
        text = text.strip().strip('"\'').strip()
        text = '\n'.join(re.sub(r'[ \t]{2,}', ' ', ln).strip() for ln in text.split('\n'))
        text = text.replace('`', "'").replace('"', "'")
        return text

    if wrap_edges:
        def wrap_edge_match(m):
            content = clean_label_content(m.group(1))
            if not content:
                return '||'
            return f'|"`{content}`"|'
        code = re.sub(r'\|([^|\n]+?)\|', wrap_edge_match, code)

    def node_replacer(m):
        node_id = m.group(1)
        open_shape = m.group(2)
        content = m.group(3)
        close_shape = m.group(4)
        
        content = clean_label_content(content)
        if not content:
            content = " "
        return f'{node_id}{open_shape}"`{content}`"{close_shape}'

    pattern = re.compile(r'(\b[a-zA-Z0-9_\u0D80-\u0DFF]+)\s*(\(\[|\[|\{|\()(?:\"`|\"|\')?(.+?)(?:`\"|\"|\')?(\]\)|\}|\)|\])(?=\s*(?:-->|---|==>|-\.->|~~~|\n|\)|\]|\}|$))')
    formatted = pattern.sub(node_replacer, code)
    return formatted

def render_mermaid_diagram_html(mermaid_code, subject_theme=None, bg_color="white", timeout_sec=15):
    """
    Renders Mermaid.js code to ultra high-res 3x Retina PNG with subject-specific color theme
    and anti-cropping Sinhala typography, embedded as base64 image in PDF HTML.
    """
    if not mermaid_code or not mermaid_code.strip():
        return None

    clean_code = mermaid_code.strip()
    theme = subject_theme or {}
    primary_color = theme.get('section_bg', '#EFF6FF')
    border_color = theme.get('section_border', '#2563EB')
    text_color = '#0F172A'

    cache_dir = Path.cwd() / "diagram_cache"
    try:
        cache_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    cache_key = hashlib.md5(f"{clean_code}_{border_color}_{primary_color}_{bg_color}".encode('utf-8')).hexdigest()
    png_cache_file = cache_dir / f"diagram_{cache_key}.png"

    # 1. Check if cached PNG exists
    if png_cache_file.exists() and png_cache_file.stat().st_size > 1000:
        try:
            with open(png_cache_file, "rb") as f:
                img_bytes = f.read()
            img_b64 = base64.b64encode(img_bytes).decode('ascii')
            return f"<div class='diagram-img-box'><img src='data:image/png;base64,{img_b64}' class='diagram-img' alt='Study Diagram'/></div>"
        except Exception:
            pass

    processed_code = format_sinhala_mermaid_labels(clean_code, max_line_len=14)

    # 2. Render locally via Playwright for 100% font accuracy and subject color theming
    try:
        ensure_pdf_dependencies()
        html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<style>
  *, *::before, *::after {{
    box-sizing: border-box;
    font-family: 'Noto Sans Sinhala', 'Outfit', Arial, sans-serif !important;
  }}
  body {{
    margin: 0;
    padding: 30px 40px;
    background: #FFFFFF;
    display: flex;
    justify-content: center;
    align-items: center;
    -webkit-font-smoothing: antialiased !important;
    -moz-osx-font-smoothing: grayscale !important;
    text-rendering: optimizeLegibility !important;
  }}
  #wrapper {{
    display: inline-block;
    background: #FFFFFF;
    padding: 28px 38px;
    border-radius: 18px;
    box-shadow: 0 4px 28px rgba(0, 0, 0, 0.07);
    border: 2px solid {border_color}33;
    overflow: visible !important;
  }}
  svg {{
    max-width: 100%;
    height: auto;
    overflow: visible !important;
    shape-rendering: geometricPrecision !important;
    text-rendering: optimizeLegibility !important;
  }}
  text, tspan {{
    font-family: 'Noto Sans Sinhala', 'Outfit', Arial, sans-serif !important;
    font-weight: 700 !important;
    fill: #0F172A !important;
    color: #0F172A !important;
    -webkit-font-smoothing: antialiased !important;
  }}
  .node foreignObject,
  .edgeLabel foreignObject,
  .edgeLabel span,
  .transition-label,
  .state-label {{
    white-space: normal !important;
    overflow-wrap: break-word !important;
    word-break: normal !important;
    overflow: visible !important;
    line-height: 1.45 !important;
  }}
  .node foreignObject div,
  .node foreignObject span,
  .node foreignObject p {{
    text-align: center !important;
    font-size: 16px !important;
    line-height: 1.55 !important;
    font-weight: 700 !important;
    color: #0F172A !important;
    font-family: 'Noto Sans Sinhala', 'Outfit', Arial, sans-serif !important;
    white-space: normal !important;
    word-break: normal !important;
    overflow-wrap: break-word !important;
    -webkit-font-smoothing: antialiased !important;
  }}
  .node foreignObject p {{
    margin: 0 !important;
  }}
  .node foreignObject > div {{
    padding: 8px 12px !important;
    display: table-cell !important;
    vertical-align: middle !important;
  }}
  .node rect, .node circle, .node polygon, .node path {{
    rx: 8px !important;
    ry: 8px !important;
    stroke-width: 2.2px !important;
    stroke: {border_color} !important;
    fill: {primary_color} !important;
  }}
  .edgePath path {{
    stroke: {border_color} !important;
    stroke-width: 2.4px !important;
  }}
  .arrowheadPath {{
    fill: {border_color} !important;
    stroke: {border_color} !important;
  }}
  .edgeLabel {{
    font-size: 14px !important;
    font-weight: 700 !important;
    background-color: #FFFFFF !important;
    padding: 3px 8px !important;
    border-radius: 6px !important;
    color: #1E40AF !important;
    border: 1px solid #93C5FD !important;
    white-space: normal !important;
  }}
  .edgeLabel rect, .label rect {{
    overflow: visible !important;
    rx: 4px;
  }}
</style>
</head>
<body>
<div id="wrapper">
  <div id="diagram-container"></div>
</div>
<script>
  window.renderDiagram = async function() {{
    await document.fonts.ready;
    
    mermaid.initialize({{
      startOnLoad: false,
      theme: 'base',
      themeVariables: {{
        fontFamily: "'Noto Sans Sinhala', 'Outfit', Arial, sans-serif",
        fontSize: '16px',
        primaryColor: '{primary_color}',
        primaryBorderColor: '{border_color}',
        primaryTextColor: '#0F172A',
        lineColor: '{border_color}',
        textColor: '#0F172A',
        mainBkg: '{primary_color}',
        nodeBorder: '{border_color}',
        clusterBkg: '#F8FAFC',
        clusterBorder: '#CBD5E1',
        defaultLinkColor: '{border_color}',
        edgeLabelBackground: '#FFFFFF',
        nodePadding: '48px',
        cScale0: '#E0F2FE',
        cScale1: '#DCFCE7',
        cScale2: '#FEF3C7',
        cScale3: '#EDE9FE',
        cScale4: '#FCE7F3',
        cScale5: '#F1F5F9',
        cScaleLabel0: '#0369A1',
        cScaleLabel1: '#15803D',
        cScaleLabel2: '#B45309',
        cScaleLabel3: '#6D28D9',
        cScaleLabel4: '#BE185D',
        cScaleLabel5: '#334155'
      }},
      flowchart: {{
        curve: 'basis',
        nodeSpacing: 44,
        rankSpacing: 55,
        padding: 48,
        useMaxWidth: false,
        htmlLabels: true,
        wrappingWidth: 220
      }},
      mindmap: {{
        padding: 40,
        maxNodeWidth: 260
      }}
    }});

    const code = {json.dumps(processed_code)};
    const {{ svg }} = await mermaid.render('mermaid-svg-root', code);
    document.getElementById('diagram-container').innerHTML = svg;

    const svgEl = document.querySelector('#diagram-container svg');
    if (svgEl) {{
      svgEl.querySelectorAll('text').forEach(t => {{
        t.style.fontWeight = '700';
        t.style.fontFamily = "'Noto Sans Sinhala', 'Outfit', Arial, sans-serif";
      }});

      const curVb = svgEl.getAttribute('viewBox');
      if (curVb) {{
        const parts = curVb.split(/[\\s,]+/).map(Number);
        if (parts.length === 4) {{
          const pad = 24;
          svgEl.setAttribute('viewBox', `${{parts[0] - pad}} ${{parts[1] - pad}} ${{parts[2] + pad * 2}} ${{parts[3] + pad * 2}}`);
        }}
      }}
    }}
  }};
</script>
</body>
</html>"""

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(device_scale_factor=4)
            page.set_content(html_content, wait_until="networkidle")
            page.evaluate("() => window.renderDiagram()")
            page.wait_for_selector("#diagram-container svg", timeout=12000)
            page.wait_for_timeout(350)
            page.evaluate("""() => new Promise(requestAnimationFrame)""")

            wrapper_el = page.locator("#wrapper")
            wrapper_el.screenshot(path=str(png_cache_file))
            browser.close()

            if png_cache_file.exists():
                with open(png_cache_file, "rb") as f:
                    img_bytes = f.read()
                img_b64 = base64.b64encode(img_bytes).decode('ascii')
                return f"<div class='diagram-img-box'><img src='data:image/png;base64,{img_b64}' class='diagram-img' alt='Study Diagram'/></div>"
    except Exception as e:
        print(f"Notice rendering local mermaid high-res PNG: {e}", file=sys.stderr, flush=True)

    # 3. Fallback to mermaid.ink if local Playwright fails
    try:
        state = {
            "code": processed_code,
            "mermaid": {
                "theme": "base",
                "themeVariables": {
                    "fontFamily": "Noto Sans Sinhala, Arial, sans-serif",
                    "fontSize": "17px",
                    "primaryColor": primary_color,
                    "primaryBorderColor": border_color,
                    "primaryTextColor": text_color,
                    "lineColor": border_color,
                    "textColor": text_color,
                    "mainBkg": primary_color,
                    "nodeBorder": border_color,
                    "nodePadding": "36px"
                }
            },
            "autoSync": True,
            "rough": False
        }
        json_bytes = json.dumps(state, ensure_ascii=False).encode('utf-8')
        compressed = zlib.compress(json_bytes, level=9)
        pako_b64 = base64.urlsafe_b64encode(compressed).decode('ascii')
        svg_url = f"https://mermaid.ink/svg/pako:{pako_b64}?bgColor={bg_color}"
        req_svg = urllib.request.Request(svg_url, headers={'User-Agent': 'AL-MCQ-HUB-Bot/1.0'})
        with urllib.request.urlopen(req_svg, timeout=timeout_sec) as resp:
            if resp.status == 200:
                svg_text = resp.read().decode('utf-8', errors='ignore')
                if "<svg" in svg_text:
                    cleaned_svg = re.sub(r'<svg([^>]*)width="[^"]*"([^>]*)height="[^"]*"', r'<svg\1\2', svg_text, count=1)
                    return f"<div class='diagram-svg-box'>{cleaned_svg}</div>"
    except Exception:
        pass

    return None


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
    },
    'geo': {
        'subject_name': 'භූගෝල විද්‍යාව (Geography)',
        'header_gradient': 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 100%)',
        'border_color': '#6D28D9',
        'section_bg': '#F5F3FF',
        'section_border': '#7C3AED',
        'section_title': '#4C1D95',
        'callout_bg': '#EDE9FE',
        'callout_border': '#8B5CF6',
        'callout_text': '#2E1065',
        'sub_bullet_color': '#6D28D9',
        'tg_card_bg': '#F5F3FF',
        'tg_card_border': '#7C3AED',
        'tg_link_color': '#7C3AED',
        'sub_brand_color': '#C4B5FD',
        'meta_bg': 'rgba(255, 255, 255, 0.15)',
        'meta_border': 'rgba(255, 255, 255, 0.25)'
    },
    'md': {
        'subject_name': 'මාධ්‍ය අධ්‍යයනය (Media Studies)',
        'header_gradient': 'linear-gradient(135deg, #0C4A6E 0%, #0369A1 100%)',
        'border_color': '#0369A1',
        'section_bg': '#F0F9FF',
        'section_border': '#0EA5E9',
        'section_title': '#0C4A6E',
        'callout_bg': '#E0F2FE',
        'callout_border': '#38BDF8',
        'callout_text': '#082F49',
        'sub_bullet_color': '#0369A1',
        'tg_card_bg': '#F0F9FF',
        'tg_card_border': '#0EA5E9',
        'tg_link_color': '#0284C7',
        'sub_brand_color': '#7DD3FC',
        'meta_bg': 'rgba(255, 255, 255, 0.15)',
        'meta_border': 'rgba(255, 255, 255, 0.25)'
    },
    'dr': {
        'subject_name': 'නාට්‍ය හා රංගකලාව (Drama & Theatre)',
        'header_gradient': 'linear-gradient(135deg, #581C87 0%, #7E22CE 100%)',
        'border_color': '#7E22CE',
        'section_bg': '#FAF5FF',
        'section_border': '#A855F7',
        'section_title': '#581C87',
        'callout_bg': '#F3E8FF',
        'callout_border': '#C084FC',
        'callout_text': '#3B0764',
        'sub_bullet_color': '#7E22CE',
        'tg_card_bg': '#FAF5FF',
        'tg_card_border': '#A855F7',
        'tg_link_color': '#9333EA',
        'sub_brand_color': '#E9D5FF',
        'meta_bg': 'rgba(255, 255, 255, 0.15)',
        'meta_border': 'rgba(255, 255, 255, 0.25)'
    },
    'mu': {
        'subject_name': 'සංගීතය (Music)',
        'header_gradient': 'linear-gradient(135deg, #831843 0%, #BE185D 100%)',
        'border_color': '#BE185D',
        'section_bg': '#FDF2F8',
        'section_border': '#EC4899',
        'section_title': '#831843',
        'callout_bg': '#FCE7F3',
        'callout_border': '#F472B6',
        'callout_text': '#500724',
        'sub_bullet_color': '#BE185D',
        'tg_card_bg': '#FDF2F8',
        'tg_card_border': '#EC4899',
        'tg_link_color': '#DB2777',
        'sub_brand_color': '#FBCFE8',
        'meta_bg': 'rgba(255, 255, 255, 0.15)',
        'meta_border': 'rgba(255, 255, 255, 0.25)'
    },
    'dn': {
        'subject_name': 'නර්තනය (Dancing)',
        'header_gradient': 'linear-gradient(135deg, #701A75 0%, #A21CAF 100%)',
        'border_color': '#A21CAF',
        'section_bg': '#FDF4FF',
        'section_border': '#E879F9',
        'section_title': '#701A75',
        'callout_bg': '#FAE8FF',
        'callout_border': '#F0ABFC',
        'callout_text': '#4A044E',
        'sub_bullet_color': '#A21CAF',
        'tg_card_bg': '#FDF4FF',
        'tg_card_border': '#E879F9',
        'tg_link_color': '#C026D3',
        'sub_brand_color': '#F5D0FE',
        'meta_bg': 'rgba(255, 255, 255, 0.15)',
        'meta_border': 'rgba(255, 255, 255, 0.25)'
    },
    'agri': {
        'subject_name': 'කෘෂි විද්‍යාව (Agricultural Science)',
        'header_gradient': 'linear-gradient(135deg, #14532D 0%, #15803D 50%, #16A34A 100%)',
        'border_color': '#15803D',
        'section_bg': '#F0FDF4',
        'section_border': '#22C55E',
        'section_title': '#14532D',
        'callout_bg': '#DCFCE7',
        'callout_border': '#4ADE80',
        'callout_text': '#052E16',
        'sub_bullet_color': '#16A34A',
        'tg_card_bg': '#F0FDF4',
        'tg_card_border': '#22C55E',
        'tg_link_color': '#15803D',
        'sub_brand_color': '#BBF7D0',
        'meta_bg': 'rgba(255, 255, 255, 0.15)',
        'meta_border': 'rgba(255, 255, 255, 0.25)'
    }
}

# ---------------------------------------------------------------------------
# Layout constants
# ---------------------------------------------------------------------------
BORDER_INSET_MM = 8
CONTENT_MARGIN_TOP_MM = 22
CONTENT_MARGIN_BOTTOM_MM = 24
CONTENT_MARGIN_SIDE_MM = 18
WATERMARK_SIZE_MM = 100
WATERMARK_OPACITY = 0.06

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
    if sub in ['geo', 'geography', 'geog']:
        return SUBJECT_THEMES['geo']
    if sub in ['md', 'media', 'mass_media']:
        return SUBJECT_THEMES['md']
    if sub in ['dr', 'drama', 'theatre', 'rangakala']:
        return SUBJECT_THEMES['dr']
    if sub in ['mu', 'music', 'sangeetha']:
        return SUBJECT_THEMES['mu']
    if sub in ['dn', 'dance', 'dancing', 'narthana']:
        return SUBJECT_THEMES['dn']
    if sub in ['agri', 'ag', 'agriculture', 'agricultural', 'agricultural_science', 'krushi']:
        return SUBJECT_THEMES['agri']

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
    if any(k in combined for k in ['භූගෝල', 'ගංගා', 'කාලගුණ', 'මිනිසාශ්‍රිත', 'ගොවිතැන', 'භූමිය', 'ජල', 'ජනගහන']):
        return SUBJECT_THEMES['geo']
    if any(k in combined for k in ['මාධ්‍ය', 'ජනමාධ්‍ය', 'රූපවාහිනී', 'ගුවන්විදුලි', 'සමාජ මාධ්‍ය', 'පුවත්', 'සන්නිවේදන']):
        return SUBJECT_THEMES['md']
    if any(k in combined for k in ['නාට්‍ය', 'රංගකලා', 'රංගනය', 'drama', 'theatre', 'රංග']):
        return SUBJECT_THEMES['dr']
    if any(k in combined for k in ['සංගීත', 'සංගීතය', 'රාග', 'තාල', 'ශ්‍රැති', 'music', 'ගීත', 'වාදනය']):
        return SUBJECT_THEMES['mu']
    if any(k in combined for k in ['නර්තන', 'නර්තනය', 'නැටුම්', 'වන්නම්', 'තාළම', 'dancing', 'dance']):
        return SUBJECT_THEMES['dn']
    if any(k in combined for k in ['කෘෂි', 'කෘෂිකර්ම', 'පස', 'බෝග', 'පළිබෝධ', 'පොහොර', 'සත්ත්ව පාලන', 'ජලසම්පාදන', 'හරිතාගාර', 'agri', 'agriculture']):
        return SUBJECT_THEMES['agri']

    return SUBJECT_THEMES['pl']

def sanitize_text_for_pdf(text):
    if not text:
        return ""
    t = text

    # 1. Strip display/inline math wrappers like \[ ... \], \( ... \), $$ ... $$
    t = re.sub(r'\\\[\s*(.*?)\s*\\\]', r'\1', t, flags=re.DOTALL)
    t = re.sub(r'\\\(\s*(.*?)\s*\\\)', r'\1', t, flags=re.DOTALL)
    t = re.sub(r'\$\$\s*(.*?)\s*\$\$', r'\1', t, flags=re.DOTALL)

    # 2. Convert common LaTeX math symbols and arrows
    t = re.sub(r'\\(?:rightarrow|to)\b', ' → ', t)
    t = re.sub(r'\\(?:leftarrow)\b', ' ← ', t)
    t = re.sub(r'\\(?:leftrightarrow)\b', ' ↔ ', t)
    t = re.sub(r'\\(?:implies|Rightarrow)\b', ' ⇒ ', t)
    t = re.sub(r'\\(?:iff|Leftrightarrow)\b', ' ⇔ ', t)
    t = re.sub(r'\\(?:times)\b', ' × ', t)
    t = re.sub(r'\\(?:div)\b', ' ÷ ', t)
    t = re.sub(r'\\(?:le|leq)\b', ' ≤ ', t)
    t = re.sub(r'\\(?:ge|geq)\b', ' ≥ ', t)
    t = re.sub(r'\\(?:ne|neq)\b', ' ≠ ', t)
    t = re.sub(r'\\(?:approx)\b', ' ≈ ', t)
    t = re.sub(r'\\(?:pm)\b', ' ± ', t)
    t = re.sub(r'\\(?:infty)\b', ' ∞ ', t)
    t = re.sub(r'\\(?:cdot)\b', ' · ', t)
    t = re.sub(r'\\(?:cdots|dots|ldots)\b', '...', t)

    # 3. Fractions: \frac{a}{b} -> (a / b)
    t = re.sub(r'\\frac\{([^{}]+)\}\{([^{}]+)\}', r'(\1 / \2)', t)

    # 4. LaTeX text macros: \text{...}, \textbf{...}, \textit{...}, etc.
    for _ in range(3):
        t = re.sub(r'\\textbf\{([^{}]+)\}', r'**\1**', t)
        t = re.sub(r'\\textit\{([^{}]+)\}', r'*\1*', t)
        t = re.sub(r'\\text\{([^{}]+)\}', r'\1', t)
        t = re.sub(r'\\math(?:rm|bf|it|sf|tt|cal|bb)\{([^{}]+)\}', r'\1', t)
        t = re.sub(r'\\(?:boxed|underline|overline)\{([^{}]+)\}', r'\1', t)

    # 5. Remove citation files
    t = re.sub(r'\[[^\]]*?\.(?:pdf|txt|docx|doc|html|md|epub)[^\]]*?\]', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\([^\]]*?\.(?:pdf|txt|docx|doc|html|md|epub)[^\)]*?\)', '', t, flags=re.IGNORECASE)
    # 6. Remove bracketed numeric citations like [1], [1, 2]
    t = re.sub(r'\[\d+(?:\s*,\s*\d+|-?\d+)*\]', '', t)
    # 7. Remove page references
    t = re.sub(r'\[\s*(?:p\.|pp\.|page|pages)\s*\d+[^\]]*\]', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\(\s*(?:p\.|pp\.|page|pages)\s*\d+[^\)]*\)', '', t, flags=re.IGNORECASE)
    # 8. Remove source labels
    t = re.sub(r'\[\s*(?:source|සූත්‍ර|මුලාශ්‍රය|මූලාශ්‍රය|මූලාශ්‍ර|ගොනුව|පිටුව)\s*:[^\]]*\]', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\(\s*(?:source|සූත්‍ර|මුලාශ්‍රය|මූලාශ්‍රය|මූලාශ්‍ර|ගොනුව|පිටුව)\s*:[^\)]*\)', '', t, flags=re.IGNORECASE)
    t = re.sub(r'(?:,\s*|\.\s*|\s+)p\.\s*\d+(?:\s*,\s*\d+|-?\d+)*', '', t, flags=re.IGNORECASE)

    # 9. Clean remaining stray \text or backslashes
    t = re.sub(r'\\text\b', '', t)
    t = t.replace('\\\\', '').replace('\\', '')
    t = re.sub(r'[ \t]{2,}', ' ', t)
    t = t.replace(' .', '.').replace(' ,', ',')
    t = re.sub(r'\(\s*\)', '', t)
    t = re.sub(r'\[\s*\]', '', t)
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
        is_followup = (
            bool(re.search(r'(?:දෙන්නද|බලමු\s*ද|කරමු\s*ද|කැමති\s*ද|දන්නද|ද)\??\s*$', last_line, re.IGNORECASE)) and
            bool(re.search(r'(?:සකස්|සාකච්ඡා|විමසා|කතා|අධ්‍යයනය|පැහැදිලි|දැන|ලබා|ඊළඟට)', last_line, re.IGNORECASE))
        )
        is_divider = bool(re.match(r'^[━─_-]{3,}$', last_line))
        if is_followup or is_divider:
            lines.pop()
        else:
            break
    return '\n'.join(lines).strip()

def extract_marks_badge(text, badge_class="marks-badge"):
    """Pull trailing (ලකුණු ...) into a coloured badge span."""
    if not text:
        return text, ""
    m = re.search(r'\(\s*(ලකුණු|Marks?)\s*[:\-]?\s*([^\)]*)\)\s*\*?\s*$', text)
    if not m:
        return text, ""
    remaining = text[:m.start()].strip()
    remaining = re.sub(r'[\*\s]+$', '', remaining).strip()
    label = m.group(1)
    value = m.group(2).strip()
    if not remaining:
        return text, ""
    badge = f"<span class='{badge_class}'>🎯 {label} {value}</span>"
    return remaining, badge

def is_stray_marker_line(raw_line):
    """Detect lines that are nothing but a leftover bullet/divider marker."""
    return bool(re.match(r'^[•\*\-▸\u2022]+\s*$', raw_line))

def load_logo_assets():
    """Returns (data_uri_for_html, raw_bytes_for_reportlab) or ('', None)."""
    possible_logos = ['our_logo.png', 'c:/bak/projects/AL BC/A-L-main/our_logo.png', 'logo.png']
    for lp in possible_logos:
        if os.path.exists(lp):
            with open(lp, "rb") as f:
                raw_bytes = f.read()
            data_uri = f"data:image/png;base64,{base64.b64encode(raw_bytes).decode('utf-8')}"
            return data_uri, raw_bytes
    return "", None

def build_footer_template(theme):
    """
    Footer template for Playwright with proper padding and positioning
    so it sits comfortably above the 8mm ReportLab border.
    """
    return f"""
        <style>
            * {{ box-sizing: border-box; }}
        </style>
        <div style="
            font-family: 'Noto Sans Sinhala', 'Nirmala UI', 'Iskoola Pota', 'Segoe UI', sans-serif;
            font-size: 8pt;
            color: #4B5563;
            width: 100%;
            margin: 0;
            padding: 0 {CONTENT_MARGIN_SIDE_MM}mm 5mm {CONTENT_MARGIN_SIDE_MM}mm;
            display: flex;
            justify-content: space-between;
            align-items: center;
            white-space: nowrap;
        ">
            <span style="overflow: hidden; text-overflow: ellipsis;">
                🎓 <b>A/L MCQ HUB AI Tutor ({theme['subject_name']})</b> |
                <a href="https://t.me/+wZUSJyEncD1mYjFl" style="color: {theme['border_color']}; text-decoration: underline;">Telegram Group</a>
            </span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
    """

def extract_clean_topic_title(topic_title, raw_content=""):
    """
    Extracts a concise, professional title for the PDF header.
    If the user passed a long sentence/prompt, extracts the primary subject heading
    from Markdown or intelligently trims the prompt to a clean title.
    """
    # 1. If raw_content begins with a markdown H1 or H2 heading, that is usually the best title
    if raw_content:
        for line in raw_content.strip().split('\n')[:5]:
            l = line.strip()
            if l.startswith('# ') or l.startswith('## '):
                h_text = re.sub(r'^[#\s📌*]+|[#\s📌*]+$', '', l).strip()
                if 4 <= len(h_text) <= 85 and not re.search(r'(දෙන්න|සපයන්න|දක්වන්න|ලියන්න|විස්තර කරන්න)', h_text):
                    return sanitize_text_for_pdf(h_text)

    if not topic_title:
        return "උසස් පෙළ අධ්‍යයන සටහන"

    clean = sanitize_text_for_pdf(topic_title)
    
    # 2. Strip common conversational / prompt filler phrases
    filler_patterns = [
        r'^(?:කරුණාකර|මට|අපට|ප්ලීස්|please)\s+',
        r'(?:ගැන|පිළිබඳ|පිළිබඳව|සම්බන්ධව|අදාළව)\s+(?:කෙටි\s*)?(?:නෝට්|සටහනක්|විස්තරයක්|පාඩමක්|ප්‍රශ්න|තොරතුරු)(?:\s+(?:එකක්|ලබා|දෙන්න|සපයන්න|ලියන්න|හදන්න|දාන්න))*',
        r'(?:කෙටි\s*)?(?:නෝට්|සටහනක්|විස්තරයක්|පාඩමක්|ප්‍රශ්න)(?:\s+(?:එකක්|ලබා|දෙන්න|සපයන්න|ලියන්න|හදන්න|දාන්න))+$',
        r'(?:දෙස\s*බැලීමේදී|අනුව|මොනවාද|පැහැදිලි\s*කරන්න|විස්තර\s*කරන්න|දක්වන්න|සපයන්න|ලියා\s*දක්වන්න|ලබා\s*දෙන්න|කියන්න)\.?\s*$',
    ]
    for pat in filler_patterns:
        clean = re.sub(pat, '', clean, flags=re.IGNORECASE).strip()

    # 3. If it's still very long (> 65 chars), trim gracefully at word boundary
    if len(clean) > 65:
        parts = re.split(r'[:\-\–\—\(\),]', clean)
        if parts and len(parts[0].strip()) >= 8:
            first_clause = parts[0].strip()
            if len(first_clause) <= 65:
                clean = first_clause
            else:
                words = first_clause.split()
                truncated = ""
                for w in words:
                    if len(truncated) + len(w) + 1 <= 60:
                        truncated += (" " if truncated else "") + w
                    else:
                        break
                clean = (truncated + "...") if truncated else clean[:60] + "..."
        else:
            words = clean.split()
            truncated = ""
            for w in words:
                if len(truncated) + len(w) + 1 <= 60:
                    truncated += (" " if truncated else "") + w
                else:
                    break
            clean = (truncated + "...") if truncated else clean[:60] + "..."

    return clean if clean else "උසස් පෙළ අධ්‍යයන සටහන"

def build_pdf_html(topic_title, raw_content, logo_base64="", subject_code="auto"):
    theme = resolve_theme(subject_code, topic_title, raw_content)
    clean_raw = remove_ending_followup_captions(raw_content)
    sanitized_title = extract_clean_topic_title(topic_title, clean_raw)
    date_str = datetime.now().strftime('%Y-%m-%d')

    lines = clean_raw.split('\n')
    body_html_parts = []
    in_example_block = False
    example_items = []
    in_table = False
    table_header = []
    table_rows = []
    in_mermaid_block = False
    mermaid_lines = []
    current_section_title = ""

    def inline_fmt(text):
        if not text:
            return ""
        t = text
        # 1. Bold: **bold** or __bold__ (handle unicode Sinhala words and punctuation cleanly)
        t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
        t = re.sub(r'__(.+?)__', r'<strong>\1</strong>', t)
        # 2. Italic: *italic* or _italic_ (handle Sinhala / hyphen cases gracefully like *-ආ, -අන්* or *ඉතාලිය*)
        t = re.sub(r'(?<!\*)\*([^\*\n]+)\*(?!\*)', r'<em>\1</em>', t)
        t = re.sub(r'(?<!_)_([^_\n]+)_(?!_)', r'<em>\1</em>', t)
        # 3. Clean up any remaining stray asterisks
        t = re.sub(r'\*{2,}', '', t)
        return t

    def flush_table():
        nonlocal in_table, table_header, table_rows
        if not table_header and not table_rows:
            in_table = False
            return
        h = "<div class='table-wrapper'><table class='note-table'><thead><tr>"
        for col in table_header:
            h += f"<th>{inline_fmt(col)}</th>"
        h += "</tr></thead><tbody>"
        for row in table_rows:
            padded = row + [""] * max(0, len(table_header) - len(row))
            h += "<tr>" + "".join(f"<td>{inline_fmt(c)}</td>" for c in padded[:len(table_header)]) + "</tr>"
        h += "</tbody></table></div>"
        body_html_parts.append(h)
        in_table = False
        table_header = []
        table_rows = []

    def flush_example_block():
        nonlocal example_items
        if not example_items:
            return
        items_html = "".join([f"<div class='example-item'>{item}</div>" for item in example_items])
        body_html_parts.append(f"<div class='callout-box'>{items_html}</div>")
        example_items = []

    def flush_mermaid_block():
        nonlocal in_mermaid_block, mermaid_lines, current_section_title
        if not mermaid_lines:
            in_mermaid_block = False
            return
        code = '\n'.join(mermaid_lines).strip()
        in_mermaid_block = False
        mermaid_lines = []
        if code:
            diag_html = render_mermaid_diagram_html(code, subject_theme=theme, bg_color="white")
            if diag_html:
                badge_title = f"📊 රූප සටහන (Diagram): {inline_fmt(current_section_title)}" if current_section_title else "📊 රූප සටහන (Diagram)"
                body_html_parts.append(
                    f"<div class='diagram-wrapper'>"
                    f"<div class='diagram-card'>"
                    f"<div class='diagram-badge'>{badge_title}</div>"
                    f"{diag_html}"
                    f"</div></div>"
                )

    for line in lines:
        raw_line = line.strip()

        # Handle Mermaid diagram code fences (```mermaid ... ``` or ``` ... ```)
        if raw_line.startswith('```'):
            if in_mermaid_block:
                flush_mermaid_block()
                continue
            else:
                if in_example_block:
                    flush_example_block()
                    in_example_block = False
                if in_table:
                    flush_table()
                in_mermaid_block = True
                mermaid_lines = []
                code_after = re.sub(r'^```(?:mermaid)?\s*', '', raw_line, flags=re.IGNORECASE).strip()
                if code_after:
                    mermaid_lines.append(code_after)
                continue

        if in_mermaid_block:
            mermaid_lines.append(line)
            continue

        if not raw_line or is_stray_marker_line(raw_line):
            if in_example_block:
                flush_example_block()
                in_example_block = False
            if in_table:
                flush_table()
            continue

        clean_l = sanitize_text_for_pdf(raw_line)
        if not clean_l:
            continue

        clean_l = re.sub(r'\(උදා:\s*([^\)]+)\)', r'<span class="example-badge">👉 <b>උදා:</b> <i>\1</i></span>', clean_l)

        # 1. Check for Markdown Table Rows (| col1 | col2 |)
        if raw_line.startswith('|') and raw_line.endswith('|'):
            if in_example_block:
                flush_example_block()
                in_example_block = False
            cells = [c.strip() for c in clean_l.split('|')[1:-1]]
            if all(re.match(r'^[-:]+$', c.replace(' ', '')) for c in cells if c):
                continue
            if not in_table:
                in_table = True
                table_header = cells
            else:
                table_rows.append(cells)
            continue
        else:
            if in_table:
                flush_table()

        if raw_line.startswith('###') or raw_line.startswith('##') or raw_line.startswith('📌') or raw_line.startswith('#'):
            if in_example_block:
                flush_example_block()
                in_example_block = False
            title_text = re.sub(r'^[*_#📌\s]+|[*_#📌\s]+$', '', clean_l).strip()
            title_text, marks_badge = extract_marks_badge(title_text)
            if title_text:
                current_section_title = title_text
                body_html_parts.append(
                    f"<div class='section-card'><div class='section-title-row'>"
                    f"<div class='section-title'>📌 {inline_fmt(title_text)}</div>{marks_badge}</div></div>"
                )
            continue

        if re.match(r'^[-\*_]{3,}$', raw_line) or '━━━━' in raw_line or '────' in raw_line:
            if in_example_block:
                flush_example_block()
                in_example_block = False
            body_html_parts.append("<hr class='divider'/>")
            continue

        if '👉' in raw_line or 'නිදසුන්:' in raw_line or 'උදාහරණ:' in raw_line:
            in_example_block = True
            item_text = re.sub(r'^[•▸\-]\s*|^[*]\s+', '', clean_l)
            example_items.append(inline_fmt(item_text))
            continue

        if in_example_block:
            if raw_line.startswith('•') or raw_line.startswith('*') or raw_line.startswith('-') or raw_line.startswith('▸'):
                item_text = re.sub(r'^[•▸\-]\s*|^[*]\s+', '', clean_l)
                example_items.append(inline_fmt(item_text))
                continue
            else:
                flush_example_block()
                in_example_block = False

        if raw_line.startswith('▸') or raw_line.startswith('   ▸') or raw_line.startswith('* *') or raw_line.startswith('- -'):
            bullet_text = re.sub(r'^[▸\-]\s*|^[*]\s+', '', clean_l)
            if bullet_text.strip():
                body_html_parts.append(f"<div class='sub-bullet'>▸ {inline_fmt(bullet_text)}</div>")
            continue

        if raw_line.startswith('•') or raw_line.startswith('*') or raw_line.startswith('-'):
            bullet_text = re.sub(r'^[•\-]\s*|^[*]\s+', '', clean_l)
            if bullet_text.strip():
                body_html_parts.append(f"<div class='bullet'>• {inline_fmt(bullet_text)}</div>")
            continue

        body_html_parts.append(f"<p class='paragraph'>{inline_fmt(clean_l)}</p>")

    if in_mermaid_block:
        flush_mermaid_block()
    if in_example_block:
        flush_example_block()
    if in_table:
        flush_table()

    body_html_parts.append("""
        <div class="telegram-join-card">
            📢 <b>අපගේ A/L MCQ HUB Telegram සජීවී අධ්‍යයන සමූහයට එක්වන්න:</b><br/>
            <a href="https://t.me/+wZUSJyEncD1mYjFl" target="_blank" class="tg-link">👉 මෙතැනින් Click කර Telegram Group එකට Join වන්න</a>
        </div>
    """)

    content_html = "\n".join(body_html_parts)
    logo_img_tag = f"<img src='{logo_base64}' class='logo-img'/>" if logo_base64 else "<div class='logo-placeholder'>🎓</div>"

    html_template = f"""<!DOCTYPE html>
<html lang="si">
<head>
    <meta charset="UTF-8">
    <title>{sanitized_title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {{ box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }}
        body {{ font-family: 'Noto Sans Sinhala', 'Nirmala UI', 'Iskoola Pota', 'Segoe UI', sans-serif; color: #1F2937; background-color: #FFFFFF; margin: 0; padding: 0; font-size: 9.8pt; line-height: 1.58; overflow-wrap: anywhere; word-break: normal; text-align: left; }}
        .content-wrapper {{ padding: 4px 6px; position: relative; }}
        .header-card {{
            background: {theme['header_gradient']};
            border-radius: 8px;
            padding: 12px 18px;
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            margin-bottom: 14px;
            page-break-inside: avoid;
            break-inside: avoid;
        }}
        .header-left {{
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1 1 auto;
            min-width: 0;
        }}
        .logo-img {{
            width: 48px;
            height: 48px;
            min-width: 48px;
            border-radius: 6px;
            object-fit: cover;
            border: 2px solid rgba(255,255,255,0.3);
            flex-shrink: 0;
        }}
        .header-title-box {{
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 0;
        }}
        .main-brand {{
            font-size: 13pt;
            font-weight: 800;
            letter-spacing: 0.4px;
            color: #FFFFFF;
            margin: 0;
            white-space: nowrap;
            line-height: 1.25;
        }}
        .sub-brand {{
            font-size: 8.5pt;
            color: {theme['sub_brand_color']};
            margin-top: 2px;
            font-weight: 600;
            line-height: 1.3;
        }}
        .header-meta {{
            flex: 0 0 auto;
            min-width: 210px;
            max-width: 44%;
            text-align: right;
            font-size: 8.4pt;
            color: #FFFFFF;
            background: {theme['meta_bg']};
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid {theme['meta_border']};
            display: flex;
            flex-direction: column;
            justify-content: center;
        }}
        .header-meta-topic {{
            font-weight: 600;
            font-size: 8.4pt;
            line-height: 1.35;
            margin-bottom: 3px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            word-break: break-word;
        }}
        .header-meta-links {{
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            font-size: 7.6pt;
            opacity: 0.95;
            white-space: nowrap;
        }}
        .header-meta a {{
            color: #FFFFFF;
            text-decoration: underline;
            font-weight: 600;
        }}
        .section-card {{ background-color: {theme['section_bg']}; border-left: 4.5px solid {theme['section_border']}; border-radius: 4px 8px 8px 4px; padding: 6px 12px; margin-top: 14px; margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; break-after: avoid; }}
        .section-title-row {{ display: flex; align-items: center; justify-content: space-between; gap: 8px; }}
        .section-title {{ font-size: 11pt; font-weight: 700; color: {theme['section_title']}; }}
        .marks-badge {{ display: inline-block; flex-shrink: 0; background: {theme['section_border']}; color: #FFFFFF; font-size: 7.8pt; font-weight: 700; padding: 2px 9px; border-radius: 10px; white-space: nowrap; }}
        .paragraph {{ margin: 0 0 8px 0; text-align: left; overflow-wrap: anywhere; word-break: normal; page-break-inside: avoid; break-inside: avoid; }}
        .bullet {{ margin: 6px 0 8px 10px; line-height: 1.62; text-align: left; overflow-wrap: anywhere; word-break: normal; page-break-inside: avoid; break-inside: avoid; }}
        .sub-bullet {{ margin: 4px 0 6px 24px; color: {theme['sub_bullet_color']}; font-weight: 500; text-align: left; page-break-inside: avoid; break-inside: avoid; }}
        .example-badge {{ display: inline-block; background-color: {theme['callout_bg']}; border-left: 3px solid {theme['callout_border']}; color: {theme['callout_text']}; padding: 2px 8px; border-radius: 3px; font-size: 9.2pt; margin-left: 4px; margin-top: 2px; }}
        .callout-box {{ background-color: {theme['callout_bg']}; border-left: 4px solid {theme['callout_border']}; border-radius: 4px 8px 8px 4px; padding: 8px 12px; margin: 8px 0 10px 0; color: {theme['callout_text']}; font-size: 9.5pt; text-align: left; page-break-inside: avoid; break-inside: avoid; }}
        .example-item {{ margin-bottom: 4px; text-align: left; }}
        .example-item:last-child {{ margin-bottom: 0; }}
        .table-wrapper {{ width: 100%; margin: 10px 0 14px 0; overflow-x: auto; page-break-inside: avoid; break-inside: avoid; }}
        .note-table {{ width: 100%; border-collapse: collapse; font-size: 8.8pt; line-height: 1.45; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }}
        .note-table th {{ background: {theme['header_gradient']}; color: #FFFFFF; font-weight: 700; padding: 7px 10px; text-align: left; border: 1px solid rgba(0,0,0,0.08); font-size: 9pt; }}
        .note-table td {{ padding: 6px 10px; border: 1px solid #E2E8F0; color: #1E293B; vertical-align: top; text-align: left; }}
        .note-table tr:nth-child(even) td {{ background-color: #F8FAFC; }}
        .diagram-wrapper {{ width: 100%; margin: 14px 0 18px 0; text-align: center; page-break-inside: avoid; break-inside: avoid; }}
        .diagram-card {{ background-color: #FFFFFF; border: 1.5px solid {theme['section_border']}; border-radius: 8px; padding: 14px 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: inline-block; max-width: 98%; width: 100%; box-sizing: border-box; }}
        .diagram-badge {{ background: {theme['section_bg']}; color: {theme['section_title']}; font-size: 9pt; font-weight: 700; padding: 4px 12px; border-radius: 6px; border: 1px solid {theme['section_border']}; margin-bottom: 12px; display: inline-block; }}
        .diagram-svg-box {{ width: 100%; background-color: #FFFFFF; padding: 4px; border-radius: 6px; display: flex; justify-content: center; align-items: center; overflow: visible; }}
        .diagram-svg-box svg {{ max-width: 100%; height: auto; display: block; margin: 0 auto; overflow: visible !important; }}
        .diagram-img-box {{ width: 100%; background-color: #FFFFFF; padding: 4px; border-radius: 6px; display: flex; justify-content: center; align-items: center; }}
        .diagram-img {{ max-width: 100%; height: auto; max-height: 520px; object-fit: contain; background-color: #FFFFFF; border-radius: 4px; display: block; margin: 0 auto; }}
        .divider {{ border: 0; height: 1px; background-color: #E5E7EB; margin: 12px 0; }}
        .telegram-join-card {{ background-color: {theme['tg_card_bg']}; border: 1.5px dashed {theme['tg_card_border']}; border-radius: 8px; padding: 10px 14px; margin-top: 16px; margin-bottom: 12px; text-align: center; font-size: 9pt; color: #1E293B; page-break-inside: avoid; break-inside: avoid; }}
        .tg-link {{ color: {theme['tg_link_color']}; font-weight: 700; text-decoration: underline; font-size: 9.5pt; }}
    </style>
</head>
<body>
    <div class="content-wrapper">
        <div class="header-card">
            <div class="header-left">
                {logo_img_tag}
                <div class="header-title-box">
                    <div class="main-brand">A/L MCQ HUB AI TUTOR</div>
                    <div class="sub-brand">උසස් පෙළ {theme['subject_name']} අධ්‍යයන සටහන</div>
                </div>
            </div>
            <div class="header-meta">
                <div class="header-meta-topic"><b>මාතෘකාව:</b> {sanitized_title}</div>
                <div class="header-meta-links">
                    <span>🔗 <a href="https://t.me/+wZUSJyEncD1mYjFl" target="_blank">Telegram Group</a></span>
                    <span>•</span>
                    <span>🗓️ {date_str}</span>
                </div>
            </div>
        </div>
        <div class="content-body">{content_html}</div>
    </div>
</body>
</html>"""
    return html_template

def build_border_watermark_overlay(num_pages, border_color_hex, logo_bytes=None):
    buf = BytesIO()
    page_w, page_h = A4
    c = canvas.Canvas(buf, pagesize=A4)
    border_color = HexColor(border_color_hex)
    inset = BORDER_INSET_MM * mm

    logo_img = None
    if logo_bytes:
        try:
            logo_img = ImageReader(BytesIO(logo_bytes))
        except Exception:
            logo_img = None

    for _ in range(max(num_pages, 1)):
        if logo_img is not None:
            c.saveState()
            try:
                c.setFillAlpha(WATERMARK_OPACITY)
            except Exception:
                pass
            wm_size = WATERMARK_SIZE_MM * mm
            c.drawImage(logo_img, (page_w - wm_size) / 2, (page_h - wm_size) / 2,
                        width=wm_size, height=wm_size, preserveAspectRatio=True, mask='auto')
            c.restoreState()

        c.saveState()
        c.setStrokeColor(border_color)
        radius = 5 * mm
        c.setLineWidth(1.1)
        c.roundRect(inset, inset, page_w - 2 * inset, page_h - 2 * inset, radius, stroke=1, fill=0)
        inner_gap = 2.4
        c.setLineWidth(0.6)
        c.roundRect(inset + inner_gap, inset + inner_gap,
                    page_w - 2 * inset - 2 * inner_gap, page_h - 2 * inset - 2 * inner_gap,
                    max(radius - 1, 1), stroke=1, fill=0)
        c.restoreState()
        c.showPage()

    c.save()
    return buf.getvalue()

def generate_pdf_study_note(topic_title, raw_content, output_path, subject_code="auto"):
    theme = resolve_theme(subject_code, topic_title, raw_content)
    logo_data_uri, logo_bytes = load_logo_assets()
    html_content = build_pdf_html(topic_title, raw_content, logo_data_uri, subject_code=subject_code)

    output_path = str(output_path)
    content_pdf_path = output_path + ".content.tmp.pdf"

    ensure_playwright_installed()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_content(html_content, wait_until="networkidle", timeout=25000)
        page.evaluate("() => document.fonts.ready")
        page.wait_for_timeout(200)
        page.pdf(
            path=content_pdf_path,
            format="A4",
            margin={
                "top": f"{CONTENT_MARGIN_TOP_MM}mm",
                "bottom": f"{CONTENT_MARGIN_BOTTOM_MM}mm",
                "left": f"{CONTENT_MARGIN_SIDE_MM}mm",
                "right": f"{CONTENT_MARGIN_SIDE_MM}mm",
            },
            print_background=True,
            display_header_footer=True,
            footer_template=build_footer_template(theme),
            header_template="<div></div>",
        )
        browser.close()

    reader = PdfReader(content_pdf_path)
    num_pages = len(reader.pages)
    overlay_bytes = build_border_watermark_overlay(num_pages, theme['border_color'], logo_bytes)
    overlay_reader = PdfReader(BytesIO(overlay_bytes))

    writer = PdfWriter()
    for i, content_page in enumerate(reader.pages):
        overlay_page = overlay_reader.pages[i] if i < len(overlay_reader.pages) else overlay_reader.pages[-1]
        content_page.merge_page(overlay_page)
        writer.add_page(content_page)

    with open(output_path, "wb") as f:
        writer.write(f)

    if os.path.exists(content_pdf_path):
        os.remove(content_pdf_path)
    return output_path

def build_pdf_paper_html(topic_title, raw_content, logo_base64, subject_code="auto"):
    theme = resolve_theme(subject_code, topic_title, raw_content)
    sanitized_title = sanitize_text_for_pdf(topic_title)
    sanitized_title = remove_ending_followup_captions(sanitized_title)
    body_text = sanitize_text_for_pdf(raw_content)
    body_text = remove_ending_followup_captions(body_text)

    is_past = any(k in topic_title.lower() or k in raw_content.lower()
                  for k in ['පසුගිය', 'past', '202', '201'])
    if is_past:
        dept_title_str = "අධ්‍යයන පොදු සහතික පත්‍ර (උසස් පෙළ) විභාගය"
        dept_sub_str = "General Certificate of Education (Adv. Level) Examination"
        paper_type_str = "II කොටස — ව්‍යුහගත හා රචනා ප්‍රශ්න සහ නිල ලකුණු දීමේ පටිපාටිය"
    else:
        dept_title_str = "අධ්‍යයන පොදු සහතික පත්‍ර (උසස් පෙළ) ආදර්ශ විභාගය"
        dept_sub_str = "General Certificate of Education (Adv. Level) Model Examination"
        paper_type_str = "ආදර්ශ II කොටස — ව්‍යුහගත හා රචනා ප්‍රශ්න සහ නිල ලකුණු දීමේ පටිපාටිය"

    def md(text):
        if not text:
            return ""
        t = text
        t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
        t = re.sub(r'__(.+?)__', r'<strong>\1</strong>', t)
        t = re.sub(r'(?<!\*)\*([^\*\n]+)\*(?!\*)', r'<em>\1</em>', t)
        t = re.sub(r'(?<!_)_([^_\n]+)_(?!_)', r'<em>\1</em>', t)
        t = re.sub(r'\*{2,}', '', t)
        t = re.sub(r'^#{1,6}\s*', '', t).strip()
        return t

    lines = body_text.split('\n')
    parts = []
    in_table = False
    table_header = []
    table_rows = []

    def flush_table():
        nonlocal in_table, table_header, table_rows
        if not table_header and not table_rows:
            in_table = False
            return
        h = "<table class='ms-table'><thead><tr>"
        for col in table_header:
            h += f"<th>{md(col)}</th>"
        h += "</tr></thead><tbody>"
        for row in table_rows:
            h += "<tr>" + "".join(f"<td>{md(c)}</td>" for c in row) + "</tr>"
        h += "</tbody></table>"
        parts.append(h)
        in_table = False
        table_header = []
        table_rows = []

    for raw in lines:
        s = raw.strip()
        if not s or is_stray_marker_line(s):
            if in_table:
                flush_table()
            parts.append("<div class='vsp'></div>")
            continue

        if s.startswith('|') and s.endswith('|'):
            cells = [c.strip() for c in s.split('|')[1:-1]]
            if all(re.match(r'^[-:]+$', c.replace(' ', '')) for c in cells):
                continue
            if not in_table:
                in_table = True
                table_header = cells
            else:
                table_rows.append(cells)
            continue
        else:
            if in_table:
                flush_table()

        if re.match(r'^[-\u2500\u2550*]{3,}$', s):
            parts.append("<hr class='sec-hr'>")
            continue

        if s.startswith('>'):
            text = md(re.sub(r'^>\s*', '', s))
            parts.append(f"<blockquote class='bq'>{text}</blockquote>")
            continue

        heading_m = re.match(r'^(#{1,4})\s*(.+)$', s)
        is_keyword_heading = any(kw in s for kw in [
            'II කොටස', 'Part II', 'ව්‍යුහගත', 'රචනා ප්‍රශ්න',
            'ලකුණු දීමේ', 'Marking Scheme', 'ආදර්ශ පිළිතුරු',
            'I කොටස', 'Part I', 'MCQ', 'බහුවරණ',
            'A කාණ්ඩය', 'B කාණ්ඩය', 'C කාණ්ඩය', 'D කාණ්ඩය',
        ])
        if heading_m or is_keyword_heading:
            raw_title = heading_m.group(2) if heading_m else s
            raw_title = re.sub(r'^[#📌✍️📝💡\s\*]+', '', raw_title).replace('**', '').strip()
            title_html, marks_badge = extract_marks_badge(md(raw_title))

            if any(kw in s for kw in ['II කොටස', 'Part II', 'Structured', 'Essay', 'ව්‍යුහගත', 'රචනා']):
                parts.append(f"<div class='banner banner-p2'>✍️ <span class='banner-txt'>{title_html}</span>{marks_badge}</div>")
            elif any(kw in s for kw in ['I කොටස', 'Part I', 'MCQ', 'බහුවරණ']):
                parts.append(f"<div class='banner banner-p1'>📝 <span class='banner-txt'>{title_html}</span>{marks_badge}</div>")
            elif any(kw in s for kw in ['ලකුණු දීමේ', 'Marking Scheme', 'ආදර්ශ පිළිතුරු']):
                parts.append(f"<div class='banner banner-ms'>💡 <span class='banner-txt'>{title_html}</span>{marks_badge}</div>")
            elif any(kw in s for kw in ['A කාණ්ඩය', 'B කාණ්ඩය', 'C කාණ්ඩය', 'D කාණ්ඩය']):
                parts.append(f"<div class='sub-head'>{title_html}{marks_badge}</div>")
            else:
                parts.append(f"<div class='sec-head'>{title_html}{marks_badge}</div>")
            continue

        marks_m = re.search(r'\(\s*(?:ලකුණු|Marks?)\s*[:\-]?\s*([^\)]*)\)', s)
        marks_html = f"<span class='marks'>🎯 ලකුණු {marks_m.group(1).strip()}</span>" if marks_m else ""

        def strip_marks(t):
            t = re.sub(r'\(\s*(?:ලකුණු|Marks?)\s*[:\-]?\s*[^\)]*\)', '', t)
            return re.sub(r'[\*\s]+$', '', t).strip()

        # Main question: MUST explicitly begin with question keywords (ප්‍රශ්නය / ප්‍රශ්න අංක / Question / Q.)
        main_q = (re.match(r'^(?:ප්‍රශ්නය|ප්‍රශ්න\s*අංක|Question|Q\.?)\s*(\d{1,2})[\.:\-]?\s+(.+)', s, re.IGNORECASE) or
                  re.match(r'^(?:ප්‍රශ්නය|ප්‍රශ්න\s*අංක|Question|Q\.?)\s*(\d{1,2})\s+(.+)', s, re.IGNORECASE))
        if main_q:
            num = main_q.group(1)
            body = md(strip_marks(main_q.group(2)))
            parts.append(
                f"<div class='q-main'>"
                f"<span class='q-num'>ප්‍රශ්නය {num}.</span>"
                f"<span class='q-body'>{body}{marks_html}</span>"
                f"</div>"
            )
            continue

        # Sub question: Roman numerals (i), (ii), (iii)...
        sub_q = re.match(r'^\(([ivxlIVXL]+)\)\s+(.+)', s)
        if sub_q:
            label = sub_q.group(1)
            body = md(strip_marks(sub_q.group(2)))
            parts.append(
                f"<div class='q-sub'>"
                f"<span class='q-sub-lbl'>({label})</span>"
                f"<span class='q-sub-body'>{body}{marks_html}</span>"
                f"</div>"
            )
            continue

        # Deep sub-question: Alpha (a), (b), (c)...
        alpha_q = re.match(r'^\(([a-zA-Z])\)\s+(.+)', s)
        if alpha_q:
            label = alpha_q.group(1)
            body = md(strip_marks(alpha_q.group(2)))
            parts.append(
                f"<div class='q-deep'>"
                f"<span class='q-deep-lbl'>({label})</span>"
                f"<span class='q-deep-body'>{body}{marks_html}</span>"
                f"</div>"
            )
            continue

        # MCQ option: (1), (2), (3), (4), (5)
        opt_m = re.match(r'^\(([1-5])\)\s+(.+)', s)
        if opt_m:
            body = md(opt_m.group(2))
            parts.append(
                f"<div class='q-opt'>"
                f"<span class='q-opt-n'>({opt_m.group(1)})</span>"
                f"<span>{body}</span>"
                f"</div>"
            )
            continue

        # Numbered list item: 1. 2. 3. (inside answer points or text)
        num_li = re.match(r'^(\d+(?:\.\d+)?)[\.\)]\s+(.+)', s)
        if num_li:
            num = num_li.group(1)
            body = md(strip_marks(num_li.group(2)))
            cls = 'li-sub' if '.' in num else 'li-main'
            parts.append(
                f"<div class='{cls}'>"
                f"<span class='li-num'>{num}.</span>"
                f"<span>{body}{marks_html}</span>"
                f"</div>"
            )
            continue

        # Bullet / answer point
        blt = re.match(r'^[•\-\*\u25b8]\s+(.+)', s)
        if blt:
            body = md(blt.group(1))
            parts.append(f"<div class='ans-pt'><span class='ans-dot'>•</span><span>{body}</span></div>")
            continue

        text = md(s)
        if re.match(r'^(?:\d+\.\d+|\d+)\s*[:—\-]\s', s) or 'නිවැරදි' in s or 'Correct' in s:
            parts.append(f"<p class='ms-ans'>{text}</p>")
        else:
            parts.append(f"<p class='para'>{text}</p>")

    if in_table:
        flush_table()

    logo_img_tag = (f"<img src='{logo_base64}' class='exam-logo'/>"
                    if logo_base64 else "<div class='exam-logo-ph'>🎓</div>")
    body_html = "\n".join(parts)

    html = f"""<!DOCTYPE html>
<html lang="si">
<head>
    <meta charset="UTF-8">
    <title>{sanitized_title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@300;400;500;600;700;800&display=swap');
        * {{
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        body {{
            font-family: 'Noto Sans Sinhala', 'Nirmala UI', 'Iskoola Pota', sans-serif;
            font-size: 10pt;
            line-height: 1.65;
            color: #111827;
            background: #fff;
            margin: 0;
            padding: 0;
            overflow-wrap: anywhere;
            word-break: normal;
            text-align: left;
        }}
        .wrapper {{ padding: 4px 6px; }}
        .exam-hdr {{
            border: 2px solid {theme['border_color']};
            border-radius: 6px;
            margin-bottom: 12px;
            background: #FAFBFC;
            page-break-inside: avoid;
            break-inside: avoid;
        }}
        .hdr-top {{
            display: flex;
            align-items: stretch;
            border-bottom: 1.5px solid {theme['border_color']};
        }}
        .hdr-logo {{
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 8px 10px;
            border-right: 1px solid {theme['border_color']};
            min-width: 62px;
        }}
        .exam-logo {{
            width: 40px;
            height: 40px;
            object-fit: contain;
            border-radius: 3px;
        }}
        .exam-logo-ph {{
            font-size: 26pt;
            line-height: 1;
        }}
        .hdr-logo-lbl {{
            font-size: 5.8pt;
            font-weight: 700;
            color: {theme['section_title']};
            margin-top: 2px;
            text-align: center;
        }}
        .hdr-center {{
            flex: 1;
            text-align: center;
            padding: 8px 10px;
        }}
        .hdr-dept {{
            font-size: 11pt;
            font-weight: 800;
            color: #111827;
            line-height: 1.2;
        }}
        .hdr-dept-en {{
            font-size: 7.2pt;
            color: #6B7280;
            font-weight: 500;
        }}
        .hdr-subject {{
            font-size: 14pt;
            font-weight: 800;
            color: {theme['section_title']};
            margin-top: 3px;
            line-height: 1.2;
        }}
        .hdr-ptype {{
            font-size: 7.8pt;
            color: #374151;
            font-weight: 600;
            margin-top: 2px;
        }}
        .hdr-index {{
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 8px 10px;
            border-left: 1px solid {theme['border_color']};
            min-width: 115px;
        }}
        .idx-lbl {{
            font-size: 6.5pt;
            font-weight: 700;
            color: #374151;
            margin-bottom: 3px;
            text-align: center;
        }}
        .idx-boxes {{
            display: flex;
            gap: 2px;
        }}
        .idx-boxes span {{
            display: inline-block;
            width: 13px;
            height: 17px;
            border: 1.2px solid #374151;
        }}
        .idx-time {{
            font-size: 6.8pt;
            font-weight: 700;
            color: {theme['section_title']};
            margin-top: 4px;
            text-align: center;
        }}
        .hdr-instr {{
            padding: 5px 12px 6px 12px;
            font-size: 7.8pt;
            color: #1F2937;
            line-height: 1.5;
            text-align: left;
        }}
        .instr-title {{
            font-size: 8pt;
            font-weight: 700;
            color: #1F2937;
            margin-bottom: 2px;
        }}
        .instr-ul {{
            margin: 0;
            padding-left: 16px;
            color: #374151;
        }}
        .instr-ul li {{
            margin-bottom: 1px;
        }}
        .banner {{
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 10.5pt;
            font-weight: 700;
            margin: 12px 0 8px 0;
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: avoid;
        }}
        .banner-txt {{ flex: 1; }}
        .banner-p2 {{ background: #FFFBEB; color: #78350F; border-left: 4px solid #F59E0B; }}
        .banner-p1 {{ background: #EFF6FF; color: #1D4ED8; border-left: 4px solid #3B82F6; }}
        .banner-ms {{ background: #F0FDF4; color: #14532D; border-left: 4px solid #22C55E; }}
        .sec-head {{ background: {theme['section_bg']}; border-left: 4px solid {theme['section_border']}; color: {theme['section_title']}; padding: 5px 10px; font-size: 10pt; font-weight: 700; margin: 10px 0 6px 0; border-radius: 0 3px 3px 0; page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; }}
        .sub-head {{ background: #F1F5F9; border-left: 3px solid {theme['section_border']}; color: #1E293B; padding: 4px 10px; font-size: 9.8pt; font-weight: 700; margin: 8px 0 5px 0; page-break-inside: avoid; break-inside: avoid; }}
        .q-main {{ display: flex; align-items: baseline; gap: 8px; margin: 14px 0 5px 0; page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; }}
        .q-num {{ font-size: 10.5pt; font-weight: 800; color: {theme['section_title']}; white-space: nowrap; min-width: 90px; flex-shrink: 0; }}
        .q-body {{ font-size: 10pt; font-weight: 600; color: #111827; flex: 1; line-height: 1.6; text-align: left; }}
        .q-sub {{ display: flex; align-items: baseline; gap: 6px; margin: 5px 0 3px 22px; page-break-inside: avoid; break-inside: avoid; }}
        .q-sub-lbl {{ font-size: 9.8pt; font-weight: 700; color: #374151; white-space: nowrap; min-width: 28px; flex-shrink: 0; }}
        .q-sub-body {{ font-size: 9.8pt; color: #1F2937; flex: 1; line-height: 1.6; text-align: left; }}
        .q-deep {{ display: flex; align-items: baseline; gap: 5px; margin: 4px 0 3px 42px; page-break-inside: avoid; break-inside: avoid; }}
        .q-deep-lbl {{ font-size: 9.5pt; font-weight: 600; color: #4B5563; white-space: nowrap; min-width: 24px; flex-shrink: 0; }}
        .q-deep-body {{ font-size: 9.5pt; color: #374151; flex: 1; line-height: 1.6; text-align: left; }}
        .q-opt {{ display: flex; align-items: baseline; gap: 6px; margin: 2px 0 2px 32px; font-size: 9.5pt; color: #1F2937; page-break-inside: avoid; text-align: left; }}
        .q-opt-n {{ font-weight: 600; min-width: 22px; flex-shrink: 0; color: #374151; }}
        .li-main {{ display: flex; align-items: baseline; gap: 6px; margin: 4px 0 3px 22px; page-break-inside: avoid; break-inside: avoid; text-align: left; }}
        .li-sub {{ display: flex; align-items: baseline; gap: 6px; margin: 4px 0 3px 36px; page-break-inside: avoid; break-inside: avoid; text-align: left; }}
        .li-num {{ font-size: 9.8pt; font-weight: 700; color: #374151; white-space: nowrap; min-width: 20px; flex-shrink: 0; }}
        .marks {{ display: inline-block; background: {theme['section_title']}; color: #fff; font-size: 7pt; font-weight: 700; padding: 1px 6px; border-radius: 3px; margin-left: 6px; white-space: nowrap; vertical-align: middle; }}
        .marks-badge {{ display: inline-block; background: {theme['section_title']}; color: #fff; font-size: 7pt; font-weight: 700; padding: 1px 6px; border-radius: 3px; margin-left: 8px; white-space: nowrap; vertical-align: middle; flex-shrink: 0; }}
        .ans-pt {{ display: flex; align-items: baseline; gap: 5px; margin: 3px 0 3px 18px; font-size: 9.5pt; color: #1F2937; text-align: left; }}
        .ans-dot {{ font-weight: 700; color: {theme['section_title']}; flex-shrink: 0; }}
        .ms-ans {{ margin: 2px 0; font-size: 9.2pt; color: #166534; font-weight: 500; background: #F0FDF4; border-left: 3px solid #22C55E; padding: 3px 8px; border-radius: 0 3px 3px 0; page-break-inside: avoid; text-align: left; }}
        .ms-table {{ width: 100%; table-layout: fixed; border-collapse: collapse; margin: 8px 0; font-size: 8.8pt; page-break-inside: avoid; text-align: left; }}
        .ms-table th {{ background: #1E293B; color: #fff; padding: 5px 8px; text-align: left; font-weight: 700; border: 1px solid #334155; overflow-wrap: anywhere; }}
        .ms-table td {{ padding: 4px 8px; border: 1px solid #CBD5E1; color: #111827; overflow-wrap: anywhere; text-align: left; }}
        .ms-table tr:nth-child(even) td {{ background: #F8FAFC; }}
        blockquote.bq {{ margin: 6px 0; padding: 6px 12px; background: #F8FAFC; border-left: 3px solid {theme['border_color']}; font-style: italic; color: #374151; border-radius: 0 3px 3px 0; font-size: 9.5pt; overflow-wrap: anywhere; page-break-inside: avoid; text-align: left; }}
        .para {{ margin: 0 0 6px 0; font-size: 9.8pt; color: #1F2937; line-height: 1.65; text-align: left; overflow-wrap: anywhere; page-break-inside: avoid; }}
        .vsp {{ height: 4px; }}
        hr.sec-hr {{ border: none; border-top: 1px solid #CBD5E1; margin: 10px 0; }}
        .tg-card {{ border: 1px solid #CBD5E1; border-radius: 4px; padding: 6px 12px; margin-top: 14px; text-align: center; font-size: 8pt; color: #374151; page-break-inside: avoid; }}
        .tg-card a {{ color: {theme['tg_link_color']}; font-weight: 700; text-decoration: none; }}
    </style>
</head>
<body>
<div class="wrapper">
    <div class="exam-hdr">
        <div class="hdr-top">
            <div class="hdr-logo">
                {logo_img_tag}
                <div class="hdr-logo-lbl">A/L MCQ HUB</div>
            </div>
            <div class="hdr-center">
                <div class="hdr-dept">{dept_title_str}</div>
                <div class="hdr-dept-en">{dept_sub_str}</div>
                <div class="hdr-subject">{theme['subject_name']}</div>
                <div class="hdr-ptype">{paper_type_str}</div>
            </div>
            <div class="hdr-index">
                <div class="idx-lbl">විභාග අංකය / Index No:</div>
                <div class="idx-boxes">
                    <span></span><span></span><span></span><span></span>
                    <span></span><span></span><span></span>
                </div>
                <div class="idx-time">කාලය: පැය 03 යි</div>
            </div>
        </div>
        <div class="hdr-instr">
            <div class="instr-title">📌 අපේක්ෂකයින් සඳහා උපදෙස් (Instructions to Candidates):</div>
            <ul class="instr-ul">
                <li>Part II (ව්‍යුහගත හා රචනා) ප්‍රශ්නවලට <strong>ලබා දී ඇති පිළිතුරු පත්‍රවල</strong> පැහැදිලිව පිළිතුරු සපයන්න.</li>
                <li>MCQ Quiz (Part I) Telegram Bot හි <strong>🎯 MCQ Quiz ආරම්භ කරන්න</strong> බොත්තම ඔබා ලබා ගන්න.</li>
                <li>ප්‍රශ්න පත්‍රය අවසානයේ <strong>නිල ලකුණු දීමේ පටිපාටිය (Official Marking Scheme)</strong> ඇතුළත් වේ.</li>
            </ul>
        </div>
    </div>
    {body_html}
    <div class="tg-card">
        📢 <b>A/L MCQ HUB AI Tutor (සිංහල) |</b>
        <a href="https://t.me/+wZUSJyEncD1mYjFl">👉 Telegram Group: https://t.me/+wZUSJyEncD1mYjFl</a>
    </div>
</div>
</body>
</html>"""
    return html

def generate_pdf_paper(topic_title, raw_content, output_path, subject_code="auto"):
    theme = resolve_theme(subject_code, topic_title, raw_content)
    logo_data_uri, logo_bytes = load_logo_assets()
    html_content = build_pdf_paper_html(topic_title, raw_content, logo_data_uri, subject_code=subject_code)

    output_path = str(output_path)
    content_pdf_path = output_path + ".content.tmp.pdf"

    ensure_playwright_installed()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_content(html_content, wait_until="networkidle", timeout=25000)
        page.evaluate("() => document.fonts.ready")
        page.wait_for_timeout(200)
        page.pdf(
            path=content_pdf_path,
            format="A4",
            margin={
                "top": f"{CONTENT_MARGIN_TOP_MM}mm",
                "bottom": f"{CONTENT_MARGIN_BOTTOM_MM}mm",
                "left": f"{CONTENT_MARGIN_SIDE_MM}mm",
                "right": f"{CONTENT_MARGIN_SIDE_MM}mm",
            },
            print_background=True,
            display_header_footer=True,
            footer_template=build_footer_template(theme),
            header_template="<div></div>",
        )
        browser.close()

    reader = PdfReader(content_pdf_path)
    num_pages = len(reader.pages)
    overlay_bytes = build_border_watermark_overlay(num_pages, theme['border_color'], logo_bytes)
    overlay_reader = PdfReader(BytesIO(overlay_bytes))

    writer = PdfWriter()
    for i, content_page in enumerate(reader.pages):
        overlay_page = overlay_reader.pages[i] if i < len(overlay_reader.pages) else overlay_reader.pages[-1]
        content_page.merge_page(overlay_page)
        writer.add_page(content_page)

    with open(output_path, "wb") as f:
        writer.write(f)

    if os.path.exists(content_pdf_path):
        os.remove(content_pdf_path)
    return output_path

def render_mermaid_to_high_res_png(mermaid_code, out_png_path, subject_code="auto", scale_factor=4, timeout_sec=20):
    """
    Renders Mermaid code into an Ultra-HD 4x scale PNG for Telegram chat photos
    with subject theme colors, high-contrast crisp Sinhala typography and zero text cropping.
    """
    clean_code = mermaid_code.strip()
    theme = resolve_theme(subject_code, clean_code, clean_code)
    primary_color = theme.get('section_bg', '#EFF6FF')
    border_color = theme.get('section_border', '#2563EB')
    text_color = '#0F172A'

    processed_code = format_sinhala_mermaid_labels(clean_code)

    try:
        ensure_pdf_dependencies()
        html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<style>
  *, *::before, *::after {{
    box-sizing: border-box;
    font-family: 'Noto Sans Sinhala', 'Outfit', Arial, sans-serif !important;
  }}
  body {{
    margin: 0;
    padding: 30px 40px;
    background: #FFFFFF;
    display: flex;
    justify-content: center;
    align-items: center;
    -webkit-font-smoothing: antialiased !important;
    -moz-osx-font-smoothing: grayscale !important;
    text-rendering: optimizeLegibility !important;
  }}
  #wrapper {{
    display: inline-block;
    background: #FFFFFF;
    padding: 28px 38px;
    border-radius: 18px;
    box-shadow: 0 4px 28px rgba(0, 0, 0, 0.07);
    border: 2px solid {border_color}33;
    overflow: visible !important;
  }}
  svg {{
    max-width: 100%;
    height: auto;
    overflow: visible !important;
    shape-rendering: geometricPrecision !important;
    text-rendering: optimizeLegibility !important;
  }}
  text, tspan {{
    font-family: 'Noto Sans Sinhala', 'Outfit', Arial, sans-serif !important;
    font-weight: 700 !important;
    fill: #0F172A !important;
    color: #0F172A !important;
    -webkit-font-smoothing: antialiased !important;
  }}
  .node foreignObject,
  .edgeLabel foreignObject,
  .edgeLabel span,
  .transition-label,
  .state-label {{
    white-space: normal !important;
    overflow-wrap: break-word !important;
    word-break: normal !important;
    overflow: visible !important;
    line-height: 1.45 !important;
  }}
  .node foreignObject div,
  .node foreignObject span,
  .node foreignObject p {{
    text-align: center !important;
    font-size: 16px !important;
    line-height: 1.55 !important;
    font-weight: 700 !important;
    color: #0F172A !important;
    font-family: 'Noto Sans Sinhala', 'Outfit', Arial, sans-serif !important;
    white-space: normal !important;
    word-break: normal !important;
    overflow-wrap: break-word !important;
    -webkit-font-smoothing: antialiased !important;
  }}
  .node foreignObject p {{
    margin: 0 !important;
  }}
  .node foreignObject > div {{
    padding: 8px 12px !important;
    display: table-cell !important;
    vertical-align: middle !important;
  }}
  .node rect, .node circle, .node polygon, .node path {{
    rx: 8px !important;
    ry: 8px !important;
    stroke-width: 2.2px !important;
    stroke: {border_color} !important;
    fill: {primary_color} !important;
  }}
  .edgePath path {{
    stroke: {border_color} !important;
    stroke-width: 2.4px !important;
  }}
  .arrowheadPath {{
    fill: {border_color} !important;
    stroke: {border_color} !important;
  }}
  .edgeLabel {{
    font-size: 14px !important;
    font-weight: 700 !important;
    background-color: #FFFFFF !important;
    padding: 3px 8px !important;
    border-radius: 6px !important;
    color: #1E40AF !important;
    border: 1px solid #93C5FD !important;
    white-space: normal !important;
  }}
  .edgeLabel rect, .label rect {{
    overflow: visible !important;
    rx: 4px;
  }}
</style>
</head>
<body>
<div id="wrapper">
  <div id="diagram-container"></div>
</div>
<script>
  window.renderDiagram = async function() {{
    await document.fonts.ready;
    
    mermaid.initialize({{
      startOnLoad: false,
      theme: 'base',
      themeVariables: {{
        fontFamily: "'Noto Sans Sinhala', 'Outfit', Arial, sans-serif",
        fontSize: '16px',
        primaryColor: '{primary_color}',
        primaryBorderColor: '{border_color}',
        primaryTextColor: '#0F172A',
        lineColor: '{border_color}',
        textColor: '#0F172A',
        mainBkg: '{primary_color}',
        nodeBorder: '{border_color}',
        clusterBkg: '#F8FAFC',
        clusterBorder: '#CBD5E1',
        defaultLinkColor: '{border_color}',
        edgeLabelBackground: '#FFFFFF',
        nodePadding: '48px',
        cScale0: '#E0F2FE',
        cScale1: '#DCFCE7',
        cScale2: '#FEF3C7',
        cScale3: '#EDE9FE',
        cScale4: '#FCE7F3',
        cScale5: '#F1F5F9',
        cScaleLabel0: '#0369A1',
        cScaleLabel1: '#15803D',
        cScaleLabel2: '#B45309',
        cScaleLabel3: '#6D28D9',
        cScaleLabel4: '#BE185D',
        cScaleLabel5: '#334155'
      }},
      flowchart: {{
        curve: 'basis',
        nodeSpacing: 44,
        rankSpacing: 55,
        padding: 48,
        useMaxWidth: false,
        htmlLabels: true,
        wrappingWidth: 220
      }},
      mindmap: {{
        padding: 40,
        maxNodeWidth: 260
      }}
    }});

    const code = {json.dumps(processed_code)};
    const {{ svg }} = await mermaid.render('mermaid-svg-root', code);
    document.getElementById('diagram-container').innerHTML = svg;

    const svgEl = document.querySelector('#diagram-container svg');
    if (svgEl) {{
      svgEl.querySelectorAll('text').forEach(t => {{
        t.style.fontWeight = '700';
        t.style.fontFamily = "'Noto Sans Sinhala', 'Outfit', Arial, sans-serif";
      }});

      const curVb = svgEl.getAttribute('viewBox');
      if (curVb) {{
        const parts = curVb.split(/[\\s,]+/).map(Number);
        if (parts.length === 4) {{
          const pad = 24;
          svgEl.setAttribute('viewBox', `${{parts[0] - pad}} ${{parts[1] - pad}} ${{parts[2] + pad * 2}} ${{parts[3] + pad * 2}}`);
        }}
      }}
    }}
  }};
</script>
</body>
</html>"""

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(device_scale_factor=scale_factor)
            page.set_content(html_content, wait_until="networkidle")
            page.evaluate("() => window.renderDiagram()")
            page.wait_for_selector("#diagram-container svg", timeout=12000)
            page.wait_for_timeout(350)
            page.evaluate("""() => new Promise(requestAnimationFrame)""")

            wrapper_el = page.locator("#wrapper")
            wrapper_el.screenshot(path=out_png_path)
            browser.close()
            return out_png_path
    except Exception as e:
        print(f"Notice rendering local high-res diagram: {e}", file=sys.stderr, flush=True)

    # Fallback to mermaid.ink
    try:
        state = {
            "code": processed_code,
            "mermaid": {
                "theme": "base",
                "themeVariables": {
                    "fontFamily": "Noto Sans Sinhala, Arial, sans-serif",
                    "fontSize": "17px",
                    "primaryColor": primary_color,
                    "primaryBorderColor": border_color,
                    "primaryTextColor": text_color,
                    "lineColor": border_color,
                    "textColor": text_color,
                    "mainBkg": primary_color,
                    "nodeBorder": border_color,
                    "nodePadding": "36px"
                }
            },
            "autoSync": True,
            "rough": False
        }
        json_bytes = json.dumps(state, ensure_ascii=False).encode('utf-8')
        compressed = zlib.compress(json_bytes, level=9)
        pako_b64 = base64.urlsafe_b64encode(compressed).decode('ascii')
        img_url = f"https://mermaid.ink/img/pako:{pako_b64}?bgColor=white"
        req_img = urllib.request.Request(img_url, headers={'User-Agent': 'AL-MCQ-HUB-Bot/1.0'})
        with urllib.request.urlopen(req_img, timeout=timeout_sec) as resp:
            if resp.status == 200:
                with open(out_png_path, "wb") as f:
                    f.write(resp.read())
                return out_png_path
    except Exception:
        pass
    return None

if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) >= 4 and sys.argv[1] == "render_diagram":
        code_input = sys.argv[2]
        out_png = sys.argv[3]
        sub_code = sys.argv[4] if len(sys.argv) >= 5 else "auto"
        if os.path.exists(code_input):
            with open(code_input, 'r', encoding='utf-8') as f:
                code_text = f.read()
        else:
            code_text = code_input
        res = render_mermaid_to_high_res_png(code_text, out_png, subject_code=sub_code)
        print(f"SUCCESS: Rendered diagram {res}")
    elif len(sys.argv) >= 4:
        title = sys.argv[1]
        text_file = sys.argv[2]
        out_pdf = sys.argv[3]
        sub_code = sys.argv[4] if len(sys.argv) >= 5 else "auto"
        mode_arg = sys.argv[5] if len(sys.argv) >= 6 else "note"

        with open(text_file, 'r', encoding='utf-8') as f:
            content = f.read()

        if mode_arg == "paper":
            generate_pdf_paper(title, content, out_pdf, subject_code=sub_code)
        else:
            generate_pdf_study_note(title, content, out_pdf, subject_code=sub_code)
        print("SUCCESS: Playwright PDF created successfully")
    else:
        print("Usage: python generate_pdf_note.py <topic_title> <text_file_path> <output_pdf_path> [subject_code] [mode]")
