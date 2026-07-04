import { useEffect, useState, useRef } from 'react';
import { ScrollView, View, Text, Image, TouchableOpacity, ActivityIndicator, TextInput, Dimensions, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { MapPin, Search, Star, ChevronDown, UserCircle2, Clock, Percent, X, Crosshair } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.29.129.85:8082';

export default function HomeScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [locationName, setLocationName] = useState('Locating...');
  const [isLocationModalVisible, setLocationModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef(null);
  const router = useRouter();
  const { user } = useAuth();

  const fetchLocation = async () => {
    setLocationName('Locating...');
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName('Permission Denied');
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
      } else {
        setLocationName('Unknown Location');
      }
    } catch (e) {
      console.log("Location Error:", e);
      setLocationName('Location Error');
    }
  };

  useEffect(() => {
    fetchLocation();

    axios.get(`${API_URL}/api/home`)
      .then(res => setData(res.data))
      .catch(err => {
        console.error("Home feed error:", err.message);
        setErrorMsg(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (text) => {
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
        let allResults = response.data.results || [];
        
        // Filter by user's current city
        let localResults = allResults.filter(v => v.city_name?.toLowerCase() === locationName.toLowerCase());
        
        // If they have matches in their city, show only those. Otherwise, show all matches.
        if (localResults.length > 0) {
          setSearchResults(localResults);
        } else {
          setSearchResults(allResults);
        }
      } catch (error) {
        console.error("Search failed:", error.message);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white dark:bg-stone-950 items-center justify-center">
        <ActivityIndicator size="large" color="#e23744" />
      </View>
    );
  }

  if (errorMsg || !data) {
    return (
      <View className="flex-1 bg-white dark:bg-stone-950 items-center justify-center px-6">
        <Text className="text-stone-500 dark:text-stone-400 font-semibold text-center">Failed to load data.</Text>
        <Text className="text-red-500 mt-2 text-center text-xs">Error: {errorMsg}</Text>
      </View>
    );
  }

  const cravings = [
    { name: "Chaat", img: "https://wsrv.nl/?url=images.unsplash.com/photo-1601050690597-df0568f70950&w=200&h=200&fit=cover&mask=circle" },
    { name: "Sweets", img: "https://wsrv.nl/?url=images.unsplash.com/photo-1551024506-0bccd828d307&w=200&h=200&fit=cover&mask=circle" },
    { name: "Spicy", img: "https://wsrv.nl/?url=images.unsplash.com/photo-1564671165093-20688ff1fffa&w=200&h=200&fit=cover&mask=circle" },
    { name: "Snacks", img: "https://wsrv.nl/?url=images.unsplash.com/photo-1555126634-323283e090fa&w=200&h=200&fit=cover&mask=circle" },
    { name: "Beverages", img: "https://wsrv.nl/?url=images.unsplash.com/photo-1544145945-f90425340c7e&w=200&h=200&fit=cover&mask=circle" },
  ];

  // Filter vendors by the current location
  let localVendors = data.recent_vendors?.filter(v => v.area?.toLowerCase() === locationName.toLowerCase()) || [];
  // If no local vendors found (e.g. user is in a city we have no data for), fallback to showing all recent vendors
  if (localVendors.length === 0) {
    localVendors = data.recent_vendors || [];
  }

  return (
    <View className="flex-1 bg-white dark:bg-stone-950">
      {/* ── Realistic App Bar ── */}
      <View className="bg-white dark:bg-stone-900 pt-12 pb-2 px-4 flex-row items-center justify-between border-b border-stone-100 dark:border-stone-800">
        <TouchableOpacity 
          className="flex-row items-center flex-1"
          onPress={() => setLocationModalVisible(true)}
          activeOpacity={0.7}
        >
          <MapPin size={24} color="#e23744" fill="#fecaca" />
          <View className="ml-2 flex-1">
            <View className="flex-row items-center">
              <Text className="text-stone-900 dark:text-white font-bold text-[17px]">Home</Text>
              <ChevronDown size={18} color="#9ca3af" className="ml-1" />
            </View>
            <Text className="text-stone-500 dark:text-stone-400 font-normal text-[13px] mt-0.5 truncate" numberOfLines={1}>
              {locationName}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.push('/profile')} className="ml-4">
          <UserCircle2 size={32} color="#555" strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 bg-[#f4f4f5] dark:bg-stone-950" showsVerticalScrollIndicator={false}>
        
        {/* ── White Background Top Section ── */}
        <View className="bg-white dark:bg-stone-900 rounded-b-3xl shadow-sm pb-6">
          {/* Search Bar */}
          <View className="px-4 py-3">
            <View 
              className="flex-row items-center bg-white dark:bg-stone-800 rounded-xl px-4 py-3 border border-stone-200 dark:border-stone-700" 
              style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}
            >
              <Search size={20} color="#e23744" />
              <TextInput
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder="Search for 'Samosa', 'Momos', etc."
                placeholderTextColor="#9ca3af"
                className="flex-1 ml-3 font-normal text-[14px] text-stone-900 dark:text-white"
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                  <X size={20} color="#9ca3af" />
                </TouchableOpacity>
              ) : (
                <>
                  <View className="w-[1px] h-5 bg-stone-300 mx-3" />
                  <MapPin size={18} color="#e23744" />
                </>
              )}
            </View>
          </View>

          {searchQuery.length > 0 ? (
            /* ── Search Results View ── */
            <View className="px-4 py-4">
              <Text className="text-stone-800 dark:text-stone-200 font-bold text-[16px] mb-4">SEARCH RESULTS</Text>
              {isSearching ? (
                <ActivityIndicator size="large" color="#e23744" className="mt-8" />
              ) : searchResults.length > 0 ? (
                <View className="flex-col gap-4">
                  {searchResults.map((vendor) => (
                    <TouchableOpacity 
                      key={vendor.id}
                      onPress={() => router.push(`/vendor/${vendor.id}`)}
                      className="bg-white dark:bg-stone-800 rounded-xl p-3 flex-row items-center border border-stone-100 dark:border-stone-700 shadow-sm"
                      style={{ elevation: 1 }}
                    >
                      <Image 
                        source={{ uri: vendor.image_url || 'https://wsrv.nl/?url=images.unsplash.com/photo-1544145945-f90425340c7e&w=200&fit=cover' }}
                        className="w-16 h-16 rounded-lg bg-stone-100"
                      />
                      <View className="flex-1 ml-3">
                        <Text className="font-bold text-stone-900 dark:text-white text-[15px]">{vendor.name}</Text>
                        <Text className="text-stone-500 dark:text-stone-400 font-normal text-[12px] mt-0.5">{vendor.cuisine_type}</Text>
                        <View className="flex-row items-center mt-1">
                          <MapPin size={12} color="#9ca3af" />
                          <Text className="text-stone-400 font-normal text-[10px] ml-1">{vendor.city_name}</Text>
                        </View>
                      </View>
                      <View className="bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                        <Text className="text-red-600 font-bold text-[10px] uppercase">Navigate</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="items-center justify-center mt-10">
                  <Text className="text-stone-400 dark:text-stone-500 font-medium text-[15px]">No vendors found.</Text>
                </View>
              )}
            </View>
          ) : (
            /* ── Default Home Feed (Cravings) ── */
            <View className="pt-4">
              <Text className="px-4 text-stone-800 dark:text-stone-200 font-bold text-[16px] mb-3">WHAT'S ON YOUR MIND?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4" contentContainerStyle={{ paddingRight: 30 }}>
                {cravings.map((item, idx) => (
                  <TouchableOpacity key={idx} className="items-center mr-5">
                    <Image 
                      source={{ uri: item.img }}
                      style={{ width: 75, height: 75, borderRadius: 40 }}
                      className="bg-stone-100 dark:bg-stone-800 mb-2"
                    />
                    <Text className="text-stone-700 dark:text-stone-300 font-medium text-[13px]">{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ── Gray Background Feed Section ── */}
        {searchQuery.length === 0 && (
          <View className="pt-6 pb-16 px-4">
            <Text className="text-stone-800 dark:text-white font-bold text-[18px] mb-1">ALL STREET VENDORS</Text>
            <Text className="text-stone-500 dark:text-stone-400 font-normal text-[13px] mb-5">Explore hidden gems near you</Text>
            
            <View className="flex-col gap-5">
              {localVendors.map(vendor => (
                <TouchableOpacity 
                  key={vendor.id}
                  onPress={() => router.push(`/vendor/${vendor.id}`)}
                  className="bg-white dark:bg-stone-900 rounded-2xl overflow-hidden shadow-sm border border-stone-100 dark:border-stone-800"
                  style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 }}
                >
                  {/* Standard flat image top */}
                  <View className="relative w-full h-[180px] bg-stone-100">
                    <Image 
                      source={{ uri: vendor.image_url || 'https://wsrv.nl/?url=images.unsplash.com/photo-1555126634-323283e090fa&w=600&fit=cover' }}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                    
                    {/* Offers/Tags - bottom left */}
                    <View className="absolute bottom-3 left-3 bg-blue-600 px-2 py-1 rounded-md flex-row items-center">
                      <Percent size={12} color="#fff" />
                      <Text className="text-white font-bold text-[11px] ml-1">POPULAR</Text>
                    </View>

                    {/* Nav Tag - top right */}
                    <View className="absolute top-3 right-3 bg-white/90 px-2 py-1 rounded-full flex-row items-center">
                      <Clock size={12} color="#16a34a" />
                      <Text className="text-stone-800 font-bold text-[11px] ml-1">1.2 km</Text>
                    </View>
                  </View>

                  {/* Flat text layout below */}
                  <View className="p-4">
                    <View className="flex-row justify-between items-start mb-1">
                      <Text className="font-bold text-stone-900 dark:text-white text-[18px] flex-1" numberOfLines={1}>
                        {vendor.name}
                      </Text>
                      {/* Zomato style rating box */}
                      <View className="bg-green-700 px-1.5 py-0.5 rounded flex-row items-center ml-2">
                        <Text className="text-white font-bold text-[12px] mr-1">{vendor.rating ? vendor.rating.toFixed(1) : 'New'}</Text>
                        <Star color="#fff" size={10} fill="#fff" />
                      </View>
                    </View>
                    
                    <View className="flex-row justify-between items-center mb-3">
                      <Text className="text-stone-500 dark:text-stone-400 font-normal text-[14px]" numberOfLines={1}>
                        {vendor.cuisine_type || 'Street Food'}
                      </Text>
                      <Text className="text-stone-500 dark:text-stone-400 font-normal text-[13px]">₹150 for one</Text>
                    </View>

                    {/* Separator line */}
                    <View className="h-[1px] w-full bg-stone-200 mb-3" />

                    {/* "Navigate" button section */}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View className="bg-stone-100 dark:bg-stone-800 rounded-full w-6 h-6 items-center justify-center mr-2">
                          <MapPin color="#78716c" size={12} />
                        </View>
                        <Text className="text-stone-500 dark:text-stone-400 font-normal text-[13px]" numberOfLines={1}>
                          {vendor.area || 'Local Market'}
                        </Text>
                      </View>
                      
                      <TouchableOpacity className="border border-red-500 px-4 py-1.5 rounded-lg flex-row items-center">
                        <Text className="text-red-500 font-bold text-[12px] uppercase">Get Directions</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {/* ── Submit a Vendor CTA ── */}
              <TouchableOpacity 
                onPress={() => router.push('/submit-vendor')}
                className="bg-red-50 dark:bg-red-900/20 mt-8 mb-4 p-5 rounded-2xl border border-red-100 dark:border-red-900/30 flex-row items-center justify-between shadow-sm"
              >
                <View className="flex-1 mr-4">
                  <Text className="text-red-600 font-bold text-[16px] mb-1">Know a Hidden Gem?</Text>
                  <Text className="text-red-500 font-normal text-[13px]">Help us grow by suggesting a street vendor to the Admin.</Text>
                </View>
                <View className="bg-red-500 p-3 rounded-full">
                  <Star size={20} color="#fff" fill="#fff" />
                </View>
              </TouchableOpacity>

            </View>
          </View>
        )}

      </ScrollView>

      {/* ── Location Selector Modal ── */}
      <Modal
        visible={isLocationModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-stone-900 rounded-t-3xl min-h-[50%] p-6 shadow-xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-stone-900 dark:text-white">Select Location</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)} className="p-2 -mr-2 bg-stone-100 dark:bg-stone-800 rounded-full">
                <X size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Use Current GPS Location */}
            <TouchableOpacity 
              className="flex-row items-center mb-6 bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-900/30"
              onPress={() => {
                fetchLocation();
                setLocationModalVisible(false);
              }}
            >
              <Crosshair size={22} color="#e23744" />
              <View className="ml-3">
                <Text className="font-bold text-red-600 text-[16px]">Use current location</Text>
                <Text className="text-red-400 text-xs mt-0.5">Using GPS</Text>
              </View>
            </TouchableOpacity>

            <Text className="text-stone-500 dark:text-stone-400 font-bold text-xs uppercase tracking-wider mb-4">Available Cities</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {data.cities?.map(city => (
                <TouchableOpacity 
                  key={city.id}
                  className="flex-row items-center py-4 border-b border-stone-100 dark:border-stone-800"
                  onPress={() => {
                    setLocationName(city.name);
                    setLocationModalVisible(false);
                  }}
                >
                  <MapPin size={20} color="#78716c" />
                  <Text className="font-bold text-stone-700 dark:text-stone-200 text-[16px] ml-4">{city.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}
