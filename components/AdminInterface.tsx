import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, Crown, Database, KeyRound, Mail, MessageCircle, RefreshCw, Save, Search, Shield, Trash2, UserPlus, UserRound } from 'lucide-react';
import { AdminAccount, AdminEntitlement, createAdminAccount, deleteAdminAccount, getAdminAccounts, updateAdminAccount } from '../services/adminService';
import { Language } from '../types';

interface AdminInterfaceProps {
  language: Language;
}

const copy = {
  EN: {
    title: 'Admin',
    subtitle: 'Accounts, access, and usage limits.',
    refresh: 'Refresh',
    save: 'Save',
    create: 'Create',
    createAccount: 'New account',
    email: 'Email',
    password: 'Password',
    displayName: 'Display name',
    confirmEmail: 'Confirm',
    account: 'Account',
    status: 'Status',
    communication: 'Communication',
    council: 'Council',
    blueprint: 'Blueprint',
    usage: 'Usage',
    total: 'Total',
    week: 'Week',
    chat: 'Chat',
    messages: 'Messages',
    userInputs: 'User inputs',
    lastInteraction: 'Last activity',
    offline: 'Offline',
    updated: 'Updated',
    lastSignIn: 'Last sign-in',
    auth: 'Auth',
    delete: 'Delete',
    deleteConfirm: 'Delete this account everywhere? This removes Supabase Auth and app data.',
    deleted: 'Account deleted.',
    search: 'Search accounts',
    noAccess: 'Admin access is not active for this account.',
    dbDisabled: 'Database is not configured on this backend.',
    loading: 'Loading admin accounts...',
    empty: 'No accounts found.',
    created: 'Account created.',
    updatedExisting: 'Existing account updated.',
  },
  DE: {
    title: 'Admin',
    subtitle: 'Konten, Zugang und Nutzungslimits.',
    refresh: 'Aktualisieren',
    save: 'Speichern',
    create: 'Anlegen',
    createAccount: 'Neues Konto',
    email: 'E-Mail',
    password: 'Passwort',
    displayName: 'Anzeigename',
    confirmEmail: 'Bestaetigt',
    account: 'Konto',
    status: 'Status',
    communication: 'Kommunikation',
    council: 'Council',
    blueprint: 'Blueprint',
    usage: 'Nutzung',
    total: 'Gesamt',
    week: 'Woche',
    chat: 'Chat',
    messages: 'Messages',
    userInputs: 'User-Inputs',
    lastInteraction: 'Letzte Aktivitaet',
    offline: 'Offline',
    updated: 'Aktualisiert',
    lastSignIn: 'Letzter Login',
    auth: 'Auth',
    delete: 'Loeschen',
    deleteConfirm: 'Dieses Konto ueberall loeschen? Supabase Auth und App-Daten werden entfernt.',
    deleted: 'Konto wurde geloescht.',
    search: 'Konten suchen',
    noAccess: 'Admin-Zugang ist fuer dieses Konto nicht aktiv.',
    dbDisabled: 'Die Datenbank ist auf diesem Backend nicht konfiguriert.',
    loading: 'Admin-Konten werden geladen...',
    empty: 'Keine Konten gefunden.',
    created: 'Konto wurde angelegt.',
    updatedExisting: 'Bestehendes Konto wurde aktualisiert.',
  },
};

const normalizeLimit = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
};

