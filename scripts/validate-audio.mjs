import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const projectRoot = resolve(import.meta.dirname, '..')
const audioDirectory = resolve(projectRoot, 'public/audio')
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
  let onsetMs = Number.POSITIVE_INFINITY
  let peakAmplitude = 0

  for (let index = 0; index < sampleCount; index += 1) {
    const amplitude = Math.abs(buffer.readFloatLE(index * 4))
    peakAmplitude = Math.max(peakAmplitude, amplitude)
    if (!Number.isFinite(onsetMs) && amplitude >= 0.003) {
      onsetMs = Math.round((index / 44_100) * 1_000)
    }
  }

  return { onsetMs, peakAmplitude }
}

const entries = letters.map((letter) => {
  const file = `audio/${letter.id}.mp3`
  const filePath = resolve(projectRoot, 'public', file)

  if (!existsSync(filePath)) {
    throw new Error(`Missing audio asset: ${file}`)
  }

  const bytes = readFileSync(filePath)
  const size = statSync(filePath).size
  const duration = durationMs(filePath)
  const properties = audioProperties(filePath)
  const stream = properties.streams?.[0]
  const bitRate = Number.parseInt(properties.format?.bit_rate ?? '0', 10)
  const { onsetMs, peakAmplitude } = signalMetrics(filePath)

  if (size <= 0 || size > 80 * 1024) {
    throw new Error(`${file} has invalid size ${size}.`)
  }

  if (duration < 180 || duration > 1_800) {
    throw new Error(`${file} has invalid duration ${duration}ms.`)
  }

  if (stream?.codec_name !== 'mp3' || stream?.sample_rate !== '44100' || stream?.channels !== 1) {
    throw new Error(`${file} must be mono MP3 at 44.1kHz.`)
  }

  if (bitRate < 96_000) {
    throw new Error(`${file} has insufficient bitrate ${bitRate}.`)
  }

  if (onsetMs > 150) {
    throw new Error(`${file} begins useful signal at ${onsetMs}ms.`)
  }

  if (peakAmplitude < 0.1) {
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
  generator: 'ElevenLabs Layla (Multilingual v2, Arabic) + FFmpeg middle-take loudnorm',
  entries,
}

if (shouldWrite) {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
} else {
  const existing = JSON.parse(readFileSync(manifestPath, 'utf8'))
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
