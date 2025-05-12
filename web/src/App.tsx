import { useEffect, useState } from 'react'
import HeroCard from './components/HeroCard'

export default function App() {
  const [loc, setLoc] = useState<{lat:number, lon:number}|null>(null)
  const [err, setErr] = useState<string|null>(null)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => setLoc({lat: pos.coords.latitude, lon: pos.coords.longitude}),
      ()  => fetch('https://ipapi.co/json')
              .then(r=>r.json())
              .then(j=>setLoc({lat:j.latitude, lon:j.longitude}))
              .catch(()=>setErr('위치 확인 실패'))
    )
  }, [])

  if (err) return <p>{err}</p>
  if (!loc) return <p>위치 정보를 확인 중…</p>
  return <HeroCard {...loc}/>
}
