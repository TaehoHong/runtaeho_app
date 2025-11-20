/**
 * Permission Request Modal (v3.0)
 *
 * 최초 로그인 후 필수 권한 요청 모달 (화면 하단 절반)
 * - 위치 권한 (Foreground + Background)
 * - 동작/피트니스 권한
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { permissionManager } from '~/services/PermissionManager';
import { PRIMARY, GREY } from '~/shared/styles';
import { Icon } from '~/shared/components/ui';

interface PermissionRequestModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PermissionRequestModal: React.FC<PermissionRequestModalProps> = ({ visible, onClose }) => {
  const [isRequesting, setIsRequesting] = useState(false);

  /**
   * 권한 요청 처리
   */
  const handleRequestPermissions = async () => {
    if (isRequesting) return;

    setIsRequesting(true);
    console.log('[PermissionRequestModal] Requesting permissions...');

    try {
      const result = await permissionManager.requestAllPermissions();

      if (result.success) {
        console.log('[PermissionRequestModal] All permissions granted');
        // 모달 닫기
        onClose();
      } else {
        console.warn('[PermissionRequestModal] Some permissions denied:', result.granted);

        // 거부된 권한 확인
        const permissionCheck = await permissionManager.checkRequiredPermissions();
        const message = permissionManager.getMissingPermissionsMessage(permissionCheck);

        // 설정으로 이동 안내
        Alert.alert(
          '권한이 필요합니다',
          `${message}\n\n설정에서 권한을 허용해주세요.`,
          [
            { text: '취소', style: 'cancel' },
            {
              text: '설정으로 이동',
              onPress: () => permissionManager.openAppSettings()
            }
          ]
        );
      }
    } catch (error) {
      console.error('[PermissionRequestModal] Permission request failed:', error);
      Alert.alert(
        '오류',
        '권한 요청 중 문제가 발생했습니다.\n다시 시도해주세요.'
      );
    } finally {
      setIsRequesting(false);
    }
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
            <Text style={styles.title}>앱 사용을 위한{'\n'}권한이 필요해요</Text>
            <Text style={styles.subtitle}>
              RunTaeho는 러닝 기록을 위해{'\n'}다음 권한을 사용합니다
            </Text>
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

          {/* 권한 요청 버튼 */}
          <TouchableOpacity
            style={[styles.button, isRequesting && styles.buttonDisabled]}
            onPress={handleRequestPermissions}
            disabled={isRequesting}
            activeOpacity={0.8}
          >
            {isRequesting ? (
              <ActivityIndicator size="small" color={GREY.WHITE} />
            ) : (
              <Text style={styles.buttonText}>권한 허용하기</Text>
            )}
          </TouchableOpacity>

          {/* 나중에 하기 */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onClose}
            disabled={isRequesting}
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
