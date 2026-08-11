"""
E2E test script for Action Item Extraction pipeline.

Run this LOCALLY (not in Docker) to test the full flow:
  1. Login with admin account
  2. Create a meeting
  3. Add transcript segments (simulating a real meeting)
  4. Call extraction endpoint
  5. Verify action items were created

Usage:
  python src/backend/tests/test_extraction_e2e.py

Prerequisites:
  - Backend running at localhost:8000 (docker or local)
  - Ollama running locally with qwen3:0.6b
  - Set OLLAMA_BASE_URL in docker-compose.yml
"""

import json
import sys

import requests

# ── Config ────────────────────────────────────────────
API_BASE = "http://localhost:8000"
ADMIN_EMAIL = "admin@axiom.com"
ADMIN_PASSWORD = "password123"


def main():
    print("=" * 60)
    print("🧪 Action Item Extraction — E2E Test")
    print("=" * 60)

    # Step 1: Login
    print("\n📋 Step 1: Login as admin...")
    resp = requests.post(
        f"{API_BASE}/api/v1/auth/login",
        json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
        },
    )
    if resp.status_code != 200:
        print(f"❌ Login failed: {resp.status_code} {resp.text}")
        sys.exit(1)
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"✅ Logged in as {ADMIN_EMAIL}")

    # Step 2: Create a meeting
    print("\n📋 Step 2: Create meeting...")
    resp = requests.post(
        f"{API_BASE}/api/v1/meetings",
        json={
            "title": "Sprint Planning - Action Item Test",
        },
        headers=headers,
    )
    if resp.status_code not in (200, 201):
        print(f"❌ Create meeting failed: {resp.status_code} {resp.text}")
        sys.exit(1)
    meeting_id = resp.json()["id"]
    print(f"✅ Meeting created: {meeting_id}")

    # Step 3: Add transcript segments
    print("\n📋 Step 3: Adding transcript segments...")
    transcript_segments = [
        {
            "content": "Alright team, let's review the sprint backlog and assign tasks.",
            "start_time": "00:00:00",
            "end_time": "00:00:15",
            "sequence": 1,
        },
        {
            "content": "Khoa will update the API documentation for the v2 endpoints by Friday.",
            "start_time": "00:00:15",
            "end_time": "00:00:30",
            "sequence": 2,
        },
        {
            "content": "We need to fix the login page bug, it's been blocking QA for two days.",
            "start_time": "00:00:30",
            "end_time": "00:00:45",
            "sequence": 3,
        },
        {
            "content": "Minh should review the security audit report before the end of the week.",
            "start_time": "00:00:45",
            "end_time": "00:01:00",
            "sequence": 4,
        },
        {
            "content": "Please deploy the staging environment by next Monday so QA can start.",
            "start_time": "00:01:00",
            "end_time": "00:01:15",
            "sequence": 5,
        },
        {
            "content": "Lan cần phải hoàn thành tài liệu thiết kế UI trước thứ tư.",
            "start_time": "00:01:15",
            "end_time": "00:01:30",
            "sequence": 6,
        },
        {
            "content": "I think we should also add monitoring to the production servers.",
            "start_time": "00:01:30",
            "end_time": "00:01:45",
            "sequence": 7,
        },
        {
            "content": "Great meeting everyone, let's get these tasks done!",
            "start_time": "00:01:45",
            "end_time": "00:02:00",
            "sequence": 8,
        },
    ]

    for i, seg in enumerate(transcript_segments):
        resp = requests.post(
            f"{API_BASE}/api/v1/meetings/{meeting_id}/transcripts",
            json=seg,
            headers=headers,
        )
        status = "✅" if resp.status_code in (200, 201) else "❌"
        print(f"  {status} Segment {i+1}: {seg['content'][:60]}...")

    # Step 4: Trigger extraction
    print("\n📋 Step 4: Triggering AI extraction...")
    resp = requests.post(
        f"{API_BASE}/api/v1/meetings/{meeting_id}/extract-action-items",
        headers=headers,
    )
    print(f"  Response: {resp.status_code}")

    if resp.status_code == 200:
        data = resp.json()
        print(f"\n✅ Extracted {data['extracted_count']} action items:")
        print("-" * 60)
        print(f"{'#':<3} {'Task':<40} {'Owner':<12} {'Priority':<8} {'Due'}")
        print("-" * 60)
        for i, item in enumerate(data["items"], 1):
            print(
                f"{i:<3} {item['task'][:40]:<40} {item['owner']:<12} {item['priority']:<8} {item.get('due_date', 'N/A')}"
            )
        print("-" * 60)
    else:
        print(f"❌ Extraction failed: {resp.text}")

    # Step 5: Verify via action items API
    print("\n📋 Step 5: Verify action items in DB...")
    resp = requests.get(
        f"{API_BASE}/api/v1/meetings/{meeting_id}/action-items",
        headers=headers,
    )
    if resp.status_code == 200:
        items = resp.json()
        print(f"✅ {len(items)} action items stored in database")
        for item in items:
            print(f"  • [{item['status']}] {item['title']}")
    else:
        print(f"❌ Failed to fetch action items: {resp.status_code}")

    # Step 6: Test auto-trigger (set status to COMPLETED)
    print("\n📋 Step 6: Test auto-trigger (PATCH status → COMPLETED)...")
    # Create another meeting for auto-trigger test
    resp = requests.post(
        f"{API_BASE}/api/v1/meetings",
        json={
            "title": "Auto-trigger Test Meeting",
        },
        headers=headers,
    )
    meeting2_id = resp.json()["id"]

    # Add a transcript
    requests.post(
        f"{API_BASE}/api/v1/meetings/{meeting2_id}/transcripts",
        json={
            "content": "Team lead will prepare the quarterly report by end of month.",
            "start_time": "00:00:00",
            "end_time": "00:00:15",
            "sequence": 1,
        },
        headers=headers,
    )

    # Complete the meeting → should auto-trigger extraction
    resp = requests.patch(
        f"{API_BASE}/api/v1/meetings/{meeting2_id}",
        json={
            "status": "COMPLETED",
        },
        headers=headers,
    )
    print(f"  PATCH status → COMPLETED: {resp.status_code}")

    # Check if action items were auto-created
    resp = requests.get(f"{API_BASE}/api/v1/meetings/{meeting2_id}/action-items", headers=headers)
    if resp.status_code == 200:
        items = resp.json()
        if items:
            print(f"✅ Auto-trigger worked! {len(items)} items created automatically")
            for item in items:
                print(f"  • [{item['status']}] {item['title']}")
        else:
            print("⚠️  No items auto-extracted (Ollama might be unreachable from Docker)")
    else:
        print(f"❌ Failed: {resp.status_code}")

    print("\n" + "=" * 60)
    print("🏁 E2E Test Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
