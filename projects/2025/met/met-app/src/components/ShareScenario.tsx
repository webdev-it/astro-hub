import { useCallback } from 'react'
import { useScenarioStore } from '../store/useScenarioStore'

type Props = {
  onShared?: (url: string) => void
  className?: string
}

// Compact payload for URL sharing
type SharePayload = {
  v: 1
  p: ReturnType<typeof useScenarioStore.getState>['params']
  o: {
    accurateTargeting?: boolean
    forceExactHit?: boolean
    simplifyEffects?: boolean
    useAdvancedEarth?: boolean
    showClouds?: boolean
    showAtmosphere?: boolean
  }
}

function buildShareURL(payload: SharePayload): string {
  const raw = JSON.stringify(payload)
  const base64 = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(raw))) : ''
  const url = new URL(window.location.href)
  url.searchParams.set('s', base64)
  return url.toString()
}

export function tryParseShareURL(search: string): SharePayload | null {
  try {
    const params = new URLSearchParams(search)
    const s = params.get('s')
    if (!s) return null
    const json = decodeURIComponent(escape(atob(s)))
    const parsed = JSON.parse(json)
    if (parsed && parsed.v === 1 && parsed.p) return parsed as SharePayload
    return null
  } catch {
    return null
  }
}

export default function ShareScenario({ onShared, className }: Props) {
  const {
    params,
    accurateTargeting,
    forceExactHit,
    simplifyEffects,
    useAdvancedEarth,
    showClouds,
    showAtmosphere,
    pushLog,
  } = useScenarioStore()

  const share = useCallback(async () => {
    const payload: SharePayload = {
      v: 1,
      p: params,
      o: { accurateTargeting, forceExactHit, simplifyEffects, useAdvancedEarth, showClouds, showAtmosphere },
    }
    const url = buildShareURL(payload)
    try {
      await navigator.clipboard?.writeText(url)
      pushLog({ time: 0, message: '🔗 Ссылка на сценарий скопирована в буфер обмена' })
      onShared?.(url)
    } catch (e) {
      // Fallback: open prompt for manual copy
      window.prompt('Скопируйте ссылку сценария:', url)
      pushLog({ time: 0, message: '🔗 Ссылка на сценарий готова (скопируйте вручную)' })
    }
  }, [params, accurateTargeting, forceExactHit, simplifyEffects, useAdvancedEarth, showClouds, showAtmosphere, onShared, pushLog])

  return (
    <button onClick={share} className={className} title="Скопировать ссылку с текущими параметрами">
      Поделиться сценарием
    </button>
  )
}
