import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '~/shared/components/typography';
interface LoadingViewProps {
  onAppear?: () => void;
}

/**
 * 로딩 화면 컴포넌트
 * iOS LoadingView 대응
 */
export const LoadingView: React.FC<LoadingViewProps> = ({ onAppear }) => {
  useEffect(() => {
    console.log('⏳ [LoadingView] 로딩 화면 나타남');
    onAppear?.();
  }, [onAppear]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4d99e5" />
      <Text style={styles.loadingText}>로딩 중...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
});
