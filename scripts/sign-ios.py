#!/usr/bin/env python3
"""Export phone App Store IPAs with their Live Activity extension."""
import contextlib
import hashlib
import json
from pathlib import Path
import plistlib
import re
import secrets
import shutil
import signal
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
CREDENTIALS = ROOT.parent / "credentials"


def command(args):
    result = subprocess.run(args, capture_output=True)
    if result.returncode:
        # security arguments can contain passwords; never print the command/exception.
        raise ValueError(f"{args[0]} {args[1]} 실패 (종료 코드 {result.returncode})")
    return result.stdout


def entitlements(source, allowed):
    result = dict(source)
    for key, value in source.items():
        if key == "aps-environment":
            result[key] = allowed.get(key)
        elif isinstance(value, list):
            if not all(item in allowed.get(key, []) for item in value):
                raise ValueError(f"프로파일에 필요한 권한이 없습니다: {key}")
        elif value != allowed.get(key):
            raise ValueError(f"프로파일에 필요한 권한이 없습니다: {key}")
    if "aps-environment" in source and result["aps-environment"] != "production":
        raise ValueError("App Store 프로파일에 production 푸시 권한이 필요합니다.")
    for key in ["application-identifier", "com.apple.developer.team-identifier", "beta-reports-active", "get-task-allow"]:
        if key in allowed:
            result[key] = allowed[key]
    return result


@dataclass(frozen=True)
class SigningProfile:
    path: Path
    bundle: str
    data: dict
    rights: dict


def load_profile(path, bundle, source):
    if not path.is_file():
        raise ValueError(f"서명 파일이 없습니다: {path}. Apple Developer의 App ID·App Store 프로파일을 준비하세요.")
    data = plistlib.loads(command(["security", "cms", "-D", "-i", str(path)]))
    allowed = data["Entitlements"]
    if data["ExpirationDate"] <= datetime.now(timezone.utc).replace(tzinfo=None):
        raise ValueError(f"프로비저닝 프로파일이 만료됐습니다: {path.name}")
    if allowed.get("application-identifier") != "3F893P33SC." + bundle:
        raise ValueError(f"프로비저닝 프로파일의 앱 ID가 다릅니다 (필요: {bundle}).")
    if allowed.get("get-task-allow") or data.get("ProvisionedDevices") or data.get("ProvisionsAllDevices"):
        raise ValueError("개발 디바이스용이 아닌 App Store 배포 프로파일이 필요합니다.")
    return SigningProfile(path, bundle, data, entitlements(source, allowed))


def credentials(profile):
    profiles = json.loads((ROOT / "scripts/app-profiles.json").read_text())
    if profile not in ["development", "production"]:
        raise ValueError("서명 프로파일은 development 또는 production이어야 합니다.")
    p12 = CREDENTIALS / "ios-production-signing.p12"
    config = CREDENTIALS / "ios-production-signing.json"
    for file in [p12, config]:
        if not file.is_file():
            raise ValueError(f"서명 파일이 없습니다: {file}. Apple Developer의 배포 인증서를 준비하세요.")
    password = json.loads(config.read_text()).get("certificatePassword")
    if not password:
        raise ValueError("ios-production-signing.json의 certificatePassword가 필요합니다.")
    bundle = profiles[profile]["applicationId"]
    source = plistlib.loads((ROOT / "ios/app/app.entitlements").read_bytes())
    phone = load_profile(CREDENTIALS / f"ios-{profile}-phone.mobileprovision", bundle, source)
    widget = load_profile(
        CREDENTIALS / f"ios-{profile}-running-live-status.mobileprovision",
        f"{bundle}.RunningLiveStatusWidget",
        {},
    )
    certificates = set(phone.data["DeveloperCertificates"]) & set(widget.data["DeveloperCertificates"])
    if not certificates:
        raise ValueError("휴대폰과 Live Activity 위젯에 공통인 배포 인증서가 없습니다.")
    return p12, password, phone, widget, certificates

