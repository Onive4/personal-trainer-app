/**
 * Academias perto do usuário pelo OpenStreetMap (API Overpass): gratuita, sem
 * chave. A localização só sai do aparelho quando a pessoa toca no botão, vai
 * só para o Overpass e não é guardada em lugar nenhum.
 */
/** Servidor principal e espelhos públicos gratuitos, tentados em ordem quando um está lotado. */
const SERVIDORES = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

export interface AcademiaProxima {
  id: string
  nome: string
  endereco: string | null
  distancia_m: number
}

export type ErroBusca = 'sem_permissao' | 'sem_gps' | 'sem_rede' | 'falhou'

function distancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6_371_000
  const rad = (g: number) => (g * Math.PI) / 180
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

export function minhaPosicao(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject('sem_gps' satisfies ErroBusca)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      (e) => reject((e.code === e.PERMISSION_DENIED ? 'sem_permissao' : 'sem_gps') satisfies ErroBusca),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
    )
  })
}

interface ElementoOsm {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export async function buscarAcademiasProximas(lat: number, lon: number, raio = 3000): Promise<AcademiaProxima[]> {
  if (!navigator.onLine) throw 'sem_rede' satisfies ErroBusca
  const consulta = `[out:json][timeout:15];nwr["leisure"="fitness_centre"](around:${raio},${lat},${lon});out center tags 80;`
  const overpass = async (servidor: string, segundos: number) => {
    const r = await fetch(servidor, {
      method: 'POST',
      body: new URLSearchParams({ data: consulta }),
      signal: AbortSignal.timeout(segundos * 1000),
    })
    if (!r.ok) throw new Error(String(r.status)) // lotado (429/502/504)
    return paraLista((await r.json()) as { elements: ElementoOsm[] }, lat, lon)
  }
  // Tudo começa ao mesmo tempo. O servidor principal (lista mais completa) tem 3 s de
  // preferência; depois disso vale a primeira resposta boa, de qualquer fonte.
  const principal = overpass(SERVIDORES[0]!, 8)
  const qualquerOverpass = Promise.any([principal, ...SERVIDORES.slice(1).map((sv) => overpass(sv, 8))])
  const porNome = buscarPorNome(lat, lon, raio)
  // A busca por nome só ganha a corrida se achou pelo menos 3; senão espera o Overpass.
  const porNomeBom = porNome.then((l) => {
    if (l.length < 3) throw new Error('poucas')
    return l
  })
  for (const p of [principal, qualquerOverpass, porNome, porNomeBom]) p.catch(() => {}) // sem aviso de rejeição solta

  const rapido = await Promise.race([principal.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 3000))])
  if (rapido) return rapido
  try {
    return await Promise.any([qualquerOverpass, porNomeBom])
  } catch {
    // Nenhum Overpass respondeu: fica a busca por nome, mesmo curta.
    try {
      return await porNome
    } catch {
      throw (navigator.onLine ? 'falhou' : 'sem_rede') satisfies ErroBusca
    }
  }
}

function paraLista(json: { elements: ElementoOsm[] }, lat: number, lon: number): AcademiaProxima[] {
  const vistas = new Set<string>()
  return json.elements
    .flatMap((el): AcademiaProxima[] => {
      const nome = el.tags?.name?.trim()
      const p = el.center ?? (el.lat !== undefined && el.lon !== undefined ? { lat: el.lat, lon: el.lon } : null)
      if (!nome || !p) return []
      const rua = el.tags?.['addr:street']
      const numero = el.tags?.['addr:housenumber']
      return [
        {
          id: `${el.type}/${el.id}`,
          nome,
          endereco: rua ? `${rua}${numero ? `, ${numero}` : ''}` : null,
          distancia_m: Math.round(distancia(lat, lon, p.lat, p.lon)),
        },
      ]
    })
    .sort((a, b) => a.distancia_m - b.distancia_m)
    .filter((a) => {
      const chave = `${a.nome.toLowerCase()}|${Math.round(a.distancia_m / 50)}`
      if (vistas.has(chave)) return false
      vistas.add(chave)
      return true
    })
    .slice(0, 25)
}

async function buscarPorNome(lat: number, lon: number, raio: number): Promise<AcademiaProxima[]> {
  const dLat = raio / 111_320
  const dLon = raio / (111_320 * Math.cos((lat * Math.PI) / 180))
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.search = new URLSearchParams({
    format: 'jsonv2',
    q: 'academia',
    viewbox: [lon - dLon, lat + dLat, lon + dLon, lat - dLat].map((n) => n.toFixed(5)).join(','),
    bounded: '1',
    limit: '40',
    'accept-language': 'pt-BR',
  }).toString()
  const r = await fetch(url, { signal: AbortSignal.timeout(8_000) })
  if (!r.ok) throw new Error(String(r.status))
  const lista = (await r.json()) as { place_id: number; name: string; category: string; type: string; lat: string; lon: string }[]
  return lista
    .filter((x) => x.name && x.category === 'leisure' && ['fitness_centre', 'sports_centre'].includes(x.type))
    .map((x) => ({
      id: `nominatim/${x.place_id}`,
      nome: x.name,
      endereco: null,
      distancia_m: Math.round(distancia(lat, lon, Number(x.lat), Number(x.lon))),
    }))
    .sort((a, b) => a.distancia_m - b.distancia_m)
    .slice(0, 25)
}

export function textoDistancia(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`
}
