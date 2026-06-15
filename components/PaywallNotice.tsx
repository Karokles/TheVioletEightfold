import React, { useState } from 'react';
import { ExternalLink, LockKeyhole, RefreshCw, X } from 'lucide-react';
import { redirectToBetaCheckout } from '../services/accessService';
import { Language } from '../types';

interface PaywallNoticeProps {
  language: Language;
  message?: string;
  onClose?: () => void;
}

export const PaywallNotice: React.FC<PaywallNoticeProps> = ({ language, message, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isGerman = language === 'DE';

  const startCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const checkout = await redirectToBetaCheckout();
      if (checkout.active) {
        setError(isGerman ? 'Beta-Zugang ist bereits aktiv.' : 'Beta access is already active.');
      } else if (!checkout.url) {
        setError(checkout.message || (isGerman ? 'Checkout ist noch nicht verfuegbar.' : 'Checkout is not available yet.'));
      }
    } catch (checkoutError: any) {
      setError(checkoutError?.message || (isGerman ? 'Checkout konnte nicht gestartet werden.' : 'Could not start checkout.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200/20 bg-amber-300/10 p-4 text-amber-50 shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg border border-amber-100/20 bg-amber-200/10 p-2 text-amber-100">
          <LockKeyhole size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100/80">
            {isGerman ? 'Beta-Zugang' : 'Beta Access'}
          </div>
          <p className="mt-1 text-sm leading-6 text-amber-50/85">
            {message || (isGerman ? 'Diese Aktion braucht Beta-Zugang.' : 'This action requires beta access.')}
          </p>
          {error && (
            <p className="mt-2 text-xs leading-5 text-red-100/85">{error}</p>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-amber-100/55 transition-colors hover:bg-amber-100/10 hover:text-amber-50"
            title={isGerman ? 'Schliessen' : 'Close'}
          >
            <X size={15} />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-100/20 bg-amber-300/15 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-amber-50 transition-all hover:bg-amber-300/25 disabled:opacity-55"
      >
        {loading ? <RefreshCw size={15} className="animate-spin" /> : <ExternalLink size={15} />}
        {isGerman ? 'Beta freischalten' : 'Unlock beta'}
      </button>
    </div>
  );
};
