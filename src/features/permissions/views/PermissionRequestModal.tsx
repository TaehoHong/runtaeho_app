/**
 * Permission Request Modal (v3.0)
 *
 * 러닝 시작 시 권한이 없을 경우 표시되는 모달 (화면 하단 절반)
 * - 위치 권한 (Foreground + Background)
 * - 동작/피트니스 권한
 * - 버튼 클릭 시 iOS 설정 화면으로 이동
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { permissionManager } from '~/services/PermissionManager';
import { PRIMARY, GREY } from '~/shared/styles';
import { Icon } from '~/shared/components/ui';

interface PermissionRequestModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PermissionRequestModal: React.FC<PermissionRequestModalProps> = ({ visible, onClose }) => {
  const [missingPermissions, setMissingPermissions] = useState<string>('');

  /**
   * 모달이 열릴 때마다 현재 권한 상태 확인
   */
  useEffect(() => {
    if (visible) {
      checkMissingPermissions();
    }
  }, [visible]);

  /**
   * 거부된 권한 확인 및 메시지 생성
   */
  const checkMissingPermissions = async () => {
    try {
      const permissionCheck = await permissionManager.checkRequiredPermissions();
      const message = permissionManager.getMissingPermissionsMessage(permissionCheck);
      setMissingPermissions(message);
    } catch (error) {
      console.error('[PermissionRequestModal] Failed to check permissions:', error);
      setMissingPermissions('권한 확인 중 오류가 발생했습니다.');
    }
  };

  /**
   * 설정 화면으로 이동
   */
  const handleOpenSettings = async () => {
    console.log('[PermissionRequestModal] Opening app settings...');
    await permissionManager.openAppSettings();
    // 설정에서 돌아올 때 권한 상태 재확인
    checkMissingPermissions();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* 배경 딤 */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* 모달 컨텐츠 */}
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* 드래그 핸들 */}
          <View style={styles.dragHandle} />

          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>러닝을 시작하려면{'\n'}권한이 필요해요</Text>
            <Text style={styles.subtitle}>
              설정에서 다음 권한을 허용해주세요
            </Text>
            {missingPermissions ? (
              <Text style={styles.missingPermissions}>{missingPermissions}</Text>
            ) : null}
          </View>

          {/* 권한 목록 */}
          <View style={styles.permissionList}>
            {/* 위치 권한 */}
            <View style={styles.permissionItem}>
              <View style={styles.iconContainer}>
                <Icon name="point" size={28} tintColor={PRIMARY[600]} />
              </View>
              <View style={styles.permissionContent}>
                <Text style={styles.permissionTitle}>위치 권한</Text>
                <Text style={styles.permissionDescription}>
                  러닝 경로 추적 및 거리 측정에 사용됩니다.
                </Text>
              </View>
            </View>

            {/* 동작 및 피트니스 권한 */}
            <View style={styles.permissionItem}>
              <View style={styles.iconContainer}>
                <Icon name="shoe" size={28} tintColor={PRIMARY[600]} />
              </View>
              <View style={styles.permissionContent}>
                <Text style={styles.permissionTitle}>동작 및 피트니스</Text>
                <Text style={styles.permissionDescription}>
                  걸음 수 측정 및 활동량 분석에 사용됩니다.
                </Text>
              </View>
            </View>
          </View>

          {/* 설정으로 이동 버튼 */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleOpenSettings}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>설정으로 이동</Text>
          </TouchableOpacity>

          {/* 나중에 하기 */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onClose}
          >
            <Text style={styles.skipButtonText}>나중에 하기</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: GREY.WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '60%', // 화면의 60% 높이
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: GREY[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: GREY[900],
    marginBottom: 8,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: GREY[500],
    lineHeight: 20,
  },
  missingPermissions: {
    fontSize: 13,
    fontWeight: '500',
    color: GREY[700],
    marginTop: 12,
    lineHeight: 20,
  },
  permissionList: {
    marginBottom: 24,
  },
  permissionItem: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 14,
    backgroundColor: GREY[50],
    borderRadius: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: GREY[900],
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: GREY[500],
    lineHeight: 18,
  },
  button: {
    height: 52,
    backgroundColor: PRIMARY[600],
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: GREY.WHITE,
  },
  skipButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: GREY[500],
  },
});
