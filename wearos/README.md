# Wear OS standalone Android project

Open this `wearos/` directory directly in Android Studio. It is an independent
Gradle root containing only `:app`; building it does not configure Expo, React
Native, the phone Gradle project or Unity, and does not require Node/npm or
`node_modules`. It remains part of the existing mobile Git repository.
The public `../scripts/app-profiles.json` is the single profile owner shared with
the phone; include that file alongside `wearos/` and `shared/` in a standalone
checkout. It is parsed directly by Gradle without running the Node profile script.

Requirements: Java 17, Android SDK 36, and the matching signing keystore described
below. Set `ANDROID_HOME`/`ANDROID_SDK_ROOT` or an ignored `local.properties` SDK path.
Versions are preserved from the resolved original project: Gradle 8.14.3, Android
Gradle Plugin 8.13.2, Kotlin Gradle plugin 2.1.20; compile/target SDK 36, min SDK 30.

The app sources/tests live in `app/`. Both this app and the Android phone consume
one shared source owner at `../shared/watchsync-android/src/main/java`; it contains
the unchanged record validation, atomic private store and Data Layer transport.
There is no duplicate transport or extra library module.

Native Android Views + Health Services ExerciseClient, Wear OS 3 / API 30 minimum.
The standalone watch requires initial owner linkage from the logged-in paired
Android phone. Each run snapshots that owner; the watch stores no access token.

`RunService` owns the health/location foreground service and authoritative
Health Services state, active duration, metrics and GPS callbacks. Fine location
and heart-rate permissions are optional; denied location uses measured sensor
distance and an empty route. Activity recognition and running/distance capability
are required. Unknown metrics display `--`. A workout with no distance sample is
kept in private `unmeasured-*` storage and cannot become a fabricated zero-distance
server record. A measured zero-distance workout is valid. Timeline anomalies
(end before start, active duration beyond the wall-time interval, or route samples
outside/out of order within that interval) are retained privately as `clock-error-*`
with `CLOCK_ANOMALY` reason and a visible clock-error message. They never enter the
outbox; measured timestamps and metrics are not rewritten.

Atomic private snapshots use a same-directory temporary file, file descriptor
fsync, and Android POSIX `Os.rename` (API 21+); there is no non-atomic
fallback. Prior committed files survive an interrupted/failed replacement. This
covers process loss; sudden power loss and device filesystem behavior need real
device validation. GPS snapshots are capped at 100000 points. Beyond that cap,
distance/time recording continues and the route stops growing.

