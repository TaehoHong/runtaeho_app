package com.runtaeho.wear;

import androidx.health.services.client.data.ExerciseInfo;
import androidx.health.services.client.data.ExerciseTrackedStatus;

/** Resolve public Java IntDef constants, avoiding Kotlin's restricted companion fields. */
final class ExerciseOwnership {
    static boolean isFree(ExerciseInfo info) {
        return info.getExerciseTrackedStatus() == ExerciseTrackedStatus.NO_EXERCISE_IN_PROGRESS;
    }
    static boolean isOurs(ExerciseInfo info) {
        return info.getExerciseTrackedStatus() == ExerciseTrackedStatus.OWNED_EXERCISE_IN_PROGRESS;
    }
}
