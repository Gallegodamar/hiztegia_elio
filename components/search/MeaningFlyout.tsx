import React, { useEffect } from 'react';
import { MeaningFlyout as MeaningFlyoutType } from '../../hooks/useSearch';

type MeaningFlyoutProps = {
  flyout: MeaningFlyoutType;
  flyoutRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
};

export const MeaningFlyout: React.FC<MeaningFlyoutProps> = ({ flyout, flyoutRef, onClose }) => {
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (flyoutRef.current?.contains(target)) return;
      onClose();
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [flyoutRef, onClose]);

  return (
    <section
      ref={flyoutRef}
      className="dictionary-flyout"
      style={{ left: `${flyout.left}px`, top: `${flyout.top}px`, width: `${flyout.width}px` }}
    >
      <div className="dictionary-flyout__header">
        <strong className="font-display flyout-term">{flyout.term}</strong>
        <button
          type="button"
          className="dictionary-flyout__close"
          onClick={onClose}
          aria-label="Itxi"
        >
          x
        </button>
      </div>

      <div className="dictionary-flyout__body">
        {flyout.loading
          ? 'Esanahia bilatzen...'
          : flyout.meaning ?? 'Ez da tokiko hiztegian esanahirik aurkitu.'}
      </div>

      {!flyout.loading && !flyout.meaning ? (
        <a
          href={flyout.fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="dictionary-flyout__link"
        >
          Ireki Elhuyar-en
        </a>
      ) : null}
    </section>
  );
};
