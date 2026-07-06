import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Play } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const DUMMY_REELS = [
  {
    id: 1,
    title: "The Ultimate Pav Bhaji Guide",
    author: "StreetFoodKing",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=600&auto=format&fit=crop",
    views: "1.2M",
  },
  {
    id: 2,
    title: "Hidden Chole Bhature Spot",
    author: "DelhiDiaries",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=300&auto=format&fit=crop",
    views: "850K",
  },
  {
    id: 3,
    title: "Making of Traditional Ghewar",
    author: "SweetTooth",
    image: "https://images.unsplash.com/photo-1555126634-323283e090fa?q=80&w=300&auto=format&fit=crop",
    views: "2.1M",
  }
];

export default function ReelsSection() {
  return (
    <View className="py-8 bg-stone-50 dark:bg-stone-950 mt-4 border-t border-stone-200 dark:border-stone-800">
      <View className="px-5 mb-5">
        <View className="flex-row items-center bg-white dark:bg-stone-900 px-3 py-1.5 rounded-full border border-stone-200 dark:border-stone-700 self-start mb-3">
          <Play size={12} color="#f97316" fill="#f97316" />
          <Text className="text-stone-600 dark:text-stone-300 text-[10px] font-bold uppercase tracking-wider ml-1.5">
            Shorts & Reels
          </Text>
        </View>
        <Text className="text-2xl font-extrabold text-stone-900 dark:text-white leading-tight">
          Watch & <Text className="text-orange-500">Drool</Text>
        </Text>
        <Text className="text-stone-500 dark:text-stone-400 text-[13px] mt-2 leading-tight">
          Get up close with India's most mouth-watering street food through our curated shorts.
        </Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        className="w-full"
      >
        {DUMMY_REELS.map((reel, idx) => (
          <TouchableOpacity 
            key={reel.id} 
            activeOpacity={0.9}
            className={`w-[220px] h-[360px] rounded-3xl overflow-hidden bg-stone-900 relative ${idx !== DUMMY_REELS.length - 1 ? 'mr-4' : ''}`}
          >
            <Image 
              source={{ uri: reel.image }} 
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            {/* Dark Gradient Overlay equivalent */}
            <View className="absolute inset-0 bg-black/40" />
            
            {/* Play Button */}
            <View className="absolute inset-0 items-center justify-center">
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center border border-white/40 shadow-xl">
                <Play size={20} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
              </View>
            </View>

            {/* Bottom Content */}
            <View className="absolute bottom-0 left-0 right-0 p-5">
              <View className="bg-black/50 self-start px-2.5 py-1 rounded-full border border-white/20 mb-2">
                <Text className="text-white font-bold text-[10px]">{reel.views} views</Text>
              </View>
              <Text className="text-white font-extrabold text-lg leading-tight mb-2 shadow-sm">
                {reel.title}
              </Text>
              <Text className="text-white/80 font-medium text-[11px]">
                @{reel.author}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
