with open('src/frontend/src/lib/api.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Add getDecisions and updateDecision
decisions_methods = '''  getDecisions(meetingId: number | string): Promise<any[]> {
    return apiFetch<any[]>(`/api/v1/meetings/${meetingId}/decisions`);
  },
  updateDecision(
    meetingId: number | string,
    decisionId: string,
    data: { description?: string; status?: string; proposer_id?: string }
  ): Promise<any> {
    return apiFetch<any>(`/api/v1/meetings/${meetingId}/decisions/${decisionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
'''

text = re.sub(r'(export const meetingsApi = \{)', r'\1\n' + decisions_methods, text)

with open('src/frontend/src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(text)
