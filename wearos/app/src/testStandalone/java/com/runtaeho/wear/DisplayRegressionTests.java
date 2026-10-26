package com.runtaeho.wear;

import com.runtaeho.watchsync.WatchStore;
import org.json.JSONObject;
import org.json.JSONArray;
import java.nio.file.Files;
import java.io.File;
import java.util.Locale;

public final class DisplayRegressionTests {
    private static final long NOW = 1700000000000L;
    private static int passed;
    public static void main(String[] args) throws Exception {
        Locale previousLocale = Locale.getDefault();
        Locale.setDefault(Locale.US);
        File root = Files.createTempDirectory("watch-display-").toFile();
        try {
            RunDisplayPreferences preferences = new RunDisplayPreferences(null);
            check(preferences.getUnit().equals("KPH"), "default distance system KPH");
            check(preferences.active(0).equals("currentPace") && preferences.active(1).equals("duration") &&
                preferences.active(2).equals("heartRate") && preferences.active(3).equals("cadence"), "explicit active slot defaults");
            check(preferences.cycle(0).equals("averagePace"), "top cycles current to average");
            check(preferences.cycle(0).equals("speed") && preferences.cycle(0).equals("currentPace"), "top cycle wraps");
            check(preferences.active(1).equals("duration") && preferences.active(2).equals("heartRate"), "cycling one slot leaves others unchanged");
            check(!preferences.toggle(0, "distance"), "fourth selection rejected");
            check(preferences.toggle(1, "distance") && !preferences.toggle(1, "duration"), "last selection cannot be removed");
            check(preferences.toggle(1, "speed") && preferences.active(1).equals("duration"), "adding choice retains active metric");
            check(preferences.toggle(1, "duration") && preferences.active(1).equals("speed"), "removing active chooses first remaining");
            preferences.setUnit("MPH");
            WatchStore store = WatchRegressionTests.newStore(root);
            store.write("display-settings", preferences.toJson());
            RunDisplayPreferences relaunched = new RunDisplayPreferences(WatchRegressionTests.newStore(root).read("display-settings"));
            check(relaunched.getUnit().equals("MPH") && relaunched.active(1).equals("speed") && relaunched.selected(0).size() == 3,
                "unit choices and active metric survive persisted relaunch");
            JSONObject malformed = new JSONObject().put("schemaVersion", 1).put("unit", "bad").put("slots", new JSONArray()
                .put(new JSONObject().put("metrics", new JSONArray().put("speed").put("bad").put("speed").put("distance")).put("active", "missing"))
                .put(new JSONObject().put("metrics", new JSONArray())));
            RunDisplayPreferences recovered = new RunDisplayPreferences(malformed);
            check(recovered.getUnit().equals("KPH") && recovered.selected(0).toString().equals("[distance, speed]") && recovered.active(0).equals("distance"),
                "malformed favorites normalize and invalid current falls back in canonical order");
            check(recovered.active(1).equals("duration"), "empty saved slot recovers explicit default");
            check(new RunDisplayPreferences(new JSONObject().put("unit", "MPH")).getUnit().equals("KPH"), "legacy settings recover defaults");
            JSONObject run = record();
            check(number("distance", run, "KPH").equals("1.00") && number("distance", run, "MPH").equals("0.62"), "distance converts meters to km or miles");
            check(number("speed", run, "KPH").equals("14.4") && number("speed", run, "MPH").equals("8.9"), "live speed converts mps to kph or mph");
            check(number("currentPace", run, "KPH").equals("4:10") && number("averagePace", run, "KPH").equals("5:00"), "current pace uses live speed independently of average");
            check(number("currentPace", run, "MPH").equals("6:42") && number("averagePace", run, "MPH").equals("8:03"), "pace unit conversion rounds to nearest second");
            check(run.getDouble("distance") == 1000 && run.getLong("durationMs") == 300000 && run.getDouble("speed") == 4,
                "display conversions never alter canonical recorded units");
            check(number("speed", record().put("speed", 0), "KPH").equals("0.0") && number("currentPace", record().put("speed", 0), "KPH").equals("--"),
                "measured stationary speed differs from unavailable pace");
            check(number("distance", record().put("distance", 0), "KPH").equals("0.00") && number("calories", record(), "KPH").equals("0"), "measured zero distance and calories retained");
            check(number("heartRate", record().put("heartRateLatest", 0), "KPH").equals("--") && number("cadence", record().put("cadenceLatest", 0), "KPH").equals("0"),
                "zero heart rate unavailable and measured zero cadence retained");
            check(number("speed", record().put("state", "PAUSED"), "KPH").equals("--") &&
                number("currentPace", record().put("state", "PAUSED"), "KPH").equals("--") &&
                number("cadence", record().put("state", "PAUSED"), "KPH").equals("--"), "paused live metrics unavailable");
            check(number("averagePace", record().put("state", "PAUSED").put("checkpointTime", NOW - 90000), "KPH").equals("5:00"), "paused average excludes paused time");
            check(number("speed", record().put("speedSampleEpochMs", NOW - 30001), "KPH").equals("--") &&
                number("speed", record().put("speedSampleEpochMs", NOW - 30000), "KPH").equals("14.4"), "thirty second live sample freshness boundary");
            check(number("speed", record().put("liveSinceEpochMs", NOW).put("speedSampleEpochMs", NOW - 1).put("speedAvailable", true), "KPH").equals("--"),
                "availability recovery cannot expose pre-resume cached sample");
            check(number("speed", record().put("speedAvailable", false), "KPH").equals("--"), "sensor unavailability hides cached speed");
            check(number("speed", new JSONObject(), "KPH").equals("--") && number("calories", new JSONObject(), "KPH").equals("--"), "missing old checkpoint values remain unavailable");
            check(number("speed", record().put("speed", -1), "KPH").equals("--") && number("speed", record().put("speed", "NaN"), "KPH").equals("--"), "invalid live readings never become numeric display");
            check(number("currentPace", record().put("speed", Double.MIN_VALUE), "KPH").equals("--") &&
                number("speed", record().put("speed", Double.MAX_VALUE), "KPH").equals("--"), "conversion overflow is unavailable");
            check(number("duration", record().put("durationMs", 3661000), "KPH").equals("1:01:01"), "long duration uses hour format");
            JSONObject source = record().put("liveSinceEpochMs", NOW - 500).put("speedSampleEpochMs", NOW - 1000)
                .put("heartRateSum", 300.0).put("heartRateCount", 2).put("cadenceSum", 340.0).put("cadenceCount", 2);
            check(LiveMetricSamples.INSTANCE.capture(source, "speed", 5, NOW - 1, NOW) && source.getDouble("speed") == 5,
                "new active speed source stored in canonical mps");
            check(source.getDouble("heartRateSum") == 300 && source.getInt("heartRateCount") == 2 &&
                source.getDouble("cadenceSum") == 340 && source.getDouble("distance") == 1000,
                "live cache leaves aggregates and canonical distance unchanged");
            check(!LiveMetricSamples.INSTANCE.capture(source, "speed", 9, NOW - 1, NOW) && source.getDouble("speed") == 5,
                "duplicate source timestamp cannot replace live value");
            check(!LiveMetricSamples.INSTANCE.capture(source, "speed", 9, NOW + 1, NOW), "future source sample rejected");
            check(!LiveMetricSamples.INSTANCE.capture(source, "speed", Double.NaN, NOW, NOW), "nonfinite source rejected before JSON persistence");
            check(!LiveMetricSamples.INSTANCE.capture(record().put("state", "PAUSED"), "speed", 5, NOW, NOW), "paused source never repopulates live cache");
            check(!LiveMetricSamples.INSTANCE.capture(record().put("liveSinceEpochMs", NOW).put("speedSampleEpochMs", NOW - 1000),
                "speed", 9, NOW - 1, NOW), "pre-resume or pre-recovery sample rejected");
            check(LiveMetricSamples.INSTANCE.capture(record().put("cadenceSampleEpochMs", NOW - 1), "cadence", 0, NOW, NOW),
                "measured zero cadence accepted at source boundary");
            float smallFit = MetricLineFit.INSTANCE.scale(52, 31, 75);
            check(smallFit < 1 && (52 + 31) * smallFit <= 75.001f, "small bottom pace fits number and full unit together");
            float longFit = MetricLineFit.INSTANCE.scale(118, 0, 90);
            check(longFit < 1 && 118 * longFit <= 90.001f, "long duration fits bottom slot without wrapping");
            check(MetricLineFit.INSTANCE.scale(40, 30, 90) == 1, "short metric preserves reference typography");
            System.out.println("PASS: " + passed + " Wear display/settings assertions");
        } finally { Locale.setDefault(previousLocale); WatchRegressionTests.delete(root); }
    }
    private static JSONObject record() throws Exception {
        return new JSONObject().put("state", "ACTIVE").put("distance", 1000).put("durationMs", 300000).put("checkpointTime", NOW)
            .put("speed", 4).put("speedAvailable", true).put("speedSampleEpochMs", NOW)
            .put("heartRateLatest", 148).put("heartRateAvailable", true).put("heartRateSampleEpochMs", NOW)
            .put("cadenceLatest", 172).put("cadenceAvailable", true).put("cadenceSampleEpochMs", NOW).put("calorie", 0);
    }
    private static String number(String metric, JSONObject record, String unit) {
        return RunMetricDisplay.INSTANCE.value(metric, record, unit, NOW).getNumber();
    }
    private static void check(boolean value, String behavior) {
        if (!value) throw new AssertionError(behavior);
        passed++;
    }
}
