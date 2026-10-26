import { AppRegistry } from 'react-native';
import { runWatchSyncTask } from './src/features/watchSync/background';

AppRegistry.registerHeadlessTask('WatchSyncUpload', () => runWatchSyncTask);
require('expo-router/entry');
