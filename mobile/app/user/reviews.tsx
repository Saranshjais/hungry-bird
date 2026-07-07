import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Star, MapPin } from 'lucide-react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useColorScheme } from 'nativewind';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.221.208.85:8082';

export default function UserReviewsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { colorScheme } = useColorScheme();
  const darkMode = colorScheme === 'dark';

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/user/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(res.data.reviews);
    } catch (err) {
      console.error(err);
      setError('Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            size={14} 
            color={star <= rating ? "#f59e0b" : (darkMode ? "#44403c" : "#e5e7eb")} 
            fill={star <= rating ? "#f59e0b" : "transparent"} 
          />
        ))}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#f8f9fa] dark:bg-stone-950">
      {/* Header */}
      <View className="pt-14 pb-4 px-6 bg-white dark:bg-stone-900 flex-row items-center justify-between border-b border-stone-200 dark:border-stone-800 shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-stone-100 dark:active:bg-stone-800">
          <ArrowLeft size={24} color={darkMode ? "#ffffff" : "#1c1917"} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-stone-900 dark:text-white">My Reviews</Text>
        <View className="w-10 h-10" />
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <Text className="text-stone-500 dark:text-stone-400 text-sm mb-6 ml-2">History of the ratings and reviews you've shared.</Text>
        
        {loading ? (
          <View className="mt-20 items-center">
            <ActivityIndicator size="large" color="#f43f5e" />
          </View>
        ) : error ? (
          <View className="mt-10 items-center bg-red-50 p-4 rounded-xl border border-red-100">
            <Text className="text-red-500 font-medium">{error}</Text>
          </View>
        ) : reviews.length === 0 ? (
          <View className="mt-20 items-center px-6">
            <View className="w-24 h-24 bg-stone-100 dark:bg-stone-800 rounded-full items-center justify-center mb-6">
              <Star size={40} color={darkMode ? "#78716c" : "#d6d3d1"} />
            </View>
            <Text className="text-xl font-bold text-stone-800 dark:text-stone-200 mb-2">No reviews yet</Text>
            <Text className="text-stone-500 dark:text-stone-400 text-center mb-6 leading-5">You haven't rated any vendors yet. Explore hidden gems and leave your feedback!</Text>
            <TouchableOpacity 
              onPress={() => router.push('/(tabs)')}
              className="bg-[#eb6e4b] px-6 py-3 rounded-xl shadow-sm elevation-2"
            >
              <Text className="text-white font-bold text-[15px]">Explore Vendors</Text>
            </TouchableOpacity>
          </View>
        ) : (
          reviews.map((review, idx) => (
            <View key={review.id} className={`bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm elevation-2 ${idx === reviews.length - 1 ? 'mb-10' : 'mb-4'}`}>
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 pr-4">
                  <Text className="text-stone-900 dark:text-white font-bold text-[16px] mb-1 leading-5">{review.vendor_name}</Text>
                  <View className="flex-row items-center">
                    <MapPin size={12} color="#a8a29e" />
                    <Text className="text-stone-500 dark:text-stone-400 font-medium text-[12px] ml-1">{review.city_name}</Text>
                  </View>
                </View>
                {renderStars(review.rating_value)}
              </View>
              
              {review.review_text && (
                <View className="bg-stone-50 dark:bg-stone-800 p-3 rounded-xl border border-stone-100 dark:border-stone-700 mt-2">
                  <Text className="text-stone-600 dark:text-stone-300 text-sm italic">"{review.review_text}"</Text>
                </View>
              )}
              <Text className="text-stone-400 dark:text-stone-500 text-[11px] mt-3 uppercase tracking-wider">Reviewed {new Date(review.created_at).toLocaleDateString()}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
