"""User search API endpoint for meeting member invitations."""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import User

router = APIRouter(prefix="/users", tags=["users"])


class UserSearchResult(BaseModel):
    id: str
    email: str
    full_name: str
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


@router.get("/search", response_model=list[UserSearchResult])
def search_users(
    q: str = Query(..., min_length=1, description="Search by email or name"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Search users by email or full_name. Excludes current user from results."""
    search_term = f"%{q}%"
    results = (
        db.query(User)
        .filter(
            User.id != current_user.id,
            User.is_active == True,  # noqa: E712
            (User.email.ilike(search_term) | User.full_name.ilike(search_term)),
        )
        .limit(limit)
        .all()
    )
    return results
