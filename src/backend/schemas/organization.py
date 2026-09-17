"""Pydantic schemas for Organization, Department, and related resources."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Organization
# ---------------------------------------------------------------------------
class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class OrganizationResponse(BaseModel):
    id: str
    name: str
    created_by_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrganizationMemberResponse(BaseModel):
    id: str
    organization_id: str
    user_id: str
    role_id: str
    status: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class MemberDetailResponse(BaseModel):
    id: str
    user_id: str
    organization_id: str
    email: str
    full_name: str
    avatar_url: str | None = None
    role: str
    department_id: str | None = None
    department_name: str | None = None
    status: str
    joined_at: datetime
    meetings_count: int = 0
    tasks_count: int = 0

    model_config = {"from_attributes": True}


class UpdateMemberRoleRequest(BaseModel):
    role: str = Field(..., pattern="^(OWNER|ADMIN|MANAGER|MEMBER)$")


class UpdateMemberDepartmentRequest(BaseModel):
    department_id: str | None = None


class OrgAnalyticsResponse(BaseModel):
    total_meetings_this_month: int
    meetings_growth: str
    on_time_punctual_rate: float
    task_execution_rate: float
    hours_saved_by_ai: float
    total_members: int
    total_departments: int
    active_meetings_count: int
    pending_approvals_count: int



# ---------------------------------------------------------------------------
# Department
# ---------------------------------------------------------------------------
class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    parent_id: str | None = None


class DepartmentResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    description: str | None = None
    parent_id: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DepartmentMemberAdd(BaseModel):
    user_id: str
    role_id: str | None = None  # defaults to MEMBER role


class DepartmentMemberResponse(BaseModel):
    id: str
    department_id: str
    user_id: str
    role_id: str
    joined_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Organization Invitation
# ---------------------------------------------------------------------------
class OrgInvitationCreate(BaseModel):
    email: EmailStr
    role_id: str | None = None  # defaults to MEMBER role
    department_id: str | None = None


class OrgInvitationResponse(BaseModel):
    id: str
    organization_id: str
    email: str
    role_id: str
    department_id: str | None = None
    status: str
    token: str
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
