import os
import sys

if sys.stdout:
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from playwright.sync_api import sync_playwright
from PIL import Image

SUBJECTS_CONFIG = [
    {
        "code": "si",
        "name": "සිංහල",
        "english": "Sinhala Language & Literature",
        "icon": "📝",
        "theme_color": "#0284C7",
        "gradient": "linear-gradient(135deg, #0369A1 0%, #0284C7 50%, #38BDF8 100%)",
        "glow_color": "rgba(56, 189, 248, 0.4)",
        "morning_time": "05:15 AM",
        "evening_time": "06:15 PM"
    },
    {
        "code": "bc",
        "name": "බෞද්ධ ශිෂ්ටාචාරය",
        "english": "Buddhist Civilization",
        "icon": "☸️",
        "theme_color": "#7C3AED",
        "gradient": "linear-gradient(135deg, #5B21B6 0%, #7C3AED 50%, #C084FC 100%)",
        "glow_color": "rgba(192, 132, 252, 0.4)",
        "morning_time": "05:35 AM",
        "evening_time": "06:45 PM"
    },
    {
        "code": "agri",
        "name": "කෘෂි විද්‍යාව",
        "english": "Agricultural Science",
        "icon": "🌱",
        "theme_color": "#16A34A",
        "gradient": "linear-gradient(135deg, #14532D 0%, #16A34A 50%, #4ADE80 100%)",
        "glow_color": "rgba(74, 222, 128, 0.4)",
        "morning_time": "05:55 AM",
        "evening_time": "07:15 PM"
    },
    {
        "code": "hist",
        "name": "ඉතිහාසය",
        "english": "History",
        "icon": "🏛️",
        "theme_color": "#D97706",
        "gradient": "linear-gradient(135deg, #92400E 0%, #D97706 50%, #FBBF24 100%)",
        "glow_color": "rgba(251, 191, 36, 0.4)",
        "morning_time": "06:15 AM",
        "evening_time": "07:45 PM"
    },
    {
        "code": "pl",
        "name": "දේශපාලන විද්‍යාව",
        "english": "Political Science",
        "icon": "⚖️",
        "theme_color": "#DC2626",
        "gradient": "linear-gradient(135deg, #991B1B 0%, #DC2626 50%, #F87171 100%)",
        "glow_color": "rgba(248, 113, 113, 0.4)",
        "morning_time": "06:30 AM",
        "evening_time": "08:15 PM"
    },
    {
        "code": "bs",
        "name": "ව්‍යාපාර අධ්‍යයනය",
        "english": "Business Studies",
        "icon": "💼",
        "theme_color": "#4F46E5",
        "gradient": "linear-gradient(135deg, #3730A3 0%, #4F46E5 50%, #818CF8 100%)",
        "glow_color": "rgba(129, 140, 248, 0.4)",
        "morning_time": "06:45 AM",
        "evening_time": "08:45 PM"
    },
    {
        "code": "geo",
        "name": "භූගෝල විද්‍යාව",
        "english": "Geography",
        "icon": "🌍",
        "theme_color": "#0D9488",
        "gradient": "linear-gradient(135deg, #115E59 0%, #0D9488 50%, #2DD4BF 100%)",
        "glow_color": "rgba(45, 212, 191, 0.4)",
        "morning_time": "07:00 AM",
        "evening_time": "09:15 PM"
    },
    {
        "code": "md",
        "name": "මාධ්‍ය අධ්‍යයනය",
        "english": "Media Studies",
        "icon": "📡",
        "theme_color": "#EC4899",
        "gradient": "linear-gradient(135deg, #BE185D 0%, #EC4899 50%, #F472B6 100%)",
        "glow_color": "rgba(244, 114, 182, 0.4)",
        "morning_time": "07:15 AM",
        "evening_time": "09:30 PM"
    },
    {
        "code": "dr",
        "name": "නාට්‍ය හා රංග කලාව",
        "english": "Drama & Theatre",
        "icon": "🎭",
        "theme_color": "#E11D48",
        "gradient": "linear-gradient(135deg, #9F1239 0%, #E11D48 50%, #FB7185 100%)",
        "glow_color": "rgba(251, 113, 133, 0.4)",
        "morning_time": "07:30 AM",
        "evening_time": "09:45 PM"
    },
    {
        "code": "mu",
        "name": "සංගීතය",
        "english": "Music",
        "icon": "🎵",
        "theme_color": "#8B5CF6",
        "gradient": "linear-gradient(135deg, #6D28D9 0%, #8B5CF6 50%, #A78BFA 100%)",
        "glow_color": "rgba(167, 139, 250, 0.4)",
        "morning_time": "07:45 AM",
        "evening_time": "10:00 PM"
    },
    {
        "code": "dn",
        "name": "නැටුම්",
        "english": "Dancing",
        "icon": "💃",
        "theme_color": "#F59E0B",
        "gradient": "linear-gradient(135deg, #B45309 0%, #F59E0B 50%, #FCD34D 100%)",
        "glow_color": "rgba(252, 211, 77, 0.4)",
        "morning_time": "08:00 AM",
        "evening_time": "10:15 PM"
    }
]

