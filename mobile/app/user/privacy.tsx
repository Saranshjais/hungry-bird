import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useAuth } from '../../context/AuthContext';

export default function PrivacyScreen() {
  const router = useRouter();
  const { deleteAccount } = useAuth();
  const { colorScheme } = useColorScheme();
  const darkMode = colorScheme === 'dark';

  return (
    <View className="flex-1 bg-[#f8f9fa] dark:bg-stone-950">
      {/* Header */}
      <View className="pt-14 pb-4 px-6 bg-white dark:bg-stone-900 flex-row items-center justify-between border-b border-stone-200 dark:border-stone-800 shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-stone-100 dark:active:bg-stone-800">
          <ArrowLeft size={24} color={darkMode ? "#ffffff" : "#1c1917"} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-stone-900 dark:text-white">Privacy & Security</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View className="bg-emerald-50 dark:bg-emerald-900/20 m-4 rounded-3xl p-6 border border-emerald-100 dark:border-emerald-900/30 items-center">
          <View className="w-16 h-16 bg-emerald-100 dark:bg-emerald-800/50 rounded-full items-center justify-center mb-4">
            <Shield size={32} color="#10b981" />
          </View>
          <Text className="text-emerald-800 dark:text-emerald-400 font-bold text-lg text-center mb-2">Your Privacy Matters</Text>
          <Text className="text-emerald-600 dark:text-emerald-500 text-center text-[13px] leading-5">
            We are committed to protecting your personal information and ensuring your data is secure.
          </Text>
        </View>

        {/* Security Checklist */}
        <Text className="text-stone-500 dark:text-stone-400 font-bold text-[12px] uppercase tracking-wider ml-8 mb-2 mt-2">Security Status</Text>
        <View className="bg-white dark:bg-stone-900 border-y border-stone-200 dark:border-stone-800 mb-6 py-2">
          <View className="flex-row items-center px-6 py-3">
            <CheckCircle2 size={20} color="#10b981" />
            <Text className="text-stone-800 dark:text-stone-200 font-medium ml-3 text-[15px]">Data Encryption Active</Text>
          </View>
          <View className="flex-row items-center px-6 py-3">
            <CheckCircle2 size={20} color="#10b981" />
            <Text className="text-stone-800 dark:text-stone-200 font-medium ml-3 text-[15px]">Secure Location Services</Text>
          </View>
        </View>

        {/* Policies */}
        <Text className="text-stone-500 dark:text-stone-400 font-bold text-[12px] uppercase tracking-wider ml-8 mb-2">Policies</Text>
        <View className="bg-white dark:bg-stone-900 border-y border-stone-200 dark:border-stone-800 mb-6">
          <View className="px-6 py-5 border-b border-stone-100 dark:border-stone-800">
            <View className="flex-row items-center mb-2">
              <Eye size={18} color={darkMode ? "#a8a29e" : "#57534e"} />
              <Text className="text-stone-900 dark:text-white font-bold text-[15px] ml-2">Data Collection</Text>
            </View>
            <Text className="text-stone-500 dark:text-stone-400 text-[14px] leading-5 ml-6">
              We only collect data necessary to provide you with local vendor recommendations, such as your approximate location and search history.
            </Text>
          </View>

          <View className="px-6 py-5 border-b border-stone-100 dark:border-stone-800">
            <View className="flex-row items-center mb-2">
              <Lock size={18} color={darkMode ? "#a8a29e" : "#57534e"} />
              <Text className="text-stone-900 dark:text-white font-bold text-[15px] ml-2">Data Sharing</Text>
            </View>
            <Text className="text-stone-500 dark:text-stone-400 text-[14px] leading-5 ml-6">
              We do not sell your personal data to third parties. Your data is strictly used to improve your Hungry Bird experience.
            </Text>
          </View>

          <View className="px-6 py-5">
            <View className="flex-row items-center mb-2">
              <FileText size={18} color={darkMode ? "#a8a29e" : "#57534e"} />
              <Text className="text-stone-900 dark:text-white font-bold text-[15px] ml-2">Terms of Service</Text>
            </View>
            <Text className="text-stone-500 dark:text-stone-400 text-[14px] leading-5 ml-6">
              By using Hungry Bird, you agree to our Terms of Service. You can request account deletion at any time by contacting support.
            </Text>
          </View>
        </View>
        
        {/* Contact Support */}
        <TouchableOpacity 
          onPress={() => {
            Alert.alert(
              "Delete Account",
              "Are you sure you want to permanently delete your account? This action cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Delete", 
                  style: "destructive",
                  onPress: async () => {
                    const res = await deleteAccount();
                    if (res.success) {
                      Alert.alert("Account Deleted", "Your account has been successfully deleted.");
                      router.replace('/(auth)/login');
                    } else {
                      Alert.alert("Error", res.error || "Failed to delete account");
                    }
                  }
                }
              ]
            );
          }}
          className="bg-red-50 dark:bg-red-900/20 mx-4 mb-8 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 items-center justify-center shadow-sm"
        >
          <Text className="text-red-600 font-bold text-[15px]">Request Account Deletion</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
