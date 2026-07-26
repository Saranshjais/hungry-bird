import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Mail, Lock } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    
    const res = await login(email.trim(), password.trim());
    if (res.success) {
      router.replace('/(tabs)');
    } else {
      setError(res.error || 'Login failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-[#F7F7F9]"
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-10">
          <Text className="text-4xl font-manrope-extrabold text-gray-900 tracking-tight mb-2">
            Hungry<Text className="text-brand-500">Bird</Text>
          </Text>
          <Text className="text-gray-500 font-manrope-medium text-center">Welcome back! Sign in to find hidden gems.</Text>
        </View>

        <View className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100" style={{ elevation: 2 }}>
            {error ? (
              <View className="bg-red-50 p-3 rounded-xl mb-4 border border-red-100">
                <Text className="text-red-500 text-sm font-manrope-bold text-center">{error}</Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="text-gray-900 font-manrope-bold mb-2 ml-1 text-sm">Email Address</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 focus:border-brand-500 focus:bg-white h-14">
                <Mail size={20} color="#9CA3AF" />
                <TextInput
                  className="flex-1 font-manrope-medium text-[15px] text-gray-900 ml-3 h-full"
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                />
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-gray-900 font-manrope-bold mb-2 ml-1 text-sm">Password</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 focus:border-brand-500 focus:bg-white h-14">
                <Lock size={20} color="#9CA3AF" />
                <TextInput
                  className="flex-1 font-manrope-medium text-[15px] text-gray-900 ml-3 h-full"
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType="password"
                  autoComplete="password"
                />
              </View>
            </View>

            <TouchableOpacity 
              onPress={handleLogin}
              disabled={loading}
              className="w-full bg-brand-500 py-4 rounded-2xl flex-row justify-center items-center shadow-md shadow-brand-500/30"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text className="text-white font-manrope-bold text-base">Sign In</Text>
                  <ArrowRight size={18} color="#FFFFFF" className="ml-2" />
                </>
              )}
            </TouchableOpacity>
          </View>

        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-500 font-manrope-medium">Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text className="text-brand-500 font-manrope-bold">Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
