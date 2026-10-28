#!/bin/sh
set -eu
# First: ./gradlew :app:compileLocalDebugKotlin (from android/).
if [ "$#" -ne 3 ]; then
  echo 'usage: run-watch-upload-regressions.sh ANDROID_JAR KOTLIN_STDLIB_JAR ORG_JSON_JAR' >&2
  exit 2
fi
app_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
watch_job_test_dir=$(mktemp -d)
trap 'rm -rf "$watch_job_test_dir"' EXIT HUP INT TERM
watch_job_classpath="$3:$2:$1:$app_dir/build/tmp/kotlin-classes/${WATCH_TEST_VARIANT:-localDebug}"
javac --release 17 -cp "$watch_job_classpath" -d "$watch_job_test_dir" \
  "$app_dir/src/testStandalone/java/com/hongtaeho/app/watch/WatchUploadLedgerTests.java"
java -cp "$watch_job_test_dir:$watch_job_classpath" com.hongtaeho.app.watch.WatchUploadLedgerTests
