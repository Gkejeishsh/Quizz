import type { Pack } from '../lib/types'

// Pack files live in /packs as plain .quizz JSON — the same files you can
// download and import through "Add new test → Upload file".
import vocabRaw from '../../packs/hec-vocab-urdu-test-1.quizz?raw'
import studyRaw from '../../packs/hec-vocab-urdu-study.quizz?raw'
import quantRaw from '../../packs/hec-quant-test-2.quizz?raw'
import chemRaw from '../../packs/chemistry-bonding-demo.quizz?raw'
import mathRaw from '../../packs/maths-algebra-demo.quizz?raw'
import engRaw from '../../packs/english-grammar-demo.quizz?raw'

import vocabUrl from '../../packs/hec-vocab-urdu-test-1.quizz?url'
import studyUrl from '../../packs/hec-vocab-urdu-study.quizz?url'
import quantUrl from '../../packs/hec-quant-test-2.quizz?url'
import chemUrl from '../../packs/chemistry-bonding-demo.quizz?url'
import mathUrl from '../../packs/maths-algebra-demo.quizz?url'
import engUrl from '../../packs/english-grammar-demo.quizz?url'

const parse = (raw: string): Pack => JSON.parse(raw) as Pack

export const DEMO_PACKS: Pack[] = [
  parse(vocabRaw),
  parse(studyRaw),
  parse(quantRaw),
  parse(chemRaw),
  parse(mathRaw),
  parse(engRaw),
]

export const DEMO_PACK_FILES: { id: string; title: string; url: string; fileName: string }[] = [
  { id: DEMO_PACKS[0].id, title: DEMO_PACKS[0].title, url: vocabUrl, fileName: 'hec-vocab-urdu-test-1.quizz' },
  { id: DEMO_PACKS[1].id, title: DEMO_PACKS[1].title, url: studyUrl, fileName: 'hec-vocab-urdu-study.quizz' },
  { id: DEMO_PACKS[2].id, title: DEMO_PACKS[2].title, url: quantUrl, fileName: 'hec-quant-test-2.quizz' },
  { id: DEMO_PACKS[3].id, title: DEMO_PACKS[3].title, url: chemUrl, fileName: 'chemistry-bonding-demo.quizz' },
  { id: DEMO_PACKS[4].id, title: DEMO_PACKS[4].title, url: mathUrl, fileName: 'maths-algebra-demo.quizz' },
  { id: DEMO_PACKS[5].id, title: DEMO_PACKS[5].title, url: engUrl, fileName: 'english-grammar-demo.quizz' },
]

export const DEMO_PACK_MAP: Record<string, Pack> = Object.fromEntries(DEMO_PACKS.map((p) => [p.id, p]))
