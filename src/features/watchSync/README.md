# Watch recording and phone relay

This module owns authenticated replay of completed Apple Watch and Wear OS runs.
The watches record without the phone and snapshot the linked phone user at start.
They store no login tokens and do not call the backend. Paired transport delivers
immutable completed records to a durable native phone inbox before JavaScript
receives an event. Phone receipt is not server completion.

## Contract and owners

`types.ts` defines the shared request and native bridge. The phone uses the
existing authenticated `apiClient` to POST `/api/v1/running/completed-records`:

```ts
{
  schemaVersion: 1,
  sessionId: string, // canonical lowercase UUID, unchanged across retries
  ownerUserId: number, // positive integer, fixed at run start
  source: 'APPLE_WATCH' | 'WEAR_OS',
  startTimestamp: number, endTimestamp: number, // integer epoch seconds
  distance: number, // integer meters; measured zero is valid
  durationSec: number, // integer active seconds, excluding pauses
  cadence: number, heartRate: number, // integer 0..255; 0 means unavailable
  calorie: number, // nonnegative integer kcal; 0 means unavailable
  gpsPoints: [{
    latitude: number, longitude: number, timestampMs: number,
    speed: number, altitude: number, accuracy: number | null
  }]
}
```

Route may be empty; maximum 100000 points. Speed is meters/second and altitude and
accuracy are meters. Backend validation requires finite valid coordinates and
metrics, nondecreasing route timestamps inside `startTimestamp * 1000` through
`endTimestamp * 1000 + 999`, and active duration no longer than the wall interval.
The response is `{ sessionId, runningRecordId, status: 'CREATED' | 'DUPLICATE' }`,
HTTP 200 for either status. Invalid input is 400, wrong owner 403, missing/invalid
authentication 401. The backend locks the user's configuration and accepts the
first `(user, source, sessionId)` once; duplicates preserve the original record
and do not repeat running completion rewards.

`NativeModules.RNWatchSyncBridge` exposes:

```ts
setOwnerUserId(userId: string | null): Promise<void>
getPendingRecords(): Promise<CompletedRunningRequest[]>
acknowledgeRecord(sessionId: string, source: string,
  ownerUserId: string, runningRecordId: string): Promise<void>
```

`watchSyncPendingRecords` is a notification event with no required payload.
`setOwnerUserId` links future runs; it must not rewrite an existing run's owner.
The relay reuses `OfflineStorageService.serializeReplay`, `getSessionSnapshot`
and `isSessionCurrent`. It uploads only the current owner, checks the session
again after awaited work, validates the returned UUID/status/positive server ID,
and only then invokes native acknowledgement. Native code persists/retries the
exact source/session/owner/server-ID acknowledgement before clearing incoming
data. The watch removes its finalized record only after a matching server ack.
Response loss and lost acknowledgement therefore retry the original UUID safely.
A 400 retains the rejected record and allows later records to proceed. For the
four running validation codes (`RUNNING_FUTURE_END_TIME`,
`RUNNING_EXCESSIVE_AVERAGE_SPEED`, `RUNNING_INVALID_METRICS`, `RUNNING_INVALID_GPS`),
`watchRejectionStorage.ts` stores only source/session/code under the current
owner's AsyncStorage key. Later replay skips that immutable identity, including
after a JS restart, without acknowledging or removing the native workout. Replay
removes only the current owner's index entries that are absent from the native
pending inbox. Index read/write errors propagate. Unknown 400 responses remain
retryable on later triggers; other errors stop that replay attempt while
preserving the inbox.

Implementation evidence, relative to `runtaeho_app/`:

- `src/features/watchSync/watchSyncService.ts`, `background.ts`, `useWatchSync.ts`:
  replay, session boundaries and lifecycle integration.
- `ios/WatchSync/RNWatchSyncBridge.swift`: native iOS inbox, atomic files and
  WatchConnectivity acknowledgement retry; activated from `ios/app/AppDelegate.swift`.
- `ios/RunTaehoWatch/RunRecorder.swift`, `RunCheckpoint.swift`,
  `WatchAppDelegate.swift`: HealthKit/GPS recording, recovery and background tasks.
- `android/app/src/main/java/com/hongtaeho/app/watch/PhoneWatchDataService.kt`,
  `RNWatchSyncBridgeModule.kt`, `WatchSyncTaskService.kt`: native Android receipt,
  bridge and Headless JS wake. `android/watchsync/.../WatchStore.kt` and
  `WatchTransport.kt` own atomic storage and Data Layer transport; full package
  directory is `src/main/java/com/runtaeho/watchsync/`.
- `android/wear/src/main/java/com/runtaeho/wear/RunService.kt` and
  `WatchDataService.kt`: Wear recording and transport lifecycle.
