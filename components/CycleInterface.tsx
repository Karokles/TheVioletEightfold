import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CalendarDays, Check, ChevronDown, Circle, Compass, Flame, Hourglass, RotateCcw, Shield, Sparkles } from 'lucide-react';
import { CycleDayRecord, CyclePacingMode, IntegrationCycle, Language } from '../types';
import {
  CYCLE_LENGTH_DAYS,
  cycleMilestones,
  cycleOnboardingQuestions,
  getCycleDayGuide,
  getRecommendedPacing,
} from '../config/integrationCycle';
import { getCycleDayNumber, getCycleRecordCompletedToday } from '../services/cycleService';

interface CycleInterfaceProps {
  language: Language;
  cycle: IntegrationCycle | null;
  onStartCycle: (title: string, answers: IntegrationCycle['onboardingAnswers']) => void;
  onUpdateCycleStarter: (answers: IntegrationCycle['onboardingAnswers']) => void;
  onUpdateCycle: (record: Omit<CycleDayRecord, 'date'>) => void;
  onArchiveCycle: () => void;
}

const labels = {
  EN: {
    title: 'Integration Cycle',
    subtitle: '63 days · one pattern · one honest daily reach',
    startTitle: 'Begin a New Cycle',
    startCopy: 'Choose one pattern. The point is not to win against yourself, but to stop feeding the performance loop around it.',
    cycleName: 'Cycle name',
    start: 'Start Cycle',
    day: 'Day',
    phase: 'Phase',
    today: 'Today',
    completed: 'Completed',
    completeDay: 'Seal Today',
    refineDay: 'Refine',
    archive: 'Archive Cycle',
    activeReach: 'Active Reach',
    antiEgo: 'Anti-Ego Check',
    pacing: 'Pacing',
    calendar: 'Cycle Map',
    noCycle: 'No active cycle yet.',
    starterBlueprint: 'Initial Starter Inputs',
    starterEmpty: 'No starter inputs were saved for this cycle.',
    starterOpen: 'Open',
    starterClose: 'Close',
    starterSaving: 'Saving',
    starterSaved: 'Saved',
    sense: 'Sense',
    trace: 'Trace',
    externalize: 'Externalize',
    reframe: 'Reframe',
    embody: 'Embody',
    senseHint: 'What thought, emotion, body cue, or impulse is present?',
    traceHint: 'Where did it show up, and what did it connect to?',
    externalizeHint: 'Write the pattern outside your head in plain language.',
    reframeHint: 'What meaning is more honest without forcing positivity?',
    embodyHint: 'What is the smallest clean action today?',
    antiEgoHint: 'Where did image, defense, control, or needing to be right take over?',
    locked: 'Complete the current participation day first.',
    onePerDay: 'One cycle day can be sealed per calendar day.',
    alreadySealed: 'This cycle day is already sealed.',
  },
  DE: {
    title: 'Integrationszyklus',
    subtitle: '63 Tage · ein Muster · eine ehrliche tägliche Handlung',
    startTitle: 'Neuen Zyklus beginnen',
    startCopy: 'Wähle ein Muster. Es geht nicht darum, gegen dich zu gewinnen, sondern die Performance-Schleife darum nicht weiter zu füttern.',
    cycleName: 'Name des Zyklus',
    start: 'Zyklus starten',
    day: 'Tag',
    phase: 'Phase',
    today: 'Heute',
    completed: 'Abgeschlossen',
    completeDay: 'Heute versiegeln',
    refineDay: 'Verfeinern',
    archive: 'Zyklus archivieren',
    activeReach: 'Aktive Reichweite',
    antiEgo: 'Anti-Ego Check',
    pacing: 'Tempo',
    calendar: 'Zykluskarte',
    noCycle: 'Noch kein aktiver Zyklus.',
    starterBlueprint: 'Initiale Starter-Eingaben',
    starterEmpty: 'Fuer diesen Zyklus wurden keine Starter-Eingaben gespeichert.',
    starterOpen: 'Oeffnen',
    starterClose: 'Schliessen',
    starterSaving: 'Speichert',
    starterSaved: 'Gespeichert',
    sense: 'Spüren',
    trace: 'Zurückverfolgen',
    externalize: 'Externalisieren',
    reframe: 'Neu deuten',
    embody: 'Verkörpern',
    senseHint: 'Welcher Gedanke, welches Gefühl, Körpersignal oder welcher Impuls ist da?',
    traceHint: 'Wo ist es aufgetaucht, und womit verbindet es sich?',
    externalizeHint: 'Schreibe das Muster in einfacher Sprache aus deinem Kopf heraus.',
    reframeHint: 'Welche Bedeutung ist ehrlicher, ohne erzwungene Positivität?',
    embodyHint: 'Was ist heute die kleinste klare Handlung?',
    antiEgoHint: 'Wo haben Image, Verteidigung, Kontrolle oder Recht-haben-Wollen übernommen?',
    locked: 'Schließe zuerst den aktuellen Teilnahme-Tag ab.',
    onePerDay: 'Pro Kalendertag kann ein Zyklus-Tag versiegelt werden.',
    alreadySealed: 'Dieser Zyklus-Tag ist bereits versiegelt.',
  },
};

