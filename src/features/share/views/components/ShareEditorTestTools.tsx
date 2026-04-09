import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, GREY } from '~/shared/styles';

interface ShareEditorTestToolsProps {
  visible: boolean;
  onAddDummyData: () => void;
}

export const ShareEditorTestTools: React.FC<ShareEditorTestToolsProps> = ({
  visible,
  onAddDummyData,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={onAddDummyData}
        activeOpacity={0.7}
      >
        <Ionicons name="map-outline" size={18} color={GREY.WHITE} />
        <Text style={styles.buttonText}>더미 GPS 데이터 추가</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>* 지도 테스트용 (userId=1 전용)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY[600],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY.WHITE,
    fontFamily: 'Pretendard-SemiBold',
  },
  hint: {
    fontSize: 11,
    color: GREY[400],
    fontFamily: 'Pretendard-Regular',
    marginTop: 4,
  },
});

export default ShareEditorTestTools;
