import sys
import os
import asyncio
import json
import time
from pathlib import Path

# Ensure UTF-8 stdout and stdin encoding for Sinhala Unicode characters on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

async def get_notebooklm_client():
    from notebooklm import NotebookLMClient, AuthTokens
    from notebooklm.auth import get_authuser_for_storage, get_account_email_for_storage

    auth_file = Path(os.path.expanduser("~/.notebooklm/profiles/default/storage_state.json"))
    if not auth_file.exists():
        auth_file = Path(os.path.join(os.getcwd(), "storage_state.json"))
    
    if not auth_file.exists():
        print("ERROR: Auth storage_state.json not found. Please run 'python -m notebooklm login' first.")
        return None

    authuser = get_authuser_for_storage(auth_file)
    account_email = get_account_email_for_storage(auth_file)

    auth = await AuthTokens.from_storage(auth_file)
    if authuser is not None:
        auth.authuser = authuser
    if account_email:
        auth.account_email = account_email

    return NotebookLMClient(
        auth,
        timeout=300.0,
        chat_timeout=600.0,
        rate_limit_max_retries=5,
        server_error_max_retries=5
    )

async def handle_query(notebook_id, user_query):
    import re as _re
    client = await get_notebooklm_client()
    if not client:
        return
    async with client:
        if hasattr(client.chat, 'clear_cache'):
            client.chat.clear_cache()
            
        direct_prompt = (
            "[CRITICAL INSTRUCTION: Provide your full, comprehensive, highly detailed study response directly in this chat message text right now. "
            "Do NOT save, create, or store any Studio panel notes, study guides, or report artifacts.]\n\n"
            f"{user_query}"
        )
        res = await client.chat.ask(notebook_id=notebook_id, question=direct_prompt)
        ans = res.answer if hasattr(res, 'answer') and res.answer else (res if isinstance(res, str) else str(res))
        
        def strip_studio_phrases(text):
            """Strip NotebookLM Studio-save boilerplate lines from the response, keeping the actual content."""
            if not text:
                return text
            # Patterns that indicate NotebookLM announcing it saved something, but NOT the real content
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
                if any(_re.search(pat, line) for pat in studio_only_patterns):
                    continue  # Skip this boilerplate line
                filtered_lines.append(line)
            return '\n'.join(filtered_lines).strip()

        # Check if the answer is meaningful (even if it contains Studio phrases)
        has_studio_phrases = ans and (
            "created a note" in ans.lower() or
            "saved to studio" in ans.lower() or
            "i've created" in ans.lower() or
            "i have created" in ans.lower() or
            "check your studio" in ans.lower()
        )
        is_answer_only_studio = ans and has_studio_phrases and len(ans.strip()) < 200
        
        if ans and len(ans.strip()) > 15 and "can't answer" not in ans.lower() and not is_answer_only_studio:
            # Strip any Studio boilerplate lines but keep the real content
            cleaned_ans = strip_studio_phrases(ans)
            if cleaned_ans and len(cleaned_ans.strip()) > 15:
                print(cleaned_ans)
                return
            elif ans and len(ans.strip()) > 15:
                print(ans)
                return

        # Fallback: If NotebookLM saved the response as a Studio Note, extract and return it!
        try:
            notes = await client.notes.list(notebook_id)
            if notes:
                latest_note = sorted(notes, key=lambda n: getattr(n, 'created_at', 0), reverse=True)[0]
                note_content = getattr(latest_note, 'content', '') or getattr(latest_note, 'text', '')
                if note_content and len(note_content.strip()) > 20:
                    note_title = getattr(latest_note, 'title', '')
                    header = f"📌 **{note_title}**\n─────────────────────\n\n" if note_title else ""
                    print(f"{header}{note_content}")
                    return
        except Exception:
            pass

        rephrased_query = (
            "[CRITICAL INSTRUCTION: Respond inline in chat text only. Do NOT create Studio notes.]\n\n"
            f"උසස් පෙළ විෂය නිර්දේශයේ {user_query} පිළිබඳව සවිස්තරාත්මකව පැහැදිලි කරන්න."
        )
        res2 = await client.chat.ask(notebook_id=notebook_id, question=rephrased_query)
        ans2 = res2.answer if hasattr(res2, 'answer') and res2.answer else (res2 if isinstance(res2, str) else str(res2))
        if ans2 and len(ans2.strip()) > 10:
            cleaned_ans2 = strip_studio_phrases(ans2)
            print(cleaned_ans2 if cleaned_ans2 and len(cleaned_ans2.strip()) > 10 else ans2)
        elif ans:
            print(ans)
        else:
            print("ERROR: NotebookLM returned empty response.")

