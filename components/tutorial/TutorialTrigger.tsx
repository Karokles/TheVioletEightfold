import React from 'react';
import { TutorialId } from '../../services/tutorialProgressService';

interface TutorialTriggerProps {
  tutorialId: TutorialId;
  onStart: (tutorialId: TutorialId) => void;
  label?: string;
}

export const TutorialTrigger: React.FC<TutorialTriggerProps> = ({ tutorialId, onStart, label = '?' }) => {
  return (
    <button
      type="button"
      onClick={() => onStart(tutorialId)}
      className="group relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-emerald-300/10 bg-[#06120a]/55 text-emerald-300/65 shadow-[0_0_18px_rgba(74,222,128,0.045)] backdrop-blur-md transition-all hover:border-emerald-300/28 hover:bg-emerald-950/30 hover:text-emerald-200"
      aria-label="Start tutorial"
      title="Start tutorial"
    >
      {label === '?' ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(74,222,128,0.14),transparent_42%)] opacity-75 transition-opacity group-hover:opacity-100" />
          <div className="absolute inset-[7px] rounded-full border border-emerald-300/[0.055]" />
          <span className="relative h-full w-full font-serif font-black leading-none">
            <span className="absolute left-[7px] top-[7px] rotate-[-22deg] text-[15px] text-emerald-300/70 drop-shadow-[0_0_7px_rgba(74,222,128,0.34)] transition-transform group-hover:rotate-[-16deg]">?</span>
            <span className="absolute left-[14px] top-[4px] rotate-[13deg] text-[19px] text-lime-300/78 drop-shadow-[0_0_8px_rgba(163,230,53,0.34)] transition-transform group-hover:rotate-[8deg]">?</span>
            <span className="absolute left-[19px] top-[17px] rotate-[34deg] text-[13px] text-emerald-200/58 drop-shadow-[0_0_6px_rgba(110,231,183,0.26)] transition-transform group-hover:rotate-[28deg]">?</span>
          </span>
        </>
      ) : label}
    </button>
  );
};
