import { letterById } from '../data/letters'
import { toArabicNumerals } from '../domain/format'
import type { Attempt } from '../domain/types'
import { CheckIcon, CloseIcon, ReplayIcon, SparkleIcon, TrophyIcon } from './icons'

interface ResultsScreenProps {
  attempts: Attempt[]
  onReplay: (audioFile: string) => void
  onNewRound: () => void
}

function scoreMessage(score: number, total: number): string {
  const ratio = score / total
  if (ratio === 1) return 'رائعة! كل الأصوات في مكانها.'
  if (ratio >= 0.8) return 'عمل جميل جدًا! أذنكِ تلتقط الحروف.'
  if (ratio >= 0.6) return 'أحسنتِ! جولة أخرى وستصبح أوضح.'
  return 'بداية حلوة! كل استماع يجعل الحروف أسهل.'
}

const modeLabels = {
  isolated: 'منفصل',
  initial: 'أول الكلمة',
  final: 'آخر الكلمة',
} as const

export function ResultsScreen({ attempts, onReplay, onNewRound }: ResultsScreenProps) {
  const score = attempts.filter((attempt) => attempt.correct).length

  return (
    <main className="screen results-screen">
      <header className="results-hero">
        <span className="trophy-seal" aria-hidden="true"><TrophyIcon width="34" height="34" /></span>
        <p className="eyebrow">اكتملت الجولة</p>
        <h1>نتيجتك الجميلة</h1>
        <p className="score-display" aria-label={`${score} من ${attempts.length}`}>
          <strong>{toArabicNumerals(score)}</strong>
          <span> / {toArabicNumerals(attempts.length)}</span>
        </p>
        <p className="score-message">{scoreMessage(score, attempts.length)}</p>
        <button className="primary-button" type="button" onClick={onNewRound}>
          <SparkleIcon width="20" height="20" />
          جولة جديدة
        </button>
      </header>

      <section className="review-section" aria-labelledby="review-title">
        <div className="review-heading">
          <div>
            <p className="eyebrow">راجعي الأصوات</p>
            <h2 id="review-title">حروف هذه الجولة</h2>
          </div>
          <span>{toArabicNumerals(attempts.length)} حرفًا</span>
        </div>

        <div className="review-list">
          {attempts.map((attempt, index) => {
            const expected = letterById.get(attempt.expectedLetterId)

            return (
              <article
                className={`review-item ${attempt.correct ? 'is-correct' : 'is-wrong'}`}
                data-testid="review-item"
                key={`${attempt.questionKey}-${index}`}
              >
                <div className="review-glyphs">
                  <bdi className="review-glyph" dir="rtl">{attempt.expectedGlyph}</bdi>
                  <div>
                    <strong>{expected?.nameAr}</strong>
                    <span>{modeLabels[attempt.mode]}</span>
                    <span
                      className={`review-verdict ${attempt.correct ? 'is-correct' : 'is-wrong'}`}
                      data-testid="review-verdict"
                    >
                      {attempt.correct ? (
                        <><CheckIcon width="15" height="15" /> إجابة صحيحة</>
                      ) : (
                        <><CloseIcon width="15" height="15" /> إجابة غير صحيحة</>
                      )}
                    </span>
                  </div>
                </div>
                {!attempt.correct && (
                  <p>اخترتِ <bdi dir="rtl">{attempt.selectedGlyph}</bdi></p>
                )}
                <button
                  className="review-audio"
                  type="button"
                  onClick={() => expected && onReplay(expected.audioFile)}
                  aria-label={`اسمعي صوت حرف ${expected?.nameAr ?? ''}`}
                  data-testid="review-audio"
                >
                  <ReplayIcon width="19" height="19" />
                  اسمعي
                </button>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
