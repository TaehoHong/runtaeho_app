#!/usr/bin/env bash
set -euo pipefail
source "$PROJECT_DIR/../scripts/xcode-profile.sh"
EXPO_PLIST="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/Expo.plist"
/usr/libexec/PlistBuddy -c "Set :EXUpdatesRequestHeaders:expo-channel-name $RUNTAEHO_OTA_CHANNEL" "$EXPO_PLIST"
if [[ "$RUNTAEHO_PROFILE" == local ]]; then
  /usr/libexec/PlistBuddy -c 'Set :EXUpdatesEnabled false' "$EXPO_PLIST"
else
  /usr/libexec/PlistBuddy -c 'Set :EXUpdatesEnabled true' "$EXPO_PLIST"
fi
