"""
End-to-end smoke test for the Magna AI backend.
Run from backend/ with the venv active:
    python test_api.py
"""
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

# Load backend/.env so the script works without pre-exporting vars
load_dotenv(Path(__file__).parent / ".env")

BASE_URL = "http://127.0.0.1:8000"
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

TEST_EMAIL = "smoketest_magna@mailinator.com"
TEST_PASSWORD = "Magna_Test_2026!"

_passed = 0
_failed = 0


def check(label: str, response: httpx.Response, expected: int = 200):
    global _passed, _failed
    ok = response.status_code == expected
    icon = "[OK]  " if ok else "[FAIL]"
    print(f"  {icon} {label}  ({response.status_code})")
    if not ok:
        _failed += 1
        print(f"         -> {response.text[:300]}")
        return None
    _passed += 1
    try:
        return response.json()
    except Exception:
        return response.content


def check_binary(label: str, response: httpx.Response, expected_ct: str):
    global _passed, _failed
    ct = response.headers.get("content-type", "")
    ok = response.status_code == 200 and expected_ct in ct
    icon = "[OK]  " if ok else "[FAIL]"
    size = len(response.content)
    print(f"  {icon} {label}  ({response.status_code})  {size} bytes")
    if not ok:
        _failed += 1
        print(f"         -> content-type: {ct}  body: {response.text[:200]}")
    else:
        _passed += 1


