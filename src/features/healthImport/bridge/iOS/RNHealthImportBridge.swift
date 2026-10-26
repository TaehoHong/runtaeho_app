import CoreLocation
import CoreFoundation
import HealthKit
import React

@objc(RNHealthImportBridge)
class RNHealthImportBridge: NSObject {
    private let healthStore = HKHealthStore()
    private let heartRateUnit = HKUnit.count().unitDivided(by: HKUnit.minute())
    private struct RouteReadResult {
        let points: [[String: Any]]
        let status: String
    }

    private func logHealthImport(_ message: String, _ values: [String: Any] = [:]) {
        #if DEBUG
        NSLog("[HealthImport][iOS] \(message) \(values)")
        #endif
    }

    private func errorInfo(_ error: Error?) -> [String: Any] {
        guard let error = error as NSError? else {
            return [:]
        }
        return [
            "errorDomain": error.domain,
            "errorCode": error.code
        ]
    }

    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc(isAvailable:rejecter:)
    func isAvailable(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(HKHealthStore.isHealthDataAvailable())
    }

    @objc(getPermissionStatus:rejecter:)
    func getPermissionStatus(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard HKHealthStore.isHealthDataAvailable() else {
            resolve("unavailable")
            return
        }

        resolve("notDetermined")
    }

