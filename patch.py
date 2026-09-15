import re

with open('src/backend/api/v1/meetings.py', 'r', encoding='utf-8') as f:
    content = f.read()

delete_logic = \"\"\"    if meeting is None:
        raise NotFoundException(resource=\"Meeting\")
        
    # Manually delete related entities to avoid foreign key violations
    db.query(models.KnowledgeChunk).filter(models.KnowledgeChunk.meeting_id == meeting.id).delete()
    db.query(models.KnowledgeDocument).filter(models.KnowledgeDocument.meeting_id == meeting.id).delete()
    db.query(models.ExtractionCorrection).filter(models.ExtractionCorrection.meeting_id == meeting.id).delete()
    db.query(models.MeetingChatMessage).filter(models.MeetingChatMessage.meeting_id == meeting.id).delete()
    db.query(models.MeetingDecision).filter(models.MeetingDecision.meeting_id == meeting.id).delete()
    db.query(models.FollowUpTask).filter(models.FollowUpTask.meeting_id == meeting.id).delete()
    db.query(models.TranscriptSegment).filter(models.TranscriptSegment.meeting_id == meeting.id).delete()
    db.query(models.Topic).filter(models.Topic.meeting_id == meeting.id).delete()
    db.query(models.MeetingSummary).filter(models.MeetingSummary.meeting_id == meeting.id).delete()
    db.query(models.MeetingDocument).filter(models.MeetingDocument.meeting_id == meeting.id).delete()
    db.query(models.MeetingMember).filter(models.MeetingMember.meeting_id == meeting.id).delete()
    
    # JiraProject and Issue might reference meeting_id
    db.query(models.Issue).filter(models.Issue.meeting_id == meeting.id).delete()
    db.query(models.JiraProject).filter(models.JiraProject.meeting_id == meeting.id).delete()

    db.delete(meeting)
    db.commit()\"\"\"

content = content.replace(\"\"\"    if meeting is None:
        raise NotFoundException(resource=\"Meeting\")
    db.delete(meeting)
    db.commit()\"\"\", delete_logic)

with open('src/backend/api/v1/meetings.py', 'w', encoding='utf-8') as f:
    f.write(content)
