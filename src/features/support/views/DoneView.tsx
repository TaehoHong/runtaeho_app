import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { TopScreenSafeAreaView } from '~/shared/components';
import { Text } from '~/shared/components/typography';
import { GREY, PRIMARY } from '~/shared/styles';

export const DoneView: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ trackingNo?: string | string[] }>();
  const trackingNo = Array.isArray(params.trackingNo)
    ? params.trackingNo[0]
    : params.trackingNo;

  return (
    <TopScreenSafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text style={styles.headerTitle}>문의 완료</Text>
        <View style={styles.headerSide} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Ionicons name="checkmark" size={24} color={PRIMARY[700]} />
          </View>
          <Text style={styles.title}>문의가 접수됐어요</Text>
          <Text style={styles.desc}>답변은 입력한 이메일로 안내드릴게요.</Text>

          <View style={styles.noBox}>
            <Text style={styles.noLabel}>접수번호</Text>
            <Text style={styles.noValue}>{trackingNo ?? '-'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/user/customer-service')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>고객센터로 돌아가기</Text>
        </TouchableOpacity>
      </View>
    </TopScreenSafeAreaView>
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
  },
  headerSide: {
    width: 32,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: GREY[900],
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  card: {
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    padding: 20,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY[50],
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: GREY[900],
    marginBottom: 6,
  },
  desc: {
    fontSize: 13,
    fontWeight: '400',
    color: GREY[600],
    lineHeight: 19,
    marginBottom: 18,
  },
  noBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: GREY[50],
  },
  noLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: GREY[500],
    marginBottom: 6,
  },
  noValue: {
    fontSize: 16,
    fontWeight: '700',
    color: GREY[900],
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: GREY[50],
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY[600],
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: GREY[900],
  },
});
