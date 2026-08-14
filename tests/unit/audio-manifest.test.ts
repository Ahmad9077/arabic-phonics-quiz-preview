import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { letters } from '../../src/data/letters'
import type { AudioManifest } from '../../src/domain/types'

const projectRoot = resolve(import.meta.dirname, '../..')
const manifestPath = resolve(projectRoot, 'public/audio/manifest.json')

function loadManifest(): AudioManifest {
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as AudioManifest
}

describe('bundled Arabic audio manifest', () => {
  it('covers every letter exactly once with the curated cue', () => {
    const manifest = loadManifest()
    const ids = manifest.entries.map((entry) => entry.letterId)

    expect(manifest.generator).toContain('ElevenLabs Layla')
    expect(manifest.entries).toHaveLength(28)
    expect(new Set(ids).size).toBe(28)

    for (const letter of letters) {
      const entry = manifest.entries.find((candidate) => candidate.letterId === letter.id)
      expect(entry, `missing audio for ${letter.id}`).toBeDefined()
      expect(entry?.cue).toBe(letter.cue)
      expect(entry?.file).toBe(letter.audioFile)
    }
  })

  it('contains small, hashed, non-empty MP3 assets in a child-safe duration range', () => {
    const manifest = loadManifest()

    for (const entry of manifest.entries) {
      const assetPath = resolve(projectRoot, 'public', entry.file.replace(/^\//, ''))
      const bytes = readFileSync(assetPath)
      const stat = statSync(assetPath)
      const hash = createHash('sha256').update(bytes).digest('hex')

      expect(stat.size).toBe(entry.bytes)
      expect(stat.size).toBeGreaterThan(0)
      expect(stat.size).toBeLessThanOrEqual(80 * 1024)
      expect(entry.durationMs).toBeGreaterThanOrEqual(180)
      expect(entry.durationMs).toBeLessThanOrEqual(1_800)
      expect(entry.sha256).toBe(hash)
    }
  })
})
