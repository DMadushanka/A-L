import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import util from 'util';

const execFileAsync = util.promisify(execFile);

/**
 * Sanitize Mermaid code to avoid syntax errors and "Unsupported markdown: list" issues:
 * 1. Convert ordered list prefixes (e.g. `1. `, `2. `, `10. `) inside node labels to `1) `, `2) `, `10) `
 * 2. Convert unordered bullet prefixes (e.g. `- `, `* `, `+ `) inside node labels to `• `
 * 3. Fix list numbering in mindmaps
 * 4. Clean stray backticks or malformed markdown inside labels
 */
export function sanitizeMermaidCode(mermaidCode) {
  if (!mermaidCode || !mermaidCode.trim()) return '';
  let code = mermaidCode.trim();

  // Strip markdown code fences if accidentally included inside
  code = code.replace(/^```(?:mermaid)?/i, '').replace(/```$/i, '').trim();

  // Fix numbered list markers inside flowchart / graph node brackets:
  // e.g. ["1. Text"], ('2. Text'), {"3. Text"}, (("4. Text")), [/"5. Text"/], [\ "6. Text" \]
  code = code.replace(/(\[\s*["']?\s*)(\d+)[\.\:]\s+/g, '$1$2) ');
  code = code.replace(/(\(\s*["']?\s*)(\d+)[\.\:]\s+/g, '$1$2) ');
  code = code.replace(/(\{\s*["']?\s*)(\d+)[\.\:]\s+/g, '$1$2) ');
  code = code.replace(/(\(\(\s*["']?\s*)(\d+)[\.\:]\s+/g, '$1$2) ');
  code = code.replace(/(\[\/\s*["']?\s*)(\d+)[\.\:]\s+/g, '$1$2) ');
  code = code.replace(/(\[\\[\s*["']?\s*)(\d+)[\.\:]\s+/g, '$1$2) ');

  // Fix bullet point markers inside node brackets
  code = code.replace(/(\[\s*["']?\s*)[-\*\+]\s+/g, '$1• ');
  code = code.replace(/(\(\s*["']?\s*)[-\*\+]\s+/g, '$1• ');
  code = code.replace(/(\{\s*["']?\s*)[-\*\+]\s+/g, '$1• ');
  code = code.replace(/(\(\(\s*["']?\s*)[-\*\+]\s+/g, '$1• ');

  // In mindmaps, clean leading numbers or bullets on leaf nodes
  if (code.startsWith('mindmap')) {
    code = code.replace(/^(\s+)(\d+)[\.\:]\s+/gm, '$1$2) ');
    code = code.replace(/^(\s+)[-\*\+]\s+/gm, '$1• ');
  }

  return code;
}

export function generateMermaidPakoUrl(mermaidCode, outputFormat = 'img', bgColor = 'white', subjectTheme = null) {
  if (!mermaidCode || !mermaidCode.trim()) return null;

  const sanitizedCode = sanitizeMermaidCode(mermaidCode);
  const theme = subjectTheme || {};
  const primaryColor = theme.section_bg || '#EFF6FF';
  const borderColor = theme.section_border || '#2563EB';
  const textColor = '#0F172A';

  const state = {
    code: sanitizedCode,
    mermaid: {
      theme: 'base',
      themeVariables: {
        fontSize: '18px',
        fontFamily: 'Noto Sans Sinhala, Arial, sans-serif',
        background: '#FFFFFF',
        primaryColor: primaryColor,
        primaryBorderColor: borderColor,
        primaryTextColor: textColor,
        lineColor: borderColor,
        textColor: textColor,
        mainBkg: primaryColor,
        nodeBorder: borderColor,
        clusterBkg: '#F8FAFC',
        clusterBorder: '#94A3B8',
        defaultLinkColor: borderColor,
        edgeLabelBackground: '#FFFFFF',
        nodePadding: '36px'
      },
      flowchart: {
        htmlLabels: true
      }
    },
    autoSync: true,
    rough: false
  };

  const jsonStr = JSON.stringify(state);
  const jsonBuffer = Buffer.from(jsonStr, 'utf8');
  const deflated = zlib.deflateSync(jsonBuffer, { level: 9 });
  const pakoB64 = deflated.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `https://mermaid.ink/${outputFormat}/pako:${pakoB64}?bgColor=${encodeURIComponent(bgColor)}`;
}

export async function renderHighResDiagramPng(mermaidCode, subjectCode = 'auto') {
  if (!mermaidCode || !mermaidCode.trim()) return null;

  const sanitizedCode = sanitizeMermaidCode(mermaidCode);
  const cleanSubject = (subjectCode || 'auto').toLowerCase();
  const cacheDir = path.resolve(process.cwd(), 'diagram_cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const hash = crypto.createHash('md5').update(`${sanitizedCode}_${cleanSubject}`).digest('hex');
  const outPng = path.join(cacheDir, `tg_diag_hd_${hash}.png`);

  if (fs.existsSync(outPng) && fs.statSync(outPng).size > 1000) {
    return outPng;
  }

  const tempTxt = path.join(cacheDir, `temp_diag_${hash}.txt`);
  try {
    fs.writeFileSync(tempTxt, sanitizedCode, 'utf8');
    const pythonScript = path.resolve(process.cwd(), 'generate_pdf_note.py');
    await execFileAsync('python', [pythonScript, 'render_diagram', tempTxt, outPng, cleanSubject], { timeout: 35000 });
    if (fs.existsSync(outPng) && fs.statSync(outPng).size > 500) {
      return outPng;
    }
  } catch (err) {
    console.error('Notice rendering high-res diagram via Python:', err.message);
  } finally {
    if (fs.existsSync(tempTxt)) {
      try { fs.unlinkSync(tempTxt); } catch (_) { }
    }
  }

  // Fallback to high-resolution ink URL
  return generateMermaidPakoUrl(sanitizedCode, 'img', 'white');
}

export function extractMermaidDiagrams(rawText, subjectCode = 'auto') {
  if (!rawText) return { diagrams: [], cleanText: '' };

  const diagrams = [];
  const regex = /```(?:mermaid)?\s*([\s\S]*?)```/gi;
  let match;

  while ((match = regex.exec(rawText)) !== null) {
    const code = match[1].trim();
    // Verify if it looks like mermaid syntax
    if (code.match(/^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|quadrantChart)\b/i) || code.includes('-->') || code.includes('---')) {
      const sanitized = sanitizeMermaidCode(code);
      const pakoUrl = generateMermaidPakoUrl(sanitized, 'img', 'white');
      diagrams.push({
        fullMatch: match[0],
        code: sanitized,
        url: pakoUrl,
        subjectCode: subjectCode
      });
    }
  }

  return { diagrams };
}
