import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, User as UserIcon, Bell, Lock, Shield, HelpCircle, ChevronRight, Moon, Globe, Send } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useColorScheme } from 'nativewind';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hungry-bird-jye4.onrender.com';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user, updateNotificationsPreference } = useAuth();
  
  const [notifications, setNotifications] = useState(user?.notifications_enabled ?? true);
  const [testingPush, setTestingPush] = useState(false);
  const { colorScheme, setColorScheme } = useColorScheme();
  const darkMode = colorScheme === 'dark';
  const toggleDarkMode = () => setColorScheme(darkMode ? 'light' : 'dark');

  return (
    <View className="flex-1 bg-[#f8f9fa] dark:bg-stone-950">
      {/* Header */}
      <View className="pt-14 pb-4 px-6 bg-white dark:bg-stone-900 flex-row items-center justify-between border-b border-stone-200 dark:border-stone-800 shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-stone-100 dark:active:bg-stone-800">
          <ArrowLeft size={24} color={darkMode ? "#ffffff" : "#1c1917"} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-stone-900 dark:text-white">Settings</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View className="bg-white dark:bg-stone-900 m-4 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-sm flex-row items-center">
          <View className="w-16 h-16 bg-[#f3ebe1] dark:bg-stone-800 rounded-full items-center justify-center border border-stone-200 dark:border-stone-700 mr-4">
            <Text className="text-2xl font-bold text-stone-800 dark:text-stone-200 uppercase">
              {user?.name?.charAt(0) || 'U'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-stone-900 dark:text-white font-bold text-lg mb-0.5">{user?.name}</Text>
            <Text className="text-stone-500 dark:text-stone-400 font-medium text-sm">{user?.email}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/user/edit-profile')}
            className="bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-full"
          >
            <Text className="text-stone-700 dark:text-stone-300 font-bold text-[11px] uppercase tracking-wider">Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <Text className="text-stone-500 dark:text-stone-400 font-bold text-[12px] uppercase tracking-wider ml-8 mb-2 mt-4">Preferences</Text>
        <View className="bg-white dark:bg-stone-900 border-y border-stone-200 dark:border-stone-800 mb-6">
          <View className="flex-row items-center justify-between px-6 py-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-full items-center justify-center mr-4">
                <Bell size={20} color="#3b82f6" />
              </View>
              <Text className="text-stone-900 dark:text-white font-bold text-[15px]">Push Notifications</Text>
            </View>
            <Switch 
              value={notifications} 
              onValueChange={async (val) => {
                setNotifications(val);
                await updateNotificationsPreference(val);
              }}
              trackColor={{ false: '#e7e5e4', true: '#eb6e4b' }}
              thumbColor={'#ffffff'}
            />
          </View>
          <View className="h-[1px] bg-stone-100 dark:bg-stone-800 mx-16" />
          <TouchableOpacity 
            onPress={async () => {
              setTestingPush(true);
              try {
                await axios.post(`${API_URL}/api/auth/test-push`);
                Alert.alert("Success", "Test push notification sent!");
              } catch (e: any) {
                Alert.alert("Error", e.response?.data?.error || "Could not send push notification");
              } finally {
                setTestingPush(false);
              }
            }}
            disabled={testingPush || !notifications}
            className={`flex-row items-center justify-between px-6 py-4 active:bg-stone-50 dark:active:bg-stone-800/50 ${!notifications && 'opacity-50'}`}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-full items-center justify-center mr-4">
                <Send size={20} color="#10b981" />
              </View>
              <Text className="text-stone-900 dark:text-white font-bold text-[15px]">Test Push Notification</Text>
            </View>
            <ChevronRight size={18} color="#d6d3d1" />
          </TouchableOpacity>
          <View className="h-[1px] bg-stone-100 dark:bg-stone-800 mx-16" />
          <View className="flex-row items-center justify-between px-6 py-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-full items-center justify-center mr-4">
                <Moon size={20} color="#6366f1" />
              </View>
              <Text className="text-stone-900 dark:text-white font-bold text-[15px]">Dark Mode</Text>
            </View>
            <Switch 
              value={darkMode} 
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#e7e5e4', true: '#eb6e4b' }}
              thumbColor={'#ffffff'}
            />
          </View>
          <View className="h-[1px] bg-stone-100 dark:bg-stone-800 mx-16" />
          <TouchableOpacity 
            className="flex-row items-center justify-between px-6 py-4 active:bg-stone-50 dark:active:bg-stone-800/50"
            onPress={() => Alert.alert("Language", "Multilingual support is coming soon!")}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-full items-center justify-center mr-4">
                <Globe size={20} color="#f97316" />
              </View>
              <Text className="text-stone-900 dark:text-white font-bold text-[15px]">Language</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-stone-500 dark:text-stone-400 font-medium text-sm mr-2">English</Text>
              <ChevronRight size={18} color="#d6d3d1" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <Text className="text-stone-500 dark:text-stone-400 font-bold text-[12px] uppercase tracking-wider ml-8 mb-2">Account</Text>
        <View className="bg-white dark:bg-stone-900 border-y border-stone-200 dark:border-stone-800 mb-6">
          <TouchableOpacity className="flex-row items-center justify-between px-6 py-4 active:bg-stone-50 dark:active:bg-stone-800/50">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-stone-100 dark:bg-stone-800 rounded-full items-center justify-center mr-4">
                <Lock size={20} color={darkMode ? "#a8a29e" : "#57534e"} />
              </View>
              <Text className="text-stone-900 dark:text-white font-bold text-[15px]">Change Password</Text>
            </View>
            <ChevronRight size={18} color="#d6d3d1" />
          </TouchableOpacity>
          <View className="h-[1px] bg-stone-100 dark:bg-stone-800 mx-16" />
          <TouchableOpacity 
            onPress={() => router.push('/user/privacy')}
            className="flex-row items-center justify-between px-6 py-4 active:bg-stone-50 dark:active:bg-stone-800/50"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-full items-center justify-center mr-4">
                <Shield size={20} color="#10b981" />
              </View>
              <Text className="text-stone-900 dark:text-white font-bold text-[15px]">Privacy & Security</Text>
            </View>
            <ChevronRight size={18} color="#d6d3d1" />
          </TouchableOpacity>
        </View>

        {/* Delete Account */}
        <TouchableOpacity className="mx-4 mt-4 mb-12">
          <Text className="text-red-500 font-bold text-center">Delete Account</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
