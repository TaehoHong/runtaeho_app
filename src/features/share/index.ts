/**
 * Share Feature
 * 러닝 기록 공유 기능 모듈
 */

// Views
export { ShareEditorScreen } from './views/ShareEditorScreen';
export * from './views/components';

// ViewModels
export { useShareEditor } from './viewmodels/useShareEditor';

// Services
export { shareService, ShareService } from './services/shareService';

// Stores
export { useShareStore } from './stores/shareStore';

// Types
export type {
  BackgroundOption,
  PoseOption,
  ShareRunningData,
  ElementPosition,
  ElementTransform,
  StatType,
  StatElementConfig,
  ShareEditorState,
  ShareResult,
  CharacterTransform,
} from './models/types';

// Constants
export {
  BACKGROUND_OPTIONS,
  POSE_OPTIONS,
  DEFAULT_BACKGROUND,
  DEFAULT_POSE,
  INITIAL_AVATAR_TRANSFORM,
  INITIAL_STAT_ELEMENTS,
  CANVAS_SIZE,
  SCALE_RANGES,
} from './constants/shareOptions';
