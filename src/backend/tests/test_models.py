import pytest
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.backend import database
from src.backend.models import (
    User,
    Workspace,
    WorkspaceMember,
    Department,
    DepartmentMember,
    Invitation,
    Meeting,
    RoleEnum,
)

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db_session():
    database.Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        database.Base.metadata.drop_all(bind=engine)


def test_create_user_and_workspace(db_session):
    user = User(email="owner@axiom.dev", full_name="Owner User", password_hash="hashed_pw")
    db_session.add(user)
    db_session.commit()

    workspace = Workspace(name="Acme Corp", slug="acme-corp", owner_id=user.id)
    db_session.add(workspace)
    db_session.commit()

    member = WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role=RoleEnum.OWNER)
    db_session.add(member)
    db_session.commit()

    assert workspace.owner_id == user.id
    assert len(workspace.members) == 1
    assert workspace.members[0].role == RoleEnum.OWNER


def test_department_and_meeting_relationships(db_session):
    user = User(email="mgr@axiom.dev", full_name="Manager User", password_hash="hashed_pw")
    db_session.add(user)
    db_session.commit()

    ws = Workspace(name="Test WS", slug="test-ws", owner_id=user.id)
    db_session.add(ws)
    db_session.commit()

    dept = Department(name="Engineering", workspace_id=ws.id, manager_id=user.id)
    db_session.add(dept)
    db_session.commit()

    meeting = Meeting(
        title="Sprint Planning",
        agenda="1. Review backlog  2. Assign tickets for next 2 weeks",
        workspace_id=ws.id,
        department_id=dept.id,
        created_by_id=user.id,
    )
    db_session.add(meeting)
    db_session.commit()

    assert meeting.workspace_id == ws.id
    assert meeting.department_id == dept.id
    assert meeting.created_by_id == user.id
