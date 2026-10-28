import { AppRegistry } from 'react-native';
import { runScheduledWatchSyncTask } from './src/features/watchSync/background';

AppRegistry.registerHeadlessTask('WatchSyncUpload', () => runScheduledWatchSyncTask);
require('expo-router/entry');
