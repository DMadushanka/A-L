import sys
import os
import re
import asyncio
import json
import time
from pathlib import Path

# Ensure UTF-8 stdout and stdin encoding for Sinhala Unicode characters on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
        if hasattr(sys.stdin, 'reconfigure'):
            sys.stdin.reconfigure(encoding='utf-8')
    except Exception:
        pass

def ensure_dependencies():
    try:
        import notebooklm
    except ImportError:
        import subprocess
        print("[SETUP] notebooklm-py not found. Installing automatically via pip...", file=sys.stderr, flush=True)
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "notebooklm-py", "httpx", "python-dotenv", "--quiet"])
            import notebooklm
        except Exception as e:
            print(f"ERROR: Failed to auto-install notebooklm-py: {e}", file=sys.stderr, flush=True)

ensure_dependencies()

def ensure_storage_state():
    """
    Ensure NotebookLM auth tokens (storage_state.json) are present.
    If running on a new computer (e.g. office PC), auto-copy from the bundled dist/storage_state.json.
    """
    import shutil
    user_target = Path.home() / ".notebooklm" / "profiles" / "default" / "storage_state.json"
    if user_target.exists() and user_target.stat().st_size > 100:
        local_cand = Path(__file__).resolve().parent / "storage_state.json"
        try:
            if not local_cand.exists() or user_target.stat().st_mtime > local_cand.stat().st_mtime:
                shutil.copy2(user_target, local_cand)
        except Exception:
            pass
        return str(user_target)

    # Check potential bundled locations
    candidates = [
        Path(__file__).resolve().parent / "storage_state.json",
        Path.cwd() / "storage_state.json",
        Path(__file__).resolve().parent.parent / "storage_state.json",
    ]
    for cand in candidates:
        if cand.exists() and cand.stat().st_size > 100:
            try:
                user_target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(cand, user_target)
                print(f"[SETUP] Initialized NotebookLM auth state on this PC from {cand.name}", file=sys.stderr, flush=True)
                return str(user_target)
            except Exception as e:
                print(f"Notice copying storage_state.json: {e}", file=sys.stderr, flush=True)
                return str(cand)
    return str(user_target) if user_target.exists() else None

NOTEBOOK_SUBJECT_NAMES = {
    'cb5c3e92-b77c-4a84-9b7f-11d543a1d46c': 'බෞද්ධ ශිෂ්ටාචාරය (Buddhist Civilization)',
    '73d6198b-9f59-4a2e-9c3c-593dfad82659': 'සිංහල භාෂාව හා සාහිත්‍යය (Sinhala Language & Literature)',
    '205cd5c1-c1ea-4bcb-ba6b-fe5d7682056d': 'කෘෂි විද්‍යාව (Agricultural Science)',
    '82f1b2ea-2426-4ad1-b4b3-60bb861ed11c': 'ශ්‍රී ලංකා ඉතිහාසය (Sri Lanka History)',
    'fc3afbee-ff1c-4b48-95cd-691fb4aab237': 'දේශපාලන විද්‍යාව (Political Science)',
    '7d27a31c-ca6e-40d8-90f0-f4b01612931f': 'ව්‍යාපාර අධ්‍යයනය (Business Studies)',
    '2675dd34-4763-461a-a463-e482692aa1e2': 'භූගෝල විද්‍යාව (Geography)',
    '51b4ceba-e0f4-45e0-b78b-93081a2de2f8': 'ජනසන්නිවේදනය (Mass Media)',
    '26538c99-6466-4ae8-88ef-2c641e0084bf': 'නාට්‍ය හා රංග කලාව (Drama)',
    '403039d0-afdc-426a-83e7-dc724a07620d': 'සංගීතය (Music)',
    'b84c9546-e9ff-482f-a3f4-92cad00b225d': 'නර්තනය (Dancing)',
    '36327268-9588-45a0-bde6-bde2ee7b8ee8': 'සුබ උදෑසනක් සුබ පැතුම් (Morning Wishes)'
}

def extract_answer_from_turns(turns_data):
    """
    Extract assistant answer text directly from NotebookLM conversation turns.
    This recovers the full answer if chat.ask stream stalled or finished server-side.
    """
    if not turns_data:
        return None
    for turn in turns_data:
        if isinstance(turn, list):
            for sub in turn:
                if isinstance(sub, list) and len(sub) > 4:
                    payload = sub[4]
                    if isinstance(payload, list) and len(payload) > 0:
                        first_slot = payload[0]
                        if isinstance(first_slot, list) and len(first_slot) > 0 and isinstance(first_slot[0], str):
                            text = first_slot[0].strip()
                            if len(text) > 20:
                                return text
    return None

