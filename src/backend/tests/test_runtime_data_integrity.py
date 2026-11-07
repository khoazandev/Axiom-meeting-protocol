"""
Repository guardrail against runtime mock data, synthetic fallback identity,
and seeded credential shortcuts.
"""

from pathlib import Path
import re

REPO_ROOT = Path(__file__).resolve().parents[3]

BANNED_RUNTIME_TOKENS = (
    "mockAdminData",
    "workloadProtocolData",
    "SAMPLE_KNOWLEDGE_BASE",
    "SAMPLE_HARVARD_CV",
    "PRESET_CVS",
    "2846981f-7028-4ef4-9cad-d2c3719703c4",
    "is_mock",
)

BANNED_CREDENTIAL_TOKENS = (
    "admin@axiom.com",
    "manager.khoa@axiom.com",
    "member@axiom.com",
    "Axiom@123456",
)


def test_production_sources_do_not_reference_runtime_mock_data():
    violations: list[str] = []
    production_roots = (
        REPO_ROOT / "src/backend/api",
        REPO_ROOT / "src/backend/core",
        REPO_ROOT / "src/frontend/src",
    )

    for root in production_roots:
        for path in (*root.rglob("*.py"), *root.rglob("*.ts"), *root.rglob("*.tsx")):
            # Skip node_modules or build outputs if any exist
            if "node_modules" in path.parts or ".next" in path.parts:
                continue
            text = path.read_text(encoding="utf-8")
            for token in BANNED_RUNTIME_TOKENS:
                if token in text:
                    violations.append(f"{path.relative_to(REPO_ROOT)}: {token}")

    assert violations == [], f"Found banned runtime mock tokens:\n" + "\n".join(violations)


def test_runtime_sources_do_not_hardcode_seed_credentials():
    violations: list[str] = []
    # Check production backend authorization and frontend runtime code
    auth_roots = (
        REPO_ROOT / "src/backend/core/security.py",
        REPO_ROOT / "src/backend/api/v1/auth.py",
        REPO_ROOT / "src/backend/api/v1/org_invitations.py",
        REPO_ROOT / "src/backend/api/v1/meetings_v2.py",
        REPO_ROOT / "src/backend/api/v1/meeting_content.py",
    )

    for path in auth_roots:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        for token in BANNED_CREDENTIAL_TOKENS:
            if token in text:
                violations.append(f"{path.relative_to(REPO_ROOT)}: {token}")

    # Check frontend source excluding placeholder text and documentation
    frontend_root = REPO_ROOT / "src/frontend/src"
    for path in (*frontend_root.rglob("*.ts"), *frontend_root.rglob("*.tsx")):
        if "node_modules" in path.parts or ".next" in path.parts or "docs" in path.parts:
            continue
        lines = path.read_text(encoding="utf-8").splitlines()
        for idx, line in enumerate(lines, 1):
            # Ignore placeholder="..." or demo documentation comments
            if "placeholder=" in line or "placeholder:" in line or line.strip().startswith("//"):
                continue
            for token in BANNED_CREDENTIAL_TOKENS:
                if token in line:
                    violations.append(f"{path.relative_to(REPO_ROOT)}:{idx}: {token}")

    assert violations == [], f"Found hardcoded seed credentials:\n" + "\n".join(violations)
