import React from "react"
import { StatusBar, useColorScheme } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AuthProvider } from "../context/AuthContext"
import RootNavigator from "../navigation/RootNavigator"

function App() {
  const isDarkMode = useColorScheme() === "dark"

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App