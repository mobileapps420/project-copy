import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Bluetooth, Settings, Smartphone } from 'lucide-react-native';

interface BluetoothPermissionHelperProps {
  onRetry: () => void;
}

export default function BluetoothPermissionHelper({ onRetry }: BluetoothPermissionHelperProps) {
  const openSettings = () => {
    if (Platform.OS === 'android') {
      Alert.alert(
        'Enable Bluetooth Permissions',
        'To use OBD-II connectivity, please:\n\n1. Go to Settings > Apps > CarDiag AI\n2. Enable Location and Bluetooth permissions\n3. Return to the app and try again',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => {
            // In a real app, you would use Linking.openSettings()
            // For now, we'll just show instructions
          }}
        ]
      );
    } else {
      Alert.alert(
        'Enable Bluetooth',
        'To use OBD-II connectivity, please:\n\n1. Go to Settings > Privacy & Security > Bluetooth\n2. Enable Bluetooth for CarDiag AI\n3. Return to the app and try again',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => {
            // In a real app, you would use Linking.openSettings()
            // For now, we'll just show instructions
          }}
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Bluetooth size={48} color="#A7C5BD" />
      </View>
      
      <Text style={styles.title}>Bluetooth Permissions Required</Text>
      <Text style={styles.description}>
        CarDiag AI needs Bluetooth and Location permissions to connect to your OBD-II adapter and read vehicle data.
      </Text>

      <View style={styles.stepsContainer}>
        <Text style={styles.stepsTitle}>Required Permissions:</Text>
        <View style={styles.step}>
          <Bluetooth size={16} color="#A7C5BD" />
          <Text style={styles.stepText}>Bluetooth - Connect to OBD-II adapter</Text>
        </View>
        <View style={styles.step}>
          <Smartphone size={16} color="#A7C5BD" />
          <Text style={styles.stepText}>Location - Required for Bluetooth scanning</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
          <Settings size={16} color="#FFFFFF" />
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.note}>
        Note: Location permission is only used for Bluetooth device discovery and is not used to track your location.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F7FAFC',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#A7C5BD20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepText: {
    fontSize: 14,
    color: '#000000',
    marginLeft: 12,
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A7C5BD',
    borderRadius: 16,
    paddingVertical: 16,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  retryButton: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
  note: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'center',
    lineHeight: 16,
  },
});