import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Image, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import axios from 'axios';
import { Heart, Bookmark } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import MapView, { Marker } from 'react-native-maps';
import { Alert } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hungry-bird-jye4.onrender.com';

export default function VendorScreen() {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    axios.get(`${API_URL}/api/vendors/${id}`)
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        console.error("Vendor feed error:", err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 bg-stone-50 dark:bg-stone-950 items-center justify-center">
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 bg-stone-50 dark:bg-stone-950 items-center justify-center">
        <Text className="text-stone-500 dark:text-stone-400 font-medium">Failed to load vendor.</Text>
      </View>
    );
  }

  const { vendor, reviews } = data;

  return (
    <>
      <Stack.Screen 
        options={{
          headerRight: () => (
            <View className="flex-row gap-3 mr-2">
              <TouchableOpacity 
                onPress={async () => {
                  try {
                    await axios.post(`${API_URL}/api/favorites/toggle`, { vendor_id: vendor.id }, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    Alert.alert('Success', 'Favorite toggled!');
                  } catch (e) { Alert.alert('Error', 'Please log in first.'); }
                }}
                className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full items-center justify-center"
              >
                <Heart size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={async () => {
                  try {
                    await axios.post(`${API_URL}/api/saved/toggle`, { vendor_id: vendor.id }, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    Alert.alert('Success', 'Saved toggled!');
                  } catch (e) { Alert.alert('Error', 'Please log in first.'); }
                }}
                className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full items-center justify-center"
              >
                <Bookmark size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )
        }} 
      />
      <ScrollView className="flex-1 bg-stone-50 dark:bg-stone-950" showsVerticalScrollIndicator={false}>
        <View className="w-full relative bg-stone-900" style={{ height: 300 }}>
        <Image 
          source={{ uri: vendor.image_url || 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800' }}
          className="absolute w-full h-full opacity-70"
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-stone-900/40" />

        <View className="absolute inset-0 flex-col justify-end px-5 pb-8" pointerEvents="box-none">
          <Text className="text-white font-extrabold text-3xl mb-1">{vendor.name}</Text>
          <Text className="text-brand-500 font-bold text-sm mb-1">
            ★ {vendor.rating ? vendor.rating.toFixed(1) : 'New'} ({vendor.review_count} reviews)
          </Text>
          <Text className="text-stone-200 font-medium text-sm">
            {vendor.cuisine_type || 'Street Food'} • {vendor.area}
          </Text>
        </View>
      </View>

      <View className="p-5">
        <Text className="text-xl font-extrabold text-stone-900 dark:text-white mb-3">About</Text>
        <Text className="text-stone-600 dark:text-stone-300 text-[15px] leading-6 mb-6">
          {vendor.description || 'No description available for this vendor.'}
        </Text>
        
        <Text className="text-xl font-extrabold text-stone-900 dark:text-white mb-3">Location</Text>
        <Text className="text-stone-600 dark:text-stone-300 text-[15px] leading-6 mb-4">
          {vendor.address_text || vendor.address || 'Address not available.'}
        </Text>

        {vendor.lat && vendor.lng && Platform.OS !== 'web' && MapView && Marker ? (
          <View className="h-48 w-full rounded-2xl overflow-hidden mb-6 border border-stone-200 dark:border-stone-800">
            <MapView 
              style={{ flex: 1 }}
              initialRegion={{
                latitude: vendor.lat,
                longitude: vendor.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker 
                coordinate={{ latitude: vendor.lat, longitude: vendor.lng }}
                title={vendor.name}
                description={vendor.cuisine_type}
              />
            </MapView>
          </View>
        ) : vendor.lat && vendor.lng ? (
          <View className="h-48 w-full rounded-2xl overflow-hidden mb-6 border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 items-center justify-center">
            <Text className="text-stone-500 dark:text-stone-400 font-medium">Map view not supported on Web</Text>
          </View>
        ) : null}

        <Text className="text-xl font-extrabold text-stone-900 dark:text-white mb-3">Reviews</Text>
        <View className="flex-col gap-4">
          {reviews?.length > 0 ? reviews.map(review => (
            <View key={review.id} className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
              <View className="flex-row items-center mb-2">
                <Text className="font-bold text-stone-900 dark:text-white flex-1">{review.user_name}</Text>
                <Text className="text-brand-500 font-bold text-xs">★ {review.rating}</Text>
              </View>
              <Text className="text-stone-600 dark:text-stone-300 text-sm leading-5">{review.comment}</Text>
            </View>
          )) : (
            <Text className="text-stone-500 dark:text-stone-400 italic">No reviews yet.</Text>
          )}
        </View>
      </View>
      </ScrollView>
    </>
  );
}
