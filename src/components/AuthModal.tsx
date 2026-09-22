import React, { useState } from 'react';
import {
  X,
  LogIn,
  LogOut,
  User as UserIcon,
  Cloud,
  CheckCircle,
  Database,
  ShieldCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { User, signInWithGoogle, signOutUser } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onShowToast: (msg: string) => void;
  onSyncNow?: () => void;
  isSyncing?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onShowToast,
  onSyncNow,
  isSyncing = false,
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      onShowToast(`Signed in as ${user.displayName || user.email}`);
    } catch (err: any) {
      console.error('Sign in failed:', err);
      onShowToast(err.message || 'Google sign-in could not be completed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutUser();
      onShowToast('Signed out successfully.');
    } catch (err: any) {
      console.error('Sign out failed:', err);
      onShowToast('Error signing out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#161412] border border-[#383028] shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2d2722] pb-3">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#c58b4a]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#ece6da]">
              Firebase Cloud Sync & Auth
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#8d8478] hover:text-[#ece6da] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="p-3 bg-[#1d1916] border border-[#383028] flex items-center gap-3">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-10 h-10 rounded-full border border-[#c58b4a]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#2d2620] border border-[#423930] flex items-center justify-center text-[#c58b4a]">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[#ece6da] truncate">
                  {currentUser.displayName || 'Google Account'}
                </div>
                <div className="text-[11px] font-mono text-[#8d8478] truncate">
                  {currentUser.email}
                </div>
              </div>
            </div>

            {/* Cloud Status */}
            <div className="p-3 bg-[#141210] border border-[#2d2824] space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#599e82] font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Firestore Persistence Active</span>
                </span>
                <span className="text-[10px] font-mono text-[#8d8478]">Zero-Trust ABAC</span>
              </div>
              <p className="text-[#8d8478] text-[11px] leading-relaxed">
                Your rehearsal decks, custom tags, and in-ear configurations sync automatically to your
                private Firestore collection across devices.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {onSyncNow && (
                <button
                  type="button"
                  onClick={onSyncNow}
                  disabled={isSyncing}
                  className="flex-1 py-2 px-3 border border-[#c58b4a] bg-[#1d1a17] hover:bg-[#262220] text-[#ece6da] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#c58b4a] ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="py-2 px-3 border border-[#c4554a]/40 bg-[#1d1a17] hover:bg-[#c4554a]/10 text-[#c4554a] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-[#1a1714] border border-[#2d2722] space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#c58b4a] font-bold">
                <Database className="w-4 h-4" />
                <span>Sync Decks Across Phone & Desktop</span>
              </div>
              <p className="text-[#8d8478] text-xs leading-relaxed">
                Sign in with Google to securely persist your cue soundboards, KJV scripture rebuttal drills,
                and session markers in Firebase Firestore.
              </p>
              <div className="flex items-center gap-1 text-[11px] text-[#599e82] pt-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Google OAuth & Zero-Trust Cloud Storage</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#c58b4a] hover:bg-[#d4a359] text-[#171208] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-md disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Google</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
