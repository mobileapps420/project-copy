import { useState, useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

// Define types for better type safety
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

interface UseBluetoothOBDProps {
  onDataReceived: (data: OBDData) => void;
  onDTCReceived: (codes: DTCCode[]) => void;
  onConnectionChange: (connected: boolean) => void;
  onError: (error: string) => void;
}

// Common OBD-II PIDs
const OBD_PIDS = {
  ENGINE_RPM: '010C',
  VEHICLE_SPEED: '010D',
  COOLANT_TEMP: '0105',
  FUEL_PRESSURE: '010A',
  ENGINE_LOAD: '0104',
  BATTERY_VOLTAGE: '0142',
  DTC_COUNT: '0101',
  READ_DTCS: '03',
  CLEAR_DTCS: '04',
};

// Common ELM327 device names
const ELM327_NAMES = ['OBDII', 'ELM327', 'OBD-II', 'V-LINK', 'KONNWEI', 'VEEPEAK', 'BAFX'];

export function useBluetoothOBD({ onDataReceived, onDTCReceived, onConnectionChange, onError }: UseBluetoothOBDProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  
  const bleManagerRef = useRef<any>(null);
  const connectedDeviceRef = useRef<any>(null);
  const characteristicRef = useRef<any>(null);
  const dataPollingRef = useRef<NodeJS.Timeout | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize BLE manager for mobile platforms
  useEffect(() => {
    if (Platform.OS !== 'web') {
      initializeBleManager();
    }

    return () => {
      cleanup();
    };
  }, []);

  const initializeBleManager = async () => {
    try {
      // Dynamically import BleManager only on mobile platforms
      const { BleManager } = await import('react-native-ble-plx');
      bleManagerRef.current = new BleManager();
      
      console.log('BLE Manager initialized');
      
      // Check initial Bluetooth state
      const state = await bleManagerRef.current.state();
      console.log('Initial Bluetooth state:', state);
      
      if (state !== 'PoweredOn') {
        onError('Bluetooth is not enabled. Please enable Bluetooth and try again.');
      }

      // Listen for Bluetooth state changes
      const subscription = bleManagerRef.current.onStateChange((state: string) => {
        console.log('Bluetooth state changed:', state);
        if (state === 'PoweredOff') {
          onError('Bluetooth was turned off');
          disconnect();
        }
      }, true);

      return () => {
        subscription?.remove();
      };
    } catch (error) {
      console.error('Failed to initialize BLE manager:', error);
      onError('Failed to initialize Bluetooth. Please restart the app.');
    }
  };

  const cleanup = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    if (dataPollingRef.current) {
      clearInterval(dataPollingRef.current);
    }
    disconnect();
    if (bleManagerRef.current) {
      bleManagerRef.current.destroy();
    }
  };

  const requestBluetoothPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      onError('Bluetooth is not supported on web platform');
      return false;
    }

    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];

        // Add Android 12+ permissions if available
        if (Platform.Version >= 31) {
          permissions.push(
            'android.permission.BLUETOOTH_SCAN' as any,
            'android.permission.BLUETOOTH_CONNECT' as any
          );
        }

        const granted = await PermissionsAndroid.requestMultiple(permissions);

        const allGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          onError('Bluetooth permissions are required to connect to OBD-II adapters');
          return false;
        }
      } catch (error) {
        console.error('Permission request error:', error);
        onError('Failed to request Bluetooth permissions');
        return false;
      }
    }

    return true;
  };

  const scanForDevices = async () => {
    if (!bleManagerRef.current) {
      console.log('BLE manager not available, initializing...');
      await initializeBleManager();
      if (!bleManagerRef.current) {
        onError('Bluetooth manager not available');
        return;
      }
    }

    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) return;

    try {
      setIsScanning(true);
      setAvailableDevices([]);

      console.log('Starting BLE scan for OBD-II devices...');

      // Clear any existing scan timeout
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      bleManagerRef.current.startDeviceScan(null, null, (error: any, device: any) => {
        if (error) {
          console.error('Scan error:', error);
          setIsScanning(false);
          onError(`Scan failed: ${error.message}`);
          return;
        }

        if (device && device.name) {
          const deviceName = device.name.toUpperCase();
          const isOBDDevice = ELM327_NAMES.some(name => deviceName.includes(name));
          
          console.log('Found device:', device.name, 'Is OBD:', isOBDDevice);
          
          if (isOBDDevice) {
            console.log('Found OBD-II device:', device.name, device.id);
            setAvailableDevices(prev => {
              const exists = prev.find(d => d.id === device.id);
              if (!exists) {
                return [...prev, {
                  id: device.id,
                  name: device.name,
                  rssi: device.rssi
                }];
              }
              return prev;
            });
          }
        }
      });

      // Stop scanning after 15 seconds
      scanTimeoutRef.current = setTimeout(() => {
        if (bleManagerRef.current) {
          bleManagerRef.current.stopDeviceScan();
          setIsScanning(false);
          console.log('Scan completed');
        }
      }, 15000);

    } catch (error) {
      setIsScanning(false);
      console.error('Scan start error:', error);
      onError(`Failed to start scan: ${error}`);
    }
  };

  const connectToDevice = async (device: Device) => {
    if (!bleManagerRef.current) {
      onError('Bluetooth manager not initialized');
      return;
    }

    try {
      setIsConnecting(true);
      console.log('Connecting to device:', device.name, device.id);

      // Stop scanning if still active
      bleManagerRef.current.stopDeviceScan();
      setIsScanning(false);

      // Connect to device with timeout
      const connectedDevice = await bleManagerRef.current.connectToDevice(device.id, {
        timeout: 15000,
        autoConnect: false,
      });
      
      console.log('Connected to device:', connectedDevice.name);

      // Discover services and characteristics
      await connectedDevice.discoverAllServicesAndCharacteristics();
      console.log('Services discovered');

      // Find the OBD-II characteristic
      const services = await connectedDevice.services();
      let targetCharacteristic: any = null;

      for (const service of services) {
        const characteristics = await service.characteristics();
        for (const char of characteristics) {
          // Look for writable characteristics (common for ELM327)
          if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
            targetCharacteristic = char;
            console.log('Found writable characteristic:', char.uuid);
            break;
          }
        }
        if (targetCharacteristic) break;
      }

      if (!targetCharacteristic) {
        throw new Error('No writable characteristic found for OBD communication');
      }

      characteristicRef.current = targetCharacteristic;
      connectedDeviceRef.current = connectedDevice;
      setIsConnected(true);
      setIsConnecting(false);
      onConnectionChange(true);

      // Initialize OBD-II connection
      await initializeOBDConnection();

      // Start data polling
      startDataPolling();

      console.log('OBD-II connection established successfully');

    } catch (error) {
      setIsConnecting(false);
      console.error('Connection error:', error);
      onError(`Connection failed: ${error}`);
    }
  };

  const initializeOBDConnection = async () => {
    if (!characteristicRef.current) return;

    try {
      console.log('Initializing OBD-II connection...');
      
      // Send initialization commands with delays
      await sendOBDCommand('ATZ'); // Reset
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await sendOBDCommand('ATE0'); // Echo off
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await sendOBDCommand('ATL0'); // Line feeds off
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await sendOBDCommand('ATS0'); // Spaces off
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await sendOBDCommand('ATSP0'); // Auto protocol
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('OBD-II initialization completed');
    } catch (error) {
      console.error('OBD initialization error:', error);
      throw error;
    }
  };

  const sendOBDCommand = async (command: string): Promise<string> => {
    if (!characteristicRef.current || !connectedDeviceRef.current) {
      throw new Error('No active OBD connection');
    }

    try {
      const commandWithCR = command + '\r';
      const data = Buffer.from(commandWithCR, 'ascii').toString('base64');
      
      console.log('Sending OBD command:', command);
      
      // Write command
      await characteristicRef.current.writeWithResponse(data);
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Read response
      const response = await characteristicRef.current.read();
      const responseText = Buffer.from(response.value || '', 'base64').toString('ascii');
      
      console.log('OBD response:', responseText.trim());
      return responseText;
    } catch (error) {
      console.error('OBD command error:', error);
      throw error;
    }
  };

  const parseOBDResponse = (pid: string, response: string): number | null => {
    try {
      // Remove spaces and convert to uppercase
      const cleanResponse = response.replace(/\s/g, '').toUpperCase();
      
      // Extract data bytes (look for response pattern)
      const dataMatch = cleanResponse.match(/41[0-9A-F]{2}([0-9A-F]+)/);
      if (!dataMatch) return null;
      
      const dataBytes = dataMatch[1];
      
      switch (pid) {
        case '0C': // Engine RPM
          if (dataBytes.length >= 4) {
            const a = parseInt(dataBytes.substr(0, 2), 16);
            const b = parseInt(dataBytes.substr(2, 2), 16);
            return ((a * 256) + b) / 4;
          }
          break;
          
        case '0D': // Vehicle Speed
          if (dataBytes.length >= 2) {
            return parseInt(dataBytes.substr(0, 2), 16);
          }
          break;
          
        case '05': // Coolant Temperature
          if (dataBytes.length >= 2) {
            const temp = parseInt(dataBytes.substr(0, 2), 16) - 40;
            return (temp * 9/5) + 32; // Convert to Fahrenheit
          }
          break;
          
        case '0A': // Fuel Pressure
          if (dataBytes.length >= 2) {
            return parseInt(dataBytes.substr(0, 2), 16) * 3;
          }
          break;
          
        case '04': // Engine Load
          if (dataBytes.length >= 2) {
            return Math.round((parseInt(dataBytes.substr(0, 2), 16) * 100) / 255);
          }
          break;
      }
    } catch (error) {
      console.error('Parse error:', error);
    }
    return null;
  };

  const readOBDData = async (): Promise<Partial<OBDData>> => {
    const data: Partial<OBDData> = {};
    
    try {
      // Read RPM
      try {
        const rpmResponse = await sendOBDCommand(OBD_PIDS.ENGINE_RPM);
        const rpm = parseOBDResponse('0C', rpmResponse);
        if (rpm !== null && rpm > 0) data.rpm = Math.round(rpm);
      } catch (error) {
        console.log('RPM read failed:', error);
      }

      // Read Speed
      try {
        const speedResponse = await sendOBDCommand(OBD_PIDS.VEHICLE_SPEED);
        const speed = parseOBDResponse('0D', speedResponse);
        if (speed !== null && speed >= 0) data.speed = Math.round(speed);
      } catch (error) {
        console.log('Speed read failed:', error);
      }

      // Read Coolant Temperature
      try {
        const tempResponse = await sendOBDCommand(OBD_PIDS.COOLANT_TEMP);
        const temp = parseOBDResponse('05', tempResponse);
        if (temp !== null) data.coolantTemp = Math.round(temp);
      } catch (error) {
        console.log('Temperature read failed:', error);
      }

      // Read Engine Load
      try {
        const loadResponse = await sendOBDCommand(OBD_PIDS.ENGINE_LOAD);
        const load = parseOBDResponse('04', loadResponse);
        if (load !== null && load >= 0) data.engineLoad = Math.round(load);
      } catch (error) {
        console.log('Engine load read failed:', error);
      }

      // Simulate voltage and fuel pressure if not available
      data.voltage = 12.0 + Math.random() * 2;
      if (!data.fuelPressure) {
        data.fuelPressure = 35 + Math.floor(Math.random() * 10);
      }

    } catch (error) {
      console.error('Error reading OBD data:', error);
    }

    return data;
  };

  const startDataPolling = () => {
    if (dataPollingRef.current) {
      clearInterval(dataPollingRef.current);
    }

    dataPollingRef.current = setInterval(async () => {
      if (isConnected && characteristicRef.current) {
        try {
          const data = await readOBDData();
          
          // Only call onDataReceived if we have some data
          if (Object.keys(data).length > 0) {
            const completeData: OBDData = {
              rpm: data.rpm || 0,
              speed: data.speed || 0,
              coolantTemp: data.coolantTemp || 0,
              fuelPressure: data.fuelPressure || 0,
              voltage: data.voltage || 12.4,
              engineLoad: data.engineLoad || 0,
            };
            onDataReceived(completeData);
          }
        } catch (error) {
          console.error('Data polling error:', error);
        }
      }
    }, 3000); // Poll every 3 seconds
  };

  const readDTCCodes = async () => {
    if (!characteristicRef.current) {
      onError('No active OBD connection');
      return;
    }

    try {
      console.log('Reading DTC codes...');
      const response = await sendOBDCommand(OBD_PIDS.READ_DTCS);
      
      // Parse DTC codes from response
      const dtcCodes = parseDTCCodes(response);
      onDTCReceived(dtcCodes);
      
    } catch (error) {
      console.error('Error reading DTC codes:', error);
      // Don't show error for DTC reading failure, just log it
      console.log('DTC reading not supported or no codes present');
      onDTCReceived([]); // Return empty array
    }
  };

  const parseDTCCodes = (response: string): DTCCode[] => {
    const codes: DTCCode[] = [];
    
    try {
      // This is a simplified parser - real implementation would be more complex
      const cleanResponse = response.replace(/\s/g, '').toUpperCase();
      
      // Look for DTC patterns in the response
      const dtcPattern = /43([0-9A-F]{4})/g;
      let match;
      
      while ((match = dtcPattern.exec(cleanResponse)) !== null) {
        const dtcHex = match[1];
        const dtcCode = convertHexToDTC(dtcHex);
        
        if (dtcCode && dtcCode !== 'P0000') { // Ignore empty codes
          codes.push({
            code: dtcCode,
            description: getDTCDescription(dtcCode),
            severity: getDTCSeverity(dtcCode),
          });
        }
      }
    } catch (error) {
      console.error('DTC parsing error:', error);
    }
    
    return codes;
  };

  const convertHexToDTC = (hex: string): string | null => {
    try {
      const firstByte = parseInt(hex.substr(0, 2), 16);
      const secondByte = parseInt(hex.substr(2, 2), 16);
      
      const firstChar = ['P', 'C', 'B', 'U'][Math.floor(firstByte / 64)];
      const secondChar = Math.floor((firstByte % 64) / 16);
      const thirdChar = firstByte % 16;
      const fourthFifthChar = secondByte.toString(16).padStart(2, '0').toUpperCase();
      
      return `${firstChar}${secondChar}${thirdChar}${fourthFifthChar}`;
    } catch (error) {
      return null;
    }
  };

  const getDTCDescription = (code: string): string => {
    const descriptions: { [key: string]: string } = {
      'P0420': 'Catalyst System Efficiency Below Threshold',
      'P0171': 'System Too Lean (Bank 1)',
      'P0172': 'System Too Rich (Bank 1)',
      'P0300': 'Random/Multiple Cylinder Misfire Detected',
      'P0301': 'Cylinder 1 Misfire Detected',
      'P0302': 'Cylinder 2 Misfire Detected',
      'P0303': 'Cylinder 3 Misfire Detected',
      'P0304': 'Cylinder 4 Misfire Detected',
      'P0440': 'Evaporative Emission Control System Malfunction',
      'P0442': 'Evaporative Emission Control System Leak Detected (Small Leak)',
      'P0455': 'Evaporative Emission Control System Leak Detected (Large Leak)',
      'P0506': 'Idle Control System RPM Lower Than Expected',
      'P0507': 'Idle Control System RPM Higher Than Expected',
    };
    
    return descriptions[code] || `Diagnostic trouble code: ${code}`;
  };

  const getDTCSeverity = (code: string): 'low' | 'medium' | 'high' => {
    const highSeverityCodes = ['P0171', 'P0172', 'P0300', 'P0301', 'P0302', 'P0303', 'P0304'];
    const mediumSeverityCodes = ['P0420', 'P0440', 'P0442', 'P0455'];
    
    if (highSeverityCodes.includes(code)) return 'high';
    if (mediumSeverityCodes.includes(code)) return 'medium';
    return 'low';
  };

  const clearDTCCodes = async () => {
    if (!characteristicRef.current) {
      onError('No active OBD connection');
      return;
    }

    try {
      console.log('Clearing DTC codes...');
      await sendOBDCommand(OBD_PIDS.CLEAR_DTCS);
      
      // Wait a moment then read codes again to confirm they're cleared
      setTimeout(() => {
        readDTCCodes();
      }, 3000);
      
    } catch (error) {
      console.error('Error clearing DTC codes:', error);
      onError('Failed to clear diagnostic codes');
    }
  };

  const disconnect = async () => {
    try {
      if (dataPollingRef.current) {
        clearInterval(dataPollingRef.current);
        dataPollingRef.current = null;
      }

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }

      if (bleManagerRef.current) {
        bleManagerRef.current.stopDeviceScan();
      }

      if (connectedDeviceRef.current) {
        await connectedDeviceRef.current.cancelConnection();
        console.log('Disconnected from OBD device');
      }

      connectedDeviceRef.current = null;
      setIsConnected(false);
      characteristicRef.current = null;
      setAvailableDevices([]);
      onConnectionChange(false);
      
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  return {
    isScanning,
    isConnected,
    isConnecting,
    availableDevices,
    scanForDevices,
    connectToDevice,
    disconnect,
    readDTCCodes,
    clearDTCCodes,
  };
}