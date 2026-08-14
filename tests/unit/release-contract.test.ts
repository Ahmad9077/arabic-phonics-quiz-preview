import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = resolve(import.meta.dirname, '../..')

function read(relativePath: string): string {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8')
}

describe('approved production release contract', () => {
  it('uses the approved B cache revision and quiz semantic version', () => {
    const player = read('src/audio/audioPlayer.ts')
    expect(player).toContain("AUDIO_REVISION = 'layla-clear-b1-2026-08-14'")
    expect(player).toContain('audio.defaultPlaybackRate = 1')
    expect(player).toContain('audio.playbackRate = 1')
    expect(JSON.parse(read('public/quiz-manifest.json')).version).toBe('1.1.0')
  })

  it('builds the correct Pages artifact for preview and production repositories', () => {
    const workflow = read('.github/workflows/deploy-preview.yml')
    expect(workflow).toContain('Ahmad9077/arabic-phonics-quiz')
    expect(workflow).toContain('npm run build:hub')
    expect(workflow).toContain('npm run build:preview')
  })

  it('does not ship the obsolete pre-approval comparison surface', () => {
    expect(existsSync(resolve(projectRoot, 'public/audio-comparison.html'))).toBe(false)
    expect(existsSync(resolve(projectRoot, 'public/audio-comparison'))).toBe(false)
  })
})
