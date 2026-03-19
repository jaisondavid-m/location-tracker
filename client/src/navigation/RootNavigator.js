import React from "react"
import { ActivityIndicator, View } from "react-native"
import { useAuth } from "../context/AuthContext"
import AuthStack from "./AuthStack"
import AppStack from "./AppStack"

export default function RootNavigator() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </>
  )
}