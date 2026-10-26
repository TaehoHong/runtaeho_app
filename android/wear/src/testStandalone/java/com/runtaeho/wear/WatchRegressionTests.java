package com.runtaeho.wear;

import com.runtaeho.watchsync.WatchStore;
import com.runtaeho.watchsync.WatchRecords;
import org.json.JSONObject;
import org.json.JSONArray;
import java.nio.file.Files;
import java.io.File;

/** Host regression harness: real filesystem, production store/rules, no SDK mocks. */
public final class WatchRegressionTests {
    private static final String ID = "95eb5600-38e0-489b-bf44-8bdf27187bee";
    private static int passed;
    public static void main(String[] args) throws Exception {
        check(ActiveTime.milliseconds(12000, 100000, 105000, true) == 17000, "active extrapolates checkpoint");
        check(ActiveTime.milliseconds(12000, 100000, 900000, false) == 12000, "pause/recovery excludes gap");
        check(ActiveTime.milliseconds(12000, 100000, 95000, true) == 12000, "clock rollback cannot subtract recorded time");
        File root = Files.createTempDirectory("watch-regression-").toFile();
        try {
            WatchStore store = newStore(root);
            JSONObject original = record();
            check(store.retainIncoming(original), "new inbox record retained");
            store.write("owner", new JSONObject().put("ownerUserId", 22));
            WatchStore restarted = newStore(root);
            check(restarted.read("inbox-" + ID).getLong("ownerUserId") == 11, "account switch and restart never reassign record");
            JSONObject duplicate = record().put("ownerUserId", 22).put("distance", 9999);
            check(!restarted.retainIncoming(duplicate), "duplicate does not overwrite first receipt");
            check(restarted.read("inbox-" + ID).getInt("distance") == 1500, "first immutable payload remains");
            JSONObject wrongOwner = ack().put("ownerUserId", "22");
            boolean rejected = false;
            try { restarted.acknowledgeIncoming(wrongOwner); } catch (IllegalArgumentException expected) { rejected = true; }
            check(rejected && restarted.read("inbox-" + ID) != null, "wrong owner ack rejected without deletion");
            restarted.write("pending-" + ID, original);
            check(!restarted.acknowledgePending(wrongOwner), "watch ignores stale owner acknowledgement");
            check(!restarted.acknowledgePending(ack().put("source", "APPLE_WATCH")), "watch ignores wrong source acknowledgement");
            File failedAck = new File(root, "ack-" + ID + ".new");
            failedAck.mkdir();
            boolean ackFailed = false;
            try { restarted.acknowledgeIncoming(ack()); } catch (Exception expected) { ackFailed = true; }
            check(ackFailed && restarted.read("inbox-" + ID) != null, "ack storage failure never deletes incoming record");
            failedAck.delete();
            restarted.acknowledgeIncoming(ack());
            WatchStore afterAck = newStore(root);
            check(afterAck.read("inbox-" + ID) == null && afterAck.read("ack-" + ID).getString("runningRecordId").equals("789"), "server ack persists across restart before inbox clear");
            check(!afterAck.retainIncoming(original), "lost ack redelivery never recreates inbox");
            check(afterAck.acknowledgePending(ack()), "matching server ack clears watch outbox");
            check(!afterAck.acknowledgePending(ack()), "unknown or repeated ack ignored");
            check(newStore(root).read("receipt-" + ID) != null, "watch receipt durable after restart");
            store.write("active", original);
            store.archiveUnmeasured(original);
            check(newStore(root).read("active") == null && store.read("unmeasured-" + ID) != null, "failed unmeasured run preserved and active slot released");
            store.write("checkpoint", new JSONObject().put("durationMs", 12000).put("state", "PAUSED"));
            Files.writeString(new File(root, "checkpoint.new").toPath(), "{interrupted");
            check(newStore(root).read("checkpoint").getLong("durationMs") == 12000, "interrupted replacement preserves committed checkpoint");
            check(newStore(root).entries("checkpoint").size() == 1, "incomplete temporary file never enumerated as record");
            new File(root, "checkpoint.new").delete();
            new File(root, "checkpoint.new").mkdir();
            boolean failed = false;
            try { store.write("checkpoint", new JSONObject().put("durationMs", 99999)); } catch (Exception expected) { failed = true; }
            check(failed && store.read("checkpoint").getLong("durationMs") == 12000, "write failure propagates while preserving prior checkpoint");
            check(WatchRecords.INSTANCE.validRecord(record()), "canonical record accepted");
            check(!WatchRecords.INSTANCE.validRecord(record().put("ownerUserId", 11.5)), "fractional owner rejected");
            check(!WatchRecords.INSTANCE.validRecord(record().put("heartRate", 256)), "out of schema metric rejected");
            check(WatchRecords.INSTANCE.validRecord(record().put("durationSec", 0).put("distance", 0)), "measured zero run accepted");
            check(WatchRecords.INSTANCE.validTimeline(record()), "normal timeline accepted");
            check(!WatchRecords.INSTANCE.validTimeline(record().put("endTimestamp", 1699999999)), "clock rollback ending before start rejected");
            check(!WatchRecords.INSTANCE.validTimeline(record().put("endTimestamp", 1700000100)), "clock rollback active time beyond interval rejected");
            check(!WatchRecords.INSTANCE.validTimeline(record().put("gpsPoints", new JSONArray().put(new JSONObject().put("timestampMs", 1699999999999L)))), "route before start rejected");
            check(!WatchRecords.INSTANCE.validTimeline(record().put("gpsPoints", new JSONArray().put(new JSONObject().put("timestampMs", 1700000601000L)))), "route after end second rejected");
            check(!WatchRecords.INSTANCE.validTimeline(record().put("gpsPoints", new JSONArray()
                .put(new JSONObject().put("timestampMs", 1700000020000L))
                .put(new JSONObject().put("timestampMs", 1700000010000L)))), "out of order route rejected");
            check(WatchRecords.INSTANCE.validTimeline(record().put("gpsPoints", new JSONArray().put(new JSONObject().put("timestampMs", 1700000600999L)))), "end second millisecond boundary accepted");
            JSONObject clockError = record().put("endTimestamp", 1699999999);
            store.write("active", clockError);
            store.archiveClockError(clockError);
            WatchStore afterClockError = newStore(root);
            check(afterClockError.read("active") == null && afterClockError.read("pending-" + ID) == null, "clock error releases active slot without enqueue");
            check(afterClockError.read("clock-error-" + ID).getLong("endTimestamp") == 1699999999 &&
                afterClockError.read("clock-error-" + ID).getString("archiveReason").equals("CLOCK_ANOMALY"), "clock error preserves original timestamp and distinct reason");
            System.out.println("PASS: " + passed + " watch timing, ownership and durable storage assertions");
        } finally { delete(root); }
    }
    private static WatchStore newStore(File directory) {
        // Platform boundary: production uses Android Os.rename (API21+).
        return new WatchStore(directory, (from, to) -> {
            try {
                Files.move(from.toPath(), to.toPath(), java.nio.file.StandardCopyOption.ATOMIC_MOVE,
                    java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                return kotlin.Unit.INSTANCE;
            } catch (java.io.IOException error) { throw new java.io.UncheckedIOException(error); }
        });
    }
    private static JSONObject record() throws Exception {
        return new JSONObject().put("schemaVersion", 1).put("sessionId", ID).put("ownerUserId", 11).put("source", "WEAR_OS")
            .put("startTimestamp", 1700000000).put("endTimestamp", 1700000600).put("distance", 1500).put("durationSec", 300)
            .put("cadence", 0).put("heartRate", 0).put("calorie", 0).put("gpsPoints", new JSONArray());
    }
    private static JSONObject ack() throws Exception {
        return new JSONObject().put("sessionId", ID).put("ownerUserId", "11").put("source", "WEAR_OS").put("runningRecordId", "789");
    }
    private static void check(boolean value, String behavior) {
        if (!value) throw new AssertionError(behavior);
        passed++;
    }
    private static void delete(File file) {
        File[] children = file.listFiles();
        if (children != null) for (File child : children) delete(child);
        if (!file.delete()) throw new AssertionError("Unable to clean test storage");
    }
}
