import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

import database


class Meeting(database.Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    agenda = Column(Text, nullable=False)
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    duration_minutes = Column(Integer, default=60)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)
    transcript = Column(String, default="")
    summary = Column(String, default="")

    action_items = relationship("ActionItem", back_populates="meeting")


class ActionItem(database.Base):
    __tablename__ = "action_items"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String)
    assignee = Column(String)
    meeting_id = Column(Integer, ForeignKey("meetings.id"))
    is_completed = Column(Boolean, default=False)

    meeting = relationship("Meeting", back_populates="action_items")
