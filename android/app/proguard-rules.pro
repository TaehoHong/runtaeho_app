# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Unity JNI Bridge - Keep all classes called from Unity C# via AndroidJavaClass
# These classes are accessed via JNI from Unity and must not be obfuscated or stripped
-keep class com.hongtaeho.app.unity.** { *; }
-keepclassmembers class com.hongtaeho.app.unity.** {
    public static <methods>;
}

# Specifically keep UnityNativeBridge for JNI access from Unity C#
-keep class com.hongtaeho.app.unity.UnityNativeBridge {
    public static void notifyCharactorReady();
    public static void onCharactorReady();
}

# Keep UnityHolder for message passing between React Native and Unity
-keep class com.hongtaeho.app.unity.UnityHolder {
    public static *** *;
}
