import hashlib
import json
import os
import re
import time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler
from urllib.request import Request, urlopen

from backend.cli import canonical_profile
from backend.pipeline import generate
from pydantic import ValidationError


def query(sql, values):
    endpoint = os.environ["TURSO_DATABASE_URL"].replace("libsql://", "https://", 1)
    args = [
        {"type": "integer" if isinstance(value, int) else "text", "value": str(value)}
        for value in values
    ]
    request = Request(
        endpoint.rstrip("/") + "/v2/pipeline",
        json.dumps({"requests": [
            {"type": "execute", "stmt": {"sql": sql, "args": args}},
            {"type": "close"},
        ]}).encode(),
        {"Authorization": "Bearer " + os.environ["TURSO_AUTH_TOKEN"],
         "Content-Type": "application/json"},
    )
    with urlopen(request, timeout=8) as response:
        execution = json.load(response)["results"][0]
    if execution["type"] != "ok":
        raise RuntimeError("Workspace storage request failed")
    result = execution["response"]["result"]
    columns = [column["name"] for column in result["cols"]]
    return [dict(zip(columns, (cell.get("value") for cell in row))) for row in result["rows"]]


def can_access(user, owner):
    if owner == user["id"]:
        return True
    if user["plan"] != "Team" or user["role"] not in ("owner", "staff"):
        return False
    accounts = query("SELECT role, assigned FROM users WHERE id=? AND org=?", (owner, user["org"]))
    return bool(accounts and (user["role"] == "owner" or
                (accounts[0]["role"] == "candidate" and accounts[0]["assigned"] == user["id"])))


class handler(BaseHTTPRequestHandler):
    def reply(self, status, data):
        payload = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self):
        origin = self.headers.get("Origin")
        if self.headers.get("Sec-Fetch-Site") == "cross-site" or (
            origin and origin != "https://" + self.headers.get("Host", "")
        ):
            return self.reply(403, {"error": "Same-origin requests required"})
        try:
            sid = SimpleCookie(self.headers.get("Cookie", "")).get("sid")
        except ValueError:
            sid = None
        if not sid or not re.fullmatch(r"[a-f0-9]{64}", sid.value):
            return self.reply(401, {"error": "Please sign in"})
        try:
            length = int(self.headers.get("Content-Length", 0))
            if not 0 < length <= 2_000_000:
                return self.reply(413, {"error": "Request body is missing or too large"})
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError
            jd = data.get("jd")
            if not isinstance(jd, str) or not 10 <= len(jd) <= 20_000:
                return self.reply(400, {"error": "Paste a job description of 10–20,000 characters."})
            if any(data.get(key) and not isinstance(data[key], str) for key in ("owner", "parentId")):
                raise ValueError
        except (TypeError, ValueError):
            return self.reply(400, {"error": "Invalid request body"})
        try:
            users = query(
                """SELECT u.id, u.org, u.role, o.plan FROM sessions s
                   JOIN users u ON u.id=s.user JOIN orgs o ON o.id=u.org
                   WHERE s.token=? AND s.expires>?""",
                (hashlib.sha256(sid.value.encode()).hexdigest(), int(time.time() * 1000)),
            )
            if not users:
                return self.reply(401, {"error": "Please sign in"})
            user = users[0]
            if data.get("owner") and not can_access(user, data["owner"]):
                return self.reply(404, {"error": "Record not found"})
            if data.get("parentId"):
                docs = query("SELECT owner FROM records WHERE id=? AND org=? AND kind='document'",
                             (data["parentId"], user["org"]))
                if not docs or not can_access(user, docs[0]["owner"]):
                    return self.reply(404, {"error": "Record not found"})
        except (KeyError, OSError, ValueError, RuntimeError):
            return self.reply(503, {"error": "Workspace storage is temporarily unavailable."})
        try:
            profile = data.get("profile") or canonical_profile(data.get("resume") or {})
            return self.reply(200, generate(profile, jd))
        except (ValidationError, AttributeError, TypeError, ValueError):
            return self.reply(422, {"error": "Review your profile details and try again."})
