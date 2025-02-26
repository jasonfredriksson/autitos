export enum EngineState {
  IDLE = 'idle',
  ACCELERATION = 'acceleration',
  DECELERATION = 'deceleration',
  REVERSE = 'reverse'
}

export class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private currentEngineState: EngineState = EngineState.IDLE;
  private engineSounds: Map<EngineState, HTMLAudioElement> = new Map();
  private backgroundMusic: HTMLAudioElement | null = null;
  private backgroundMusicLoaded: boolean = false;

  constructor() {
    Object.values(EngineState).forEach(state => {
      const audio = new Audio();
      audio.loop = state === EngineState.ACCELERATION;
      audio.preload = 'auto';
      this.engineSounds.set(state, audio);
    });
  }

  setEngineSounds(paths: { [key in EngineState]?: string }) {
    Object.entries(paths).forEach(([state, path]) => {
      const audio = this.engineSounds.get(state as EngineState);
      if (audio) {
        audio.src = path;
        audio.volume = 0.25;
        audio.load();
      }
    });
  }

  private async playEngineStateSound(state: EngineState) {
    if (this.currentEngineState === state) return;

    // Stop all current sounds
    this.engineSounds.forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });

    // Play new sound
    const newSound = this.engineSounds.get(state);
    if (newSound) {
      try {
        newSound.currentTime = 0;
        newSound.volume = 0.25;
        await newSound.play();
        this.currentEngineState = state;
      } catch (error) {
        console.log("Couldn't play engine sound:", error);
      }
    }
  }

  updateEngineSound(isAccelerating: boolean, isReversing: boolean, velocity: number) {
    // Handle deceleration when buttons are released
    if (!isAccelerating && !isReversing) {
      if (this.currentEngineState === EngineState.ACCELERATION) {
        this.playEngineStateSound(EngineState.DECELERATION);
      }
      else if (this.currentEngineState === EngineState.DECELERATION && Math.abs(velocity) <= 1) {
        this.playEngineStateSound(EngineState.IDLE);
      }
      return;
    }

    // Handle reverse
    if (isReversing) {
      this.playEngineStateSound(EngineState.REVERSE);
      return;
    }

    // Handle acceleration - simply play the acceleration sound
    if (isAccelerating) {
      this.playEngineStateSound(EngineState.ACCELERATION);
    }
  }

  setBackgroundMusic(path: string) {
    try {
      this.backgroundMusic = new Audio();
      this.backgroundMusic.preload = 'auto';
      
      this.backgroundMusic.addEventListener('canplaythrough', () => {
        console.log('Background music loaded successfully');
        this.backgroundMusicLoaded = true;
        this.tryPlayBackgroundMusic();
      });

      this.backgroundMusic.addEventListener('error', (e) => {
        console.error('Error loading background music:', e);
      });

      this.backgroundMusic.src = path;
      this.backgroundMusic.load();
    } catch (error) {
      console.error('Error setting up background music:', error);
    }
  }

  private tryPlayBackgroundMusic() {
    if (!this.backgroundMusic || !this.backgroundMusicLoaded) {
      console.log('Background music not ready yet');
      return;
    }

    try {
      this.backgroundMusic.volume = 0.3;
      this.backgroundMusic.loop = true;
      const playPromise = this.backgroundMusic.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Background music started playing');
        }).catch(error => {
          console.error('Error playing background music:', error);
          const handleUserInteraction = () => {
            this.backgroundMusic?.play().catch(e => 
              console.error('Error playing on user interaction:', e)
            );
            ['click', 'keydown', 'touchstart'].forEach(event => {
              document.removeEventListener(event, handleUserInteraction);
            });
          };
          
          ['click', 'keydown', 'touchstart'].forEach(event => {
            document.addEventListener(event, handleUserInteraction, { once: true });
          });
        });
      }
    } catch (error) {
      console.error('Error in tryPlayBackgroundMusic:', error);
    }
  }

  playBackgroundMusic(volume: number = 0.3) {
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = volume;
      this.tryPlayBackgroundMusic();
    }
  }

  stopAll() {
    this.engineSounds.forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
    
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
  }
}
