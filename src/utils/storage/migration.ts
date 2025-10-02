/**
 * Keychain Migration
 * react-native-keychain → expo-secure-store 데이터 마이그레이션
 */

import * as Keychain from 'react-native-keychain';
import { secureStorage } from './SecureStorage';
import type { MigrationResult } from './types';

const MIGRATION_FLAG_KEY = 'keychain_migration_completed';
const MIGRATION_VERSION_KEY = 'keychain_migration_version';
const CURRENT_MIGRATION_VERSION = '1.0.0';

/**
 * 마이그레이션할 키 목록
 * react-native-keychain에서 사용하던 서비스명 기반
 */
const KEYS_TO_MIGRATE = [
  { key: 'accessToken', service: 'com.runtaeho.app.accessToken' },
  { key: 'refreshToken', service: 'com.runtaeho.app.refreshToken' },
];

/**
 * react-native-keychain에서 expo-secure-store로 데이터 마이그레이션
 */
export async function migrateFromReactNativeKeychain(): Promise<MigrationResult> {
  try {
    // 1. 마이그레이션 완료 여부 확인
    const migrationCompleted = await secureStorage.load(MIGRATION_FLAG_KEY);
    const migrationVersion = await secureStorage.load(MIGRATION_VERSION_KEY);

    if (migrationCompleted === 'true' && migrationVersion === CURRENT_MIGRATION_VERSION) {
      console.log('✅ [Migration] Already completed, skipping');
      return {
        success: true,
        migratedKeys: [],
        failedKeys: [],
        skipped: true,
      };
    }

    console.log('🔄 [Migration] Starting keychain migration...');

    const migratedKeys: string[] = [];
    const failedKeys: string[] = [];

    // 2. 각 키별로 마이그레이션 수행
    for (const { key, service } of KEYS_TO_MIGRATE) {
      try {
        // react-native-keychain에서 읽기
        const credentials = await Keychain.getGenericPassword({
          service,
        });

        if (credentials && credentials.password) {
          // expo-secure-store에 저장
          await secureStorage.save(key, credentials.password);
          migratedKeys.push(key);

          console.log(`✅ [Migration] Migrated: ${key}`);
        } else {
          console.log(`⚪ [Migration] No data found for: ${key}`);
        }
      } catch (error) {
        console.error(`❌ [Migration] Failed to migrate ${key}:`, error);
        failedKeys.push(key);
      }
    }

    // 3. 마이그레이션 결과 저장
    const success = failedKeys.length === 0;

    if (success) {
      await secureStorage.save(MIGRATION_FLAG_KEY, 'true');
      await secureStorage.save(MIGRATION_VERSION_KEY, CURRENT_MIGRATION_VERSION);
      console.log(`✅ [Migration] Completed successfully`);
    } else {
      console.error(`❌ [Migration] Completed with errors: ${failedKeys.join(', ')}`);
    }

    console.log(`📊 [Migration] Result: ${migratedKeys.length} success, ${failedKeys.length} failed`);

    return {
      success,
      migratedKeys,
      failedKeys,
      skipped: false,
    };
  } catch (error) {
    console.error(`❌ [Migration] Unexpected error:`, error);

    return {
      success: false,
      migratedKeys: [],
      failedKeys: KEYS_TO_MIGRATE.map((k) => k.key),
      skipped: false,
    };
  }
}

/**
 * 마이그레이션 롤백
 * expo-secure-store에서 마이그레이션 플래그 제거
 * (실제 데이터는 유지)
 */
export async function rollbackMigration(): Promise<void> {
  try {
    await secureStorage.remove(MIGRATION_FLAG_KEY);
    await secureStorage.remove(MIGRATION_VERSION_KEY);

    console.log('🔄 [Migration] Rollback completed');
  } catch (error) {
    console.error(`❌ [Migration] Rollback failed:`, error);
  }
}

/**
 * 마이그레이션 상태 확인
 */
export async function getMigrationStatus(): Promise<{
  completed: boolean;
  version: string | null;
}> {
  try {
    const completed = (await secureStorage.load(MIGRATION_FLAG_KEY)) === 'true';
    const version = await secureStorage.load(MIGRATION_VERSION_KEY);

    return { completed, version };
  } catch (error) {
    console.error(`❌ [Migration] Failed to get status:`, error);
    return { completed: false, version: null };
  }
}

/**
 * react-native-keychain 데이터 정리
 * 마이그레이션 완료 후 기존 데이터 삭제
 */
export async function cleanupReactNativeKeychain(): Promise<void> {
  try {
    console.log('🧹 [Migration] Cleaning up react-native-keychain data...');

    for (const { key, service } of KEYS_TO_MIGRATE) {
      try {
        await Keychain.resetGenericPassword({ service });
        console.log(`🧹 [Migration] Cleaned up: ${key}`);
      } catch (error) {
        console.error(`❌ [Migration] Failed to cleanup ${key}:`, error);
      }
    }

    console.log('✅ [Migration] Cleanup completed');
  } catch (error) {
    console.error(`❌ [Migration] Cleanup failed:`, error);
  }
}
