import React, { useState } from 'react';
import { login } from '../services/aiService';
import { setCurrentUser } from '../services/userService';
import { getUIText } from '../config/loader';
import { Language } from '../types';
import { LogIn, Sparkles } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  language: Language;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, language }) => {
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ui = getUIText(language);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { userId, token } = await login(username, secret);
      setCurrentUser(userId, token);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || ui.LOGIN_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-violet-950 text-violet-100 font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-md animate-pulse-slow" />
            <div className="w-full h-full border border-purple-500/30 rounded-full animate-spin-slow" />
            <div className="absolute w-[70%] h-[70%] border border-purple-400/50 rounded-full rotate-45" />
            <div className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse-slow" />
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

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">
                {ui.LOGIN_SECRET}
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
              disabled={loading || !username || !secret}
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

        <p className="text-center text-xs text-purple-500/40 mt-6">
          Test users: friend1-friend5 (secrets: secret1-secret5)
        </p>
      </div>
    </div>
  );
};









