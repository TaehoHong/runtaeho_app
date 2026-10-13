import { router } from 'expo-router';
import { AddShoeForm } from '~/features/shoes/views/components/AddShoeForm';

/** 신발 추가 모달 라우트 */
export default function AddShoeModal() {
  return <AddShoeForm entry="route" onClose={() => router.back()} />;
}
