import { writeFileSync, existsSync, mkdirSync } from 'fs'

const CODES = [
  'dz', 'ar', 'au', 'at', 'be', 'ba', 'br', 'ca', 'cv', 'co',
  'hr', 'cw', 'cz', 'cd', 'ec', 'eg', 'gb-eng', 'fr', 'de', 'gh',
  'ht', 'ir', 'iq', 'ci', 'jp', 'jo', 'mx', 'ma', 'nl', 'nz',
  'no', 'pa', 'py', 'pt', 'qa', 'sa', 'gb-sct', 'sn', 'za', 'kr',
  'es', 'se', 'ch', 'tn', 'tr', 'us', 'uy', 'uz',
]

const DIR = 'public/flags'
if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true })

let downloaded = 0
let skipped = 0

await Promise.all(
  CODES.map(async (code) => {
    const dest = `${DIR}/${code}.png`
    if (existsSync(dest)) { skipped++; return }
    const res = await fetch(`https://flagcdn.com/w40/${code}.png`)
    if (!res.ok) throw new Error(`Erro ao baixar bandeira ${code}: ${res.status}`)
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
    downloaded++
  })
)

console.log(`Bandeiras: ${downloaded} baixadas, ${skipped} já existiam`)
