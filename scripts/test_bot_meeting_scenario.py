#!/usr/bin/env python3
"""
Bot Meeting Test Scenario — Sequential Mic Turn-Taking with STT Pipeline.

Simulates a meeting room with 2 bots (Bot A: Trưởng nhóm Minh, Bot B: Dev Khoa)
who take turns speaking by toggling their mic ON/OFF sequentially.
Each spoken line goes through the STT WebSocket pipeline for bilingual translation,
then gets saved as a transcript segment in the database.

Usage:
    # Requires backend server running on localhost:8000
    python scripts/test_bot_meeting_scenario.py

    # Or via pytest (manual integration test)
    pytest scripts/test_bot_meeting_scenario.py -v -s
"""

import asyncio
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
import websockets

# ---------------------------------------------------------------------------
# Logging & Encoding
# ---------------------------------------------------------------------------
# Fix Windows console encoding (cp1252 can't handle emoji/box-drawing chars)
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore
    except Exception:
        pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("axiom.bot_test")

# ---------------------------------------------------------------------------
# Configuration (overridable via env vars, following no-hardcode rule)
# ---------------------------------------------------------------------------
BASE_URL = os.getenv("BOT_TEST_BASE_URL", "http://localhost:8000")
WS_URL = os.getenv("BOT_TEST_WS_URL", "ws://localhost:8000/ws/realtime-stt")
SCRIPT_DELAY = float(os.getenv("BOT_TEST_SCRIPT_DELAY_SECONDS", "2.0"))
STT_TIMEOUT = int(os.getenv("BOT_TEST_STT_TIMEOUT", "10"))
ADMIN_EMAIL = os.getenv("BOT_TEST_ADMIN_EMAIL", "admin@axiom.com")
ADMIN_PASSWORD = os.getenv("BOT_TEST_ADMIN_PASSWORD", "password123")

SCRIPT_DIR = Path(__file__).parent
CONVERSATION_SCRIPT_PATH = os.getenv(
    "BOT_TEST_SCRIPT_PATH",
    str(SCRIPT_DIR / "bot_conversation_script.json"),
)


# ---------------------------------------------------------------------------
# ANSI Color helpers for pretty console output
# ---------------------------------------------------------------------------
class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"


def print_banner():
    print(
        f"""
{Colors.BOLD}{Colors.CYAN}╔══════════════════════════════════════════════════════════════╗
║          🎤  AXIOM — Bot Meeting Test Scenario  🎤          ║
║        Sequential Mic Turn-Taking with STT Pipeline         ║
╚══════════════════════════════════════════════════════════════╝{Colors.RESET}
"""
    )


def print_mic_event(speaker: str, action: str, text: str = ""):
    icon = "🟢 MIC ON " if action == "on" else "🔴 MIC OFF"
    color = Colors.GREEN if action == "on" else Colors.RED
    print(f"  {color}{icon}{Colors.RESET} {Colors.BOLD}{speaker}{Colors.RESET}", end="")
    if text:
        print(f" — {Colors.DIM}\"{text[:60]}{'...' if len(text) > 60 else ''}\"{Colors.RESET}")
    else:
        print()


def print_stt_result(vi_text: str, en_text: str, notes: str):
    print(f"  {Colors.CYAN}📝 VI:{Colors.RESET} {vi_text}")
    print(f"  {Colors.BLUE}🌐 EN:{Colors.RESET} {en_text}")
    print(f"  {Colors.DIM}   ({notes}){Colors.RESET}")


def print_phase(phase: str):
    print(f"\n{Colors.BOLD}{Colors.YELLOW}━━━ {phase} ━━━{Colors.RESET}\n")


