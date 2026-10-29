# RunTaehoWatch

Independent native watchOS development project in the mobile repository.
`RunTaehoWatch/` owns the application sources, Info.plist and entitlements;
`Tests/` contains the existing Foundation host regressions.
The watch project builds directly with Xcode and Apple SDKs, without Pods,
node_modules, Expo, Unity or a Node runtime.

## Build and open

From `runtaeho_app/watchos/`:

```sh
open RunTaehoWatch.xcodeproj
xcodebuild -project RunTaehoWatch.xcodeproj -scheme RunTaehoWatch -configuration Debug -sdk watchsimulator -derivedDataPath /tmp/runtaeho-watch-derived CODE_SIGNING_ALLOWED=NO build
```

Profile-specific shared schemes follow `../scripts/app-profiles.json`:

| Profile | Watch scheme | Configuration | Watch bundle ID | Companion ID / display name |
| --- | --- | --- | --- | --- |
| local | `WatchLocal` | Debug | `com.runtaeho.runtaeho.dev.watchkitapp` | `com.runtaeho.runtaeho.dev` / `RunTaeho (local)` |
| development | `WatchDevelopment` | Development | `com.runtaeho.runtaeho.dev.watchkitapp` | `com.runtaeho.runtaeho.dev` / `RunTaeho (dev)` |
| production | `WatchProduction` | Release | `com.runtaeho.runtaeho.watchkitapp` | `com.runtaeho.runtaeho` / `RunTaeho` |

`WatchLocal` uses DEBUG compilation and unoptimized Swift for debugging.
`WatchDevelopment` uses Release semantics for development testers; production
also uses Release semantics. The legacy `RunTaehoWatch` scheme remains available
(Debug for Run/Test, Release for Archive). Scheme prefixes avoid collision with
phone schemes in the companion workspace.

```sh
xcodebuild -project RunTaehoWatch.xcodeproj -scheme WatchLocal -sdk watchsimulator -derivedDataPath /tmp/watch-local CODE_SIGNING_ALLOWED=NO build
xcodebuild -project RunTaehoWatch.xcodeproj -scheme WatchDevelopment -sdk watchsimulator -derivedDataPath /tmp/watch-development CODE_SIGNING_ALLOWED=NO build
xcodebuild -project RunTaehoWatch.xcodeproj -scheme WatchProduction -sdk watchsimulator -derivedDataPath /tmp/watch-production CODE_SIGNING_ALLOWED=NO build
python3 Tests/verify-built-profile.py local /tmp/watch-local/Build/Products/Debug-watchsimulator/RunTaehoWatch.app
python3 Tests/verify-built-profile.py development /tmp/watch-development/Build/Products/Development-watchsimulator/RunTaehoWatch.app
python3 Tests/verify-built-profile.py production /tmp/watch-production/Build/Products/Release-watchsimulator/RunTaehoWatch.app
```

The optional Python checks inspect built Info.plist metadata against the shared
profile source; no profile script is required to build with Xcode. Standard
UserDefaults and app-private recording files are isolated by bundle ID, so
production and development have separate preferences, ownership and outboxes.
Local and development intentionally share the same development identity/storage.
The watch uses its matching companion phone for server access; it has no separate
backend URL or credentials. Phone configuration names Debug/Development/Release
select the identically named remote watch configuration when embedded.

A signed device build requires the existing team/provisioning configuration and
a compatible watch. Minimum watchOS is 9.0; team remains `3F893P33SC`.
HealthKit entitlements and health, location and motion usage descriptions remain
with the watch app.

## Host regressions

From the same directory, using the Swift compiler shipped with Xcode:

```sh
swiftc -module-cache-path /tmp/runtaeho-watch-test-modules RunTaehoWatch/RunCheckpoint.swift Tests/RunCheckpointTests.swift -o /tmp/runtaeho-watch-checkpoint-tests
/tmp/runtaeho-watch-checkpoint-tests
swiftc -module-cache-path /tmp/runtaeho-watch-test-modules RunTaehoWatch/WatchDisplaySettings.swift RunTaehoWatch/RunCheckpoint.swift Tests/WatchDisplaySettingsTests.swift -o /tmp/runtaeho-watch-display-tests
/tmp/runtaeho-watch-display-tests
```

These exercise checkpoint recovery, wire validation, settings persistence,
metric cycling/conversion and live-value display rules. They do not emulate
HealthKit, CoreMotion, paired transfers, haptics or OS background execution.
Paired-device recording and delivery still need hardware validation.

## Companion integration

`../ios/app.xcodeproj` retains this external project reference for navigation.
Watch distribution is deferred: the phone target has no Watch build dependency
or `Embed Watch Content` phase, and the phone IPA excludes the Watch app.
Build this independent project using the schemes above. The phone project keeps
its existing Pods/Unity setup and direct Xcode build requirements; do not run
`expo prebuild --clean` or EAS Build for that phone project.

Phone release tooling in `../scripts/version.js` synchronizes version/build
settings in both project files. Run the existing release/version commands from
the mobile project when preparing a paired release; this tooling is separate from
independent watch development and is not needed for the Xcode build above.
