import type { ChallengeState } from '../hub/contracts'
import { SparkleIcon } from './icons'

interface ChallengeStatusScreenProps {
  state: ChallengeState | null
  reason?: 'waiting' | 'finished' | 'unknown-question'
  onBack: () => void
}
function winnerName(state: ChallengeState | null): string | null {
  if (!state?.winner_id) return null
  return state.players.find((player) => player.user_id === state.winner_id)?.display_name ?? null
}

export function ChallengeStatusScreen({
  state,
  reason = 'waiting',
  onBack,
}: ChallengeStatusScreenProps) {
  const winner = winnerName(state)
  const content = reason === 'finished'
    ? {
        eyebrow: 'انتهى التحدّي',
        title: winner ? `فازت ${winner}!` : 'جولة جميلة!',
        copy: 'شاهدي النتيجة الكاملة وابدئي تحدّيًا جديدًا من مركز الاختبارات.',
      }
    : reason === 'unknown-question'
      ? {
          eyebrow: 'تعذّر فتح السؤال',
          title: 'هذا الحرف غير متاح',
          copy: 'ارجعي إلى مركز الاختبارات ثم افتحي التحدّي مرة أخرى.',
        }
      : {
          eyebrow: 'تحدّي الأصدقاء',
          title: 'ننتظر بدء الجولة',
          copy: 'ستظهر لكِ الحروف هنا فور أن يصبح التحدّي جاهزًا.',
        }

  return (
    <main className="screen challenge-status-screen">
      <section className="challenge-status-card" aria-live="polite">
        <span className="trophy-seal" aria-hidden="true">
          <SparkleIcon width="32" height="32" />
        </span>
        <p className="eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p>{content.copy}</p>
        <button className="primary-button" type="button" onClick={onBack}>
          العودة إلى الاختبارات
        </button>
      </section>
    </main>
  )
}
