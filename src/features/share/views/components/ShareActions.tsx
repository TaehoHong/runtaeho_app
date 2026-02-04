/**
 * ShareActions Component
 * 공유/저장 버튼 컴포넌트
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { GREY, PRIMARY } from '~/shared/styles';

interface ShareActionsProps {
  /** 공유 버튼 클릭 콜백 */
  onShare: () => void;
  /** 저장 버튼 클릭 콜백 */
  onSave: () => void;
  /** 로딩 상태 */
  isLoading?: boolean;
}

export const ShareActions: React.FC<ShareActionsProps> = ({
  onShare,
  onSave,
  isLoading = false,
}) => {
  return (
    <View style={styles.container}>
      {/* 저장 버튼 */}
      <TouchableOpacity
        style={[styles.button, styles.saveButton, isLoading && styles.buttonDisabled]}
        onPress={onSave}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={GREY[700]} />
        ) : (
          <Text style={styles.saveButtonText}>저장</Text>
        )}
      </TouchableOpacity>

      {/* 공유 버튼 */}
      <TouchableOpacity
        style={[styles.button, styles.shareButton, isLoading && styles.buttonDisabled]}
        onPress={onShare}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.shareButtonText}>공유하기</Text>
        )}
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
  button: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButton: {
    backgroundColor: GREY[100],
    borderWidth: 1,
    borderColor: GREY[200],
  },
  shareButton: {
    backgroundColor: PRIMARY[500],
    flex: 2,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: GREY[800],
    fontFamily: 'Pretendard-SemiBold',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Pretendard-SemiBold',
  },
});

export default ShareActions;
