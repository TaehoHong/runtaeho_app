package com.runtaeho.wear

/** Fit the complete number/unit line; Android's text autosizing does not resize absolute spans. */
object MetricLineFit {
    fun scale(numberWidth: Float, unitWidth: Float, availableWidth: Float): Float {
        val total = numberWidth + unitWidth
        if (!total.isFinite() || total <= 0 || !availableWidth.isFinite() || availableWidth <= 0) return 1f
        return (availableWidth / total).coerceAtMost(1f)
    }
}
