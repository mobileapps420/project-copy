# CarDiag AI Pro

A React Native application for car diagnostics using Bluetooth OBD-II connection.

## Development Setup

### Prerequisites
- Node.js
- Xcode (for iOS development)
- CocoaPods
- Physical iOS device (for Bluetooth testing)

### iOS Development Setup

1. Install dependencies:
```bash
npm install
```

2. Generate iOS build files:
```bash
npx expo prebuild -p ios --clean
```

3. Install CocoaPods:
```bash
cd ios
pod install
cd ..
```

4. Open the project in Xcode:
- Navigate to the `ios` folder
- Open `CarDiagAIPro.xcworkspace` (not .xcodeproj)
- Select your development team in signing settings
- Select your connected iOS device
- Build and run (⌘R)

### Important Notes
- Bluetooth functionality requires a physical device
- First launch may require trusting the developer certificate:
  - On your iOS device: Settings > General > Device Management
  - Find your Apple ID/development certificate
  - Tap "Trust"

## Project Configuration
- React Native: 0.79.1
- Expo SDK: 53.0.0
- Bluetooth: react-native-ble-plx ^3.2.0
- Bundle ID: com.cardiag.ai
