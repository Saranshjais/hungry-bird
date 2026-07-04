import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Search, MapPin, TrendingUp, ChevronRight, X, Navigation } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.29.129.85:8082';

export default function ExploreScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef(null);

  const categories = [
    { name: "Spicy & Hot", image: "https://wsrv.nl/?url=images.unsplash.com/photo-1564671165093-20688ff1fffa&w=400&fit=cover" },
    { name: "Sweet Treats", image: "https://wsrv.nl/?url=images.unsplash.com/photo-1551024506-0bccd828d307&w=400&fit=cover" },
    { name: "Street Chaat", image: "https://wsrv.nl/?url=images.unsplash.com/photo-1601050690597-df0568f70950&w=400&fit=cover" },
    { name: "Local Chai", image: "https://wsrv.nl/?url=images.unsplash.com/photo-1544145945-f90425340c7e&w=400&fit=cover" },
  ];

  const popular = [
    { name: "Mumbai Vada Pav", loc: "Maharashtra", rating: "4.9" },
    { name: "Delhi Chole", loc: "New Delhi", rating: "4.8" },
    { name: "Jaipur Kachori", loc: "Rajasthan", rating: "4.7" },
  ];

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
    }, 500); // 500ms debounce
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <ScrollView className="flex-1 bg-[#f8f9fa] dark:bg-stone-950" showsVerticalScrollIndicator={false}>
      
      {/* ── Stunning Hero Header ── */}
      <View className="relative w-full h-[340px] rounded-b-[3rem] overflow-hidden shadow-lg mb-6">
        <Image 
          source={{ uri: 'https://wsrv.nl/?url=images.unsplash.com/photo-1555126634-323283e090fa&w=800&fit=cover' }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.85)']}
          className="absolute inset-0"
        />
        
        <View className="absolute inset-0 px-6 pt-16 pb-8 justify-between">
          <View>
            <Text className="text-white/80 font-[Poppins_700Bold] text-xs uppercase tracking-[0.2em] mb-1">Discover</Text>
            <Text className="text-white font-[Poppins_800ExtraBold] text-[36px] leading-[42px] tracking-tight">
              Cravings,{"\n"}Satisfied.
            </Text>
          </View>

          {/* Floating Glassmorphism Search */}
          <View className="relative w-full shadow-2xl">
            <View className="absolute inset-0 bg-white/20 dark:bg-black/40 rounded-3xl" style={{ backdropFilter: 'blur(10px)' }} />
            <View className="flex-row items-center bg-white/90 dark:bg-stone-900/90 rounded-3xl border border-white/40 dark:border-white/10 px-4 py-3.5">
              <Search size={22} color="#f97316" />
              <TextInput
                value={query}
                onChangeText={handleSearch}
                placeholder="Find momos, biryani, or chaat..."
                placeholderTextColor="#a8a29e"
                className="flex-1 font-[Poppins_600SemiBold] text-stone-900 dark:text-white ml-3"
                style={{ fontSize: 15 }}
                autoFocus={false}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={clearSearch} className="p-1">
                  <X size={18} color="#78716c" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>

      <View className="px-6 pb-12">
        
        {/* ── Search Results Section ── */}
        {query.length > 0 ? (
          <View>
            <Text className="text-xl font-[Poppins_800ExtraBold] text-stone-900 dark:text-white tracking-tight mb-4">
              Search Results
            </Text>
            
            {loading ? (
              <ActivityIndicator size="large" color="#f97316" className="mt-8" />
            ) : results.length > 0 ? (
              <View className="flex-col gap-4">
                {results.map((vendor) => (
                  <TouchableOpacity 
                    key={vendor.id}
                    onPress={() => router.push(`/vendor/${vendor.id}`)}
                    className="bg-white dark:bg-stone-900 rounded-2xl p-3 flex-row items-center border border-stone-100 dark:border-stone-800 shadow-sm"
                  >
                    <Image 
                      source={{ uri: vendor.image_url || 'https://wsrv.nl/?url=images.unsplash.com/photo-1544145945-f90425340c7e&w=200&fit=cover' }}
                      className="w-16 h-16 rounded-xl bg-stone-100 dark:bg-stone-800"
                    />
                    <View className="flex-1 ml-3">
                      <Text className="font-[Poppins_700Bold] text-stone-900 dark:text-white text-base">{vendor.name}</Text>
                      <Text className="text-stone-500 dark:text-stone-400 font-[Poppins_500Medium] text-xs mt-0.5">{vendor.cuisine_type}</Text>
                      <View className="flex-row items-center mt-1">
                        <MapPin size={12} color="#a8a29e" />
                        <Text className="text-stone-400 dark:text-stone-500 font-[Poppins_600SemiBold] text-[10px] ml-1">{vendor.city_name}</Text>
                      </View>
                    </View>
                    <View className="bg-brand-50 dark:bg-brand-900/20 w-8 h-8 rounded-full items-center justify-center border border-brand-100 dark:border-brand-900/30">
                      <ChevronRight size={16} color="#f97316" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View className="items-center justify-center mt-10">
                <Text className="text-stone-400 dark:text-stone-500 font-[Poppins_600SemiBold] text-base">No vendors found for "{query}"</Text>
                <Text className="text-stone-400 dark:text-stone-500 text-xs mt-1">Try searching for something else.</Text>
              </View>
            )}
          </View>
        ) : (
          /* ── Default Explore View ── */
          <>
            {/* Visual Categories Grid */}
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-xl font-[Poppins_800ExtraBold] text-stone-900 dark:text-white tracking-tight">Cuisines</Text>
              <Text className="text-brand-500 font-[Poppins_700Bold] text-xs uppercase">View All</Text>
            </View>
            
            <View className="flex-row flex-wrap justify-between mb-10 gap-y-4">
              {categories.map((cat, idx) => (
                <TouchableOpacity 
                  key={idx}
                  className="w-[48%] h-32 rounded-3xl overflow-hidden shadow-sm relative active:scale-95 transition-transform"
                >
                  <Image 
                    source={{ uri: cat.image }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#e7e5e4' }}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    className="absolute inset-0"
                  />
                  <View className="absolute bottom-4 left-4 right-4">
                    <Text className="text-white font-[Poppins_700Bold] text-[15px]">{cat.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Trending Experiences */}
            <View className="flex-row items-center mb-5">
              <TrendingUp size={20} color="#f97316" className="mr-2" />
              <Text className="text-xl font-[Poppins_800ExtraBold] text-stone-900 dark:text-white tracking-tight">Trending Now</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6 mb-10 pb-4">
              {popular.map((item, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  className="bg-white dark:bg-stone-900 w-64 rounded-[2rem] p-4 mr-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] border border-stone-100 dark:border-stone-800 flex-row items-center active:opacity-80"
                >
                  <View className="w-14 h-14 bg-stone-100 dark:bg-stone-800 rounded-2xl mr-4 overflow-hidden relative">
                    <Image 
                      source={{ uri: `https://wsrv.nl/?url=images.unsplash.com/photo-1596423735880-5c6a5a8f9c18&w=200&fit=cover` }}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-[Poppins_700Bold] text-stone-900 dark:text-white text-[15px]" numberOfLines={1}>{item.name}</Text>
                    <View className="flex-row items-center mt-1">
                      <MapPin size={10} color="#a8a29e" />
                      <Text className="font-[Poppins_600SemiBold] text-stone-400 dark:text-stone-500 text-[10px] ml-1">{item.loc}</Text>
                    </View>
                  </View>
                  <View className="w-8 h-8 bg-brand-50 dark:bg-brand-900/20 rounded-full items-center justify-center border border-brand-100 dark:border-brand-900/30 ml-2">
                    <ChevronRight size={16} color="#f97316" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

      </View>
    </ScrollView>
  );
}
