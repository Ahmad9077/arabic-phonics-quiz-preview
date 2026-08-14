import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/noto-kufi-arabic'
import '@fontsource-variable/noto-sans-arabic'
import './styles/tokens.css'
import './styles/app.css'
import App from './App'
import { bootstrapQuiz } from './hub/bootstrap'
import { HubBridge } from './hub/bridge'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Quiz root element is missing.')
}

const mountRoot = root

document.documentElement.dataset.buildMode = __QUIZ_BUILD_MODE__
if (__QUIZ_BUILD_MODE__ === 'production-hub') document.title = 'صدى الحروف'

async function mount(): Promise<void> {
  try {
    const context = await bootstrapQuiz(__QUIZ_BUILD_MODE__)
    const bridge = new HubBridge(context.mode)

    createRoot(mountRoot).render(
      <StrictMode>
        <App
          initialDifficulty={context.difficulty}
          preferredKeys={context.preferredKeys}
          source={context.source}
          bridge={bridge}
          initialChallengeState={context.challengeState}
        />
      </StrictMode>,
    )
  } catch {
    mountRoot.innerHTML = `
      <main class="screen bootstrap-error" dir="rtl">
        <section class="challenge-status-card">
          <p class="eyebrow">تعذّر فتح الاختبار</p>
          <h1>لنحاول مرة أخرى</h1>
          <p>ارجعي إلى مركز الاختبارات ثم افتحي اختبار صدى الحروف مجددًا.</p>
          <a class="primary-button" href="https://ahmad9077.github.io/quizzes-hub/">العودة إلى الاختبارات</a>
        </section>
      </main>
    `
  }
}

void mount()
