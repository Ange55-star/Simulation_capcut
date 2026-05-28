
export interface VideoClip {
  id: string;
  name: string;
  width: number; 
  color: string;
  uri?: string; // Optionnel pour le moment, servira pour les vraies vidéos
  duration?: number; // Durée en secondes, à définir lors de l'import réel
  startAt: number;
}

export interface TextBlock {
  id: string;
  text: string;
  startTime: number; 
  duration: number;  
}

export type ApplicationScreen = 'auth' | 'import' | 'editor';