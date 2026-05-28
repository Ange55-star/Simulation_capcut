import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Dimensions, Alert, TextInput, Image } from 'react-native';
import Video from 'react-native-video';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
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

  const [clips, setClips] = useState<VideoClip[]>(initialClips.length > 0 ? initialClips : []);
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>(initialTextBlocks || []);

  const scrollViewRef = useRef<ScrollView>(null);
  const videoPlayerRef = useRef<any>(null);
  const isAutomaticScrolling = useRef(false);
  const isSeeking = useRef(false);

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const tenths = Math.floor((timeInSeconds % 1) * 10);
    return `${minutes < 10 ? `0${minutes}` : minutes}:${seconds < 10 ? `0${seconds}` : seconds}.${tenths}`;
  };

  // Récupère le clip actif à un instant T de la timeline globale
  const getActiveClipAndOffset = (time: number) => {
    if (!clips || clips.length === 0) return null;
    let accumulatedTime = 0;
    for (const clip of clips) {
      const clipDuration = clip.width / PIXELS_PER_SECOND;
      if (time >= accumulatedTime && time < accumulatedTime + clipDuration) {
        const timeInsideThisClip = time - accumulatedTime;
        return { clip, realVideoTime: (clip.startAt || 0) + timeInsideThisClip, accumulatedTime };
      }
      accumulatedTime += clipDuration;
    }
    // Sécurité pour la toute fin de la timeline
    const lastClip = clips[clips.length - 1];
    return { clip: lastClip, realVideoTime: (lastClip.startAt || 0) + (lastClip.width / PIXELS_PER_SECOND), accumulatedTime: accumulatedTime - (lastClip.width / PIXELS_PER_SECOND) };
  };

  const getTimelineTimeFromRealTime = (realTime: number) => {
    if (!clips || clips.length === 0) return null;
    let accumulatedTime = 0;
    const activeData = getActiveClipAndOffset(currentTime);
    
    if (activeData && activeData.clip.type === 'video') {
      const clipStart = activeData.clip.startAt || 0;
      return activeData.accumulatedTime + (realTime - clipStart);
    }
    return null;
  };

  const getTotalDuration = () => {
    let total = 0;
    clips.forEach(clip => {
      total += clip.width / PIXELS_PER_SECOND;
    });
    return total;
  };

  // Synchronisation du lecteur vidéo lors du scroll manuel
  useEffect(() => {
    if (!isPlaying && !isSeeking.current && clips.length > 0) {
      const activeData = getActiveClipAndOffset(currentTime);
      if (activeData && activeData.clip.type === 'video' && videoPlayerRef.current) {
        videoPlayerRef.current.seek(activeData.realVideoTime);
      }
    }
  }, [currentTime]);

  // Gestion de la progression pour les VIDÉOS
  const handleVideoProgress = (data: { currentTime: number }) => {
    if (!isPlaying || isSeeking.current) return;

    const maxDuration = getTotalDuration();
    const computedTimelineTime = getTimelineTimeFromRealTime(data.currentTime);

    if (computedTimelineTime !== null) {
      if (computedTimelineTime >= maxDuration - 0.05) {
        setIsPlaying(false);
        setCurrentTime(maxDuration);
        return;
      }
      setCurrentTime(computedTimelineTime);
      const targetScrollX = computedTimelineTime * PIXELS_PER_SECOND;
      isAutomaticScrolling.current = true;
      scrollViewRef.current?.scrollTo({ x: targetScrollX, animated: false });
    }
  };

  // Horloge unique pour faire avancer la timeline (essentiel pour les PHOTOS et transitions)
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && clips.length > 0) {
      const frameRate = 100; // Mise à jour toutes les 100ms
      const timeStep = frameRate / 1000;

      interval = setInterval(() => {
        const maxDuration = getTotalDuration();
        const nextTime = currentTime + timeStep;

        if (nextTime >= maxDuration - 0.05) {
          setIsPlaying(false);
          setCurrentTime(maxDuration);
          clearInterval(interval);
          return;
        }

        const activeData = getActiveClipAndOffset(currentTime);
        
        // Si c'est une photo, c'est l'intervalle qui fait avancer le temps et le scroll
        if (activeData && activeData.clip.type === 'photo') {
          setCurrentTime(nextTime);
          const targetScrollX = nextTime * PIXELS_PER_SECOND;
          isAutomaticScrolling.current = true;
          scrollViewRef.current?.scrollTo({ x: targetScrollX, animated: false });
        } 
        // Si on passe d'une photo à une vidéo, on force le lecteur vidéo à se caler au bon endroit
        else if (activeData && activeData.clip.type === 'video') {
          const nextActiveData = getActiveClipAndOffset(nextTime);
          if (nextActiveData && videoPlayerRef.current) {
            // Si le rendu vidéo prend du retard sur le timer, on l'aide à avancer
            setCurrentTime(nextTime);
            const targetScrollX = nextTime * PIXELS_PER_SECOND;
            isAutomaticScrolling.current = true;
            scrollViewRef.current?.scrollTo({ x: targetScrollX, animated: false });
          }
        }
      }, frameRate);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isPlaying, currentTime, clips]);

  const handleScroll = (event: any) => {
    if (isAutomaticScrolling.current) {
      isAutomaticScrolling.current = false;
      return;
    }
    const offsetX = event.nativeEvent.contentOffset.x;
    const newTime = Math.max(0, offsetX / PIXELS_PER_SECOND);
    const maxDuration = getTotalDuration();
    setCurrentTime(Math.min(newTime, maxDuration));
  };

  const safeSyncData = async (updatedClips: VideoClip[], updatedTexts: TextBlock[]) => {
    try {
      await onTimelineChange(updatedClips, updatedTexts);
    } catch (error) {
      console.warn("Erreur de synchronisation :", error);
    }
  };

  const handleAddMedia = () => {
    launchImageLibrary({
      mediaType: 'mixed',
      quality: 1,
    }, (response: ImagePickerResponse) => {
      if (response.didCancel || !response.assets || response.assets.length === 0) return;

      const asset = response.assets[0];
      const isPhoto = asset.type?.startsWith('image/');
      const duration = isPhoto ? 4 : (asset.duration || 10);
      
      const colors = ['#4A90E2', '#7ED321', '#F5A623', '#9013FE', '#E67E22'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newClip: VideoClip = {
        id: `clip_${Date.now()}`,
        name: asset.fileName || (isPhoto ? `Photo ${clips.length + 1}` : `Vidéo ${clips.length + 1}`),
        uri: asset.uri || '',
        width: duration * PIXELS_PER_SECOND,
        duration: duration,
        color: isPhoto ? '#2e86de' : randomColor,
        type: isPhoto ? 'photo' : 'video',
        startAt: 0,
      };

      const updatedClips = [...clips, newClip];
      setClips(updatedClips);
      safeSyncData(updatedClips, textBlocks);
    });
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
    safeSyncData(clips, updatedTexts); 
    setCustomText('');
    setIsAddingText(false);
  };

  const handleSplit = () => {
    if (clips.length === 0) return;
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
    const timeCutInSeconds = splitPointInClipPixels / PIXELS_PER_SECOND;

    if (splitPointInClipPixels < 15 || (targetClip.width - splitPointInClipPixels) < 15) {
      Alert.alert("Découpe impossible", "Fragment trop court.");
      return;
    }

    const updatedClips = [...clips];
    
    const clipA: VideoClip = {
      ...targetClip,
      id: `${targetClip.id}_a_${Date.now()}`,
      name: `${targetClip.name} (P1)`,
      width: splitPointInClipPixels,
      duration: timeCutInSeconds,
    };

    const clipB: VideoClip = {
      ...targetClip,
      id: `${targetClip.id}_b_${Date.now()}`,
      name: `${targetClip.name} (P2)`,
      width: targetClip.width - splitPointInClipPixels,
      duration: (targetClip.duration || (targetClip.width / PIXELS_PER_SECOND)) - timeCutInSeconds,
      startAt: (targetClip.startAt || 0) + timeCutInSeconds,
    };

    updatedClips.splice(clipToSplitIndex, 1, clipA, clipB);
    setClips(updatedClips);
    safeSyncData(updatedClips, textBlocks);
  };

  const handleDelete = () => {
    if (!selectedClipId || clips.length === 0) return;

    const updatedClips = clips.filter(clip => clip.id !== selectedClipId);
    setClips(updatedClips);
    safeSyncData(updatedClips, textBlocks);
    setSelectedClipId(null);

    let totalDuration = 0;
    updatedClips.forEach(clip => {
      totalDuration += clip.width / PIXELS_PER_SECOND;
    });

    if (currentTime > totalDuration) {
      setCurrentTime(Math.max(0, totalDuration));
      const targetScrollX = Math.max(0, totalDuration) * PIXELS_PER_SECOND;
      isAutomaticScrolling.current = true;
      scrollViewRef.current?.scrollTo({ x: targetScrollX, animated: true });
    }
  };

  const activeTextBlock = textBlocks.find(
    block => currentTime >= block.startTime && currentTime <= (block.startTime + block.duration)
  );

  return (
    <View style={styles.container}>
      <View style={styles.playerContainer}>
        <Text style={styles.timeCounter}>{formatTime(currentTime)}</Text>
        
        <View style={styles.videoScreen}>
          {(() => {
            const activeData = getActiveClipAndOffset(currentTime);

            if (!activeData || !activeData.clip.uri) {
              return <Text style={styles.videoPlaceholderText}>Aucun média détecté</Text>;
            }

            if (activeData.clip.type === 'photo') {
              return (
                <Image 
                  source={{ uri: activeData.clip.uri }} 
                  style={styles.videoPlayer} 
                  resizeMode="contain"
                />
              );
            }

            return (
              <Video
                ref={videoPlayerRef}
                source={{ uri: activeData.clip.uri }} 
                style={styles.videoPlayer}
                paused={!isPlaying}
                resizeMode="contain"
                volume={1.0}
                muted={false}
                playInBackground={false}
                onProgress={handleVideoProgress}
                progressUpdateInterval={100}
                onEnd={() => {
                  // Si c'est le dernier clip vidéo, on arrête
                  if (currentTime >= getTotalDuration() - 0.2) {
                    setIsPlaying(false);
                  }
                }}
              />
            );
          })()}

          {activeTextBlock && (
            <Text style={styles.overlayText}>{activeTextBlock.text}</Text>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.playButton, isPlaying && styles.pauseButtonActive]} 
          onPress={() => {
            const maxDuration = getTotalDuration();
            if (!isPlaying && currentTime >= maxDuration - 0.1) {
              setCurrentTime(0);
              scrollViewRef.current?.scrollTo({ x: 0, animated: true });
            }
            setIsPlaying(!isPlaying);
          }}
        >
          <Text style={styles.playButtonText}>{isPlaying ? '⏸️ PAUSE' : '▶ PLAY'}</Text>
        </TouchableOpacity>
      </View>

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
        <TouchableOpacity style={styles.toolItem} onPress={() => handleAddMedia()}>
          <Text style={styles.toolIcon}>➕</Text>
          <Text style={[styles.toolText, { color: '#00bfff', fontWeight: 'bold' }]}>Ajouter</Text>
        </TouchableOpacity>
      </View>

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