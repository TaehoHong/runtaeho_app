/**
 * 약관 동의 화면 라우트
 */

import { Stack } from 'expo-router';
import { TermsAgreementScreen } from '~/features/terms/views';

export default function TermsAgreementRoute() {
  console.log('📄 [TERMS_ROUTE] 약관 동의 화면 렌더링');

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <TermsAgreementScreen />
    </>
  );
}
