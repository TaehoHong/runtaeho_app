import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '~/shared/components/typography';
import { Icon } from '~/shared/components/ui';
import { GREY } from '~/shared/styles';
import { TermType, type TermItem } from '../models/types';
import { termsApiService } from '../services/termsApiService';

/**
 * 약관 타입별 표시 이름
 */
const TERM_TYPE_LABELS: Record<TermType, string> = {
  [TermType.SERVICE]: '서비스 이용약관',
  [TermType.PRIVATE]: '개인정보 처리방침',
  [TermType.LOCATION]: '위치기반서비스 이용약관',
};

interface TermsListViewProps {
  onClose?: () => void;
}

/**
 * 약관 목록 화면
 */
export const TermsListView: React.FC<TermsListViewProps> = ({ onClose }) => {
  const router = useRouter();
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await termsApiService.getAllTerms();
      setTerms(response.terms);
    } catch (err) {
      console.error('약관 목록 조회 실패:', err);
      setError('약관을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTermPress = (term: TermItem) => {
    const label = TERM_TYPE_LABELS[term.type];
    router.push({
      pathname: '/user/terms-detail' as any,
      params: {
        url: term.link,
        title: label,
      },
    });
  };

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={GREY[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>약관 및 정책</Text>
        <View style={styles.headerButton} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GREY[500]} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTerms}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <View style={styles.termsCard}>
            {terms.map((term, index) => (
              <React.Fragment key={term.id}>
                <TouchableOpacity
                  style={styles.termItem}
                  onPress={() => handleTermPress(term)}
                >
                  <Text style={styles.termLabel}>
                    {TERM_TYPE_LABELS[term.type]}
                    {term.isRequired && (
                      <Text style={styles.requiredBadge}> (필수)</Text>
                    )}
                  </Text>
                  <Icon name="chevron" size={16} />
                </TouchableOpacity>
                {index < terms.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GREY[50],
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
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: GREY[900],
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Pretendard',
    color: GREY[600],
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: GREY[200],
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[700],
  },
  termsCard: {
    marginHorizontal: 20,
    backgroundColor: GREY.WHITE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  termLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[800],
  },
  requiredBadge: {
    fontSize: 12,
    fontWeight: '400',
    color: GREY[500],
  },
  divider: {
    height: 1,
    backgroundColor: GREY[100],
    marginHorizontal: 16,
  },
});
