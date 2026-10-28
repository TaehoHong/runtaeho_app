package com.hongtaeho.app.watch;

import com.runtaeho.watchsync.WatchStore;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import org.json.JSONObject;

/** Real private-file/revision behavior; Android scheduling and RN boot are device gates. */
public final class WatchUploadLedgerTests {
    private static int passed;
    public static void main(String[] args) throws Exception {
        WatchUploadLedger ledger = new WatchUploadLedger(null);
        check(ledger.shouldSchedule(true), "legacy pending inbox gets initial wake");
        check(!ledger.shouldSchedule(false), "empty or foreign-owner inbox does not schedule");
        check(ledger.complete(0, "retry", true) && ledger.shouldSchedule(true), "network failure retains retry eligibility");
        check(!ledger.complete(0, "blocked-auth", true), "auth blocked revision stops retrying");
        WatchUploadLedger restarted = new WatchUploadLedger(ledger.json());
        check(!restarted.shouldSchedule(true), "blocked state survives process restart");
        restarted.signal();
        check(restarted.shouldSchedule(true), "explicit login or external wake rearms blocked input");
        long snapshot = restarted.getRevision();
        restarted.signal();
        check(restarted.complete(snapshot, "success", true), "new DataItem during completed snapshot retains next wake");
        check(!restarted.complete(restarted.getRevision(), "success", true), "all foreign or rejected input finishes current revision without spin");
        restarted.signal();
        check(!restarted.complete(restarted.getRevision(), "retry", false), "logout or emptied inbox does not retry transient outcome");
        File directory = Files.createTempDirectory("watch-upload-ledger-").toFile();
        try {
            WatchStore store = new WatchStore(directory, (from, to) -> {
                try {
                    Files.move(from.toPath(), to.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
                    return kotlin.Unit.INSTANCE;
                } catch (java.io.IOException error) { throw new java.io.UncheckedIOException(error); }
            });
            WatchUploadLedger completed = new WatchUploadLedger(null);
            completed.complete(0, "success", true);
            store.write("upload-job", completed.json());
            store.write("inbox-new", new JSONObject().put("sessionId", "new-input"));
            File blockedWrite = new File(directory, "upload-job.new");
            blockedWrite.mkdir();
            boolean failed = false;
            try { completed.signal(); store.write("upload-job", completed.json()); }
            catch (Exception expected) { failed = true; }
            check(failed && store.read("inbox-new") != null, "metadata write failure preserves committed incoming record");
            blockedWrite.delete();
            WatchUploadLedger recovered = new WatchUploadLedger(store.read("upload-job"));
            check(!recovered.shouldSchedule(true), "prior terminal metadata cannot itself see the failed wake");
            check(recovered.shouldSchedule(true, "repair-A"), "subsequent ensure retains scheduler repair wake despite old terminal ledger");
            check(!recovered.shouldSchedule(false, "repair-A"), "repair wake does not perpetually schedule foreign or logged-out input");
            // A persisted JobScheduler repairSignal performs this transition before any JS starts.
            check(recovered.consumeRepair("repair-A"), "new anonymous repair signal advances generation once");
            store.write("upload-job", recovered.json());
            check(new WatchUploadLedger(store.read("upload-job")).shouldSchedule(true), "scheduler repair signal durably restores pending wake eligibility");
            check(!recovered.complete(recovered.getRevision(), "blocked-auth", true), "repaired permanently blocked input still terminates");
            check(!recovered.shouldSchedule(true, "repair-A"), "just-finished consumed scheduler repair cannot loop");
            check(!recovered.consumeRepair("repair-A"), "OS retry cannot consume the same repair twice");
            check(recovered.shouldSchedule(true, "repair-B"), "new repair arriving during completion remains distinguishable");
        } finally { delete(directory); }
        System.out.println("PASS: " + passed + " upload scheduling ledger assertions");
    }
    private static void check(boolean value, String behavior) {
        if (!value) throw new AssertionError(behavior);
        passed++;
    }
    private static void delete(File file) {
        File[] children = file.listFiles();
        if (children != null) for (File child : children) delete(child);
        if (!file.delete()) throw new AssertionError("Test cleanup failed");
    }
}
