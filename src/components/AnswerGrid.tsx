import type { QuestionChoice } from '../domain/types'
import { CheckIcon, CloseIcon } from './icons'

interface AnswerGridProps {
  choices: QuestionChoice[]
  correctLetterId: string
  selectedLetterId: string | null
  locked: boolean
  disabled?: boolean
  onSelect: (choice: QuestionChoice) => void
}

export function AnswerGrid({
  choices,
  correctLetterId,
  selectedLetterId,
  locked,
  disabled = false,
  onSelect,
}: AnswerGridProps) {
  return (
    <div className="answer-grid" role="group" aria-label="اختيارات الحروف">
      {choices.map((choice) => {
        const selected = selectedLetterId === choice.letterId
        const correct = choice.letterId === correctLetterId
        const stateClass = locked
          ? correct
            ? ' is-correct'
            : selected
              ? ' is-wrong'
              : ''
          : ''

        return (
          <button
            className={`answer-option${stateClass}`}
            key={choice.letterId}
            type="button"
            onClick={() => onSelect(choice)}
            disabled={locked || disabled}
            aria-label={`الحرف ${choice.glyph}`}
            data-testid="answer-option"
            data-selected={selected ? 'true' : 'false'}
          >
            <bdi className="answer-glyph" dir="rtl">{choice.glyph}</bdi>
            {locked && correct && (
              <span className="answer-state" aria-label="الإجابة الصحيحة">
                <CheckIcon width="20" height="20" />
              </span>
            )}
            {locked && selected && !correct && (
              <span className="answer-state" aria-label="إجابة غير صحيحة">
                <CloseIcon width="20" height="20" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
