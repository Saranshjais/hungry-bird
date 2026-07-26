import { useEffect, useState, useRef } from 'react';
import { ScrollView, View, Text, Image, TouchableOpacity, ActivityIndicator, TextInput, Platform, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { MapPin, Search, Star, ChevronDown, Flame, Coffee, Cake, UtensilsCrossed, Navigation, ChevronRight, X } from 'lucide-react-native';
import * as Location from 'expo-location';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hungry-bird-jye4.onrender.com';

export default function HomeScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [longLoading, setLongLoading] = useState(false);
  const [locationName, setLocationName] = useState('Locating...');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const fetchLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName('Delhi'); // Default if denied
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      if (reverseGeocode.length > 0) {
        const loc = reverseGeocode[0];
        setLocationName(loc.city || loc.subregion || loc.region || 'Current Location');
      }
    } catch (e) {
      setLocationName('Delhi');
    }
  };

  useEffect(() => {
    fetchLocation();
    
    // Timer to detect long loads (Render cold start)
    const timer = setTimeout(() => {
      setLongLoading(true);
    }, 5000);

    axios.get(`${API_URL}/api/home`)
      .then(res => setData(res.data))
      .catch(err => console.error("Home feed error:", err.message))
      .finally(() => {
        clearTimeout(timer);
        setLoading(false);
      });
  }, []);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/search?q=${text}`);
        setSearchResults(response.data.results || []);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#F7F7F9] items-center justify-center">
        <ActivityIndicator size="large" color="#FF5A5F" />
        {longLoading && (
          <Text className="mt-4 font-manrope-medium text-gray-500 text-center px-8">
            Waking up the server...{'\n'}This can take up to 50 seconds on the first load.
          </Text>
        )}
      </View>
    );
  }

  const vendors = data?.recent_vendors || [];

  return (
    <View className="flex-1 bg-[#F7F7F9]">
      {/* ── Search Bar Section ── */}
      <View className="bg-white pt-16 pb-4 px-5 border-b border-gray-100 z-10" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
        <View className="flex-row items-center bg-white border border-gray-200 rounded-full pr-2 pl-4 py-1.5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
          <TouchableOpacity className="flex-row items-center border-r border-gray-200 pr-3 mr-3 h-10">
            <MapPin size={18} color="#FF5A5F" fill="#FF5A5F" className="mr-1" />
            <Text className="font-manrope-bold text-sm text-gray-900">{locationName}</Text>
            <ChevronDown size={16} color="#9CA3AF" className="ml-1" />
          </TouchableOpacity>
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search Chaat, Momos..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 font-manrope-medium text-[15px] h-10 text-gray-900"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }} className="w-9 h-9 items-center justify-center bg-gray-100 rounded-full">
              <X size={18} color="#6B7280" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity className="w-10 h-10 items-center justify-center bg-brand-500 rounded-full">
              <Search size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* If Searching */}
        {searchQuery.length > 0 ? (
          <View className="px-5 py-6">
            <Text className="font-manrope-bold text-lg text-gray-900 mb-4">Search Results</Text>
            {isSearching ? (
              <ActivityIndicator size="large" color="#FF5A5F" />
            ) : searchResults.length > 0 ? (
              searchResults.map((vendor: any) => (
                <TouchableOpacity 
                  key={vendor.id}
                  onPress={() => router.push(`/vendor/${vendor.id}`)}
                  className="bg-white rounded-2xl p-3 flex-row items-center mb-3 border border-gray-100"
                >
                  <Image source={{ uri: vendor.image_url }} className="w-16 h-16 rounded-xl bg-gray-100" />
                  <View className="flex-1 ml-3">
                    <Text className="font-manrope-bold text-[15px] text-gray-900">{vendor.name}</Text>
                    <Text className="font-manrope-medium text-[13px] text-gray-500 mt-0.5">{vendor.cuisine_type}</Text>
                    <View className="flex-row items-center mt-1">
                      <Star size={12} color="#FF5A5F" fill="#FF5A5F" />
                      <Text className="font-manrope-bold text-[11px] text-gray-900 ml-1">4.5</Text>
                      <Text className="font-manrope-medium text-[11px] text-gray-400 mx-1">•</Text>
                      <Text className="font-manrope-medium text-[11px] text-gray-500">{vendor.city_name}</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#D1D5DB" />
                </TouchableOpacity>
              ))
            ) : (
              <Text className="font-manrope-medium text-gray-500 text-center mt-4">No gems found for "{searchQuery}"</Text>
            )}
          </View>
        ) : (
          <>
            {/* ── Promo Banners ── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingTop: 20, paddingBottom: 12 }}>
              <TouchableOpacity className="w-72 h-36 rounded-2xl overflow-hidden" activeOpacity={0.9}>
                <ImageBackground source={{ uri: 'https://wsrv.nl/?url=images.unsplash.com/photo-1601050690597-df0568f70950&w=600&fit=cover' }} className="w-full h-full justify-end p-4">
                  <View className="absolute inset-0 bg-black/40" />
                  <Text className="font-manrope-extrabold text-white text-xl z-10">Spicy Weekends</Text>
                  <Text className="font-manrope-medium text-white/90 text-sm z-10">Explore the best Chaat near you</Text>
                </ImageBackground>
              </TouchableOpacity>
              <TouchableOpacity className="w-72 h-36 rounded-2xl overflow-hidden" activeOpacity={0.9}>
                <ImageBackground source={{ uri: 'https://wsrv.nl/?url=images.unsplash.com/photo-1555126634-323283e090fa&w=600&fit=cover' }} className="w-full h-full justify-end p-4">
                  <View className="absolute inset-0 bg-black/40" />
                  <Text className="font-manrope-extrabold text-white text-xl z-10">Top Rated Gems</Text>
                  <Text className="font-manrope-medium text-white/90 text-sm z-10">Discover community favorites</Text>
                </ImageBackground>
              </TouchableOpacity>
            </ScrollView>

            {/* ── Category Filters ── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 24, paddingBottom: 16, paddingTop: 8 }}>
              <TouchableOpacity className="items-center opacity-100 border-b-2 border-gray-900 pb-2">
                <Flame size={28} color="#222222" strokeWidth={1.5} />
                <Text className="font-manrope-bold text-sm text-gray-900 mt-2">Trending</Text>
              </TouchableOpacity>
              <TouchableOpacity className="items-center opacity-70 pb-2">
                <UtensilsCrossed size={28} color="#717171" strokeWidth={1.5} />
                <Text className="font-manrope-semibold text-sm text-gray-500 mt-2">Street Snacks</Text>
              </TouchableOpacity>
              <TouchableOpacity className="items-center opacity-70 pb-2">
                <Coffee size={28} color="#717171" strokeWidth={1.5} />
                <Text className="font-manrope-semibold text-sm text-gray-500 mt-2">Beverages</Text>
              </TouchableOpacity>
              <TouchableOpacity className="items-center opacity-70 pb-2">
                <Cake size={28} color="#717171" strokeWidth={1.5} />
                <Text className="font-manrope-semibold text-sm text-gray-500 mt-2">Desserts</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* ── Vendor Grid ── */}
            <View className="px-5 pt-4">
              <Text className="font-manrope-extrabold text-[22px] text-gray-900 mb-5">Hidden Gems in {locationName}</Text>
              
              <View className="flex-row flex-wrap justify-between">
                {vendors.map((vendor: any) => (
                  <TouchableOpacity 
                    key={vendor.id}
                    onPress={() => router.push(`/vendor/${vendor.id}`)}
                    className="w-[48%] bg-white rounded-2xl mb-4 border border-gray-100 overflow-hidden"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                    activeOpacity={0.95}
                  >
                    <Image source={{ uri: vendor.image_url || 'https://wsrv.nl/?url=images.unsplash.com/photo-1544145945-f90425340c7e&w=400&fit=cover' }} className="w-full h-32 bg-gray-100" />
                    <View className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-full flex-row items-center backdrop-blur-md">
                      <Star size={12} color="#FF5A5F" fill="#FF5A5F" />
                      <Text className="font-manrope-bold text-xs ml-1 text-gray-900">4.8</Text>
                    </View>
                    <View className="p-3">
                      <Text className="font-manrope-bold text-[15px] text-gray-900 leading-tight mb-1" numberOfLines={1}>{vendor.name}</Text>
                      <Text className="font-manrope-medium text-xs text-gray-500 mb-3" numberOfLines={1}>{vendor.cuisine_type}</Text>
                      
                      <View className="flex-row items-center justify-between border-t border-gray-100 pt-2">
                        <View className="flex-row items-center flex-1 pr-2">
                          <MapPin size={12} color="#FF5A5F" />
                          <Text className="font-manrope-semibold text-[10px] text-gray-500 ml-1 truncate" numberOfLines={1}>{vendor.area || vendor.city_name}</Text>
                        </View>
                        <View className="bg-gray-100 p-1.5 rounded-full">
                          <Navigation size={12} color="#222222" />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
