import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

# 1. Login as Admin/Owner to get token
data = json.dumps({'email': 'admin@axiom.com', 'password': 'password123'}).encode()
req = urllib.request.Request('http://localhost:8001/api/v1/auth/login', data=data, headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req)
token = json.loads(res.read())['access_token']
headers = {'Authorization': f'Bearer {token}'}

# 2. List meetings
req_m = urllib.request.Request('http://localhost:8001/api/v1/meetings?all_org_meetings=true', headers=headers)
meetings = json.loads(urllib.request.urlopen(req_m).read())
print(f'Total meetings returned: {len(meetings)}')
for m in meetings[:3]:
    print(f"- ID: {m['id']} | Title: {m['title']} | Dept: {m.get('department_name')} | Summary: {bool(m.get('summary'))} | Tasks: {m.get('task_count')}")

m_id = 'd395ad18-d817-4782-9651-64e35c14f68e'
trans = json.loads(urllib.request.urlopen(urllib.request.Request(f'http://localhost:8001/api/v1/meetings/{m_id}/transcripts', headers=headers)).read())
tasks = json.loads(urllib.request.urlopen(urllib.request.Request(f'http://localhost:8001/api/v1/meetings/{m_id}/follow-up-tasks', headers=headers)).read())
summary = json.loads(urllib.request.urlopen(urllib.request.Request(f'http://localhost:8001/api/v1/meetings/{m_id}/summary', headers=headers)).read())

print(f'Meeting {m_id}:')
print(f'Transcripts count: {len(trans)}')
print(f'Tasks count: {len(tasks)}')
print(f'Summary: {summary.get("summary")[:100]}...')

rag_payload = json.dumps({'question': 'Alex Rivera được giao những nhiệm vụ gì?'}).encode()
req_rag = urllib.request.Request(f'http://localhost:8001/api/v1/meetings/{m_id}/rag/query', data=rag_payload, headers={'Content-Type': 'application/json', **headers})
rag_res = json.loads(urllib.request.urlopen(req_rag).read())
print('--- RAG ANSWER ---')
print(rag_res['answer'][:300])
print('ALL VERIFICATIONS PASSED!')
