"""Seed system roles and permissions for RBAC."""

from sqlalchemy.orm import Session

from src.backend.models import Permission, Role, RolePermission, RoleScopeEnum

ALL_PERMISSIONS = [
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

ROLE_DEFINITIONS = {
    "OWNER": {
        "scope": RoleScopeEnum.ORGANIZATION,
        "description": "Organization owner with full access",
        "permissions": [code for code, _ in ALL_PERMISSIONS],
    },
    "ADMIN": {
        "scope": RoleScopeEnum.ORGANIZATION,
        "description": "Organization administrator",
        "permissions": [code for code, _ in ALL_PERMISSIONS],
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
    """Insert system roles, permissions, and role-permission mappings.

    Safe to call multiple times — skips if data already exists.
    """
    existing = db.query(Permission).count()
    if existing > 0:
        return

    perm_map: dict[str, Permission] = {}
    for code, description in ALL_PERMISSIONS:
        perm = Permission(code=code, description=description)
        db.add(perm)
        perm_map[code] = perm
    db.flush()

    for role_name, role_def in ROLE_DEFINITIONS.items():
        role = Role(
            name=role_name,
            description=role_def["description"],
            scope=role_def["scope"],
            is_system=True,
        )
        db.add(role)
        db.flush()

        for perm_code in role_def["permissions"]:
            rp = RolePermission(
                role_id=role.id, permission_id=perm_map[perm_code].id
            )
            db.add(rp)

    db.commit()
