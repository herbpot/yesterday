import { useEffect, useState } from 'react'
import { fetchCompare, fetchExtremes } from '../services/api'
import { WiDaySunny, WiThermometer, WiDirectionUp, WiDirectionDown } from "react-icons/wi";
import "./HeroCard.css";

type Props = { lat: number; lon: number }
type Compare = { now: number; delta: number }
type Extremes = {
  today_max: number; today_min: number;
  yest_max: number; yest_min: number;
  delta_max: number; delta_min: number;
}

export default function HeroCard({ lat, lon }: Props) {
  const [cmp, setCmp] = useState<Compare | null>(null)
  const [ext, setExt] = useState<Extremes | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchCompare(lat, lon), fetchExtremes(lat, lon)])
      .then(([c, e]) => {
        setCmp(c)
        setExt(e)
      })
      .catch(e => setErr(e.message))
  }, [lat, lon])

  if (err) return <div className="text-red-500">{err}</div>
  if (!cmp || !ext) return <div>Loading…</div>

  const color = cmp.delta > 0.5 ? 'text-red-600'
              : cmp.delta < -0.5 ? 'text-blue-600'
              : 'text-gray-700'

  return (
    <div className="hero-card-vertical">
      {/* 상단: 오늘 vs 어제 */}
      <div className="hero-compare-card">
        <div className="hero-temp">
          <WiDaySunny size={40} />
          <span className="hero-temp-value">{cmp.now.toFixed(1)}°C</span>
        </div>
        <div className={`hero-delta ${color}`}>
          <WiThermometer size={20} />
          {cmp.delta > 0 ? `+${cmp.delta}` : cmp.delta}° vs 어제
        </div>
      </div>
      {/* 하단: 오늘/어제 정보 */}
      <div className="hero-bottom-row">
        <div className="hero-detail-card">
          <div className="hero-detail-title">오늘</div>
          <div className="hero-extremes-detail">
            <div><WiDirectionUp /> 최고 {ext.today_max}°</div>
            <div><WiDirectionDown /> 최저 {ext.today_min}°</div>
          </div>
        </div>
        <div className="hero-detail-card">
          <div className="hero-detail-title">어제</div>
          <div className="hero-extremes-detail">
            <div><WiDirectionUp /> 최고 {ext.yest_max}°</div>
            <div><WiDirectionDown /> 최저 {ext.yest_min}°</div>
          </div>
        </div>
      </div>
    </div>
  )
} 