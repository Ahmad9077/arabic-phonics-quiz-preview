import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const projectRoot = resolve(import.meta.dirname, '..')
const audioDirectory = resolve(process.env.ARABIC_AUDIO_DIR ?? resolve(projectRoot, 'public/audio'))
const manifestPath = resolve(audioDirectory, 'manifest.json')
const letters = JSON.parse(readFileSync(resolve(projectRoot, 'src/data/letters.json'), 'utf8'))
const shouldWrite = process.argv.includes('--write')

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: options.encoding,
    maxBuffer: 4 * 1024 * 1024,
  })

  if (result.status !== 0) {
    throw new Error(`${command} failed: ${String(result.stderr || result.stdout).trim()}`)
  }

  return result.stdout
}

function durationMs(filePath) {
  const value = run(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
    { encoding: 'utf8' },
  )

  return Math.round(Number.parseFloat(value.trim()) * 1_000)
}

function audioProperties(filePath) {
  const output = run(
    'ffprobe',
    [
      '-v', 'error',
      '-show_entries', 'format=bit_rate:stream=codec_name,sample_rate,channels',
      '-of', 'json',
      filePath,
    ],
    { encoding: 'utf8' },
  )

  return JSON.parse(output)
}

function signalMetrics(filePath) {
  const pcm = run('ffmpeg', ['-v', 'error', '-i', filePath, '-ac', '1', '-ar', '44100', '-f', 'f32le', 'pipe:1'])
  const buffer = Buffer.isBuffer(pcm) ? pcm : Buffer.from(pcm)
  const sampleCount = Math.floor(buffer.length / 4)
  const samplesPerFrame = 441
  const frames = []
  let peakAmplitude = 0

  for (let start = 0; start < sampleCount; start += samplesPerFrame) {
    const end = Math.min(sampleCount, start + samplesPerFrame)
    let sumSquares = 0
    let framePeak = 0

    for (let index = start; index < end; index += 1) {
      const sample = buffer.readFloatLE(index * 4)
      sumSquares += sample * sample
      framePeak = Math.max(framePeak, Math.abs(sample))
    }

    peakAmplitude = Math.max(peakAmplitude, framePeak)
    frames.push({
      active: Math.sqrt(sumSquares / Math.max(1, end - start)) >= 0.0015 || framePeak >= 0.006,
      end: end / 44_100,
      start: start / 44_100,
    })
  }

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

  return { peakAmplitude, segments }
}

const entries = letters.map((letter) => {
  const file = `audio/${letter.id}.mp3`
  const filePath = resolve(audioDirectory, `${letter.id}.mp3`)

  if (!existsSync(filePath)) {
    throw new Error(`Missing audio asset: ${file}`)
  }

  const bytes = readFileSync(filePath)
  const size = statSync(filePath).size
  const duration = durationMs(filePath)
  const properties = audioProperties(filePath)
  const stream = properties.streams?.[0]
  const bitRate = Number.parseInt(properties.format?.bit_rate ?? '0', 10)
  const { peakAmplitude, segments } = signalMetrics(filePath)

  if (size <= 0 || size > 80 * 1024) {
    throw new Error(`${file} has invalid size ${size}.`)
  }

  if (duration < 1_000 || duration > 1_600) {
    throw new Error(`${file} has invalid duration ${duration}ms.`)
  }

  if (stream?.codec_name !== 'mp3' || stream?.sample_rate !== '44100' || stream?.channels !== 1) {
    throw new Error(`${file} must be mono MP3 at 44.1kHz.`)
  }

  if (bitRate < 96_000) {
    throw new Error(`${file} has insufficient bitrate ${bitRate}.`)
  }

  if (segments.length !== 2) {
    throw new Error(`${file} must contain exactly two separated natural-speed takes.`)
  }

  const onsetMs = Math.round(segments[0].start * 1_000)
  const pauseMs = Math.round((segments[1].start - segments[0].end) * 1_000)
  const takeDurationsMs = segments.map((segment) => Math.round((segment.end - segment.start) * 1_000))

  if (onsetMs < 140 || onsetMs > 260) {
    throw new Error(`${file} begins useful signal at ${onsetMs}ms; expected a 140-260ms pre-roll.`)
  }

  if (pauseMs < 180 || pauseMs > 550) {
    throw new Error(`${file} has an invalid inter-take pause of ${pauseMs}ms.`)
  }

  if (takeDurationsMs.some((takeDuration) => takeDuration < 120 || takeDuration > 520)) {
    throw new Error(`${file} has an invalid natural-take duration: ${takeDurationsMs.join(', ')}ms.`)
  }

  if (peakAmplitude < 0.1 || peakAmplitude >= 0.98) {
    throw new Error(`${file} is silent or too quiet (peak ${peakAmplitude}).`)
  }

  return {
    letterId: letter.id,
    cue: letter.cue,
    file,
    durationMs: duration,
    bytes: size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
})

const manifest = {
  generatedAt: new Date().toISOString(),
  generator: 'ElevenLabs Layla (Multilingual v2, Arabic, speed 1.0) + FFmpeg onset-preserving two natural-speed takes, no time stretch',
  entries,
}

if (shouldWrite) {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
} else {
  const existing = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (!existing.generator.includes('two natural-speed takes') || !existing.generator.includes('speed 1.0')) {
    throw new Error('Audio manifest must identify the approved natural-speed two-take treatment B.')
  }
  const existingById = new Map(existing.entries.map((entry) => [entry.letterId, entry]))

  for (const entry of entries) {
    const recorded = existingById.get(entry.letterId)
    const stableFieldsMatch = recorded
      && recorded.cue === entry.cue
      && recorded.file === entry.file
      && recorded.bytes === entry.bytes
      && recorded.sha256 === entry.sha256
    const durationIsPortable = recorded
      && Math.abs(recorded.durationMs - entry.durationMs) <= 120

    if (!stableFieldsMatch || !durationIsPortable) {
      throw new Error(`Audio manifest does not match ${entry.file}. Run npm run generate:audio.`)
    }
  }

  if (existing.entries.length !== entries.length) {
    throw new Error('Audio manifest entry count does not match the current letter bank.')
  }
}

console.log(`Validated ${entries.length} Arabic audio assets.`)
