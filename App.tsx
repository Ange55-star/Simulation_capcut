import React, { useState, useEffect } from 'react';
import { StatusBar, ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AuthScreen from './src/screens/AuthScreen';
import ImportScreen from './src/screens/ImportScreen';
import EditorScreen from './src/screens/EditorScreen';

import { supabase } from './src/services/supabaseClient';
import { projectService } from './src/services/projectService';
import { VideoClip, TextBlock } from './src/types/editor';

// Extension des types d'écrans pour inclure la sélection de projet
type ApplicationScreen = 'auth' | 'project_selection' | 'import' | 'editor';

const PIXELS_PER_SECOND = 20;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ApplicationScreen>('auth');
  const [appReady, setAppReady] = useState(false);
  const [importedVideoName, setImportedVideoName] = useState('');
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  
  // Stockage temporaire du projet trouvé dans Supabase
  const [savedProjectCache, setSavedProjectCache] = useState<any>(null);

  // Vérifier le projet au démarrage
  const checkSavedProject = async () => {
    try {
      const savedData = await projectService.loadLatestProject();
      if (savedData) {
        setSavedProjectCache(savedData);
        setCurrentScreen('project_selection'); // Écran de choix !
      } else {
        setCurrentScreen('import'); // Direct galerie si aucun projet
      }
    } catch (e) {
      setCurrentScreen('import');
    } finally {
      setAppReady(true);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkSavedProject();
      } else {
        setAppReady(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkSavedProject();
      } else {
        setImportedVideoName('');
        setClips([]);
        setTextBlocks([]);
        setSavedProjectCache(null);
        setCurrentScreen('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Action : L'utilisateur choisit de charger l'ancien projet
  const handleResumeProject = () => {
    if (savedProjectCache) {
      setImportedVideoName(savedProjectCache.video_name);
      setClips(savedProjectCache.clips);
      setTextBlocks(savedProjectCache.text_blocks);
      setCurrentScreen('editor');
    }
  };

  // Action : L'utilisateur décide de faire un nouveau projet
  const handleStartNewProject = () => {
    setCurrentScreen('import');
  };

  const handleVideoImported = (name: string, uri: string, duration: number) => {
    setImportedVideoName(name);
    const calculatedWidth = duration * PIXELS_PER_SECOND;

    const initialClips = [
      { 
        id: `video_${Date.now()}`, 
        name: name, 
        width: Math.max(100, calculatedWidth), 
        color: '#065f46',
        uri: uri,
        duration: duration
      }
    ];

    const initialTexts = [
      { id: 't_init', text: '🎬 Premier clip', startTime: 0.5, duration: Math.min(3, duration) }
    ];

    setClips(initialClips);
    setTextBlocks(initialTexts);

    // Sauvegarde immédiate dans Supabase (écrase l'ancien ou crée)
    projectService.saveProject(name, initialClips, initialTexts);
    setCurrentScreen('editor');
  };

  const handleSaveChanges = (updatedClips: VideoClip[], updatedTexts: TextBlock[]) => {
    setClips(updatedClips);
    setTextBlocks(updatedTexts);
    projectService.saveProject(importedVideoName, updatedClips, updatedTexts);
  };

  if (!appReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#141414" />
      
      {/* Barre supérieure globale visible dès qu'on est connecté */}
      {currentScreen !== 'auth' && (
        <View style={styles.globalHeaderBar}>
          <Text style={styles.globalHeaderTitle}>
            {currentScreen === 'editor' ? `🎬 ${importedVideoName}` : '🗂️ Studio Simulation'}
          </Text>
          <TouchableOpacity style={styles.globalLogoutButton} onPress={() => supabase.auth.signOut()}>
            <Text style={styles.globalLogoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Rendu conditionnel des écrans */}
      {currentScreen === 'auth' && (
        <AuthScreen onLoginSuccess={() => {}} />
      )}

      {currentScreen === 'project_selection' && (
        <View style={styles.selectionContainer}>
          <Text style={styles.selectionTitle}>Un projet en cours a été trouvé !</Text>
          <Text style={styles.selectionSubtitle}>
            Vidéo : "{savedProjectCache?.video_name}"
          </Text>

          <TouchableOpacity style={styles.resumeButton} onPress={handleResumeProject}>
            <Text style={styles.buttonTextBold}>🔄 CONTINUER LE MONTAGE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.newProjectButton} onPress={handleStartNewProject}>
            <Text style={styles.buttonTextNormal}>➕ CRÉER UN NOUVEAU PROJET</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {currentScreen === 'import' && (
        <ImportScreen onVideoSelected={handleVideoImported} />
      )}
      
      {currentScreen === 'editor' && (
        <EditorScreen 
          importedVideoName={importedVideoName}
          initialClips={clips}
          initialTextBlocks={textBlocks}
          onBackToImport={() => setCurrentScreen('import')}
          onTimelineChange={handleSaveChanges}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  globalHeaderBar: { height: 50, backgroundColor: '#141414', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#252525' },
  globalHeaderTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', maxWidth: '70%' },
  globalLogoutButton: { backgroundColor: '#262626', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#3a3a3c' },
  globalLogoutText: { color: '#ff4444', fontSize: 12, fontWeight: 'bold' },
  
  // Styles pour le nouvel écran de sélection
  selectionContainer: { flex: 1, backgroundColor: '#0b0b0b', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  selectionTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' },
  selectionSubtitle: { color: '#00fa9a', fontSize: 14, fontWeight: '600', marginBottom: 40, textAlign: 'center' },
  resumeButton: { width: '100%', backgroundColor: '#00fa9a', paddingVertical: 16, borderRadius: 10, alignItems: 'center', marginBottom: 16 },
  newProjectButton: { width: '100%', backgroundColor: '#1c1c1e', paddingVertical: 16, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#3a3a3c' },
  buttonTextBold: { color: '#000000', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 },
  buttonTextNormal: { color: '#ffffff', fontWeight: '600', fontSize: 14, letterSpacing: 0.5 }
});