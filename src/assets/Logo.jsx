// SellPoint Logo — SVG components, no image files needed

export function LogoHorizontal({ showText = true }) {
  return (
    <svg width={showText ? '160' : '32'} height="32" viewBox={showText ? '0 0 160 32' : '0 0 32 32'} xmlns="http://www.w3.org/2000/svg">
      <path d="M2 10 Q2 7 5 7 L5 6 Q5 4 7 4 L20 4 Q22 4 22 6 L22 7 Q25 7 25 10 L26 27 Q26 29 24 29 L6 29 Q4 29 4 27 Z"
        fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M5 7 Q5 4 L7 4 L20 4 Q22 4 22 7"
        fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M9 17 L13 22 L21 13"
        fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {showText && (
        <text x="32" y="22" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="18" fill="#ffffff">
          Sell<tspan fill="#F97316">Point</tspan>
        </text>
      )}
    </svg>
  )
}

export function LogoStacked() {
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 12 Q30 8 34 8 L34 6 Q34 2 38 2 L82 2 Q86 2 86 6 L86 8 Q90 8 90 12 L92 52 Q92 56 88 56 L32 56 Q28 56 28 52 Z"
        fill="none" stroke="#F97316" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M34 8 Q34 2 38 2 L82 2 Q86 2 86 8"
        fill="none" stroke="#F97316" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M44 30 L54 42 L76 20"
        fill="none" stroke="#F97316" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="60" y="80" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="22" fill="#0A1628" textAnchor="middle">
        Sell<tspan fill="#F97316">Point</tspan>
      </text>
    </svg>
  )
}

export function LogoIcon({ size = 32, color = '#F97316' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 10 Q4 7 7 7 L7 5 Q7 3 9 3 L23 3 Q25 3 25 5 L25 7 Q28 7 28 10 L29 27 Q29 29 27 29 L5 29 Q3 29 3 27 Z"
        fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M7 7 Q7 3 9 3 L23 3 Q25 3 25 7"
        fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10 17 L14 22 L22 13"
        fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}