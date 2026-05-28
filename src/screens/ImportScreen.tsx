import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { supabase } from '../services/supabaseClient';

interface ImportScreenProps {
  onVideoSelected: (name: string, uri: string, duration: number) => void;
}

export default function ImportScreen({ onVideoSelected }: ImportScreenProps) {
  const [isPicking, setIsPicking] = useState(false);

  const handlePickVideo = async () => {
    setIsPicking(true);

    launchImageLibrary(
      {
        mediaType: 'video',
        assetRepresentationMode: 'current',
      },
      (response) => {
        setIsPicking(false);

        if (response.didCancel) return;

        if (response.errorMessage) {
          Alert.alert("Erreur Galerie", response.errorMessage);
          return;
        }

        if (response.assets && response.assets.length > 0) {
          const videoFile = response.assets[0];
          const fileName = videoFile.fileName || `Video_${Date.now()}.mp4`;
          const fileUri = videoFile.uri || '';
          const duration = videoFile.duration || 10;

          if (!fileUri) {
            Alert.alert("Erreur", "Impossible de récupérer le chemin de la vidéo.");
            return;
          }

          onVideoSelected(fileName, fileUri, duration);
        }
      }
    );
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Erreur", error.message);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Tableau de bord</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.centerScreen}>
        <Text style={styles.sectionTitle}>📥 Importer un fichier média</Text>
        <Text style={styles.subtitle}>Accède à la galerie de ton téléphone pour charger une vidéo dans la timeline :</Text>

        {isPicking ? (
          <ActivityIndicator size="large" color="#ffffff" />
        ) : (
          <TouchableOpacity style={styles.importButton} onPress={handlePickVideo}>
            <Text style={styles.buttonIcon}>📁</Text>
            <Text style={styles.buttonText}>OUVRIR LA GALERIE</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0b' },
  headerBar: { height: 50, backgroundColor: '#141414', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#252525' },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#3a3a3c', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  logoutText: { color: '#ff4444', fontSize: 12, fontWeight: 'bold' },
  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  sectionTitle: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#777777', fontSize: 14, marginBottom: 40, textAlign: 'center', lineHeight: 20 },
  importButton: { width: '100%', backgroundColor: '#1c1c1e', paddingVertical: 24, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3a3a3c', borderStyle: 'dashed' },
  buttonIcon: { fontSize: 40, marginBottom: 10 },
  buttonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
});