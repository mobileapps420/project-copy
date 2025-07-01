#!/bin/bash

# Exit on error
set -e

echo "🧹 Cleaning up..."
rm -rf ios

echo "📦 Installing dependencies..."
npm install

echo "🔨 Rebuilding iOS..."
npx expo prebuild -p ios --clean

echo "📱 Installing pods..."
cd ios
pod install
cd ..

echo "✅ Done! Now you can:"
echo "1. Open ios/CarDiagAIPro.xcworkspace in Xcode"
echo "2. Select your development team"
echo "3. Connect your iOS device"
echo "4. Build and run the app"
