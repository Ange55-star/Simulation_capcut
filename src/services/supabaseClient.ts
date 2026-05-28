import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// 1. Définition des identifiants de ton projet Supabase
// REMPLACE ces valeurs par celles de ton projet Supabase (Settings > API)
const SUPABASE_URL = 'https://bhnmyzzodrpovjfckvgs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJobm15enpvZHJwb3ZqZmNrdmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NDQzNjcsImV4cCI6MjA5NTAyMDM2N30.jZrFRHT4EcU-4gYW6vfEq4bnqYgyt56McIaW6RgqMuk';

// 2. Initialisation et configuration du client Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // On indique à Supabase d'utiliser le stockage local Android pour la session
    storage: AsyncStorage,
    
    // Active la sauvegarde automatique du token de session
    autoRefreshToken: true,
    
    // Empêche les conflits d'états lors de l'ouverture de l'application
    persistSession: true,
    
    // Désactive la détection automatique du navigateur qui échouerait sur mobile
    detectSessionInUrl: false,
  },
});