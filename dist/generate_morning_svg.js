import fs from 'fs';
import path from 'path';

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapTextToLines(text, maxCharsPerLine = 36) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export function generateMorningWishSVG(phraseObj, customNoteText = null, customBgUrl = null) {
  const greeting = escapeXml(phraseObj.greeting || 'සුබ උදෑසනක්!');
  const message = phraseObj.message || phraseObj.fullText || 'අද දවස සාර්ථක අධ්‍යාපනික දිනයක් වේවා!';

  const lines = wrapTextToLines(message, 34);

  // Dynamic card dimensions
  const cardWidth = 1080;
  const cardHeight = Math.max(500, 360 + (lines.length * 68));
  const cardX = (1400 - cardWidth) / 2;
  const cardY = (1000 - cardHeight) / 2;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1400 1000" width="1400" height="1000" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <!-- Ultra Radiant Golden Text Gradient -->
    <linearGradient id="goldTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFDE7"/>
      <stop offset="25%" stop-color="#FFF176"/>
      <stop offset="60%" stop-color="#FFD54F"/>
      <stop offset="100%" stop-color="#FF9800"/>
    </linearGradient>

    <!-- Sleek Glass Gold/White Accent Border Gradient -->
    <linearGradient id="goldBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE082" stop-opacity="0.95"/>
      <stop offset="35%" stop-color="#FFFFFF" stop-opacity="0.45"/>
      <stop offset="70%" stop-color="#FFB300" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#FFE082" stop-opacity="0.65"/>
    </linearGradient>

    <!-- Warm Morning Aura Radial Gradient behind card -->
    <radialGradient id="morningAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFA000" stop-opacity="0.32"/>
      <stop offset="50%" stop-color="#FF6F00" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <!-- Pill Badge Gradient -->
    <linearGradient id="pillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF8F00" stop-opacity="0.22"/>
      <stop offset="50%" stop-color="#FFC107" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#FF8F00" stop-opacity="0.22"/>
    </linearGradient>

    <!-- Razor-Sharp Deep Drop Shadows (100% Crisp, ZERO Blurring) -->
    <filter id="crispTextShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.95"/>
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.9"/>
    </filter>

    <filter id="titleShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.95"/>
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#5D4037" flood-opacity="0.8"/>
    </filter>

    <filter id="glassShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.8"/>
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.6"/>
    </filter>

    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@600;700;800;900&amp;display=swap');

      .sinhala-font {
        font-family: 'Noto Sans Sinhala', 'Iskoola Pota', 'Segoe UI', system-ui, -apple-system, sans-serif;
      }

      @keyframes titleBreath {
        0%, 100% { opacity: 0.95; }
        50% { opacity: 1; }
      }

      @keyframes starTwinkle {
        0%, 100% { opacity: 0.25; transform: scale(0.75); }
        50% { opacity: 1; transform: scale(1.3); }
      }

      @keyframes auraBreath {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.55; }
      }

      .sparkle-1 { animation: starTwinkle 2.5s ease-in-out infinite; transform-origin: center; }
      .sparkle-2 { animation: starTwinkle 3.2s ease-in-out infinite 1.2s; transform-origin: center; }
      .sparkle-3 { animation: starTwinkle 2.8s ease-in-out infinite 0.7s; transform-origin: center; }
      .sparkle-4 { animation: starTwinkle 3.0s ease-in-out infinite 1.8s; transform-origin: center; }
      .aura-glow { animation: auraBreath 3.5s ease-in-out infinite; }
      .title-glow { animation: titleBreath 3s ease-in-out infinite; }
    </style>
  </defs>

  <!-- Canvas Deep Base -->
  <rect width="1400" height="1000" fill="#0B1120"/>

  ${customBgUrl ? `
  <!-- Pristine High-Resolution Wallpaper Photo (100% Sharp & True to Life) -->
  <image href="${escapeXml(customBgUrl)}" x="0" y="0" width="1400" height="1000" preserveAspectRatio="xMidYMid slice"/>
  <!-- Smooth Cinematic Contrast Overlay (Preserves photographic beauty while guaranteeing readability) -->
  <rect width="1400" height="1000" fill="#0B1120" opacity="0.35"/>
  ` : `
  <rect width="1400" height="1000" fill="#1E293B"/>
  `}

  <!-- Ambient Golden Sunrise Aura behind the Glass Card -->
  <rect x="${cardX - 40}" y="${cardY - 30}" width="${cardWidth + 80}" height="${cardHeight + 60}" rx="50" fill="url(#morningAura)" class="aura-glow"/>

  <!-- ==================== PREMIUM FROSTED GLASS CONTAINER ==================== -->
  <g filter="url(#glassShadow)">
    <!-- Frosted Dark Glass Backdrop Plate -->
    <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="36" fill="#090D16" fill-opacity="0.78"/>
    <!-- Radiant Golden Border Stroke -->
    <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="36" fill="none" stroke="url(#goldBorderGrad)" stroke-width="2.5"/>
  </g>

  <!-- Golden Corner Sparkles (✨) -->
  <g fill="#FFE082">
    <!-- Top-Left Sparkle -->
    <g transform="translate(${cardX + 50}, ${cardY + 50})">
      <polygon points="0,-16 4,-4 16,0 4,4 0,16 -4,4 -16,0 -4,-4" class="sparkle-1"/>
      <circle cx="0" cy="0" r="3" fill="#FFFDE7"/>
    </g>
    <!-- Top-Right Sparkle -->
    <g transform="translate(${cardX + cardWidth - 50}, ${cardY + 50})">
      <polygon points="0,-16 4,-4 16,0 4,4 0,16 -4,4 -16,0 -4,-4" class="sparkle-2"/>
      <circle cx="0" cy="0" r="3" fill="#FFFDE7"/>
    </g>
    <!-- Bottom-Left Sparkle -->
    <g transform="translate(${cardX + 50}, ${cardY + cardHeight - 50})">
      <polygon points="0,-14 3.5,-3.5 14,0 3.5,3.5 0,14 -3.5,3.5 -14,0 -3.5,-3.5" class="sparkle-3"/>
      <circle cx="0" cy="0" r="2.5" fill="#FFFDE7"/>
    </g>
    <!-- Bottom-Right Sparkle -->
    <g transform="translate(${cardX + cardWidth - 50}, ${cardY + cardHeight - 50})">
      <polygon points="0,-14 3.5,-3.5 14,0 3.5,3.5 0,14 -3.5,3.5 -14,0 -3.5,-3.5" class="sparkle-4"/>
      <circle cx="0" cy="0" r="2.5" fill="#FFFDE7"/>
    </g>
  </g>

  <!-- ==================== CRYSTAL CLEAR SINHALA TYPOGRAPHY ==================== -->
  <g class="sinhala-font">
    <!-- 1. Glowing Greeting Pill Header -->
    <g transform="translate(700, ${cardY + 85})" class="title-glow">
      <!-- Outer Pill Glow Frame -->
      <rect x="-300" y="-46" width="600" height="78" rx="39" fill="url(#pillGrad)" stroke="#FFE082" stroke-width="2" stroke-opacity="0.9"/>
      
      <!-- Greeting Main Text (Crystal Clear, Bold 900, High Contrast Gold) -->
      <text x="0" y="10" text-anchor="middle" fill="url(#goldTextGrad)" font-size="52" font-weight="900" letter-spacing="1" filter="url(#titleShadow)">
        🌅 ${greeting}
      </text>
    </g>

    <!-- 2. Radiant Golden Divider Line with Accent Pearls -->
    <g transform="translate(700, ${cardY + 165})">
      <line x1="-340" y1="0" x2="340" y2="0" stroke="url(#goldBorderGrad)" stroke-width="2.5" stroke-linecap="round" opacity="0.95"/>
      <circle cx="0" cy="0" r="6" fill="#FFFDE7" filter="url(#crispTextShadow)"/>
      <circle cx="-160" cy="0" r="3.5" fill="#FFE082" opacity="0.8"/>
      <circle cx="160" cy="0" r="3.5" fill="#FFE082" opacity="0.8"/>
    </g>

    <!-- 3. Motivational Message Text Lines (100% High Contrast Crisp Pure White with Deep Shadow) -->
    <g transform="translate(700, ${cardY + 250})">
      ${lines.map((l, i) => {
        const yOffset = i * 68;
        return `<text x="0" y="${yOffset}" text-anchor="middle" fill="#FFFFFF" font-size="44" font-weight="800" letter-spacing="0.5" filter="url(#crispTextShadow)">${escapeXml(l)}</text>`;
      }).join('\n      ')}
    </g>

    <!-- 4. Subtle Bottom Branding Badge -->
    <g transform="translate(700, ${cardY + cardHeight - 38})">
      <text x="0" y="0" text-anchor="middle" fill="#CBD5E1" font-size="22" font-weight="700" letter-spacing="2.5" opacity="0.95" filter="url(#crispTextShadow)">
        ✨ A/L MCQ HUB • DAILY INSPIRATION ✨
      </text>
    </g>
  </g>
</svg>`;

  return svg;
}

export function createMorningWishFile(phraseObj, customNoteText = null, customBgUrl = null) {
  const dir = path.resolve(process.cwd(), 'morning_wishes');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const svgContent = generateMorningWishSVG(phraseObj, customNoteText, customBgUrl);
  const phraseId = phraseObj.id || Date.now();
  const filePath = path.join(dir, `morning_wish_${phraseId}.svg`);

  fs.writeFileSync(filePath, svgContent, 'utf8');
  return filePath;
}

