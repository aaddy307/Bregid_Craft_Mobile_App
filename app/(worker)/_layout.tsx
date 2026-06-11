import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants';

export default function WorkerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.leatherTan,
        tabBarInactiveTintColor: colors.mutedSage,
        tabBarStyle: {
          backgroundColor: colors.factoryWhite,
          borderTopColor: colors.outlineVariant,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="log-production/step1-select"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="log-production/step2-details"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="log-production/step3-confirm"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}