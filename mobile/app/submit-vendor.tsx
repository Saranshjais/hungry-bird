import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform, Dimensions, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import * as Location from 'expo-location';
import { Search, ArrowRight, Crosshair, Star, CheckCircle } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hungry-bird-jye4.onrender.com';

export default function SubmitVendorScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  
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
    latitude: 28.6139, // Default to Delhi
    longitude: 77.2090,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
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
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
      }
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
      }
    } catch (e) {
      console.warn("Error searching location", e);
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
      <View className="flex-1 bg-[#F7F7F9] items-center justify-center p-6">
        <Text className="text-xl font-manrope-bold mb-4 text-gray-900">Map not supported on Web</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={{ flex: 1 }}
      className="bg-[#F7F7F9]"
    >
      {message ? (
        <View className="absolute top-12 left-5 right-5 z-50 p-4 rounded-2xl bg-gray-900 shadow-xl flex-row items-center justify-center">
          {message.includes('successfully') ? <CheckCircle size={20} color="#34D399" /> : null}
          <Text className="text-white font-manrope-bold text-[15px] ml-2">{message}</Text>
        </View>
      ) : null}

      {/* Map Section */}
      <View className="flex-1 relative border-b border-gray-200">
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={region}
          onRegionChangeComplete={(newRegion) => setRegion(newRegion)}
          showsUserLocation={true}
          showsMyLocationButton={false}
        />
        <View className="absolute inset-0 items-center justify-center pointer-events-none pb-8">
          <View className="w-5 h-5 bg-brand-500 rounded-full border-[3px] border-white shadow-lg" />
          <View className="w-[2px] h-6 bg-brand-500 mt-1 shadow-sm" />
        </View>

        <View className="absolute top-12 left-5 right-5 z-10 flex-row items-center">
          <View className="flex-1 bg-white rounded-full flex-row items-center px-4 py-3 shadow-md border border-gray-100">
            <Search size={20} color="#9CA3AF" />
            <TextInput 
              className="flex-1 ml-3 font-manrope-medium text-[15px] text-gray-900 h-6"
              placeholder="Search place or address"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity 
            onPress={handleAutoLocate}
            disabled={gettingLocation}
            className="ml-3 w-12 h-12 bg-white rounded-full items-center justify-center shadow-md border border-gray-100"
          >
            {gettingLocation ? <ActivityIndicator color="#FF5A5F" /> : <Crosshair size={22} color="#FF5A5F" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Form Section */}
      <View className="bg-white px-6 pt-6 pb-10 shadow-lg border-t border-gray-100 rounded-t-3xl -mt-6">
        <View className="w-12 h-1 bg-gray-200 rounded-full self-center mb-6" />
        
        <Text className="font-manrope-bold text-gray-900 mb-2 ml-1 text-sm">Vendor Name</Text>
        <TextInput
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-manrope-medium text-[15px] text-gray-900 focus:border-brand-500 focus:bg-white mb-4"
          placeholder="e.g. Sharma Ji Chole Bhature"
          placeholderTextColor="#9CA3AF"
          value={stallName}
          onChangeText={setStallName}
        />

        <Text className="font-manrope-bold text-gray-900 mb-2 ml-1 text-sm">Cuisine Type</Text>
        <TextInput
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-manrope-medium text-[15px] text-gray-900 focus:border-brand-500 focus:bg-white mb-6"
          placeholder="e.g. North Indian, Snacks"
          placeholderTextColor="#9CA3AF"
          value={cuisineType}
          onChangeText={setCuisineType}
        />

        <View className="flex-row items-center justify-between mb-8 px-1">
          <Text className="font-manrope-bold text-gray-900 text-[15px]">Your Rating</Text>
          <View className="flex-row">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} className="px-1">
                <Star size={28} color={star <= rating ? "#F59E0B" : "#D1D5DB"} fill={star <= rating ? "#F59E0B" : "transparent"} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleDirectSubmit}
          disabled={loading || !stallName}
          className={`w-full py-4 rounded-full flex-row justify-center items-center shadow-md ${stallName ? 'bg-brand-500 shadow-brand-500/30' : 'bg-gray-200'}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text className="text-white font-manrope-bold text-[16px]">Submit Gem</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
