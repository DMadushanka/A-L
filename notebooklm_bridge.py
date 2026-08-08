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

        async with NotebookLMClient.from_storage(auth_file) as client:
            res = await client.chat.ask(notebook_id=notebook_id, question=user_query)
            if hasattr(res, 'answer') and res.answer:
                print(res.answer)
            elif isinstance(res, str):
                print(res)
            else:
                print(str(res))
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
