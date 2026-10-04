import { ExpoConfig, ConfigContext } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "PrixCI",
  slug: "prixci",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    backgroundColor: "#0A5F38",
  },
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
      backgroundColor: "#0A5F38",
    },
    package: "ci.prixci.app",
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
  },
  plugins: [
    "expo-router",
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