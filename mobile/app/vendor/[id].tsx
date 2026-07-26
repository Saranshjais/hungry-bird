import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Image, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import axios from 'axios';
import { Heart, Bookmark, MapPin, Navigation, Star, Map as MapIcon, Share2 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import MapView, { Marker } from 'react-native-maps';
import * as Linking from 'expo-linking';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hungry-bird-jye4.onrender.com';

export default function VendorScreen() {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    axios.get(`${API_URL}/api/vendors/${id}`)
      .then(res => setData(res.data))
      .catch(err => console.error("Vendor feed error:", err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 bg-[#F7F7F9] items-center justify-center">
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  if (!data || !data.vendor) {
    return (
      <View className="flex-1 bg-[#F7F7F9] items-center justify-center">
        <Text className="text-gray-500 font-manrope-medium">Failed to load vendor.</Text>
      </View>
    );
  }

  const { vendor, reviews } = data;
  const lat = vendor.lat || vendor.latitude;
  const lng = vendor.lng || vendor.longitude;

  const getDirections = () => {
    if (!lat || !lng) {
      Alert.alert('Error', 'Location coordinates are missing for this vendor.');
      return;
    }
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
      web: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    });
    if (url) Linking.openURL(url);
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerTitle: '',
          headerTransparent: true,
          headerTintColor: '#fff',
          headerRight: () => (
            <View className="flex-row gap-2 mr-2">
              <TouchableOpacity className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full items-center justify-center">
                <Share2 size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full items-center justify-center">
                <Heart size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )
        }} 
      />
      <ScrollView className="flex-1 bg-[#F7F7F9]" showsVerticalScrollIndicator={false}>
        
        {/* ── Hero Image ── */}
        <View className="w-full relative h-72 bg-gray-900">
          <Image 
            source={{ uri: vendor.image_url || 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800' }}
            className="absolute w-full h-full opacity-80"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <View className="absolute bottom-0 left-0 right-0 px-5 pb-6">
            <View className="flex-row items-center bg-white/20 self-start px-3 py-1 rounded-full mb-3 backdrop-blur-md">
              <Star size={14} color="#FF5A5F" fill="#FF5A5F" />
              <Text className="font-manrope-bold text-white text-xs ml-1">
                {vendor.rating ? vendor.rating.toFixed(1) : '4.5'}
              </Text>
              <Text className="font-manrope-medium text-white/80 text-xs ml-1">
                ({vendor.review_count || 12} reviews)
              </Text>
            </View>
            <Text className="text-white font-manrope-extrabold text-3xl mb-1">{vendor.name}</Text>
            <Text className="text-white/90 font-manrope-medium text-[15px]">
              {vendor.cuisine_type || 'Street Food'} • {vendor.area || vendor.city_name}
            </Text>
          </View>
        </View>

        {/* ── Content ── */}
        <View className="p-5">
          
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6" style={{ elevation: 2 }}>
            <View className="flex-row items-start mb-4 border-b border-gray-100 pb-4">
              <MapPin size={24} color="#FF5A5F" className="mt-1" />
              <View className="ml-3 flex-1">
                <Text className="font-manrope-bold text-gray-900 text-[16px] mb-1">Location</Text>
                <Text className="font-manrope-medium text-gray-600 text-[14px] leading-5">
                  {vendor.address_text || vendor.address || 'Address not available.'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-start mb-4 border-b border-gray-100 pb-4">
              <Star size={24} color="#FF5A5F" className="mt-1" />
              <View className="ml-3 flex-1">
                <Text className="font-manrope-bold text-gray-900 text-[16px] mb-1">About</Text>
                <Text className="font-manrope-medium text-gray-600 text-[14px] leading-5">
                  {vendor.description || 'Famous local stall serving authentic street snacks.'}
                </Text>
              </View>
            </View>

            {/* Huge Directions Button */}
            <TouchableOpacity 
              onPress={getDirections}
              className="bg-brand-500 rounded-2xl py-4 flex-row items-center justify-center mt-2 shadow-md shadow-brand-500/30"
              style={{ elevation: 4 }}
            >
              <Navigation size={20} color="#FFF" />
              <Text className="font-manrope-bold text-white text-[16px] ml-2">Get Directions</Text>
            </TouchableOpacity>
          </View>

          {/* ── Mini Map ── */}
          {lat && lng && Platform.OS !== 'web' && (
            <View className="mb-6">
              <Text className="font-manrope-bold text-xl text-gray-900 mb-4 px-1">Map View</Text>
              <View className="h-48 w-full rounded-3xl overflow-hidden shadow-sm border border-gray-200">
                <MapView 
                  style={{ flex: 1 }}
                  initialRegion={{
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lng),
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker 
                    coordinate={{ latitude: parseFloat(lat), longitude: parseFloat(lng) }}
                    title={vendor.name}
                  />
                </MapView>
              </View>
            </View>
          )}

          {/* ── Reviews ── */}
          <Text className="font-manrope-bold text-xl text-gray-900 mb-4 px-1">Reviews</Text>
          <View className="flex-col gap-4 mb-10">
            {reviews?.length > 0 ? reviews.map((review: any) => (
              <View key={review.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm" style={{ elevation: 1 }}>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-brand-50 items-center justify-center">
                      <Text className="font-manrope-bold text-brand-600 text-lg">
                        {review.user_name ? review.user_name.charAt(0).toUpperCase() : 'U'}
                      </Text>
                    </View>
                    <Text className="font-manrope-bold text-gray-900 ml-3">{review.user_name || 'User'}</Text>
                  </View>
                  <View className="flex-row items-center bg-brand-50 px-2 py-1 rounded-full">
                    <Star size={12} color="#FF5A5F" fill="#FF5A5F" />
                    <Text className="font-manrope-bold text-brand-600 text-xs ml-1">{review.rating}</Text>
                  </View>
                </View>
                <Text className="font-manrope-medium text-gray-600 text-[14px] leading-5">{review.comment}</Text>
              </View>
            )) : (
              <View className="bg-white p-6 rounded-3xl border border-gray-100 items-center">
                <Star size={32} color="#D1D5DB" className="mb-2" />
                <Text className="font-manrope-medium text-gray-500 text-center">Be the first to review this hidden gem!</Text>
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </>
  );
}