def strip_studio_phrases(text):
    """Strip NotebookLM Studio-save boilerplate lines from the response, keeping the actual content."""
    if not text:
        return text
    studio_only_patterns = [
        r"(?i)i'?ve?\s+(created|saved|stored|added)\s+a?\s*(note|study\s*guide|guide|report)",
        r"(?i)(saved|added|stored)\s+(to|in)\s+(studio|notebook)",
        r"(?i)the\s+(note|study\s*guide)\s+(has\s+been|is)\s+(saved|created|stored)",
        r"(?i)you\s+can\s+(find|access|view)\s+(it|the\s+note)\s+in\s+(the\s+)?studio",
        r"(?i)check\s+(your\s+)?studio\s+(panel|section|tab)",
    ]
    lines = text.split('\n')
    filtered_lines = []
    for line in lines:
        if any(re.search(pat, line) for pat in studio_only_patterns):
            continue
        filtered_lines.append(line)
    return '\n'.join(filtered_lines).strip()

async def handle_query(notebook_id, user_query):
    from notebooklm import NotebookLMClient

    async with NotebookLMClient.from_storage(path=ensure_storage_state(), chat_timeout=420.0, timeout=420.0) as client:
        # Clear bloated session so generation is fresh and fast
        try:
            conv_id = await client.chat.get_conversation_id(notebook_id)
            if conv_id:
                await client.chat.delete_conversation(notebook_id, conv_id)
        except Exception:
            pass

        direct_prompt = (
            "[CRITICAL INSTRUCTION: Provide your full, comprehensive, highly detailed study response directly in this chat message text right now. "
            "Do NOT save, create, or store any Studio panel notes, study guides, or report artifacts.]\n\n"
            f"{user_query.strip()}\n\n"
            "[උපදෙස්: සවිස්තරාත්මක අධ්‍යයන සටහනක් (Comprehensive Detailed Study Note) සම්පූර්ණයෙන්ම සපයන්න.\n"
            "- පිළිතුර තුළ ගොනු නාම (File names e.g. .pdf, .txt), පිටු අංක (Page numbers) හෝ සූත්‍ර/මූලාශ්‍ර උපුටාගැනීම් (Source/Citation tags e.g. [1], [Source...]) කිසිසේත්ම ඇතුළත් නොකරන්න.\n"
            "- සටහන කියවීමට සහ පාඩම් කිරීමට පහසු වන සේ පැහැදිලි ලෙස කරුණු, උදාහරණ සහ උප-මාතෘකා සහිතව පිළිවෙළකට සකස් කරන්න.\n"
            "- මාතෘකාවට අදාළව කරුණු පැහැදිලි කිරීමට පහත දැක්වෙන ආකෘති අතුරින් වඩාත්ම ගැළපෙන Mermaid.js කේතය (```mermaid ... ```) පිළිතුර තුළ අදාළ ස්ථානයේ ඇතුළත් කරන්න:\n\n"
            "📌 රූප සටහන් ආදර්ශ (Mermaid Diagram Examples by Concept Type):\n"
            "1. වර්ගීකරණය හෝ ධුරාවලිය සඳහා (Hierarchy / Classification):\n"
            "```mermaid\n"
            "graph TD\n"
            "    A[\"ප්‍රධාන සංකල්පය / Main Concept\"] --> B[\"උප කාණ්ඩය 1\"]\n"
            "    A --> C[\"උප කාණ්ඩය 2\"]\n"
            "    B --> D[\"ලක්ෂණ / උදාහරණ\"]\n"
            "    C --> E[\"ලක්ෂණ / උදාහරණ\"]\n"
            "```\n\n"
            "2. සම්පූර්ණ පාඩමක හෝ චරිතයක සාරාංශය සඳහා (Mindmap / Concept Overview):\n"
            "```mermaid\n"
            "mindmap\n"
            "  root((\"ප්‍රධාන තේමාව\"))\n"
            "    උප මාතෘකාව 1\n"
            "      කරුණ 1\n"
            "      කරුණ 2\n"
            "    උප මාතෘකාව 2\n"
            "      කරුණ 1\n"
            "```\n\n"
            "3. ඓතිහාසික සිදුවීම්, රජවරුන් හෝ ව්‍යවස්ථා සංධිස්ථාන සඳහා (Timeline / Chronology):\n"
            "```mermaid\n"
            "timeline\n"
            "    title කාලානුක්‍රමය\n"
            "    1833 : කෝල්බෲක් - කැමරන් ප්‍රතිසංස්කරණ\n"
            "    1931 : ඩොනමෝර් ආණ්ඩුක්‍රමය\n"
            "    1978 : දෙවන විධායක ජනාධිපති ව්‍යවස්ථාව\n"
            "```\n\n"
            "4. නීතිමය, සන්නිවේදන හෝ අන්තර්ක්‍රියා පියවර සඳහා (Sequence Flow / Procedures):\n"
            "```mermaid\n"
            "sequenceDiagram\n"
            "    autonumber\n"
            "    actor A as ආරම්භකයා\n"
            "    participant B as ආයතනය / ක්‍රියාවලිය\n"
            "    actor C as අනුමතකරු\n"
            "    A->>B: යොමු කිරීම\n"
            "    B->>C: විභාග කිරීම\n"
            "    C-->>A: අවසන් තීරණය\n"
            "```\n\n"
            "5. චක්‍ර, සංක්‍රාන්ති හෝ ජීවන චක්‍ර සඳහා (State Transitions / Dependent Origination / Cycles):\n"
            "```mermaid\n"
            "stateDiagram-v2\n"
            "    [*] --> අදියර1\n"
            "    අදියර1 --> අදියර2: ක්‍රියාවලිය\n"
            "    අදියර2 --> අදියර3: පරිවර්තනය\n"
            "    අදියර3 --> [*]\n"
            "```\n\n"
            "6. 2x2 සංසන්දන සහ SWOT ආකෘති සඳහා (Quadrant Chart / SWOT Matrix):\n"
            "```mermaid\n"
            "quadrantChart\n"
            "    title Matrix සංසන්දනය\n"
            "    x-axis \"අභ්‍යන්තර සාධක\" --> \"බාහිර සාධක\"\n"
            "    y-axis \"අවදානම්\" --> \"අවස්ථා\"\n"
            "    quadrant-1 \"අවස්ථා\"\n"
            "    quadrant-2 \"ශක්තීන්\"\n"
            "    quadrant-3 \"දුර්වලතා\"\n"
            "    quadrant-4 \"තර්ජන\"\n"
            "```\n\n"
            "7. ප්‍රතිශත, දත්ත හා ව්‍යාප්ති සඳහා (Pie Chart / Proportions):\n"
            "```mermaid\n"
            "pie title ප්‍රතිශත ව්‍යාප්තිය\n"
            "    \"අංශය 1\" : 45\n"
            "    \"අංශය 2\" : 35\n"
            "    \"අංශය 3\" : 20\n"
            "```\n\n"
            "- රූප සටහන් තුළ නිවැරදි සිංහල හෝ ඉංග්‍රීසි අර්ථ දැක්වීම් සඳහන් කරන්න. වලංගු නොවන සංකේත භාවිත නොකරන්න.]"
        )
        
        ans = None
        try:
            res = await asyncio.wait_for(client.chat.ask(notebook_id=notebook_id, question=direct_prompt), timeout=360.0)
            ans = res.answer if hasattr(res, 'answer') and res.answer else (res if isinstance(res, str) else str(res))
        except Exception:
            try:
                conv_id = await client.chat.get_conversation_id(notebook_id)
                if conv_id:
                    last_len = 0
                    stable_count = 0
                    for _ in range(60):
                        await asyncio.sleep(3.0)
                        turns = await client.chat.get_conversation_turns(notebook_id, conv_id)
                        recovered = extract_answer_from_turns(turns)
                        cur_len = len(recovered) if recovered else 0
                        if cur_len > 50 and "can't answer this question" not in recovered:
                            ans = recovered
                            if cur_len == last_len:
                                stable_count += 1
                                if stable_count >= 3:
                                    break
                            else:
                                stable_count = 0
                            last_len = cur_len
            except Exception:
                pass

        # Check if NotebookLM answered that it saved a note to Studio
        has_studio_phrases = ans and (
            "created a note" in ans.lower() or
            "saved to studio" in ans.lower() or
            "i've created" in ans.lower() or
            "i have created" in ans.lower() or
            "check your studio" in ans.lower()
        )
        is_answer_only_studio = ans and has_studio_phrases and len(ans.strip()) < 200

        # If chat response was only a Studio notification, extract the latest Studio note content
        if (not ans or is_answer_only_studio) or (ans and "can't answer" in ans.lower()):
            try:
                notes = await client.notes.list(notebook_id)
                if notes:
                    latest_note = sorted(notes, key=lambda n: getattr(n, 'created_at', 0), reverse=True)[0]
                    note_content = getattr(latest_note, 'content', '') or getattr(latest_note, 'text', '')
                    if note_content and len(note_content.strip()) > 30:
                        ans = note_content
            except Exception:
                pass

        if ans and len(ans.strip()) > 15 and "can't answer" not in ans.lower():
            cleaned_ans = strip_studio_phrases(ans)
            if cleaned_ans and len(cleaned_ans.strip()) > 15:
                print(cleaned_ans, flush=True)
            else:
                print(ans, flush=True)
        else:
            print("ERROR: Failed to generate note.", flush=True)

