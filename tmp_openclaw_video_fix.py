import json
import pathlib

base = pathlib.Path("/root/.openclaw")
config_path = base / "openclaw.json"
obj = json.loads(config_path.read_text())

keep = {"main", "manager", "marketing", "sales", "it"}
obj["agents"]["list"] = [
    agent for agent in obj.get("agents", {}).get("list", []) if agent.get("id") in keep
]

config_path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n")
