# Wear OS recording

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
switches. The native phone receiver wakes `WatchSyncUpload` Headless JS when
Android permits background service execution. Existing JS auth/session checks
own uploads. OS background restrictions, locked credential storage, force-stop,
and absent pairing can delay upload until eligible execution/reconnection.
No direct watch Wi-Fi or watch HTTP/JWT client is used.

The wear applicationId matches the phone. Signing configurations reuse the phone
module; install both with matching debug certificates, and verify Play App Signing
identity for distribution. The watch module contains no Unity framework.

## Verification

From `android/`:

```
./gradlew :wear:assembleDebug :app:compileDebugKotlin :wear:lintDebug :app:lintDebug
```

`wear/run-host-regressions.sh ANDROID_JAR KOTLIN_STDLIB_JAR ORG_JSON_JAR` runs real
production repository/rules and active-time assertions using the explicit host
filesystem adapter (`Files.move(ATOMIC_MOVE, REPLACE_EXISTING)`) on the host after Kotlin
compilation. Supply existing local runtime jars; org.json is an external host test
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