def generate_subject_html(sub):
    return f"""<!DOCTYPE html>
<html lang="si">
<head>
<meta charset="UTF-8">
<style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@600;700;800;900&family=Outfit:wght@600;700;800;900&family=JetBrains+Mono:wght@800&display=swap');

    * {{
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
    }}

    body {{
        width: 512px;
        height: 512px;
        background: transparent;
        font-family: 'Noto Sans Sinhala', 'Outfit', sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }}

    .sticker-card {{
        width: 504px;
        height: 504px;
        background: linear-gradient(150deg, #070D1E 0%, #0F1B3B 50%, #091228 100%);
        border: 3px solid {sub["theme_color"]};
        border-radius: 32px;
        padding: 22px 24px 18px 24px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.9), inset 0 2px 4px rgba(255, 255, 255, 0.25);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
    }}

    /* Top glowing line */
    .glow-line {{
        position: absolute;
        top: 0;
        left: 40px;
        right: 40px;
        height: 4px;
        background: {sub["gradient"]};
        border-radius: 4px;
        box-shadow: 0 2px 14px {sub["glow_color"]};
    }}

    /* Header */
    .header {{
        display: flex;
        align-items: center;
        justify-content: space-between;
    }}

    .badge-hub {{
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #E2E8F0;
        font-family: 'Outfit', sans-serif;
        font-size: 13px;
        font-weight: 800;
        padding: 5px 14px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }}

    .code-badge {{
        background: {sub["gradient"]};
        color: #FFFFFF;
        font-family: 'JetBrains Mono', monospace;
        font-size: 15px;
        font-weight: 800;
        padding: 5px 16px;
        border-radius: 12px;
        box-shadow: 0 4px 12px {sub["glow_color"]};
    }}

    /* Main Subject Title Area */
    .subject-hero {{
        text-align: center;
        margin: 2px 0;
    }}

    .subject-icon {{
        font-size: 46px;
        line-height: 1;
        display: inline-block;
        filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
        margin-bottom: 2px;
    }}

    .subject-title {{
        font-size: 34px;
        font-weight: 900;
        color: #FFFFFF;
        line-height: 1.15;
        letter-spacing: -0.5px;
        text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
    }}

    .subject-subtitle {{
        font-size: 14px;
        font-weight: 700;
        color: #94A3B8;
        font-family: 'Outfit', sans-serif;
        margin-top: 2px;
    }}

    /* Time Cards Container */
    .times-container {{
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin: 4px 0;
    }}

    .time-card {{
        background: rgba(15, 23, 42, 0.85);
        border: 2px solid rgba(255, 255, 255, 0.12);
        border-radius: 20px;
        padding: 12px 10px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }}

    .time-card.morning {{
        border-color: rgba(245, 158, 11, 0.6);
        background: linear-gradient(180deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%);
        box-shadow: 0 4px 16px rgba(245, 158, 11, 0.18);
    }}

    .time-card.evening {{
        border-color: rgba(168, 85, 247, 0.6);
        background: linear-gradient(180deg, rgba(168, 85, 247, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%);
        box-shadow: 0 4px 16px rgba(168, 85, 247, 0.18);
    }}

    .time-label {{
        font-size: 14px;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 6px;
    }}

    .time-card.morning .time-label {{
        color: #FDE68A;
    }}

    .time-card.evening .time-label {{
        color: #E9D5FF;
    }}

    .time-value {{
        font-family: 'Outfit', sans-serif;
        font-size: 27px;
        font-weight: 900;
        color: #FFFFFF;
        letter-spacing: 0.5px;
        line-height: 1.1;
    }}

    /* Footer / Instant Trigger Action */
    .footer-bar {{
        background: rgba(15, 23, 42, 0.95);
        border: 1.5px dashed {sub["theme_color"]};
        border-radius: 16px;
        padding: 8px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }}

    .footer-hint {{
        font-size: 13px;
        font-weight: 700;
        color: #CBD5E1;
    }}

    .footer-cmd {{
        background: {sub["gradient"]};
        color: #FFFFFF;
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        font-weight: 800;
        padding: 4px 12px;
        border-radius: 8px;
        box-shadow: 0 2px 8px {sub["glow_color"]};
    }}
</style>
</head>
<body>
<div class="sticker-card">
    <div class="glow-line"></div>
    
    <div class="header">
        <div class="badge-hub">🏆 A/L MCQ HUB</div>
        <div class="code-badge">/{sub["code"]}</div>
    </div>

    <div class="subject-hero">
        <div class="subject-icon">{sub["icon"]}</div>
        <div class="subject-title">{sub["name"]}</div>
        <div class="subject-subtitle">Mega Quiz දෛනික කාලසටහන ⏰</div>
    </div>

    <div class="times-container">
        <div class="time-card morning">
            <div class="time-label">🌅 උදෑසන වටය</div>
            <div class="time-value">{sub["morning_time"]}</div>
        </div>
        <div class="time-card evening">
            <div class="time-label">🌆 සවස වටය</div>
            <div class="time-value">{sub["evening_time"]}</div>
        </div>
    </div>

    <div class="footer-bar">
        <div class="footer-hint">💡 ක්ෂණික Quiz එකකට:</div>
        <div class="footer-cmd">/trigger_quiz {sub["code"]}</div>
    </div>
</div>
</body>
</html>
"""

