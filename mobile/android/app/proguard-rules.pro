# Picked up automatically by the Flutter Gradle plugin for release (R8) builds.

# Razorpay Checkout (razorpay_flutter) — rules from the plugin's README.
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** {*;}
-optimizations !method/inlining/
-keepclasseswithmembers class * {
  public void onPayment*(...);
}
