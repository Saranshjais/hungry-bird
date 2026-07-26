import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { ChevronRight, Navigation, Star, MapPin } from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hungry-bird-jye4.onrender.com';
const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({});
          setLocation(loc);
        }
      } catch (e) {
        console.warn("Location permission not granted or failed.");
      }

      try {
        const res = await axios.get(`${API_URL}/api/home`);
        setVendors(res.data.recent_vendors || []);
      } catch (e) {
        console.error("Failed to fetch vendors for map:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-[#F7F7F9] items-center justify-center">
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  const initialRegion = location ? {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  } : {
    latitude: 28.6139, // Default to Delhi
    longitude: 77.2090,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {vendors.map((vendor: any) => (
          vendor.latitude && vendor.longitude ? (
            <Marker
              key={vendor.id}
              coordinate={{ latitude: vendor.latitude, longitude: vendor.longitude }}
              onPress={() => setSelectedVendor(vendor)}
            >
              <View className="bg-white p-1 rounded-full shadow-lg border-2 border-brand-500">
                <Image 
                  source={{ uri: vendor.image_url || 'https://wsrv.nl/?url=images.unsplash.com/photo-1544145945-f90425340c7e&w=100&fit=cover' }} 
                  style={{ width: 32, height: 32, borderRadius: 16 }} 
                />
              </View>
            </Marker>
          ) : null
        ))}
      </MapView>

      {/* Floating Header */}
      <View className="absolute top-12 left-5 right-5 bg-white/95 backdrop-blur-md rounded-full px-5 py-3 shadow-lg flex-row items-center border border-gray-100" style={{ elevation: 5 }}>
        <MapPin size={20} color="#FF5A5F" />
        <Text className="font-manrope-bold text-gray-900 ml-2 text-[15px]">Explore Map</Text>
      </View>

      {/* Bottom Sheet Preview */}
      {selectedVendor && (
        <View className="absolute bottom-24 left-5 right-5 bg-white rounded-3xl p-4 shadow-xl border border-gray-100" style={{ elevation: 10 }}>
          <View className="flex-row">
            <Image source={{ uri: selectedVendor.image_url || 'https://wsrv.nl/?url=images.unsplash.com/photo-1544145945-f90425340c7e&w=400&fit=cover' }} className="w-24 h-24 rounded-2xl bg-gray-100" />
            <View className="flex-1 ml-4 justify-between py-1">
              <View>
                <Text className="font-manrope-bold text-[18px] text-gray-900 leading-tight mb-1" numberOfLines={2}>{selectedVendor.name}</Text>
                <Text className="font-manrope-medium text-[13px] text-gray-500">{selectedVendor.cuisine_type}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center bg-brand-50 px-2 py-1 rounded-full">
                  <Star size={12} color="#FF5A5F" fill="#FF5A5F" />
                  <Text className="font-manrope-bold text-[11px] text-brand-600 ml-1">4.8</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => router.push(`/vendor/${selectedVendor.id}`)}
                  className="bg-gray-900 w-8 h-8 rounded-full items-center justify-center"
                >
                  <ChevronRight size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <TouchableOpacity 
            className="mt-4 bg-brand-500 rounded-xl py-3 flex-row items-center justify-center"
            onPress={() => router.push(`/vendor/${selectedVendor.id}`)}
          >
            <Navigation size={16} color="#FFFFFF" />
            <Text className="font-manrope-bold text-white ml-2 text-[15px]">View Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="absolute top-2 right-2 bg-gray-100 w-8 h-8 rounded-full items-center justify-center"
            onPress={() => setSelectedVendor(null)}
          >
            <Text className="font-manrope-bold text-gray-500">✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: width,
    height: height,
  },
});
