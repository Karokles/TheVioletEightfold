
import React, { useState } from 'react';
import { FinanceState, Language, Transaction } from '../types';
import { getUIText } from '../constants';
import { Wallet, TrendingUp, TrendingDown, Coins, Plus, ArrowUpRight, ArrowDownLeft, X, Trash2, Edit2, Save } from 'lucide-react';

interface FinanceInterfaceProps {
    language: Language;
    finances: FinanceState;
    onAddTransaction: (t: Transaction) => void;
    onEditTransaction: (t: Transaction) => void;
    onRemoveTransaction: (id: string) => void;
    onUpdateBalance: (newBalance: number) => void;
}

export const FinanceInterface: React.FC<FinanceInterfaceProps> = ({ 
    language, 
    finances, 
    onAddTransaction,
    onEditTransaction,
    onRemoveTransaction,
    onUpdateBalance
}) => {
    const ui = getUIText(language);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditingBalance, setIsEditingBalance] = useState(false);
    
    // Safety check: Ensure finances exists and has a valid transaction array
    const safeTransactions = finances?.transactions || [];
    const safeBalance = finances?.balance ?? 0;
    const safeCurrency = finances?.currency || '€';

    const [tempBalance, setTempBalance] = useState(safeBalance.toString());
    const [editingTxId, setEditingTxId] = useState<string | null>(null);

    // Form State
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
    const [category, setCategory] = useState('General');

    const totalIncome = safeTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = safeTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);

    const openAddModal = () => {
        setEditingTxId(null);
        setAmount('');
        setDescription('');
        setCategory('General');
        setType('EXPENSE');
        setIsAddModalOpen(true);
    };

    const openEditModal = (t: Transaction) => {
        setEditingTxId(t.id);
        setAmount(t.amount.toString());
        setDescription(t.description);
        setCategory(t.category);
        setType(t.type);
        setIsAddModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description) return;

        if (editingTxId) {
            // Find old date to preserve it, or use current if lost
            const oldTx = safeTransactions.find(t => t.id === editingTxId);
            const date = oldTx ? oldTx.date : new Date().toISOString().split('T')[0];

            const updatedTx: Transaction = {
                id: editingTxId,
                date,
                amount: parseFloat(amount),
                description,
                type,
                category
            };
            onEditTransaction(updatedTx);
        } else {
            const newTx: Transaction = {
                id: `tx-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                amount: parseFloat(amount),
                description,
                type,
                category
            };
            onAddTransaction(newTx);
        }

        setIsAddModalOpen(false);
        setAmount('');
        setDescription('');
        setCategory('General');
    };

    const handleBalanceSave = () => {
        const val = parseFloat(tempBalance);
        if (!isNaN(val)) {
            onUpdateBalance(val);
        }
        setIsEditingBalance(false);
    };

    return (
        <div className="flex-1 w-full h-full overflow-hidden bg-[#05020a] relative flex flex-col font-sans">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(217,119,6,0.05),transparent_70%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] opacity-10 pointer-events-none" />

            {/* Header */}
            <div className="p-8 pb-0 z-10 animate-fade-in-up">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-8 bg-amber-500/80 rounded-sm shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                    <div>
                        <h2 className="text-2xl font-bold text-white uppercase tracking-[0.2em] drop-shadow-md">
                            {ui.FINANCE}
                        </h2>
                        <div className="flex items-center gap-2 text-[10px] text-amber-500/60 tracking-[0.3em] uppercase font-mono">
                            <Coins size={10} />
                            <span>Resource Allocation Protocol</span>
                        </div>
                    </div>
                 </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-6 p-8 pt-2 overflow-y-auto md:overflow-hidden relative z-10 pb-20">
                
                {/* Left Column: Balance Card */}
                <div className="w-full md:w-1/3 flex flex-col gap-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    
                    {/* Main Liquidity Card */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#150a26] to-[#0f0716] border border-amber-500/20 shadow-[0_0_30px_rgba(0,0,0,0.3)] p-6 group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Wallet size={100} className="text-amber-500" />
                        </div>
                        
                        <span className="text-[10px] text-amber-500/60 uppercase tracking-widest font-bold mb-2 block">{ui.BALANCE}</span>
                        
                        <div className="flex items-baseline gap-2 mb-6 relative z-10">
                             {isEditingBalance ? (
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        value={tempBalance}
                                        onChange={(e) => setTempBalance(e.target.value)}
                                        className="bg-black/40 border border-amber-500/50 text-white text-2xl font-mono px-2 py-1 rounded w-32 focus:ring-1 focus:ring-amber-500"
                                        autoFocus
                                    />
                                    <button onClick={handleBalanceSave} className="p-2 bg-amber-600 hover:bg-amber-500 rounded text-white"><Save size={16} /></button>
                                </div>
                             ) : (
                                <div className="flex items-center gap-2 group/bal cursor-pointer" onClick={() => { setTempBalance(safeBalance.toString()); setIsEditingBalance(true); }}>
                                    <span className="text-5xl font-light text-white tracking-tighter">
                                        {safeCurrency}{safeBalance.toFixed(2)}
                                    </span>
                                    <Edit2 size={14} className="opacity-0 group-hover/bal:opacity-50 text-amber-500 transition-opacity" />
                                </div>
                             )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                            <div>
                                <div className="flex items-center gap-1 text-[9px] text-emerald-400 uppercase tracking-wider mb-1">
                                    <TrendingUp size={10} /> {ui.INCOME}
                                </div>
                                <span className="text-lg text-emerald-100 font-mono">+{totalIncome.toFixed(2)}</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-1 text-[9px] text-red-400 uppercase tracking-wider mb-1">
                                    <TrendingDown size={10} /> {ui.EXPENSE}
                                </div>
                                <span className="text-lg text-red-100 font-mono">-{totalExpense.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={openAddModal}
                        className="w-full py-4 rounded-xl border border-dashed border-amber-500/30 text-amber-500/60 hover:bg-amber-900/10 hover:text-amber-400 hover:border-amber-500/50 transition-all uppercase tracking-widest text-xs font-bold flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> {ui.ADD_TRANSACTION}
                    </button>
                </div>

                {/* Right Column: Transaction History */}
                <div className="flex-1 bg-[#150a26]/40 border border-purple-500/10 rounded-2xl overflow-hidden flex flex-col backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                     <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Transaction Log</h3>
                        <span className="text-[10px] text-white/30 font-mono">{safeTransactions.length} ENTRIES</span>
                     </div>

                     <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {safeTransactions.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-white/20">
                                <span className="text-xs uppercase tracking-widest">No Data</span>
                            </div>
                        ) : (
                            safeTransactions.slice().reverse().map((t, idx) => (
                                <div key={t.id || idx} className="flex items-center justify-between p-4 rounded-lg bg-[#0a0510] border border-white/5 hover:border-amber-500/20 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${t.type === 'INCOME' ? 'bg-emerald-900/20 border-emerald-500/20 text-emerald-400' : 'bg-red-900/20 border-red-500/20 text-red-400'}`}>
                                            {t.type === 'INCOME' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">{t.description}</div>
                                            <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-wider">
                                                <span>{t.date}</span>
                                                <span className="w-1 h-1 bg-white/20 rounded-full" />
                                                <span>{t.category}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={`font-mono text-lg ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {t.type === 'INCOME' ? '+' : '-'}{t.amount.toFixed(2)}
                                        </div>
                                        <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => openEditModal(t)}
                                                className="p-2 text-white/20 hover:text-amber-400 hover:bg-amber-900/20 rounded-full transition-all"
                                                title="Edit Entry"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => onRemoveTransaction(t.id)}
                                                className="p-2 text-white/20 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-all"
                                                title="Delete Entry"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                     </div>
                </div>
            </div>

            {/* Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="w-full max-w-md bg-[#150a26] border border-amber-500/30 rounded-2xl p-6 shadow-2xl relative">
                        <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-white/30 hover:text-white">
                            <X size={20} />
                        </button>
                        
                        <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider">
                            {editingTxId ? 'Edit Transaction' : 'Log Transaction'}
                        </h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs text-amber-500/70 uppercase tracking-wide mb-1">Type</label>
                                <div className="flex gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setType('EXPENSE')} 
                                        className={`flex-1 py-2 rounded border ${type === 'EXPENSE' ? 'bg-red-900/40 border-red-500 text-red-200' : 'bg-transparent border-white/10 text-white/40'}`}
                                    >
                                        Expense
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setType('INCOME')} 
                                        className={`flex-1 py-2 rounded border ${type === 'INCOME' ? 'bg-emerald-900/40 border-emerald-500 text-emerald-200' : 'bg-transparent border-white/10 text-white/40'}`}
                                    >
                                        Income
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-amber-500/70 uppercase tracking-wide mb-1">Amount</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    required
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full bg-[#0a0510] border border-white/10 rounded-lg p-3 text-white focus:border-amber-500 outline-none font-mono"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-amber-500/70 uppercase tracking-wide mb-1">Description</label>
                                <input 
                                    type="text" 
                                    required
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full bg-[#0a0510] border border-white/10 rounded-lg p-3 text-white focus:border-amber-500 outline-none"
                                    placeholder="e.g. Groceries"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-amber-500/70 uppercase tracking-wide mb-1">Category</label>
                                <select 
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full bg-[#0a0510] border border-white/10 rounded-lg p-3 text-white focus:border-amber-500 outline-none"
                                >
                                    <option value="General">General</option>
                                    <option value="Food">Food / Sustenance</option>
                                    <option value="Transport">Transport</option>
                                    <option value="Tech">Technology</option>
                                    <option value="Health">Health</option>
                                    <option value="Work">Income Source</option>
                                </select>
                            </div>

                            <button type="submit" className="w-full py-3 mt-4 bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase tracking-wider rounded-lg transition-colors">
                                {editingTxId ? 'Save Changes' : 'Confirm Entry'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
