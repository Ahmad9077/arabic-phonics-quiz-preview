import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const projectRoot = resolve(import.meta.dirname, '..')
const manifestPath = resolve(projectRoot, 'public/audio-comparison/manifest.json')
const expectedLetterIds = ['ain', 'hah', 'dad', 'qaf', 'seen']

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  })

  if (result.status !== 0) {
    throw new Error(`${command} failed: ${String(result.stderr || result.stdout).trim()}`)
  }

  return result
}

function probe(filePath) {
  const result = run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration,bit_rate:stream=codec_name,sample_rate,channels',
    '-of', 'json',
    filePath,
  ])

  return JSON.parse(result.stdout)
}

function silenceBoundaries(filePath) {
  const result = run('ffmpeg', [
    '-hide_banner',
    '-i', filePath,
    '-af', 'silencedetect=noise=-38dB:d=0.08',
    '-f', 'null',
    '-',
  ])
  const ends = [...result.stderr.matchAll(/silence_end: ([0-9.]+)/g)].map((match) => Number(match[1]))
  const starts = [...result.stderr.matchAll(/silence_start: ([0-9.]+)/g)].map((match) => Number(match[1]))

  return { starts, ends }
}

if (!existsSync(manifestPath)) {
  throw new Error('Missing audio comparison manifest.')
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

if (manifest.purpose !== 'comparison-only') {
  throw new Error('Comparison audio must remain marked comparison-only.')
}

if (manifest.generator?.speed !== 1) {
  throw new Error('Comparison audio must be generated at natural speed 1.0.')
}

const actualLetterIds = manifest.entries.map((entry) => entry.letterId)
if (JSON.stringify(actualLetterIds) !== JSON.stringify(expectedLetterIds)) {
  throw new Error('Comparison audio manifest must contain the five approved A/B letters in order.')
}

for (const entry of manifest.entries) {
  const filePath = resolve(projectRoot, 'public', entry.file)
  if (!existsSync(filePath)) {
    throw new Error(`Missing comparison audio asset: ${entry.file}`)
  }

  const bytes = readFileSync(filePath)
  const size = statSync(filePath).size
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const properties = probe(filePath)
  const stream = properties.streams?.[0]
  const durationMs = Math.round(Number.parseFloat(properties.format?.duration ?? '0') * 1_000)
  const bitRate = Number.parseInt(properties.format?.bit_rate ?? '0', 10)
  const { starts, ends } = silenceBoundaries(filePath)

  if (entry.bytes !== size || entry.sha256 !== sha256) {
    throw new Error(`Comparison manifest does not match ${entry.file}.`)
  }

  if (Math.abs(entry.durationMs - durationMs) > 120 || durationMs < 1_000 || durationMs > 1_500) {
    throw new Error(`${entry.file} has invalid duration ${durationMs}ms.`)
  }

  if (stream?.codec_name !== 'mp3' || stream?.sample_rate !== '44100' || stream?.channels !== 1) {
    throw new Error(`${entry.file} must be mono MP3 at 44.1kHz.`)
  }

  if (bitRate < 96_000) {
    throw new Error(`${entry.file} has insufficient bitrate ${bitRate}.`)
  }

  if (starts.length !== 3 || ends.length !== 3) {
    throw new Error(`${entry.file} must contain exactly two separated natural-speed takes.`)
  }

  if (ends[0] < 0.15 || ends[0] > 0.28) {
    throw new Error(`${entry.file} must preserve a short playback pre-roll before the first onset.`)
  }
}

console.log(`Validated ${manifest.entries.length} comparison-only Arabic audio assets.`)
