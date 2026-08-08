import sys
import os
import asyncio

# Ensure UTF-8 stdout and stdin encoding for Sinhala Unicode characters on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

async def query_notebooklm(user_query, notebook_id):
    try:
        from notebooklm import NotebookLMClient
        auth_file = os.path.expanduser("~/.notebooklm/profiles/default/storage_state.json")
        if not os.path.exists(auth_file):
            auth_file = os.path.join(os.getcwd(), "storage_state.json")
        
        if not os.path.exists(auth_file):
            print("ERROR: Auth storage_state.json not found. Please run 'python -m notebooklm login' first.")
            return

        # Increased timeouts (timeout=180s, chat_timeout=300s) to handle heavy notebooks with 220+ sources
        async with NotebookLMClient.from_storage(
            auth_file,
            timeout=180.0,
            chat_timeout=300.0,
            rate_limit_max_retries=5,
            server_error_max_retries=5
        ) as client:
            
            # Clear any cached conversation turns to force a fresh session search every time
            if hasattr(client.chat, 'clear_cache'):
                client.chat.clear_cache()

            # Attempt 1: Query as asked
            res = await client.chat.ask(notebook_id=notebook_id, question=user_query)
            ans = res.answer if hasattr(res, 'answer') and res.answer else (res if isinstance(res, str) else str(res))
            
            ans_lower = ans.lower() if ans else ""
            if ans and "can't answer" not in ans_lower and "cannot answer" not in ans_lower and "rephrasing" not in ans_lower and len(ans.strip()) > 10:
                print(ans)
                return

            # Attempt 2: Auto-rephrase query with explicit syllabus context if Attempt 1 returned "can't answer"
            if hasattr(client.chat, 'clear_cache'):
                client.chat.clear_cache()

            rephrased_query = f"උසස් පෙළ බෞද්ධ ශිෂ්ටාචාරය විෂය නිර්දේශයේ {user_query} පිළිබඳව සවිස්තරාත්මකව පැහැදිලි කරන්න."
            res2 = await client.chat.ask(notebook_id=notebook_id, question=rephrased_query)
            ans2 = res2.answer if hasattr(res2, 'answer') and res2.answer else (res2 if isinstance(res2, str) else str(res2))
            
            ans2_lower = ans2.lower() if ans2 else ""
            if ans2 and "can't answer" not in ans2_lower and "cannot answer" not in ans2_lower and "rephrasing" not in ans2_lower and len(ans2.strip()) > 10:
                print(ans2)
                return

            # Attempt 3: Specific Q&A search query if Attempt 2 also returned "can't answer"
            if hasattr(client.chat, 'clear_cache'):
                client.chat.clear_cache()

            rephrased_query3 = f"{user_query} පිළිබඳ ප්‍රශ්න හා පිළිතුරු"
            res3 = await client.chat.ask(notebook_id=notebook_id, question=rephrased_query3)
            ans3 = res3.answer if hasattr(res3, 'answer') and res3.answer else (res3 if isinstance(res3, str) else str(res3))
            
            ans3_lower = ans3.lower() if ans3 else ""
            if ans3 and "can't answer" not in ans3_lower and "cannot answer" not in ans3_lower and "rephrasing" not in ans3_lower and len(ans3.strip()) > 10:
                print(ans3)
                return
            
            # Print best available answer that doesn't contain "can't answer"
            for a in [ans, ans2, ans3]:
                if a and "can't answer" not in a.lower() and "cannot answer" not in a.lower() and "rephrasing" not in a.lower() and len(a.strip()) > 10:
                    print(a)
                    return

            if ans:
                print(ans)
            elif ans2:
                print(ans2)
            elif ans3:
                print(ans3)
            else:
                print("ERROR: NotebookLM returned empty response.")
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    notebook_id = sys.argv[1] if len(sys.argv) > 1 else ""
    user_query = ""

    if len(sys.argv) >= 3:
        user_query = sys.argv[2]
    else:
        # Read raw bytes from stdin buffer for 100% uncorrupted UTF-8 Sinhala on Windows
        try:
            raw_input = sys.stdin.buffer.read()
            user_query = raw_input.decode('utf-8').strip()
        except Exception:
            user_query = sys.stdin.read().strip()

    if user_query and notebook_id:
        asyncio.run(query_notebooklm(user_query, notebook_id))
    else:
        print(f"ERROR: Missing query (len={len(user_query)}) or notebook_id ({notebook_id})")
