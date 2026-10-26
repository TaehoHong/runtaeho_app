#!/bin/sh
set -eu
# First: ./gradlew :wear:compileDebugKotlin
# Arguments are existing external test runtimes, not packaged app dependencies.
if [ "$#" -ne 3 ]; then
  echo 'usage: run-host-regressions.sh ANDROID_JAR KOTLIN_STDLIB_JAR ORG_JSON_JAR' >&2
  exit 2
fi
wear_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
watch_test_dir=$(mktemp -d)
trap 'rm -rf "$watch_test_dir"' EXIT HUP INT TERM
watch_test_classpath="$3:$2:$1:$wear_dir/build/tmp/kotlin-classes/debug"
javac --release 17 -cp "$watch_test_classpath" -d "$watch_test_dir" \
  "$wear_dir/src/main/java/com/runtaeho/wear/ActiveTime.java" \
  "$wear_dir/src/testStandalone/java/com/runtaeho/wear/WatchRegressionTests.java" \
  "$wear_dir/src/testStandalone/java/com/runtaeho/wear/DisplayRegressionTests.java"
java -cp "$watch_test_dir:$watch_test_classpath" com.runtaeho.wear.WatchRegressionTests
java -cp "$watch_test_dir:$watch_test_classpath" com.runtaeho.wear.DisplayRegressionTests
