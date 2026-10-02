import React from 'react';

export default function Logo({ size = 26 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 0 8px rgba(215, 255, 78, 0.45))' }}
    >
      <circle cx="20" cy="20" r="18.5" stroke="#D7FF4E" strokeWidth="2.2" />
      <path
        d="M15 11.5H21.2C24.5 11.5 27 13.9 27 17C27 20.1 24.5 22.4 21.2 22.4H16.6V28.5H15V11.5Z"
        stroke="#D7FF4E"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
