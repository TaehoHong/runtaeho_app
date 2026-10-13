import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AddShoeForm } from './components/AddShoeForm';

interface AddShoeViewProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

/** 신발 목록에서 여는 신발 추가 화면 */
export const AddShoeView: React.FC<AddShoeViewProps> = ({ onClose, onSuccess }) => (
  <SafeAreaProvider>
    <AddShoeForm entry="list" onClose={onClose} onSuccess={onSuccess} />
  </SafeAreaProvider>
);
