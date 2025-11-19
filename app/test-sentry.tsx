import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { reportError, reportMessage, addBreadcrumb, addTag, addContext } from '~/config/sentry';

/**
 * Sentry 테스트 화면 (개발 전용)
 *
 * 이 화면은 개발 중에만 사용하며, 프로덕션 배포 전에 제거해야 합니다.
 */
export default function TestSentryScreen() {
  const handleThrowError = () => {
    addBreadcrumb('User clicked throw error button', 'user-action');
    throw new Error('Test error from TestSentryScreen');
  };

  const handleReportError = () => {
    addBreadcrumb('User clicked report error button', 'user-action');
    try {
      const error = new Error('Test manual error report');
      reportError(error, {
        screen: 'test-sentry',
        action: 'manual-report',
        timestamp: Date.now(),
      });
      Alert.alert('성공', '에러가 Sentry에 리포팅되었습니다.\n(개발 환경에서는 콘솔에만 출력됩니다)');
    } catch (error) {
      console.error(error);
    }
  };

  const handleReportMessage = () => {
    addBreadcrumb('User clicked report message button', 'user-action');
    reportMessage('Test info message from TestSentryScreen', 'info');
    Alert.alert('성공', '메시지가 Sentry에 리포팅되었습니다.\n(개발 환경에서는 콘솔에만 출력됩니다)');
  };

  const handleAddBreadcrumb = () => {
    addBreadcrumb('User performed test action', 'user-action', {
      screen: 'test-sentry',
      timestamp: Date.now(),
    });
    Alert.alert('성공', 'Breadcrumb이 추가되었습니다.');
  };

  const handleAddTags = () => {
    addTag('test-tag', 'test-value');
    addTag('environment', 'test');
    Alert.alert('성공', '태그가 추가되었습니다.');
  };

  const handleAddContext = () => {
    addContext('test-context', {
      screen: 'test-sentry',
      action: 'add-context',
      timestamp: Date.now(),
    });
    Alert.alert('성공', '컨텍스트가 추가되었습니다.');
  };

  const handleApiError = async () => {
    addBreadcrumb('User clicked simulate API error button', 'user-action');
    try {
      // 존재하지 않는 엔드포인트 호출 (404 에러 발생)
      const { apiClient } = await import('~/services/api/client');
      await apiClient.get('/api/v1/non-existent-endpoint');
    } catch (error) {
      Alert.alert('API 에러 발생', '에러가 Sentry에 리포팅되었습니다.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sentry 테스트</Text>
        <Text style={styles.subtitle}>개발 환경에서만 사용</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>에러 테스트</Text>

        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleThrowError}>
          <Text style={styles.buttonText}>React 에러 발생 (ErrorBoundary)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.warningButton]} onPress={handleReportError}>
          <Text style={styles.buttonText}>에러 수동 리포팅</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.warningButton]} onPress={handleApiError}>
          <Text style={styles.buttonText}>API 에러 시뮬레이션</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>메시지 & 컨텍스트</Text>

        <TouchableOpacity style={[styles.button, styles.infoButton]} onPress={handleReportMessage}>
          <Text style={styles.buttonText}>메시지 리포팅</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.infoButton]} onPress={handleAddBreadcrumb}>
          <Text style={styles.buttonText}>Breadcrumb 추가</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.infoButton]} onPress={handleAddTags}>
          <Text style={styles.buttonText}>태그 추가</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.infoButton]} onPress={handleAddContext}>
          <Text style={styles.buttonText}>컨텍스트 추가</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoTitle}>⚠️ 주의사항</Text>
        <Text style={styles.infoText}>
          • 개발 환경에서는 Sentry로 전송되지 않고 콘솔에만 출력됩니다.{'\n'}
          • 프로덕션 빌드에서만 실제로 Sentry에 전송됩니다.{'\n'}
          • 이 화면은 프로덕션 배포 전에 제거해야 합니다.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#45DA31',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#FF4032',
  },
  warningButton: {
    backgroundColor: '#FF9800',
  },
  infoButton: {
    backgroundColor: '#45DA31',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    backgroundColor: '#FFF3CD',
    padding: 20,
    margin: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#856404',
  },
  infoText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
});
