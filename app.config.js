// Environment-specific configuration
// .env.local (로컬 개발), .env.dev (개발 서버), .env.prod (운영)
const ENV = process.env.EXPO_PUBLIC_ENV || 'local';

export default {
  expo: {
    name: ENV === 'production' ? 'RunTaeho' : `RunTaeho (${ENV})`,
    slug: "app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "app",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: ENV === 'production'
        ? "com.hongtaeho.app"
        : `com.hongtaeho.app.${ENV}`,
      usesAppleSignIn: true,
      appleTeamId: "Y9XN2ZQ9G3",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "이 앱은 러닝 기록을 위해 위치 정보를 사용합니다.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "백그라운드에서 러닝 거리를 정확하게 기록하기 위해 항상 위치 정보가 필요합니다.",
        UIBackgroundModes: ["location"] // 백그라운드 위치 업데이트
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: ENV === 'production'
        ? "com.hongtaeho.app"
        : `com.hongtaeho.app.${ENV}`,
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION", // 백그라운드 위치 추적
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
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "백그라운드에서 러닝 거리를 정확하게 기록하기 위해 항상 위치 정보가 필요합니다.",
          locationAlwaysPermission: "백그라운드에서 러닝 거리를 정확하게 기록하기 위해 항상 위치 정보가 필요합니다.",
          locationWhenInUsePermission: "이 앱은 러닝 기록을 위해 위치 정보를 사용합니다.",
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true
        }
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
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
      // 민감하지 않은 설정만 여기에
    }
  }
};