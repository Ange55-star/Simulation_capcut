import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, StatusBar } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import EditorScreen from './src/screens/EditorScreen';
import { VideoClip, TextBlock } from './src/types/editor';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'import' | 'editor'>('import');
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [videoName, setVideoName] = useState('');

  const handlePickInitialVideo = () => {
    launchImageLibrary({
      mediaType: 'mixed',
      quality: 1,
    }, (response) => {
      if (response.didCancel || !response.assets || response.assets.length === 0) return;

      const asset = response.assets[0];
      const isPhoto = asset.type?.startsWith('image/');
      const duration = isPhoto ? 4 : (asset.duration || 10);
      const PIXELS_PER_SECOND = 20;

      const initialClip: VideoClip = {
        id: `clip_${Date.now()}`,
        name: asset.fileName || (isPhoto ? 'Photo Initiale' : 'Vidéo Initiale'),
        width: duration * PIXELS_PER_SECOND,
        color: isPhoto ? '#2e86de' : '#7ED321',
        uri: asset.uri || '',
        duration: duration,
        startAt: 0,
        type: isPhoto ? 'photo' : 'video',
      };

      setVideoName(asset.fileName || (isPhoto ? 'Photo' : 'Vidéo'));
      setClips([initialClip]);
      setTextBlocks([]);
      setCurrentScreen('editor');
    });
  };

  const handleTimelineChange = (updatedClips: VideoClip[], updatedTexts: TextBlock[]) => {
    setClips(updatedClips);
    setTextBlocks(updatedTexts);
  };

  if (currentScreen === 'editor' && clips.length > 0) {
    return (
      <EditorScreen
        importedVideoName={videoName}
        initialClips={clips}
        initialTextBlocks={textBlocks}
        onBackToImport={() => setCurrentScreen('import')}
        onTimelineChange={handleTimelineChange}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.header}>
        <Text style={styles.title}>Simulation CapCut</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.subtitle}>Sélectionne un premier média pour commencer</Text>
        <TouchableOpacity style={styles.button} onPress={handlePickInitialVideo}>
          <Text style={styles.buttonText}>🎬 IMPORTER UN MÉDIA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderColor: '#222', paddingTop: 50 },
  title: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  subtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 25 },
  button: { backgroundColor: '#00fa9a', paddingHorizontal: 32, paddingVertical: 15, borderRadius: 30, elevation: 3 },
  buttonText: { color: '#000000', fontWeight: 'bold', fontSize: 16 },
});