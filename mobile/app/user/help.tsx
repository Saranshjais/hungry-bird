import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, MessageSquare, FileText, ChevronRight, HelpCircle } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function HelpSupportScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const darkMode = colorScheme === 'dark';

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@hungrybird.app?subject=Help & Support');
  };

  const faqs = [
    {
      question: "How do I add a new hidden gem?",
      answer: "Go to your Profile tab and tap 'Add Vendor' or the 'Add Hidden Gem' button at the bottom. Fill in the details like name, cuisine, and location on the map, then submit it for our admins to verify!"
    },
    {
      question: "Why is my submission still pending?",
      answer: "Our team manually verifies every vendor submission to ensure the quality and accuracy of the street food spots on our platform. This usually takes 24-48 hours."
    },
    {
      question: "How does the rating system work?",
      answer: "When you submit a vendor, your initial rating sets the baseline. Other users can then visit the spot and add their own ratings, which will average out to create the vendor's overall score."
    },
    {
      question: "How do I become a higher level Local Guide?",
      answer: "The more verified hidden gems you submit, the higher your level climbs! Keep exploring and sharing your discoveries with the community."
    }
  ];

  return (
    <View className="flex-1 bg-[#f8f9fa] dark:bg-stone-950">
      {/* Header */}
      <View className="pt-14 pb-4 px-6 bg-white dark:bg-stone-900 flex-row items-center border-b border-stone-200 dark:border-stone-800 shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-stone-100 dark:active:bg-stone-800">
          <ArrowLeft size={24} color={darkMode ? "#ffffff" : "#1c1917"} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-stone-900 dark:text-white ml-2">Help & Support</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* Contact Support Section */}
        <Text className="text-stone-500 dark:text-stone-400 font-bold text-[12px] uppercase tracking-wider ml-4 mb-3">Contact Us</Text>
        <View className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 mb-8 overflow-hidden shadow-sm">
          <TouchableOpacity 
            onPress={handleEmailSupport}
            className="flex-row items-center px-5 py-4 active:bg-stone-50 dark:active:bg-stone-800/50"
          >
            <View className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-full items-center justify-center mr-4">
              <Mail size={20} color="#eb6e4b" />
            </View>
            <View className="flex-1">
              <Text className="text-stone-900 dark:text-white font-bold text-[15px] mb-0.5">Email Support</Text>
              <Text className="text-stone-500 dark:text-stone-400 text-[12px]">Get help within 24 hours</Text>
            </View>
            <ChevronRight size={18} color="#d6d3d1" />
          </TouchableOpacity>
          
          <View className="h-[1px] bg-stone-100 dark:bg-stone-800 mx-5" />
          
          <TouchableOpacity 
            className="flex-row items-center px-5 py-4 active:bg-stone-50 dark:active:bg-stone-800/50"
          >
            <View className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-full items-center justify-center mr-4">
              <MessageSquare size={20} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className="text-stone-900 dark:text-white font-bold text-[15px] mb-0.5">Live Chat</Text>
              <Text className="text-stone-500 dark:text-stone-400 text-[12px]">Currently offline</Text>
            </View>
            <ChevronRight size={18} color="#d6d3d1" />
          </TouchableOpacity>
        </View>

        {/* FAQs Section */}
        <Text className="text-stone-500 dark:text-stone-400 font-bold text-[12px] uppercase tracking-wider ml-4 mb-3">Frequently Asked Questions</Text>
        <View className="mb-10">
          {faqs.map((faq, index) => (
            <View key={index} className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 mb-3 shadow-sm">
              <View className="flex-row items-start mb-2">
                <HelpCircle size={18} color="#eb6e4b" className="mr-2 mt-0.5" />
                <Text className="flex-1 text-stone-900 dark:text-white font-bold text-[15px] leading-5">{faq.question}</Text>
              </View>
              <Text className="text-stone-600 dark:text-stone-300 text-sm leading-5 ml-6">{faq.answer}</Text>
            </View>
          ))}
        </View>

        {/* Legal Links */}
        <View className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 mb-12 overflow-hidden shadow-sm">
          <TouchableOpacity className="flex-row items-center px-5 py-4 active:bg-stone-50 dark:active:bg-stone-800/50">
            <View className="w-8 items-center justify-center mr-3">
              <FileText size={20} color={darkMode ? "#a8a29e" : "#57534e"} />
            </View>
            <Text className="flex-1 text-stone-900 dark:text-white font-medium text-[14px]">Terms of Service</Text>
            <ChevronRight size={16} color="#d6d3d1" />
          </TouchableOpacity>
          <View className="h-[1px] bg-stone-100 dark:bg-stone-800 mx-5" />
          <TouchableOpacity className="flex-row items-center px-5 py-4 active:bg-stone-50 dark:active:bg-stone-800/50">
            <View className="w-8 items-center justify-center mr-3">
              <FileText size={20} color={darkMode ? "#a8a29e" : "#57534e"} />
            </View>
            <Text className="flex-1 text-stone-900 dark:text-white font-medium text-[14px]">Privacy Policy</Text>
            <ChevronRight size={16} color="#d6d3d1" />
          </TouchableOpacity>
        </View>
        
      </ScrollView>
    </View>
  );
}
