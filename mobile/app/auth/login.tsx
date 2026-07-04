import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

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
    <View className="flex-1 bg-stone-50 dark:bg-stone-950 px-6 py-12 justify-center">
      <View className="items-center mb-10">
        <Text className="text-4xl font-extrabold text-stone-900 dark:text-white tracking-tight mb-2">
          Hungry<Text className="text-brand-500">Bird</Text>
        </Text>
        <Text className="text-stone-500 dark:text-stone-400 font-medium">Welcome back!</Text>
      </View>

      <View className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800">
        {error ? (
          <View className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl mb-4 border border-red-100 dark:border-red-800/30">
            <Text className="text-red-500 text-sm font-medium text-center">{error}</Text>
          </View>
        ) : null}

        <View className="mb-4">
          <Text className="text-stone-700 dark:text-stone-300 font-bold mb-2 ml-1 text-sm">Email Address</Text>
          <TextInput
            className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3.5 text-stone-900 dark:text-white focus:border-brand-500 focus:bg-white dark:focus:bg-stone-900 transition-colors"
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View className="mb-6">
          <Text className="text-stone-700 dark:text-stone-300 font-bold mb-2 ml-1 text-sm">Password</Text>
          <TextInput
            className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3.5 text-stone-900 dark:text-white focus:border-brand-500 focus:bg-white dark:focus:bg-stone-900 transition-colors"
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          onPress={handleLogin}
          disabled={loading}
          className="w-full bg-brand-500 py-3.5 rounded-xl flex-row justify-center items-center opacity-100 active:opacity-80"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Sign In</Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-center mt-8">
        <Text className="text-stone-500 dark:text-stone-400 font-medium">Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/auth/register')}>
          <Text className="text-brand-500 font-bold">Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
