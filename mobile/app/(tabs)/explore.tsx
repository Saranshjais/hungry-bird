import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { Search, MapPin, ChevronRight, X, Heart, Star, Clock, Flame } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hungry-bird-jye4.onrender.com';

export default function ExploreScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popularLoading, setPopularLoading] = useState(true);
  const [popular, setPopular] = useState([]);
  const searchTimeout = useRef(null);

  const [currentCity, setCurrentCity] = useState('Locating...');
  const [locationGranted, setLocationGranted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setCurrentCity('Location Disabled');
          return;
        }
        
        setLocationGranted(true);
        let location = await Location.getCurrentPositionAsync({});
        let geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        
        if (geocode.length > 0) {
          const { city, region, country } = geocode[0];
          // E.g. "Mumbai, Maharashtra" or "Delhi, India"
          const displayLoc = city ? `${city}, ${region || country}` : (region || country || 'Unknown Location');
          setCurrentCity(displayLoc);
        } else {
          setCurrentCity('Unknown Location');
        }
      } catch (error) {
        console.error("Location error:", error);
        setCurrentCity('Location Error');
      }
    })();
  }, []);

  const bentoItems = [
    { id: 1, title: "Spicy", subtitle: "Fire it up", image: "https://wsrv.nl/?url=images.unsplash.com/photo-1564671165093-20688ff1fffa&w=400&fit=cover", large: true },
    { id: 2, title: "Healthy", subtitle: "Guilt-free", image: "https://wsrv.nl/?url=images.unsplash.com/photo-1512621776951-a57141f2eefd&w=300&fit=cover", large: false },
    { id: 3, title: "Sweet", subtitle: "Sugar rush", image: "https://wsrv.nl/?url=images.unsplash.com/photo-1551024601-bec78aea704b&w=300&fit=cover", large: false },
  ];

  useEffect(() => {
    // Fetch real popular/recent vendors from backend
    axios.get(`${API_URL}/api/home`)
      .then(res => {
        if (res.data && res.data.recent_vendors) {
          setPopular(res.data.recent_vendors);
        }
      })
      .catch(err => console.error("Error fetching popular feed:", err))
      .finally(() => setPopularLoading(false));
  }, []);

  const handleSearch = (text) => {
    setQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.trim().length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/search?q=${text}`);
        setResults(response.data.results || []);
      } catch (error) {
        console.error("Search failed:", error.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <View className="flex-1 bg-[#F9FAFB] dark:bg-[#121212]">
      {/* ── Fixed Header & Search ── */}
      <View className="px-6 pt-16 pb-4 bg-[#F9FAFB] dark:bg-[#121212] z-10">
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-stone-500 font-[Poppins_500Medium] text-sm mb-0.5">Location</Text>
            <View className="flex-row items-center">
              <MapPin size={16} color={locationGranted ? "#f97316" : "#a8a29e"} className="mr-1" />
              <Text className="text-stone-900 dark:text-white font-[Poppins_700Bold] text-base" numberOfLines={1} style={{ maxWidth: width * 0.5 }}>
                {currentCity}
              </Text>
              <ChevronRight size={16} color="#a8a29e" className="ml-1" />
            </View>
          </View>
          <Image 
            source={{ uri: 'https://ui-avatars.com/api/?name=Hungry+Bird&background=f97316&color=fff' }} 
            className="w-11 h-11 rounded-full border-2 border-white dark:border-stone-800 shadow-sm"
          />
        </View>

        <View className="flex-row items-center bg-white dark:bg-[#1E1E1E] rounded-2xl px-4 py-3.5 border border-stone-200/60 dark:border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <Search size={20} color="#f97316" />
          <TextInput
            value={query}
            onChangeText={handleSearch}
            placeholder="Search for restaurants or dishes..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 font-[Poppins_500Medium] text-stone-900 dark:text-white ml-3"
            style={{ fontSize: 15 }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} className="p-1">
              <X size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {query.length > 0 ? (
          /* ── Search Results ── */
          <View className="px-6 pt-4">
            <Text className="text-lg font-[Poppins_700Bold] text-stone-900 dark:text-white mb-4">Results</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#f97316" className="mt-8" />
            ) : results.length > 0 ? (
              <View className="flex-col gap-4">
                {results.map((vendor) => (
                  <TouchableOpacity 
                    key={vendor.id}
                    onPress={() => router.push(`/vendor/${vendor.id}`)}
                    className="flex-row bg-white dark:bg-[#1E1E1E] rounded-[20px] p-3 shadow-sm border border-stone-100 dark:border-white/5"
                  >
                    <Image 
                      source={{ uri: vendor.image_url || 'https://wsrv.nl/?url=images.unsplash.com/photo-1544145945-f90425340c7e&w=200&fit=cover' }}
                      className="w-[88px] h-[88px] rounded-[14px]"
                    />
                    <View className="flex-1 justify-center ml-4">
                      <Text className="font-[Poppins_700Bold] text-base text-stone-900 dark:text-white mb-0.5">{vendor.name}</Text>
                      <Text className="text-stone-500 font-[Poppins_500Medium] text-xs mb-2">{vendor.cuisine_type}</Text>
                      <View className="flex-row items-center">
                        <View className="flex-row items-center bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded flex-start mr-2">
                          <Star size={10} color="#f97316" className="mr-1" />
                          <Text className="text-orange-600 dark:text-orange-400 font-[Poppins_700Bold] text-[10px]">{vendor.avg_rating || '4.0'}</Text>
                        </View>
                        <Text className="text-stone-400 font-[Poppins_500Medium] text-[11px]">{vendor.city_name}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View className="items-center py-16">
                <Search size={40} color="#E5E7EB" className="mb-4" />
                <Text className="text-stone-900 dark:text-white font-[Poppins_600SemiBold] text-lg">No results found</Text>
                <Text className="text-stone-500 font-[Poppins_500Medium] text-sm mt-1">Try searching for "pizza" or "burger"</Text>
              </View>
            )}
          </View>
        ) : (
          /* ── Bento Box Layout ── */
          <View className="pt-2">
            
            {/* Bento Grid */}
            <View className="px-6 mb-8">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-[Poppins_700Bold] text-stone-900 dark:text-white tracking-tight">Explore Categories</Text>
              </View>
              
              <View className="flex-row gap-3 h-[220px]">
                {/* Large Left Box */}
                <TouchableOpacity className="flex-1 rounded-[24px] overflow-hidden relative shadow-sm">
                  <Image source={{ uri: bentoItems[0].image }} className="w-full h-full absolute" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} className="absolute inset-0" />
                  <View className="absolute top-4 left-4 bg-white/20 backdrop-blur-md rounded-full px-2.5 py-1">
                    <Flame size={12} color="#fff" />
                  </View>
                  <View className="absolute bottom-4 left-4 right-4">
                    <Text className="text-white font-[Poppins_700Bold] text-lg">{bentoItems[0].title}</Text>
                    <Text className="text-white/80 font-[Poppins_500Medium] text-xs">{bentoItems[0].subtitle}</Text>
                  </View>
                </TouchableOpacity>

                {/* Stacked Right Boxes */}
                <View className="flex-1 flex-col gap-3">
                  {bentoItems.slice(1).map((item) => (
                    <TouchableOpacity key={item.id} className="flex-1 rounded-[24px] overflow-hidden relative shadow-sm">
                      <Image source={{ uri: item.image }} className="w-full h-full absolute" />
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} className="absolute inset-0" />
                      <View className="absolute bottom-3 left-3 right-3">
                        <Text className="text-white font-[Poppins_700Bold] text-sm">{item.title}</Text>
                        <Text className="text-white/80 font-[Poppins_500Medium] text-[10px]">{item.subtitle}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Edge-to-Edge Cards */}
            <View className="mb-6">
              <View className="px-6 flex-row items-center justify-between mb-4">
                <Text className="text-xl font-[Poppins_700Bold] text-stone-900 dark:text-white tracking-tight">Popular Near You</Text>
              </View>
              
              <View className="flex-col gap-6">
                {popularLoading ? (
                  <ActivityIndicator size="large" color="#f97316" className="mt-8" />
                ) : popular.map((item, idx) => (
                  <TouchableOpacity key={item.id} onPress={() => router.push(`/vendor/${item.id}`)} className="w-full px-6">
                    <View className="w-full h-[200px] rounded-[24px] overflow-hidden shadow-sm relative mb-3">
                      <Image source={{ uri: item.image_url || 'https://wsrv.nl/?url=images.unsplash.com/photo-1544145945-f90425340c7e&w=800&fit=cover' }} className="w-full h-full absolute" />
                      <TouchableOpacity className="absolute top-4 right-4 w-9 h-9 bg-white/20 backdrop-blur-md rounded-full items-center justify-center border border-white/20">
                        <Heart size={18} color="#fff" />
                      </TouchableOpacity>
                      
                      {/* Glassmorphism ETA Badge */}
                      <View className="absolute bottom-4 left-4 bg-white/90 dark:bg-black/70 backdrop-blur-md rounded-xl px-3 py-1.5 flex-row items-center shadow-sm">
                        <Clock size={12} color="#f97316" className="mr-1.5" />
                        <Text className="font-[Poppins_700Bold] text-stone-900 dark:text-white text-xs">{item.time || "20-30 min"}</Text>
                      </View>
                    </View>

                    <View className="flex-row items-start justify-between px-1">
                      <View className="flex-1 pr-2">
                        <Text className="font-[Poppins_700Bold] text-lg text-stone-900 dark:text-white mb-0.5" numberOfLines={1}>{item.name}</Text>
                        <Text className="text-stone-500 font-[Poppins_500Medium] text-sm">{item.area || item.loc || 'Local'}</Text>
                      </View>
                      <View className="bg-orange-50 dark:bg-orange-500/10 px-2 py-1.5 rounded-lg flex-row items-center">
                        <Text className="text-orange-600 dark:text-orange-400 font-[Poppins_700Bold] text-sm mr-1">{item.rating || '4.0'}</Text>
                        <Star size={12} color="#f97316" fill="#f97316" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </View>
        )}
      </ScrollView>
    </View>
  );
}
