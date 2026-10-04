import { ExpoConfig, ConfigContext } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "PrixCI",
  slug: "prixci",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "ci.prixci.app",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "PrixCI utilise votre position pour afficher les prix dans votre quartier.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FFFFFF",
    },
    package: "ci.prixci.app",
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
  },
  plugins: [
    "expo-router",
    "expo-sqlite",
    "expo-status-bar",
    "expo-font",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 220,
        resizeMode: "contain",
        backgroundColor: "#FFFFFF",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "PrixCI utilise votre position pour afficher les prix dans votre quartier.",
      },
    ],
  ],
  scheme: "prixci",
  experiments: {
    typedRoutes: true,
  },
});