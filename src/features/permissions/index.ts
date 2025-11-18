/**
 * Permissions Feature - Public API
 *
 * 확장성/가독성/유지보수성을 위한 Barrel Export
 */

// Models
export {
  PermissionType,
  PermissionStatus,
  PermissionError,
  type PermissionResult,
  type PermissionConfig,
  type PermissionFlow,
  type PermissionFlowStep,
} from './models/PermissionTypes';

// Services
export {
  PermissionManager,
  permissionManager,
  type FlowExecutionResult,
} from './services/PermissionManager';

// Strategies (외부에서 직접 사용할 일은 거의 없지만 export)
export { type IPermissionStrategy } from './strategies/PermissionStrategy';
export { PermissionStrategyFactory } from './strategies/PermissionStrategyFactory';

// Hooks
export {
  usePermission,
  type UsePermissionReturn,
} from './hooks/usePermission';
export {
  usePermissionFlow,
  type UsePermissionFlowReturn,
} from './hooks/usePermissionFlow';
export {
  usePermissionStatus,
  useSinglePermissionStatus,
} from './hooks/usePermissionStatus';

// Config
export {
  PERMISSION_CONFIGS,
  PERMISSION_FLOWS,
  LOGIN_PERMISSION_FLOW,
  RUNNING_START_PERMISSION_FLOW,
  FULL_PERMISSION_FLOW,
} from './config/permissionFlows';
