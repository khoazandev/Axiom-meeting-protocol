import re

with open('src/frontend/src/app/meetings/[id]/meeting-room-client.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove import
text = re.sub(r\"import\s+\{\s*PostMeetingCascadeModal\s*\}\s+from\s+['\"].*?['\"];\n?\", '', text)

# Remove state
text = re.sub(r\"const\s+\[isPostMeetingModalOpen,\s*setIsPostMeetingModalOpen\]\s*=\s*useState\(false\);\n?\", '', text)

# Remove MoM Cascade Trigger button (line 1697 to 1705 roughly)
text = re.sub(r\"\{\/\*\s*MoM Cascade Trigger\s*\*\/\}\s*<button[^>]*onClick=\{\(\)\s*=>\s*setIsPostMeetingModalOpen\(true\)\}[^>]*>.*?<\/button>\", '', text, flags=re.DOTALL)

# Remove Modal usage
text = re.sub(r\"\{\/\*\s*Post-Meeting Summary & Action Item Cascade Modal\s*\*\/\}\s*<PostMeetingCascadeModal[^>]*\/>\", '', text, flags=re.DOTALL)

with open('src/frontend/src/app/meetings/[id]/meeting-room-client.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
