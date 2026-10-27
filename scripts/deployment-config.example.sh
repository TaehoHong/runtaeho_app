# credentials/deployment.sh로 복사하고 이 Mac의 값만 채운다. .env 파일은 수정하지 않는다.
# credentials/ 전체가 Git에서 제외된다. 키 JSON과 이 파일은 권한 600으로 보관한다.
export FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-run-taeho-distribution}"
export FIREBASE_ANDROID_APP_ID="${FIREBASE_ANDROID_APP_ID:-1:712027265397:android:eb2c8960166dfc9e1c9b3c}" # 공개 앱 ID
export FIREBASE_TESTER_GROUPS="${FIREBASE_TESTER_GROUPS:-dev-testers}" # 그룹 별칭, 쉼표로 구분
export TESTFLIGHT_DEV_GROUPS="${TESTFLIGHT_DEV_GROUPS:-}" # .dev 앱의 기존 내부 그룹 이름, 쉼표로 구분
export ASC_API_KEY_PATH="${ASC_API_KEY_PATH:-}" # fastlane 형식 JSON의 절대 경로 (key_id, issuer_id, key)
# 새 deploy:* 명령은 기존 .env 파일의 SENTRY_AUTH_TOKEN도 읽는다.
# 기존 값이 없을 때만 별도로 지정한다.
# export SENTRY_AUTH_TOKEN=''
# Firebase 로그인 대신 서비스 계정을 쓸 때만 설정한다.
# export GOOGLE_APPLICATION_CREDENTIALS='/absolute/path/firebase-service-account.json'
# 필요할 때만 운영 앱의 릴리스 노트 등 메타데이터 경로를 지정한다.
# export ASC_METADATA_PATH='/absolute/path/app-store-metadata'
