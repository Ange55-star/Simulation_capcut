import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '@context/AuthContext';
import { COLORS } from '@styles/theme';

// Importation de nos futurs écrans (nous allons créer des versions temporaires juste après)
import LoginScreen from '@screens/LoginScreen';
import DashboardScreen from '@screens/DashboardScreen';

// Définition des types pour nos routes
export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { user, loading } = useAuth();

  // Écran de chargement pendant que Supabase vérifie la session locale
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user === null ? (
          // Flux d'Authentification (Public)
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          // Flux Application (Privé/Protégé)
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator;