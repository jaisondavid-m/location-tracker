import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen'
import Header from '../components/Header';

const Tab = createBottomTabNavigator();

const C = {
  bg: '#FFFFFF',
  border: '#F0EDE8',
  orange: '#F97316',
  muted: '#BBA898',
  dot: '#F97316',
};

const tabIcon = (routeName, focused) => {
  const icons = {
    Home: focused ? 'home' : 'home-outline',
    ChildHome: focused ? 'account' : 'account-outline',
    Settings: focused ? 'cog' : 'cog-outline',
  };
  return icons[routeName] || 'circle';
};
const TabBarIcon = React.memo(({ name, focused, color, size }) => (
  <View style={styles.iconWrap}>
    <Icon name={name} size={size} color={color} />
    {focused && <View style={styles.activeDot} />}
  </View>
));

export default function BottomTabNavigator() {
  const screenOptions = useMemo(() => ({
    header: Header,

    tabBarStyle: {
      backgroundColor: C.bg,
      borderTopColor: C.border,
      borderTopWidth: 1,
      height: 68,
      paddingBottom: 10,
      paddingTop: 8,
      shadowColor: '#F97316',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: -2 },
      elevation: 3,
    },

    tabBarActiveTintColor: C.orange,
    tabBarInactiveTintColor: C.muted,

    tabBarLabelStyle: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.4,
      marginTop: 2,
    },
    lazy: true,
  }), []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...screenOptions,
        tabBarIcon: ({ focused, color, size }) => (
          <TabBarIcon
            name={tabIcon(route.name, focused)}
            focused={focused}
            color={color}
            size={22}
          />
        ),
      })}
    >

      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />

      <Tab.Screen
        name="ChildHome"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />

    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.dot,
    marginTop: 4,
  },
});