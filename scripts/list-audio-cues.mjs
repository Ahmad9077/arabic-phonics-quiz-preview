import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const letters = JSON.parse(readFileSync(resolve(projectRoot, 'src/data/letters.json'), 'utf8'))

for (const letter of letters) {
  process.stdout.write(`${letter.id}\t${letter.cue}\n`)
}
