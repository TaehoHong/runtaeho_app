/**
 * 캐릭터 제어 버튼들 컴포넌트
 * character.tsx에서 분리된 제어 UI
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CharacterMotion } from '~/types/UnityTypes';

interface CharacterControlsProps {
  isLoading: boolean;
  onSetSpeed: (speed: number) => void;
  onStopCharacter: () => void;
  onSetMotion: (motion: CharacterMotion) => void;
}

export const CharacterControls: React.FC<CharacterControlsProps> = React.memo(({
  isLoading,
  onSetSpeed,
  onStopCharacter,
  onSetMotion,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>캐릭터 제어</Text>

      <View style={styles.speedButtons}>
        <TouchableOpacity
          style={styles.speedButton}
          onPress={() => onSetSpeed(3)}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>천천히</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.speedButton}
          onPress={() => onSetSpeed(5)}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>보통</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.speedButton}
          onPress={() => onSetSpeed(8)}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>빠르게</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.stopButton}
        onPress={onStopCharacter}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>캐릭터 정지</Text>
      </TouchableOpacity>

      <View style={styles.motionButtons}>
        <TouchableOpacity
          style={styles.motionButton}
          onPress={() => onSetMotion('IDLE')}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>대기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.motionButton}
          onPress={() => onSetMotion('MOVE')}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>이동</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.motionButton}
          onPress={() => onSetMotion('ATTACK')}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>공격</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.motionButton}
          onPress={() => onSetMotion('DAMAGED')}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>피해</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  speedButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  speedButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  motionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  motionButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 6,
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
  },
});