import { View, Text } from 'react-native';
import { Bookmark } from 'lucide-react-native';

export default function SavedScreen() {
  return (
    <View className="flex-1 bg-[#F7F7F9] items-center justify-center p-5">
      <View className="bg-white p-6 rounded-full shadow-sm mb-4">
        <Bookmark size={48} color="#D1D5DB" />
      </View>
      <Text className="font-manrope-extrabold text-2xl text-gray-900 mb-2">No Saved Gems</Text>
      <Text className="font-manrope-medium text-gray-500 text-center text-[15px]">
        Tap the heart icon on any vendor to save them to your list for later.
      </Text>
    </View>
  );
}
