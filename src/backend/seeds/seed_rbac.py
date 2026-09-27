"""Seed system roles and permissions for RBAC."""

from sqlalchemy.orm import Session

from src.backend.models import Permission, Role, RolePermission, RoleScopeEnum

BASE_PERMISSIONS = [
    ("organization.read", "View organization details"),
    ("organization.update", "Update organization settings"),
    ("user.invite", "Invite users to organization"),
    ("user.remove", "Remove users from organization"),
    ("department.read", "View departments"),
    ("department.create", "Create departments"),
    ("department.update", "Update departments"),
    ("department.members.manage", "Manage department members"),
    ("meeting.create", "Create meetings"),
    ("meeting.update", "Update meetings"),
    ("meeting.delete", "Delete meetings"),
    ("meeting.join", "Join meetings"),
    ("meeting.manage_members", "Manage meeting participants"),
]

RECRUITMENT_PERMISSIONS = [
    ("recruitment.manage", "Create, edit, close job openings and invite candidates"),
    ("recruitment.read_all", "View all recruitment records in the organization"),
    ("recruitment.review", "Review and submit assessment/interview feedback for candidates"),
    ("recruitment.approve", "Final approval or rejection of recruitment candidates"),
]

ALL_PERMISSIONS = BASE_PERMISSIONS + RECRUITMENT_PERMISSIONS

ROLE_DEFINITIONS = {
    "OWNER": {
        "scope": RoleScopeEnum.ORGANIZATION,
        "description": "Organization owner with full access",
        "permissions": [code for code, _ in BASE_PERMISSIONS]
        + ["recruitment.manage", "recruitment.read_all", "recruitment.approve"],
    },
    "ADMIN": {
        "scope": RoleScopeEnum.ORGANIZATION,
        "description": "Organization administrator",
        "permissions": [code for code, _ in BASE_PERMISSIONS],
    },
    "MANAGER": {
        "scope": RoleScopeEnum.DEPARTMENT,
        "description": "Department manager",
        "permissions": [
            "organization.read",
            "department.read",
            "department.update",
            "department.members.manage",
            "meeting.create",
            "meeting.update",
            "meeting.delete",
            "meeting.join",
            "meeting.manage_members",
        ],
    },
    "MEMBER": {
        "scope": RoleScopeEnum.ORGANIZATION,
        "description": "Regular organization member",
        "permissions": [
            "organization.read",
            "department.read",
            "meeting.create",
            "meeting.join",
        ],
    },
}


def seed_roles_and_permissions(db: Session) -> None:
    """Insert or update system roles, permissions, and role-permission mappings.

    Safe to call multiple times — performs idempotent upserts.
    """
    perm_map: dict[str, Permission] = {}
    for code, description in ALL_PERMISSIONS:
        perm = db.query(Permission).filter_by(code=code).first()
        if not perm:
            perm = Permission(code=code, description=description)
            db.add(perm)
            db.flush()
        perm_map[code] = perm

    for role_name, role_def in ROLE_DEFINITIONS.items():
        role = db.query(Role).filter_by(name=role_name, is_system=True).first()
        if not role:
            role = Role(
                name=role_name,
                description=role_def["description"],
                scope=role_def["scope"],
                is_system=True,
            )
            db.add(role)
            db.flush()

        for perm_code in role_def["permissions"]:
            perm = perm_map.get(perm_code)
            if not perm:
                continue
            rp = db.query(RolePermission).filter_by(role_id=role.id, permission_id=perm.id).first()
            if not rp:
                rp = RolePermission(role_id=role.id, permission_id=perm.id)
                db.add(rp)

    db.commit()