const formatDate = (value?: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString([], {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatNumber = (value?: number | null): string => {
  return new Intl.NumberFormat().format(value || 0);
};

const getUsage = (account: AdminAccount) => account.usage || {
  totalInteractions: 0,
  weeklyInteractions: 0,
  directChatReplies: 0,
  councilSessions: 0,
  blueprintSaves: 0,
  cycleUnlocks: 0,
  persistedDirectSessions: 0,
  persistedCouncilSessions: 0,
  persistedMessages: 0,
  persistedUserMessages: 0,
  lastInteractionAt: null,
};

export const AdminInterface: React.FC<AdminInterfaceProps> = ({ language }) => {
  const t = copy[language];
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [databaseStatus, setDatabaseStatus] = useState<'configured' | 'disabled'>('configured');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    email: '',
    password: '',
    displayName: '',
    entitlement: 'free' as AdminEntitlement,
    emailConfirm: true,
  });

  const loadAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminAccounts();
      setAccounts(result.accounts);
      setDatabaseStatus(result.databaseStatus);
    } catch (loadError: any) {
      setError(loadError?.message || t.noAccess);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const patchAccount = (userId: string, patch: Partial<AdminAccount>) => {
    setAccounts(prev => prev.map(account => account.userId === userId ? { ...account, ...patch } : account));
  };

  const patchLimit = (userId: string, key: keyof AdminAccount['limits'], value: string) => {
    setAccounts(prev => prev.map(account => account.userId === userId
      ? { ...account, limits: { ...account.limits, [key]: normalizeLimit(value) } }
      : account));
  };

  const saveAccount = async (account: AdminAccount) => {
    setSavingUserId(account.userId);
    setError('');
    try {
      await updateAdminAccount(account.userId, {
        entitlement: account.entitlement,
        offlineOnly: account.offlineOnly,
        activeUntil: account.activeUntil || null,
        betaActivations: account.betaActivations || 0,
        betaBonusUsed: Boolean(account.betaBonusUsed),
        notes: account.notes || null,
        weeklyFreeInteractions: account.limits.weeklyFreeInteractions,
        weeklyCouncilSessions: account.limits.weeklyCouncilSessions,
        weeklyMeaningAnalyses: account.limits.weeklyMeaningAnalyses,
      });
      await loadAccounts();
    } catch (saveError: any) {
      setError(saveError?.message || 'Save failed');
    } finally {
      setSavingUserId(null);
    }
  };

  const removeAccount = async (account: AdminAccount) => {
    if (!window.confirm(t.deleteConfirm)) {
      return;
    }

    setDeletingUserId(account.userId);
    setError('');
    setNotice('');
    try {
      await deleteAdminAccount(account.userId);
      setAccounts(prev => prev.filter(item => item.userId !== account.userId));
      setNotice(t.deleted);
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Delete failed');
    } finally {
      setDeletingUserId(null);
    }
  };

  const submitNewAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingAccount(true);
    setError('');
    setNotice('');
    try {
      const result = await createAdminAccount({
        email: newAccount.email,
        password: newAccount.password,
        displayName: newAccount.displayName,
        emailConfirm: newAccount.emailConfirm,
        admin: {
          entitlement: newAccount.entitlement,
          offlineOnly: false,
          weeklyFreeInteractions: null,
          weeklyCouncilSessions: null,
          weeklyMeaningAnalyses: null,
        },
      });
      setNotice(result.action === 'created' ? t.created : t.updatedExisting);
      setNewAccount({
        email: '',
        password: '',
        displayName: '',
        entitlement: 'free',
        emailConfirm: true,
      });
      await loadAccounts();
    } catch (createError: any) {
      setError(createError?.message || 'Create failed');
    } finally {
      setCreatingAccount(false);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleAccounts = normalizedSearch
    ? accounts.filter(account => [
        account.displayName,
        account.username,
        account.userId,
        account.entitlement,
      ].some(value => String(value || '').toLowerCase().includes(normalizedSearch)))
    : accounts;
  const usageTotals = visibleAccounts.reduce((totals, account) => {
    const usage = getUsage(account);
    return {
      totalInteractions: totals.totalInteractions + usage.totalInteractions,
      weeklyInteractions: totals.weeklyInteractions + usage.weeklyInteractions,
      directChatReplies: totals.directChatReplies + usage.directChatReplies,
      councilSessions: totals.councilSessions + usage.councilSessions,
      persistedUserMessages: totals.persistedUserMessages + usage.persistedUserMessages,
    };
  }, {
    totalInteractions: 0,
    weeklyInteractions: 0,
    directChatReplies: 0,
    councilSessions: 0,
    persistedUserMessages: 0,
  });

  return (
    <div className="relative flex-1 overflow-y-auto bg-[#05020a] px-4 py-6 md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(168,85,247,0.13),transparent_34%),radial-gradient(circle_at_85%_4%,rgba(14,165,233,0.08),transparent_28%)]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-purple-500/15 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-purple-400">
              <Shield size={14} />
              {t.title}
            </div>
            <h2 className="text-2xl font-bold tracking-[0.06em] text-white">{t.subtitle}</h2>
          </div>
          <button
            onClick={loadAccounts}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-purple-300/20 bg-purple-500/12 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-purple-100 transition-all hover:bg-purple-500/20 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {t.refresh}
          </button>
        </header>

        <div className="flex flex-col gap-3 rounded-lg border border-purple-500/15 bg-[#0d0615]/86 p-3 md:flex-row md:items-center md:justify-between">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white focus-within:border-purple-300/35">
            <Search size={15} className="text-purple-300/60" />
            <input
              type="search"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder={t.search}
              className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-purple-300/35"
            />
          </label>
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-purple-300/55">
            {visibleAccounts.length} / {accounts.length}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          {[
            [t.total, usageTotals.totalInteractions],
            [t.week, usageTotals.weeklyInteractions],
            [t.chat, usageTotals.directChatReplies],
            [t.council, usageTotals.councilSessions],
            [t.userInputs, usageTotals.persistedUserMessages],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-purple-500/15 bg-[#0d0615]/86 p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-purple-300/60">
                <Activity size={13} />
                {label}
              </div>
              <div className="text-2xl font-bold tracking-[0.04em] text-white">{formatNumber(Number(value))}</div>
            </div>
          ))}
        </div>

        {databaseStatus === 'disabled' && (
          <div className="rounded-lg border border-amber-300/20 bg-amber-300/8 p-4 text-sm text-amber-100/80">
            {t.dbDisabled}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-300/20 bg-red-500/10 p-4 text-sm text-red-100/85">
            {error}
          </div>
        )}

        {notice && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-100/85">
            <CheckCircle2 size={16} />
            {notice}
          </div>
        )}

        <form
          onSubmit={submitNewAccount}
          className="rounded-lg border border-purple-500/15 bg-[#0d0615]/86 p-4"
        >
          <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-purple-300">
            <UserPlus size={15} />
            {t.createAccount}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto_auto] xl:items-end">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-purple-300/65">{t.email}</span>
              <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white focus-within:border-purple-300/35">
                <Mail size={15} className="text-purple-300/60" />
                <input
                  type="email"
                  value={newAccount.email}
                  onChange={event => setNewAccount(prev => ({ ...prev, email: event.target.value }))}
                  required
                  className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-purple-300/30"
                />
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-purple-300/65">{t.displayName}</span>
              <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white focus-within:border-purple-300/35">
                <UserRound size={15} className="text-purple-300/60" />
                <input
                  type="text"
                  value={newAccount.displayName}
                  onChange={event => setNewAccount(prev => ({ ...prev, displayName: event.target.value }))}
                  required
                  maxLength={80}
                  className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-purple-300/30"
                />
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-purple-300/65">{t.password}</span>
              <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white focus-within:border-purple-300/35">
                <KeyRound size={15} className="text-purple-300/60" />
                <input
                  type="password"
                  value={newAccount.password}
                  onChange={event => setNewAccount(prev => ({ ...prev, password: event.target.value }))}
                  required
                  minLength={6}
                  className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-purple-300/30"
                />
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-purple-300/65">{t.status}</span>
              <select
                value={newAccount.entitlement}
                onChange={event => setNewAccount(prev => ({ ...prev, entitlement: event.target.value as AdminEntitlement }))}
                className="h-[42px] rounded-lg border border-white/10 bg-black/35 px-3 text-xs font-bold uppercase tracking-[0.08em] text-white outline-none focus:border-purple-300/35"
              >
                <option value="free">Free</option>
                <option value="paid_beta">Beta</option>
                <option value="founder">Founder</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>

            <label className="flex h-[42px] cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/35 px-3 text-xs font-bold uppercase tracking-[0.1em] text-purple-100">
              <span>{t.confirmEmail}</span>
              <input
                type="checkbox"
                checked={newAccount.emailConfirm}
                onChange={event => setNewAccount(prev => ({ ...prev, emailConfirm: event.target.checked }))}
                className="h-4 w-4 accent-purple-500"
              />
            </label>

            <button
              type="submit"
              disabled={creatingAccount || databaseStatus === 'disabled'}
              className="flex h-[42px] items-center justify-center gap-2 rounded-lg border border-emerald-200/20 bg-emerald-400/12 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100 transition-all hover:bg-emerald-400/20 disabled:opacity-50"
            >
              <UserPlus size={14} />
              {creatingAccount ? <RefreshCw size={14} className="animate-spin" /> : t.create}
            </button>
          </div>
        </form>

        <section className="overflow-x-auto rounded-lg border border-purple-500/15 bg-[#0d0615]/86">
          <table className="min-w-[1620px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-purple-500/15 text-[10px] font-bold uppercase tracking-[0.16em] text-purple-300">
                <th className="px-4 py-3">{t.account}</th>
                <th className="px-4 py-3">{t.auth}</th>
                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3">{t.usage}</th>
                <th className="px-4 py-3">Beta</th>
                <th className="px-4 py-3">{t.communication}</th>
                <th className="px-4 py-3">{t.council}</th>
                <th className="px-4 py-3">{t.blueprint}</th>
                <th className="px-4 py-3">{t.offline}</th>
                <th className="px-4 py-3">{t.lastSignIn}</th>
                <th className="px-4 py-3">{t.updated}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && accounts.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-sm text-purple-200/70">
                    <RefreshCw size={18} className="mx-auto mb-3 animate-spin text-purple-300" />
                    {t.loading}
                  </td>
                </tr>
              )}

              {!loading && visibleAccounts.length === 0 && !error && (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-sm text-purple-200/60">
                    {t.empty}
                  </td>
                </tr>
              )}

              {visibleAccounts.map(account => {
                const usage = getUsage(account);
                return (
                <tr key={account.userId} className="border-b border-purple-500/10 text-purple-100/80 last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{account.displayName}</div>
                    <div className="mt-1 text-xs text-purple-300/45">{account.username || account.userId}</div>
                    <div className="mt-1 font-mono text-[10px] text-purple-300/30">{account.userId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                      account.emailConfirmedAt
                        ? 'border-emerald-200/25 bg-emerald-300/10 text-emerald-100'
                        : 'border-amber-200/25 bg-amber-300/10 text-amber-100'
                    }`}>
                      {account.emailConfirmedAt ? 'Confirmed' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={account.entitlement}
                      onChange={event => patchAccount(account.userId, { entitlement: event.target.value as AdminEntitlement })}
                      className="rounded border border-white/10 bg-black/35 px-2 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white outline-none"
                    >
                      <option value="free">Free</option>
                      <option value="paid_beta">Beta</option>
                      <option value="founder">Founder</option>
                      <option value="blocked">Blocked</option>
                    </select>
                    {account.entitlement === 'founder' && (
                      <Crown size={14} className="ml-2 inline text-amber-200" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="grid w-64 grid-cols-2 gap-2">
                      <div className="rounded border border-white/10 bg-black/25 px-2 py-1.5">
                        <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-purple-300/45">{t.total}</div>
                        <div className="font-bold text-white">{formatNumber(usage.totalInteractions)}</div>
                      </div>
                      <div className="rounded border border-white/10 bg-black/25 px-2 py-1.5">
                        <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-purple-300/45">{t.week}</div>
                        <div className="font-bold text-white">{formatNumber(usage.weeklyInteractions)}</div>
                      </div>
                      <div className="rounded border border-white/10 bg-black/25 px-2 py-1.5">
                        <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-purple-300/45">
                          <MessageCircle size={10} />
                          {t.chat}
                        </div>
                        <div className="font-bold text-white">{formatNumber(usage.directChatReplies)}</div>
                      </div>
                      <div className="rounded border border-white/10 bg-black/25 px-2 py-1.5">
                        <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-purple-300/45">{t.council}</div>
                        <div className="font-bold text-white">{formatNumber(usage.councilSessions)}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-purple-300/45">
                      {t.userInputs}: {formatNumber(usage.persistedUserMessages)} · {t.messages}: {formatNumber(usage.persistedMessages)} · {t.lastInteraction}: {formatDateTime(usage.lastInteractionAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="datetime-local"
                      value={account.activeUntil ? account.activeUntil.slice(0, 16) : ''}
                      onChange={event => patchAccount(account.userId, {
                        activeUntil: event.target.value ? new Date(event.target.value).toISOString() : null,
                      })}
                      className="w-44 rounded border border-white/10 bg-black/35 px-2 py-2 text-xs text-white outline-none placeholder:text-purple-300/30 focus:border-purple-300/35"
                    />
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-purple-300/45">
                      <span>{account.betaActivations || 0}x</span>
                      <button
                        onClick={() => patchAccount(account.userId, { betaBonusUsed: !account.betaBonusUsed })}
                        className={`rounded border px-2 py-1 uppercase tracking-[0.1em] ${
                          account.betaBonusUsed
                            ? 'border-amber-200/25 text-amber-100'
                            : 'border-white/10 text-purple-300/45'
                        }`}
                      >
                        Bonus
                      </button>
                    </div>
                  </td>
                  {[
                    ['weeklyFreeInteractions', account.limits.weeklyFreeInteractions],
                    ['weeklyCouncilSessions', account.limits.weeklyCouncilSessions],
                    ['weeklyMeaningAnalyses', account.limits.weeklyMeaningAnalyses],
                  ].map(([key, value]) => (
                    <td key={key as string} className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        value={value === null ? '' : String(value)}
                        onChange={event => patchLimit(account.userId, key as keyof AdminAccount['limits'], event.target.value)}
                        placeholder="default"
                        className="w-24 rounded border border-white/10 bg-black/35 px-2 py-2 text-xs text-white outline-none placeholder:text-purple-300/30 focus:border-purple-300/35"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => patchAccount(account.userId, { offlineOnly: !account.offlineOnly })}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-all ${
                        account.offlineOnly
                          ? 'border-sky-200/35 bg-sky-300/12 text-sky-100'
                          : 'border-white/10 bg-white/[0.03] text-purple-300/45'
                      }`}
                    >
                      <Database size={12} />
                      {account.offlineOnly ? 'Local' : 'DB'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-purple-300/50">{formatDateTime(account.lastSignInAt)}</td>
                  <td className="px-4 py-3 text-xs text-purple-300/50">{formatDateTime(account.updatedAt || account.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveAccount(account)}
                        disabled={savingUserId === account.userId || deletingUserId === account.userId}
                        className="flex items-center gap-2 rounded-lg border border-emerald-200/20 bg-emerald-400/12 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100 transition-all hover:bg-emerald-400/20 disabled:opacity-50"
                      >
                        <Save size={13} />
                        {savingUserId === account.userId ? <RefreshCw size={13} className="animate-spin" /> : t.save}
                      </button>
                      <button
                        onClick={() => removeAccount(account)}
                        disabled={savingUserId === account.userId || deletingUserId === account.userId}
                        className="flex items-center gap-2 rounded-lg border border-red-200/20 bg-red-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-red-100 transition-all hover:bg-red-500/20 disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        {deletingUserId === account.userId ? <RefreshCw size={13} className="animate-spin" /> : t.delete}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};