@contextlib.contextmanager
def signing_keychain(p12, password, certificates):
    original = re.findall(r'"([^"\n]+)"', command(["security", "list-keychains", "-d", "user"]).decode())
    if not original:
        raise ValueError("기존 키체인 검색 목록을 확인할 수 없습니다.")
    with tempfile.TemporaryDirectory(prefix="runtaeho-signing-") as directory:
        keychain = str(Path(directory) / "signing.keychain-db")
        keychain_password = secrets.token_urlsafe(32)
        created = False
        try:
            command(["security", "create-keychain", "-p", keychain_password, keychain])
            created = True
            command(["security", "set-keychain-settings", "-lut", "3600", keychain])
            command(["security", "unlock-keychain", "-p", keychain_password, keychain])
            command(["security", "import", str(p12), "-k", keychain, "-P", password, "-T", "/usr/bin/codesign"])
            command(["security", "set-key-partition-list", "-S", "apple-tool:,apple:,codesign:", "-s", "-k", keychain_password, keychain])
            identities = command(["security", "find-identity", "-v", "-p", "codesigning", keychain]).decode()
            permitted = {hashlib.sha1(cert).hexdigest().upper() for cert in certificates}
            matches = [(digest, name) for digest, name in re.findall(r'\b([A-F0-9]{40})\s+"([^"\n]+)"', identities) if digest in permitted]
            if not matches:
                raise ValueError("프로파일과 일치하는 유효한 배포 인증서·개인 키가 없습니다.")
            command(["security", "list-keychains", "-d", "user", "-s", keychain, *original])
            yield keychain, matches[0], Path(directory)
        finally:
            try:
                if created:
                    command(["security", "list-keychains", "-d", "user", "-s", *original])
            finally:
                if created:
                    command(["security", "delete-keychain", keychain])


def check_app(app, bundle):
    info = plistlib.loads((app / "Info.plist").read_bytes())
    if info["CFBundleIdentifier"] != bundle:
        raise ValueError(f"아카이브/IPA 앱 ID가 선택한 프로파일과 다릅니다 (필요: {bundle}).")
    if (app / "Watch").exists() or any(app.rglob("*.app")):
        raise ValueError("현재 배포 범위에 없는 Watch/중첩 앱이 포함되어 있습니다.")
    ads = json.loads((ROOT / "app.json").read_text())["ads"]
    if not ads["enabled"] and "NSUserTrackingUsageDescription" in info:
        raise ValueError("광고가 비활성화됐지만 추적 권한 문구가 남아 있습니다. 새 아카이브가 필요합니다.")
    return info


def check_widget(app, bundle, app_info):
    widgets = list(app.rglob("*.appex"))
    expected = app / "PlugIns/RunningLiveStatusWidget.appex"
    if widgets != [expected]:
        raise ValueError("아카이브/IPA에는 RunningLiveStatusWidget 확장 하나가 있어야 합니다.")
    info = plistlib.loads((expected / "Info.plist").read_bytes())
    if info["CFBundleIdentifier"] != bundle:
        raise ValueError(f"Live Activity 위젯 앱 ID가 다릅니다 (필요: {bundle}).")
    for key in ["CFBundleShortVersionString", "CFBundleVersion"]:
        if info[key] != app_info[key]:
            raise ValueError("Live Activity 위젯의 버전·빌드번호가 휴대폰 앱과 다릅니다.")
    return expected


def sign_bundle(bundle, profile, identity, keychain, temporary):
    rights = temporary / f"{profile.bundle}.entitlements"
    rights.write_bytes(plistlib.dumps(profile.rights))
    shutil.copyfile(profile.path, bundle / "embedded.mobileprovision")
    command(["codesign", "--force", "--sign", identity, "--keychain", keychain,
             "--generate-entitlement-der", "--entitlements", str(rights), str(bundle)])


