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

# Lottie
-keep class com.airbnb.lottie.** { *; }

# React Native SVG
-keep class com.horcrux.svg.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Expo Audio, Notifications & Speech Recognition
-keep class expo.modules.audio.** { *; }
-keep class expo.modules.notifications.** { *; }
-keep class expo.modules.speechrecognition.** { *; }

# Keep all native JNI methods
-keepclasseswithmembers class * {
    native <methods>;
}
