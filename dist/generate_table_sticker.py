import os
import sys

if sys.stdout:
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from playwright.sync_api import sync_playwright
from PIL import Image

def generate_timetable_sticker(output_webp_path, output_png_path=None):
    html_content = """<!DOCTYPE html>
<html lang="si">
<head>
<meta charset="UTF-8">
<style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@500;600;700;800;900&family=Outfit:wght@600;700;800;900&family=JetBrains+Mono:wght@700;800&display=swap');

    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
    }

    body {
        width: 1120px;
        height: 800px;
        background: transparent;
        font-family: 'Noto Sans Sinhala', 'Outfit', 'Segoe UI', sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        text-rendering: optimizeLegibility;
    }

    .main-card {
        width: 1100px;
        height: 780px;
        background: linear-gradient(135deg, #070D1E 0%, #0D1938 50%, #091228 100%);
        border: 2px solid rgba(0, 212, 255, 0.45);
        border-radius: 28px;
        padding: 24px 30px 22px 30px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.9), inset 0 1px 3px rgba(255, 255, 255, 0.3);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
    }

    /* Top decorative glow bar */
    .glow-line {
        position: absolute;
        top: 0;
        left: 100px;
        right: 100px;
        height: 3px;
        background: linear-gradient(90deg, transparent, #00D4FF, #38BDF8, #A855F7, transparent);
        border-radius: 3px;
    }

    /* Header */
    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 12px;
        border-bottom: 1.5px solid rgba(255, 255, 255, 0.12);
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .logo-icon {
        width: 52px;
        height: 52px;
        background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%);
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        box-shadow: 0 6px 20px rgba(2, 132, 199, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .title-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .title-main {
        font-size: 26px;
        font-weight: 900;
        color: #FFFFFF;
        display: flex;
        align-items: center;
        gap: 12px;
        letter-spacing: -0.2px;
    }

    .title-badge-hub {
        background: #0284C7;
        color: #FFFFFF;
        font-size: 14px;
        font-weight: 800;
        padding: 2px 10px;
        border-radius: 8px;
        letter-spacing: 0.5px;
        font-family: 'Outfit', sans-serif;
    }

    .title-highlight {
        background: linear-gradient(90deg, #00D4FF 0%, #38BDF8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .subtitle {
        font-size: 14px;
        font-weight: 600;
        color: #94A3B8;
        letter-spacing: 0.2px;
    }

    .header-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 107, 0, 0.15);
        border: 1.5px solid rgba(255, 107, 0, 0.5);
        padding: 8px 18px;
        border-radius: 20px;
        color: #FFA153;
        font-weight: 800;
        font-size: 14px;
        letter-spacing: 0.5px;
    }

    /* Table */
    .table-wrapper {
        width: 100%;
        background: rgba(11, 20, 42, 0.8);
        border: 1.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 18px;
        overflow: hidden;
        margin: 10px 0;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    thead th {
        background: linear-gradient(90deg, #16223E 0%, #0E172E 100%);
        color: #94A3B8;
        font-size: 14px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        padding: 9px 18px;
        text-align: left;
        border-bottom: 1.5px solid rgba(255, 255, 255, 0.12);
    }

    thead th.center {
        text-align: center;
    }

    tbody tr {
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    tbody tr:nth-child(even) {
        background: rgba(255, 255, 255, 0.02);
    }

    tbody tr:last-child {
        border-bottom: none;
    }

    td {
        padding: 7px 18px;
        vertical-align: middle;
    }

    .subject-box {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .subject-icon {
        font-size: 20px;
    }

    .subject-name {
        font-size: 17.5px;
        font-weight: 800;
        color: #FFFFFF;
        letter-spacing: -0.2px;
    }

    .code-pill {
        display: inline-block;
        background: #0284C7;
        color: #F0F9FF;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 800;
        font-size: 14px;
        padding: 4px 12px;
        border-radius: 8px;
        letter-spacing: 0.5px;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .time-slot {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-family: 'Outfit', sans-serif;
        font-weight: 800;
        font-size: 16.5px;
        padding: 4.5px 14px;
        border-radius: 10px;
        width: 120px;
        text-align: center;
        letter-spacing: 0.5px;
    }

    .time-slot.morning {
        background: rgba(245, 158, 11, 0.18);
        border: 1.5px solid rgba(245, 158, 11, 0.5);
        color: #FDE68A;
        box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
    }

    .time-slot.evening {
        background: rgba(168, 85, 247, 0.18);
        border: 1.5px solid rgba(168, 85, 247, 0.5);
        color: #E9D5FF;
        box-shadow: 0 2px 8px rgba(168, 85, 247, 0.15);
    }

    .round-badge {
        font-family: 'Outfit', sans-serif;
        font-size: 13.5px;
        font-weight: 800;
        color: #38BDF8;
        background: rgba(56, 189, 248, 0.12);
        padding: 4px 10px;
        border-radius: 8px;
        border: 1px solid rgba(56, 189, 248, 0.3);
    }

    /* Footer */
    .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(18, 29, 58, 0.85);
        border: 1.5px dashed rgba(0, 212, 255, 0.35);
        border-radius: 14px;
        padding: 10px 20px;
    }

    .footer-left {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14.5px;
        color: #CBD5E1;
        font-weight: 700;
    }

    .footer-cmd {
        background: #0284C7;
        color: #FFFFFF;
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        font-weight: 800;
        padding: 5px 14px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
    }
</style>
</head>
<body>
<div class="main-card">
    <div class="glow-line"></div>
    
    <div class="header">
        <div class="header-left">
            <div class="logo-icon">🏆</div>
            <div class="title-group">
                <div class="title-main"><span class="title-badge-hub">A/L MCQ HUB</span> <span class="title-highlight">Mega Quiz දෛනික කාලසටහන</span> ⏰</div>
                <div class="subtitle">දිනපතා MCQ 90 කින් ඔබේ A/L සාමාර්ථය සහතික කරගන්න!</div>
            </div>
        </div>
        <div class="header-badge">
            <span>🔥</span> දිනපතා වට 3 ක් (Rounds 3)
        </div>
    </div>

    <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th style="width: 38%;">විෂය (Subject)</th>
                    <th class="center" style="width: 14%;">කේතය (Code)</th>
                    <th class="center" style="width: 24%;">🌅 උදෑසන (Morning)</th>
                    <th class="center" style="width: 24%;">🌆 සවස (Evening)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><div class="subject-box"><span class="subject-icon">📝</span><span class="subject-name">සිංහල</span></div></td>
                    <td style="text-align: center;"><span class="code-pill">si</span></td>
                    <td style="text-align: center;"><span class="time-slot morning">🌅 05:15 AM</span></td>
                    <td style="text-align: center;"><span class="time-slot evening">🌆 06:15 PM</span></td>
                </tr>
                <tr>
                    <td><div class="subject-box"><span class="subject-icon">☸️</span><span class="subject-name">බෞද්ධ ශිෂ්ටාචාරය</span></div></td>
                    <td style="text-align: center;"><span class="code-pill">bc</span></td>
                    <td style="text-align: center;"><span class="time-slot morning">🌅 05:35 AM</span></td>
                    <td style="text-align: center;"><span class="time-slot evening">🌆 06:45 PM</span></td>
                </tr>
                <tr>
                    <td><div class="subject-box"><span class="subject-icon">🌱</span><span class="subject-name">කෘෂි විද්‍යාව</span></div></td>
                    <td style="text-align: center;"><span class="code-pill" style="background:#15803D; border-color:#22C55E;">agri</span></td>
                    <td style="text-align: center;"><span class="time-slot morning">🌅 05:55 AM</span></td>
                    <td style="text-align: center;"><span class="time-slot evening">🌆 07:15 PM</span></td>
                </tr>
                <tr>
                    <td><div class="subject-box"><span class="subject-icon">🏛️</span><span class="subject-name">ඉතිහාසය</span></div></td>
                    <td style="text-align: center;"><span class="code-pill">hist</span></td>
                    <td style="text-align: center;"><span class="time-slot morning">🌅 06:15 AM</span></td>
                    <td style="text-align: center;"><span class="time-slot evening">🌆 07:45 PM</span></td>
                </tr>
                <tr>
                    <td><div class="subject-box"><span class="subject-icon">⚖️</span><span class="subject-name">දේශපාලන විද්‍යාව</span></div></td>
                    <td style="text-align: center;"><span class="code-pill">pl</span></td>
                    <td style="text-align: center;"><span class="time-slot morning">🌅 06:30 AM</span></td>
                    <td style="text-align: center;"><span class="time-slot evening">🌆 08:15 PM</span></td>
                </tr>
                <tr>
                    <td><div class="subject-box"><span class="subject-icon">💼</span><span class="subject-name">ව්‍යාපාර අධ්‍යයනය</span></div></td>
                    <td style="text-align: center;"><span class="code-pill">bs</span></td>
                    <td style="text-align: center;"><span class="time-slot morning">🌅 06:45 AM</span></td>
                    <td style="text-align: center;"><span class="time-slot evening">🌆 08:45 PM</span></td>
                </tr>
                <tr>
                    <td><div class="subject-box"><span class="subject-icon">🌍</span><span class="subject-name">භූගෝල විද්‍යාව</span></div></td>
                    <td style="text-align: center;"><span class="code-pill">geo</span></td>
                    <td style="text-align: center;"><span class="time-slot morning">🌅 07:00 AM</span></td>
                    <td style="text-align: center;"><span class="time-slot evening">🌆 09:15 PM</span></td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="footer">
        <div class="footer-left">
            <span>💡</span>
            <span>කාලසටහන තෙක් නොසිට ඕනෑම වේලාවක ක්ෂණික Quiz එකක් අරඹන්න:</span>
        </div>
        <div class="footer-cmd">/trigger_quiz &lt;කේතය&gt;</div>
    </div>
</div>
</body>
</html>
"""
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox", "--disable-setuid-sandbox"])
        # High resolution 1120x800 with 2x DPR (2240x1600 output) for crystal-clear readability
        page = browser.new_page(viewport={"width": 1120, "height": 800}, device_scale_factor=2)
        page.set_content(html_content, wait_until="load")
        page.wait_for_timeout(200)
        
        # Save high-res PNG
        png_temp = output_webp_path.replace('.webp', '.png') if not output_png_path else output_png_path
        page.screenshot(path=png_temp, omit_background=True)
        browser.close()

        # Convert to WebP sticker
        img = Image.open(png_temp)
        # Create a clean sticker copy
        sticker_img = img.copy()
        sticker_img.thumbnail((512, 512), Image.Resampling.LANCZOS)
        # Create 512x512 canvas for sticker
        canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        offset = ((512 - sticker_img.width) // 2, (512 - sticker_img.height) // 2)
        canvas.paste(sticker_img, offset)
        canvas.save(output_webp_path, "WEBP", quality=95, method=6)
        
        # Also copy to dist/ if dist directory exists
        dist_dir = os.path.join(os.path.dirname(output_webp_path) or ".", "dist")
        if os.path.exists(dist_dir):
            canvas.save(os.path.join(dist_dir, os.path.basename(output_webp_path)), "WEBP", quality=95, method=6)
            img.save(os.path.join(dist_dir, os.path.basename(png_temp)), "PNG")
        
        print(f"✅ PNG Card generated: {png_temp} (Size: {os.path.getsize(png_temp)} bytes)")
        print(f"✅ WebP Sticker generated: {output_webp_path} (Size: {os.path.getsize(output_webp_path)} bytes)")

if __name__ == "__main__":
    out_webp = sys.argv[1] if len(sys.argv) > 1 else "timetable_sticker.webp"
    out_png = sys.argv[2] if len(sys.argv) > 2 else "timetable_card.png"
    generate_timetable_sticker(out_webp, out_png)

