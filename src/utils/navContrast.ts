function parseRgb(value: string): [number, number, number, number] | null {
  const channels = value.match(/[\d.]+/g)?.map(Number)
  if (!channels || channels.length < 3) return null
  return [channels[0], channels[1], channels[2], channels[3] ?? 1]
}

function luminance([red, green, blue]: [number, number, number, number]): number {
  const linear = [red, green, blue].map(channel => {
    const value = channel / 255
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4
  })
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722
}

export function backgroundLuminanceAt(x: number, y: number): number {
  for (const element of document.elementsFromPoint(x, y)) {
    if (element.closest('.mobile-bottom-nav, .mobile-progressive-blur, .topbar')) continue
    const style = getComputedStyle(element)
    const background = parseRgb(style.backgroundColor)
    if (background && background[3] >= .7) return luminance(background)

    if (style.backgroundImage !== 'none') {
      for (const match of style.backgroundImage.matchAll(/rgba?\([^)]+\)/g)) {
        const stop = parseRgb(match[0])
        if (stop && stop[3] >= .7) return luminance(stop)
      }
    }
  }
  return 1
}

export function averageBackgroundLuminance(bounds: DOMRect, y: number): number {
  const samplePoints = [.12, .31, .5, .69, .88]
  return samplePoints.reduce((total, position) => total + backgroundLuminanceAt(bounds.left + bounds.width * position, y), 0) / samplePoints.length
}
