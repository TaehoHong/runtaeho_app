// Environment-specific configuration
// 앱 프로파일은 app-profiles.json, 서버 값은 app-profile.cjs에서 선택한다.
const ENV = process.env.EXPO_PUBLIC_ENV || 'local';
const { getProfile } = require('./scripts/app-profile.cjs');
const profile = getProfile(ENV);

// Version configuration from local package.json
const packageJson = require('./package.json');
const appVersion = packageJson.version;
const runtimeVersion = packageJson.config.runtimeVersion;
const googleMapsAndroidApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ||
  process.env.GOOGLE_MAPS_ANDROID_API_KEY;

export default {
  expo: {
    name: profile.name,
    slug: "runtaeho",
    version: appVersion,
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: profile.scheme,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    assetBundlePatterns: ["**/*"],
    // EAS Update 설정
    updates: {
      enabled: ENV !== 'local',
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
      url: "https://u.expo.dev/daaffe2d-52cf-427d-ad87-2b05cde55f58",
      requestHeaders: { 'expo-channel-name': profile.channel },
    },
    runtimeVersion: runtimeVersion,
    ios: {
      icon: "./assets/images/icon.png",
      supportsTablet: true,
      bundleIdentifier: profile.applicationId,
      usesAppleSignIn: true,
      appleTeamId: "3F893P33SC",
      infoPlist: {
        CFBundleLocalizations: ["ko", "ja"],
        NSLocationWhenInUseUsageDescription: "RunTaeho는 러닝 중 실시간으로 GPS 경로를 추적하고, 이동 거리와 페이스를 계산합니다.",
        NSMotionUsageDescription: "걸음 수 측정 및 러닝 페이스 분석을 위해 동작 및 피트니스 데이터를 사용합니다.",
        UIBackgroundModes: ["location"],
        GIDClientID: profile.iosClientId
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
      package: profile.applicationId,
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACTIVITY_RECOGNITION", // 동작 및 피트니스 (걸음 수)
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION" // Foreground Service (위치)
      ],
      ...(googleMapsAndroidApiKey
        ? {
            config: {
              googleMaps: {
                apiKey: googleMapsAndroidApiKey
              }
            }
          }
        : {})
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-notifications",
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
          locationAlwaysAndWhenInUsePermission: false,
          locationAlwaysPermission: false,
          locationWhenInUsePermission: "RunTaeho는 러닝 중 실시간으로 GPS 경로를 추적하고, 이동 거리와 페이스를 계산합니다. 예를 들어, 5km 러닝 시 정확한 경로와 거리, 평균 페이스가 기록됩니다.",
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: false,
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
          iosUrlScheme: profile.iosClientId.split('.').reverse().join('.')
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
      googleIosClientId: profile.iosClientId,
      googleServerClientId: process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID,
      googleAndroidClientId: profile.androidClientId,
      enableDebug: process.env.EXPO_PUBLIC_ENABLE_DEBUG === 'true',
      enableLogging: process.env.EXPO_PUBLIC_ENABLE_LOGGING === 'true',
      eas: {
        projectId: "daaffe2d-52cf-427d-ad87-2b05cde55f58"
      }
    }
  }
};
