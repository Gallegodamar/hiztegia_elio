import React from 'react';

export const OpenBookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
    <path d="M12 6.6c-1.1-.7-2.4-1.1-3.8-1.1H5.8c-.9 0-1.6.7-1.6 1.6v9.8c0 .9.7 1.6 1.6 1.6h2.3c1.4 0 2.7.4 3.9 1.1 1.2-.7 2.5-1.1 3.9-1.1h2.3c.9 0 1.6-.7 1.6-1.6V7.1c0-.9-.7-1.6-1.6-1.6H16c-1.4 0-2.7.4-4 1.1Z" />
    <path d="M12 6.6V18.7" />
  </svg>
);

export const HeartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
    <path d="M12 20.7s-7.2-4.5-8.5-8.6c-.8-2.6.5-5.4 3.1-6.2 2.1-.7 4.4.2 5.4 2.1 1-1.9 3.3-2.8 5.4-2.1 2.6.8 3.9 3.6 3.1 6.2-1.3 4.1-8.5 8.6-8.5 8.6Z" />
  </svg>
);

export const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
    <path d="M12 5.8v12.4" />
    <path d="M5.8 12h12.4" />
  </svg>
);

export const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4.4-4.4" />
  </svg>
);

export const MoreHorizontalIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
    <circle cx="6" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="18" cy="12" r="1.6" />
  </svg>
);
