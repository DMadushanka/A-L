# -*- coding: utf-8 -*-
"""
A/L MCQ HUB — Native Sinhala Voice Study Note & Audio Podcast Generator
Converts subject study topics into natural spoken Sinhala audio guides using
NotebookLM / Gemini script generation and Microsoft Neural TTS.
"""

import os
import sys
import re
import time
import asyncio
import argparse
import subprocess
from pathlib import Path
from datetime import datetime

# Configure Windows console for UTF-8
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
        if hasattr(sys.stdin, 'reconfigure'):
            sys.stdin.reconfigure(encoding='utf-8')
    except Exception:
        pass

def ensure_tts_dependencies():
    missing = []
    try:
        import edge_tts
    except ImportError:
        missing.append("edge-tts")
    try:
        import httpx
    except ImportError:
        missing.append("httpx")

    if missing:
        print(f"[SETUP] Installing missing audio packages ({', '.join(missing)})...", file=sys.stderr, flush=True)
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", *missing, "--quiet"])
        except Exception as e:
            print(f"Notice on pip install: {e}", file=sys.stderr, flush=True)

ensure_tts_dependencies()
import edge_tts

def normalize_sinhala_for_native_speech(raw_text):
    """
    Normalizes Sinhala text for 100% natural, human-like native pronunciation in Neural TTS:
    1. Fixes broken conjuncts (Rakaransaya, Yansaya, Bandi Akuru) by injecting Zero-Width Joiner (\\u200D).
    2. Converts 4-digit years and numbers to natural spoken Sinhala words.
    3. Converts ordinal numbers and list markers into spoken phrases.
    4. Converts English acronyms (A/L, MCQ, PDF, AI, Headset) to phonetic Sinhala.
    5. Strips markdown fences, citations, and adds breathing pauses.
    """
    if not raw_text:
        return ""

    text = raw_text

    # 1. Remove code blocks (Mermaid, code fences, etc.)
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`[^`]*`', '', text)

    # 2. Remove file citations and bracket tags e.g. [notes.pdf, p. 12], [1], [Source: ...]
    text = re.sub(r'\[[^\]]*?\.(?:pdf|txt|docx|doc|html|md)[^\]]*?\]', '', text, flags=re.I)
    text = re.sub(r'\([^\)]*?\.(?:pdf|txt|docx|doc|html|md)[^\)]*?\)', '', text, flags=re.I)
    text = re.sub(r'\[\d+(?:\s*,\s*\d+|-?\d+)*\]', '', text)
    text = re.sub(r'\[\s*(?:source|සූත්‍ර|මුලාශ්‍රය|මූලාශ්‍රය|මූලාශ්‍ර|පිටුව)\s*:[^\]]*\]', '', text, flags=re.I)
    text = re.sub(r'\(\s*(?:source|සූත්‍ර|මුලාශ්‍රය|මූලාශ්‍රය|මූලාශ්‍ර|පිටුව)\s*:[^\)]*\)', '', text, flags=re.I)
    text = re.sub(r'\[\s*(?:p\.|pp\.|page|pages)\s*\d+[^\]]*\]', '', text, flags=re.I)

    # 3. Clean headers (###, ##, #) into natural verbal topic shifts
    text = re.sub(r'^[ \t]*#{1,4}\s*(.*?)\s*$', r'\n\1.\n', text, flags=re.M)

    # 4. Remove Markdown bold/italic symbols (**bold**, *italic*, __bold__)
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'__(.*?)__', r'\1', text)
    text = re.sub(r'\*([^\*\n]+)\*', r'\1', text)
    text = re.sub(r'_([^_\n]+)_', r'\1', text)

    # 5. Clean decorative dividers and horizontal rules
    text = re.sub(r'^[ \t]*[━─_\-\*=]{3,}[ \t]*$', '', text, flags=re.M)

    # 6. Convert Ordinal numbers (1 වන -> පළමුවන, 2 වන -> දෙවන, etc.)
    ordinals = {
        r'\b1\s*(?:වන|වෙනි|වැනි)\b': 'පළමුවන',
        r'\b2\s*(?:වන|වෙනි|වැනි)\b': 'දෙවන',
        r'\b3\s*(?:වන|වෙනි|වැනි)\b': 'තෙවන',
        r'\b4\s*(?:වන|වෙනි|වැනි)\b': 'හතරවන',
        r'\b5\s*(?:වන|වෙනි|වැනි)\b': 'පස්වන',
        r'\b6\s*(?:වන|වෙනි|වැනි)\b': 'හයවන',
        r'\b7\s*(?:වන|වෙනි|වැනි)\b': 'හත්වන',
        r'\b8\s*(?:වන|වෙනි|වැනි)\b': 'අටවන',
        r'\b9\s*(?:වන|වෙනි|වැනි)\b': 'නවවන',
        r'\b10\s*(?:වන|වෙනි|වැනි)\b': 'දසවන',
    }
    for pat, rep in ordinals.items():
        text = re.sub(pat, rep, text)

    # Convert list numbering at start of line: "1." -> "පළමුව,"
    list_numbers = {
        r'^[ \t]*1[\.\)]\s+': 'පළමුව, ',
        r'^[ \t]*2[\.\)]\s+': 'දෙවනුව, ',
        r'^[ \t]*3[\.\)]\s+': 'තෙවනුව, ',
        r'^[ \t]*4[\.\)]\s+': 'හතරවනුව, ',
        r'^[ \t]*5[\.\)]\s+': 'පස්වනුව, ',
        r'^[ \t]*6[\.\)]\s+': 'හයවනුව, ',
        r'^[ \t]*7[\.\)]\s+': 'හත්වනුව, ',
        r'^[ \t]*8[\.\)]\s+': 'අටවනුව, ',
    }
    for pat, rep in list_numbers.items():
        text = re.sub(pat, rep, text, flags=re.M)
    text = re.sub(r'^[ \t]*[•\-\*]\s+', ' ', text, flags=re.M)

    # 7. Convert 4-digit years (1000 - 2099) to spoken Sinhala words
    def replace_year_match(m):
        raw = m.group(1)
        suffix = m.group(2) if m.group(2) else ""
        y = int(raw)
        thousands = {1: "එක්දහස්", 2: "දෙදහස්"}
        hundreds = {0: "", 1: "එකසිය", 2: "දෙසිය", 3: "තුන්සිය", 4: "හාරසිය", 5: "පන්සිය", 6: "හයසිය", 7: "හත්සිය", 8: "අටසිය", 9: "නවසිය"}
        tens_ones = {
            0: "", 1: "එක", 2: "දෙක", 3: "තුන", 4: "හතර", 5: "පහ", 6: "හය", 7: "හත", 8: "අට", 9: "නවය", 10: "දහය",
            11: "එකොළහ", 12: "දොළහ", 13: "දහතුන", 14: "දාහතර", 15: "පහළොව", 16: "දාසය", 17: "දාහත", 18: "දහඅට", 19: "දහනවය", 20: "විස්ස",
            21: "විසිඑක", 22: "විසිදෙක", 23: "විසිතුන", 24: "විසිහතර", 25: "විසිපහ", 26: "විසිහය", 27: "විසිහත", 28: "විසිඅට", 29: "විසිනවය", 30: "තිහ",
            31: "තිස්එක", 32: "තිස්දෙක", 33: "තිස්තුන", 34: "තිස්හතර", 35: "තිස්පහ", 36: "තිස්හය", 37: "තිස්හත", 38: "තිස්අට", 39: "තිස්නවය", 40: "හතළිහ",
            41: "හතළිස්එක", 42: "හතළිස්දෙක", 43: "හතළිස්තුන", 44: "හතළිස්හතර", 45: "හතළිස්පහ", 46: "හතළිස්හය", 47: "හතළිස්හත", 48: "හතළිස්අට", 49: "හතළිස්නවය", 50: "පනහ",
            51: "පනස්එක", 52: "පනස්දෙක", 53: "පනස්තුන", 54: "පනස්හතර", 55: "පනස්පහ", 56: "පනස්හය", 57: "පනස්හත", 58: "පනස්අට", 59: "පනස්නවය", 60: "හැට",
            61: "හැටඑක", 62: "හැටදෙක", 63: "හැටතුන", 64: "හැටහතර", 65: "හැටපහ", 66: "හැටහය", 67: "හැටහත", 68: "හැටඅට", 69: "හැටනවය", 70: "හැත්තෑව",
            71: "හැත්තෑඑක", 72: "හැත්තෑදෙක", 73: "හැත්තෑතුන", 74: "හැත්තෑහතර", 75: "හැත්තෑපහ", 76: "හැත්තෑහය", 77: "හැත්තෑහත", 78: "හැත්තෑඅට", 79: "හැත්තෑනවය", 80: "අසූව",
            81: "අසූඑක", 82: "අසූදෙක", 83: "අසූතුන", 84: "අසූහතර", 85: "අසූපහ", 86: "අසූහය", 87: "අසූහත", 88: "අසූඅට", 89: "අසූනවය", 90: "අනූව",
            91: "අනූඑක", 92: "අනූදෙක", 93: "අනූතුන", 94: "අනූහතර", 95: "අනූපහ", 96: "අනූහය", 97: "අනූහත", 98: "අනූඅට", 99: "අනූනවය"
        }
        t = thousands.get(y // 1000, "")
        h = hundreds.get((y % 1000) // 100, "")
        to = tens_ones.get(y % 100, "")
        s_words = " ".join([p for p in [t, h, to] if p])
        if suffix.startswith("දී") or suffix.startswith(" දි"):
            return f"{s_words} වසරේදී "
        elif suffix.startswith("ට"):
            return f"{s_words} වසරට "
        return f"{s_words} "

    text = re.sub(r'\b(1[0-9]{3}|20[0-9]{2})\s*(දී|ට)?\b', replace_year_match, text)

    # 8. Convert Common Marks/Points & Small numbers
    small_nums = {
        r'\b20\s*(?:ක|ක්)\b': 'විස්සක ',
        r'\b40\s*(?:ක|ක්)\b': 'හතළිහක ',
        r'\b50\s*(?:ක|ක්)\b': 'පනහක ',
        r'\b20\b': 'විස්ස ',
        r'\b40\b': 'හතළිහ ',
        r'\b50\b': 'පනහ ',
        r'\b100\b': 'සියය ',
    }
    for pat, rep in small_nums.items():
        text = re.sub(pat, rep, text)

    # 9. CONJUNCT NORMALIZATION (ZWJ Injection for Rakaransaya, Yansaya & Bandi Akuru)
    ZWJ = '\u200D'
    VIRAMA = '\u0DCA'
    RA = '\u0DBB'
    YA = '\u0DBA' # U+0DBA is Sinhala Yayanna

    # Rakaransaya: Consonant + Virama + Ra -> Consonant + Virama + ZWJ + Ra (e.g. ප්‍ර, ක්‍ර, ශ්‍ර, බ්‍ර, ත්‍ර, ද්‍ර, ග්‍ර, ව්‍ර)
    text = re.sub(r'([\u0D9A-\u0DC6])' + VIRAMA + r'(?!' + ZWJ + r')' + RA, r'\1' + VIRAMA + ZWJ + RA, text)

    # Yansaya: Consonant + Virama + Ya -> Consonant + Virama + ZWJ + Ya (e.g. න්‍ය, ත්‍ය, ල්‍ය, ම්‍ය, ව්‍ය, භ්‍ය, ධ්‍ය, ද්‍ය, ඛ්‍ය)
    text = re.sub(r'([\u0D9A-\u0DC6])' + VIRAMA + r'(?!' + ZWJ + r')' + YA, r'\1' + VIRAMA + ZWJ + YA, text)

    # Bandi Akuru (ක්ෂ, ඥ)
    text = re.sub(r'\u0D9A' + VIRAMA + r'(?!' + ZWJ + r')\u0DC7', '\u0D9A' + VIRAMA + ZWJ + '\u0DC7', text)
    text = re.sub(r'\u0DA2' + VIRAMA + r'(?!' + ZWJ + r')\u0DA5', '\u0DA2' + VIRAMA + ZWJ + '\u0DA5', text)

    # 10. Common English / Technical Terms -> Phonetic Sinhala
    phonetic_map = {
        r'\bA/L\b': 'උසස් පෙළ',
        r'\bAL\b': 'උසස් පෙළ',
        r'\bO/L\b': 'සාමාන්‍ය පෙළ',
        r'\bOL\b': 'සාමාන්‍ය පෙළ',
        r'\bMCQ\b': 'එම් සී කිව්',
        r'\bMCQs\b': 'එම් සී කිව් ප්‍රශ්න',
        r'\bPDF\b': 'පී ඩී එෆ්',
        r'\bAI\b': 'ඒ අයි',
        r'\bHUB\b': 'හබ්',
        r'\bHeadset\s*(?:එක|එකෙන්)?\b': 'හෙඩ්සෙට් එකෙන්',
        r'\bheadset\s*(?:එක|එකෙන්)?\b': 'හෙඩ්සෙට් එකෙන්',
        r'\bPodcast\b': 'ශ්‍රව්‍ය පාඩම',
        r'\bpodcast\b': 'ශ්‍රව්‍ය පාඩම',
        r'\bTutor\b': 'ගුරුතුමිය',
        r'\btutor\b': 'ගුරුතුමිය',
        r'\bUnit\b': 'ඒකකය',
        r'\bunit\b': 'ඒකකය',
    }
    for eng, sinhala in phonetic_map.items():
        text = re.sub(eng, sinhala, text, flags=re.I)

    # 11. Clean math/arrow symbols to Sinhala spoken words
    text = text.replace('→', ' මඟින් ')
    text = text.replace('⇒', ' එනම් ')
    text = text.replace('%', ' ප්‍රතිශතයක් ')
    text = text.replace('&', ' සහ ')

    # 12. Clean up extra punctuation and whitespace
    text = re.sub(r'[ \t]{2,}', ' ', text)
    text = re.sub(r'\n{2,}', '\n\n', text)

    return text.strip()

def chunk_text_for_edge_tts(text, max_chars=800):
    """
    Splits text for Edge TTS streaming into clean sentence chunks.
    """
    paragraphs = text.split('\n')
    chunks = []
    current = ""
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
        if len(current) + len(p) + 1 <= max_chars:
            current += ("\n" if current else "") + p
        else:
            if current:
                chunks.append(current)
            if len(p) > max_chars:
                sentences = re.split(r'(\. |\n)', p)
                sub_current = ""
                for s in sentences:
                    s = s.strip()
                    if not s:
                        continue
                    if len(sub_current) + len(s) + 1 <= max_chars:
                        sub_current += (" " if sub_current else "") + s
                    else:
                        if sub_current:
                            chunks.append(sub_current)
                        sub_current = s
                if sub_current:
                    chunks.append(sub_current)
                current = ""
            else:
                current = p
    if current:
        chunks.append(current)
    return chunks

async def convert_text_to_sinhala_speech(script_text, output_file, voice="si-LK-ThiliniNeural", rate="-2%", pitch="+0Hz"):
    """
    Converts Sinhala text into studio-quality MP3 audio via Edge Neural TTS.
    Uses Thilini Neural by default for soft, clear, native female teacher articulation.
    """
    clean_text = normalize_sinhala_for_native_speech(script_text)
    if not clean_text:
        raise ValueError("Script text is empty after normalization.")

    if not clean_text.startswith("ආයුබෝවන්"):
        clean_text = f"ආයුබෝවන්. A/L MCQ HUB ශ්‍රව්‍ය අධ්‍යයන සටහනට සාදරයෙන් පිළිගන්නවා. \n\n{clean_text}\n\nතවත් ශ්‍රව්‍ය පාඩම් වලට සවන්දීමට A/L MCQ HUB වෙත රැඳී සිටින්න. ඔබට ජයග්‍රාහී විභාගයකට සුබ පැතුම්."

    chunks = chunk_text_for_edge_tts(clean_text, max_chars=800)
    audio_segments = []

    for idx, chunk_content in enumerate(chunks):
        chunk_content = chunk_content.strip()
        if not chunk_content:
            continue

        success = False
        last_err = None
        for attempt in range(3):
            try:
                comm = edge_tts.Communicate(chunk_content, voice, rate=rate, pitch=pitch)
                chunk_bytes = bytearray()
                async for chunk in comm.stream():
                    if chunk["type"] == "audio":
                        chunk_bytes.extend(chunk["data"])
                if len(chunk_bytes) > 0:
                    audio_segments.append(chunk_bytes)
                    success = True
                    break
            except Exception as e:
                last_err = e
                await asyncio.sleep(0.3)

        if not success:
            print(f"Warning: Chunk {idx+1}/{len(chunks)} synthesis issue: {last_err}", file=sys.stderr, flush=True)

    if not audio_segments:
        raise RuntimeError("Failed to synthesize any audio segments via Edge TTS.")

    with open(output_file, "wb") as f:
        for seg in audio_segments:
            f.write(seg)

    return output_file

async def fetch_voice_script_from_notebooklm(topic, notebook_id):
    """
    Queries NotebookLM with a specialized prompt to generate an engaging,
    spoken-narrative Sinhala study guide script for the topic.
    """
    try:
        from notebooklm_bridge import ensure_storage_state
        from notebooklm import NotebookLMClient

        auth_path = ensure_storage_state()
        if not auth_path:
            return None

        prompt = (
            f"[CRITICAL SPOKEN AUDIO INSTRUCTION: You are an expert Sri Lankan A/L master teacher delivering an engaging audio podcast study guide. "
            f"Provide a clear, articulate, high-yield spoken-lesson explanation (around 600 to 900 words) for the topic: '{topic}'.]\n\n"
            f"උපදෙස්:\n"
            f"1. මෙය සිසුන්ට Headset එකෙන් අසා මතක තබා ගැනීමට සකස් කරන ශ්‍රව්‍ය පාඩමක් (Audio Study Guide) බැවින්, "
            f"කථන ශෛලියෙන් (Spoken Conversational Sinhala) පැහැදිලිව, ආකර්ෂණීයව සහ මිත්‍රශීලීව කරුණු විස්තර කරන්න.\n"
            f"2. පාඩම ආරම්භයේදී මාතෘකාව හඳුන්වා දී, ප්‍රධාන සංකල්ප, විභාගයට අත්‍යවශ්‍ය කරුණු, ඓතිහාසික/විද්‍යාත්මක උදාහරණ පිළිවෙළින් විස්තර කර, අවසානයේ කෙටි සාරාංශයක් ලබා දෙන්න.\n"
            f"3. කිසිදු Markdown ලකුණු (Fences, Tables, Asterisks, Bullet points), ගොනු නාම, පිටු අංක හෝ [1] වැනි Citation tags භාවිතා නොකරන්න.\n"
            f"4. සියලුම වර්ෂ සහ අංක සිංහල අකුරෙන් ලියන්න (උදා: 1833 -> එක්දහස් අටසිය තිස්තුන, 1796 -> එක්දහස් හත්සිය අනූහය, 1815 -> එක්දහස් අටසිය පහළොව).\n"
            f"5. නිවැරදි සිංහල බැඳි අකුරු (ප්‍රතිසංස්කරණ, බ්‍රිතාන්‍යයන්, ක්‍රියාත්මක, ශ්‍රේෂ්ඨාධිකරණය, ප්‍රජාතන්ත්‍රවාදය, ශ්‍රමය) භාවිතා කරන්න.\n"
            f"6. වාක්‍ය අතර ස්වභාවික විරාම (Punctuation) නිවැරදිව තබන්න."
        )

        async with NotebookLMClient.from_storage(path=auth_path, chat_timeout=90.0, timeout=90.0) as client:
            try:
                conv_id = await client.chat.get_conversation_id(notebook_id)
                if conv_id:
                    await client.chat.delete_conversation(notebook_id, conv_id)
            except Exception:
                pass

            resp = await client.chat.ask(notebook_id, prompt)
            raw_text = resp.answer.strip() if hasattr(resp, 'answer') and resp.answer else ""
            if len(raw_text) > 40:
                return raw_text
    except Exception as e:
        print(f"Notice querying NotebookLM for voice script: {e}", file=sys.stderr, flush=True)

    return None

async def generate_voice_study_note(topic, notebook_id=None, subject_code="auto", voice_name="si-LK-ThiliniNeural", out_dir=None):
    """
    Full pipeline: generates script, normalizes for native speech, and converts to MP3 audio note.
    """
    if not out_dir:
        out_dir = Path.cwd() / "audio_notes"
    else:
        out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Safe whole-word slug generation to prevent Unicode character corruption
    words = re.findall(r'[a-zA-Z0-9\u0D80-\u0DFF]+', topic)
    safe_words = []
    cur_len = 0
    for w in words:
        if cur_len + len(w) > 45 and safe_words:
            break
        safe_words.append(w)
        cur_len += len(w)
    clean_slug = "_".join(safe_words) if safe_words else "Audio_Note"
    out_file = out_dir / f"voice_note_{clean_slug}_{timestamp}.mp3"

    print(f"🎙️ Generating voice script for: '{topic}'...", file=sys.stderr, flush=True)

    # 1. Fetch script from NotebookLM (or generate fallback structured script)
    script_text = None
    if notebook_id:
        script_text = await fetch_voice_script_from_notebooklm(topic, notebook_id)

    # Fallback script generator if NotebookLM is unconfigured
    if not script_text:
        script_text = (
            f"ආයුබෝවන් ආදරණීය දූලා පුතාලා හැමෝටම. අද අපි සාකච්ඡා කරන්නේ {topic} පිළිබඳවයි. "
            f"උසස් පෙළ විභාගයේදී මෙම මාතෘකාව බහුවරණ සහ ව්‍යුහගත ප්‍රශ්න පත්‍ර සඳහා ඉතා වැදගත් වේ. "
            f"මෙම සංකල්පය මනාව අවබෝධ කර ගැනීම සඳහා ප්‍රධාන අංශ සහ ලක්ෂණ නිවැරදිව මතක තබා ගැනීම අත්‍යවශ්‍ය වේ. "
            f"විෂය නිර්දේශයේ සඳහන් මූලික සිද්ධාන්ත පිළිබඳ ගැඹුරු අවබෝධයක් ලබා ගැනීමට සහ පසුගිය විභාග ප්‍රශ්න පුහුණු වීමට A/L MCQ HUB අධ්‍යයන සටහන් පරිශීලනය කරන්න. "
            f"ඔබ සැමට විභාගයෙන් විශිෂ්ට ජයග්‍රහණ අත්වේවායි ප්‍රාර්ථනා කරනවා."
        )

    # 2. Convert to Voice MP3 with Thilini Neural
    print(f"🔊 Synthesizing native Sinhala neural voice ({voice_name})...", file=sys.stderr, flush=True)
    await convert_text_to_sinhala_speech(script_text, str(out_file), voice=voice_name, rate="-2%")

    # 3. Create short summary preview (first 200 chars)
    normalized_for_preview = normalize_sinhala_for_native_speech(script_text)
    preview_summary = re.sub(r'\s+', ' ', normalized_for_preview)[:220].strip() + "..."

    # 4. Output machine-readable tokens for Telegram Bot
    print(f"VOICE_FILE:{out_file.resolve()}", flush=True)
    print(f"VOICE_TITLE:{topic}", flush=True)
    print(f"VOICE_SUMMARY:{preview_summary}", flush=True)
    print(f"VOICE_SCRIPT:{script_text}", flush=True)
    return str(out_file.resolve())

def main():
    parser = argparse.ArgumentParser(description="Generate Sinhala Voice Study Notes")
    parser.add_argument("topic", nargs="?", default="", help="Study topic or question")
    parser.add_argument("--notebook-id", default=None, help="NotebookLM Notebook ID")
    parser.add_argument("--subject-code", default="auto", help="Subject code (si, bc, hist, pl, bs, etc.)")
    parser.add_argument("--voice", default="si-LK-ThiliniNeural", help="Voice model (si-LK-ThiliniNeural or si-LK-SameeraNeural)")
    parser.add_argument("--out-dir", default=None, help="Output directory for MP3 files")
    parser.add_argument("--text", default=None, help="Direct script text to synthesize (bypasses LLM)")

    args = parser.parse_args()

    topic = args.topic.strip()
    if not topic and not args.text:
        print("Usage: python generate_sinhala_voice_note.py <topic> [--notebook-id <id>]", file=sys.stderr)
        sys.exit(1)

    if args.text:
        out_dir = Path(args.out_dir) if args.out_dir else Path.cwd() / "audio_notes"
        out_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        out_file = out_dir / f"voice_direct_{timestamp}.mp3"
        asyncio.run(convert_text_to_sinhala_speech(args.text, str(out_file), voice=args.voice, rate="-2%"))
        print(f"VOICE_FILE:{out_file.resolve()}", flush=True)
        print(f"VOICE_TITLE:{topic or 'Audio Note'}", flush=True)
    else:
        asyncio.run(generate_voice_study_note(
            topic=topic,
            notebook_id=args.notebook_id,
            subject_code=args.subject_code,
            voice_name=args.voice,
            out_dir=args.out_dir
        ))

if __name__ == "__main__":
    main()
