import React from 'react';
import { DoorOpen, Sparkles, Waves } from 'lucide-react';
import { DiscoveryNotice } from '../services/playfulDiscoveryService';

interface DiscoveryCardProps {
  notice: DiscoveryNotice;
  onDismiss?: () => void;
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({ notice, onDismiss }) => {
  const Icon = notice.kind === 'hidden_room'
    ? DoorOpen
    : notice.kind === 'return_path'
      ? Waves
      : Sparkles;

  return (
    <div className="mx-auto my-5 max-w-xl animate-fade-in-up">
      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#0b0611]/70 px-5 py-4 text-left shadow-[0_14px_50px_rgba(0,0,0,0.28)] backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/35 to-transparent" />
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full border border-violet-300/20 bg-violet-300/10 p-2 text-violet-100">
            <Icon size={15} strokeWidth={1.6} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-200/70">
              {notice.title}
            </div>
            <p className="mt-2 text-sm leading-6 text-violet-50/78">
              {notice.body}
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white/35 transition-colors hover:bg-white/5 hover:text-white/70"
              title="Dismiss"
            >
              ok
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
