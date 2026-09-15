with open('src/frontend/src/lib/api.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(r'apiFetch<Topic\[\]>\(/api/v1/meetings//topics\)', 'apiFetch<Topic[]>(`/api/v1/meetings/${meetingId}/topics`)', text)
text = re.sub(r'apiFetch<\{message: string\}>\(/api/v1/meetings//topics/next.*?\)', 'apiFetch<{message: string}>(`/api/v1/meetings/${meetingId}/topics/next`, { method: \'POST\' })', text)
text = re.sub(r'apiFetch<any\[\]>\(/api/v1/meetings//decisions\)', 'apiFetch<any[]>(`/api/v1/meetings/${meetingId}/decisions`)', text)
text = re.sub(r'apiFetch<any>\(/api/v1/meetings//decisions/', 'apiFetch<any>(`/api/v1/meetings/${meetingId}/decisions/${decisionId}`', text)

with open('src/frontend/src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(text)