def export_archive(profile, archive, destination):
    p12, password, phone, widget, certificates = credentials(profile)
    apps = list((archive / "Products/Applications").glob("*.app"))
    if len(apps) != 1:
        raise ValueError("아카이브에 휴대폰 앱이 하나 있어야 합니다.")
    app = apps[0]
    info = check_app(app, phone.bundle)
    extension = check_widget(app, widget.bundle, info)
    with signing_keychain(p12, password, certificates) as (keychain, identity, temporary):
        nested = [p for p in app.rglob("*") if p.suffix in [".framework", ".dylib"]]
        for item in sorted(nested, key=lambda p: len(p.parts), reverse=True):
            command(["codesign", "--force", "--sign", identity[0], "--keychain", keychain, str(item)])
        sign_bundle(extension, widget, identity[0], keychain, temporary)
        sign_bundle(app, phone, identity[0], keychain, temporary)
        command(["codesign", "--verify", "--deep", "--strict", str(app)])
        archive_info = plistlib.loads((archive / "Info.plist").read_bytes())
        archive_info["ApplicationProperties"].update(SigningIdentity=identity[1], Team=phone.data["TeamIdentifier"][0])
        (archive / "Info.plist").write_bytes(plistlib.dumps(archive_info))
        options = plistlib.loads((ROOT / "scripts/ExportOptions.plist").read_bytes())
        options.update(signingStyle="manual", signingCertificate=identity[0],
                       provisioningProfiles={p.bundle: p.data["UUID"] for p in (phone, widget)})
        options_file = temporary / "ExportOptions.plist"
        options_file.write_bytes(plistlib.dumps(options))
        profiles_dir = Path.home() / "Library/Developer/Xcode/UserData/Provisioning Profiles"
        profiles_dir.mkdir(parents=True, exist_ok=True)
        with contextlib.ExitStack() as installed_profiles:
            for provisioning in (phone, widget):
                installed = profiles_dir / (provisioning.data["UUID"] + ".mobileprovision")
                if not installed.exists():
                    installed_profiles.callback(installed.unlink, missing_ok=True)
                    shutil.copyfile(provisioning.path, installed)
                    installed.chmod(0o600)
            subprocess.run(["xcodebuild", "-exportArchive", "-archivePath", str(archive), "-exportPath", str(destination), "-exportOptionsPlist", str(options_file)], check=True)
        ipas = list(destination.glob("*.ipa"))
        if len(ipas) != 1:
            raise ValueError("내보낸 IPA가 하나 있어야 합니다.")
        unpacked = temporary / "verified"
        command(["ditto", "-x", "-k", str(ipas[0]), str(unpacked)])
        exported = next((unpacked / "Payload").glob("*.app"))
        exported_info = check_app(exported, phone.bundle)
        check_widget(exported, widget.bundle, exported_info)
        for key in ["CFBundleShortVersionString", "CFBundleVersion"]:
            if exported_info[key] != info[key]:
                raise ValueError("IPA 내보내기 중 버전·빌드번호가 바뀌었습니다.")
        command(["codesign", "--verify", "--deep", "--strict", str(exported)])
    print(f"iOS {profile} 서명·IPA 검증 완료: {ipas[0]}")

if __name__ == "__main__":
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(143))
    try:
        action, profile = sys.argv[1:3]
        if action == "preflight" and len(sys.argv) == 3:
            p12, password, _, _, certificates = credentials(profile)
            with signing_keychain(p12, password, certificates):
                pass
            print(f"iOS {profile} 서명 사전 확인 완료")
        elif action == "export" and len(sys.argv) == 5:
            export_archive(profile, Path(sys.argv[3]).resolve(), Path(sys.argv[4]).resolve())
        else:
            raise ValueError("사용법: sign-ios.py preflight <profile> | export <profile> <archive> <destination>")
    except (ValueError, OSError, KeyError, StopIteration, subprocess.SubprocessError) as error:
        message = str(error) if isinstance(error, ValueError) else "서명·내보내기 입력 또는 외부 명령을 확인하세요."
        print("iOS 서명 오류: " + message, file=sys.stderr)
        sys.exit(1)
