import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.29.129.85:8082';

export default function CityScreen() {
  const { slug } = useLocalSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    axios.get(`${API_URL}/api/city/${slug}`)
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        console.error("City feed error:", err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

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
        <Text className="text-stone-500 dark:text-stone-400 font-medium">Failed to load city.</Text>
      </View>
    );
  }

  const { city, vendors } = data;

  return (
    <ScrollView className="flex-1 bg-stone-50 dark:bg-stone-950" showsVerticalScrollIndicator={false}>
      <View className="w-full relative bg-stone-900" style={{ height: 250 }}>
        <Image 
          source={{ uri: `http://172.29.129.85:3000/city-${city.slug}.png` }}
          defaultSource={{ uri: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800' }}
          className="absolute w-full h-full opacity-60"
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-stone-900/40" />
        <View className="absolute inset-0 flex-col justify-end px-5 pb-8">
          <Text className="text-white font-extrabold text-3xl mb-1">{city.name}</Text>
          <Text className="text-stone-200 font-medium text-sm">
            {vendors.length} hidden gems to discover
          </Text>
        </View>
      </View>

      <View className="p-5">
        <Text className="text-xl font-extrabold text-stone-900 dark:text-white mb-4">Top Spots</Text>
        <View className="flex-col gap-4">
          {vendors.map(vendor => (
            <TouchableOpacity 
              key={vendor.id}
              onPress={() => router.push(`/vendor/${vendor.id}`)}
              className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm"
            >
              <Image 
                source={{ uri: vendor.image_url || 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=400' }}
                className="w-full h-40 bg-stone-100 dark:bg-stone-800"
              />
              <View className="p-4">
                <Text className="font-extrabold text-stone-900 dark:text-white text-[17px] mb-1">
                  {vendor.name}
                </Text>
                <Text className="text-stone-500 dark:text-stone-400 text-sm font-medium mb-2">
                  {vendor.cuisine_type || 'Street Food'} • {vendor.area}
                </Text>
                <Text className="text-brand-500 font-bold text-sm">
                  ★ {vendor.rating ? vendor.rating.toFixed(1) : 'New'} ({vendor.review_count} reviews)
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