    @objc(requestPermissions:resolver:rejecter:)
    func requestPermissions(
        _ options: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard HKHealthStore.isHealthDataAvailable() else {
            resolve("unavailable")
            return
        }

        var readTypes: Set<HKObjectType> = [HKObjectType.workoutType()]
        if let distanceType = HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning) {
            readTypes.insert(distanceType)
        }
        if let energyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
            readTypes.insert(energyType)
        }
        if let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) {
            readTypes.insert(heartRateType)
        }
        if #available(iOS 11.0, *), (options["includeRoute"] as? Bool) == true {
            readTypes.insert(HKSeriesType.workoutRoute())
        }

        logHealthImport("requestAuthorization request", [
            "readTypes": readTypes.map { $0.identifier }.sorted(),
            "includeRoute": (options["includeRoute"] as? Bool) == true
        ])
        healthStore.requestAuthorization(toShare: nil, read: readTypes) { _, error in
            if let error = error {
                self.logHealthImport("requestAuthorization response", self.errorInfo(error))
                reject("health_permission_failed", error.localizedDescription, error)
                return
            }
            self.logHealthImport("requestAuthorization response", ["success": true])
            resolve("notDetermined")
        }
    }

    @objc(readRunningWorkouts:resolver:rejecter:)
    func readRunningWorkouts(
        _ params: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard HKHealthStore.isHealthDataAvailable() else {
            resolve([])
            return
        }

        let startTimestamp = (params["startTimestamp"] as? NSNumber)?.doubleValue ?? 0
        let endTimestamp = (params["endTimestamp"] as? NSNumber)?.doubleValue ?? Date().timeIntervalSince1970
        let limit = (params["limit"] as? NSNumber)?.intValue ?? HKObjectQueryNoLimit

        let startDate = Date(timeIntervalSince1970: max(0, startTimestamp))
        let endDate = Date(timeIntervalSince1970: max(startTimestamp, endTimestamp))
        let datePredicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [])
        let runningPredicate = HKQuery.predicateForWorkouts(with: .running)
        let predicate = NSCompoundPredicate(andPredicateWithSubpredicates: [datePredicate, runningPredicate])
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        logHealthImport("HKSampleQuery workout request", [
            "sampleType": HKObjectType.workoutType().identifier,
            "activityType": "running",
            "limit": limit,
            "sort": "startDate.asc"
        ])
        let query = HKSampleQuery(
            sampleType: HKObjectType.workoutType(),
            predicate: predicate,
            limit: limit,
            sortDescriptors: [sort]
        ) { _, samples, error in
            if let error = error {
                self.logHealthImport("HKSampleQuery workout response", self.errorInfo(error))
                reject("health_read_failed", error.localizedDescription, error)
                return
            }

            // Only our watch source or our explicit metadata marker. Preserve all external workouts.
            let workouts = ((samples as? [HKWorkout]) ?? []).filter {
                self.isExternalWorkout($0)
            }
            self.logHealthImport("HKSampleQuery workout response", [
                "rawSampleCount": samples?.count ?? 0,
                "workoutCount": workouts.count
            ])
            if workouts.isEmpty {
                resolve([])
                return
            }

            let group = DispatchGroup()
            let lock = NSLock()
            var records: [[String: Any]] = []
            var readError: Error?

            for (index, workout) in workouts.enumerated() {
                group.enter()
                self.buildRecord(for: workout, index: index) { result in
                    lock.lock()
                    switch result {
                    case .success(let record): records.append(record)
                    case .failure(let error): if readError == nil { readError = error }
                    }
                    lock.unlock()
                    group.leave()
                }
            }

            group.notify(queue: .main) {
                lock.lock()
                let error = readError
                var completedRecords = records
                lock.unlock()
                if let error = error {
                    reject("health_read_failed", "Health workout metrics could not be read.", error)
                    return
                }
                completedRecords.sort {
                    ($0["startTimestamp"] as? TimeInterval ?? 0) < ($1["startTimestamp"] as? TimeInterval ?? 0)
                }
                resolve(completedRecords)
            }
        }

        healthStore.execute(query)
    }

    @objc(readRunningWorkoutChanges:resolver:rejecter:)
    func readRunningWorkoutChanges(
        _ params: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard HKHealthStore.isHealthDataAvailable() else {
            reject("health_unavailable", "Health data is unavailable.", nil)
            return
        }

        let limit = (params["limit"] as? NSNumber)?.intValue ?? 1000
        guard (1...5000).contains(limit) else {
            reject("health_invalid_limit", "Health change page limit must be between 1 and 5000.", nil)
            return
        }

        var anchor: HKQueryAnchor?
        if let cursorValue = params["cursor"], !(cursorValue is NSNull) {
            do {
                guard let cursor = cursorValue as? String,
                      let data = Data(base64Encoded: cursor),
                      let decoded = try NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: data) else {
                    resolve(self.changePage(workouts: [], deletedRecordIds: [], nextCursor: nil, hasMore: false, resetRequired: true))
                    return
                }
                anchor = decoded
            } catch {
                resolve(self.changePage(workouts: [], deletedRecordIds: [], nextCursor: nil, hasMore: false, resetRequired: true))
                return
            }
        }

        let query = HKAnchoredObjectQuery(
            type: HKObjectType.workoutType(),
            predicate: HKQuery.predicateForWorkouts(with: .running),
            anchor: anchor,
            limit: limit
        ) { _, samples, deletedObjects, nextAnchor, error in
            if let error = error {
                let healthError = error as NSError
                if anchor != nil,
                   healthError.domain == HKErrorDomain,
                   healthError.code == HKError.Code.errorInvalidArgument.rawValue {
                    resolve(self.changePage(workouts: [], deletedRecordIds: [], nextCursor: nil, hasMore: false, resetRequired: true))
                    return
                }
                reject("health_read_failed", "Health workout changes could not be read.", error)
                return
            }
            guard let nextAnchor = nextAnchor else {
                reject("health_read_failed", "Health workout changes did not return an anchor.", nil)
                return
            }
            let nextCursor: String
            do {
                nextCursor = try NSKeyedArchiver.archivedData(withRootObject: nextAnchor, requiringSecureCoding: true).base64EncodedString()
            } catch {
                reject("health_read_failed", "Health workout anchor could not be encoded.", error)
                return
            }

            let workouts = ((samples as? [HKWorkout]) ?? []).filter {
                self.isExternalWorkout($0)
            }
            let deletedRecordIds = (deletedObjects ?? []).map { $0.uuid.uuidString }
            let hasMore = (samples?.count ?? 0) + (deletedObjects?.count ?? 0) >= limit
            let group = DispatchGroup()
            let lock = NSLock()
            var records: [[String: Any]] = []
            var readError: Error?

            for (index, workout) in workouts.enumerated() {
                group.enter()
                self.buildRecord(for: workout, index: index) { result in
                    lock.lock()
                    switch result {
                    case .success(let record):
                        if (record["routeStatus"] as? String) == "readFailed" {
                            if readError == nil {
                                readError = NSError(domain: "HealthImport", code: 2, userInfo: [
                                    NSLocalizedDescriptionKey: "Health workout route could not be read."
                                ])
                            }
                        } else {
                            records.append(record)
                        }
                    case .failure(let error): if readError == nil { readError = error }
                    }
                    lock.unlock()
                    group.leave()
                }
            }

            group.notify(queue: .main) {
                lock.lock()
                let error = readError
                let completedRecords = records
                lock.unlock()
                if let error = error {
                    reject("health_read_failed", "Health workout metrics could not be read.", error)
                    return
                }
                resolve(self.changePage(workouts: completedRecords, deletedRecordIds: deletedRecordIds, nextCursor: nextCursor, hasMore: hasMore, resetRequired: false))
            }
        }
        healthStore.execute(query)
    }

    private func changePage(workouts: [[String: Any]], deletedRecordIds: [String], nextCursor: String?, hasMore: Bool, resetRequired: Bool) -> [String: Any] {
        return [
            "workouts": workouts,
            "deletedRecordIds": deletedRecordIds,
            "nextCursor": nextCursor.map { $0 as Any } ?? NSNull(),
            "hasMore": hasMore,
            "resetRequired": resetRequired
        ]
    }

    private func isExternalWorkout(_ workout: HKWorkout) -> Bool {
        return workout.sourceRevision.source.bundleIdentifier != "com.runtaeho.runtaeho.watchkitapp" &&
            workout.sourceRevision.source.bundleIdentifier != "com.runtaeho.runtaeho.dev.watchkitapp" &&
            workout.metadata?["com.runtaeho.watchSessionId"] == nil
    }

    @objc(openHealthSettings:rejecter:)
    func openHealthSettings(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        reject("health_settings_unavailable", "Health permission settings cannot be opened directly on iOS.", nil)
    }

    private func buildRecord(for workout: HKWorkout, index: Int, completion: @escaping (Result<[String: Any], Error>) -> Void) {
        let group = DispatchGroup()
        var routeResult = RouteReadResult(points: [], status: "notAvailable")
        let lock = NSLock()
        var heartRateResult: Result<Double?, Error> = .success(nil)

        logHealthImport("HKWorkout response item", [
            "index": index,
            "hasDistance": workout.totalDistance != nil,
            "hasEnergy": workout.totalEnergyBurned != nil
        ])

        group.enter()
        readWorkoutRoute(workout, workoutIndex: index) { result in
            lock.lock()
            routeResult = result
            lock.unlock()
            group.leave()
        }

        group.enter()
        readAverageHeartRate(startDate: workout.startDate, endDate: workout.endDate, workoutIndex: index) { result in
            lock.lock()
            heartRateResult = result
            lock.unlock()
            group.leave()
        }

        group.notify(queue: .global(qos: .userInitiated)) {
            lock.lock()
            let completedRoute = routeResult
            let completedHeartRate = heartRateResult
            lock.unlock()
            let averageHeartRate: Double?
            switch completedHeartRate {
            case .success(let value): averageHeartRate = value
            case .failure(let error):
                completion(.failure(error))
                return
            }
            let startTimestamp = workout.startDate.timeIntervalSince1970
            let endTimestamp = workout.endDate.timeIntervalSince1970
            let distance = workout.totalDistance?.doubleValue(for: HKUnit.meter()) ?? 0
            guard startTimestamp.isFinite, endTimestamp.isFinite, workout.duration.isFinite, distance.isFinite else {
                completion(.failure(NSError(domain: "HealthImport", code: 1, userInfo: [
                    NSLocalizedDescriptionKey: "Invalid workout metrics"
                ])))
                return
            }
            // Missing metadata does not establish that a workout was recorded by a device.
            let recordingMethod: String
            if let wasUserEntered = workout.metadata?[HKMetadataKeyWasUserEntered] as? NSNumber,
               CFGetTypeID(wasUserEntered) == CFBooleanGetTypeID() {
                recordingMethod = wasUserEntered.boolValue ? "MANUAL" : "RECORDED"
            } else {
                recordingMethod = "UNKNOWN"
            }
            var record: [String: Any] = [
                "sourceRecordId": "apple-health:\(workout.uuid.uuidString)",
                "sourceBundleId": workout.sourceRevision.source.bundleIdentifier,
                "recordingMethod": recordingMethod,
                "startTimestamp": floor(startTimestamp),
                "endTimestamp": floor(endTimestamp),
                "durationSec": floor(workout.duration),
                "distance": distance,
                "calorie": Int((workout.totalEnergyBurned?.doubleValue(for: HKUnit.kilocalorie()) ?? 0).rounded()),
                "cadence": 0,
                "gpsPoints": completedRoute.points,
                "routeStatus": completedRoute.status
            ]

            if let averageHeartRate = averageHeartRate {
                record["heartRate"] = Int(averageHeartRate.rounded())
            }

            completion(.success(record))
        }
    }

    private func readAverageHeartRate(startDate: Date, endDate: Date, workoutIndex: Int, completion: @escaping (Result<Double?, Error>) -> Void) {
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
            completion(.success(nil))
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [.strictStartDate])
        logHealthImport("HKStatisticsQuery heartRate request", [
            "workoutIndex": workoutIndex,
            "quantityType": heartRateType.identifier,
            "options": "discreteAverage"
        ])
        let query = HKStatisticsQuery(quantityType: heartRateType, quantitySamplePredicate: predicate, options: .discreteAverage) {
            _, statistics, error in
            if let error = error {
                self.logHealthImport("HKStatisticsQuery heartRate failed", self.errorInfo(error))
                completion(.failure(error))
                return
            }
            let value = statistics?.averageQuantity()?.doubleValue(for: self.heartRateUnit)
            self.logHealthImport("HKStatisticsQuery heartRate response", [
                "workoutIndex": workoutIndex,
                "hasAverage": value != nil,
            ])
            completion(.success(value))
        }
        healthStore.execute(query)
    }

    private func readWorkoutRoute(_ workout: HKWorkout, workoutIndex: Int, completion: @escaping (RouteReadResult) -> Void) {
        guard #available(iOS 11.0, *) else {
            logHealthImport("HKSampleQuery route skipped", [
                "workoutIndex": workoutIndex,
                "reason": "iOS<11"
            ])
            completion(RouteReadResult(points: [], status: "notAvailable"))
            return
        }

        let routeType = HKSeriesType.workoutRoute()
        let predicate = HKQuery.predicateForObjects(from: workout)
        logHealthImport("HKSampleQuery route request", [
            "workoutIndex": workoutIndex,
            "sampleType": routeType.identifier
        ])
        let routeQuery = HKSampleQuery(sampleType: routeType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) {
            [weak self] _, samples, error in
            guard let self = self else {
                completion(RouteReadResult(points: [], status: "readFailed"))
                return
            }

            if error != nil {
                self.logHealthImport("HKSampleQuery route response", [
                    "workoutIndex": workoutIndex
                ].merging(self.errorInfo(error)) { _, new in new })
                completion(RouteReadResult(points: [], status: "readFailed"))
                return
            }

            let routes = (samples as? [HKWorkoutRoute]) ?? []
            self.logHealthImport("HKSampleQuery route response", [
                "workoutIndex": workoutIndex,
                "rawSampleCount": samples?.count ?? 0,
                "routeCount": routes.count
            ])
            if routes.isEmpty {
                completion(RouteReadResult(points: [], status: "notAvailable"))
                return
            }

            let group = DispatchGroup()
            let lock = NSLock()
            var points: [[String: Any]] = []
            var didFail = false

            for (routeIndex, route) in routes.enumerated() {
                group.enter()
                self.logHealthImport("HKWorkoutRouteQuery request", [
                    "workoutIndex": workoutIndex,
                    "routeIndex": routeIndex
                ])
                var finished = false
                let locationQuery = HKWorkoutRouteQuery(route: route) { _, locations, done, error in
                    lock.lock()
                    if finished {
                        lock.unlock()
                        return
                    }
                    let terminal = done || error != nil
                    if terminal { finished = true }
                    if error != nil { didFail = true }
                    if error == nil, let locations = locations {
                        points.append(contentsOf: locations.map { self.mapLocation($0) })
                    }
                    lock.unlock()
                    if error != nil {
                        self.logHealthImport("HKWorkoutRouteQuery failed", self.errorInfo(error))
                    }
                    if terminal { group.leave() }
                }
                self.healthStore.execute(locationQuery)
            }

            group.notify(queue: .global(qos: .userInitiated)) {
                lock.lock()
                var completedPoints = points
                let failed = didFail
                lock.unlock()
                completedPoints.sort {
                    ($0["timestampMs"] as? Int ?? 0) < ($1["timestampMs"] as? Int ?? 0)
                }
                if failed {
                    self.logHealthImport("HKWorkoutRouteQuery completed", [
                        "workoutIndex": workoutIndex,
                        "routeStatus": "readFailed",
                        "totalLocationCount": completedPoints.count
                    ])
                    completion(RouteReadResult(points: [], status: "readFailed"))
                } else if completedPoints.isEmpty {
                    self.logHealthImport("HKWorkoutRouteQuery completed", [
                        "workoutIndex": workoutIndex,
                        "routeStatus": "notAvailable",
                        "totalLocationCount": 0
                    ])
                    completion(RouteReadResult(points: [], status: "notAvailable"))
                } else {
                    self.logHealthImport("HKWorkoutRouteQuery completed", [
                        "workoutIndex": workoutIndex,
                        "routeStatus": "available",
                        "totalLocationCount": completedPoints.count
                    ])
                    completion(RouteReadResult(points: completedPoints, status: "available"))
                }
            }
        }

        healthStore.execute(routeQuery)
    }

    private func mapLocation(_ location: CLLocation) -> [String: Any] {
        var point: [String: Any] = [
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "timestampMs": Int(location.timestamp.timeIntervalSince1970 * 1000),
            "speed": max(0, location.speed),
            "altitude": location.altitude
        ]

        if location.horizontalAccuracy >= 0 {
            point["accuracy"] = location.horizontalAccuracy
        }

        return point
    }
}
