import React from 'react';

interface PayPalLogoProps {
  className?: string;
  size?: number;
}

export const PayPalLogo: React.FC<PayPalLogoProps> = ({ className = 'w-6 h-7' }) => {
  return (
    <svg
      viewBox="0 0 32 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PayPal"
    >
      {/* Back P (Dark Navy #003087) */}
      <path
        d="M24.8 7.2C23.9 3.8 20.9 1.5 16.5 1.5H7.2C6.5 1.5 5.9 2.1 5.8 2.8L1 29.5C0.9 30.1 1.4 30.7 2 30.7H8.5L10.2 20.1C10.3 19.4 10.9 18.8 11.6 18.8H14.8C21.3 18.8 26.2 16.2 27.8 8.9C28.2 6.8 27.6 5.3 24.8 7.2Z"
        fill="#003087"
      />
      {/* Front P (Bright Blue #0070E0) */}
      <path
        d="M27.8 8.9C28.5 5.5 25.5 3.2 21.1 3.2H11.8C11.1 3.2 10.5 3.8 10.4 4.5L5.6 31.2C5.5 31.8 6 32.4 6.6 32.4H13.1L14.8 21.8C14.9 21.1 15.5 20.5 16.2 20.5H19.4C25.9 20.5 30.8 17.9 32.4 10.6C32.8 8.5 32.2 7 27.8 8.9Z"
        fill="#0070E0"
      />
      {/* Overlap Blend (Deep Royal Blue #012169) */}
      <path
        d="M14.8 21.8L16.2 11.2C16.3 10.5 16.9 9.9 17.6 9.9H23.5C25.2 9.9 26.5 10.4 27.4 11.3C27.7 10.5 27.8 9.7 27.8 8.9C27.1 8.2 26 7.6 24.8 7.2C23.9 3.8 20.9 1.5 16.5 1.5H7.2C6.5 1.5 5.9 2.1 5.8 2.8L1 29.5C0.9 30.1 1.4 30.7 2 30.7H8.5L10.2 20.1C10.3 19.4 10.9 18.8 11.6 18.8H14.8V21.8Z"
        fill="#00457C"
        opacity="0.35"
      />
    </svg>
  );
};