const pacingOptions: Array<{ value: CyclePacingMode; icon: typeof Shield }> = [
  { value: 'STABILIZATION', icon: Shield },
  { value: 'EXPLORATION', icon: Compass },
  { value: 'INTEGRATION', icon: Sparkles },
];

type CycleTextFieldId = 'sense' | 'trace' | 'externalize' | 'reframe' | 'embody' | 'antiEgoCheck';
type WritingProfile = 'SPARSE' | 'BALANCED' | 'EXPANSIVE';

const MIN_WORDS_PER_CYCLE_BLOCK = 3;

const countWords = (value: string): number => {
  return value.trim().split(/\s+/).filter(Boolean).length;
};

const hasEnoughWords = (value: string): boolean => countWords(value) >= MIN_WORDS_PER_CYCLE_BLOCK;

const getRecordDraftSignature = (record: Pick<CycleDayRecord, 'sense' | 'trace' | 'externalize' | 'reframe' | 'embody' | 'antiEgoCheck' | 'pacing'>): string => {
  return JSON.stringify({
    sense: (record.sense || '').trim(),
    trace: (record.trace || '').trim(),
    externalize: (record.externalize || '').trim(),
    reframe: (record.reframe || '').trim(),
    embody: (record.embody || '').trim(),
    antiEgoCheck: (record.antiEgoCheck || '').trim(),
    pacing: record.pacing,
  });
};

const seededIndex = (seed: string, length: number): number => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % length;
};

const getWritingProfile = (cycle: IntegrationCycle | null): WritingProfile => {
  const records = cycle?.dayRecords.filter(record => record.completedAt) || [];
  if (!records.length) return 'BALANCED';

  const totalWords = records.reduce((sum, record) => {
    return sum
      + countWords(record.sense)
      + countWords(record.trace)
      + countWords(record.externalize)
      + countWords(record.reframe)
      + countWords(record.embody)
      + countWords(record.antiEgoCheck);
  }, 0);
  const averagePerBlock = totalWords / (records.length * 6);

  if (averagePerBlock < 9) return 'SPARSE';
  if (averagePerBlock > 32) return 'EXPANSIVE';
  return 'BALANCED';
};

