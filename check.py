with open('src/backend/models.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
current_class = None
for line in lines:
    if line.startswith('class '):
        current_class = line.split(' ')[1].split('(')[0]
    if 'ForeignKey(\"meetings.id\")' in line or 'ForeignKey(\"meetings.id' in line:
        print(f'{current_class}')
