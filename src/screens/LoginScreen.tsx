import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '@styles/theme';
import PrimaryButton from '@components/PrimaryButton';
import { supabase } from '@services/supabaseClient';

const LoginScreen = () => {
  const handleFakeLogin = async () => {
    // Connexion temporaire ou déclencheur pour tester l'interface
    console.log("Bouton cliqué sur l'écran de Login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CAPCUT SIMULATION</Text>
      <Text style={styles.subtitle}>Écran d'authentification</Text>
      <PrimaryButton title="Se Connecter" onPress={handleFakeLogin} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONTS.sizeXl,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FONTS.sizeMd,
    color: COLORS.textSecondary,
    marginBottom: 40,
  },
});

export default LoginScreen;