export type NEO = {
	id: string
	name: string
	estimated_diameter_m: number // meters (average of min/max)
	is_potentially_hazardous_asteroid?: boolean
	absolute_magnitude_h?: number
	nasa_jpl_url?: string
}

const API_BASE = 'https://api.nasa.gov'
const API_KEY = import.meta.env.VITE_NASA_API_KEY as string

function assertApiKey() {
	if (!API_KEY) {
		console.warn('Missing VITE_NASA_API_KEY, falling back to DEMO_KEY limits')
	}
}

// Fetch a page of Near Earth Objects from the NeoWs API
export async function fetchNEOs(page = 0): Promise<NEO[]> {
	assertApiKey()
	const url = new URL(`${API_BASE}/neo/rest/v1/neo/browse`)
	url.searchParams.set('page', String(page))
	url.searchParams.set('size', '20')
	url.searchParams.set('api_key', API_KEY || 'DEMO_KEY')
	const res = await fetch(url)
	if (!res.ok) throw new Error(`NASA NEO browse failed: ${res.status}`)
	const data = await res.json()
	const items = (data?.near_earth_objects || []) as any[]
	return items.map((item) => {
		const est = item.estimated_diameter?.meters
		const avgM = est ? (est.estimated_diameter_min + est.estimated_diameter_max) / 2 : undefined
		return {
			id: item.id,
			name: item.name,
			estimated_diameter_m: avgM ?? 1000,
			is_potentially_hazardous_asteroid: !!item.is_potentially_hazardous_asteroid,
			absolute_magnitude_h: item.absolute_magnitude_h,
			nasa_jpl_url: item.nasa_jpl_url,
		} satisfies NEO
	})
}

export async function fetchNEOById(id: string): Promise<NEO | null> {
	assertApiKey()
	const url = new URL(`${API_BASE}/neo/rest/v1/neo/${encodeURIComponent(id)}`)
	url.searchParams.set('api_key', API_KEY || 'DEMO_KEY')
	const res = await fetch(url)
	if (!res.ok) return null
	const item = await res.json()
	const est = item.estimated_diameter?.meters
	const avgM = est ? (est.estimated_diameter_min + est.estimated_diameter_max) / 2 : undefined
	return {
		id: item.id,
		name: item.name,
		estimated_diameter_m: avgM ?? 1000,
		is_potentially_hazardous_asteroid: !!item.is_potentially_hazardous_asteroid,
		absolute_magnitude_h: item.absolute_magnitude_h,
		nasa_jpl_url: item.nasa_jpl_url,
	}
}
