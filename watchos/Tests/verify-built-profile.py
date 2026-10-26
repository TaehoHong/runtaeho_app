"""Verify actual watch build metadata against the shared phone profile contract."""
import argparse
import json
import plistlib
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("profile", choices=("local", "development", "production"))
parser.add_argument("app", type=Path, help="Built RunTaehoWatch.app directory")
args = parser.parse_args()
profiles = json.loads((Path(__file__).resolve().parents[2] / "scripts/app-profiles.json").read_text())
profile = profiles[args.profile]
with (args.app / "Info.plist").open("rb") as source:
    info = plistlib.load(source)
expected = {
    "CFBundleIdentifier": profile["applicationId"] + ".watchkitapp",
    "WKCompanionAppBundleIdentifier": profile["applicationId"],
    "CFBundleDisplayName": profile["name"],
}
for key, value in expected.items():
    if info.get(key) != value:
        raise SystemExit(f"{args.profile}: {key}: expected {value!r}, got {info.get(key)!r}")
print(f"{args.profile}: built watch identity, companion and display name match shared profile")
