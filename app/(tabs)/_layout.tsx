import { Tabs } from 'expo-router';
import { MessageCircle, Activity, History, Settings } from 'lucide-react-native';
import { View, StyleSheet, Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'ios' ? 90 : 70, // Account for iOS safe area
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          paddingBottom: Platform.OS === 'ios' ? 25 : 10, // iOS safe area padding
          paddingTop: 8,
          paddingHorizontal: 16,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#A0AEC0',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          height: Platform.OS === 'ios' ? 50 : 45,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Diagnostic',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <MessageCircle 
                size={focused ? 28 : 26} 
                color={color} 
                strokeWidth={focused ? 2.5 : 2} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="data"
        options={{
          title: 'Live Data',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Activity 
                size={focused ? 28 : 26} 
                color={color} 
                strokeWidth={focused ? 2.5 : 2} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <History 
                size={focused ? 28 : 26} 
                color={color} 
                strokeWidth={focused ? 2.5 : 2} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Settings 
                size={focused ? 28 : 26} 
                color={color} 
                strokeWidth={focused ? 2.5 : 2} 
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(167, 197, 189, 0.15)',
    transform: [{ scale: 1.08 }],
  },
});