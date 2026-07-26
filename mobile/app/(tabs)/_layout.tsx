import { Tabs, router } from 'expo-router';
import { Compass, User, Map as MapIcon, Bookmark, PlusCircle } from 'lucide-react-native';
import { View, TouchableOpacity, StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF5A5F', // Primary Coral
        tabBarInactiveTintColor: '#717171', // Text Gray
        tabBarLabelStyle: {
          fontFamily: 'Manrope_600SemiBold',
          fontSize: 10,
          marginTop: -4,
        },
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.05,
          shadowRadius: 15,
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.95)', // Glass effect
          position: 'absolute',
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Compass size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }) => <Bookmark size={24} color={color} />,
        }}
      />
      
      {/* Custom Submit Button disguised as a Tab */}
      <Tabs.Screen
        name="submit-action"
        options={{
          title: 'Submit',
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={() => {
                // Navigate to the modal instead of a tab
                router.push('/submit-vendor');
              }}
              style={styles.submitButtonContainer}
            >
              <View style={styles.submitButton}>
                <PlusCircle size={28} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <MapIcon size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
      {/* Hide the old explore tab if it still exists */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  submitButtonContainer: {
    top: -15,
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
  },
  submitButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF5A5F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF5A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  }
});
