#!/usr/bin/env python3
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE = os.environ.get("PHAYA_BASE", "https://api.phaya.io/api/v1").rstrip("/")
API_KEY = os.environ.get("PHAYA_API_KEY", "")


def request_json(method: str, path: str, payload=None):
    url = f"{BASE}/{path.lstrip('/')}"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "OpenClaw-Phaya-Video/1.0",
    }
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            try:
                body = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                body = {"raw": raw}
            return {"ok": True, "status": resp.status, "body": body}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            body = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            body = {"raw": raw}
        return {"ok": False, "status": exc.code, "body": body}
    except Exception as exc:
        return {"ok": False, "status": 0, "body": {"error": str(exc)}}


def emit(obj):
    print(json.dumps(obj, ensure_ascii=False))


def cmd_credits(_args):
    emit(request_json("GET", "/user/credits"))


def cmd_sora_create(args):
    payload = {
        "prompt": args.prompt,
        "aspect_ratio": args.aspect_ratio,
        "n_frames": str(args.frames),
    }
    if args.image_url:
        payload["image_url"] = args.image_url
    emit(request_json("POST", "/sora2-text-to-video/create", payload))


def cmd_image_to_video_create(args):
    payload = {
        "image_url": args.image_url,
        "duration": args.duration,
    }
    emit(request_json("POST", "/image-to-video/create", payload))


def cmd_status(args):
    emit(request_json("GET", f"/{args.service}/status/{args.job_id}"))


def cmd_wait(args):
    deadline = time.time() + args.timeout
    last = None
    while time.time() < deadline:
        result = request_json("GET", f"/{args.service}/status/{args.job_id}")
        last = result
        status = str(result.get("body", {}).get("status", "")).upper()
        if status in {"COMPLETED", "FAILED", "CANCELLED"}:
            emit(result)
            return
        time.sleep(args.interval)
    out = last or {"ok": False, "status": 0, "body": {"error": "timeout waiting for job"}}
    out["timedOut"] = True
    emit(out)


def build_parser():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    credits = sub.add_parser("credits")
    credits.set_defaults(func=cmd_credits)

    sora = sub.add_parser("sora-create")
    sora.add_argument("--prompt", required=True)
    sora.add_argument("--aspect-ratio", default="landscape")
    sora.add_argument("--frames", type=int, default=10)
    sora.add_argument("--image-url")
    sora.set_defaults(func=cmd_sora_create)

    i2v = sub.add_parser("image-to-video-create")
    i2v.add_argument("--image-url", required=True)
    i2v.add_argument("--duration", type=int, default=5)
    i2v.set_defaults(func=cmd_image_to_video_create)

    status = sub.add_parser("status")
    status.add_argument("--service", required=True)
    status.add_argument("--job-id", required=True)
    status.set_defaults(func=cmd_status)

    wait = sub.add_parser("wait")
    wait.add_argument("--service", required=True)
    wait.add_argument("--job-id", required=True)
    wait.add_argument("--timeout", type=int, default=300)
    wait.add_argument("--interval", type=int, default=5)
    wait.set_defaults(func=cmd_wait)

    return parser


def main():
    if not API_KEY:
        emit({"ok": False, "status": 0, "body": {"error": "PHAYA_API_KEY missing"}})
        sys.exit(1)
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
