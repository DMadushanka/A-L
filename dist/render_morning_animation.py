import asyncio
import os
import sys
import time
from playwright.async_api import async_playwright
from PIL import Image

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

async def render_svg_to_animation(svg_path, output_gif_path, duration_sec=1.5, fps=8):
    start_time = time.time()
    if not os.path.exists(svg_path):
        print(f"Error: SVG file not found: {svg_path}")
        return None

    abs_svg_path = os.path.abspath(svg_path).replace('\\', '/')
    file_url = f"file:///{abs_svg_path}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # High Definition 1400x1000 viewport for crystal-clear visuals and typography
        context = await browser.new_context(
            viewport={'width': 1400, 'height': 1000},
            device_scale_factor=1.0
        )
        page = await context.new_page()

        try:
            await page.goto(file_url, wait_until='load', timeout=6000)
            await page.wait_for_timeout(350)
        except Exception as e:
            print(f"Page load note: {e}")

        total_frames = max(6, int(duration_sec * fps))
        frame_interval_ms = int(1000 / fps)
        frames = []

        temp_dir = os.path.join(os.path.dirname(output_gif_path), f"temp_{os.path.basename(output_gif_path).replace('.', '_')}")
        os.makedirs(temp_dir, exist_ok=True)

        for i in range(total_frames):
            frame_file = os.path.join(temp_dir, f"frame_{i:03d}.png")
            await page.screenshot(path=frame_file, type='png')
            img = Image.open(frame_file)
            # High-definition 256 colors with FASTOCTREE and dither=NONE for razor-sharp typography without grain/artifacts
            img_p = img.convert('RGB').quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
            frames.append(img_p)
            await page.wait_for_timeout(frame_interval_ms)

        await browser.close()

        if frames:
            frames[0].save(
                output_gif_path,
                save_all=True,
                append_images=frames[1:],
                optimize=True,
                duration=frame_interval_ms,
                loop=0
            )
            elapsed = time.time() - start_time
            print(f"SUCCESS: Crystal-Clear High-Def 1400x1000 Animated GIF saved to {output_gif_path} ({os.path.getsize(output_gif_path)} bytes) in {elapsed:.2f}s")

        # Cleanup temp frames
        for f in os.listdir(temp_dir):
            try:
                os.remove(os.path.join(temp_dir, f))
            except:
                pass
        try:
            os.rmdir(temp_dir)
        except:
            pass

        return output_gif_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python render_morning_animation.py <svg_path> [output_gif_path]")
        sys.exit(1)

    svg_file = sys.argv[1]
    out_file = sys.argv[2] if len(sys.argv) > 2 else svg_file.replace('.svg', '.gif')
    asyncio.run(render_svg_to_animation(svg_file, out_file))