const cycleFieldPrompts: Record<CycleTextFieldId, Record<WritingProfile, Record<Language, string[]>>> = {
  sense: {
    SPARSE: {
      EN: ['One real sentence is enough: what is alive right now?', 'Catch the first honest signal before it dresses up.'],
      DE: ['Ein echter Satz reicht: Was ist gerade lebendig?', 'Fang das erste ehrliche Signal, bevor es sich verkleidet.'],
    },
    BALANCED: {
      EN: ['Name the signal as it appears today, not as a theory.', 'What is the body or mood already telling you?'],
      DE: ['Benenne das Signal, wie es heute auftaucht, nicht als Theorie.', 'Was sagt Körper oder Stimmung schon, bevor der Kopf sortiert?'],
    },
    EXPANSIVE: {
      EN: ['Cut through the fog: which sensation matters most?', 'Choose the cleanest signal, even if ten others are speaking.'],
      DE: ['Schneide durch den Nebel: Welche Empfindung zählt am meisten?', 'Wähle das klarste Signal, auch wenn zehn andere mitreden.'],
    },
  },
  trace: {
    SPARSE: {
      EN: ['Where did it appear first today?', 'Point to the scene where the pattern touched ground.'],
      DE: ['Wo ist es heute zuerst aufgetaucht?', 'Zeig auf die Szene, in der das Muster Boden berührt hat.'],
    },
    BALANCED: {
      EN: ['Follow the thread back to one moment, one trigger, one echo.', 'What did this connect to in ordinary life?'],
      DE: ['Verfolge den Faden zurück zu einem Moment, einem Auslöser, einem Echo.', 'Womit hat es sich im normalen Leben verbunden?'],
    },
    EXPANSIVE: {
      EN: ['Do not map the whole maze; mark the door you actually walked through.', 'Trace the strongest root, not every branch.'],
      DE: ['Kartiere nicht das ganze Labyrinth; markiere die Tür, durch die du wirklich gegangen bist.', 'Verfolge die stärkste Wurzel, nicht jeden Ast.'],
    },
  },
  externalize: {
    SPARSE: {
      EN: ['Put the pattern outside your head in plain words.', 'Write it like a small object on the table.'],
      DE: ['Leg das Muster in einfachen Worten aus deinem Kopf heraus.', 'Schreib es wie einen kleinen Gegenstand auf dem Tisch.'],
    },
    BALANCED: {
      EN: ['Describe the pattern without becoming its lawyer.', 'Let the pattern speak, then name what it costs.'],
      DE: ['Beschreibe das Muster, ohne sein Anwalt zu werden.', 'Lass das Muster sprechen, dann benenne seinen Preis.'],
    },
    EXPANSIVE: {
      EN: ['Make it simpler than your mind wants it to be.', 'Strip the mythology down to the move that repeats.'],
      DE: ['Mach es einfacher, als dein Kopf es gerne hätte.', 'Zieh die Mythologie bis zur Bewegung aus, die sich wiederholt.'],
    },
  },
  reframe: {
    SPARSE: {
      EN: ['What meaning is kinder because it is truer?', 'Find one honest sentence that does not force brightness.'],
      DE: ['Welche Bedeutung ist freundlicher, weil sie wahrer ist?', 'Finde einen ehrlichen Satz, der keine Helligkeit erzwingt.'],
    },
    BALANCED: {
      EN: ['What changes when the old story loses the throne?', 'Name the meaning that gives reality more room.'],
      DE: ['Was verändert sich, wenn die alte Geschichte den Thron verliert?', 'Benenne die Bedeutung, die der Wirklichkeit mehr Raum gibt.'],
    },
    EXPANSIVE: {
      EN: ['Do not solve the universe; loosen this one conclusion.', 'Which interpretation can retire tonight?'],
      DE: ['Löse nicht das Universum; lockere nur diese eine Schlussfolgerung.', 'Welche Deutung darf heute Abend in Rente gehen?'],
    },
  },
  embody: {
    SPARSE: {
      EN: ['What is the smallest clean move?', 'Choose one action small enough to actually live.'],
      DE: ['Was ist die kleinste klare Bewegung?', 'Wähle eine Handlung, klein genug, um wirklich gelebt zu werden.'],
    },
    BALANCED: {
      EN: ['Turn the insight into one ordinary gesture.', 'What would make this visible without making it dramatic?'],
      DE: ['Verwandle die Einsicht in eine gewöhnliche Geste.', 'Was macht das sichtbar, ohne es dramatisch zu machen?'],
    },
    EXPANSIVE: {
      EN: ['Compress the whole realization into one doable act.', 'Let the next move be physical, boring, and real.'],
      DE: ['Verdichte die ganze Erkenntnis in eine machbare Handlung.', 'Lass die nächste Bewegung körperlich, schlicht und real sein.'],
    },
  },
  antiEgoCheck: {
    SPARSE: {
      EN: ['Where did image ask for the steering wheel?', 'Name one defense without attacking yourself.'],
      DE: ['Wo wollte Image ans Steuer?', 'Benenne eine Verteidigung, ohne dich selbst anzugreifen.'],
    },
    BALANCED: {
      EN: ['Where did performance, control, or being right shrink the room?', 'What gets quieter when image is not fed?'],
      DE: ['Wo haben Performance, Kontrolle oder Recht-haben den Raum kleiner gemacht?', 'Was wird leiser, wenn Image nicht gefüttert wird?'],
    },
    EXPANSIVE: {
      EN: ['Find the ego move under the elegant explanation.', 'Which clever sentence was protecting an older fear?'],
      DE: ['Finde die Ego-Bewegung unter der eleganten Erklärung.', 'Welcher kluge Satz hat eine ältere Angst geschützt?'],
    },
  },
};

const toIsoDate = (date: Date): string => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const getRecordSealDate = (record?: CycleDayRecord): string | undefined => {
  if (record?.completedAt) return toIsoDate(new Date(record.completedAt));
  if (record?.date?.trim()) return record.date;
  return undefined;
};

const formatCompactSealDate = (isoDate?: string): string => {
  if (!isoDate || isoDate.length < 10) return '';
  return `${isoDate.slice(8, 10)}.${isoDate.slice(5, 7)}`;
};