Finalized records remain in the watch outbox until an exact source/session/owner
server acknowledgement arrives. JSON is transferred as a durable DataItem Asset,
so routes are not constrained by DataItem's inline 100 KB payload limit. Phone
inbox and pending server acknowledgements survive process restarts and owner
switches. The native phone receiver schedules a persisted, network-constrained
JobScheduler job. Its `WatchSyncTaskService` JobService starts the existing ReactHost
and `WatchSyncUpload` Headless JS when Android permits the job to run. Existing JS
auth/session checks own uploads. The [phone relay contract](../src/features/watchSync/README.md#execution-and-recovery-limits)
owns attempt lifecycle, retry and recovery details. OS background restrictions, locked credential storage, force-stop,
and absent pairing can delay upload until eligible execution/reconnection.
No direct watch Wi-Fi or watch HTTP/JWT client is used.

## Signing identity

Profile IDs and app names come directly from `../scripts/app-profiles.json`:

| Flavor | Phone/Wear identity | Signing configuration |
| --- | --- | --- |
| `local` | Shared local/development applicationId | Existing development key |
| `development` | Shared local/development applicationId | Same existing development key |
| `production` | Shared production applicationId | Existing upload-key properties, or existing local debug fallback |

Each flavor supports `Debug` and `Release`. Local and development builds replace
each other because they deliberately share an ID and signing certificate;
production has a separate ID. VersionCode 68 and versionName 1.8.0 are unchanged.
Data Layer requires the exact same ID and signing certificate as the corresponding
phone environment. This project never evaluates or reads the phone Gradle build.

Both `localDebug` and `developmentRelease` consume the phone's existing ignored
`../../credentials/android-development.properties` in the workspace. Its `storeFile` is resolved
relative to that properties file, matching the phone. No development key is copied,
generated or replaced. Supply the existing properties file and matching key through
the established credential setup before building; missing keys fail explicitly.

Production keeps the existing `RUNTAEHO_UPLOAD_STORE_FILE`,
`RUNTAEHO_UPLOAD_STORE_PASSWORD`, `RUNTAEHO_UPLOAD_KEY_ALIAS`, and
`RUNTAEHO_UPLOAD_KEY_PASSWORD` Gradle properties. Supply them through user Gradle
properties or `ORG_GRADLE_PROJECT_*` environment variables, never project files.
Absolute store paths are recommended for a separate checkout; relative upload-key
paths retain the original `android/app` base. As in the phone, when upload-key
properties are absent, production uses the existing `../android/app/debug.keystore`
for local validation. `RUNTAEHO_DEBUG_STORE_FILE` can reference that exact matching
key by absolute path. Missing keys fail explicitly without generating an identity.
Verify actual Play App Signing certificates on both installed apps for distribution;
an upload certificate alone does not establish the installed Play signing identity.
The watch project contains no Unity framework or phone build dependency.

## Verification

From this `wearos/` directory:

```
./gradlew projects
./gradlew :app:assembleLocalDebug :app:lintLocalDebug
./gradlew :app:assembleDevelopmentRelease :app:lintDevelopmentRelease
./gradlew :app:assembleProductionDebug :app:lintProductionDebug
# Compile production release without pretending to validate distribution signing:
./gradlew :app:compileProductionReleaseKotlin
```

`./run-host-regressions.sh ANDROID_JAR KOTLIN_STDLIB_JAR ORG_JSON_JAR` runs real
production repository/rules and active-time assertions using the explicit host
filesystem adapter (`Files.move(ATOMIC_MOVE, REPLACE_EXISTING)`) on the host after Kotlin
compilation (`localDebug` by default, matching `:app:compileLocalDebugKotlin`).
Set `WATCH_TEST_VARIANT=developmentRelease` or another compiled variant when needed.
Supply existing local runtime jars; org.json is an external host test
runtime only, with no test or production dependency declaration. It checks restart,
interrupted/failed writes, owner switches, duplicates, stale/unknown acknowledgement,
no-measurement recovery, measured zero, and pause timing. It does not emulate Health
Services, Data Layer, foreground-service permissions or paired devices.

Before release, test an actual paired watch and phone: initial linkage; denied and
revoked permissions; start/pause/resume/end; screen-off long run; GPS/sensor loss;
process kill/relaunch; reconnect without watch Wi-Fi; phone background and lock;
account switch; duplicated/lost transfer and acknowledgement. Confirm a single
server record/reward for each immutable session UUID. Host/compile/lint success is
not evidence of physical recording or background delivery success.

## Display settings and metrics

The native settings screens implement the approved Figma settings/metric-picker
reference. KPH is the default display system (km, min/km, km/h); MPH displays
mi, min/mi, mph. Sensor capture and server upload keep meters, seconds and m/s.
Four independently tappable slots persist one to three distinct favorite metrics
and the currently shown metric in private `display-settings` storage. Their order
is canonical, malformed/legacy settings recover defaults, and the last favorite
cannot be removed. Only the native view text refreshes each second; the navigation
and scroll view stay in place. Settings previews use explicitly local sample data.

Current pace uses capability-gated Health Services SPEED samples, not average
pace. Average pace uses active elapsed time and measured distance. Local speed,
heart-rate and cadence caches are separate from aggregate upload sums/counts,
are cleared on active transitions/recovery, and reject samples preceding that
transition. Live metrics show `--` while paused, unavailable or more than thirty
seconds old; Health Services can batch samples with the screen off. Zero measured
speed/cadence/distance/calories remains distinct from missing values. No dependency,
permission, server schema or completed-record field was added for these screens.

The standalone host harness additionally checks slot independence, deterministic
cycles and selection bounds, persisted settings recovery, unit math without
canonical mutations, live-versus-average pace, rounding, missing/paused/stale/zero
values and sensor-cache boundaries. Android Views render on actual watch sizes
with 48dp targets and fallback scrolling. No Android emulator or paired hardware
was available for a screenshot, haptic or physical sensor test; visual fit and
screen-off sensor freshness remain device validation gates.
