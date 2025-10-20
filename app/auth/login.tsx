import { Login } from '~/features/auth/views/login';

/**
 * 로그인 화면 라우트
 * iOS LoginView 대응
 */
export default function LoginScreen() {
  console.log('🔑 [LOGIN_SCREEN] 로그인 화면 렌더링');
  
  return <Login />;
}
