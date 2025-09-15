import { useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
}

export default function MethodologyModal({ open, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.55)', zIndex: 1000 }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 860,
          margin: '60px auto',
          background: '#0d1117',
          color: '#e6edf3',
          borderRadius: 8,
          border: '1px solid #30363d',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          padding: 20,
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Методология и проверка точности</h2>
          <button onClick={onClose} style={{ background: 'transparent', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 6, padding: '4px 8px' }}>Закрыть</button>
        </div>
        <p>
          Эта демонстрация использует точную геодезию на <strong>WGS84</strong> эллипсоиде для конвертации координат между географическими (широта/долгота/высота) и ECEF.
          Для измерения расстояний по поверхности применяем инверсную задачу <strong>Винценти</strong> (Vincenty), обеспечивающую метрическую точность.
        </p>
        <ul>
          <li>LLA → ECEF: аналитическое решение с радиусом кривизны <em>N</em>.</li>
          <li>ECEF → LLA: итеративная схема с быстрым сходом (обычно ≤ 5 итераций).</li>
          <li>Дистанции: формулы Vincenty на эллипсоиде (устойчивая обработка полюсов/антиподов).</li>
        </ul>
        <h3>Физическая модель входа</h3>
        <ul>
          <li>Гравитация: центральное поле Земли (μ = G·M_earth).</li>
          <li>Атмосфера: экспоненциальная плотность (ρ₀, H) с оценкой теплового потока.</li>
          <li>Лобовое сопротивление и динамическое давление q = ½ ρ V², фрагментация при превышении прочности материала.</li>
          <li>Энергия удара и оценка кратера по упрощённой эмпирике, сейсмика и ударная волна — через приближённые модели затухания.</li>
        </ul>
        <h3>Точность и верификация</h3>
        <ul>
          <li>Тесты на обратимость: LLA → ECEF → LLA с ошибкой менее 5 м по поверхности.</li>
          <li>Контрольные расстояния: Лондон–Париж ≈ 343 км (Vincenty).</li>
          <li>Граничные случаи: устойчивость вблизи полюсов и антиподов.</li>
        </ul>
        <p>
          Режимы «Точное попадание» и «Принудительная точность» уменьшают дрейф из-за аэродинамики: первый — предварительной компенсацией траектории,
          второй — фиксацией точки удара для демонстрационных целей.
        </p>
        <p style={{ opacity: 0.8 }}>
          Замечание: некоторые оценочные зависимости (кратер/сейсмика/ударная волна) упрощены и предназначены для сравнительной аналитики, а не для инженерного проектирования.
        </p>
      </div>
    </div>
  )
}
