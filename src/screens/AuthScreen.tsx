import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabaseClient';

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false); // Permet d'alterner Inscription / Connexion

  // Logique de Connexion
  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Champs incomplets", "Remplis ton email et ton mot de passe.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    setLoading(false);

    if (error) {
      Alert.alert("Erreur de connexion", error.message);
    } else {
      onLoginSuccess();
    }
  };

  // Logique d'Inscription
  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Champs incomplets", "Remplis tous les champs pour t'inscrire.");
      return;
    }

    setLoading(true);
    const { error, data } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
    });

    setLoading(false);

    if (error) {
      Alert.alert("Erreur d'inscription", error.message);
    } else {
      // Si la confirmation par email est activée sur Supabase, l'utilisateur doit valider
      if (data.session) {
        Alert.alert("Succès", "Compte créé et connecté !");
        onLoginSuccess();
      } else {
        Alert.alert("Vérification requise", "Un e-mail de confirmation t'a été envoyé.");
        setIsSignUpMode(false);
      }
    }
  };

  return (
    <View style={styles.centerScreen}>
      <Text style={styles.mainTitle}>🎬 CapCut Simulation</Text>
      <Text style={styles.subtitle}>
        {isSignUpMode ? "Crée un compte pour sauvegarder tes projets" : "Connecte-toi pour commencer le montage"}
      </Text>

      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          placeholder="Adresse Email" 
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput 
          style={styles.input} 
          placeholder="Mot de passe" 
          placeholderTextColor="#666"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        
        {loading ? (
          <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 10 }} />
        ) : (
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={isSignUpMode ? handleSignUp : handleSignIn}
          >
            <Text style={styles.buttonText}>
              {isSignUpMode ? "S'INSCRIRE" : "SE CONNECTER"}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.switchModeButton} 
          onPress={() => setIsSignUpMode(!isSignUpMode)}
        >
          <Text style={styles.switchModeText}>
            {isSignUpMode ? "Déjà un compte ? Connecte-toi" : "Nouveau ? Crée un compte ici"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerScreen: { flex: 1, backgroundColor: '#0b0b0b', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  mainTitle: { color: '#ffffff', fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { color: '#777777', fontSize: 13, marginBottom: 30, textAlign: 'center', paddingHorizontal: 10 },
  inputContainer: { width: '100%', gap: 15 },
  input: { backgroundColor: '#181818', color: '#fff', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#262626', fontSize: 15 },
  primaryButton: { backgroundColor: '#ffffff', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#000000', fontWeight: 'bold', fontSize: 15 },
  switchModeButton: { marginTop: 15, alignItems: 'center' },
  switchModeText: { color: '#aaaaaa', fontSize: 13, textDecorationLine: 'underline' }
});