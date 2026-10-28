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
- `watchos/RunTaehoWatch/RunRecorder.swift`, `RunCheckpoint.swift`,
  `WatchAppDelegate.swift`: HealthKit/GPS recording, recovery and background tasks.
- `android/app/src/main/java/com/hongtaeho/app/watch/PhoneWatchDataService.kt`,
  `RNWatchSyncBridgeModule.kt`, `WatchSyncTaskService.kt`: native Android receipt,
  bridge and persisted network-constrained JobService wake. `shared/watchsync-android/.../WatchStore.kt` and
  `WatchTransport.kt` own atomic storage and Data Layer transport; full package
  directory is `src/main/java/com/runtaeho/watchsync/`.
- `wearos/app/src/main/java/com/runtaeho/wear/RunService.kt` and
  `WatchDataService.kt`: Wear recording and transport lifecycle.
- Backend sibling `../running/src/main/kotlin/com/example/running/domain/running/`:
  `controller/CompletedRunningController.kt`, `controller/dto/CompletedRunningRequest.kt`
  and `service/CompletedRunningService.kt` own HTTP, validation and idempotent completion.

## Execution and recovery limits

`useWatchSync` starts after auth initialization, updates linkage, and retries on
native events, foreground entry and a 60-second timer while JS executes.
`index.js` registers `WatchSyncUpload`; `background.ts` waits for existing store
hydration, initializes existing tokens, and checks session generation. Android
native receipt schedules one persisted `JobScheduler` job with a network constraint,
30-second exponential retry backoff, and a 60-second attempt deadline including
React startup and hydration. Its real `JobService` starts the existing `ReactHost`
and the same Headless JS relay without starting an ordinary background service.
Pending jobs survive process loss and reboot; Android still controls execution time.
iOS activates
WatchConnectivity before React starts and preserves receipt even when JS cannot
run. Its watch background task gives acknowledgement processing a bounded window.

Android-only optional bridge methods `isWatchSyncJobActive(jobRunId)` and
`finishWatchSyncJob(jobRunId, outcome)` bind completion to an anonymous run ID.
`watchSyncJobStopped` aborts only that attempt; POST, ACK and rejection-index
continuations recheck both native activity and the existing session. A stop cannot
roll back an already accepted server request, so the original UUID still owns retry.
Foreground and iOS calls do not require these optional job methods.

The private scheduling ledger suppresses only a finished work revision. New inbox,
owner/login linkage or explicit reconnect events rearm it; native initialization,
ACK and reads do not reset backoff. New input arriving during a snapshot retains
the next wake. If saving a wake revision fails, a scheduler-owned anonymous repair
nonce preserves that intent and is consumed once; neither tokens nor workouts are
stored in job extras. If storage or scheduling itself is unavailable, inbox data
remains intact and failures are logged without payloads.

Network errors, 408/429/5xx, invalid server ACKs and storage failures remain
retryable. Final 401/403, logout, revoked tokens and stale sessions stop the current
revision until linkage changes. A logged-in session without readable secure tokens
is retried with OS backoff, without a second token reader or refresh implementation.
Empty/foreign/rejected-only queues finish without spinning. Unknown 400s remain
unindexed and retryable on a later external trigger; only the four known validation
codes enter the rejection index.

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
see `wearos/README.md`. Our HealthKit watch source/metadata is excluded by
`src/features/healthImport/bridge/iOS/RNHealthImportBridge.swift` to prevent import
of the same run through the external-workout path.

## Watch display preferences

`watchos/RunTaehoWatch/WatchDisplaySettings.swift` owns local KPH/MPH display
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

The watch applications have separate build roots: `watchos/RunTaehoWatch.xcodeproj`
and `wearos/`. Neither standalone build configures Expo, React Native, CocoaPods
or Unity. The iPhone project references the watch project and embeds its product;
its release version command keeps the companion and watch versions aligned.
Android phone and Wear OS compile the same source owner in
`shared/watchsync-android/src/main/java/`. Their application ID and signing
certificate must match for Data Layer communication; see `wearos/README.md` for
the existing key configuration and independent Gradle commands.

Both watch projects follow the phone's `scripts/app-profiles.json` contract.
Local and development share `com.runtaeho.runtaeho.dev` on the phone/Wear and
`com.runtaeho.runtaeho.dev.watchkitapp` on Apple Watch; production retains the
original IDs. The watchOS schemes `WatchLocal`, `WatchDevelopment` and
`WatchProduction` select Debug, Development and Release respectively. Wear uses
the corresponding Gradle flavors, and local/development reuse the phone's existing
development signing configuration. App-private outboxes, owner linkage and display
preferences are separate between development and production; local and development
intentionally share storage. HealthKit is shared across apps, so own watch source
IDs and session metadata remain excluded from external workout import.
Watches still have no backend URL or token: the receiving phone owns the server
environment. Distinct app IDs do not separate server data when phone profiles use
the same API server.

From `runtaeho_app/`:

```sh
npm run test:unit -- --runTestsByPath src/features/watchSync/__tests__/watchSyncService.test.ts src/features/watchSync/__tests__/background.test.ts src/features/running/__tests__/useOfflineSync.test.tsx src/features/running/__tests__/OfflineStorageService.ownership.test.ts src/features/running/__tests__/runningService.test.ts
npx eslint src/features/watchSync src/providers/AuthProvider.tsx index.js
swiftc -module-cache-path /tmp/watch-checkpoint-modules watchos/RunTaehoWatch/RunCheckpoint.swift watchos/Tests/RunCheckpointTests.swift -o /tmp/watch-checkpoint-tests
/tmp/watch-checkpoint-tests
swiftc -module-cache-path /tmp/watch-display-modules watchos/RunTaehoWatch/WatchDisplaySettings.swift watchos/RunTaehoWatch/RunCheckpoint.swift watchos/Tests/WatchDisplaySettingsTests.swift -o /tmp/watch-display-tests
/tmp/watch-display-tests
xcodebuild -project watchos/RunTaehoWatch.xcodeproj -scheme RunTaehoWatch -sdk watchsimulator -configuration Debug -derivedDataPath /tmp/watch-derived CODE_SIGNING_ALLOWED=NO build
```

Use direct Xcode builds for iOS, including the companion workspace when the
required iOS platform is installed. The standalone watch build and host tests
validate the watch project; they do not prove that the full companion iPhone app
compiles or archives. Validate the external watch dependency and embedded product
through `ios/app.xcworkspace` for a paired release. Never use
`expo prebuild --clean` or EAS Build:
the phone has custom native code and Unity integration. Host tests and compilation
do not establish physical runtime success. Validate paired-device recording,
permissions, screen-off long runs, sensor/GPS loss, restart recovery, account
switches, reconnect without watch Wi-Fi, phone background/lock and duplicated or
lost transfers/acks. Confirm one server record and one completion reward per UUID.
Long-run battery/storage behavior, signing/distribution and actual background
execution require device validation. Android job regression tests cover work
revisions, concurrent incoming records, process restart, metadata write failure and
repair-nonce idempotence through `android/app/run-watch-upload-regressions.sh`
using the same three external host jars as the Wear harness after compiling
`:app:compileLocalDebugKotlin`. Real reboot/network recovery, OS stops and React
cold-start timing remain paired-device validation gates. Test cold headless upload
with a bundled `developmentRelease` or production phone build; `localDebug`
requires Metro and cannot establish standalone cold-start delivery. Settings tests cover persistence, malformed
preferences, independent cycling, conversion, live-value freshness and unchanged
SI upload payloads. Simulator rendering does not verify physical sensor cadence,
GPS/heart-rate freshness, wrist interaction or haptic feedback.
