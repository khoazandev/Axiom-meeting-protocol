import datetime
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr
from src.backend.models import InvitationRoleEnum, InvitationStatusEnum


class MeetingInviteCreate(BaseModel):
    email: EmailStr
    role: InvitationRoleEnum = InvitationRoleEnum.ATTENDEE


class MeetingInviteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    meeting_id: int
    email: str
    role: InvitationRoleEnum
    token: str
    status: InvitationStatusEnum
    created_at: datetime.datetime