const formatReadableSealDate = (isoDate?: string): string => {
  if (!isoDate || isoDate.length < 10) return '';
  return `${isoDate.slice(8, 10)}.${isoDate.slice(5, 7)}.${isoDate.slice(0, 4)}`;
};

export const CycleInterface: React.FC<CycleInterfaceProps> = ({
  language,
  cycle,
  onStartCycle,
  onUpdateCycleStarter,
  onUpdateCycle,
  onArchiveCycle,
}) => {
  const t = labels[language];
  const [cycleTitle, setCycleTitle] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [starterOpen, setStarterOpen] = useState(false);
  const [starterDraftAnswers, setStarterDraftAnswers] = useState<Record<string, string>>({});
  const [starterSaveState, setStarterSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const todayDay = cycle ? getCycleDayNumber(cycle) : 1;
  const [selectedDay, setSelectedDay] = useState(todayDay);

  useEffect(() => {
    setSelectedDay(todayDay);
  }, [todayDay, cycle?.id]);

  const selectedRecord = cycle?.dayRecords.find(record => record.day === selectedDay);
  const selectedSealDate = selectedRecord?.completedAt ? getRecordSealDate(selectedRecord) : undefined;
  const guide = getCycleDayGuide(selectedDay, language);
  const completedDays = useMemo(() => new Set(cycle?.dayRecords.filter(record => record.completedAt).map(record => record.day) || []), [cycle]);
  const recordCompletedToday = cycle ? getCycleRecordCompletedToday(cycle) : undefined;
  const isSelectedCompleted = completedDays.has(selectedDay);
  const isSelectedCurrentParticipationDay = selectedDay === todayDay;
  const canSealSelectedDay = Boolean(cycle && !recordCompletedToday && !isSelectedCompleted && isSelectedCurrentParticipationDay && cycle.status !== 'COMPLETED');
  const sealDisabledReason = isSelectedCompleted
    ? t.alreadySealed
    : recordCompletedToday
      ? t.onePerDay
      : !isSelectedCurrentParticipationDay
        ? t.locked
        : '';

  const [sense, setSense] = useState('');
  const [trace, setTrace] = useState('');
  const [externalize, setExternalize] = useState('');
  const [reframe, setReframe] = useState('');
  const [embody, setEmbody] = useState('');
  const [antiEgoCheck, setAntiEgoCheck] = useState('');
  const [pacing, setPacing] = useState<CyclePacingMode>(getRecommendedPacing(selectedDay));
  const [thinFields, setThinFields] = useState<Set<CycleTextFieldId>>(new Set());
  const [validationPulseKey, setValidationPulseKey] = useState(0);
  const writingProfile = useMemo(() => getWritingProfile(cycle), [cycle]);
  const lastDraftSignatureRef = useRef('');
  const lastStarterSignatureRef = useRef('');

  useEffect(() => {
    setSense(selectedRecord?.sense || '');
    setTrace(selectedRecord?.trace || '');
    setExternalize(selectedRecord?.externalize || '');
    setReframe(selectedRecord?.reframe || '');
    setEmbody(selectedRecord?.embody || '');
    setAntiEgoCheck(selectedRecord?.antiEgoCheck || '');
    setPacing(selectedRecord?.pacing || getRecommendedPacing(selectedDay));
    setThinFields(new Set());
  }, [selectedDay, selectedRecord]);

  useEffect(() => {
    const nextDraftAnswers = Object.fromEntries(
      (cycle?.onboardingAnswers || []).map(answer => [answer.questionId, answer.value])
    );
    const signature = JSON.stringify(nextDraftAnswers);
    setStarterDraftAnswers(nextDraftAnswers);
    setStarterSaveState('idle');
    lastStarterSignatureRef.current = signature;
  }, [cycle?.id]);

  const canStart = cycleOnboardingQuestions.every(question => answers[question.id]?.trim());

  const textFieldValues: Record<CycleTextFieldId, string> = {
    sense,
    trace,
    externalize,
    reframe,
    embody,
    antiEgoCheck,
  };
  const currentDraftSignature = getRecordDraftSignature({
    sense,
    trace,
    externalize,
    reframe,
    embody,
    antiEgoCheck,
    pacing,
  });
  const selectedRecordSignature = selectedRecord ? getRecordDraftSignature(selectedRecord) : '';
  const isSelectedDirty = Boolean(selectedRecord && currentDraftSignature !== selectedRecordSignature);
  const canRefineSelectedDay = Boolean(cycle && isSelectedCompleted && isSelectedDirty);
  const canSubmitSelectedDay = canSealSelectedDay || canRefineSelectedDay;
  const submitLabel = isSelectedCompleted
    ? (isSelectedDirty ? t.refineDay : t.completed)
    : t.completeDay;

  useEffect(() => {
    if (!cycle || isSelectedCompleted || !isSelectedCurrentParticipationDay) return;

    const trimmedValues = {
      sense: sense.trim(),
      trace: trace.trim(),
      externalize: externalize.trim(),
      reframe: reframe.trim(),
      embody: embody.trim(),
      antiEgoCheck: antiEgoCheck.trim(),
    };
    if (!Object.values(trimmedValues).some(Boolean)) return;

    const signature = JSON.stringify({ day: selectedDay, pacing, ...trimmedValues });
    if (signature === lastDraftSignatureRef.current) return;

    const timer = window.setTimeout(() => {
      lastDraftSignatureRef.current = signature;
      onUpdateCycle({
        day: selectedDay,
        ...trimmedValues,
        pacing,
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    antiEgoCheck,
    cycle,
    embody,
    externalize,
    isSelectedCompleted,
    isSelectedCurrentParticipationDay,
    onUpdateCycle,
    pacing,
    reframe,
    selectedDay,
    sense,
    trace,
  ]);

  useEffect(() => {
    if (!cycle || !cycle.onboardingAnswers.length) return;

    const signature = JSON.stringify(starterDraftAnswers);
    if (signature === lastStarterSignatureRef.current) return;

    setStarterSaveState('saving');

    const timer = window.setTimeout(() => {
      const nextAnswers = cycle.onboardingAnswers.map(answer => ({
        ...answer,
        value: starterDraftAnswers[answer.questionId] ?? '',
      }));

      lastStarterSignatureRef.current = signature;
      onUpdateCycleStarter(nextAnswers);
      setStarterSaveState('saved');
    }, 700);

    return () => window.clearTimeout(timer);
  }, [cycle, onUpdateCycleStarter, starterDraftAnswers]);

  const getPromptLine = (fieldId: CycleTextFieldId): string => {
    const variants = cycleFieldPrompts[fieldId][writingProfile][language];
    const seed = `${cycle?.id || 'cycle'}:${selectedDay}:${fieldId}:${guide.phase.id}:${pacing}:${cycle?.dayRecords.length || 0}`;
    return variants[seededIndex(seed, variants.length)];
  };

  const handleFieldChange = (fieldId: CycleTextFieldId, value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter(value);
    if (hasEnoughWords(value)) {
      setThinFields(prev => {
        if (!prev.has(fieldId)) return prev;
        const next = new Set(prev);
        next.delete(fieldId);
        return next;
      });
    }
  };

  const handleStart = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canStart) return;

    onStartCycle(
      cycleTitle,
      cycleOnboardingQuestions.map(question => ({
        questionId: question.id,
        label: question.label[language],
        value: answers[question.id].trim(),
      })),
    );
  };

  const handleCompleteDay = () => {
    if (!canSubmitSelectedDay) return;

    const invalidFields = (Object.entries(textFieldValues) as Array<[CycleTextFieldId, string]>)
      .filter(([, value]) => !hasEnoughWords(value))
      .map(([fieldId]) => fieldId);

    if (invalidFields.length) {
      setThinFields(new Set(invalidFields));
      setValidationPulseKey(prev => prev + 1);
      return;
    }

    onUpdateCycle({
      day: selectedDay,
      sense: sense.trim(),
      trace: trace.trim(),
      externalize: externalize.trim(),
      reframe: reframe.trim(),
      embody: embody.trim(),
      antiEgoCheck: antiEgoCheck.trim(),
      pacing,
      completedAt: selectedRecord?.completedAt || new Date().toISOString(),
    });
  };

  const days = Array.from({ length: CYCLE_LENGTH_DAYS }, (_, index) => index + 1);
  const fieldBaseClass = 'rounded-lg border p-4 transition-colors';
  const getFieldClass = (fieldId: CycleTextFieldId, tone: 'purple' | 'amber' = 'purple') => {
    const baseTone = tone === 'amber'
      ? 'border-amber-300/20 bg-amber-300/[0.04] focus-within:border-amber-200/35'
      : 'border-purple-500/15 bg-[#0d0615]/86 focus-within:border-purple-300/35';
    return `${fieldBaseClass} ${baseTone} ${thinFields.has(fieldId) ? 'cycle-field-needs-ink' : ''}`;
  };

  if (!cycle) {
    return (
      <div className="relative flex-1 overflow-y-auto bg-[#05020a] px-4 py-6 md:px-8 md:py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(168,85,247,0.16),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.08),transparent_28%)]" />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6">
          <section className="border-b border-purple-500/15 pb-5">
            <div className="mb-3 flex items-center gap-3 text-purple-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-purple-400/20 bg-purple-500/10">
                <CalendarDays size={19} />
              </div>
              <div>
                <h2 className="text-xl font-bold uppercase tracking-[0.18em] text-white md:text-2xl">{t.startTitle}</h2>
                <p className="mt-1 text-sm text-purple-300/70">{t.startCopy}</p>
              </div>
            </div>
          </section>

          <form onSubmit={handleStart} className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-lg border border-purple-500/15 bg-[#100719]/78 p-5 shadow-2xl shadow-black/25">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">{t.cycleName}</label>
              <input
                value={cycleTitle}
                onChange={event => setCycleTitle(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-purple-400/30 focus:border-purple-300/45"
                placeholder={language === 'DE' ? 'z.B. Klarheit statt Verteidigung' : 'e.g. Clarity instead of defense'}
              />

              <div className="mt-6 rounded-lg border border-amber-300/15 bg-amber-300/5 p-4 text-sm leading-relaxed text-amber-100/80">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-100">
                  <Flame size={14} />
                  {t.antiEgo}
                </div>
                {language === 'DE'
                  ? 'Anti-Ego bedeutet hier nicht Selbsthass. Es bedeutet: weniger Image, weniger Verteidigung, weniger künstliche Wichtigkeit, mehr Wahrheit.'
                  : 'Anti-Ego does not mean self-hate here. It means less image, less defense, less artificial importance, more truth.'}
              </div>
            </div>

            <div className="grid gap-3">
              {cycleOnboardingQuestions.map((question, index) => (
                <label key={question.id} className="rounded-lg border border-purple-500/15 bg-[#0d0615]/86 p-4 transition-colors focus-within:border-purple-300/35">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-purple-200">
                    {index + 1}. {question.label[language]}
                  </span>
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={event => setAnswers(prev => ({ ...prev, [question.id]: event.target.value }))}
                    rows={2}
                    className="w-full resize-none bg-transparent text-sm leading-relaxed text-white outline-none placeholder:text-purple-400/30"
                    placeholder={question.placeholder[language]}
                  />
                </label>
              ))}

              <button
                type="submit"
                disabled={!canStart}
                className="mt-1 flex items-center justify-center gap-2 rounded-lg border border-purple-300/25 bg-purple-600 px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-[0_0_24px_rgba(147,51,234,0.22)] transition-all hover:bg-purple-500 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30"
              >
                <Sparkles size={16} />
                {t.start}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden bg-[#05020a]">
      <style>{`
        @keyframes cycle-field-soft-alert {
          0%, 100% { border-color: rgba(255, 255, 255, 0.1); box-shadow: none; }
          38% { border-color: rgba(248, 113, 113, 0.62); box-shadow: 0 0 24px rgba(248, 113, 113, 0.12); }
          68% { border-color: rgba(248, 113, 113, 0.34); box-shadow: 0 0 14px rgba(248, 113, 113, 0.07); }
        }
        .cycle-field-needs-ink {
          animation: cycle-field-soft-alert 1.35s ease-in-out 0s 2;
          border-color: rgba(248, 113, 113, 0.42);
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(168,85,247,0.13),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.08),transparent_28%)]" />
      <div className="relative grid h-full grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_360px] md:overflow-hidden">
        <section className="flex flex-col gap-5 p-4 pb-28 md:overflow-y-auto md:p-8 md:pb-8">
          <header className="flex flex-col gap-4 border-b border-purple-500/15 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-purple-400">
                <Hourglass size={14} />
                {t.title}
              </div>
              <h2 className="text-2xl font-bold tracking-[0.06em] text-white md:text-3xl">{cycle.title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-purple-200/70">{cycle.theme}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-purple-400/15 bg-purple-400/10 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-300">{t.today}</div>
                <div className="text-xl font-bold text-white">{t.day} {todayDay}</div>
              </div>
              <button
                onClick={onArchiveCycle}
                className="rounded-lg border border-white/10 bg-white/5 p-3 text-white/50 transition-colors hover:border-red-300/30 hover:bg-red-400/10 hover:text-red-100"
                title={t.archive}
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </header>

          <section className={`w-full origin-top-left overflow-hidden rounded-lg border border-purple-500/15 bg-[#100719]/72 transition-[max-width,border-color,background-color] duration-300 focus-within:border-purple-300/30 ${
            starterOpen ? 'max-w-[72rem]' : 'max-w-[34rem]'
          }`}>
            <button
              type="button"
              onClick={() => setStarterOpen(prev => !prev)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.025]"
              aria-expanded={starterOpen}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-purple-400/15 bg-purple-500/10 text-purple-200">
                  <BookOpen size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-purple-300">
                    {t.starterBlueprint}
                  </span>
                  <span className="mt-1 block truncate text-xs text-purple-200/45">
                    {cycle.onboardingAnswers
                      .map(answer => starterDraftAnswers[answer.questionId] ?? answer.value)
                      .filter(Boolean)
                      .slice(0, 2)
                      .join(' / ') || t.starterEmpty}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                {starterSaveState !== 'idle' && (
                  <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
                    starterSaveState === 'saving' ? 'text-sky-200/70' : 'text-emerald-200/70'
                  }`}>
                    {starterSaveState === 'saving' ? t.starterSaving : t.starterSaved}
                  </span>
                )}
                <span className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-purple-300/55 sm:inline">
                  {starterOpen ? t.starterClose : t.starterOpen}
                </span>
                <ChevronDown
                  size={17}
                  className={`text-purple-200/65 transition-transform duration-300 ${starterOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>

            <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
              starterOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}>
              <div className="min-h-0 overflow-hidden">
                <div className="grid gap-3 border-t border-purple-500/10 p-5 md:grid-cols-2">
                  {cycle.onboardingAnswers.length ? (
                    cycle.onboardingAnswers.map(answer => (
                      <label key={answer.questionId} className="rounded-lg border border-white/8 bg-white/[0.035] p-4 transition-colors focus-within:border-purple-300/30">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-purple-400">
                          {answer.label}
                        </span>
                        <textarea
                          value={starterDraftAnswers[answer.questionId] ?? ''}
                          onChange={event => setStarterDraftAnswers(prev => ({
                            ...prev,
                            [answer.questionId]: event.target.value,
                          }))}
                          rows={3}
                          className="w-full resize-none bg-transparent text-sm leading-relaxed text-purple-100 outline-none placeholder:text-purple-400/30"
                        />
                      </label>
                    ))
                  ) : (
                    <p className="text-sm leading-relaxed text-purple-200/45">{t.starterEmpty}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-purple-500/15 bg-[#100719]/80 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-400">{t.phase} {guide.phase.id}</div>
                  <h3 className="mt-1 text-xl font-bold text-white">{guide.phase.title[language]}</h3>
                </div>
                <div className="rounded-full border border-purple-300/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-100">
                  {t.day} {selectedDay}/63
                </div>
              </div>

              <h4 className="mb-2 text-lg font-semibold text-purple-100">{guide.title}</h4>
              {selectedSealDate && (
                <div className="mb-3 inline-flex w-fit items-center rounded border border-emerald-200/18 bg-emerald-300/8 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100/72">
                  {language === 'DE' ? 'Versiegelt' : 'Sealed'} {formatReadableSealDate(selectedSealDate)}
                </div>
              )}
              <p className="text-sm leading-relaxed text-purple-200/70">{guide.focus}</p>

              {guide.milestone && (
                <div className="mt-5 rounded-lg border border-amber-300/20 bg-amber-300/5 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
                    {guide.milestone.title[language]}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-amber-100/75">{guide.milestone.description[language]}</p>
                </div>
              )}

              <div className="mt-5 rounded-lg border border-sky-300/15 bg-sky-300/5 p-4">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">{t.pacing}</div>
                <p className="text-sm leading-relaxed text-sky-100/75">{guide.pacingNote}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {pacingOptions.map(option => {
                    const Icon = option.icon;
                    const active = pacing === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setPacing(option.value)}
                        className={`flex h-16 flex-col items-center justify-center gap-1 rounded-lg border text-[9px] font-bold uppercase tracking-[0.08em] transition-all ${
                          active
                            ? 'border-sky-200/40 bg-sky-300/15 text-white'
                            : 'border-white/10 bg-white/[0.03] text-white/35 hover:text-white/70'
                        }`}
                      >
                        <Icon size={15} />
                        {option.value.split('_')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                { id: 'sense', label: t.sense, hint: t.senseHint, value: sense, setter: setSense },
                { id: 'trace', label: t.trace, hint: t.traceHint, value: trace, setter: setTrace },
                { id: 'externalize', label: t.externalize, hint: t.externalizeHint, value: externalize, setter: setExternalize },
                { id: 'reframe', label: t.reframe, hint: t.reframeHint, value: reframe, setter: setReframe },
                { id: 'embody', label: t.embody, hint: t.embodyHint, value: embody, setter: setEmbody },
              ].map(field => (
                <label key={`${field.id}-${validationPulseKey}`} className={getFieldClass(field.id as CycleTextFieldId)}>
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-purple-200">{field.label}</span>
                  <span className="mb-3 block text-[12px] leading-relaxed text-purple-200/48">{getPromptLine(field.id as CycleTextFieldId)}</span>
                  <textarea
                    value={field.value}
                    onChange={event => handleFieldChange(field.id as CycleTextFieldId, event.target.value, field.setter)}
                    rows={2}
                    className="w-full resize-none bg-transparent text-sm leading-relaxed text-white outline-none placeholder:text-purple-400/30"
                    placeholder={field.hint}
                  />
                </label>
              ))}

              <label key={`anti-ego-${validationPulseKey}`} className={getFieldClass('antiEgoCheck', 'amber')}>
                <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-amber-100">{t.antiEgo}</span>
                <span className="mb-3 block text-[12px] leading-relaxed text-amber-100/54">{getPromptLine('antiEgoCheck')}</span>
                <p className="mb-3 text-sm leading-relaxed text-amber-100/70">{guide.antiEgoPrompt}</p>
                <textarea
                  value={antiEgoCheck}
                  onChange={event => handleFieldChange('antiEgoCheck', event.target.value, setAntiEgoCheck)}
                  rows={2}
                  className="w-full resize-none bg-transparent text-sm leading-relaxed text-white outline-none placeholder:text-amber-100/25"
                  placeholder={t.antiEgoHint}
                />
              </label>

              <button
                onClick={handleCompleteDay}
                disabled={!canSubmitSelectedDay}
                title={canRefineSelectedDay ? '' : sealDisabledReason}
                className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200/25 bg-emerald-500/15 px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50 transition-all hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/30"
              >
                <Check size={16} />
                {submitLabel}
              </button>
              {sealDisabledReason && (
                <p className="text-center text-[11px] text-purple-300/45">{sealDisabledReason}</p>
              )}
            </div>
          </div>
        </section>

        <aside className="border-t border-purple-500/20 bg-[#08030f]/92 p-4 md:border-l md:border-t-0 md:p-5 md:overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">{t.calendar}</div>
              <div className="mt-1 text-sm text-purple-200/60">{t.subtitle}</div>
            </div>
            <CalendarDays size={18} className="text-purple-300/70" />
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map(day => {
              const isSelected = day === selectedDay;
              const isToday = day === todayDay;
              const completedRecord = cycle.dayRecords.find(record => record.day === day && record.completedAt);
              const isComplete = Boolean(completedRecord);
              const isLocked = !isComplete && day > todayDay;
              const milestone = cycleMilestones.some(item => item.day === day);
              const sealDate = getRecordSealDate(completedRecord);
              const date = isComplete && sealDate
                ? `${language === 'DE' ? 'versiegelt am' : 'sealed on'} ${sealDate}`
                : isLocked
                  ? t.locked
                  : '';

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  title={isLocked ? `${t.day} ${day} · ${t.locked}` : `${t.day} ${day} · ${date}`}
                  className={`relative flex aspect-square min-h-10 items-center justify-center rounded-lg border text-xs font-bold transition-all ${
                    isSelected
                      ? 'border-purple-200/50 bg-purple-500/35 text-white shadow-[0_0_18px_rgba(168,85,247,0.25)]'
                      : isLocked
                        ? 'border-white/5 bg-white/[0.02] text-purple-200/20'
                        : 'border-white/8 bg-white/[0.035] text-purple-200/55 hover:border-purple-300/30 hover:text-white'
                  } ${isToday && !isSelected ? 'ring-1 ring-amber-200/45' : ''}`}
                >
                  {isComplete ? (
                    <span className="flex min-h-7 flex-col items-center justify-center gap-0.5 leading-none">
                      <Check size={13} />
                      {sealDate && (
                        <span className="text-[8px] font-semibold text-emerald-100/70">
                          {formatCompactSealDate(sealDate)}
                        </span>
                      )}
                    </span>
                  ) : (
                    day
                  )}
                  {milestone && <Sparkles size={9} className="absolute right-1 top-1 text-amber-200" />}
                  {!isComplete && !milestone && <Circle size={6} className="absolute bottom-1 text-white/10" />}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};
