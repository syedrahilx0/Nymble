export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2DE2A6" /><stop offset="1" stopColor="#22D3EE" /></linearGradient>
      </defs>
      <path d="M16 3.5l9.5 3.7v7.6c0 5.9-4 10.5-9.500 12.900C10.500 25.300 6.500 20.700 6.500 14.800V7.200z" fill="rgba(45,226,166,.08)" stroke="url(#lg)" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 20.500v-9l8 9v-9" fill="none" stroke="url(#lg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
