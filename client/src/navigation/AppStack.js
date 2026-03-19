import React from "react"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import BottomTabNavigator from "./BottomTabNavigator"
import ParentMapView from "../components/ParentMapView"

const Stack = createNativeStackNavigator()

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen name="FamilyMap" component={ParentMapView} />
    </Stack.Navigator>
  )
}