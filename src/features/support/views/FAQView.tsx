import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { TopScreenSafeAreaView } from '~/shared/components';
import { Text } from '~/shared/components/typography';
import { GREY, PRIMARY } from '~/shared/styles';

export const FAQView: React.FC = () => {
  const router = useRouter();

  return (
    <TopScreenSafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={GREY[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>자주 묻는 질문</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.question}>운동했는데 기록이 안 들어와요.</Text>
          <Text style={styles.answer}>
            운동 기록은 앱 사용 설정과 기기 Health 권한이 모두 허용되어야 가져올 수
            있어요. 아래 순서로 확인해주세요.
          </Text>

          <View style={styles.divider} />

          <FAQStep
            icon="settings-outline"
            title="앱"
            primary="내정보 > 설정 > 권한 설정"
            secondary="앱 사용 설정을 켜주세요."
          />
          <FAQStep
            icon="logo-android"
            title="Android"
            primary="Health Connect > 앱 권한 > 달려라 태호군"
            secondary="운동과 경로 읽기 권한을 허용해주세요."
          />
          <FAQStep
            icon="logo-apple"
            title="iOS"
            primary="건강 앱 > 공유 > 앱 > 달려라 태호군"
            secondary="또는 설정 > Health > 데이터 접근 및 기기에서 확인해주세요."
          />
          <FAQStep
            icon="watch-outline"
            title="Garmin"
            primary="Garmin Connect 앱을 열어 동기화가 완료됐는지 확인해주세요."
          />

          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => router.push('/user/permission-settings')}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonText}>권한 설정으로 이동</Text>
            <Ionicons name="chevron-forward" size={18} color={PRIMARY[700]} />
          </TouchableOpacity>
        </View>

        <View style={styles.inquirySection}>
          <Text style={styles.inquiryText}>그래도 기록이 보이지 않으면 문의를 남겨주세요.</Text>
          <TouchableOpacity
            style={styles.inquiryButton}
            onPress={() => router.push('/user/inquiry')}
            activeOpacity={0.8}
          >
            <Text style={styles.inquiryButtonText}>1:1 문의하기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </TopScreenSafeAreaView>
  );
};

type FAQStepProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  primary: string;
  secondary?: string;
};

const FAQStep: React.FC<FAQStepProps> = ({ icon, title, primary, secondary }) => (
  <View style={styles.step}>
    <View style={styles.stepIcon}>
      <Ionicons name={icon} size={18} color={PRIMARY[600]} />
    </View>
    <View style={styles.stepText}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepPrimary}>{primary}</Text>
      {secondary ? <Text style={styles.stepSecondary}>{secondary}</Text> : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[900],
  },
  headerRight: {
    width: 32,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    padding: 16,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: GREY[900],
  },
  answer: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    lineHeight: 20,
    color: GREY[600],
  },
  divider: {
    height: 1,
    marginVertical: 16,
    backgroundColor: GREY[100],
  },
  step: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY[50],
  },
  stepText: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: PRIMARY[700],
  },
  stepPrimary: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    lineHeight: 20,
    color: GREY[900],
  },
  stepSecondary: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    lineHeight: 18,
    color: GREY[500],
  },
  permissionButton: {
    height: 44,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY[50],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: PRIMARY[700],
  },
  inquirySection: {
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  inquiryText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    lineHeight: 20,
    color: GREY[600],
  },
  inquiryButton: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY[600],
  },
  inquiryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: GREY.WHITE,
  },
});
