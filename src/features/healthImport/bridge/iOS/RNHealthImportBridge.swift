import CoreLocation
import HealthKit
import React

@objc(RNHealthImportBridge)
class RNHealthImportBridge: NSObject {
    private let healthStore = HKHealthStore()
    private let heartRateUnit = HKUnit.count().unitDivided(by: HKUnit.minute())

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

        healthStore.requestAuthorization(toShare: nil, read: readTypes) { _, error in
            if let error = error {
                reject("health_permission_failed", error.localizedDescription, error)
                return
            }
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

        let query = HKSampleQuery(
            sampleType: HKObjectType.workoutType(),
            predicate: predicate,
            limit: limit,
            sortDescriptors: [sort]
        ) { [weak self] _, samples, error in
            guard let self = self else { return }
            if let error = error {
                reject("health_read_failed", error.localizedDescription, error)
                return
            }

            let workouts = (samples as? [HKWorkout]) ?? []
            if workouts.isEmpty {
                resolve([])
                return
            }

            let group = DispatchGroup()
            let lock = NSLock()
            var records: [[String: Any]] = []

            for workout in workouts {
                group.enter()
                self.buildRecord(for: workout) { record in
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

    private func buildRecord(for workout: HKWorkout, completion: @escaping ([String: Any]) -> Void) {
        let group = DispatchGroup()
        var gpsPoints: [[String: Any]] = []
        var averageHeartRate: Double?

        group.enter()
        readWorkoutRoute(workout) { points in
            gpsPoints = points
            group.leave()
        }

        group.enter()
        readAverageHeartRate(startDate: workout.startDate, endDate: workout.endDate) { value in
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
                "gpsPoints": gpsPoints
            ]

            if let averageHeartRate = averageHeartRate {
                record["heartRate"] = Int(averageHeartRate.rounded())
            }

            completion(record)
        }
    }

    private func readAverageHeartRate(startDate: Date, endDate: Date, completion: @escaping (Double?) -> Void) {
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
            completion(nil)
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [.strictStartDate])
        let query = HKStatisticsQuery(quantityType: heartRateType, quantitySamplePredicate: predicate, options: .discreteAverage) {
            [weak self] _, statistics, _ in
            guard let self = self else {
                completion(nil)
                return
            }
            let value = statistics?.averageQuantity()?.doubleValue(for: self.heartRateUnit)
            completion(value)
        }
        healthStore.execute(query)
    }

    private func readWorkoutRoute(_ workout: HKWorkout, completion: @escaping ([[String: Any]]) -> Void) {
        guard #available(iOS 11.0, *) else {
            completion([])
            return
        }

        let routeType = HKSeriesType.workoutRoute()
        let predicate = HKQuery.predicateForObjects(from: workout)
        let routeQuery = HKSampleQuery(sampleType: routeType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) {
            [weak self] _, samples, _ in
            guard let self = self else {
                completion([])
                return
            }

            let routes = (samples as? [HKWorkoutRoute]) ?? []
            if routes.isEmpty {
                completion([])
                return
            }

            let group = DispatchGroup()
            let lock = NSLock()
            var points: [[String: Any]] = []

            for route in routes {
                group.enter()
                let locationQuery = HKWorkoutRouteQuery(route: route) { _, locations, done, _ in
                    if let locations = locations {
                        let mapped = locations.map { location in
                            self.mapLocation(location)
                        }
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
                completion(points)
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
