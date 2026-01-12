
import React, { useState } from 'react';
import { CalendarEvent, Language } from '../types';
import { getUIText } from '../config/loader';
import { ChevronLeft, ChevronRight, Clock, MapPin, CheckCircle, Circle, Plus, AlertCircle, X, Trash2, Edit2, ArrowLeft } from 'lucide-react';

interface CalendarInterfaceProps {
    language: Language;
    events: CalendarEvent[];
    onAddEvent: (evt: CalendarEvent) => void;
    onEditEvent: (evt: CalendarEvent) => void;
    onRemoveEvent: (id: string) => void;
}

const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export const CalendarInterface: React.FC<CalendarInterfaceProps> = ({ 
    language, 
    events,
    onAddEvent,
    onEditEvent,
    onRemoveEvent
}) => {
    const ui = getUIText(language);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    
    // Mobile View State: 'GRID' (Default) or 'AGENDA' (When a date is picked)
    const [mobileView, setMobileView] = useState<'GRID' | 'AGENDA'>('GRID');

    // Form State
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [eventType, setEventType] = useState<CalendarEvent['type']>('MEETING');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y: number, m: number) => {
        const day = new Date(y, m, 1).getDay();
        return day === 0 ? 6 : day - 1; 
    };

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = Array.from({ length: 42 }, (_, i) => {
        const d = i - firstDay + 1;
        if (d > 0 && d <= daysInMonth) return d;
        return null;
    });

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const isSameDate = (d1: Date, d2: Date) => 
        d1.getFullYear() === d2.getFullYear() && 
        d1.getMonth() === d2.getMonth() && 
        d1.getDate() === d2.getDate();

    const selectedIso = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000))
        .toISOString().split('T')[0];

    const dayEvents = events.filter(e => e.date === selectedIso);

    const getEventColor = (type: CalendarEvent['type']) => {
        switch(type) {
            case 'DEADLINE': return 'bg-red-500 shadow-red-500/50';
            case 'QUEST': return 'bg-amber-400 shadow-amber-500/50';
            case 'MEETING': return 'bg-blue-400 shadow-blue-500/50';
            case 'BIRTHDAY': return 'bg-pink-400 shadow-pink-500/50';
            case 'SOCIAL': return 'bg-green-400 shadow-green-500/50';
            case 'FINANCE': return 'bg-emerald-400 shadow-emerald-500/50';
            default: return 'bg-purple-400 shadow-purple-500/50';
        }
    };

    const handleDateClick = (dateObj: Date) => {
        setSelectedDate(dateObj);
        setMobileView('AGENDA');
    };

    const openAddModal = () => {
        setEditingEventId(null);
        setTitle('');
        setDesc('');
        setEventType('MEETING');
        setIsModalOpen(true);
    };

    const openEditModal = (evt: CalendarEvent) => {
        setEditingEventId(evt.id);
        setTitle(evt.title);
        setDesc(evt.description || '');
        setEventType(evt.type);
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!title) return;

        if (editingEventId) {
             const updatedEvent: CalendarEvent = {
                id: editingEventId,
                date: selectedIso,
                title,
                description: desc,
                type: eventType,
                completed: false
            };
            onEditEvent(updatedEvent);
        } else {
            const newEvent: CalendarEvent = {
                id: `evt-${Date.now()}`,
                date: selectedIso,
                title,
                description: desc,
                type: eventType,
                completed: false
            };
            onAddEvent(newEvent);
        }

        setIsModalOpen(false);
        setTitle('');
        setDesc('');
    };

    return (
        <div className="flex-1 w-full h-full overflow-hidden flex flex-col md:flex-row bg-[#05020a] relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(76,29,149,0.1),transparent_70%)] pointer-events-none" />
            
            {/* Left Panel: The Grid (Visible on Desktop OR when Mobile is in GRID mode) */}
            <div className={`flex-1 flex flex-col p-6 relative z-10 overflow-y-auto ${mobileView === 'AGENDA' ? 'hidden md:flex' : 'flex'}`}>
                <div className="flex justify-between items-center mb-8 bg-[#0f0716]/80 p-4 rounded-xl border border-purple-500/10 backdrop-blur-md shadow-lg">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-purple-500/10 rounded-full text-purple-400 hover:text-white transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white uppercase tracking-[0.2em]">
                            {language === 'DE' ? MONTHS_DE[month] : MONTHS_EN[month]}
                        </h2>
                        <span className="text-sm text-purple-500/50 font-mono tracking-widest">{year}</span>
                    </div>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-purple-500/10 rounded-full text-purple-400 hover:text-white transition-colors">
                        <ChevronRight size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-7 mb-4">
                    {(language === 'DE' ? DAYS_DE : DAYS_EN).map(day => (
                        <div key={day} className="text-center text-[10px] text-purple-400/50 uppercase tracking-widest font-bold">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-3 auto-rows-fr flex-1 pb-20 md:pb-0">
                    {days.map((day, idx) => {
                        if (!day) return <div key={idx} className="opacity-0" />;
                        
                        const dateObj = new Date(year, month, day);
                        const isSelected = isSameDate(dateObj, selectedDate);
                        const isToday = isSameDate(dateObj, new Date());
                        
                        const dateIso = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                        const dateEvents = events.filter(e => e.date === dateIso);

                        return (
                            <div 
                                key={idx}
                                onClick={() => handleDateClick(dateObj)}
                                className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group
                                    ${isSelected 
                                        ? 'bg-purple-600 border-purple-400 shadow-[0_0_20px_rgba(147,51,234,0.4)] text-white scale-105 z-10' 
                                        : 'bg-[#150a26]/40 border-purple-500/10 text-purple-200/60 hover:border-purple-500/30 hover:bg-purple-900/20'
                                    }
                                    ${isToday && !isSelected ? 'ring-1 ring-amber-500/50' : ''}
                                `}
                            >
                                <span className={`text-lg font-light ${isSelected ? 'font-bold' : ''}`}>{day}</span>
                                
                                {isToday && !isSelected && (
                                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                )}

                                <div className="flex gap-1 mt-2 flex-wrap justify-center px-2">
                                    {dateEvents.slice(0, 4).map((evt, i) => (
                                        <div 
                                            key={i} 
                                            className={`w-1.5 h-1.5 rounded-full ${getEventColor(evt.type)}`} 
                                        />
                                    ))}
                                    {dateEvents.length > 4 && <span className="text-[8px] leading-none opacity-50">+</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right/Bottom Panel: Agenda (Flux Log) - Visible on Desktop OR when Mobile is in AGENDA mode */}
            {/* Added z-[60] to ensure it covers the header on mobile */}
            <div className={`w-full md:w-80 border-t md:border-t-0 md:border-l border-purple-500/20 bg-[#0a0510]/95 backdrop-blur-xl p-6 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-transform duration-300 
                ${mobileView === 'AGENDA' ? 'fixed inset-0 z-[60] pt-6 md:static translate-x-0' : 'fixed inset-0 translate-x-full md:static md:translate-x-0 hidden md:flex'}
            `}>
                
                {/* Mobile Header: Back Button */}
                <div className="md:hidden flex items-center mb-6 pt-2">
                    <button 
                        onClick={() => setMobileView('GRID')}
                        className="flex items-center gap-2 p-3 -ml-2 text-purple-400 hover:text-white transition-colors rounded-lg active:bg-purple-900/20 w-full"
                    >
                        <ArrowLeft size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Back to Calendar</span>
                    </button>
                </div>

                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-3xl font-bold text-white uppercase tracking-tighter">
                            {selectedDate.getDate()}
                        </h3>
                        <span className="text-xs text-purple-400 uppercase tracking-[0.2em]">
                            {language === 'DE' ? MONTHS_DE[selectedDate.getMonth()] : MONTHS_EN[selectedDate.getMonth()]}
                        </span>
                    </div>
                    <div className="text-[10px] bg-purple-900/30 px-2 py-1 rounded border border-purple-500/20 text-purple-300 font-mono">
                        {language === 'DE' ? DAYS_DE[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1] : DAYS_EN[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1]}
                    </div>
                </div>

                <div className="h-px w-full bg-gradient-to-r from-purple-500/30 to-transparent mb-6" />

                <div className="flex items-center gap-2 mb-4">
                    <Clock size={14} className="text-purple-400" />
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-widest">{ui.CALENDAR_AGENDA}</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pb-20 md:pb-0">
                    {dayEvents.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-purple-500/30 border border-dashed border-purple-500/10 rounded-xl">
                            <CheckCircle size={24} className="mb-2 opacity-50" />
                            <span className="text-[10px] uppercase tracking-wider text-center px-4">{ui.NO_EVENTS}</span>
                        </div>
                    ) : (
                        dayEvents.map(evt => (
                            <div 
                                key={evt.id} 
                                onClick={() => openEditModal(evt)}
                                className="group relative bg-[#150a26] border border-purple-500/10 hover:border-purple-500/30 rounded-xl p-4 transition-all hover:translate-x-1 cursor-pointer"
                            >
                                <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r ${getEventColor(evt.type).split(' ')[0]}`} />
                                <div className="pl-3 pr-6">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-purple-200 uppercase tracking-wide group-hover:text-white transition-colors">{evt.title}</span>
                                        {evt.type === 'DEADLINE' && <AlertCircle size={12} className="text-red-400" />}
                                    </div>
                                    <p className="text-[11px] text-purple-400/60 leading-relaxed font-light mb-2">
                                        {evt.description}
                                    </p>
                                    <div className="flex gap-2">
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 uppercase border border-white/5">
                                            {evt.type}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onRemoveEvent(evt.id); }}
                                    className="absolute top-2 right-2 text-white/20 hover:text-red-400 transition-colors p-1"
                                    title="Remove Event"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <button 
                    onClick={openAddModal}
                    className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-purple-900/20 hover:bg-purple-900/40 border border-purple-500/20 text-purple-300 transition-all text-xs uppercase tracking-widest font-bold group"
                >
                    <Plus size={14} className="group-hover:scale-110 transition-transform" />
                    <span>Add Entry</span>
                </button>
            </div>

             {/* Add/Edit Event Modal */}
             {isModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="w-full max-w-sm bg-[#150a26] border border-purple-500/30 rounded-2xl p-6 shadow-2xl relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-white/30 hover:text-white">
                            <X size={20} />
                        </button>
                        
                        <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider">
                            {editingEventId ? 'Edit Event' : 'New Event'}
                        </h3>
                        <div className="text-xs text-purple-400/50 mb-4 font-mono">Date: {selectedIso}</div>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs text-purple-500/70 uppercase tracking-wide mb-1">Title</label>
                                <input 
                                    type="text" 
                                    required
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-[#0a0510] border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                    placeholder="e.g. Doc Appointment"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-purple-500/70 uppercase tracking-wide mb-1">Type</label>
                                <select 
                                    value={eventType}
                                    onChange={e => setEventType(e.target.value as any)}
                                    className="w-full bg-[#0a0510] border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                >
                                    <option value="MEETING">Meeting</option>
                                    <option value="DEADLINE">Deadline</option>
                                    <option value="BIRTHDAY">Birthday</option>
                                    <option value="SOCIAL">Social</option>
                                    <option value="QUEST">Quest / Goal</option>
                                    <option value="FINANCE">Finance</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-purple-500/70 uppercase tracking-wide mb-1">Description</label>
                                <input 
                                    type="text" 
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    className="w-full bg-[#0a0510] border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                    placeholder="Optional details..."
                                />
                            </div>

                            <button type="submit" className="w-full py-3 mt-4 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-wider rounded-lg transition-colors">
                                {editingEventId ? 'Save Changes' : 'Create'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
