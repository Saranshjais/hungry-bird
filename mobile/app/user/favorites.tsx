import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, MapPin, Star, Heart } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.29.129.85:8082';

export default function FavoritesScreen() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const { colorScheme } = useColorScheme();
  const darkMode = colorScheme === 'dark';

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const res = await fetch(`${API_URL}/api/favorites`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (vendorId) => {
    try {
      setFavorites(prev => prev.filter(v => v.id !== vendorId));
      await fetch(`${API_URL}/api/favorites/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vendor_id: vendorId })
      });
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };

  const renderItem = ({ item }) => (
    <View className="bg-white dark:bg-stone-900 mx-4 mb-4 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800">
      <TouchableOpacity 
        onPress={() => router.push(`/vendor/${item.id}`)}
        className="flex-row p-3"
      >
        <Image 
          source={{ uri: item.image_url || 'https://via.placeholder.com/150' }}
          className="w-24 h-24 rounded-xl"
        />
        <View className="flex-1 ml-3 justify-center">
          <View className="flex-row justify-between items-start">
            <Text className="text-stone-900 dark:text-white font-bold text-lg mb-1 flex-1 pr-2" numberOfLines={1}>{item.name}</Text>
            <TouchableOpacity onPress={() => removeFavorite(item.id)} className="p-1">
              <Heart size={20} color="#ef4444" fill="#ef4444" />
            </TouchableOpacity>
          </View>
          
          <Text className="text-stone-500 dark:text-stone-400 font-medium text-xs mb-2">{item.cuisine_type}</Text>
          
          <View className="flex-row items-center justify-between mt-auto">
            <View className="flex-row items-center">
              <MapPin size={12} color="#a8a29e" />
              <Text className="text-stone-400 dark:text-stone-500 font-medium text-xs ml-1">{item.city_name}</Text>
            </View>
            <View className="flex-row items-center bg-green-50 px-2 py-0.5 rounded-full">
              <Star size={10} color="#16a34a" fill="#16a34a" />
              <Text className="text-green-700 font-bold text-xs ml-1">{item.rating?.toFixed(1) || 'New'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-[#f8f9fa] dark:bg-stone-950">
      {/* Header */}
      <View className="pt-14 pb-4 px-4 bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full bg-stone-50 dark:bg-stone-800">
          <ChevronLeft size={24} color={darkMode ? "#ffffff" : "#444"} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-stone-900 dark:text-white ml-4">My Favorites</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : favorites.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <View className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full items-center justify-center mb-4">
            <Heart size={32} color="#ef4444" />
          </View>
          <Text className="text-stone-900 dark:text-white font-bold text-lg mb-2">No favorites yet</Text>
          <Text className="text-stone-500 dark:text-stone-400 text-center">Tap the heart icon on any vendor to add them to your favorites.</Text>
        </View>
      ) : (
        <FlatList 
          data={favorites}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
