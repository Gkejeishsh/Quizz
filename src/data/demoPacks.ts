import type { Pack } from '../lib/types'

// Pack files live in /packs as plain .quizz JSON — the same files you can
// download and import through "Add new test → Upload file".
import hecRaw from '../../packs/hec-quant-test-2.quizz?raw'
import chemRaw from '../../packs/chemistry-bonding-demo.quizz?raw'
import mathRaw from '../../packs/maths-algebra-demo.quizz?raw'
import engRaw from '../../packs/english-grammar-demo.quizz?raw'

import hecUrl from '../../packs/hec-quant-test-2.quizz?url'
import chemUrl from '../../packs/chemistry-bonding-demo.quizz?url'
import mathUrl from '../../packs/maths-algebra-demo.quizz?url'
import engUrl from '../../packs/english-grammar-demo.quizz?url'

const parse = (raw: string): Pack => JSON.parse(raw) as Pack

export const DEMO_PACKS: Pack[] = [parse(hecRaw), parse(chemRaw), parse(mathRaw), parse(engRaw)]

export const DEMO_PACK_FILES: { id: string; title: string; url: string; fileName: string }[] = [
  { id: 'pck_88becd87f33a', title: 'HEC Quantitative Practice Test 2', url: hecUrl, fileName: 'hec-quant-test-2.quizz' },
  { id: DEMO_PACKS[1].id, title: DEMO_PACKS[1].title, url: chemUrl, fileName: 'chemistry-bonding-demo.quizz' },
  { id: DEMO_PACKS[2].id, title: DEMO_PACKS[2].title, url: mathUrl, fileName: 'maths-algebra-demo.quizz' },
  { id: DEMO_PACKS[3].id, title: DEMO_PACKS[3].title, url: engUrl, fileName: 'english-grammar-demo.quizz' },
]

export const DEMO_PACK_MAP: Record<string, Pack> = Object.fromEntries(DEMO_PACKS.map((p) => [p.id, p]))
