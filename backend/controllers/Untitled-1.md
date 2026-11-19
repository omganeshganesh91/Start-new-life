The startup crash is fixed: AppNavigator.js now imports the missing hs helper. I also opened the app in a browser and confirmed the dashboard renders.

Run it on a phone over Wi-Fi
Install Expo Go on your phone.
In the project-root .env, set EXPO_PUBLIC_API_URL to your computer’s LAN address, for example http://192.168.1.25:5000. Find the address with ipconfig. Don’t use localhost for a physical phone.
Open one PowerShell window and start the backend:

Open another PowerShell window and start Expo:

Scan the QR code using Expo Go. Keep the phone and computer on the same Wi-Fi, and allow Node.js through Windows Firewall if prompted.
For an Android emulator, use http://10.0.2.2:5000 as the API URL instead.

Install a local Android build
With Android Studio, the Android SDK, and an Android phone with USB debugging enabled—or an open emulator—run this from the project root:


That builds and installs the app locally. Unlike npx expo start --android, it creates/runs a native Android build. This project uses Expo SDK 51; if Expo Go reports an SDK mismatch, use the local-build option. Local iOS builds require macOS and Xcode.

The shadow* message is a React Navigation web-style deprecation warning, not the crash. The Gemini 503 shown in the browser means the backend isn’t configured with a Gemini key; the app still loads with fallback motivation. Setup details are in README.md.


+42
-19
11:57 PM
1m 43s
•
Au