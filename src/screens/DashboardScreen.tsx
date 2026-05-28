import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '@styles/theme';
import PrimaryButton from '@components/PrimaryButton';
import { useAuth } from '@context/AuthContext';

const DashboardScreen = () => {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vos Projets</Text>
      <PrimaryButton title="Déconnexion" onPress={signOut} style={{ backgroundColor: COLORS.secondary }} />
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
    color: COLORS.textPrimary,
    marginBottom: 40,
  },
});

export default DashboardScreen;