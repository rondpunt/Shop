type Props = {
  size?: number;
  className?: string;
};

/**
 * Shop&Go logo — green parking-pin droplet with a clean white "P".
 * Pure SVG, scales crisp at any size.
 *
 * Colors are intentionally hard-coded so the logo always renders correctly
 * on any background (header, splash, favicons, share-cards).
 */
export const SGLogo = ({ size = 36, className = "" }: Props) => {
  const id = `sg-grad-${size}`;
  const shadow = `sg-shadow-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="24" y1="2" x2="24" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3FBFA8" />
          <stop offset="0.55" stopColor="#15A08C" />
          <stop offset="1" stopColor="#0E7A6B" />
        </linearGradient>
        <filter id={shadow} x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="#000" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Pin / drop body */}
      <path
        d="M24 2.5
           c8.836 0 15.5 6.55 15.5 15.2
           c0 6.7 -4.6 12.6 -10.4 19.5
           c-2.05 2.45 -3.55 4.4 -4.2 5.55
           a1.05 1.05 0 0 1 -1.8 0
           c-0.65 -1.15 -2.15 -3.1 -4.2 -5.55
           C13.1 30.3 8.5 24.4 8.5 17.7
           C8.5 9.05 15.164 2.5 24 2.5 Z"
        fill={`url(#${id})`}
        filter={`url(#${shadow})`}
      />

      {/* Inner soft highlight */}
      <path
        d="M24 5.2
           c7.18 0 12.85 5.35 12.85 12.5
           c0 1.3 -0.18 2.55 -0.5 3.75
           c-0.5 -6.7 -6.05 -11.95 -12.85 -11.95
           c-3.7 0 -7.05 1.55 -9.4 4.05
           C16.05 8.55 19.7 5.2 24 5.2Z"
        fill="#ffffff"
        opacity="0.18"
      />

      {/* P mark */}
      <text
        x="24"
        y="25.6"
        textAnchor="middle"
        fontFamily="Roboto, system-ui, sans-serif"
        fontWeight="900"
        fontSize="20"
        fill="#ffffff"
        letterSpacing="-0.02em"
      >
        P
      </text>
    </svg>
  );
};
