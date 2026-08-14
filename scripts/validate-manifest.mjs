import fs from 'node:fs/promises'
import process from 'node:process'
import Ajv2020 from 'ajv/dist/2020.js'

const schemaUrl = new URL('../specs/001-arabic-phonics-quiz/contracts/quiz-manifest.schema.json', import.meta.url)
const manifestUrl = new URL('../public/quiz-manifest.json', import.meta.url)
const [schema, manifest] = await Promise.all([
  fs.readFile(schemaUrl, 'utf8').then(JSON.parse),
  fs.readFile(manifestUrl, 'utf8').then(JSON.parse),
])

const ajv = new Ajv2020({ allErrors: true, strict: true })
const validate = ajv.compile(schema)

if (!validate(manifest)) {
  console.error(ajv.errorsText(validate.errors, { separator: '\n' }))
  process.exit(1)
}

console.log(`Quiz manifest is valid: ${manifest.id} v${manifest.version}`)
