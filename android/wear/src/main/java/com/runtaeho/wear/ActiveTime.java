package com.runtaeho.wear;

/** Extrapolate only while the last Health Services state is active. */
public final class ActiveTime {
    private ActiveTime() {}
    public static long milliseconds(long duration, long checkpointTime, long now, boolean active) {
        return Math.max(0, duration) + (active ? Math.max(0, now - checkpointTime) : 0);
    }
}
