import 'dotenv/config';

export default {
  expo: {
    name: "app",
    slug: "app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "app",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.hongtaeho.app",
      usesAppleSignIn: true,
      appleTeamId: "Y9XN2ZQ9G3",
      googleServicesFile: "./GoogleService-Info.plist"
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
      package: "com.hongtaeho.app",
      googleServicesFile: "./google-services.json"
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
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
          iosUrlScheme: process.env.GOOGLE_CLIENT_ID ?
            `com.googleusercontent.apps.${process.env.GOOGLE_CLIENT_ID.split('-')[0]}-${process.env.GOOGLE_CLIENT_ID.split('-')[1]}` :
            "com.googleusercontent.apps.620303212609-581f7f3bgj104gtaermbtjqqf8u6khb8"
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      // 앱에서 접근 가능한 환경변수
      apiBaseUrl: process.env.API_BASE_URL,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      // 민감하지 않은 설정만 여기에
    }
  }
};