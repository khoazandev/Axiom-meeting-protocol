import re
with open('src/frontend/src/app/meetings/[id]/meeting-room-client.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

state_line = "  const [isEndMeetingModalOpen, setIsEndMeetingModalOpen] = useState(false);\n"
text = text.replace("  const [actionItems, setActionItems] = useState<ActionItemResponse[]>([]);\n", "  const [actionItems, setActionItems] = useState<ActionItemResponse[]>([]);\n" + state_line)

with open('src/frontend/src/app/meetings/[id]/meeting-room-client.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
