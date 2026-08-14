import type { Difficulty } from '../domain/types'
import { SparkleIcon } from './icons'

interface StartScreenProps {
  difficulty: Difficulty
  isPreview: boolean
  onStart: () => void
}

const difficultyLabels: Record<Difficulty, string> = {
  easy: 'بداية لطيفة',
  medium: 'تدريب متوازن',
  hard: 'تحدّي الأشكال',
}

export function StartScreen({ difficulty, isPreview, onStart }: StartScreenProps) {
  return (
    <main className="screen start-screen">
      <header className="start-topline">
        <p className="wordmark">صدى الحروف</p>
        {isPreview && <span className="preview-ribbon">نسخة للمعاينة</span>}
      </header>

      <section className="start-hero">
        <div className="start-arch" aria-hidden="true">
          <span className="start-wave start-wave-one" />
          <span className="start-wave start-wave-two" />
          <span className="start-glyph">ع</span>
          <span className="start-diacritic">َ</span>
        </div>

        <p className="eyebrow">مغامرة سمعية بالعربية</p>
        <h1>اسمعي الصوت،<br />ثم أمسكي بالحرف</h1>
        <p className="start-copy">
          كل سؤال ينطق صوت حرف واحد. اختاري شكله الصحيح بين أربعة حروف.
        </p>

        <div className="form-preview" aria-label="أشكال الحرف التي ستظهر">
          <span>ع</span>
          <i aria-hidden="true">←</i>
          <span>عـ</span>
          <i aria-hidden="true">←</i>
          <span>ـع</span>
        </div>

        <button className="primary-button start-button" type="button" onClick={onStart}>
          <SparkleIcon width="21" height="21" />
          ابدئي المغامرة
        </button>

        <p className="start-note">١٥ سؤالًا · أربعة اختيارات · {difficultyLabels[difficulty]}</p>
      </section>
    </main>
  )
}
