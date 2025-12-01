import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Text } from '~/shared/components/typography';
import { GREY } from '~/shared/styles';

/**
 * 약관 상세 화면 (WebView)
 */
export const TermsDetailView: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ url: string; title: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const url = params.url || '';
  const title = params.title || '약관';

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={GREY[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerButton} />
      </View>

      {/* WebView */}
      <View style={styles.webViewContainer}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={GREY[500]} />
          </View>
        )}
        {hasError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={GREY[400]} />
            <Text style={styles.errorText}>페이지를 불러올 수 없습니다.</Text>
            <Text style={styles.errorSubtext}>{url}</Text>
          </View>
        ) : (
          <WebView
            source={{ uri: url }}
            style={styles.webView}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            startInLoadingState={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GREY.WHITE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: GREY.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: GREY[100],
  },
  headerButton: {
    padding: 4,
    minWidth: 44,
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: GREY[900],
    textAlign: 'center',
    marginHorizontal: 8,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: GREY.WHITE,
    zIndex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[700],
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: GREY[400],
    marginTop: 8,
    textAlign: 'center',
  },
});
