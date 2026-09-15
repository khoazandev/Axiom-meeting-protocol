import re
with open('src/frontend/src/lib/api.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('apiFetch<Topic[]>(/api/v1/meetings//topics)', 'apiFetch<Topic[]>(/api/v1/meetings//topics)')
text = text.replace('apiFetch<{message: string}>(/api/v1/meetings//topics/next, { method: \\'POST\\' })', 'apiFetch<{message: string}>(/api/v1/meetings//topics/next, { method: \\'POST\\' })')
text = text.replace('apiFetch<any[]>(/api/v1/meetings//decisions)', 'apiFetch<any[]>(/api/v1/meetings//decisions)')
text = text.replace('apiFetch<any>(/api/v1/meetings//decisions/)', 'apiFetch<any>(/api/v1/meetings//decisions/')
text = text.replace('apiFetch<any>(/api/v1/meetings//decisions/, {', 'apiFetch<any>(/api/v1/meetings//decisions/, {')

with open('src/frontend/src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(text)
