import type { AudioPlaybackState } from '../audio/audioPlayer'
import { SpeakerIcon } from './icons'

interface EchoPortalProps {
  state: AudioPlaybackState
  onPlay: () => void
}

export function EchoPortal({ state, onPlay }: EchoPortalProps) {
  const isPlaying = state === 'playing' || state === 'loading'

  return (
    <section className={`echo-portal${isPlaying ? ' is-playing' : ''}`} aria-label="سؤال صوتي">
      <span className="echo-mark echo-mark-fatha" aria-hidden="true">َ</span>
      <span className="echo-mark echo-mark-damma" aria-hidden="true">ُ</span>
      <span className="echo-mark echo-mark-kasra" aria-hidden="true">ِ</span>
      <div className="echo-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <button
        className="sound-button"
        type="button"
        onClick={onPlay}
        aria-label="اسمعي الصوت مرة أخرى"
        data-testid="audio-status"
        data-state={state}
      >
        <SpeakerIcon width="34" height="34" />
        <span>{isPlaying ? 'استمعي…' : 'اسمعي الصوت'}</span>
      </button>
      {state === 'error' && (
        <p className="audio-error" role="status">لم يعمل الصوت. اضغطي مرة أخرى.</p>
      )}
    </section>
  )
}
