import React, { useEffect, useState } from 'react';
import { Crown, Database, RefreshCw, Save, Shield } from 'lucide-react';
import { AdminAccount, AdminEntitlement, getAdminAccounts, updateAdminAccount } from '../services/adminService';
import { Language } from '../types';

interface AdminInterfaceProps {
  language: Language;
}

const copy = {
  EN: {
    title: 'Admin',
    subtitle: 'Accounts, limits, and staging markers.',
    refresh: 'Refresh',
    save: 'Save',
    account: 'Account',
    status: 'Status',
    communication: 'Communication',
    council: 'Council',
    blueprint: 'Blueprint',
    offline: 'Offline',
    updated: 'Updated',
    noAccess: 'Admin access is not active for this account.',
    dbDisabled: 'Database is not configured on this backend.',
  },
  DE: {
    title: 'Admin',
    subtitle: 'Konten, Limits und Staging-Marker.',
    refresh: 'Aktualisieren',
    save: 'Speichern',
    account: 'Konto',
    status: 'Status',
    communication: 'Kommunikation',
    council: 'Council',
    blueprint: 'Blueprint',
    offline: 'Offline',
    updated: 'Aktualisiert',
    noAccess: 'Admin-Zugang ist fuer dieses Konto nicht aktiv.',
    dbDisabled: 'Die Datenbank ist auf diesem Backend nicht konfiguriert.',
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

export const AdminInterface: React.FC<AdminInterfaceProps> = ({ language }) => {
  const t = copy[language];
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [databaseStatus, setDatabaseStatus] = useState<'configured' | 'disabled'>('configured');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

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

        <section className="overflow-x-auto rounded-lg border border-purple-500/15 bg-[#0d0615]/86">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-purple-500/15 text-[10px] font-bold uppercase tracking-[0.16em] text-purple-300">
                <th className="px-4 py-3">{t.account}</th>
                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3">{t.communication}</th>
                <th className="px-4 py-3">{t.council}</th>
                <th className="px-4 py-3">{t.blueprint}</th>
                <th className="px-4 py-3">{t.offline}</th>
                <th className="px-4 py-3">{t.updated}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {accounts.map(account => (
                <tr key={account.userId} className="border-b border-purple-500/10 text-purple-100/80 last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{account.displayName}</div>
                    <div className="mt-1 text-xs text-purple-300/45">{account.username || account.userId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={account.entitlement}
                      onChange={event => patchAccount(account.userId, { entitlement: event.target.value as AdminEntitlement })}
                      className="rounded border border-white/10 bg-black/35 px-2 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white outline-none"
                    >
                      <option value="free">Free</option>
                      <option value="founder">Founder</option>
                      <option value="blocked">Blocked</option>
                    </select>
                    {account.entitlement === 'founder' && (
                      <Crown size={14} className="ml-2 inline text-amber-200" />
                    )}
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
                  <td className="px-4 py-3 text-xs text-purple-300/50">{formatDate(account.updatedAt || account.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => saveAccount(account)}
                      disabled={savingUserId === account.userId}
                      className="flex items-center gap-2 rounded-lg border border-emerald-200/20 bg-emerald-400/12 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100 transition-all hover:bg-emerald-400/20 disabled:opacity-50"
                    >
                      <Save size={13} />
                      {t.save}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};
