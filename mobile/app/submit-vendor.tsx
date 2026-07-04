import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform, Dimensions, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import * as Location from 'expo-location';
import { Search, ArrowRight, Crosshair, Star } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.29.129.85:8082';

let MapView, Marker;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export default function SubmitVendorScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const mapRef = useRef(null);
  
  // Form State
  const [stallName, setStallName] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Map State
  const [searchQuery, setSearchQuery] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [region, setRegion] = useState({
    latitude: 26.9124, // Default to Jaipur
    longitude: 75.7873,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    // Try to get initial location quietly
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    })();
  }, []);

  const handleAutoLocate = async () => {
    setGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      alert('Error fetching location.');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const geocoded = await Location.geocodeAsync(searchQuery);
      if (geocoded.length > 0) {
        const newRegion = {
          latitude: geocoded[0].latitude,
          longitude: geocoded[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
      } else {
        alert("Location not found");
      }
    } catch (e) {
      alert("Error searching location");
    }
  };

  const handleDirectSubmit = async () => {
    if (!stallName) {
      setMessage('Vendor Name is required.');
      return;
    }

    setLoading(true);
    setMessage('');
    
    let resolvedAddress = `${region.latitude.toFixed(4)}, ${region.longitude.toFixed(4)}`;

    try {
      // Reverse geocode on the fly
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: region.latitude,
        longitude: region.longitude
      });
      if (reverseGeocode && reverseGeocode.length > 0) {
        const place = reverseGeocode[0];
        resolvedAddress = [place.name, place.street, place.city, place.region].filter(Boolean).join(', ');
      }
    } catch (e) {
      console.log("Reverse geocode failed, using lat/lng");
    }

    try {
      await axios.post(`${API_URL}/api/submit-vendor`, {
        stall_name: stallName,
        cuisine_type: cuisineType,
        approx_address: resolvedAddress,
        lat: region.latitude,
        lng: region.longitude,
        estimated_price: "",
        description: "",
        rating: rating,
        city_id: 1, 
        submitted_by_name: user?.name || 'Anonymous',
        submitted_by_email: user?.email || 'anonymous@example.com'
      });
      
      setMessage('Vendor submitted successfully!');
      setTimeout(() => router.back(), 2000);
    } catch (err) {
      setMessage('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (Platform.OS === 'web' || !MapView) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Text className="text-xl font-bold mb-4">Map not supported on Web</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={{ flex: 1 }}
      className="bg-white dark:bg-stone-950"
    >
      {message ? (
        <View className={`absolute top-28 left-4 right-4 z-50 p-4 rounded-xl shadow-lg ${message.includes('successfully') ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
          <Text className={`${message.includes('successfully') ? 'text-emerald-600' : 'text-red-500'} text-sm font-bold text-center`}>
            {message}
          </Text>
        </View>
      ) : null}

      {/* Map Section (flex-1 so it takes remaining space) */}
      <View className="flex-1 relative m-4 rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-sm bg-stone-100 dark:bg-stone-900">
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={region}
          onRegionChangeComplete={(newRegion) => setRegion(newRegion)}
          showsUserLocation={true}
          showsMyLocationButton={false}
        />
        {/* Fixed center pointer simulating map pin */}
        <View className="absolute inset-0 items-center justify-center pointer-events-none">
          <View className="w-5 h-5 bg-[#3b82f6] rounded-full border-[3px] border-white dark:border-stone-950 shadow-md" />
          <View className="w-[2px] h-4 bg-stone-800 dark:bg-white mt-1" />
        </View>

        {/* Top Search Bar (Floating over map) */}
        <View className="absolute top-4 left-4 right-4 z-10 flex-row items-center">
          <View className="flex-1 bg-white dark:bg-stone-900 rounded-full flex-row items-center px-4 py-3 shadow-sm border border-stone-100 dark:border-stone-800 elevation-2">
            <Search size={20} color="#9ca3af" />
            <TextInput 
              className="flex-1 ml-2 text-[15px] text-stone-800 dark:text-white"
              placeholder="Search place or address"
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity 
            onPress={handleAutoLocate}
            disabled={gettingLocation}
            className="ml-3 w-12 h-12 bg-[#eb6e4b] rounded-full items-center justify-center shadow-sm elevation-2"
          >
            {gettingLocation ? <ActivityIndicator color="white" /> : <Crosshair size={22} color="white" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Form Section (Normal Document Flow) */}
      <View className="bg-white dark:bg-stone-900 px-6 pt-6 pb-8 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] elevation-10 border-t border-stone-100 dark:border-stone-800">
        <Text className="text-stone-700 dark:text-stone-300 font-bold mb-2 ml-1 text-sm">Vendor Name</Text>
        <TextInput
          className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-stone-900 dark:text-white focus:border-[#eb6e4b] focus:bg-white dark:focus:bg-stone-900 mb-4"
          placeholder="e.g. Sharma Ji Chole Bhature"
          placeholderTextColor="#9ca3af"
          value={stallName}
          onChangeText={setStallName}
        />

        <Text className="text-stone-700 dark:text-stone-300 font-bold mb-2 ml-1 text-sm">Cuisine Type</Text>
        <TextInput
          className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-stone-900 dark:text-white focus:border-[#eb6e4b] focus:bg-white dark:focus:bg-stone-900 mb-4"
          placeholder="e.g. North Indian, Snacks"
          placeholderTextColor="#9ca3af"
          value={cuisineType}
          onChangeText={setCuisineType}
        />

        <View className="flex-row items-center justify-between ml-1 mb-6">
          <Text className="text-stone-700 dark:text-stone-300 font-bold text-sm">Your Rating</Text>
          <View className="flex-row">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} className="p-1">
                <Star size={24} color={star <= rating ? "#f59e0b" : "#d6d3d1"} fill={star <= rating ? "#f59e0b" : "transparent"} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleDirectSubmit}
          disabled={loading || !stallName}
          className={`w-full py-4 rounded-full flex-row justify-center items-center shadow-sm elevation-2 ${stallName ? 'bg-[#eb6e4b]' : 'bg-stone-300 dark:bg-stone-700'}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text className="text-white font-bold text-[16px] ml-2">Submit Vendor</Text>
              <ArrowRight size={20} color="white" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
