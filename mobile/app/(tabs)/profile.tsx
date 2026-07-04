import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useColorScheme } from 'nativewind';
import { 
  ArrowLeft, 
  MoreVertical, 
  MapPin, 
  PlusCircle, 
  Clock, 
  Award,
  FileText,
  Star,
  Bookmark,
  Heart,
  Settings,
  Shield,
  HelpCircle,
  ChevronRight,
  TrendingUp
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#d6d3d1' : '#1c1917';

  if (!user) {
    return (
      <View className="flex-1 bg-white dark:bg-stone-950 items-center justify-center p-6">
        <Text className="text-2xl font-bold text-stone-900 dark:text-white mb-3 text-center">Your Profile</Text>
        <Text className="text-stone-500 dark:text-stone-400 font-normal text-center mb-8 leading-5 text-sm px-4">
          Log in or sign up to view your complete profile, saved gems, and submitted vendors.
        </Text>
        <TouchableOpacity onPress={() => router.push('/auth/login')} className="w-full bg-[#eb6e4b] py-3.5 rounded-xl mb-4">
          <Text className="text-white font-bold text-[15px] text-center">Log In</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/auth/register')} className="w-full bg-white dark:bg-stone-900 border border-[#eb6e4b] py-3.5 rounded-xl">
          <Text className="text-[#eb6e4b] font-bold text-[15px] text-center">Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleMenu = () => setMenuVisible(!menuVisible);

  return (
    <View className="flex-1 bg-[#f8f9fa] dark:bg-stone-950">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* ── Gradient Header ── */}
        <LinearGradient 
          colors={['#292524', '#1c1917']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          className="pt-14 pb-20 px-4 rounded-b-[40px] relative"
        >
          {/* Top Bar */}
          <View className="flex-row justify-between items-center mb-6">
            <View className="w-10 h-10" />
            
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => router.push('/user/help')} className="bg-white/10 px-4 py-1.5 rounded-full mr-2">
                <Text className="text-white font-semibold text-sm">Help</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleMenu} className="w-10 h-10 items-center justify-center relative">
                <MoreVertical size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* User Info */}
          <View className="px-2">
            <Text className="text-white font-bold text-3xl mb-1">{user.name}</Text>
            <Text className="text-white/70 font-medium text-sm mb-0.5">Food Explorer</Text>
            <Text className="text-white/60 font-medium text-sm">{user.email}</Text>
          </View>
        </LinearGradient>

        {/* ── Overlapping Cards Section ── */}
        <View className="px-4 -mt-12">
          
          {/* Stats Card */}
          <View className="bg-white dark:bg-stone-900 rounded-3xl p-5 mb-4 border border-stone-200 dark:border-stone-800 shadow-sm elevation-2">
            <View className="flex-row items-center mb-1">
              <Award size={20} color={iconColor} className="mr-2" />
              <View className="bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-sm">
                <Text className="text-stone-800 dark:text-stone-300 font-bold text-[10px] uppercase">Level 3 Local Guide</Text>
              </View>
            </View>
            <View className="flex-row justify-between items-center mt-1">
              <View>
                <Text className="text-stone-900 dark:text-white font-bold text-base">12 Hidden Gems Discovered</Text>
                <Text className="text-stone-500 dark:text-stone-400 text-xs mt-0.5">Keep submitting to reach Level 4!</Text>
              </View>
              <ChevronRight size={20} color="#a8a29e" />
            </View>
          </View>

          {/* Quick Actions Grid */}
          <View className="flex-row justify-between mb-4">
            <QuickAction icon={<Heart size={22} color={iconColor} />} label="Favorites" onPress={() => router.push('/user/favorites')} />
            <QuickAction icon={<Bookmark size={22} color={iconColor} />} label="Saved\nVendors" onPress={() => router.push('/user/saved')} />
            <QuickAction icon={<Star size={22} color={iconColor} />} label="My\nReviews" onPress={() => router.push('/user/reviews')} />
            <QuickAction icon={<PlusCircle size={22} color={iconColor} />} label="Add\nVendor" onPress={() => router.push('/submit-vendor')} />
          </View>

          {/* Menu List */}
          <View className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm elevation-2 mb-24 overflow-hidden pt-2 pb-2">
            <Text className="text-stone-500 dark:text-stone-400 font-bold text-[11px] uppercase tracking-wider ml-5 mt-2 mb-1">Activity</Text>
            <ListItem icon={<FileText size={20} color={iconColor} />} title="My Submissions" onPress={() => router.push('/user/submissions')} />
            
            <Text className="text-stone-500 dark:text-stone-400 font-bold text-[11px] uppercase tracking-wider ml-5 mt-6 mb-1">Account</Text>
            <ListItem icon={<Settings size={20} color={iconColor} />} title="Account Settings" onPress={() => router.push('/user/settings')} />
            <View className="h-[1px] bg-stone-100 dark:bg-stone-800 mx-4" />
            <ListItem icon={<Shield size={20} color={iconColor} />} title="Privacy & Security" onPress={() => router.push('/user/settings')} />
            
            <Text className="text-stone-500 dark:text-stone-400 font-bold text-[11px] uppercase tracking-wider ml-5 mt-6 mb-1">Support</Text>
            <ListItem icon={<HelpCircle size={20} color={iconColor} />} title="Help & Support" onPress={() => router.push('/user/help')} />
          </View>
        </View>

      </ScrollView>

      {/* Floating Action Button */}
      <View className="absolute bottom-6 left-0 right-0 items-center pointer-events-auto z-10">
        <TouchableOpacity 
          onPress={() => router.push('/submit-vendor')}
          className="bg-[#1c1917] px-6 py-3.5 rounded-full shadow-lg elevation-5 flex-row items-center"
        >
          <TrendingUp size={16} color="#ffffff" className="mr-2" />
          <Text className="text-white font-bold text-xs tracking-widest uppercase">Add Hidden Gem</Text>
        </TouchableOpacity>
      </View>

      {/* 3-Dot Dropdown Menu Modal */}
      {menuVisible && (
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
          className="absolute inset-0 z-50"
        >
          <View className="absolute top-20 right-4 bg-[#111111] rounded-2xl py-2 w-48 shadow-xl elevation-10">
            <TouchableOpacity className="px-5 py-3" onPress={() => { setMenuVisible(false); router.push('/user/settings'); }}>
              <Text className="text-white text-sm font-medium">Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity className="px-5 py-3" onPress={() => { setMenuVisible(false); logout(); }}>
              <Text className="text-[#ef4444] text-sm font-medium">Log out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

    </View>
  );
}

// Subcomponents
const QuickAction = ({ icon, label, onPress }) => (
  <TouchableOpacity onPress={onPress} className="bg-white dark:bg-stone-900 rounded-[20px] p-3 items-center justify-center w-[23%] aspect-square border border-stone-100 dark:border-stone-800 shadow-sm elevation-1">
    <View className="mb-2 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-full">{icon}</View>
    <Text className="text-stone-700 dark:text-stone-300 text-[10px] text-center font-medium leading-3">{label}</Text>
  </TouchableOpacity>
);

const ListItem = ({ icon, title, onPress }) => (
  <TouchableOpacity onPress={onPress} className="flex-row items-center px-5 py-4 active:bg-stone-50 dark:active:bg-stone-800/50">
    <View className="w-8 items-center justify-center mr-3">
      {icon}
    </View>
    <Text className="flex-1 text-stone-800 dark:text-stone-200 text-[14px] font-medium">{title}</Text>
    <ChevronRight size={16} color="#d6d3d1" />
  </TouchableOpacity>
);
