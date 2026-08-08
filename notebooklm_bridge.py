import sys
import os
import asyncio

# Ensure UTF-8 stdout encoding for Sinhala Unicode characters on Windows
sys.stdout.reconfigure(encoding='utf-8')

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
    if len(sys.argv) >= 3:
        query = sys.argv[1]
        nb_id = sys.argv[2]
        asyncio.run(query_notebooklm(query, nb_id))
    else:
        print("Usage: python notebooklm_bridge.py <query> <notebook_id>")
