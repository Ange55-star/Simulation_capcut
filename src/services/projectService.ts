import { supabase } from './supabaseClient';
import { VideoClip, TextBlock } from '../types/editor';

export const projectService = {
  // Sauvegarder ou mettre à jour le projet en cours
  async saveProject(videoName: string, clips: VideoClip[], textBlocks: TextBlock[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Utilisateur non connecté" };

    // On cherche d'abord s'il y a déjà un projet existant pour cette vidéo
    const { data: existingProject } = await supabase
      .from('user_projects')
      .select('id')
      .eq('video_name', videoName)
      .maybeSingle();

    if (existingProject) {
      // Mise à jour
      return await supabase
        .from('user_projects')
        .update({
          clips: clips,
          text_blocks: textBlocks,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProject.id);
    } else {
      // Création d'un nouveau projet
      return await supabase
        .from('user_projects')
        .insert({
          user_id: user.id,
          video_name: videoName,
          clips: clips,
          text_blocks: textBlocks
        });
    }
  },

  // Récupérer le dernier projet sauvegardé d'un utilisateur (s'il existe)
  async loadLatestProject() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_projects')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  }
};