
from src.backend.database import SessionLocal
from src.backend.models import FollowUpTask, MeetingDecision
db = SessionLocal()
tasks = db.query(FollowUpTask).order_by(FollowUpTask.created_at.desc()).limit(3).all()
for t in tasks:
    print(t.title, '-> topic_id:', t.topic_id)

