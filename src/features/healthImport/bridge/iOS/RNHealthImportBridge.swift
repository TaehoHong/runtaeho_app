import CoreLocation
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

    private func logHealthRaw(_ message: String, _ values: [String: Any] = [:]) {
        #if DEBUG
        NSLog("[HealthImport][iOS] \(message) \(values)")
        #endif
    }

    private func timestamp(_ date: Date) -> Int {
        return Int(date.timeIntervalSince1970)
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

        logHealthRaw("requestAuthorization request", [
            "readTypes": readTypes.map { $0.identifier }.sorted(),
            "includeRoute": (options["includeRoute"] as? Bool) == true
        ])
        healthStore.requestAuthorization(toShare: nil, read: readTypes) { _, error in
            if let error = error {
                self.logHealthRaw("requestAuthorization response", self.errorInfo(error))
                reject("health_permission_failed", error.localizedDescription, error)
                return
            }
            self.logHealthRaw("requestAuthorization response", ["success": true])
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

        logHealthRaw("HKSampleQuery workout request", [
            "sampleType": HKObjectType.workoutType().identifier,
            "activityType": "running",
            "startTimestamp": timestamp(startDate),
            "endTimestamp": timestamp(endDate),
            "limit": limit,
            "sort": "startDate.asc"
        ])
        let query = HKSampleQuery(
            sampleType: HKObjectType.workoutType(),
            predicate: predicate,
            limit: limit,
            sortDescriptors: [sort]
        ) { [weak self] _, samples, error in
            guard let self = self else { return }
            if let error = error {
                self.logHealthRaw("HKSampleQuery workout response", self.errorInfo(error))
                reject("health_read_failed", error.localizedDescription, error)
                return
            }

            let workouts = (samples as? [HKWorkout]) ?? []
            self.logHealthRaw("HKSampleQuery workout response", [
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

            for (index, workout) in workouts.enumerated() {
                group.enter()
                self.buildRecord(for: workout, index: index) { record in
                    lock.lock()
                    records.append(record)
                    lock.unlock()
                    group.leave()
                }
            }

            group.notify(queue: .main) {
                records.sort {
                    ($0["startTimestamp"] as? TimeInterval ?? 0) < ($1["startTimestamp"] as? TimeInterval ?? 0)
                }
                resolve(records)
            }
        }

        healthStore.execute(query)
    }

    @objc(openHealthSettings:rejecter:)
    func openHealthSettings(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        reject("health_settings_unavailable", "Health permission settings cannot be opened directly on iOS.", nil)
    }

    private func buildRecord(for workout: HKWorkout, index: Int, completion: @escaping ([String: Any]) -> Void) {
        let group = DispatchGroup()
        var routeResult = RouteReadResult(points: [], status: "notAvailable")
        var averageHeartRate: Double?

        logHealthRaw("HKWorkout raw response item", [
            "index": index,
            "sourceBundleId": workout.sourceRevision.source.bundleIdentifier,
            "startTimestamp": timestamp(workout.startDate),
            "endTimestamp": timestamp(workout.endDate),
            "durationSec": Int(workout.duration.rounded()),
            "distanceMeters": Int((workout.totalDistance?.doubleValue(for: HKUnit.meter()) ?? 0).rounded()),
            "calorieKcal": Int((workout.totalEnergyBurned?.doubleValue(for: HKUnit.kilocalorie()) ?? 0).rounded()),
            "hasDistance": workout.totalDistance != nil,
            "hasEnergy": workout.totalEnergyBurned != nil
        ])

        group.enter()
        readWorkoutRoute(workout, workoutIndex: index) { result in
            routeResult = result
            group.leave()
        }

        group.enter()
        readAverageHeartRate(startDate: workout.startDate, endDate: workout.endDate, workoutIndex: index) { value in
            averageHeartRate = value
            group.leave()
        }

        group.notify(queue: .global(qos: .userInitiated)) {
            var record: [String: Any] = [
                "sourceRecordId": "apple-health:\(workout.uuid.uuidString)",
                "sourceBundleId": workout.sourceRevision.source.bundleIdentifier,
                "startTimestamp": Int(workout.startDate.timeIntervalSince1970),
                "endTimestamp": Int(workout.endDate.timeIntervalSince1970),
                "distance": Int((workout.totalDistance?.doubleValue(for: HKUnit.meter()) ?? 0).rounded()),
                "durationSec": Int(workout.duration.rounded()),
                "calorie": Int((workout.totalEnergyBurned?.doubleValue(for: HKUnit.kilocalorie()) ?? 0).rounded()),
                "cadence": 0,
                "gpsPoints": routeResult.points,
                "routeStatus": routeResult.status
            ]

            if let averageHeartRate = averageHeartRate {
                record["heartRate"] = Int(averageHeartRate.rounded())
            }

            completion(record)
        }
    }

    private func readAverageHeartRate(startDate: Date, endDate: Date, workoutIndex: Int, completion: @escaping (Double?) -> Void) {
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
            completion(nil)
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [.strictStartDate])
        logHealthRaw("HKStatisticsQuery heartRate request", [
            "workoutIndex": workoutIndex,
            "quantityType": heartRateType.identifier,
            "startTimestamp": timestamp(startDate),
            "endTimestamp": timestamp(endDate),
            "options": "discreteAverage"
        ])
        let query = HKStatisticsQuery(quantityType: heartRateType, quantitySamplePredicate: predicate, options: .discreteAverage) {
            [weak self] _, statistics, _ in
            guard let self = self else {
                completion(nil)
                return
            }
            let value = statistics?.averageQuantity()?.doubleValue(for: self.heartRateUnit)
            self.logHealthRaw("HKStatisticsQuery heartRate response", [
                "workoutIndex": workoutIndex,
                "hasAverage": value != nil,
                "averageBpm": value.map { Int($0.rounded()) } ?? 0
            ])
            completion(value)
        }
        healthStore.execute(query)
    }

    private func readWorkoutRoute(_ workout: HKWorkout, workoutIndex: Int, completion: @escaping (RouteReadResult) -> Void) {
        guard #available(iOS 11.0, *) else {
            logHealthRaw("HKSampleQuery route skipped", [
                "workoutIndex": workoutIndex,
                "reason": "iOS<11"
            ])
            completion(RouteReadResult(points: [], status: "notAvailable"))
            return
        }

        let routeType = HKSeriesType.workoutRoute()
        let predicate = HKQuery.predicateForObjects(from: workout)
        logHealthRaw("HKSampleQuery route request", [
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
                self.logHealthRaw("HKSampleQuery route response", [
                    "workoutIndex": workoutIndex
                ].merging(self.errorInfo(error)) { _, new in new })
                completion(RouteReadResult(points: [], status: "readFailed"))
                return
            }

            let routes = (samples as? [HKWorkoutRoute]) ?? []
            self.logHealthRaw("HKSampleQuery route response", [
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
                self.logHealthRaw("HKWorkoutRouteQuery request", [
                    "workoutIndex": workoutIndex,
                    "routeIndex": routeIndex
                ])
                let locationQuery = HKWorkoutRouteQuery(route: route) { _, locations, done, error in
                    if error != nil {
                        self.logHealthRaw("HKWorkoutRouteQuery response", [
                            "workoutIndex": workoutIndex,
                            "routeIndex": routeIndex,
                            "done": done
                        ].merging(self.errorInfo(error)) { _, new in new })
                        lock.lock()
                        didFail = true
                        lock.unlock()
                    }

                    if let locations = locations {
                        let mapped = locations.map { location in
                            self.mapLocation(location)
                        }
                        self.logHealthRaw("HKWorkoutRouteQuery response", [
                            "workoutIndex": workoutIndex,
                            "routeIndex": routeIndex,
                            "locationCount": locations.count,
                            "done": done,
                            "firstTimestamp": locations.first.map { self.timestamp($0.timestamp) } ?? 0,
                            "lastTimestamp": locations.last.map { self.timestamp($0.timestamp) } ?? 0
                        ])
                        lock.lock()
                        points.append(contentsOf: mapped)
                        lock.unlock()
                    }

                    if done {
                        group.leave()
                    }
                }
                self.healthStore.execute(locationQuery)
            }

            group.notify(queue: .global(qos: .userInitiated)) {
                points.sort {
                    ($0["timestampMs"] as? Int ?? 0) < ($1["timestampMs"] as? Int ?? 0)
                }
                if didFail {
                    self.logHealthRaw("HKWorkoutRouteQuery completed", [
                        "workoutIndex": workoutIndex,
                        "routeStatus": "readFailed",
                        "totalLocationCount": points.count
                    ])
                    completion(RouteReadResult(points: [], status: "readFailed"))
                } else if points.isEmpty {
                    self.logHealthRaw("HKWorkoutRouteQuery completed", [
                        "workoutIndex": workoutIndex,
                        "routeStatus": "notAvailable",
                        "totalLocationCount": 0
                    ])
                    completion(RouteReadResult(points: [], status: "notAvailable"))
                } else {
                    self.logHealthRaw("HKWorkoutRouteQuery completed", [
                        "workoutIndex": workoutIndex,
                        "routeStatus": "available",
                        "totalLocationCount": points.count
                    ])
                    completion(RouteReadResult(points: points, status: "available"))
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