def generate_all_stickers(out_dir="."):
    dist_dir = os.path.join(out_dir, "dist") if not out_dir.endswith("dist") else out_dir
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(dist_dir, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"])
        page = browser.new_page(viewport={"width": 512, "height": 512}, device_scale_factor=2)
        
        for sub in SUBJECTS_CONFIG:
            code = sub["code"]
            html = generate_subject_html(sub)
            page.set_content(html, wait_until="load")
            page.wait_for_timeout(100)
            
            png_path = os.path.join(out_dir, f"sticker_timetable_{code}.png")
            webp_path = os.path.join(out_dir, f"sticker_timetable_{code}.webp")
            page.screenshot(path=png_path, omit_background=True)
            
            # Convert to WebP sticker
            img = Image.open(png_path)
            img = img.resize((512, 512), Image.Resampling.LANCZOS)
            img.save(webp_path, "WEBP", quality=95, method=6)

            # Also save directly to dist/
            dist_png = os.path.join(dist_dir, f"sticker_timetable_{code}.png")
            dist_webp = os.path.join(dist_dir, f"sticker_timetable_{code}.webp")
            if dist_dir != out_dir:
                img.save(dist_webp, "WEBP", quality=95, method=6)
                img.save(dist_png, "PNG")
            
            print(f"✅ Generated Sticker for {sub['name']} ({code}): {webp_path} ({os.path.getsize(webp_path)} bytes)", flush=True)
        
        page.close()
        browser.close()

if __name__ == "__main__":
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    generate_all_stickers(out_dir)
