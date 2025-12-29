import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Text } from '~/shared/components/typography';
import { GREY } from '~/shared/styles';

interface TermsDetailModalProps {
  visible: boolean;
  url: string;
  title: string;
  onClose: () => void;
}

/**
 * 약관 상세 모달 (WebView)
 */
export const TermsDetailModal: React.FC<TermsDetailModalProps> = ({
  visible,
  url,
  title,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleClose = () => {
    setIsLoading(true);
    setHasError(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerButton} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={GREY[900]} />
          </TouchableOpacity>
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
    </Modal>
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
