/**
 * 캐릭터 상태 표시 컴포넌트
 * character.tsx에서 분리된 상태 표시 UI
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CharacterStatusProps {
  isConnected: boolean;
  isLoading: boolean;
  error?: {
    message: string;
  } | null;
}

export const CharacterStatus: React.FC<CharacterStatusProps> = React.memo(({
  isConnected,
  isLoading,
  error,
}) => {
  return (
    <View style={styles.statusContainer}>
      <Text style={styles.statusTitle}>연결 상태</Text>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Unity 연결:</Text>
        <Text style={[styles.statusValue, { color: isConnected ? '#4CAF50' : '#F44336' }]}>
          {isConnected ? '연결됨' : '연결 안됨'}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>로딩 중:</Text>
        <Text style={styles.statusValue}>{isLoading ? '예' : '아니오'}</Text>
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>에러:</Text>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  statusContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
  },
});