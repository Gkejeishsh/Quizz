import type { Pack } from '../lib/types'

const now = () => new Date().toISOString()

export const DEMO_PACKS: Pack[] = [
  {
    format: 'quizz-pack',
    formatVersion: 1,
    id: 'pck_demo_chem01',
    title: 'Chemical Bonding — Practice Test',
    subject: 'Chemistry',
    language: 'en',
    createdAt: now(),
    instructions: 'Attempt all 8 questions. 1 mark each. No negative marking.',
    source: { fileName: 'chemistry-bonding-demo.pdf', pages: 3, generator: 'Demo pack' },
    questions: [
      {
        n: 1,
        type: 'single',
        question: 'Which of the following molecules contains a triple covalent bond?',
        options: [
          { key: 'A', text: 'O₂' },
          { key: 'B', text: 'N₂' },
          { key: 'C', text: 'Cl₂' },
          { key: 'D', text: 'H₂' },
        ],
        answer: ['B'],
        explanation:
          'N₂ is held together by one sigma and two pi bonds — a triple bond (N≡N). O₂ has a double bond, while Cl₂ and H₂ have single bonds.',
      },
      {
        n: 2,
        type: 'single',
        question: 'The number of electrons shared between the two nitrogen atoms in N₂ is:',
        options: [
          { key: 'A', text: '2' },
          { key: 'B', text: '4' },
          { key: 'C', text: '6' },
          { key: 'D', text: '8' },
        ],
        answer: ['C'],
        explanation: 'A triple bond consists of three shared electron pairs, so 3 × 2 = 6 electrons are shared.',
      },
      {
        n: 3,
        type: 'single',
        question: 'An ionic bond is formed by:',
        options: [
          { key: 'A', text: 'Sharing of electron pairs between two non-metals' },
          { key: 'B', text: 'Complete transfer of electrons from a metal to a non-metal' },
          { key: 'C', text: 'Overlap of p orbitals only' },
          { key: 'D', text: 'Attraction between two nuclei' },
        ],
        answer: ['B'],
        explanation:
          'Ionic bonding involves transfer of one or more electrons from a metal (which becomes a cation) to a non-metal (which becomes an anion). The ions are then held by electrostatic attraction.',
      },
      {
        n: 4,
        type: 'single',
        question: 'Which molecule has a trigonal planar shape?',
        options: [
          { key: 'A', text: 'CH₄' },
          { key: 'B', text: 'NH₃' },
          { key: 'C', text: 'BF₃' },
          { key: 'D', text: 'H₂O' },
        ],
        answer: ['C'],
        explanation:
          'BF₃ has three bonding pairs and no lone pair on boron, giving 120° bond angles and a trigonal planar shape. CH₄ is tetrahedral, NH₃ is pyramidal and H₂O is bent.',
      },
      {
        n: 5,
        type: 'single',
        question: 'The strongest intermolecular force present in water is:',
        options: [
          { key: 'A', text: 'London dispersion forces' },
          { key: 'B', text: 'Dipole–dipole forces' },
          { key: 'C', text: 'Hydrogen bonding' },
          { key: 'D', text: 'Ionic attraction' },
        ],
        answer: ['C'],
        explanation:
          'Water has O–H bonds, so each molecule can donate and accept hydrogen bonds. These are much stronger than ordinary dipole–dipole or dispersion forces, which explains water’s high boiling point.',
      },
      {
        n: 6,
        type: 'single',
        question: 'In a covalent bond, the bond length decreases when:',
        options: [
          { key: 'A', text: 'Bond order increases' },
          { key: 'B', text: 'Bond order decreases' },
          { key: 'C', text: 'Atomic radius of the atoms increases' },
          { key: 'D', text: 'Electronegativity difference decreases' },
        ],
        answer: ['A'],
        explanation:
          'A higher bond order means more shared electron pairs and a stronger pull between the nuclei, so the atoms sit closer: C≡C is shorter than C=C, which is shorter than C–C.',
      },
      {
        n: 7,
        type: 'single',
        question: 'Which of the following is a non-polar molecule even though it contains polar bonds?',
        options: [
          { key: 'A', text: 'HCl' },
          { key: 'B', text: 'CO₂' },
          { key: 'C', text: 'H₂O' },
          { key: 'D', text: 'NH₃' },
        ],
        answer: ['B'],
        explanation:
          'CO₂ is linear, so its two C=O dipoles point in opposite directions and cancel exactly. HCl, H₂O and NH₃ are asymmetric, so their bond dipoles do not cancel.',
      },
      {
        n: 8,
        type: 'single',
        question: 'The lattice energy of an ionic compound increases with:',
        options: [
          { key: 'A', text: 'Larger ionic radii and lower charges' },
          { key: 'B', text: 'Smaller ionic radii and higher charges' },
          { key: 'C', text: 'More covalent character' },
          { key: 'D', text: 'Higher temperature' },
        ],
        answer: ['B'],
        explanation:
          'Lattice energy depends on charge product ÷ distance between ions. Higher charges and smaller ions both increase the electrostatic attraction, raising the lattice energy.',
      },
    ],
  },
  {
    format: 'quizz-pack',
    formatVersion: 1,
    id: 'pck_demo_math01',
    title: 'Algebra & Geometry — Quick Check',
    subject: 'Maths',
    language: 'en',
    createdAt: now(),
    source: { fileName: 'maths-quick-check-demo.pdf', pages: 2, generator: 'Demo pack' },
    questions: [
      {
        n: 1,
        type: 'single',
        question: 'If $x = 3$, what is the value of $2x + 1$?',
        options: [
          { key: 'A', text: '$4$' },
          { key: 'B', text: '$6$' },
          { key: 'C', text: '$7$' },
          { key: 'D', text: '$9$' },
        ],
        answer: ['C'],
        explanation: 'Substitute $x = 3$: $2(3) + 1 = 6 + 1 = 7$.',
      },
      {
        n: 2,
        type: 'single',
        question: 'Solve for $x$: $3x - 5 = 16$.',
        options: [
          { key: 'A', text: '$x = 5$' },
          { key: 'B', text: '$x = 7$' },
          { key: 'C', text: '$x = 9$' },
          { key: 'D', text: '$x = 21$' },
        ],
        answer: ['B'],
        explanation: 'Add 5 to both sides: $3x = 21$. Divide by 3: $x = 7$.',
      },
      {
        n: 3,
        type: 'single',
        question: 'The area of a circle with radius $r = 5\\text{ cm}$ is:',
        options: [
          { key: 'A', text: '$10\\pi\\text{ cm}^2$' },
          { key: 'B', text: '$25\\pi\\text{ cm}^2$' },
          { key: 'C', text: '$50\\pi\\text{ cm}^2$' },
          { key: 'D', text: '$5\\pi\\text{ cm}^2$' },
        ],
        answer: ['B'],
        explanation: 'Area $= \\pi r^2 = \\pi (5)^2 = 25\\pi\\text{ cm}^2$.',
      },
      {
        n: 4,
        type: 'single',
        question: 'What is the value of $(x + 2)(x - 2)$?',
        options: [
          { key: 'A', text: '$x^2 + 4$' },
          { key: 'B', text: '$x^2 - 4$' },
          { key: 'C', text: '$x^2 - 4x + 4$' },
          { key: 'D', text: '$x^2 + 4x + 4$' },
        ],
        answer: ['B'],
        explanation: 'This is the difference of two squares: $(a+b)(a-b) = a^2 - b^2$, so $(x+2)(x-2) = x^2 - 4$.',
      },
      {
        n: 5,
        type: 'single',
        question: 'The angles of a triangle are in the ratio $2:3:4$. The largest angle is:',
        options: [
          { key: 'A', text: '$40°$' },
          { key: 'B', text: '$60°$' },
          { key: 'C', text: '$80°$' },
          { key: 'D', text: '$90°$' },
        ],
        answer: ['C'],
        explanation:
          'The ratio adds to $2+3+4 = 9$ parts, and the angles sum to $180°$, so one part is $20°$. The largest angle is $4 \\times 20° = 80°$.',
      },
      {
        n: 6,
        type: 'single',
        question: 'If $f(x) = x^2 + 2x$, what is $f(-1)$?',
        options: [
          { key: 'A', text: '$-1$' },
          { key: 'B', text: '$0$' },
          { key: 'C', text: '$1$' },
          { key: 'D', text: '$3$' },
        ],
        answer: ['A'],
        explanation: '$f(-1) = (-1)^2 + 2(-1) = 1 - 2 = -1$.',
      },
      {
        n: 7,
        type: 'single',
        question: 'The slope of the line passing through $(1, 2)$ and $(4, 11)$ is:',
        options: [
          { key: 'A', text: '$2$' },
          { key: 'B', text: '$3$' },
          { key: 'C', text: '$4$' },
          { key: 'D', text: '$9$' },
        ],
        answer: ['B'],
        explanation: 'Slope $= \\frac{y_2 - y_1}{x_2 - x_1} = \\frac{11 - 2}{4 - 1} = \\frac{9}{3} = 3$.',
      },
      {
        n: 8,
        type: 'single',
        question: 'Which of the following is a prime number?',
        options: [
          { key: 'A', text: '$21$' },
          { key: 'B', text: '$27$' },
          { key: 'C', text: '$29$' },
          { key: 'D', text: '$33$' },
        ],
        answer: ['C'],
        explanation:
          '$29$ has no divisors other than $1$ and itself. $21 = 3 \\times 7$, $27 = 3 \\times 9$ and $33 = 3 \\times 11$.',
      },
    ],
  },
  {
    format: 'quizz-pack',
    formatVersion: 1,
    id: 'pck_demo_eng01',
    title: 'English Grammar & Usage',
    subject: 'English',
    language: 'en',
    createdAt: now(),
    source: { fileName: 'english-grammar-demo.pdf', pages: 2, generator: 'Demo pack' },
    questions: [
      {
        n: 1,
        type: 'single',
        question: 'Choose the correct sentence.',
        options: [
          { key: 'A', text: 'She don’t like coffee.' },
          { key: 'B', text: 'She doesn’t likes coffee.' },
          { key: 'C', text: 'She doesn’t like coffee.' },
          { key: 'D', text: 'She not like coffee.' },
        ],
        answer: ['C'],
        explanation:
          'With third-person singular subjects (she, he, it) we use “doesn’t” followed by the base verb: “She doesn’t like coffee.”',
      },
      {
        n: 2,
        type: 'single',
        question: 'Pick the correct past tense of “teach”.',
        options: [
          { key: 'A', text: 'Teached' },
          { key: 'B', text: 'Taught' },
          { key: 'C', text: 'Teach' },
          { key: 'D', text: 'Teaching' },
        ],
        answer: ['B'],
        explanation: '“Teach” is irregular: teach → taught → taught. “Teached” is a common error.',
      },
      {
        n: 3,
        type: 'single',
        question: 'The word “quickly” is a(n):',
        options: [
          { key: 'A', text: 'Adjective' },
          { key: 'B', text: 'Adverb' },
          { key: 'C', text: 'Noun' },
          { key: 'D', text: 'Preposition' },
        ],
        answer: ['B'],
        explanation: '“Quickly” modifies a verb (“she ran quickly”), so it is an adverb. The adjective form is “quick”.',
      },
      {
        n: 4,
        type: 'single',
        question: 'Choose the correct preposition: “He is good ___ mathematics.”',
        options: [
          { key: 'A', text: 'in' },
          { key: 'B', text: 'at' },
          { key: 'C', text: 'on' },
          { key: 'D', text: 'for' },
        ],
        answer: ['B'],
        explanation: 'The standard collocation is “good at” a skill or subject: “good at mathematics”.',
      },
      {
        n: 5,
        type: 'single',
        question: 'Which sentence uses the apostrophe correctly?',
        options: [
          { key: 'A', text: 'Its raining outside.' },
          { key: 'B', text: 'It’s raining outside.' },
          { key: 'C', text: 'Its’ raining outside.' },
          { key: 'D', text: 'It is’nt raining outside.' },
        ],
        answer: ['B'],
        explanation: '“It’s” is the contraction of “it is”. “Its” without an apostrophe is the possessive form, as in “the dog wagged its tail”.',
      },
      {
        n: 6,
        type: 'single',
        question: 'The synonym of “abundant” is:',
        options: [
          { key: 'A', text: 'Scarce' },
          { key: 'B', text: 'Plentiful' },
          { key: 'C', text: 'Fragile' },
          { key: 'D', text: 'Hidden' },
        ],
        answer: ['B'],
        explanation: '“Abundant” means existing in large quantities, so “plentiful” is the closest synonym. “Scarce” is its antonym.',
      },
      {
        n: 7,
        type: 'single',
        question: 'Choose the correct passive form: “The teacher explains the lesson.”',
        options: [
          { key: 'A', text: 'The lesson is explained by the teacher.' },
          { key: 'B', text: 'The lesson explained the teacher.' },
          { key: 'C', text: 'The lesson is explaining by the teacher.' },
          { key: 'D', text: 'The lesson was explain by the teacher.' },
        ],
        answer: ['A'],
        explanation:
          'Present simple passive = subject + is/are + past participle: “The lesson is explained by the teacher.” The object becomes the subject.',
      },
      {
        n: 8,
        type: 'single',
        question: 'Identify the conjunction in: “I studied hard, but the paper was difficult.”',
        options: [
          { key: 'A', text: 'studied' },
          { key: 'B', text: 'hard' },
          { key: 'C', text: 'but' },
          { key: 'D', text: 'difficult' },
        ],
        answer: ['C'],
        explanation: '“But” joins two independent clauses and shows contrast, so it is a coordinating conjunction.',
      },
    ],
  },
]

export const DEMO_PACK_MAP: Record<string, Pack> = Object.fromEntries(DEMO_PACKS.map((p) => [p.id, p]))
