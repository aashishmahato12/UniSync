import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './GlassSurface.css'

type GlassSurfaceProps = {
  children: ReactNode
  className?: string
  borderRadius?: number
  backgroundOpacity?: number
  saturation?: number
  distortionScale?: number
  style?: CSSProperties
}

export default function GlassSurface({
  children,
  className = '',
  borderRadius = 22,
  backgroundOpacity = 0.48,
  saturation = 1.35,
  distortionScale = -80,
  style,
}: GlassSurfaceProps) {
  const id = useId().replace(/:/g, '-')
  const filterId = `glass-filter-${id}`
  const container = useRef<HTMLDivElement>(null)
  const mapImage = useRef<SVGFEImageElement>(null)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    const sample = document.createElement('div')
    sample.style.backdropFilter = `url(#${filterId})`
    const isSafari = /Safari\//.test(navigator.userAgent) && !/Chrome|Chromium|Edg\//.test(navigator.userAgent)
    setSupported(sample.style.backdropFilter !== '' && !/Firefox/.test(navigator.userAgent) && !isSafari)
  }, [filterId])

  useEffect(() => {
    const element = container.current
    if (!element) return
    const update = () => {
      const { width, height } = element.getBoundingClientRect()
      if (!width || !height) return
      const edge = Math.min(width, height) * 0.035
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="r"><stop stop-color="red"/><stop offset="1" stop-color="transparent"/></linearGradient><linearGradient id="b" x2="0" y2="1"><stop stop-color="blue"/><stop offset="1" stop-color="transparent"/></linearGradient></defs><rect width="${width}" height="${height}" fill="black"/><rect width="${width}" height="${height}" rx="${borderRadius}" fill="url(#r)"/><rect width="${width}" height="${height}" rx="${borderRadius}" fill="url(#b)" style="mix-blend-mode:screen"/><rect x="${edge}" y="${edge}" width="${Math.max(0, width - edge * 2)}" height="${Math.max(0, height - edge * 2)}" rx="${borderRadius}" fill="white" style="filter:blur(11px)"/></svg>`
      mapImage.current?.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(svg)}`)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [borderRadius])

  return <div
    ref={container}
    className={`glass-surface ${supported ? 'glass-surface--svg' : 'glass-surface--fallback'} ${className}`}
    style={{ ...style, borderRadius, '--glass-frost': backgroundOpacity, '--glass-saturation': saturation, '--glass-filter': `url(#${filterId})` } as CSSProperties}
  >
    <svg className="glass-surface__filter" aria-hidden="true"><defs>
      <filter id={filterId} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
        <feImage ref={mapImage} width="100%" height="100%" preserveAspectRatio="none" result="map" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale={distortionScale} xChannelSelector="R" yChannelSelector="G" result="red" />
        <feColorMatrix in="red" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale={distortionScale + 10} xChannelSelector="R" yChannelSelector="G" result="green" />
        <feColorMatrix in="green" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale={distortionScale + 20} xChannelSelector="R" yChannelSelector="G" result="blue" />
        <feColorMatrix in="blue" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
        <feBlend in="r" in2="g" mode="screen" result="rg" />
        <feBlend in="rg" in2="b" mode="screen" />
      </filter>
    </defs></svg>
    <div className="glass-surface__content">{children}</div>
  </div>
}
