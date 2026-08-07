import re, json

file_path = "al-bc-2026-master-shuffled-mcqs.md"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Split into Question section and Answer section
parts = re.split(r'##\s+II\s+කොටස|\n##\s+Answer\s+Key', text, maxsplit=1)
q_text = parts[0]
a_text = parts[1] if len(parts) > 1 else ""

# Extract answers and explanations
# Pattern for answer blocks in a_text:
# #### 01. නිවැරදි පිළිතුර: 5 ...
# * **විවරණය / Academic Justification:** Explanation...

ans_map = {}
ans_pattern = re.compile(r'####\s*(\d+)\.\s*නිවැරදි\s*පිළිතුර:\s*(\d+)([^\n]*)\n(.*?)(?=\n####|\Z)', re.DOTALL)
for match in ans_pattern.finditer(a_text):
    q_num = int(match.group(1))
    ans_val = int(match.group(2)) - 1 # convert to 0-index
    inline_ans = match.group(3).strip()
    block = match.group(4).strip()
    
    # Extract explanation
    exp_match = re.search(r'\*\s*\*\*විවරණය[^*]*\*\*:\s*(.*)', block, re.DOTALL)
    if exp_match:
        explanation = exp_match.group(1).strip()
        # Clean markdown stars
        explanation = re.sub(r'^\*\s*', '', explanation).strip()
    else:
        explanation = block.strip()
    
    ans_map[q_num] = {
        "correct": ans_val,
        "explanation": explanation
    }

print(f"Parsed {len(ans_map)} answers & explanations.")

# Now parse questions
# #### 01. Question text
# **Translation:** ...
# 1) Option 1
# 2) Option 2
# ...

q_blocks = re.split(r'\n####\s*(\d+)\.\s*', q_text)
questions_list = []

for i in range(1, len(q_blocks), 2):
    q_num = int(q_blocks[i])
    content = q_blocks[i+1]
    
    # Lines of content
    lines = [line.strip() for line in content.split('\n') if line.strip()]
    if not lines:
        continue
    
    # First line is question text
    q_title = lines[0]
    
    # Extract options
    options = []
    opt_pattern = re.compile(r'^[1-5]\)\s*(.*)')
    for line in lines[1:]:
        m = opt_pattern.match(line)
        if m:
            opt = m.group(1).strip()
            # Clean up optional translation in parenthesis if desired, or keep as is
            options.append(opt)
    
    ans_info = ans_map.get(q_num, {"correct": 0, "explanation": "නිවැරදි පිළිතුර විවරණය සහිතයි."})
    
    questions_list.append({
        "qNum": q_num,
        "q": f"{q_num:02d}. {q_title}",
        "options": options,
        "correct": ans_info["correct"],
        "explanation": ans_info["explanation"]
    })

print(f"Successfully extracted {len(questions_list)} questions!")

# Verify sample
sample = questions_list[0]
print("Sample Q1:")
print(json.dumps(sample, ensure_ascii=False, indent=2))

with open("scratch/master_mcqs.json", "w", encoding="utf-8") as f:
    json.dump(questions_list, f, ensure_ascii=False, indent=2)
