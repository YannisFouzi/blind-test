/**
 * Audio Player Feature
 *
 * Lecteur audio réutilisable (solo + multi)
 *
 * @example
 * ```tsx
 * import { useAudioPlayer, AudioControls } from '@/features/audio-player';
 *
 * const MyGame = () => {
 *   const audio = useAudioPlayer({
 *     initialAudioUrl: "/song.mp3",
 *     autoPlay: true,
 *   });
 *
 *   return <AudioControls {...audio} />;
 * };
 * ```
 */

// Types
export * from "./types";

// Components
export { AudioControls, type AudioControlsProps } from "./components/AudioControls";
export { ProgressBar, type ProgressBarProps } from "./components/ProgressBar";
export { VolumeControl, type VolumeControlProps } from "./components/VolumeControl";

// Hooks
export { useAudioPlayer } from "./hooks/useAudioPlayer";
export { useDoubleAudioPlayer } from "./hooks/useDoubleAudioPlayer";