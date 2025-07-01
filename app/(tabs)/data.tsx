import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bluetooth, BluetoothOff, Thermometer, Gauge, Fuel, Zap, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, RefreshCw, Trash2, Activity, Search, Wifi, Smartphone } from 'lucide-react-native';
import { useDTCCodes } from '@/hooks/useDiagnosticSessions';
import { useBluetoothOBD } from '@/hooks/useBluetoothOBD';

interface OBDData {
  rpm: number;
  speed: number;
  coolantTemp: number;
  fuelPressure: number;
  voltage: number;
  engineLoad: number;
}

interface DTCCode {
  code: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface Device {
  id: string;
  name: string | null;
  rssi?: number;
}

export default function LiveDataScreen() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { dtcCodes, clearDTCCodes: clearStoredDTCCodes, addDTCCode } = useDTCCodes(currentSessionId);
  const [obdData, setObdData] = useState<OBDData>({
    rpm: 0,
    speed: 0,
    coolantTemp: 0,
    fuelPressure: 0,
    voltage: 12.4,
    engineLoad: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [receivedDTCCodes, setReceivedDTCCodes] = useState<DTCCode[]>([]);

  const {
    isScanning,
    isConnected,
    isConnecting,
    availableDevices,
    scanForDevices,
    connectToDevice,
    disconnect,
    readDTCCodes,
    clearDTCCodes: clearOBDDTCCodes,
  } = useBluetoothOBD({
    onDataReceived: (data: OBDData) => {
      console.log('Received OBD data:', data);
      setObdData(data);
    },
    onDTCReceived: (codes: DTCCode[]) => {
      console.log('Received DTC codes:', codes);
      setReceivedDTCCodes(codes);
      
      // Add codes to database if we have a session
      if (currentSessionId) {
        codes.forEach(async (code) => {
          try {
            await addDTCCode(code.code, code.description, code.severity);
          } catch (error) {
            console.error('Error adding DTC code to database:', error);
          }
        });
      }
    },
    onConnectionChange: (connected: boolean) => {
      console.log('Connection status changed:', connected);
      if (connected) {
        setShowDeviceList(false);
        Alert.alert('Connected', 'Successfully connected to OBD-II adapter');
        
        // Read DTC codes after successful connection
        setTimeout(() => {
          readDTCCodes();
        }, 5000);
      } else {
        // Reset data when disconnected
        setObdData({
          rpm: 0,
          speed: 0,
          coolantTemp: 0,
          fuelPressure: 0,
          voltage: 12.4,
          engineLoad: 0,
        });
        setReceivedDTCCodes([]);
      }
    },
    onError: (error: string) => {
      console.error('Bluetooth OBD error:', error);
      Alert.alert('Bluetooth Error', error);
      setShowDeviceList(false);
    },
  });

  const handleConnect = () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Web Platform',
        'Bluetooth OBD-II connectivity is not available on web. Please use the mobile app for real OBD-II functionality.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (isConnected) {
      handleDisconnect();
    } else {
      console.log('Starting connection process...');
      setShowDeviceList(true);
      scanForDevices();
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect OBD-II',
      'Are you sure you want to disconnect from the OBD-II adapter?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            disconnect();
            setShowDeviceList(false);
          },
        },
      ]
    );
  };

  const handleDeviceSelect = (device: Device) => {
    console.log('Device selected:', device);
    connectToDevice(device);
  };

  const handleClearDTCCodes = () => {
    Alert.alert(
      'Clear Diagnostic Codes',
      'This will clear codes from both the vehicle and the app. Unresolved issues may return.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Codes',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear codes from OBD-II adapter if connected
              if (isConnected) {
                await clearOBDDTCCodes();
              }
              
              // Clear codes from database
              if (currentSessionId) {
                await clearStoredDTCCodes();
              }
              
              // Clear local state
              setReceivedDTCCodes([]);
              
              Alert.alert('Success', 'Diagnostic codes cleared successfully');
            } catch (error) {
              console.error('Error clearing codes:', error);
              Alert.alert('Error', 'Failed to clear some diagnostic codes');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    
    if (isConnected) {
      // Refresh DTC codes from OBD adapter
      readDTCCodes();
    }
    
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#F56565';
      case 'medium': return '#F6AD55';
      case 'low': return '#68D391';
      default: return '#A0AEC0';
    }
  };

  const renderDataCard = (title: string, value: string, unit: string, icon: React.ReactNode, color: string) => (
    <View style={styles.dataCard}>
      <View style={[styles.cardIcon, { backgroundColor: color + '20' }]}>
        {React.cloneElement(icon as React.ReactElement, { color })}
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardUnit}>{unit}</Text>
    </View>
  );

  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={[styles.deviceItem, isConnecting && styles.deviceItemDisabled]}
      onPress={() => handleDeviceSelect(item)}
      disabled={isConnecting}
    >
      <View style={styles.deviceIcon}>
        <Bluetooth size={20} color="#A7C5BD" />
      </View>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || 'Unknown OBD Device'}</Text>
        <Text style={styles.deviceId}>{item.id}</Text>
        {item.rssi && (
          <Text style={styles.deviceRssi}>Signal: {item.rssi} dBm</Text>
        )}
      </View>
      <View style={styles.deviceSignal}>
        <Wifi size={16} color="#68D391" />
      </View>
    </TouchableOpacity>
  );

  // Combine DTC codes from both sources
  const allDTCCodes = [...dtcCodes, ...receivedDTCCodes];
  const uniqueDTCCodes = allDTCCodes.filter((code, index, self) => 
    index === self.findIndex(c => c.code === code.code)
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Activity size={20} color="#000000" />
            </View>
            <Text style={styles.headerTitle}>Live Data</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.connectionButton,
              isConnected && styles.connectedButton,
              isConnecting && styles.connectingButton
            ]}
            onPress={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <RefreshCw size={16} color="#FFFFFF" />
            ) : isConnected ? (
              <Bluetooth size={16} color="#FFFFFF" />
            ) : (
              <BluetoothOff size={16} color="#FFFFFF" />
            )}
            <Text style={styles.connectionButtonText}>
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Connect'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Device Selection Modal */}
      {showDeviceList && (
        <View style={styles.deviceListOverlay}>
          <View style={styles.deviceListContainer}>
            <View style={styles.deviceListHeader}>
              <Text style={styles.deviceListTitle}>Available OBD-II Devices</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDeviceList(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            
            {isScanning && (
              <View style={styles.scanningIndicator}>
                <RefreshCw size={16} color="#A7C5BD" />
                <Text style={styles.scanningText}>Scanning for OBD-II devices...</Text>
              </View>
            )}
            
            {availableDevices.length === 0 && !isScanning && (
              <View style={styles.noDevicesContainer}>
                <Search size={32} color="#E2E8F0" />
                <Text style={styles.noDevicesText}>No OBD-II devices found</Text>
                <Text style={styles.noDevicesSubtext}>
                  Make sure your ELM327 adapter is:
                  {'\n'}• Plugged into your vehicle's OBD-II port
                  {'\n'}• In pairing mode (usually automatic)
                  {'\n'}• Within Bluetooth range
                </Text>
                <TouchableOpacity
                  style={styles.rescanButton}
                  onPress={scanForDevices}
                >
                  <RefreshCw size={16} color="#A7C5BD" />
                  <Text style={styles.rescanButtonText}>Scan Again</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {availableDevices.length > 0 && (
              <View style={styles.deviceInstructions}>
                <Smartphone size={16} color="#A7C5BD" />
                <Text style={styles.deviceInstructionsText}>
                  Tap a device to connect
                </Text>
              </View>
            )}
            
            <FlatList
              data={availableDevices}
              renderItem={renderDeviceItem}
              keyExtractor={(item) => item.id}
              style={styles.deviceList}
            />
          </View>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A7C5BD" />
        }
      >
        {/* Live Data Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Engine Data</Text>
          <View style={styles.dataGrid}>
            {renderDataCard(
              'RPM',
              isConnected ? obdData.rpm.toString() : '--',
              'rpm',
              <Gauge size={20} />,
              '#A7C5BD'
            )}
            {renderDataCard(
              'Speed',
              isConnected ? obdData.speed.toString() : '--',
              'mph',
              <Zap size={20} />,
              '#68D391'
            )}
            {renderDataCard(
              'Coolant Temp',
              isConnected ? obdData.coolantTemp.toString() : '--',
              '°F',
              <Thermometer size={20} />,
              '#F6AD55'
            )}
            {renderDataCard(
              'Fuel Pressure',
              isConnected ? obdData.fuelPressure.toString() : '--',
              'psi',
              <Fuel size={20} />,
              '#9F7AEA'
            )}
            {renderDataCard(
              'Battery Voltage',
              isConnected ? obdData.voltage.toFixed(1) : '--',
              'V',
              <Zap size={20} />,
              '#F56565'
            )}
            {renderDataCard(
              'Engine Load',
              isConnected ? obdData.engineLoad.toString() : '--',
              '%',
              <Gauge size={20} />,
              '#4FD1C7'
            )}
          </View>
        </View>

        {/* Diagnostic Trouble Codes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Diagnostic Codes</Text>
            {uniqueDTCCodes.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearDTCCodes}
              >
                <Trash2 size={14} color="#F56565" />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {uniqueDTCCodes.length === 0 ? (
            <View style={styles.noDtcContainer}>
              <CheckCircle size={48} color="#68D391" />
              <Text style={styles.noDtcText}>No diagnostic codes found</Text>
              <Text style={styles.noDtcSubtext}>
                {isConnected 
                  ? 'Your vehicle systems are running normally'
                  : 'Connect to OBD-II adapter to read diagnostic codes'
                }
              </Text>
            </View>
          ) : (
            uniqueDTCCodes.map((dtc, index) => (
              <View key={`${dtc.code}-${index}`} style={styles.dtcCard}>
                <View style={styles.dtcHeader}>
                  <View style={styles.dtcCode}>
                    <AlertTriangle size={18} color={getSeverityColor(dtc.severity)} />
                    <Text style={[styles.dtcCodeText, { color: getSeverityColor(dtc.severity) }]}>
                      {dtc.code}
                    </Text>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(dtc.severity) }]}>
                    <Text style={styles.severityText}>{dtc.severity.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.dtcDescription}>{dtc.description}</Text>
              </View>
            ))
          )}
        </View>

        {/* Connection Status */}
        {!isConnected && Platform.OS !== 'web' && (
          <View style={styles.connectionStatus}>
            <BluetoothOff size={32} color="#000000" />
            <Text style={styles.connectionStatusText}>Connect to OBD-II adapter to view live data</Text>
            <Text style={styles.connectionStatusSubtext}>
              Supports ELM327 Bluetooth adapters and compatible devices
            </Text>
          </View>
        )}

        {Platform.OS === 'web' && (
          <View style={styles.connectionStatus}>
            <Wifi size={32} color="#000000" />
            <Text style={styles.connectionStatusText}>Web Platform Detected</Text>
            <Text style={styles.connectionStatusSubtext}>
              Bluetooth OBD-II connectivity requires the mobile app. Download the iOS or Android version for full functionality.
            </Text>
          </View>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  connectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A0AEC0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectedButton: {
    backgroundColor: '#68D391',
  },
  connectingButton: {
    backgroundColor: '#F6AD55',
  },
  connectionButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 4,
    fontSize: 12,
  },
  deviceListOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deviceListContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  deviceListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  closeButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  scanningText: {
    color: '#A7C5BD',
    fontSize: 14,
    marginLeft: 8,
  },
  noDevicesContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noDevicesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginTop: 12,
  },
  noDevicesSubtext: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 20,
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rescanButtonText: {
    color: '#A7C5BD',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  deviceInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  deviceInstructionsText: {
    color: '#A7C5BD',
    fontSize: 14,
    marginLeft: 6,
  },
  deviceList: {
    maxHeight: 300,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
    borderRadius: 8,
    marginBottom: 4,
  },
  deviceItemDisabled: {
    opacity: 0.5,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A7C5BD20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  deviceId: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 2,
  },
  deviceRssi: {
    fontSize: 11,
    color: '#68D391',
    marginTop: 1,
  },
  deviceSignal: {
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dataCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '500',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  cardUnit: {
    fontSize: 10,
    color: '#000000',
    marginTop: 2,
  },
  dtcCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dtcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dtcCode: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dtcCodeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  dtcDescription: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  noDtcContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noDtcText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 12,
  },
  noDtcSubtext: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    marginTop: 4,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 101, 101, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 101, 101, 0.2)',
  },
  clearButtonText: {
    color: '#F56565',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  connectionStatus: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  connectionStatusText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  connectionStatusSubtext: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
});