async def handle_audio(notebook_id, instructions):
    from notebooklm import NotebookLMClient

    async with NotebookLMClient.from_storage(path=ensure_storage_state(), chat_timeout=720.0, timeout=300.0) as client:
        out_dir = os.path.join(os.getcwd(), "audio_downloads")
        os.makedirs(out_dir, exist_ok=True)
        out_file = os.path.join(out_dir, f"audio_{notebook_id[:8]}.mp3")

        # Capture existing audio artifact IDs BEFORE triggering new generation
        initial_ids = set()
        try:
            initial_audio = await client.artifacts.list_audio(notebook_id)
            initial_ids = {art.id for art in initial_audio}
        except Exception:
            pass

        # Remove stale cached file
        if os.path.exists(out_file):
            try:
                os.remove(out_file)
            except Exception:
                pass

        sinhala_instructions = (
            "සම්පූර්ණ සාකච්ඡාව (Audio Overview Podcast) ස්වදේශීය සිංහල භාෂාවෙන් (Sinhala Language) පමණක් සිදු කරන්න. "
            "සියලුම කරුණු, උදාහරණ සහ පැහැදිලි කිරීම් පැහැදිලි සිංහලෙන් ඉදිරිපත් කරන්න."
        )
        if instructions and instructions.strip():
            sinhala_instructions += f" විශේෂ මාතෘකාව: {instructions.strip()}"

        print("Requesting NEW Sinhala Audio Overview generation (language='si')...", flush=True)
        try:
            await client.artifacts.generate_audio(
                notebook_id,
                language='si',
                instructions=sinhala_instructions
            )
        except Exception as e:
            print(f"Notice on generate_audio: {e}", flush=True)

        # Poll for NEW audio artifact (up to 12 minutes = 48 iterations * 15 sec)
        for i in range(48):
            await asyncio.sleep(15)
            try:
                current_audio = await client.artifacts.list_audio(notebook_id)
                new_arts = [art for art in current_audio if art.id not in initial_ids]
                target_list = new_arts if new_arts else current_audio

                for art in target_list:
                    try:
                        res_path = await client.artifacts.download_audio(notebook_id, out_file, artifact_id=art.id)
                        if res_path and os.path.exists(res_path) and os.path.getsize(res_path) > 1000:
                            art_title = getattr(art, 'title', '') or (instructions if instructions else 'Audio Overview')
                            print(f"AUDIO_FILE:{res_path}", flush=True)
                            print(f"AUDIO_TITLE:{art_title}", flush=True)
                            print(f"AUDIO_SUMMARY:උසස් පෙළ විෂය කරුණු ({instructions if instructions else 'විෂය කරුණු'}) ඇසුරෙන් 100% සිංහල හඬින් සකස් කරන ලද AI Audio Podcast එක.", flush=True)
                            return
                    except Exception:
                        pass
            except Exception:
                pass

        print("ERROR: Sinhala audio overview generation timed out after 12 minutes.", flush=True)

