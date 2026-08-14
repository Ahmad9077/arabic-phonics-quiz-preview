import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AudioPlayer, type AudioPlaybackState } from './audio/audioPlayer'
import { ChallengeStatusScreen } from './components/ChallengeStatusScreen'
import { QuizScreen } from './components/QuizScreen'
import { ResultsScreen } from './components/ResultsScreen'
import { StartScreen } from './components/StartScreen'
import { buildChallengeQuestion, buildRound } from './domain/questionEngine'
import { createSeededRandom } from './domain/seededRandom'
import type {
  Attempt,
  Difficulty,
  QuestionChoice,
  QuizRound,
  QuizSource,
  RandomSource,
} from './domain/types'
import type { ChallengeState } from './hub/contracts'
import { HubBridge } from './hub/bridge'

type Screen = 'start' | 'quiz' | 'results'

interface AppProps {
  initialDifficulty?: Difficulty
  preferredKeys?: readonly string[]
  source?: QuizSource
  bridge?: HubBridge
  initialChallengeState?: ChallengeState | null
}

function previewSeed(): string | null {
  if (__QUIZ_BUILD_MODE__ !== 'preview') return null
  return new URLSearchParams(window.location.search).get('seed')
}

export default function App({
  initialDifficulty = 'medium',
  preferredKeys = [],
  source = __QUIZ_BUILD_MODE__ === 'preview' ? 'preview' : 'hub',
  bridge = new HubBridge(__QUIZ_BUILD_MODE__),
  initialChallengeState = null,
}: AppProps) {
  const audioPlayer = useMemo(() => new AudioPlayer(import.meta.env.BASE_URL), [])
  const seed = useMemo(() => previewSeed(), [])
  const roundNumber = useRef(0)
  const reportedRound = useRef(false)
  const lockedQuestionKeys = useRef(new Set<string>())
  const lockedChallengeTurns = useRef(new Set<string>())
  const [screen, setScreen] = useState<Screen>('start')
  const [round, setRound] = useState<QuizRound | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [audioState, setAudioState] = useState<AudioPlaybackState>('idle')
  const [challengeState, setChallengeState] = useState<ChallengeState | null>(initialChallengeState)
  const [challengeResponse, setChallengeResponse] = useState<{
    turnId: string
    attempt: Attempt
    submitError: boolean
  } | null>(null)

  const challengeTurnId = challengeState
    ? `${challengeState.current_turn_index}:${challengeState.current_question_key ?? 'none'}:${challengeState.current_answering_user_id ?? 'none'}`
    : 'none'
  const challengeQuestion = challengeState?.current_question_key
    ? buildChallengeQuestion(
        challengeState.current_question_key,
        challengeState.current_turn_index,
        initialDifficulty,
      )
    : null
  const challengeAudioFile = challengeQuestion?.variant.audioFile ?? null
  const challengeStatus = challengeState?.status ?? 'unavailable'
  const challengeAttempt = challengeResponse?.turnId === challengeTurnId
    ? challengeResponse.attempt
    : null
  const challengeSubmitError = challengeResponse?.turnId === challengeTurnId
    ? challengeResponse.submitError
    : false

  useEffect(() => {
    const unsubscribe = audioPlayer.subscribe(setAudioState)
    return () => {
      unsubscribe()
      audioPlayer.dispose()
    }
  }, [audioPlayer])

  useEffect(() => {
    if (source !== 'challenge') return undefined
    return bridge.onChallengeChange(setChallengeState)
  }, [bridge, source])

  useEffect(() => {
    if (source !== 'challenge') return
    audioPlayer.stop()
    if (challengeAudioFile) audioPlayer.preload(challengeAudioFile)
  }, [audioPlayer, challengeAudioFile, challengeStatus, challengeTurnId, source])

  const makeRandom = useCallback((): RandomSource => {
    if (!seed) return Math.random
    return createSeededRandom(`${seed}:round:${roundNumber.current}`)
  }, [seed])

  const beginRound = useCallback(() => {
    roundNumber.current += 1
    const nextRound = buildRound(initialDifficulty, preferredKeys, makeRandom(), source)
    const firstQuestion = nextRound.questions[0]
    const secondQuestion = nextRound.questions[1]

    if (!firstQuestion) return

    void audioPlayer.play(firstQuestion.variant.audioFile).catch(() => undefined)
    if (secondQuestion) audioPlayer.preload(secondQuestion.variant.audioFile)
    setRound(nextRound)
    setQuestionIndex(0)
    setAttempts([])
    lockedQuestionKeys.current.clear()
    reportedRound.current = false
    setScreen('quiz')
  }, [audioPlayer, initialDifficulty, makeRandom, preferredKeys, source])

  const currentQuestion = round?.questions[questionIndex]
  const currentAttempt = currentQuestion
    ? attempts.find((attempt) => attempt.questionKey === currentQuestion.variant.key) ?? null
    : null

  const playCurrent = useCallback(() => {
    if (!currentQuestion) return
    void audioPlayer.play(currentQuestion.variant.audioFile).catch(() => undefined)
  }, [audioPlayer, currentQuestion])

  const selectChoice = useCallback((choice: QuestionChoice) => {
    if (!currentQuestion || currentAttempt) return
    const questionKey = currentQuestion.variant.key
    if (lockedQuestionKeys.current.has(questionKey)) return
    lockedQuestionKeys.current.add(questionKey)

    const correct = choice.letterId === currentQuestion.variant.letterId
    const attempt: Attempt = {
      questionKey,
      selectedLetterId: choice.letterId,
      selectedGlyph: choice.glyph,
      expectedLetterId: currentQuestion.variant.letterId,
      expectedGlyph: currentQuestion.variant.glyph,
      mode: currentQuestion.variant.mode,
      correct,
    }

    setAttempts((existing) => {
      if (existing.some((candidate) => candidate.questionKey === questionKey)) return existing
      return [...existing, attempt]
    })
  }, [currentAttempt, currentQuestion])

  const selectChallengeChoice = useCallback((choice: QuestionChoice) => {
    if (!challengeQuestion || challengeAttempt || !bridge.canAnswerChallenge()) return
    if (lockedChallengeTurns.current.has(challengeTurnId)) return
    lockedChallengeTurns.current.add(challengeTurnId)

    const attempt: Attempt = {
      questionKey: challengeQuestion.variant.key,
      selectedLetterId: choice.letterId,
      selectedGlyph: choice.glyph,
      expectedLetterId: challengeQuestion.variant.letterId,
      expectedGlyph: challengeQuestion.variant.glyph,
      mode: challengeQuestion.variant.mode,
      correct: choice.letterId === challengeQuestion.variant.letterId,
    }

    setChallengeResponse({ turnId: challengeTurnId, attempt, submitError: false })
    void bridge.submitChallenge(attempt, challengeTurnId).then((result) => {
      if (!result.ok && result.reason !== 'duplicate-turn') {
        setChallengeResponse((current) => current?.turnId === challengeTurnId
          ? { ...current, submitError: true }
          : current)
      }
    })
  }, [bridge, challengeAttempt, challengeQuestion, challengeTurnId])

  const nextQuestion = useCallback(() => {
    if (!round || !currentAttempt) return

    if (questionIndex + 1 >= round.questions.length) {
      audioPlayer.stop()
      if (source === 'hub' && !reportedRound.current) {
        reportedRound.current = true
        void bridge.reportRound(attempts, initialDifficulty)
      }
      setScreen('results')
      return
    }

    const nextIndex = questionIndex + 1
    const next = round.questions[nextIndex]
    const following = round.questions[nextIndex + 1]

    if (!next) return
    void audioPlayer.play(next.variant.audioFile).catch(() => undefined)
    if (following) audioPlayer.preload(following.variant.audioFile)
    setQuestionIndex(nextIndex)
  }, [attempts, audioPlayer, bridge, currentAttempt, initialDifficulty, questionIndex, round, source])

  if (source === 'challenge') {
    if (!challengeState || challengeState.status === 'waiting') {
      return (
        <div className="app-shell">
          <ChallengeStatusScreen state={challengeState} onBack={() => bridge.openHub()} />
        </div>
      )
    }

    if (challengeState.status === 'finished') {
      return (
        <div className="app-shell">
          <ChallengeStatusScreen state={challengeState} reason="finished" onBack={() => bridge.openHub()} />
        </div>
      )
    }

    if (!challengeQuestion) {
      return (
        <div className="app-shell">
          <ChallengeStatusScreen state={challengeState} reason="unknown-question" onBack={() => bridge.openHub()} />
        </div>
      )
    }

    const answeringPlayer = challengeState.players.find((player) => {
      return player.user_id === challengeState.current_answering_user_id
    })
    const canAnswer = bridge.canAnswerChallenge()
    const priorResult = challengeState.last_turn
      ? challengeState.last_turn.is_correct ? 'الإجابة السابقة صحيحة!' : 'الإجابة السابقة تحتاج محاولة أخرى.'
      : null
    const turnStatus = challengeSubmitError
      ? 'تعذّر إرسال الإجابة. ارجعي إلى مركز الاختبارات وحاولي مجددًا.'
      : challengeAttempt
        ? 'تم إرسال إجابتكِ، انتظري الدور التالي.'
        : canAnswer
          ? [priorResult, 'دوركِ الآن.'].filter(Boolean).join(' ')
          : [priorResult, answeringPlayer ? `الآن دور ${answeringPlayer.display_name}.` : 'انتظري الدور التالي.'].filter(Boolean).join(' ')

    return (
      <div className="app-shell active-quiz-shell">
        <QuizScreen
          question={challengeQuestion}
          questionIndex={challengeState.current_turn_index}
          total={challengeState.current_turn_index + 1}
          attempt={challengeAttempt}
          audioState={audioState}
          isPreview={false}
          answersDisabled={!canAnswer || challengeSubmitError}
          hideNextAction
          counterText={`الدور ${toChallengeNumerals(challengeState.current_turn_index + 1)}`}
          statusText={turnStatus}
          onPlay={() => void audioPlayer.play(challengeQuestion.variant.audioFile).catch(() => undefined)}
          onSelect={selectChallengeChoice}
          onNext={() => undefined}
        />
      </div>
    )
  }

  if (screen === 'start') {
    return (
      <div className="app-shell">
        <StartScreen
          difficulty={initialDifficulty}
          isPreview={__QUIZ_BUILD_MODE__ === 'preview'}
          onStart={beginRound}
        />
      </div>
    )
  }

  if (screen === 'quiz' && round && currentQuestion) {
    return (
      <div className="app-shell active-quiz-shell">
        <QuizScreen
          question={currentQuestion}
          questionIndex={questionIndex}
          total={round.questions.length}
          attempt={currentAttempt}
          audioState={audioState}
          isPreview={__QUIZ_BUILD_MODE__ === 'preview'}
          onPlay={playCurrent}
          onSelect={selectChoice}
          onNext={nextQuestion}
        />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <ResultsScreen attempts={attempts} onReplay={(file) => void audioPlayer.play(file)} onNewRound={beginRound} />
    </div>
  )
}

function toChallengeNumerals(value: number): string {
  return String(value).replace(/[0-9]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)] ?? digit)
}
