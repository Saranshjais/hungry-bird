import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hungry-bird-jye4.onrender.com';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const registerForPushNotificationsAsync = async () => {
    // Push notifications are not supported in Expo Go since SDK 53
    if (Constants.appOwnership === 'expo') {
      console.log('Push notifications are not supported in Expo Go. Please use a development build.');
      return null;
    }

    let token;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#eb6e4b',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return null;
      }
      try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync();
        token = tokenResponse.data;
      } catch (e) {
        console.log("Error getting push token:", e);
      }
    }
    return token;
  };

  const uploadPushToken = async () => {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      try {
        await axios.put(`${API_URL}/api/auth/push-token`, { token });
      } catch (e) {
        console.log("Failed to upload push token");
      }
    }
  };

  const loadUser = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      const storedUser = await SecureStore.getItemAsync('user');
      
      if (storedToken && storedUser) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        uploadPushToken();
      }
    } catch (e) {
      console.error("Failed to load session", e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      
      if (res.data.token) {
        const userData = { email, name: res.data.user?.name || 'User' };
        await SecureStore.setItemAsync('token', res.data.token);
        await SecureStore.setItemAsync('user', JSON.stringify(userData));
        
        setUser(userData);
        setToken(res.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        uploadPushToken();
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || "Login failed" };
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, { name, email, password });
      
      if (res.data.token) {
        const userData = { email, name };
        await SecureStore.setItemAsync('token', res.data.token);
        await SecureStore.setItemAsync('user', JSON.stringify(userData));
        
        setUser(userData);
        setToken(res.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        uploadPushToken();
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || "Registration failed" };
    }
  };

  const updateProfile = async (name: string, email: string, phone: string) => {
    try {
      const res = await axios.put(`${API_URL}/api/auth/profile`, { name, email, phone });
      const updatedUser = res.data.user;
      setUser(updatedUser);
      await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || "Failed to update profile" };
    }
  };

  const updateNotificationsPreference = async (enabled: boolean) => {
    try {
      await axios.put(`${API_URL}/api/auth/notifications-preference`, { enabled });
      const updatedUser = { ...user, notifications_enabled: enabled };
      setUser(updatedUser);
      await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || "Failed to update preference" };
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setUser(null);
    setToken(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const deleteAccount = async () => {
    try {
      await axios.delete(`${API_URL}/api/auth/account`);
      await logout();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || "Failed to delete account" };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, updateProfile, updateNotificationsPreference, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
