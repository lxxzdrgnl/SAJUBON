/** @type {import('tailwindcss').Config} */
// 디자인 토큰 원천: packages/design (docs/design.md). 웹 globals.css와 동일한 색 이름을 써서
// className 패리티를 유지한다 (bg-bg-base, border-ink, text-text-sub, bg-yellow ...).
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'bg-base': '#FFFBF2',
        ink: '#1A1A1A',
        yellow: '#FFD900',
        'yellow-tint': '#FFF3B0',
        amber: '#FFB200',
        orange: '#FF6B00',
        'orange-tint': '#FFE1CC',
        teal: '#00C2B8',
        'teal-deep': '#00857D',
        'teal-tint': '#D7F7F4',
        surface: '#FFFFFF',
        'border-soft': '#EBE3D2',
        'text-sub': '#8A8270',
        sky: '#4DA8E8',
        'sky-tint': '#DCEFFB',
      },
      borderRadius: {
        chip: '10px',
        xl: '11px',
        '2xl': '16px',
        sheet: '22px',
      },
      fontFamily: {
        serif: ['NotoSerifKR-Black', 'serif'],
      },
    },
  },
  plugins: [],
}