async def handle_voice(notebook_id, user_query):
    from generate_sinhala_voice_note import generate_voice_study_note
    await generate_voice_study_note(topic=user_query, notebook_id=notebook_id)

def extract_explicit_mcq_count(topic_or_instructions):
    """
    Extract explicit MCQ count requested by user (e.g. 'MCQ 20', '25 mcqs', 'ප්‍රශ්න 15', '10ක්')
    while ignoring 4-digit years like 2024.
    """
    text = (topic_or_instructions or '').lower()
    explicit_match = re.search(r'(?:mcq|mcqs|questions|ප්‍රශ්න|බහුවරණ)\s*[:\-]?\s*(\d{1,2})', text, re.IGNORECASE)
    if not explicit_match:
        explicit_match = re.search(r'(\d{1,2})\s*(?:mcq|mcqs|questions|ප්‍රශ්න|ක්|items)', text, re.IGNORECASE)

    if explicit_match:
        try:
            n = int(explicit_match.group(1))
            if 3 <= n <= 100:
                return n
        except Exception:
            pass
    return None

async def handle_quiz(notebook_id, instructions):
    from notebooklm import NotebookLMClient

    raw_topic = instructions.strip() if instructions and instructions.strip() else ''
    explicit_count = extract_explicit_mcq_count(raw_topic) or 5
    req_timeout = 420.0 if explicit_count >= 20 else (240.0 if explicit_count >= 10 else 90.0)

    async with NotebookLMClient.from_storage(path=ensure_storage_state(), chat_timeout=req_timeout, timeout=req_timeout) as client:
        # Clear bloated previous conversation to ensure maximum output token space for 20-30 MCQs
        try:
            conv_id = await client.chat.get_conversation_id(notebook_id)
            if conv_id:
                await client.chat.delete_conversation(notebook_id, conv_id)
        except Exception:
            pass

        if explicit_count > 5:
            qty_str = f"MCQ බහුවරණ ප්‍රශ්න {explicit_count}ක් (1 සිට {explicit_count} දක්වා සම්පූර්ණ ප්‍රශ්න {explicit_count}ම)"
            qty_note = f"සම්පූර්ණ ප්‍රශ්න {explicit_count}ම (Total {explicit_count} Questions from 1 to {explicit_count})"
        else:
            qty_str = "MCQ බහුවරණ ප්‍රශ්න 5ක් (5 Multiple Choice Questions)"
            qty_note = "සම්පූර්ණ ප්‍රශ්න 5ම"

        clean_topic = re.sub(r'(?:mcq|mcqs|questions|ප්‍රශ්න|බහුවරණ|\d+|ක්)\s*', '', raw_topic, flags=re.IGNORECASE).strip()
        sub_name = NOTEBOOK_SUBJECT_NAMES.get(str(notebook_id).lower(), '')
        if not clean_topic or clean_topic.lower() in ['quiz', 'test', 'exam', 'paper']:
            topic_str = f"උසස් පෙළ {sub_name + ' ' if sub_name else ''}විෂය නිර්දේශයේ (Syllabus) අන්තර්ගත ප්‍රධාන පාඩම්"
        else:
            topic_str = f"උසස් පෙළ {sub_name + ' ' if sub_name else ''}විෂය නිර්දේශයේ {clean_topic}"
        
        prompt = (
            "[CRITICAL INSTRUCTION: Output valid JSON array ONLY. Do NOT write conversational pleasantries, apologies, or introductions. "
            "Start your response immediately with '[' and end with ']'.]\n\n"
            f"{topic_str} ඇසුරෙන් {qty_str} (5 Options) සකස් කරන්න. "
            "ප්‍රතිදානය (Output) පහත සඳහන් JSON array ආකෘතියෙන් පමණක් ලබා දෙන්න:\n"
            "[\n"
            "  {\n"
            '    "q": "ප්‍රශ්නය",\n'
            '    "o": ["(1) වරණය 1", "(2) වරණය 2", "(3) වරණය 3", "(4) වරණය 4", "(5) වරණය 5"],\n'
            '    "c": 0,\n'
            '    "e": "කෙටි විවරණය (max 80 chars)"\n'
            "  }\n"
            "]\n"
            f"සෑම ප්‍රශ්නයකටම (1)-(5) වරණ 5ක්, නිවැරදි පිළිතුර 'c' (0, 1, 2, 3, හෝ 4), සහ කෙටි විවරණයක් 'e' ඇතුළත් කර {qty_note} එක දිගට JSON array එකක් ලෙස output කරන්න."
        )

        ans = None
        try:
            res = await client.chat.ask(notebook_id=notebook_id, question=prompt)
            ans = res.answer if hasattr(res, 'answer') and res.answer else (res if isinstance(res, str) else str(res))
        except Exception:
            # Dynamic turn recovery if streaming connection stays open
            try:
                conv_id = await client.chat.get_conversation_id(notebook_id)
                if conv_id:
                    last_len = 0
                    stable_count = 0
                    max_polls = max(15, int(explicit_count * 1.5))
                    for _ in range(max_polls):
                        await asyncio.sleep(2.5)
                        turns = await client.chat.get_conversation_turns(notebook_id, conv_id)
                        rec = extract_answer_from_turns(turns)
                        cur_len = len(rec) if rec else 0
                        q_count = rec.count('"q":') if rec else 0

                        if cur_len > 100:
                            ans = rec
                            if q_count >= explicit_count or (rec and rec.strip().endswith(']')):
                                break
                            if cur_len == last_len:
                                stable_count += 1
                                if stable_count >= 2:
                                    break
                            else:
                                stable_count = 0
                            last_len = cur_len
            except Exception:
                pass

        # If answer does not contain JSON array, check latest note in Studio
        if not ans or ('[' not in ans and 'ප්‍රශ්නය' not in ans):
            try:
                notes = await client.notes.list(notebook_id)
                if notes:
                    latest_note = sorted(notes, key=lambda n: getattr(n, 'created_at', 0), reverse=True)[0]
                    note_content = getattr(latest_note, 'content', '') or getattr(latest_note, 'text', '')
                    if note_content and len(note_content.strip()) > 50:
                        ans = note_content
            except Exception:
                pass

        if ans:
            print(ans, flush=True)
        else:
            print("ERROR: Failed to generate quiz.", flush=True)

