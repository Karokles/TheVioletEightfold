import React, { useEffect, useState } from 'react';
import { login as localLogin } from '../services/aiService';
import { consumeSupabaseAuthRedirect, hasSupabaseAuthRedirectParams, isSupabaseAuthAvailable, resendSignupConfirmation, signInWithEmail } from '../services/supabaseAuth';
import { setCurrentUser } from '../services/userService';
import { getUIText } from '../config/loader';
import { Language } from '../types';
import { LogIn, Sparkles } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  language: Language;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, language }) => {
  const authMode = import.meta.env.VITE_AUTH_MODE || 'local';
  const supabaseEnabled = authMode === 'supabase' && isSupabaseAuthAvailable;
  const supabaseMisconfigured = authMode === 'supabase' && !isSupabaseAuthAvailable;
  const [formMode, setFormMode] = useState<'signIn' | 'local'>(supabaseEnabled ? 'signIn' : 'local');
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState('');

  const ui = getUIText(language);
  const normalizeEmailInput = (value: string) => value.trim().toLowerCase();

  const confirmedMessage = language === 'DE'
    ? 'Email bestaetigt. Du wirst angemeldet...'
    : 'Email confirmed. Signing you in...';
  const resendMessage = language === 'DE'
    ? 'Bestaetigungs-Email erneut gesendet.'
    : 'Confirmation email sent again.';
  const notConfirmedMessage = language === 'DE'
    ? 'Diese Email ist noch nicht bestaetigt. Pruefe dein Postfach oder sende die Bestaetigung erneut.'
    : 'This email is not confirmed yet. Check your inbox or resend the confirmation.';
  const invalidApiKeyMessage = language === 'DE'
    ? 'Der Live-Login ist gerade falsch konfiguriert. Der Supabase Publishable Key passt nicht zum aktiven Projekt.'
    : 'Live login is misconfigured right now. The Supabase publishable key does not match the active project.';

  const normalizeAuthErrorMessage = (rawMessage: string) => {
    if (/invalid api key/i.test(rawMessage)) {
      return invalidApiKeyMessage;
    }
    return rawMessage;
  };

  useEffect(() => {
    if (!supabaseEnabled || !hasSupabaseAuthRedirectParams()) return;

    let isMounted = true;
    setLoading(true);
    setMessage(language === 'DE' ? 'Email-Bestaetigung wird verarbeitet...' : 'Processing email confirmation...');
    setError('');

    consumeSupabaseAuthRedirect()
      .then(authResult => {
        if (!isMounted) return;
        if (authResult) {
          setMessage(confirmedMessage);
          setCurrentUser(authResult.userId, authResult.token, authResult.displayName || authResult.email || email);
          onLoginSuccess();
          return;
        }

        setMessage(language === 'DE' ? 'Email bestaetigt. Du kannst dich jetzt anmelden.' : 'Email confirmed. You can sign in now.');
        setFormMode('signIn');
      })
      .catch(err => {
        if (!isMounted) return;
        setError(err.message || (language === 'DE' ? 'Email-Bestaetigung fehlgeschlagen.' : 'Email confirmation failed.'));
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [confirmedMessage, email, language, onLoginSuccess, supabaseEnabled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (formMode === 'signIn') {
        const normalizedEmail = normalizeEmailInput(email);
        const authResult = await signInWithEmail(normalizedEmail, secret);
        setCurrentUser(authResult.userId, authResult.token, authResult.displayName || authResult.email || normalizedEmail);
      } else {
        const authResult = await localLogin(username, secret);
        setCurrentUser(authResult.userId, authResult.token, authResult.displayName || username);
      }
      onLoginSuccess();
    } catch (err: any) {
      const message = normalizeAuthErrorMessage(err.message || ui.LOGIN_ERROR);
      if (formMode === 'signIn' && message.toLowerCase().includes('email not confirmed')) {
        setPendingConfirmationEmail(normalizeEmailInput(email));
        setError(notConfirmedMessage);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const targetEmail = normalizeEmailInput(pendingConfirmationEmail || email);
    if (!targetEmail) return;

    setError('');
    setMessage('');
    setResending(true);

    try {
      await resendSignupConfirmation(targetEmail);
      setPendingConfirmationEmail(targetEmail);
      setMessage(resendMessage);
    } catch (err: any) {
      setError(
        normalizeAuthErrorMessage(
          err.message || (language === 'DE' ? 'Bestaetigungs-Email konnte nicht gesendet werden.' : 'Could not send confirmation email.')
        )
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-violet-950 text-violet-100 font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-purple-500/35 rounded-full blur-md animate-pulse-slow" />
            <div className="w-full h-full border border-purple-400/60 rounded-full animate-spin-slow" />
            <div className="absolute w-[70%] h-[70%] border border-purple-300/80 rounded-full rotate-45" />
            <div className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_16px_rgba(255,255,255,0.95)] animate-pulse-slow" />
          </div>
          <h1 className="text-3xl font-bold tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-r from-purple-100 via-fuchsia-200 to-purple-100 uppercase mb-2">
            {ui.APP_TITLE}
          </h1>
          <p className="text-sm text-purple-400/60 tracking-[0.3em] font-light uppercase">
            {ui.SUBTITLE}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-[#0f0716]/90 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 shadow-2xl animate-fade-in-up">
          <h2 className="text-xl font-bold text-center mb-6 text-purple-200 tracking-wide">
            {ui.LOGIN_TITLE}
          </h2>

          {supabaseEnabled && (
            <div className="mb-6 rounded-lg border border-purple-500/20 bg-violet-950/45 px-4 py-3 text-center text-sm text-purple-200/80">
              {language === 'DE'
                ? 'Konten werden vorerst nur ueber das Admin-Panel erstellt.'
                : 'Accounts are currently created by an administrator only.'}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-emerald-900/20 border border-emerald-400/30 rounded-lg text-emerald-200 text-sm">
              {message}
            </div>
          )}

          {supabaseEnabled && pendingConfirmationEmail && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resending || loading}
              className="mb-4 w-full rounded-lg border border-purple-400/25 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-100 transition-all hover:border-purple-300/45 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resending
                ? (language === 'DE' ? 'Sende...' : 'Sending...')
                : (language === 'DE' ? 'Bestaetigung erneut senden' : 'Resend confirmation')}
            </button>
          )}

          {supabaseMisconfigured && (
            <div className="mb-4 p-3 bg-amber-900/20 border border-amber-400/30 rounded-lg text-amber-200 text-sm">
              Supabase Auth is selected for this environment, but the frontend Supabase URL or publishable key is missing.
            </div>
          )}

          <div className="space-y-4">
            {formMode === 'local' ? (
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  {ui.LOGIN_USERNAME}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-violet-950/50 border border-purple-500/20 rounded-lg text-violet-100 placeholder-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                  placeholder={ui.LOGIN_USERNAME}
                  required
                  disabled={loading}
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-violet-950/50 border border-purple-500/20 rounded-lg text-violet-100 placeholder-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                  />
                </div>

              </>
            )}

            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">
                {formMode === 'local' ? ui.LOGIN_SECRET : 'Password'}
              </label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full px-4 py-3 bg-violet-950/50 border border-purple-500/20 rounded-lg text-violet-100 placeholder-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                placeholder={ui.LOGIN_SECRET}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={supabaseMisconfigured || loading || !secret || (formMode === 'local' ? !username : !email)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold uppercase tracking-widest rounded-lg shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {loading ? (
                <>
                  <Sparkles className="animate-spin" size={20} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>{ui.LOGIN_BUTTON}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {formMode === 'local' && !supabaseMisconfigured && (
          <p className="text-center text-xs text-purple-500/40 mt-6">
            Test users: friend1-friend5 (secrets: secret1-secret5)
          </p>
        )}
      </div>
    </div>
  );
};