def get_token() -> str:
    """Get a JWT for the smoke-test user, creating/confirming the account via admin API if needed."""
    admin_h = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    anon_h = {"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"}

    # 1. Try sign-in first (happy path if user already exists and is confirmed)
    r = httpx.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers=anon_h, timeout=10,
    )
    if r.status_code == 200:
        return r.json()["access_token"]

    # 2. Create a pre-confirmed user via admin API
    r = httpx.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "email_confirm": True},
        headers=admin_h, timeout=10,
    )

    if r.status_code in (400, 422):
        # User already exists but is unconfirmed — find and confirm them
        list_r = httpx.get(f"{SUPABASE_URL}/auth/v1/admin/users", headers=admin_h, timeout=10)
        users = list_r.json().get("users", [])
        user = next((u for u in users if u.get("email") == TEST_EMAIL), None)
        if user:
            httpx.put(
                f"{SUPABASE_URL}/auth/v1/admin/users/{user['id']}",
                json={"email_confirm": True},
                headers=admin_h, timeout=10,
            )

    # 3. Sign in now that the user is confirmed
    r = httpx.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers=anon_h, timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def main():
    print("")
    print("==========================================")
    print("  Magna AI -- Backend Smoke Test")
    print("==========================================")

    # --- 1. Health ---
    print("\n-- Health --")
    r = httpx.get(f"{BASE_URL}/health", timeout=5)
    check("GET /health", r)

    # --- 2. Auth ---
    print("\n-- Auth --")
    try:
        token = get_token()
        print(f"  [OK]   Supabase JWT acquired  ({token[:24]}...)")
    except Exception as exc:
        print(f"  [FAIL] Auth failed: {exc}")
        sys.exit(1)

    H = {"Authorization": f"Bearer {token}"}

    # --- 3. Text Generation (all 4 types) ---
    print("\n-- Text Generation --")
    gen_ids: dict[str, str] = {}

    for ct, topic, tone, audience in [
        ("blog_post",     "AI in healthcare 2026",         "professional", "hospital administrators"),
        ("linkedin_post", "Building in public as a founder","personal",    "startup founders"),
        ("ad_copy",       "Noise-cancelling headphones",    "energetic",   "remote workers"),
        ("email",         "Black Friday sale on SaaS tools","friendly",    "small business owners"),
    ]:
        r = httpx.post(
            f"{BASE_URL}/api/generate/text",
            json={"topic": topic, "tone": tone, "audience": audience, "content_type": ct},
            headers=H,
            timeout=45,
        )
        data = check(f"POST /generate/text ({ct})", r)
        if data:
            gen_ids[ct] = data["id"]
            title_preview = (data.get("title") or "-")[:55]
            print(f"         -> id={data['id'][:8]}  title='{title_preview}'")
            if not data.get("metadata"):
                print("         [WARN] metadata field missing in response")

    # --- 4. List + Get ---
    print("\n-- Dashboard (List & Get) --")
    r = httpx.get(f"{BASE_URL}/api/generations?page=1&page_size=5", headers=H, timeout=10)
    data = check("GET /generations", r)
    if data:
        print(f"         -> total={data['total']}  items_returned={len(data['items'])}")

    if gen_ids:
        sample_id = next(iter(gen_ids.values()))
        r = httpx.get(f"{BASE_URL}/api/generations/{sample_id}", headers=H, timeout=10)
        data = check("GET /generations/{id}", r)
        if data:
            print(f"         -> content_type={data['content_type']}  metadata_present={bool(data.get('metadata'))}")

    # --- 5. Content Improver ---
    print("\n-- Content Improver --")
    sample_text = (
        "Remote work is okay. Some people like it. "
        "Companies save money. But there are challenges too."
    )
    for goal in ["more_persuasive", "shorter", "rewrite_for_audience"]:
        payload: dict = {"text": sample_text, "goal": goal}
        if goal == "rewrite_for_audience":
            payload["target_audience"] = "CEOs of Fortune 500 companies"
        r = httpx.post(f"{BASE_URL}/api/improve", json=payload, headers=H, timeout=45)
        data = check(f"POST /improve (goal={goal})", r)
        if data:
            changes = data.get("changes", [])
            first = changes[0][:70] if changes else "-"
            print(f"         -> {len(changes)} changes  first='{first}'")

    # --- 6. Image Generation ---
    print("\n-- Image Generation --")
    if "blog_post" in gen_ids:
        r = httpx.post(
            f"{BASE_URL}/api/generate/image",
            json={"generation_id": gen_ids["blog_post"], "style": "photoreal"},
            headers=H,
            timeout=60,
        )
        data = check("POST /generate/image (style=photoreal)", r)
        if data:
            print(f"         -> url={data['image_url'][:70]}...")

        r = httpx.post(
            f"{BASE_URL}/api/generate/image",
            json={"generation_id": gen_ids["blog_post"], "style": "illustration"},
            headers=H,
            timeout=60,
        )
        data = check("POST /generate/image (style=illustration, regen)", r)
        if data:
            print(f"         -> url={data['image_url'][:70]}...")

    # --- 7. Export ---
    print("\n-- Export --")
    if gen_ids:
        sample_id = next(iter(gen_ids.values()))
        for fmt, expected_ct in [("pdf", "application/pdf"), ("docx", "officedocument")]:
            r = httpx.post(
                f"{BASE_URL}/api/generations/{sample_id}/export",
                json={"format": fmt},
                headers=H,
                timeout=30,
            )
            check_binary(f"POST /generations/{{id}}/export (format={fmt})", r, expected_ct)

    # --- 8. Delete ---
    print("\n-- Delete --")
    if gen_ids:
        del_id = next(iter(gen_ids.values()))
        r = httpx.delete(f"{BASE_URL}/api/generations/{del_id}", headers=H, timeout=10)
        check("DELETE /generations/{id}", r, expected=204)

        r = httpx.get(f"{BASE_URL}/api/generations/{del_id}", headers=H, timeout=10)
        check("GET /generations/{id} (expect 404 after delete)", r, expected=404)

    # --- 9. Validation ---
    print("\n-- Input Validation --")
    r = httpx.post(
        f"{BASE_URL}/api/generate/text",
        json={"topic": "x", "tone": "y", "audience": "z", "content_type": "bad_type"},
        headers=H, timeout=10,
    )
    check("POST /generate/text (bad content_type -> expect 422)", r, expected=422)

    r = httpx.post(
        f"{BASE_URL}/api/improve",
        json={"text": "hello", "goal": "rewrite_for_audience"},
        headers=H, timeout=10,
    )
    check("POST /improve (missing target_audience -> expect 422)", r, expected=422)

    # --- Summary ---
    total = _passed + _failed
    print("")
    print("==========================================")
    print(f"  Results: {_passed}/{total} passed,  {_failed} failed")
    print("==========================================")
    sys.exit(0 if _failed == 0 else 1)


if __name__ == "__main__":
    main()
