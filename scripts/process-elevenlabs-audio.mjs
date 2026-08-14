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

function activeSegments(filePath) {
  const frames = frameEnvelope(decodeMono(filePath))
  const segments = []
  let segmentStart = null
  let lastActiveEnd = null
  let silenceStart = null

  for (const frame of frames) {
    if (frame.active) {
      if (segmentStart === null) segmentStart = frame.start
      lastActiveEnd = frame.end
      silenceStart = null
      continue
    }

    if (segmentStart === null) continue
    if (silenceStart === null) silenceStart = frame.start

    if (frame.end - silenceStart >= 0.08) {
      segments.push({ start: segmentStart, end: lastActiveEnd })
      segmentStart = null
      lastActiveEnd = null
      silenceStart = null
    }
  }

  if (segmentStart !== null && lastActiveEnd !== null) {
    segments.push({ start: segmentStart, end: lastActiveEnd })
  }

  return segments.filter((segment) => segment.end - segment.start >= 0.1)
}

function approvedTakes(filePath) {
  const segments = activeSegments(filePath)

  if (segments.length < 2) {
    throw new Error(`Expected a carrier phrase followed by two takes in ${basename(filePath)}.`)
  }

  const takes = segments.slice(-2)
  const durations = takes.map((take) => take.end - take.start)

  if (durations.some((duration) => duration < 0.12 || duration > 0.52)) {
    throw new Error(`Invalid final take duration in ${basename(filePath)}: ${durations.map((value) => value.toFixed(3)).join(', ')}s.`)
  }

  return takes
}

mkdirSync(outputDirectory, { recursive: true })

for (const letter of letters) {
  const inputPath = resolve(rawDirectory, `${letter.id}-raw.mp3`)
  const outputPath = resolve(outputDirectory, `${letter.id}.mp3`)

  if (!existsSync(inputPath)) {
    throw new Error(`Missing ElevenLabs source audio: ${inputPath}`)
  }

  const takes = approvedTakes(inputPath)
  const [firstTake, secondTake] = takes.map((take) => ({
    end: take.end + 0.03,
    start: Math.max(0, take.start - 0.02),
  }))
  const filter = [
    `[0:a]atrim=start=${firstTake.start.toFixed(4)}:end=${firstTake.end.toFixed(4)},asetpts=PTS-STARTPTS[first]`,
    `[0:a]atrim=start=${secondTake.start.toFixed(4)}:end=${secondTake.end.toFixed(4)},asetpts=PTS-STARTPTS[second]`,
    'anullsrc=r=44100:cl=mono:d=0.18[lead]',
    'anullsrc=r=44100:cl=mono:d=0.32[pause]',
    'anullsrc=r=44100:cl=mono:d=0.15[tail]',
    '[lead][first][pause][second][tail]concat=n=5:v=0:a=1[out]',
  ].join(';')

  run('ffmpeg', [
    '-hide_banner',
    '-loglevel', 'error',
    '-y',
    '-i', inputPath,
    '-filter_complex', filter,
    '-map', '[out]',
    '-ac', '1',
    '-ar', '44100',
    '-codec:a', 'libmp3lame',
    '-b:a', '128k',
    '-map_metadata', '-1',
    outputPath,
  ])

  console.log(`${letter.id}: ${firstTake.start.toFixed(3)}s-${firstTake.end.toFixed(3)}s, ${secondTake.start.toFixed(3)}s-${secondTake.end.toFixed(3)}s`)
}