async def handle_paper(notebook_id, instructions):
    from notebooklm import NotebookLMClient

    async with NotebookLMClient.from_storage(path=ensure_storage_state(), chat_timeout=60.0, timeout=60.0) as client:
        topic = instructions.strip() if instructions.strip() else 'සම්පූර්ණ විෂය නිර්දේශය (Full Syllabus)'
        is_past_paper = any(k in topic.lower() for k in ['පසුගිය', 'past', '202', '201', 'paper'])

        explicit_count = extract_explicit_mcq_count(topic)

        if explicit_count is not None:
            mcq_qty_desc = f"MCQ බහුවරණ ප්‍රශ්න {explicit_count}ක්"
            mcq_qty_instruction = f"සම්පූර්ණ ප්‍රශ්න {explicit_count}ම"
        else:
            mcq_qty_desc = "I කොටසෙහි (Part I) අඩංගු සියලුම MCQ බහුවරණ ප්‍රශ්න (All MCQs in this paper)"
            mcq_qty_instruction = "ලේඛනයේ I කොටසෙහි අඩංගු සියලුම MCQ ප්‍රශ්න (All MCQs without omitting any question)"

        # --- Step 1: Generate/Extract ALL MCQs as structured JSON for native Telegram polls ---
        mcq_prompt = (
            f"{'G.C.E. A/L ' + topic if is_past_paper else 'A/L ' + topic} — "
            f"{mcq_qty_desc} සම්පූර්ණයෙන්ම (Sinhala) Telegram Native Polls සඳහා JSON array ආකෘතියෙන් ලබා දෙන්න.\n\n"
            "⚠️ [STRICT FORMAT]: JSON array ONLY. No markdown wrapper outside JSON. No explanation text outside JSON.\n"
            "[\n"
            "  {\n"
            '    "q": "ප්‍රශ්නය (max 290 chars)",\n'
            '    "o": ["(1) වරණය 1", "(2) වරණය 2", "(3) වරණය 3", "(4) වරණය 4", "(5) වරණය 5"],\n'
            '    "c": 2,\n'
            '    "e": "නිවැරදි පිළිතුර සඳහා කෙටි පැහැදිලි කිරීම (max 190 chars)"\n'
            "  }\n"
            "]\n"
            f"සෑම ප්‍රශ්නයකටම (1)-(5) වරණ 5ක් සහ නිවැරදි පිළිතුර 'c' (0-indexed 0, 1, 2, 3, හෝ 4) ඇතුළත් කර {mcq_qty_instruction} JSON array එකක් ලෙස පමණක් output කරන්න."
        )
        mcq_ans = None
        try:
            res_mcq = await asyncio.wait_for(client.chat.ask(notebook_id=notebook_id, question=mcq_prompt), timeout=30.0)
            mcq_ans = res_mcq.answer if hasattr(res_mcq, 'answer') and res_mcq.answer else (res_mcq if isinstance(res_mcq, str) else str(res_mcq))
        except (asyncio.TimeoutError, Exception):
            try:
                conv_id = await client.chat.get_conversation_id(notebook_id)
                if conv_id:
                    for _ in range(8):
                        await asyncio.sleep(2)
                        turns = await client.chat.get_conversation_turns(notebook_id, conv_id)
                        recovered = extract_answer_from_turns(turns)
                        if recovered and len(recovered.strip()) > 50 and ('[' in recovered or 'ප්‍රශ්නය' in recovered):
                            mcq_ans = recovered
                            break
            except Exception:
                pass

        # --- Step 2: Generate Part II (Structured + Essay) and Marking Scheme ONLY (no MCQs) ---
        part2_prompt = (
            f"{'G.C.E. A/L ' + topic if is_past_paper else 'A/L ' + topic} — II කොටස (Part II) ව්‍යුහගත හා රචනා ප්‍රශ්න සහ නිල ලකුණු දීමේ පටිපාටිය (Official Marking Scheme) සම්පූර්ණයෙන් ලියන්න.\n\n"
            "ව්‍යූහය:\n"
            "# II කොටස — ව්‍යුහගත හා රචනා ප්‍රශ්න (Part II — Structured & Essay Questions)\n"
            "(සියලු ව්‍යුහගත ප්‍රශ්න, (i), (ii) උප-කොටස් සහ ලකුණු ප්‍රමාණ)\n\n"
            "# නිල ලකුණු දීමේ පටිපාටිය (Official Marking Scheme)\n"
            "(Part II ප්‍රශ්නවලට නිවැරදි ආදර්ශ පිළිතුරු සහ ලකුණු)\n\n"
            "⚠️ [STRICT]: MCQ ප්‍රශ්න (Part I) කිසිසේත් ඇතුළත් නොකරන්න. Part II ප්‍රශ්න සහ marking scheme ONLY."
        )
        part2_ans = None
        try:
            res_p2 = await asyncio.wait_for(client.chat.ask(notebook_id=notebook_id, question=part2_prompt), timeout=30.0)
            part2_ans = res_p2.answer if hasattr(res_p2, 'answer') and res_p2.answer else (res_p2 if isinstance(res_p2, str) else str(res_p2))
        except (asyncio.TimeoutError, Exception):
            try:
                conv_id = await client.chat.get_conversation_id(notebook_id)
                if conv_id:
                    for _ in range(8):
                        await asyncio.sleep(2)
                        turns = await client.chat.get_conversation_turns(notebook_id, conv_id)
                        part2_ans = extract_answer_from_turns(turns)
                        if part2_ans and len(part2_ans.strip()) > 50:
                            break
            except Exception:
                pass

        # Output with clear delimiters that bot.js will parse
        print(f"MCQ_JSON_START\n{mcq_ans or '[]'}\nMCQ_JSON_END", flush=True)
        print(f"PAPER_PART2_START\n{part2_ans or ''}\nPAPER_PART2_END", flush=True)

if __name__ == "__main__":
    notebook_id = sys.argv[1] if len(sys.argv) > 1 else ""
    mode = "query"
    user_query = ""

    if len(sys.argv) >= 4:
        mode = sys.argv[2].lower()
        user_query = sys.argv[3]
    elif len(sys.argv) == 3:
        arg2 = sys.argv[2]
        if arg2.lower() in ["query", "audio", "quiz", "paper", "voice", "listen"]:
            mode = arg2.lower()
        else:
            user_query = arg2
    
    if not user_query:
        try:
            raw_input = sys.stdin.buffer.read()
            user_query = raw_input.decode('utf-8').strip()
        except Exception:
            user_query = sys.stdin.read().strip()

    if notebook_id:
        if mode == "audio":
            asyncio.run(handle_audio(notebook_id, user_query))
        elif mode in ["voice", "listen"]:
            asyncio.run(handle_voice(notebook_id, user_query))
        elif mode == "quiz":
            asyncio.run(handle_quiz(notebook_id, user_query))
        elif mode == "paper":
            asyncio.run(handle_paper(notebook_id, user_query))
        else:
            asyncio.run(handle_query(notebook_id, user_query))
    else:
        print(f"ERROR: Missing notebook_id ({notebook_id})", flush=True)

