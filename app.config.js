// Environment-specific configuration
// .env.local (로컬 개발), .env.dev (개발 서버), .env.prod (운영)
const ENV = process.env.EXPO_PUBLIC_ENV || 'local';

// Version configuration from local package.json
const packageJson = require('./package.json');
const appVersion = packageJson.version;
const runtimeVersion = packageJson.config.runtimeVersion;

export default {
  expo: {
    name: ENV === 'production' ? 'RunTaeho' : `RunTaeho (${ENV})`,
    slug: "runtaeho",
    version: appVersion,
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "runtaeho",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    assetBundlePatterns: ["**/*"],
    // EAS Update 설정
    updates: {
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
      url: "https://u.expo.dev/daaffe2d-52cf-427d-ad87-2b05cde55f58",
    },
    runtimeVersion: runtimeVersion,
    ios: {
      icon: "./assets/images/icon.png",
      supportsTablet: true,
      bundleIdentifier: ENV === 'production'
        ? "com.runtaeho.runtaeho"
        : `com.runtaeho.runtaeho.${ENV}`,
      usesAppleSignIn: true,
      appleTeamId: "3F893P33SC",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "RunTaeho는 러닝 중 실시간으로 GPS 경로를 추적하고, 이동 거리와 페이스를 계산합니다.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "RunTaeho는 백그라운드에서도 러닝을 중단 없이 기록하기 위해 위치 접근이 필요합니다. 앱이 백그라운드 상태에서도 러닝 경로, 이동 거리, 페이스가 정확하게 기록됩니다.",
        NSLocationAlwaysUsageDescription: "RunTaeho는 백그라운드에서도 러닝을 중단 없이 기록하기 위해 위치 접근이 필요합니다. 앱이 백그라운드 상태에서도 러닝 경로, 이동 거리, 페이스가 정확하게 기록됩니다.",
        NSMotionUsageDescription: "걸음 수 측정 및 러닝 페이스 분석을 위해 동작 및 피트니스 데이터를 사용합니다.",
        UIBackgroundModes: ["location"],
        GIDClientID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "620303212609-581f7f3bgj104gtaermbtjqqf8u6khb8.apps.googleusercontent.com"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      // 개발 환경에서 HTTP (localhost) 요청 허용
      usesCleartextTraffic: ENV !== 'production',
      package: ENV === 'production'
        ? "com.runtaeho.runtaeho"
        : `com.runtaeho.runtaeho`,
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION", // 백그라운드 위치 추적
        "ACTIVITY_RECOGNITION", // 동작 및 피트니스 (걸음 수)
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION" // Foreground Service (위치)
      ]
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-image-picker",
        {
          "cameraPermission": "프로필 사진 및 러닝 기록 공유 배경 촬영을 위해 카메라 접근 권한이 필요합니다.",
          "photosPermission": "프로필 사진 및 러닝 기록 공유 배경 이미지 선택을 위해 사진 라이브러리 접근 권한이 필요합니다."
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "RunTaeho는 백그라운드에서도 러닝을 중단 없이 기록하기 위해 위치 접근이 필요합니다. 앱이 백그라운드 상태에서도 러닝 경로, 이동 거리, 페이스가 정확하게 기록됩니다.",
          locationAlwaysPermission: "RunTaeho는 백그라운드에서도 러닝을 중단 없이 기록하기 위해 위치 접근이 필요합니다. 앱이 백그라운드 상태에서도 러닝 경로, 이동 거리, 페이스가 정확하게 기록됩니다.",
          locationWhenInUsePermission: "RunTaeho는 러닝 중 실시간으로 GPS 경로를 추적하고, 이동 거리와 페이스를 계산합니다. 예를 들어, 5km 러닝 시 정확한 경로와 거리, 평균 페이스가 기록됩니다.",
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true
        }
      ],
      [
        "expo-sensors",
        {
          motionPermission: "걸음 수 측정 및 러닝 페이스 분석을 위해 동작 및 피트니스 데이터를 사용합니다."
        }
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash.png",
          resizeMode: "cover",
          backgroundColor: "#F5F5F5"
        }
      ],
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?
            `com.googleusercontent.apps.${process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.split('-')[0]}-${process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.split('-')[1]}` :
            "com.googleusercontent.apps.620303212609-581f7f3bgj104gtaermbtjqqf8u6khb8"
        }
      ],
      [
        "expo-asset",
        {
          "assets": ["./assets/fonts"]
        }
      ],
      [
        "@sentry/react-native/expo",
        {
          "url": "https://sentry.io/",
          "project": "runtaeho",
          "organization": "runtaeho"
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      // 앱에서 접근 가능한 환경변수
      env: ENV,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      googleServerClientId: process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID,
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      enableDebug: process.env.EXPO_PUBLIC_ENABLE_DEBUG === 'true',
      enableLogging: process.env.EXPO_PUBLIC_ENABLE_LOGGING === 'true',
      eas: {
        projectId: "daaffe2d-52cf-427d-ad87-2b05cde55f58"
      }
    }
  }
};
