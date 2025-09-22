import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { PointEarnCard, MainDistanceCard, DetailedStatisticsCard, ShoeSelectionArea, CompleteButton } from '~/shared/components';

const { width, height } = Dimensions.get('window');

export const RunningFinished: React.FC = () => {
  // TODO: RunningFinishedViewModel 데이터 연결
  const hasShoe = true; // 임시 데이터

  const handleComplete = () => {
    // TODO: RunningViewModel.resetToStopped() 호출
    console.log('러닝 완료 확인');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Point Information Card */}
        <PointEarnCard />

        {/* Main Distance Card */}
        <MainDistanceCard />

        {/* Detailed Statistics Card */}
        <DetailedStatisticsCard />

        {/* Shoe Selection Area */}
        {hasShoe && <ShoeSelectionArea />}

        {/* Complete Button */}
        <CompleteButton onPress={handleComplete} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height * 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 10,
    gap: 15,
  },
});