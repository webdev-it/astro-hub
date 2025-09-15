import { useId, useState, useRef, useEffect } from 'react'

type Props = {
  content: string | React.ReactNode
  children: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delayMs?: number
}

export default function Tooltip({ content, children, placement = 'top', delayMs = 250 }: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const timer = useRef<number | null>(null)
  const wrapperRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  const show = () => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setReady(true)
      setOpen(true)
    }, delayMs)
  }
  const hide = () => {
    if (timer.current) window.clearTimeout(timer.current)
    setOpen(false)
    // keep ready true; it helps with animation
  }

  const posStyle: React.CSSProperties = (() => {
    const base: React.CSSProperties = { position: 'absolute', zIndex: 50 }
    switch (placement) {
      case 'bottom':
        return { ...base, top: '100%', left: '50%', transform: 'translate(-50%, 8px)' }
      case 'left':
        return { ...base, right: '100%', top: '50%', transform: 'translate(-8px, -50%)' }
      case 'right':
        return { ...base, left: '100%', top: '50%', transform: 'translate(8px, -50%)' }
      case 'top':
      default:
        return { ...base, bottom: '100%', left: '50%', transform: 'translate(-50%, -8px)' }
    }
  })()

  return (
    <span
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span aria-describedby={id}>
        {children}
      </span>
      {ready && (
        <span
          id={id}
          role="tooltip"
          style={{
            ...posStyle,
            pointerEvents: 'none',
            background: 'rgba(20,24,31,0.95)',
            color: '#e6edf3',
            border: '1px solid #30363d',
            borderRadius: 6,
            padding: '8px 10px',
            minWidth: 180,
            maxWidth: 360,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            opacity: open ? 1 : 0,
            transition: 'opacity 120ms ease, transform 120ms ease',
          }}
        >
          <div style={{ fontSize: 12, lineHeight: 1.4 }}>{content}</div>
        </span>
      )}
    </span>
  )
}
