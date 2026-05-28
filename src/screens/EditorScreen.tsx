import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Dimensions, Alert, TextInput } from 'react-native';
import Video from 'react-native-video';
import { VideoClip, TextBlock } from '../types/editor';

const { width } = Dimensions.get('window');
const PIXELS_PER_SECOND = 20;

interface EditorScreenProps {
  importedVideoName: string;
  initialClips: VideoClip[];
  initialTextBlocks: TextBlock[];
  onBackToImport: () => void;
  onTimelineChange: (clips: VideoClip[], texts: TextBlock[]) => void;
}

export default function EditorScreen({ importedVideoName, initialClips, initialTextBlocks, onBackToImport, onTimelineChange }: EditorScreenProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isAddingText, setIsAddingText] = useState(false);
  const [customText, setCustomText] = useState('');

  const [clips, setClips] = useState<VideoClip[]>(initialClips);
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>(initialTextBlocks);

  const scrollViewRef = useRef<ScrollView>(null);
  const videoPlayerRef = useRef<any>(null);
  const isAutomaticScrolling = useRef(false);

  // Trouver le clip vidéo qui correspond au flux actuel pour l'affichage initial
  const mainVideoClip = clips.find(clip => clip.uri);

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const tenths = Math.floor((timeInSeconds % 1) * 10);
    return `${minutes < 10 ? `0${minutes}` : minutes}:${seconds < 10 ? `0${seconds}` : seconds}.${tenths}`;
  };

  // Déterminer quel morceau de clip est actif à la seconde "time" de la timeline globale
  const getActiveClipAndOffset = (time: number) => {
    let accumulatedTime = 0;
    for (const clip of clips) {
      const clipDuration = clip.width / PIXELS_PER_SECOND;
      if (time >= accumulatedTime && time <= accumulatedTime + clipDuration) {
        const timeInsideThisClip = time - accumulatedTime;
        // Calcule la seconde exacte du fichier vidéo d'origine à lire
        return { clip, realVideoTime: (clip.startAt || 0) + timeInsideThisClip };
      }
      accumulatedTime += clipDuration;
    }
    return null;
  };

  // Synchroniser le lecteur vidéo natif lors des déplacements manuels (Pause + Scroll)
  useEffect(() => {
    const activeData = getActiveClipAndOffset(currentTime);
    if (activeData && videoPlayerRef.current && !isPlaying) {
      videoPlayerRef.current.seek(activeData.realVideoTime);
    }
  }, [currentTime]);

  // Gestion du défilement automatique et calage de la vidéo pendant la lecture
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      const startTime = Date.now() - currentTime * 1000;
      interval = setInterval(() => {
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        setCurrentTime(elapsedSeconds);
        
        // Forcer la vidéo à suivre la découpe logique active
        const activeData = getActiveClipAndOffset(elapsedSeconds);
        if (activeData && videoPlayerRef.current) {
          videoPlayerRef.current.seek(activeData.realVideoTime);
        }

        const targetScrollX = elapsedSeconds * PIXELS_PER_SECOND;
        isAutomaticScrolling.current = true;
        scrollViewRef.current?.scrollTo({ x: targetScrollX, animated: false });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleScroll = (event: any) => {
    if (isAutomaticScrolling.current) {
      isAutomaticScrolling.current = false;
      return;
    }
    const offsetX = event.nativeEvent.contentOffset.x;
    const newTime = Math.max(0, offsetX / PIXELS_PER_SECOND);
    setCurrentTime(newTime);
  };

  const submitCustomText = () => {
    if (!customText.trim()) {
      Alert.alert("Texte vide", "Écris d'abord un sous-titre !");
      return;
    }
    const newText: TextBlock = {
      id: `text_${Date.now()}`,
      text: customText,
      startTime: currentTime,
      duration: 3.5,
    };
    const updatedTexts = [...textBlocks, newText];
    setTextBlocks(updatedTexts);
    onTimelineChange(clips, updatedTexts); // Synchro Supabase
    setCustomText('');
    setIsAddingText(false);
  };

  const handleSplit = () => {
    const currentPixelPosition = currentTime * PIXELS_PER_SECOND;
    let accumulatedWidth = 0;
    let clipToSplitIndex = -1;

    for (let i = 0; i < clips.length; i++) {
      accumulatedWidth += clips[i].width;
      if (currentPixelPosition < accumulatedWidth) {
        clipToSplitIndex = i;
        break;
      }
    }

    if (clipToSplitIndex === -1) {
      Alert.alert("Découpe impossible", "Place le curseur jaune sur un clip.");
      return;
    }

    const targetClip = clips[clipToSplitIndex];
    const widthBeforeTarget = accumulatedWidth - targetClip.width;
    const splitPointInClipPixels = currentPixelPosition - widthBeforeTarget;

    // Durée en secondes du premier segment créé
    const timeCutInSeconds = splitPointInClipPixels / PIXELS_PER_SECOND;

    if (splitPointInClipPixels < 15 || (targetClip.width - splitPointInClipPixels) < 15) {
      Alert.alert("Découpe impossible", "Fragment trop court.");
      return;
    }

    const updatedClips = [...clips];
    
    // Segment A (conserve le même début dans la vraie vidéo mais réduit sa durée)
    const clipA = {
      ...targetClip,
      id: `${targetClip.id}_a_${Date.now()}`,
      name: `${targetClip.name} (P1)`,
      width: splitPointInClipPixels,
      duration: timeCutInSeconds,
    };

    // Segment B (décale son point de départ réel là où le premier s'arrête)
    const clipB = {
      ...targetClip,
      id: `${targetClip.id}_b_${Date.now()}`,
      name: `${targetClip.name} (P2)`,
      width: targetClip.width - splitPointInClipPixels,
      duration: (targetClip.duration || (targetClip.width / PIXELS_PER_SECOND)) - timeCutInSeconds,
      startAt: (targetClip.startAt || 0) + timeCutInSeconds, // Le secret de la découpe réelle
    };

    updatedClips.splice(clipToSplitIndex, 1, clipA, clipB);
    setClips(updatedClips);
    onTimelineChange(updatedClips, textBlocks); // Synchro Supabase
  };

  const handleDelete = () => {
    if (!selectedClipId) return;
    const updatedClips = clips.filter(clip => clip.id !== selectedClipId);
    setClips(updatedClips);
    onTimelineChange(updatedClips, textBlocks); // Synchro Supabase
    setSelectedClipId(null);
  };

  const activeTextBlock = textBlocks.find(
    block => currentTime >= block.startTime && currentTime <= (block.startTime + block.duration)
  );

  return (
    <View style={styles.container}>
      {/* ZONE DU PLAYER VIDÉO */}
      <View style={styles.playerContainer}>
        <Text style={styles.timeCounter}>{formatTime(currentTime)}</Text>
        
        <View style={styles.videoScreen}>
          {mainVideoClip?.uri ? (
            <Video
              ref={videoPlayerRef}
              source={{ uri: mainVideoClip.uri }} 
              style={styles.videoPlayer}
              paused={!isPlaying}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.videoPlaceholderText}>Aucun flux vidéo détecté</Text>
          )}

          {activeTextBlock && (
            <Text style={styles.overlayText}>{activeTextBlock.text}</Text>
          )}
        </View>

        <TouchableOpacity style={[styles.playButton, isPlaying && styles.pauseButtonActive]} onPress={() => setIsPlaying(!isPlaying)}>
          <Text style={styles.playButtonText}>{isPlaying ? '⏸️ PAUSE' : '▶ PLAY'}</Text>
        </TouchableOpacity>
      </View>

      {/* OVERLAY D'AJOUT DE TEXTE */}
      {isAddingText && (
        <View style={styles.textInputOverlay}>
          <TextInput
            style={styles.customTextInput}
            placeholder="Écris ton sous-titre ici..."
            placeholderTextColor="#999"
            value={customText}
            onChangeText={setCustomText}
            autoFocus
          />
          <View style={styles.textInputActions}>
            <TouchableOpacity style={styles.cancelTextBtn} onPress={() => setIsAddingText(false)}>
              <Text style={{ color: '#fff' }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmTextBtn} onPress={submitCustomText}>
              <Text style={{ color: '#000', fontWeight: 'bold' }}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* BARRE D'OUTILS */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolItem} onPress={handleSplit}>
          <Text style={styles.toolIcon}>✂️</Text>
          <Text style={styles.toolText}>Découper</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolItem} onPress={() => setIsAddingText(true)}>
          <Text style={styles.toolIcon}>🔤</Text>
          <Text style={[styles.toolText, { color: '#00fa9a', fontWeight: 'bold' }]}>Texte</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolItem, !selectedClipId && { opacity: 0.3 }]} onPress={handleDelete} disabled={!selectedClipId}>
          <Text style={styles.toolIcon}>🗑️</Text>
          <Text style={[styles.toolText, selectedClipId && { color: '#ff4444' }]}>Supprimer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolItem} onPress={onBackToImport}>
          <Text style={styles.toolIcon}>🔄</Text>
          <Text style={styles.toolText}>Changer</Text>
        </TouchableOpacity>
      </View>

      {/* ZONE TIMELINE */}
      <View style={styles.timelineContainer}>
        <View style={styles.timeRuler}>
          <Text style={styles.timeText}>00:00</Text>
          <Text style={styles.timeText}>00:05</Text>
          <Text style={styles.timeText}>00:10</Text>
          <Text style={styles.timeText}>00:15</Text>
          <Text style={styles.timeText}>00:20</Text>
        </View>
        <View style={styles.playhead} />
        <ScrollView 
          ref={scrollViewRef} horizontal showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16} onScroll={handleScroll} contentContainerStyle={styles.scrollTimeline}
        >
          <View style={styles.tracksWrapper}>
            <View style={styles.trackRow}>
              {clips.map((clip) => {
                const isSelected = selectedClipId === clip.id;
                return (
                  <TouchableOpacity 
                    key={clip.id} activeOpacity={0.8} onPress={() => setSelectedClipId(isSelected ? null : clip.id)}
                    style={[styles.videoClip, { width: clip.width, backgroundColor: clip.color }, isSelected && styles.selectedClipBorder]}
                  >
                    <Text style={styles.clipLabel} numberOfLines={1}>{clip.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={[styles.trackRow, { height: 35, marginTop: 8 }]}>
              {textBlocks.map((block) => (
                <View key={block.id} style={[styles.textBlock, { left: block.startTime * PIXELS_PER_SECOND, width: block.duration * PIXELS_PER_SECOND }]}>
                  <Text style={styles.textBlockLabel} numberOfLines={1}>🔤 {block.text}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={{ width: width / 2 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  playerContainer: { flex: 2.2, backgroundColor: '#090909', justifyContent: 'center', alignItems: 'center', position: 'relative', paddingHorizontal: 20, paddingTop: 40 },
  timeCounter: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', fontFamily: 'monospace', position: 'absolute', top: 10 },
  videoScreen: { width: '100%', height: 170, backgroundColor: '#1a1a1a', borderRadius: 8, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#262626' },
  videoPlayer: { ...StyleSheet.absoluteFill },
  videoPlaceholderText: { color: '#666666', fontSize: 13 },
  overlayText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, textAlign: 'center', position: 'absolute', bottom: 15 },
  playButton: { position: 'absolute', bottom: 10, backgroundColor: '#ffffff', paddingVertical: 8, paddingHorizontal: 22, borderRadius: 20 },
  pauseButtonActive: { backgroundColor: '#ffcc00' },
  playButtonText: { color: '#000000', fontWeight: 'bold', fontSize: 13 },
  textInputOverlay: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: '#1e1e1e', padding: 15, borderRadius: 10, zIndex: 100, borderWidth: 1, borderColor: '#333' },
  customTextInput: { backgroundColor: '#2a2a2a', color: '#fff', padding: 10, borderRadius: 6, marginBottom: 12 },
  textInputActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelTextBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  confirmTextBtn: { backgroundColor: '#00fa9a', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 4 },
  toolbar: { height: 75, backgroundColor: '#141414', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#222' },
  toolItem: { alignItems: 'center' },
  toolIcon: { fontSize: 20, marginBottom: 4 },
  toolText: { color: '#aaaaaa', fontSize: 11 },
  timelineContainer: { flex: 1.8, backgroundColor: '#0f0f0f', position: 'relative', paddingTop: 10 },
  timeRuler: { flexDirection: 'row', paddingHorizontal: width / 2, gap: 75, marginBottom: 10 },
  timeText: { color: '#555', fontSize: 10, width: 40, textAlign: 'center' },
  playhead: { position: 'absolute', top: 0, bottom: 0, left: width / 2, width: 2, backgroundColor: '#ffcc00', zIndex: 10 },
  scrollTimeline: { paddingHorizontal: width / 2 },
  tracksWrapper: { flexDirection: 'column', justifyContent: 'center', height: 120, position: 'relative' },
  trackRow: { flexDirection: 'row', alignItems: 'center', height: 50, position: 'relative' },
  videoClip: { height: 46, borderRadius: 6, justifyContent: 'center', paddingHorizontal: 8, marginRight: 4, borderWidth: 1, borderColor: '#333333' },
  selectedClipBorder: { borderColor: '#ffcc00', borderWidth: 2 },
  clipLabel: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
  textBlock: { position: 'absolute', height: 26, backgroundColor: 'rgba(0, 250, 154, 0.25)', borderColor: '#00fa9a', borderWidth: 1, borderRadius: 4, justifyContent: 'center', paddingHorizontal: 6 },
  textBlockLabel: { color: '#00fa9a', fontSize: 10, fontWeight: '700' },
});