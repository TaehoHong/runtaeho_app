// Models
export { UpdateStatus } from './models/UpdateState';
export type {
  UpdateManifest,
  UpdateCheckResult,
  UpdateProgress,
} from './models/UpdateState';

// Stores
export { useUpdateStore } from './stores/updateStore';

// Services
export {
  isUpdatesEnabled,
  checkForUpdate,
  downloadUpdate,
  applyUpdate,
  getCurrentUpdate,
  getUpdateChannel,
  getRuntimeVersion,
} from './services/updateService';

// Hooks
export { useUpdateCheck } from './hooks/useUpdateCheck';
export { useUpdateDownload } from './hooks/useUpdateDownload';
export { useAutoUpdate } from './hooks/useAutoUpdate';
export type { AutoUpdateStatus } from './hooks/useAutoUpdate';

// Components
export { UpdateBanner } from './views/components/UpdateBanner';
export { UpdateModal } from './views/components/UpdateModal';
export { UpdateOverlay } from './views/components/UpdateOverlay';

// Provider
export { UpdateProvider, useUpdate } from './contexts/UpdateProvider';
