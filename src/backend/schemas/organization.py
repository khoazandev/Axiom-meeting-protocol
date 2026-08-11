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
