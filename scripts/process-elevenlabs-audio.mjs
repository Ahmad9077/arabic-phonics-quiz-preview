import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const projectRoot = resolve(import.meta.dirname, '..')
const rawDirectory = resolve(process.argv[2] ?? '')
const outputDirectory = resolve(process.argv[3] ?? resolve(projectRoot, 'public/audio'))
const letters = JSON.parse(readFileSync(resolve(projectRoot, 'src/data/letters.json'), 'utf8'))

if (!process.argv[2]) {
  throw new Error('Usage: node scripts/process-elevenlabs-audio.mjs <raw-directory> [output-directory]')
}

if (!existsSync(rawDirectory)) {
  throw new Error(`Raw audio directory does not exist: ${rawDirectory}`)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: options.encoding,
    maxBuffer: 16 * 1024 * 1024,
  })

  if (result.status !== 0) {
    throw new Error(`${command} failed: ${String(result.stderr || result.stdout).trim()}`)
  }

  return result.stdout
}

function decodeMono(filePath) {
  const output = run('ffmpeg', [
    '-v', 'error',
    '-i', filePath,
    '-ac', '1',
    '-ar', '44100',
    '-f', 'f32le',
    'pipe:1',
  ])

  return Buffer.isBuffer(output) ? output : Buffer.from(output)
}

function frameEnvelope(pcm, sampleRate = 44_100, frameMs = 10) {
  const samplesPerFrame = Math.round((sampleRate * frameMs) / 1_000)
  const sampleCount = Math.floor(pcm.length / 4)
  const frames = []

  for (let start = 0; start < sampleCount; start += samplesPerFrame) {
    const end = Math.min(sampleCount, start + samplesPerFrame)
    let sumSquares = 0
    let peak = 0

    for (let index = start; index < end; index += 1) {
      const sample = pcm.readFloatLE(index * 4)
      sumSquares += sample * sample
      peak = Math.max(peak, Math.abs(sample))
    }

    frames.push({
      active: Math.sqrt(sumSquares / Math.max(1, end - start)) >= 0.0015 || peak >= 0.006,
      end: end / sampleRate,
      start: start / sampleRate,
    })
  }

  return frames
}

function usefulWindow(filePath) {
  const frames = frameEnvelope(decodeMono(filePath))
  const firstActive = frames.findIndex((frame) => frame.active)
  const lastActive = frames.findLastIndex((frame) => frame.active)

  if (firstActive < 0 || lastActive <= firstActive) {
    throw new Error(`No useful speech signal found in ${basename(filePath)}.`)
  }

  const speechStart = frames[firstActive].start
  const speechEnd = frames[lastActive].end
  const internalSilences = []
  let silenceStart = null

  for (let index = firstActive; index <= lastActive; index += 1) {
    if (!frames[index].active && silenceStart === null) silenceStart = frames[index].start

    const silenceEnded = frames[index].active && silenceStart !== null
    const reachedEnd = index === lastActive && silenceStart !== null

    if (silenceEnded || reachedEnd) {
      const silenceEnd = silenceEnded ? frames[index].start : frames[index].end
      if (silenceEnd - silenceStart >= 0.06) {
        internalSilences.push({
          duration: silenceEnd - silenceStart,
          end: silenceEnd,
          start: silenceStart,
        })
      }
      silenceStart = null
    }
  }

  const strongestSeparators = internalSilences
    .sort((left, right) => right.duration - left.duration)
    .slice(0, 2)
    .sort((left, right) => left.start - right.start)

  let start
  let end

  if (strongestSeparators.length === 2) {
    start = strongestSeparators[0].end
    end = strongestSeparators[1].start
  } else if (strongestSeparators.length === 1) {
    const separator = strongestSeparators[0]
    const separatorPosition = ((separator.start + separator.end) / 2 - speechStart) / (speechEnd - speechStart)

    if (separatorPosition >= 0.55) {
      start = speechStart + (separator.start - speechStart) / 2
      end = separator.start
    } else if (separatorPosition <= 0.45) {
      start = separator.end
      end = separator.end + (speechEnd - separator.end) / 2
    }
  }

  if (start === undefined || end === undefined || end - start < 0.16) {
    const third = (speechEnd - speechStart) / 3
    start = speechStart + third
    end = speechStart + third * 2
  }

  const candidateFrames = frames.filter((frame) => frame.end > start && frame.start < end)
  const firstCandidateSignal = candidateFrames.find((frame) => frame.active)
  const lastCandidateSignal = candidateFrames.findLast((frame) => frame.active)

  if (firstCandidateSignal && lastCandidateSignal) {
    start = Math.max(speechStart, firstCandidateSignal.start - 0.025)
    end = Math.min(speechEnd, lastCandidateSignal.end + 0.035)
  }

  if (end - start < 0.18) {
    const center = (start + end) / 2
    start = Math.max(speechStart, center - 0.09)
    end = Math.min(speechEnd, center + 0.09)
  }

  return { end, start }
}

mkdirSync(outputDirectory, { recursive: true })

for (const letter of letters) {
  const inputPath = resolve(rawDirectory, `${letter.id}-raw.mp3`)
  const outputPath = resolve(outputDirectory, `${letter.id}.mp3`)

  if (!existsSync(inputPath)) {
    throw new Error(`Missing ElevenLabs source audio: ${inputPath}`)
  }

  const { end, start } = usefulWindow(inputPath)

  run('ffmpeg', [
    '-hide_banner',
    '-loglevel', 'error',
    '-y',
    '-ss', start.toFixed(4),
    '-to', end.toFixed(4),
    '-i', inputPath,
    '-af', 'afade=t=in:d=0.012,loudnorm=I=-18:LRA=5:TP=-1.5,apad=pad_dur=0.08',
    '-ac', '1',
    '-ar', '44100',
    '-codec:a', 'libmp3lame',
    '-b:a', '128k',
    '-map_metadata', '-1',
    outputPath,
  ])

  console.log(`${letter.id}: ${start.toFixed(3)}s-${end.toFixed(3)}s`)
}