- Backend sibling `../running/src/main/kotlin/com/example/running/domain/running/`:
  `controller/CompletedRunningController.kt`, `controller/dto/CompletedRunningRequest.kt`
  and `service/CompletedRunningService.kt` own HTTP, validation and idempotent completion.

## Execution and recovery limits

`useWatchSync` starts after auth initialization, updates linkage, and retries on
native events, foreground entry and a 60-second timer while JS executes.
`index.js` registers `WatchSyncUpload`; `background.ts` waits for existing store
hydration, initializes existing tokens, and checks session generation. Android
native receipt requests Headless JS execution when the OS permits it. iOS activates
WatchConnectivity before React starts and preserves receipt even when JS cannot
run. Its watch background task gives acknowledgement processing a bounded window.

These hooks do not guarantee immediate upload. Bluetooth pairing, OS scheduling,
background restrictions, phone force-stop/force-quit, unavailable JS, and locked
credentials may defer it until eligible execution. Existing token storage
accessibility is unchanged (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`); no watch tokens,
new token refresh implementation, or credential accessibility relaxation is used.

Apple checkpoints recover paused at the last durable snapshot, not as continuous
recording across reboot. Missing distance differs from measured zero: Apple keeps
it privately as `.unmeasured`; invalid wall-clock/duration/GPS timelines remain
`.invalidtimeline`. Both release the active slot, show an explanatory message and
stay outside transfer enumeration. Original times and metrics are not fabricated
or rewritten. Wear retains equivalent private unmeasured/clock-error records;
see `android/wear/README.md`. Our HealthKit watch source/metadata is excluded by
`src/features/healthImport/bridge/iOS/RNHealthImportBridge.swift` to prevent import
of the same run through the external-workout path.

## Watch display preferences

`ios/RunTaehoWatch/WatchDisplaySettings.swift` owns local KPH/MPH display
preferences and four independent metric slots. Each slot keeps 1–3 distinct
favorites, cycles in enum order, and preserves its active metric when possible.
Changing units or slots does not change recorded meters, active seconds or
uploaded aggregates. Current pace/speed use the latest GPS speed, heart rate uses
the latest HealthKit sample, and cadence uses CoreMotion steps/second converted
to steps/minute. Live samples expire after 30 seconds; caches clear on a new run,
pause/resume and recovery. Paused/unavailable/nonfinite live values display `--`;
measured zero speed/cadence remains valid, while zero speed has no current pace.
The settings preview is illustrative and does not write running data.

## Verification

From `runtaeho_app/`:

```sh
npm run test:unit -- --runTestsByPath src/features/watchSync/__tests__/watchSyncService.test.ts src/features/watchSync/__tests__/background.test.ts src/features/running/__tests__/useOfflineSync.test.tsx src/features/running/__tests__/OfflineStorageService.ownership.test.ts src/features/running/__tests__/runningService.test.ts
npx eslint src/features/watchSync src/providers/AuthProvider.tsx index.js
swiftc -module-cache-path /tmp/watch-checkpoint-modules ios/RunTaehoWatch/RunCheckpoint.swift ios/RunTaehoWatchTests/RunCheckpointTests.swift -o /tmp/watch-checkpoint-tests
/tmp/watch-checkpoint-tests
swiftc -module-cache-path /tmp/watch-display-modules ios/RunTaehoWatch/WatchDisplaySettings.swift ios/RunTaehoWatch/RunCheckpoint.swift ios/RunTaehoWatchTests/WatchDisplaySettingsTests.swift -o /tmp/watch-display-tests
/tmp/watch-display-tests
xcodebuild -project ios/app.xcodeproj -scheme RunTaehoWatch -sdk watchsimulator -configuration Debug -derivedDataPath /tmp/watch-derived CODE_SIGNING_ALLOWED=NO build
```

Use direct Xcode builds for iOS, including the companion workspace when the
required iOS platform is installed. During this implementation the dedicated
watch simulator build and scoped phone-bridge Swift/Objective-C typechecks against
the installed iPhone SDK passed. A full companion iPhone build was not verified:
the workspace attempt reported unavailable iOS 26.5 destinations, and an SDK-only
fallback reported no destinations for scheme `app`. Neither scoped check proves
the entire iPhone app compiles. Never use `expo prebuild --clean` or EAS Build:
the phone has custom native code and Unity integration. Host tests and compilation
do not establish physical runtime success. Validate paired-device recording,
permissions, screen-off long runs, sensor/GPS loss, restart recovery, account
switches, reconnect without watch Wi-Fi, phone background/lock and duplicated or
lost transfers/acks. Confirm one server record and one completion reward per UUID.
Long-run battery/storage behavior, signing/distribution and actual background
execution require device validation. Settings tests cover persistence, malformed
preferences, independent cycling, conversion, live-value freshness and unchanged
SI upload payloads. Simulator rendering does not verify physical sensor cadence,
GPS/heart-rate freshness, wrist interaction or haptic feedback.
