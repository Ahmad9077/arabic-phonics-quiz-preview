import type { AudioPlaybackState } from '../audio/audioPlayer'
import { toArabicNumerals } from '../domain/format'
import type { Attempt, DisplayMode, QuestionChoice, QuizQuestion } from '../domain/types'
import { AnswerGrid } from './AnswerGrid'
import { EchoPortal } from './EchoPortal'
import { ArrowIcon, CheckIcon, CloseIcon } from './icons'

interface QuizScreenProps {
  question: QuizQuestion
  questionIndex: number
  total: number
  attempt: Attempt | null
  audioState: AudioPlaybackState
  isPreview: boolean
  answersDisabled?: boolean
  hideNextAction?: boolean
  counterText?: string
  statusText?: string
  onPlay: () => void
  onSelect: (choice: QuestionChoice) => void
  onNext: () => void
}

const modeLabels: Record<DisplayMode, string> = {
  isolated: 'الحرف منفصل',
  initial: 'الحرف في أول الكلمة',
  final: 'الحرف في آخر الكلمة',
}

export function QuizScreen({
  question,
  questionIndex,
  total,
  attempt,
  audioState,
  isPreview,
  answersDisabled = false,
  hideNextAction = false,
  counterText,
  statusText,
  onPlay,
  onSelect,
  onNext,
}: QuizScreenProps) {
  const locked = attempt !== null
  const progress = ((questionIndex + (locked ? 1 : 0)) / total) * 100

  return (
    <main className="screen quiz-screen">
      <header className="quiz-topbar">
        <div>
          <p className="wordmark">صدى الحروف</p>
          {isPreview && <span className="preview-mini">نسخة للمعاينة</span>}
        </div>
        <p className="question-counter" data-testid="question-counter" aria-label={counterText ?? `السؤال ${questionIndex + 1} من ${total}`}>
          {counterText ? (
            <strong className="challenge-counter-text">{counterText}</strong>
          ) : (
            <>
              <strong>{toArabicNumerals(questionIndex + 1)}</strong>
              <span> / {toArabicNumerals(total)}</span>
            </>
          )}
        </p>
      </header>

      <div
        className="progress-track"
        role="progressbar"
        aria-label="تقدّم الجولة"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      <section className="question-stage">
        <div className="question-heading">
          <div>
            <span className="mode-chip">{modeLabels[question.variant.mode]}</span>
            {statusText && <p className="challenge-turn-status" aria-live="polite">{statusText}</p>}
          </div>
          <h1>أيّ حرف سمعتِ؟</h1>
        </div>

        <EchoPortal state={audioState} onPlay={onPlay} />

        <AnswerGrid
          choices={question.choices}
          correctLetterId={question.variant.letterId}
          selectedLetterId={attempt?.selectedLetterId ?? null}
          locked={locked}
          disabled={answersDisabled}
          onSelect={onSelect}
        />

        <div className="feedback-zone" aria-live="polite">
          {attempt && (
            <p
              className={`answer-feedback ${attempt.correct ? 'is-correct' : 'is-wrong'}`}
              data-testid="answer-feedback"
            >
              {attempt.correct ? (
                <><CheckIcon width="22" height="22" /> أحسنتِ! هذا هو الحرف.</>
              ) : (
                <>
                  <CloseIcon width="22" height="22" />
                  قريبة! الصحيح هو <bdi dir="rtl">{attempt.expectedGlyph}</bdi>
                </>
              )}
            </p>
          )}

          {attempt && !hideNextAction && (
            <button className="next-button" type="button" onClick={onNext}>
              {questionIndex + 1 === total ? 'شاهدي النتيجة' : 'السؤال التالي'}
              <ArrowIcon width="19" height="19" />
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
