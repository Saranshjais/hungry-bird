import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, CheckCircle2, XCircle, MapPin } from 'lucide-react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useColorScheme } from 'nativewind';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.29.129.85:8082';

export default function UserSubmissionsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { colorScheme } = useColorScheme();
  const darkMode = colorScheme === 'dark';

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/user/submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmissions(res.data.submissions);
    } catch (err) {
      console.error(err);
      setError('Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = (status) => {
    if (status === 'pending') {
      return (
        <View className="flex-row items-center bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md border border-orange-200 dark:border-orange-800/30">
          <Clock size={12} color="#f97316" />
          <Text className="text-orange-500 font-bold text-[10px] uppercase ml-1 tracking-wider">Pending</Text>
        </View>
      );
    } else if (status === 'approved') {
      return (
        <View className="flex-row items-center bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/30">
          <CheckCircle2 size={12} color="#10b981" />
          <Text className="text-emerald-500 font-bold text-[10px] uppercase ml-1 tracking-wider">Approved</Text>
        </View>
      );
    } else {
      return (
        <View className="flex-row items-center bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md border border-red-200 dark:border-red-800/30">
          <XCircle size={12} color="#ef4444" />
          <Text className="text-red-500 font-bold text-[10px] uppercase ml-1 tracking-wider">Rejected</Text>
        </View>
      );
    }
  };

  return (
    <View className="flex-1 bg-[#f8f9fa] dark:bg-stone-950">
      {/* Header */}
      <View className="pt-14 pb-4 px-6 bg-white dark:bg-stone-900 flex-row items-center justify-between border-b border-stone-200 dark:border-stone-800 shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-stone-100 dark:active:bg-stone-800">
          <ArrowLeft size={24} color={darkMode ? "#ffffff" : "#1c1917"} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-stone-900 dark:text-white">My Submissions</Text>
        <View className="w-10 h-10" />
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <Text className="text-stone-500 dark:text-stone-400 text-sm mb-6 ml-2">Track the vendors you have submitted for verification.</Text>
        
        {loading ? (
          <View className="mt-20 items-center">
            <ActivityIndicator size="large" color="#f43f5e" />
          </View>
        ) : error ? (
          <View className="mt-10 items-center bg-red-50 p-4 rounded-xl border border-red-100">
            <Text className="text-red-500 font-medium">{error}</Text>
          </View>
        ) : submissions.length === 0 ? (
          <View className="mt-20 items-center px-6">
            <View className="w-24 h-24 bg-stone-100 dark:bg-stone-800 rounded-full items-center justify-center mb-6">
              <MapPin size={40} color={darkMode ? "#78716c" : "#d6d3d1"} />
            </View>
            <Text className="text-xl font-bold text-stone-800 dark:text-stone-200 mb-2">No submissions yet</Text>
            <Text className="text-stone-500 dark:text-stone-400 text-center mb-6 leading-5">You haven't submitted any hidden gems for verification. Help others discover great food!</Text>
            <TouchableOpacity 
              onPress={() => router.push('/submit-vendor')}
              className="bg-[#eb6e4b] px-6 py-3 rounded-xl shadow-sm elevation-2"
            >
              <Text className="text-white font-bold text-[15px]">Submit a Gem</Text>
            </TouchableOpacity>
          </View>
        ) : (
          submissions.map((sub, idx) => (
            <View key={sub.id} className={`bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm elevation-2 ${idx === submissions.length - 1 ? 'mb-10' : 'mb-4'}`}>
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-4">
                  <Text className="text-stone-900 dark:text-white font-bold text-[16px] mb-1 leading-5">{sub.stall_name}</Text>
                  <View className="flex-row items-center">
                    <MapPin size={12} color="#a8a29e" />
                    <Text className="text-stone-500 dark:text-stone-400 font-medium text-[12px] ml-1">{sub.city_name}</Text>
                  </View>
                </View>
                {renderStatus(sub.status)}
              </View>
              
              <View className="bg-stone-50 dark:bg-stone-800 p-3 rounded-xl border border-stone-100 dark:border-stone-700">
                <Text className="text-stone-600 dark:text-stone-300 text-sm"><Text className="font-semibold text-stone-700 dark:text-stone-200">Cuisine:</Text> {sub.cuisine_type || 'N/A'}</Text>
                <Text className="text-stone-400 dark:text-stone-500 text-[11px] mt-2 uppercase tracking-wider">Submitted {new Date(sub.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
