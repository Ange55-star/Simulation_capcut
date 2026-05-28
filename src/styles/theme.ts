/**
 * THEME SYSTEM - CapCut Clone
 * Ce fichier définit l'identité visuelle de l'application.
 */

export const COLORS = {
  // Fond sombre profond (Futuriste)
  background: '#0F0F0F',
  surface: '#1E1E1E', // Pour les cartes et panneaux
  surfaceLight: '#2A2A2A',

  // Couleurs d'accentuation
  primary: '#00F0FF', // Bleu néon électrique
  secondary: '#FF007A', // Rose néon pour les contrastes
  accent: '#7000FF', // Violet pour les effets

  // Texte
  textPrimary: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textMuted: '#666666',

  // États
  error: '#FF4D4D',
  success: '#00E676',
  warning: '#FFD600',
  
  // Spécifique Montage
  timelineTrack: '#121212',
  playhead: '#00F0FF',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const SIZES = {
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 20,
  iconSm: 20,
  iconMd: 24,
  iconLg: 32,
};

export const FONTS = {
  // On utilise les polices système par défaut pour l'instant
  sizeSm: 12,
  sizeMd: 16,
  sizeLg: 20,
  sizeXl: 24,
  weightBold: '700' as const,
  weightSemiBold: '600' as const,
  weightRegular: '400' as const,
};