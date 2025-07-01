import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Bell, Volume2, Bluetooth, LogOut, ChevronRight, Car, Mic, Camera, Settings as SettingsIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoConnectOBD, setAutoConnectOBD] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        },
      ]
    );
  };

  const handleAccountSettings = () => {
    router.push('/account-settings');
  };

  const handleVehicleProfile = () => {
    router.push('/vehicle-profile');
  };

  const renderSettingItem = (
    icon: React.ReactNode,
    title: string,
    subtitle?: string,
    rightElement?: React.ReactNode,
    onPress?: () => void,
    iconColor: string = '#A7C5BD'
  ) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: iconColor + '20' }]}>
          {React.cloneElement(icon as React.ReactElement, { color: iconColor })}
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || <ChevronRight size={20} color="#A0AEC0" />}
    </TouchableOpacity>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <SettingsIcon size={20} color="#000000" />
            </View>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        {renderSection('Profile', 
          renderSettingItem(
            <User size={20} />,
            'Account',
            user?.email || 'Manage your profile and preferences',
            undefined,
            handleAccountSettings,
            '#A7C5BD'
          )
        )}

        {/* Vehicle Information - Moved here after Profile */}
        {renderSection('Vehicle', 
          renderSettingItem(
            <Car size={20} />,
            'Vehicle Profile',
            'Add your vehicle details for better diagnostics',
            undefined,
            handleVehicleProfile,
            '#9F7AEA'
          )
        )}

        {/* Diagnostic Settings */}
        {renderSection('Diagnostic Features', 
          <>
            {renderSettingItem(
              <Mic size={20} />,
              'Voice Interactions',
              'Enable voice commands and responses',
              <Switch
                value={voiceEnabled}
                onValueChange={setVoiceEnabled}
                trackColor={{ false: '#E2E8F0', true: '#68D391' }}
                thumbColor="#FFFFFF"
              />,
              undefined,
              '#68D391'
            )}
            {renderSettingItem(
              <Camera size={20} />,
              'Camera Access',
              'Allow camera for visual diagnostics',
              <ChevronRight size={20} color="#A0AEC0" />,
              () => Alert.alert('Camera', 'Camera permissions managed in system settings'),
              '#F6AD55'
            )}
            {renderSettingItem(
              <Bluetooth size={20} />,
              'Auto-connect OBD',
              'Automatically connect to known OBD-II adapters',
              <Switch
                value={autoConnectOBD}
                onValueChange={setAutoConnectOBD}
                trackColor={{ false: '#E2E8F0', true: '#A7C5BD' }}
                thumbColor="#FFFFFF"
              />,
              undefined,
              '#A7C5BD'
            )}
          </>
        )}

        {/* Notifications */}
        {renderSection('Notifications', 
          <>
            {renderSettingItem(
              <Bell size={20} />,
              'Push Notifications',
              'Receive alerts for diagnostic issues',
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#E2E8F0', true: '#F6AD55' }}
                thumbColor="#FFFFFF"
              />,
              undefined,
              '#F6AD55'
            )}
            {renderSettingItem(
              <Volume2 size={20} />,
              'Sound Alerts',
              'Play sounds for important notifications',
              <ChevronRight size={20} color="#A0AEC0" />,
              () => Alert.alert('Sound Alerts', 'Sound settings coming soon'),
              '#4FD1C7'
            )}
          </>
        )}

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <LogOut size={20} color="#F56565" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#A7C5BD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 90 : 70, // Minimal padding - just enough to clear the tab bar
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#000000',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 101, 101, 0.1)',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 32,
    marginBottom: 0, // Removed bottom margin completely
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 101, 101, 0.2)',
  },
  signOutText: {
    color: '#F56565',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});