import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GREY } from '~/shared/styles';

interface ShareActionsProps {
  /** 공유 버튼 클릭 콜백 */
  onShare: () => void;
  /** 취소 버튼 클릭 콜백 */
  onCancel: () => void;
  /** 로딩 상태 */
  isLoading?: boolean;
}

export const ShareActions: React.FC<ShareActionsProps> = ({
  onShare,
  onCancel,
  isLoading = false,
}) => {
  return (
    <View style={styles.container}>
      {/* 취소 버튼 - X 아이콘 + 텍스트 */}
      <TouchableOpacity
        style={[styles.cancelButton, isLoading && styles.buttonDisabled]}
        onPress={onCancel}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={20} color={GREY[700]} style={styles.buttonIcon} />
        <Text style={styles.cancelButtonText}>취소</Text>
      </TouchableOpacity>

      {/* 공유 버튼 - 그라데이션 + 공유 아이콘 */}
      <TouchableOpacity
        onPress={onShare}
        disabled={isLoading}
        activeOpacity={0.8}
        style={[styles.shareButtonWrapper, isLoading && styles.buttonDisabled]}
      >
        <LinearGradient
          colors={['#59ec3a', '#45da31']}
          style={styles.shareButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="share-social" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.shareButtonText}>공유하기</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cancelButton: {
    flex: 1,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
  },
  buttonIcon: {
    // 아이콘 스타일
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: GREY[700],
    fontFamily: 'Pretendard-SemiBold',
  },
  shareButtonWrapper: {
    flex: 2,
  },
  shareButton: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    // PRIMARY 색상 그림자 (Figma 기준)
    shadowColor: '#59ec3a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Pretendard-SemiBold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default ShareActions;