# ---------------------------------------------------------------------------
# API Client
# ---------------------------------------------------------------------------
class AxiomApiClient:
    """Lightweight API client for the Axiom backend."""

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.token: Optional[str] = None

    def _headers(self) -> Dict[str, str]:
        h = {"Content-Type": "application/json"}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    # ── Auth ──────────────────────────────────────────────────────
    def login(self, email: str, password: str) -> str:
        """Login and return JWT access token."""
        resp = self.session.post(
            self._url("/api/v1/auth/login"),
            json={"email": email, "password": password},
        )
        resp.raise_for_status()
        data = resp.json()
        self.token = data["access_token"]
        logger.info(f"✅ Logged in as {email}")
        return self.token

    def register_user(self, email: str, password: str, full_name: str) -> Dict:
        """Register a new user, ignoring 'already exists' errors."""
        resp = self.session.post(
            self._url("/api/v1/auth/register"),
            json={"email": email, "password": password, "full_name": full_name},
        )
        if resp.status_code in (200, 201):
            logger.info(f"✅ Registered user: {full_name} ({email})")
            return resp.json()

        # Backend returns 400 VALIDATION_ERROR for duplicate emails
        # or 422 for Pydantic validation failures
        try:
            err_data = resp.json()
            err_msg = err_data.get("error", {}).get("message", str(err_data))
        except Exception:
            err_msg = resp.text

        if "already" in err_msg.lower() or resp.status_code in (400, 422):
            logger.info(f"ℹ️  User already exists or validation issue: {email} ({err_msg[:80]})")
            return {"email": email, "full_name": full_name}
        else:
            resp.raise_for_status()
            return {}

    def get_user_id_by_login(self, email: str, password: str) -> str:
        """Login as a user and return their user ID via /auth/me."""
        resp = self.session.post(
            self._url("/api/v1/auth/login"),
            json={"email": email, "password": password},
        )
        resp.raise_for_status()
        data = resp.json()
        temp_token = data.get("access_token", "")

        # Use /auth/me to get user ID
        me_resp = self.session.get(
            self._url("/api/v1/auth/me"),
            headers={"Authorization": f"Bearer {temp_token}"},
        )
        me_resp.raise_for_status()
        return me_resp.json().get("id", "")

    # ── Organizations ─────────────────────────────────────────────
    def get_my_organizations(self) -> List[Dict]:
        """Get organizations the current user belongs to."""
        resp = self.session.get(
            self._url("/api/v1/organizations/"),
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    # ── Meetings ──────────────────────────────────────────────────
    def create_meeting(
        self,
        title: str,
        description: str,
        organization_id: Optional[str] = None,
        department_id: Optional[str] = None,
    ) -> Dict:
        """Create a new meeting."""
        payload: Dict[str, Any] = {
            "title": title,
            "description": description,
        }
        if organization_id:
            payload["organization_id"] = organization_id
        if department_id:
            payload["department_id"] = department_id

        resp = self.session.post(
            self._url("/api/v1/meetings/"),
            headers=self._headers(),
            json=payload,
        )
        resp.raise_for_status()
        meeting = resp.json()
        logger.info(f"✅ Created meeting: {meeting.get('id')} — {title}")
        return meeting

    def add_meeting_member(self, meeting_id: str, user_id: str, role: str = "PARTICIPANT") -> Dict:
        """Add a user to a meeting."""
        resp = self.session.post(
            self._url(f"/api/v1/meetings/{meeting_id}/members"),
            headers=self._headers(),
            json={"user_id": user_id, "role": role},
        )
        resp.raise_for_status()
        logger.info(f"✅ Added member {user_id} as {role} to meeting {meeting_id}")
        return resp.json()

    def update_meeting_status(self, meeting_id: str, status: str) -> Dict:
        """Update meeting status."""
        resp = self.session.patch(
            self._url(f"/api/v1/meetings/{meeting_id}"),
            headers=self._headers(),
            json={"status": status},
        )
        resp.raise_for_status()
        logger.info(f"✅ Meeting {meeting_id} status → {status}")
        return resp.json()

    def get_meeting_token(self, meeting_id: str, participant_name: str) -> str:
        """Get LiveKit token for a participant."""
        resp = self.session.get(
            self._url(f"/api/v1/meetings/{meeting_id}/token"),
            headers=self._headers(),
            params={"participant_name": participant_name},
        )
        resp.raise_for_status()
        return resp.json().get("token", "")

    # ── Transcripts ───────────────────────────────────────────────
    def save_transcript(
        self,
        meeting_id: str,
        content: str,
        start_time: str,
        end_time: str,
        sequence: int,
        confidence: str = "bot_simulated",
    ) -> Dict:
        """Save a transcript segment."""
        resp = self.session.post(
            self._url(f"/api/v1/meetings/{meeting_id}/transcripts"),
            headers=self._headers(),
            json={
                "content": content,
                "start_time": start_time,
                "end_time": end_time,
                "sequence": sequence,
                "confidence": confidence,
            },
        )
        resp.raise_for_status()
        return resp.json()

    def get_transcripts(self, meeting_id: str) -> List[Dict]:
        """Get all transcript segments for a meeting."""
        resp = self.session.get(
            self._url(f"/api/v1/meetings/{meeting_id}/transcripts"),
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    # ── Action Items ──────────────────────────────────────────────
    def extract_action_items(self, meeting_id: str) -> Dict:
        """Trigger AI action item extraction."""
        resp = self.session.post(
            self._url(f"/api/v1/meetings/{meeting_id}/extract-action-items"),
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    def get_action_items(self, meeting_id: str) -> List[Dict]:
        """Get action items for a meeting."""
        resp = self.session.get(
            self._url(f"/api/v1/meetings/{meeting_id}/action-items"),
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    # ── STT Status ────────────────────────────────────────────────
    def get_stt_status(self) -> Dict:
        """Check STT backend availability."""
        resp = self.session.get(self._url("/api/stt/status"))
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------------------
# STT WebSocket Client
# ---------------------------------------------------------------------------
async def send_text_through_stt(
    ws_url: str,
    text: str,
    timeout: int = STT_TIMEOUT,
) -> Optional[Dict[str, Any]]:
    """
    Send text through the STT WebSocket and collect the final translation result.

    This simulates the flow: mic ON → speech captured → STT processes → is_final=true.
    """
    try:
        async with websockets.connect(ws_url) as ws:
            # Send translation request
            payload = {"type": "translate", "text": text}
            await ws.send(json.dumps(payload))

            # Collect frames until is_final
            final_result = None
            start = time.monotonic()

            while (time.monotonic() - start) < timeout:
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=timeout)
                    data = json.loads(raw)

                    if data.get("type") in (
                        "bilingual_translation_stream",
                        "bilingual_translation",
                    ):
                        if data.get("is_final"):
                            final_result = data
                            break
                        # Keep waiting for final frame
                except asyncio.TimeoutError:
                    logger.warning(f"STT timeout after {timeout}s for text: {text[:50]}...")
                    break

            return final_result

    except ConnectionRefusedError:
        logger.error("❌ STT WebSocket connection refused. Is the backend running?")
        return None
    except Exception as e:
        logger.error(f"❌ STT WebSocket error: {e}")
        return None


# ---------------------------------------------------------------------------
# Main Scenario
# ---------------------------------------------------------------------------
async def run_bot_meeting_scenario(existing_meeting_id: Optional[str] = None):
    """Execute the full bot meeting test scenario.

    Args:
        existing_meeting_id: If provided, skip meeting creation and use this meeting.
                            This lets you create a meeting on the frontend first,
                            join it, then run this script to watch bots chat live.
    """

    print_banner()

    # ── Load conversation script ──────────────────────────────────
    script_path = Path(CONVERSATION_SCRIPT_PATH)
    if not script_path.exists():
        logger.error(f"❌ Conversation script not found: {script_path}")
        sys.exit(1)

    with open(script_path, "r", encoding="utf-8") as f:
        script = json.load(f)

    dialog = script["dialog"]
    participants = script["participants"]
    bot_a_info = participants["bot_a"]
    bot_b_info = participants["bot_b"]

    logger.info(f"📜 Loaded conversation script: {len(dialog)} turns")
    logger.info(f"   Bot A: {bot_a_info['name']} ({bot_a_info['email']})")
    logger.info(f"   Bot B: {bot_b_info['name']} ({bot_b_info['email']})")

    # ── Initialize API client ─────────────────────────────────────
    api = AxiomApiClient(BASE_URL)

    # ═══════════════════════════════════════════════════════════════
    # PHASE 1: SETUP — Auth + Create Meeting + Add Members
    # ═══════════════════════════════════════════════════════════════
    print_phase("PHASE 1: SETUP — Auth & Meeting Creation")

    # 1a. Check backend is alive (quick root endpoint, NOT /api/stt/status which lazy-loads Whisper)
    try:
        resp = api.session.get(f"{BASE_URL}/", timeout=5)
        resp.raise_for_status()
        logger.info(f"✅ Backend is alive: {resp.json().get('message', 'OK')}")
    except Exception as e:
        logger.error(f"❌ Backend not reachable at {BASE_URL}: {e}")
        sys.exit(1)

    # 1a2. Optional STT status (short timeout — don't block on model loading)
    try:
        stt_resp = api.session.get(f"{BASE_URL}/api/stt/status", timeout=5)
        if stt_resp.status_code == 200:
            logger.info(f"🔍 STT Status: {json.dumps(stt_resp.json(), indent=2)}")
    except Exception:
        logger.info("ℹ️  STT status check skipped (model may be loading — this is normal)")

    # 1b. Register bot users (idempotent)
    api.register_user(bot_a_info["email"], "bot_password_123", bot_a_info["name"])
    api.register_user(bot_b_info["email"], "bot_password_123", bot_b_info["name"])

    # 1c. Login as admin
    api.login(ADMIN_EMAIL, ADMIN_PASSWORD)

    # 1d. Get organization (use first available)
    orgs = api.get_my_organizations()
    org_id = orgs[0]["id"] if orgs else None
    if org_id:
        logger.info(f"📁 Using organization: {orgs[0].get('name', org_id)}")

    # 1e. Create or reuse meeting
    if existing_meeting_id:
        meeting_id = existing_meeting_id
        logger.info(f"📌 Using existing meeting: {meeting_id}")
        logger.info(f"   (You should already be in this room on the frontend)")
    else:
        meeting = api.create_meeting(
            title=script["meeting_title"],
            description=script["meeting_description"],
            organization_id=org_id,
        )
        meeting_id = meeting["id"]

    # 1f. Get bot user IDs and add them as members
    bot_a_id = api.get_user_id_by_login(bot_a_info["email"], "bot_password_123")
    bot_b_id = api.get_user_id_by_login(bot_b_info["email"], "bot_password_123")

    if bot_a_id:
        try:
            api.add_meeting_member(meeting_id, bot_a_id, bot_a_info.get("role", "PARTICIPANT"))
        except Exception:
            logger.info(f"ℹ️  Bot A already a member of meeting")
    if bot_b_id:
        try:
            api.add_meeting_member(meeting_id, bot_b_id, bot_b_info.get("role", "PARTICIPANT"))
        except Exception:
            logger.info(f"ℹ️  Bot B already a member of meeting")

    # 1g. Get LiveKit tokens for all participants
    token_admin = api.get_meeting_token(meeting_id, "Admin User")
    token_bot_a = api.get_meeting_token(meeting_id, bot_a_info["name"])
    token_bot_b = api.get_meeting_token(meeting_id, bot_b_info["name"])
    logger.info(f"🎫 LiveKit tokens generated for 3 participants")

    # 1h. Start meeting (only if new)
    if not existing_meeting_id:
        api.update_meeting_status(meeting_id, "IN_PROGRESS")
    else:
        logger.info(f"⏭️  Skipping status update (meeting already in progress)")

    # ═══════════════════════════════════════════════════════════════
    # PHASE 2: CONVERSATION — Sequential Mic Turn-Taking + STT
    # ═══════════════════════════════════════════════════════════════
    print_phase("PHASE 2: CONVERSATION — Sequential Turn-Taking")

    # Map speaker keys to names
    speaker_names = {
        "bot_a": bot_a_info["name"],
        "bot_b": bot_b_info["name"],
    }

    # Track results for final report
    results: List[Dict[str, Any]] = []
    sequence = 1

    for i, turn in enumerate(dialog):
        speaker_key = turn["speaker"]
        speaker_name = speaker_names[speaker_key]
        text = turn["text"]

        turn_number = i + 1
        print(f"\n  {Colors.BOLD}─── Turn {turn_number}/{len(dialog)} ───{Colors.RESET}")

        # ── MIC ON ──
        print_mic_event(speaker_name, "on", text)

        # ── Send through STT WebSocket ──
        start_time = time.strftime("%H:%M:%S")
        stt_result = await send_text_through_stt(WS_URL, text)
        end_time = time.strftime("%H:%M:%S")

        if stt_result:
            vi_text = stt_result.get("vi_text", text)
            en_text = stt_result.get("en_text", "")
            notes = stt_result.get("validation_notes", "")
            print_stt_result(vi_text, en_text, notes)

            # ── Save transcript to DB ──
            content = f"[VI] {vi_text}\n[EN] {en_text}" if en_text else vi_text
            try:
                saved = api.save_transcript(
                    meeting_id=meeting_id,
                    content=content,
                    start_time=start_time,
                    end_time=end_time,
                    sequence=sequence,
                    confidence="bot_stt_simulated",
                )
                logger.info(
                    f"  💾 Saved transcript segment #{sequence} (id: {saved.get('id', '?')})"
                )
                sequence += 1
            except Exception as e:
                logger.warning(f"  ⚠️  Failed to save transcript: {e}")

            results.append(
                {
                    "turn": turn_number,
                    "speaker": speaker_name,
                    "original": text,
                    "vi_text": vi_text,
                    "en_text": en_text,
                    "notes": notes,
                    "saved": True,
                }
            )
        else:
            logger.warning(f"  ⚠️  STT returned no result for turn {turn_number}")
            # Still save original text as fallback
            try:
                api.save_transcript(
                    meeting_id=meeting_id,
                    content=f"[VI] {text}\n[EN] (STT unavailable)",
                    start_time=start_time,
                    end_time=end_time,
                    sequence=sequence,
                    confidence="fallback_no_stt",
                )
                sequence += 1
            except Exception as e:
                logger.warning(f"  ⚠️  Failed to save fallback transcript: {e}")

            results.append(
                {
                    "turn": turn_number,
                    "speaker": speaker_name,
                    "original": text,
                    "vi_text": text,
                    "en_text": "(STT unavailable)",
                    "notes": "fallback",
                    "saved": True,
                }
            )

        # ── MIC OFF ──
        print_mic_event(speaker_name, "off")

        # ── Delay before next turn ──
        if i < len(dialog) - 1:
            logger.info(f"  ⏳ Waiting {SCRIPT_DELAY}s before next turn...")
            await asyncio.sleep(SCRIPT_DELAY)

    # ═══════════════════════════════════════════════════════════════
    # PHASE 3: FINALIZE — Complete Meeting + Extract Action Items
    # ═══════════════════════════════════════════════════════════════
    print_phase("PHASE 3: FINALIZE — Meeting Completion")

    # 3a. Mark meeting as completed
    api.update_meeting_status(meeting_id, "COMPLETED")

    # 3b. Trigger AI action item extraction
    try:
        extraction = api.extract_action_items(meeting_id)
        extracted_count = extraction.get("extracted_count", 0)
        logger.info(f"🤖 AI extracted {extracted_count} action items")
    except Exception as e:
        logger.warning(f"⚠️  Action item extraction failed (Ollama may be offline): {e}")
        extracted_count = 0

    # 3c. Fetch all transcripts for verification
    all_transcripts = api.get_transcripts(meeting_id)
    logger.info(f"📋 Total transcripts in DB: {len(all_transcripts)}")

    # 3d. Fetch action items
    try:
        action_items = api.get_action_items(meeting_id)
    except Exception:
        action_items = []

    # ═══════════════════════════════════════════════════════════════
    # REPORT
    # ═══════════════════════════════════════════════════════════════
    print_phase("REPORT — Test Results")

    print(
        f"""
{Colors.BOLD}📊 Meeting Summary{Colors.RESET}
  Meeting ID:      {meeting_id}
  Title:           {script['meeting_title']}
  Total Turns:     {len(dialog)}
  Transcripts Saved: {len(all_transcripts)}
  Action Items:    {len(action_items)}
  STT Successful:  {sum(1 for r in results if r.get('notes') != 'fallback')}/{len(results)}
"""
    )

    # Print transcript table
    print(f"{Colors.BOLD}📝 Transcript Results:{Colors.RESET}")
    print(f"  {'#':>3} | {'Speaker':<20} | {'Status':<15} | {'VI Text (truncated)':<40}")
    print(f"  {'─'*3}─┼─{'─'*20}─┼─{'─'*15}─┼─{'─'*40}")
    for r in results:
        status = (
            f"{Colors.GREEN}✅ STT OK{Colors.RESET}"
            if r["notes"] != "fallback"
            else f"{Colors.YELLOW}⚠️ Fallback{Colors.RESET}"
        )
        vi_short = r["vi_text"][:37] + "..." if len(r["vi_text"]) > 40 else r["vi_text"]
        print(f"  {r['turn']:>3} | {r['speaker']:<20} | {status:<25} | {vi_short:<40}")

    # Print action items if any
    if action_items:
        print(f"\n{Colors.BOLD}✅ Action Items Extracted:{Colors.RESET}")
        for item in action_items:
            status_icon = "🔵" if item.get("status") == "TODO" else "✅"
            print(f"  {status_icon} {item.get('title', 'N/A')}")
            if item.get("assignee_id"):
                print(f"     Assignee: {item['assignee_id']}")

    print(
        f"""
{Colors.BOLD}{Colors.GREEN}════════════════════════════════════════════════════════════════
  🎉 Bot Meeting Test Scenario — COMPLETED SUCCESSFULLY!

  View meeting in frontend: {BASE_URL.replace('8000', '3000')}/meetings/{meeting_id}
════════════════════════════════════════════════════════════════{Colors.RESET}
"""
    )

    return {
        "meeting_id": meeting_id,
        "turns": len(dialog),
        "transcripts_saved": len(all_transcripts),
        "action_items_count": len(action_items),
        "results": results,
    }


# ---------------------------------------------------------------------------
# Pytest wrapper (manual integration test)
# ---------------------------------------------------------------------------
try:
    import pytest

    @pytest.mark.skip(reason="Manual integration test — requires running server")
    @pytest.mark.asyncio
    async def test_bot_meeting_scenario():
        """Run the bot meeting scenario as a pytest test."""
        result = await run_bot_meeting_scenario()
        assert result["meeting_id"], "Meeting should be created"
        assert result["transcripts_saved"] > 0, "At least one transcript should be saved"
        assert result["turns"] == 8, "Should have 8 conversation turns"

except ImportError:
    pass  # pytest not installed — standalone mode only


# ---------------------------------------------------------------------------
# Standalone entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Axiom Bot Meeting Test — Sequential mic turn-taking with STT",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Auto-create a new meeting:
  python scripts/test_bot_meeting_scenario.py

  # Join an existing meeting (you create on frontend first):
  python scripts/test_bot_meeting_scenario.py --meeting-id abc123-def456

  # Faster turns (0.5s delay):
  python scripts/test_bot_meeting_scenario.py --delay 0.5
""",
    )
    parser.add_argument(
        "--meeting-id",
        "-m",
        type=str,
        default=None,
        help="Use an existing meeting ID instead of creating a new one",
    )
    parser.add_argument(
        "--delay",
        "-d",
        type=float,
        default=None,
        help=f"Delay between turns in seconds (default: {SCRIPT_DELAY})",
    )
    args = parser.parse_args()

    # Override delay if provided via CLI
    if args.delay is not None:
        SCRIPT_DELAY = args.delay

    # Extract meeting ID from full URL if user pasted the browser URL
    meeting_id = args.meeting_id
    if meeting_id and "/" in meeting_id:
        # User pasted something like http://localhost:3000/meetings/abc-123
        import re

        uuid_match = re.search(
            r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
            meeting_id,
            re.IGNORECASE,
        )
        if uuid_match:
            meeting_id = uuid_match.group(0)
            logger.info(f"📋 Extracted meeting ID from URL: {meeting_id}")
        else:
            logger.error(f"❌ Could not find a valid UUID in: {meeting_id}")
            sys.exit(1)

    try:
        result = asyncio.run(run_bot_meeting_scenario(existing_meeting_id=meeting_id))
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}⚠️  Test interrupted by user{Colors.RESET}")
        sys.exit(130)
    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
        sys.exit(1)
