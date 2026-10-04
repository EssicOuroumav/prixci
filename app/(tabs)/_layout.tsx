import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import Icone from "@/components/Icone";
import { NomIcone } from "@/constants/types";

const VERT = "#0A5F38";

function TabIcon({
  icone,
  iconeActive,
  label,
  focused,
}: {
  icone: NomIcone;
  iconeActive: NomIcone;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={styles.tabIconContainer}>
      <Icone nom={focused ? iconeActive : icone} taille={23} couleur={focused ? VERT : "#999999"} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: styles.tabBar, tabBarShowLabel: false }}>
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon icone="home-outline" iconeActive="home" label="Accueil" focused={focused} /> }} />
      <Tabs.Screen name="explorer" options={{ tabBarIcon: ({ focused }) => <TabIcon icone="search-outline" iconeActive="search" label="Explorer" focused={focused} /> }} />
      <Tabs.Screen name="enseignes" options={{ tabBarIcon: ({ focused }) => <TabIcon icone="storefront-outline" iconeActive="storefront" label="Enseignes" focused={focused} /> }} />
      <Tabs.Screen name="signaler" options={{ tabBarIcon: ({ focused }) => <TabIcon icone="megaphone-outline" iconeActive="megaphone" label="Signaler" focused={focused} /> }} />
      <Tabs.Screen name="profil" options={{ tabBarIcon: ({ focused }) => <TabIcon icone="person-outline" iconeActive="person" label="Profil" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E8EDE9", height: 70, paddingBottom: 8 },
  tabIconContainer: { alignItems: "center", justifyContent: "center", paddingTop: 6, width: 70 },
  tabLabel: { fontSize: 10, color: "#999999", marginTop: 2, fontWeight: "400" },
  tabLabelActive: { color: VERT, fontWeight: "700" },
});
