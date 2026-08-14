export type AudioPlaybackState = 'idle' | 'loading' | 'playing' | 'error'

type AudioStateListener = (state: AudioPlaybackState) => void
const AUDIO_REVISION = 'layla-hq-2026-08-14'

export class AudioPlayer {
  private readonly cache = new Map<string, HTMLAudioElement>()
  private readonly listeners = new Set<AudioStateListener>()
  private current: HTMLAudioElement | null = null
  private state: AudioPlaybackState = 'idle'

  constructor(private readonly baseUrl: string) {}

  subscribe(listener: AudioStateListener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  preload(file: string): void {
    this.getAudio(file).load()
  }

  async play(file: string): Promise<void> {
    const audio = this.getAudio(file)

    if (this.current && this.current !== audio) {
      this.current.pause()
      this.current.currentTime = 0
    }

    this.current = audio
    audio.currentTime = 0
    this.setState('loading')

    try {
      await audio.play()
    } catch {
      this.setState('error')
      throw new Error('Audio playback failed.')
    }
  }

  stop(): void {
    if (this.current) {
      this.current.pause()
      this.current.currentTime = 0
    }
    this.setState('idle')
  }

  dispose(): void {
    this.stop()
    this.cache.clear()
    this.listeners.clear()
  }

  private getAudio(file: string): HTMLAudioElement {
    const cached = this.cache.get(file)
    if (cached) return cached

    const base = new URL(this.baseUrl, window.location.origin)
    const source = new URL(file, base)
    source.searchParams.set('v', AUDIO_REVISION)
    const audio = new Audio(source.href)
    audio.preload = 'auto'
    audio.addEventListener('playing', () => {
      if (this.current === audio) this.setState('playing')
    })
    audio.addEventListener('ended', () => {
      if (this.current === audio) this.setState('idle')
    })
    audio.addEventListener('error', () => {
      if (this.current === audio) this.setState('error')
    })
    this.cache.set(file, audio)
    return audio
  }

  private setState(state: AudioPlaybackState): void {
    this.state = state
    this.listeners.forEach((listener) => listener(state))
  }
}
