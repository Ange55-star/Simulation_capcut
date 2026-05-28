import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ViewStyle 
} from 'react-native';
import { COLORS, FONTS, SPACING, SIZES } from '@styles/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  style?: ViewStyle;
}

const PrimaryButton: React.FC<Props> = ({ title, onPress, loading, style }) => {
  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={onPress} 
      activeOpacity={0.8}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.textPrimary} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    // Ombre pour Android (plus complexe sans librairie, on utilise l'élévation)
    elevation: 5,
    shadowColor: COLORS.primary,
  },
  text: {
    color: COLORS.background, // Texte noir sur fond bleu néon pour la lisibilité
    fontSize: FONTS.sizeMd,
    fontWeight: FONTS.weightBold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});

export default PrimaryButton;