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

function signalOnsetMs(filePath) {
  const pcm = run('ffmpeg', ['-v', 'error', '-i', filePath, '-ac', '1', '-ar', '44100', '-f', 'f32le', 'pipe:1'])
  const buffer = Buffer.isBuffer(pcm) ? pcm : Buffer.from(pcm)
  const sampleCount = Math.floor(buffer.length / 4)

  for (let index = 0; index < sampleCount; index += 1) {
    if (Math.abs(buffer.readFloatLE(index * 4)) >= 0.003) {
      return Math.round((index / 44_100) * 1_000)
    }
  }

  return Number.POSITIVE_INFINITY
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
  const onset = signalOnsetMs(filePath)

  if (size <= 0 || size > 80 * 1024) {
    throw new Error(`${file} has invalid size ${size}.`)
  }

  if (duration < 180 || duration > 1_800) {
    throw new Error(`${file} has invalid duration ${duration}ms.`)
  }

  if (onset > 150) {
    throw new Error(`${file} begins useful signal at ${onset}ms.`)
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
  generator: 'macOS Majed + FFmpeg loudnorm',
  entries,
}

if (shouldWrite) {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
} else {
  const existing = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (JSON.stringify(existing.entries) !== JSON.stringify(entries)) {
    throw new Error('Audio manifest does not match the current files. Run npm run generate:audio.')
  }
}

console.log(`Validated ${entries.length} Arabic audio assets.`)
