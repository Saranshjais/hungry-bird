import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, User as UserIcon, Mail, Phone, Save } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const { colorScheme } = useColorScheme();
  const darkMode = colorScheme === 'dark';

  const handleSave = async () => {
    if (!name || !email) {
      Alert.alert("Missing Fields", "Name and Email are required.");
      return;
    }

    setLoading(true);
    const res = await updateProfile(name.trim(), email.trim(), phone.trim());
    setLoading(false);

    if (res.success) {
      Alert.alert("Success", "Your profile has been updated.");
      router.back();
    } else {
      Alert.alert("Error", res.error || "Failed to update profile.");
    }
  };

  return (
    <View className="flex-1 bg-[#f8f9fa] dark:bg-stone-950">
      {/* Header */}
      <View className="pt-14 pb-4 px-6 bg-white dark:bg-stone-900 flex-row items-center justify-between border-b border-stone-200 dark:border-stone-800 shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-stone-100 dark:active:bg-stone-800">
          <ArrowLeft size={24} color={darkMode ? "#ffffff" : "#1c1917"} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-stone-900 dark:text-white">Edit Profile</Text>
        <View className="w-10 h-10" />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          
          <View className="items-center mb-8">
            <View className="w-24 h-24 bg-[#f3ebe1] dark:bg-stone-800 rounded-full items-center justify-center border-4 border-white dark:border-stone-900 shadow-sm relative">
              <Text className="text-4xl font-bold text-stone-800 dark:text-stone-200 uppercase">
                {name ? name.charAt(0) : 'U'}
              </Text>
            </View>
          </View>

          {/* Form Fields */}
          <View className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-sm border border-stone-200 dark:border-stone-800 mb-8">
            
            {/* Full Name */}
            <View className="mb-6">
              <Text className="text-stone-700 dark:text-stone-300 font-bold mb-2 ml-1 text-[13px] uppercase tracking-wider">Full Name</Text>
              <View className="flex-row items-center bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 h-14">
                <UserIcon size={20} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-3 text-stone-900 dark:text-white text-[15px]"
                  placeholder="John Doe"
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email Address */}
            <View className="mb-6">
              <Text className="text-stone-700 dark:text-stone-300 font-bold mb-2 ml-1 text-[13px] uppercase tracking-wider">Email Address</Text>
              <View className="flex-row items-center bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 h-14">
                <Mail size={20} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-3 text-stone-900 dark:text-white text-[15px]"
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Phone Number */}
            <View className="mb-2">
              <Text className="text-stone-700 dark:text-stone-300 font-bold mb-2 ml-1 text-[13px] uppercase tracking-wider">Phone Number</Text>
              <View className="flex-row items-center bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 h-14">
                <Phone size={20} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-3 text-stone-900 dark:text-white text-[15px]"
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#9ca3af"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

          </View>

          {/* Save Button */}
          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            className="w-full bg-[#eb6e4b] py-4 rounded-full flex-row justify-center items-center shadow-md elevation-3 mb-12 active:opacity-90"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Save size={20} color="white" />
                <Text className="text-white font-bold text-[16px] ml-2 tracking-wide">Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
