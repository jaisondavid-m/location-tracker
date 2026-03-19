import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import ParentHome from './ParentHome';
import ChildHome from './ChildHome';

const HomeScreen = props => {
  const { user, loading } = useAuth();

  if (!loading && user?.role === 'parent') {
    return <ParentHome {...props} />;
  }

  if (!loading && user?.role === 'child') {
    return <ChildHome {...props} />;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4F46E5" />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});