const base = import.meta.env.VITE_API_BASE

export async function fetchCompare(lat: number, lon: number) {
  const r = await fetch(`${base}/compare?lat=${lat}&lon=${lon}`)
  if (!r.ok) throw new Error('compare failed')
  return r.json()
}

export async function fetchExtremes(lat: number, lon: number) {
  const r = await fetch(`${base}/extremes?lat=${lat}&lon=${lon}`)
  if (!r.ok) throw new Error('extremes failed')
  console.log(r)
  return r.json()
} 