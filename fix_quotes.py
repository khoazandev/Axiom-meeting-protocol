with open('src/frontend/src/app/meetings/[id]/meeting-room-client.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("\\'", "'")

with open('src/frontend/src/app/meetings/[id]/meeting-room-client.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