async def handle_audio(notebook_id, instructions):
    client = await get_notebooklm_client()
    if not client:
        return
    async with client:
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

        print("Requesting NEW Sinhala Audio Overview generation (language='si')...")
        try:
            await client.artifacts.generate_audio(
                notebook_id,
                language='si',
                instructions=sinhala_instructions
            )
        except Exception as e:
            print(f"Notice on generate_audio: {e}")

        # Poll for NEW audio artifact (up to 12 minutes = 48 iterations * 15 sec)
        for i in range(48):
            await asyncio.sleep(15)
            try:
                current_audio = await client.artifacts.list_audio(notebook_id)
                # Prioritize newly generated audio artifacts
                new_arts = [art for art in current_audio if art.id not in initial_ids]
                target_list = new_arts if new_arts else current_audio

                for art in target_list:
                    try:
                        res_path = await client.artifacts.download_audio(notebook_id, out_file, artifact_id=art.id)
                        if res_path and os.path.exists(res_path) and os.path.getsize(res_path) > 1000:
                            art_title = getattr(art, 'title', '') or (instructions if instructions else 'Audio Overview')
                            print(f"AUDIO_FILE:{res_path}")
                            print(f"AUDIO_TITLE:{art_title}")
                            print(f"AUDIO_SUMMARY:උසස් පෙළ විෂය කරුණු ({instructions if instructions else 'විෂය කරුණු'}) ඇසුරෙන් 100% සිංහල හඬින් සකස් කරන ලද AI Audio Podcast එක.")
                            return
                    except Exception:
                        pass
            except Exception:
                pass

        print("ERROR: Sinhala audio overview generation timed out after 12 minutes.")

async def handle_quiz(notebook_id, instructions):
    client = await get_notebooklm_client()
    if not client:
        return
    async with client:
        topic = instructions if instructions else 'ප්‍රධාන මාතෘකා'
        
        # Dynamically extract question count from user prompt (default 10, or exact number requested by user e.g. 20)
        num_questions = 10
        if instructions:
            import re
            num_match = re.search(r'(\d+)\s*(?:mcq|mcqs|questions|ප්‍රශ්න)?', instructions, re.IGNORECASE)
            if num_match:
                try:
                    parsed_num = int(num_match.group(1))
                    if 3 <= parsed_num <= 30:
                        num_questions = parsed_num
                except Exception:
                    pass

        prompt = (
            f"උසස් පෙළ විෂය නිර්දේශයේ {topic} ඇසුරෙන් MCQ බහුවරණ ප්‍රශ්න {num_questions}ක් සකස් කරන්න. "
            "ප්‍රතිදානය (Output) පහත සඳහන් JSON array ආකෘතියෙන් පමණක් ලබා දෙන්න:\n"
            "[\n"
            "  {\n"
            '    "q": "ප්‍රශ්නය",\n'
            '    "o": ["වරණය 1", "වරණය 2", "වරණය 3", "වරණය 4"],\n'
            '    "c": 0,\n'
            '    "e": "නිවැරදි පිළිතුර සඳහා සවිස්තර විග්‍රහය"\n'
            "  }\n"
            "]\n"
            "මෙහි 'c' යනු නිවැරදි වරණයේ 0-indexed අංකයයි (0, 1, 2, හෝ 3). JSON පමණක් සපයන්න."
        )
        res = await client.chat.ask(notebook_id=notebook_id, question=prompt)
        ans = res.answer if hasattr(res, 'answer') and res.answer else (res if isinstance(res, str) else str(res))
        if ans:
            print(ans)
        else:
            print("ERROR: Failed to generate quiz.")

if __name__ == "__main__":
    notebook_id = sys.argv[1] if len(sys.argv) > 1 else ""
    mode = "query"
    user_query = ""

    if len(sys.argv) >= 4:
        mode = sys.argv[2].lower()
        user_query = sys.argv[3]
    elif len(sys.argv) == 3:
        arg2 = sys.argv[2]
        if arg2.lower() in ["query", "audio", "quiz"]:
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
        elif mode == "quiz":
            asyncio.run(handle_quiz(notebook_id, user_query))
        else:
            asyncio.run(handle_query(notebook_id, user_query))
    else:
        print(f"ERROR: Missing notebook_id ({notebook_id})")
