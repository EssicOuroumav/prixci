import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabIconContainer}>
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: styles.tabBar, tabBarShowLabel: false }}>
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Accueil" focused={focused} /> }} />
      <Tabs.Screen name="explorer" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" label="Explorer" focused={focused} /> }} />
      <Tabs.Screen name="enseignes" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏪" label="Enseignes" focused={focused} /> }} />
      <Tabs.Screen name="signaler" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📢" label="Signaler" focused={focused} /> }} />
      <Tabs.Screen name="profil" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profil" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E8EDE9", height: 70, paddingBottom: 8 },
  tabIconContainer: { alignItems: "center", justifyContent: "center", paddingTop: 6 },
  tabEmoji: { fontSize: 22 },
  tabLabel: { fontSize: 10, color: "#999999", marginTop: 2, fontWeight: "400" },
  tabLabelActive: { color: "#0A5F38", fontWeight: "700" },
});