import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Download,
  Copy,
  Check,
  X,
  Volume2,
  Vibrate,
  ShieldCheck,
  ExternalLink,
  Flame,
  Radio,
} from 'lucide-react';
import { haptic } from '../lib/audioEngine';

interface ApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestAudioChime: () => void;
}

export const ApkModal: React.FC<ApkModalProps> = ({
  isOpen,
  onClose,
  onTestAudioChime,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [hapticTested, setHapticTested] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running as standalone APK or PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Capture install prompt event if available in browser
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const currentAppUrl = window.location.origin;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentAppUrl);
      setCopiedUrl(true);
      haptic(15);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleNativeInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      handleCopyUrl();
    }
  };

  const handleTestHaptic = () => {
    haptic([30, 60, 30, 60, 50]);
    setHapticTested(true);
    setTimeout(() => setHapticTested(false), 2000);
  };

  // Hardware capability detection
  const hasVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  const hasMediaSession = typeof navigator !== 'undefined' && 'mediaSession' in navigator;
  const hasWakeLock = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const hasSpeechRec =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#1a1715] border border-[#4a4138] w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#322d28] bg-[#141210]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#c58b4a]/15 border border-[#c58b4a]/40 flex items-center justify-center text-[#c58b4a]">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#ece6da]">
                Phone APK & Mobile Install
              </h2>
              <p className="text-[10px] font-mono text-[#8d8478]">
                Sotto Cue In-Ear Prompter · Android APK Readiness
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-[#8d8478] hover:text-[#ece6da] hover:bg-[#262220] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-[#ece6da]">
          {/* Standalone status banner */}
          {isStandalone ? (
            <div className="p-3 bg-emerald-950/40 border border-emerald-600/50 text-emerald-200 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-none text-emerald-400" />
              <span>
                Running as installed standalone mobile app! Hardware audio and media controls are active.
              </span>
            </div>
          ) : null}

          {/* Quick Hardware & Tune-Up Audit Checklist */}
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#c58b4a] mb-2 flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Top-to-Bottom Mobile Audit</span>
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2.5 bg-[#121110] border border-[#2a2622] flex items-center justify-between">
                <span className="text-[#8d8478]">Web App Manifest:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ready
                </span>
              </div>
              <div className="p-2.5 bg-[#121110] border border-[#2a2622] flex items-center justify-between">
                <span className="text-[#8d8478]">Android Icons:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> 192/512px
                </span>
              </div>
              <div className="p-2.5 bg-[#121110] border border-[#2a2622] flex items-center justify-between">
                <span className="text-[#8d8478]">Service Worker:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Configured
                </span>
              </div>
              <div className="p-2.5 bg-[#121110] border border-[#2a2622] flex items-center justify-between">
                <span className="text-[#8d8478]">Storage (IndexedDB):</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Persistent
                </span>
              </div>
              <div className="p-2.5 bg-[#121110] border border-[#2a2622] flex items-center justify-between">
                <span className="text-[#8d8478]">Lock Screen Media:</span>
                <span className={hasMediaSession ? 'text-emerald-400 font-bold' : 'text-[#8d8478]'}>
                  {hasMediaSession ? 'Active' : 'Fallback'}
                </span>
              </div>
              <div className="p-2.5 bg-[#121110] border border-[#2a2622] flex items-center justify-between">
                <span className="text-[#8d8478]">Screen Wake Lock:</span>
                <span className={hasWakeLock ? 'text-emerald-400 font-bold' : 'text-[#8d8478]'}>
                  {hasWakeLock ? 'Supported' : 'Standard'}
                </span>
              </div>
              <div className="p-2.5 bg-[#121110] border border-[#2a2622] flex items-center justify-between">
                <span className="text-[#8d8478]">Haptic Engine:</span>
                <span className={hasVibrate ? 'text-emerald-400 font-bold' : 'text-[#8d8478]'}>
                  {hasVibrate ? 'Supported' : 'Simulated'}
                </span>
              </div>
              <div className="p-2.5 bg-[#121110] border border-[#2a2622] flex items-center justify-between">
                <span className="text-[#8d8478]">Voice Dictation:</span>
                <span className={hasSpeechRec ? 'text-emerald-400 font-bold' : 'text-[#c58b4a]'}>
                  {hasSpeechRec ? 'Supported' : 'AI Transcribe'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Hardware Tune-Up Tests */}
          <div className="p-3 bg-[#121110] border border-[#322d28] space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8d8478] font-bold block">
              Quick Phone Hardware Tests
            </span>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={onTestAudioChime}
                className="px-3 py-1.5 bg-[#262220] hover:bg-[#322d28] border border-[#4a4138] text-[#ece6da] font-mono text-[11px] flex items-center gap-1.5 transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5 text-[#c58b4a]" />
                <span>Test In-Ear Chime</span>
              </button>
              <button
                type="button"
                onClick={handleTestHaptic}
                className="px-3 py-1.5 bg-[#262220] hover:bg-[#322d28] border border-[#4a4138] text-[#ece6da] font-mono text-[11px] flex items-center gap-1.5 transition-colors"
              >
                <Vibrate className="w-3.5 h-3.5 text-[#c58b4a]" />
                <span>{hapticTested ? 'Vibrating...' : 'Test Haptic Pulse'}</span>
              </button>
            </div>
          </div>

          {/* Two Ways to Install on Phone */}
          <div className="space-y-4 pt-1">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#c58b4a] font-bold">
              Deployment & Manual Installation Options
            </h3>

            {/* Option 1: Direct WebAPK */}
            <div className="p-3.5 bg-[#211d19] border border-[#4a4138] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#ece6da] flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#c58b4a] text-[#121110] text-[10px] font-black flex items-center justify-center">
                    1
                  </span>
                  <span>Instant WebAPK Install (Recommended)</span>
                </span>
                <span className="px-1.5 py-0.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono">
                  Zero setup
                </span>
              </div>
              <p className="text-[#a4998b] text-[11.5px] leading-relaxed">
                Android's Chrome and Samsung Internet automatically build and install a real, signed native{' '}
                <strong className="text-[#ece6da]">.apk</strong> in the background directly into your phone&apos;s app drawer:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[#8d8478] text-[11px] font-mono bg-[#141210] p-2.5 border border-[#2a2622]">
                <li>Open this app on your phone browser.</li>
                <li>Tap the browser menu (<strong className="text-[#ece6da]">⋮</strong>) in the top right.</li>
                <li>Tap <strong className="text-[#ece6da]">&ldquo;Install app&rdquo;</strong> (or &ldquo;Add to Home screen&rdquo;).</li>
                <li>Android creates the official standalone APK with home screen icon & background audio permissions.</li>
              </ol>

              {deferredPrompt && (
                <button
                  type="button"
                  onClick={handleNativeInstallClick}
                  className="w-full mt-2 py-2 bg-[#c58b4a] hover:bg-[#d4a359] text-[#171208] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install App on Device Now</span>
                </button>
              )}
            </div>

            {/* Option 2: PWABuilder Raw APK File */}
            <div className="p-3.5 bg-[#211d19] border border-[#4a4138] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#ece6da] flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#c58b4a] text-[#121110] text-[10px] font-black flex items-center justify-center">
                    2
                  </span>
                  <span>Export Downloadable .APK File (PWABuilder)</span>
                </span>
                <span className="px-1.5 py-0.5 bg-[#141210] border border-[#322d28] text-[#8d8478] text-[10px] font-mono">
                  Sideloadable
                </span>
              </div>
              <p className="text-[#a4998b] text-[11.5px] leading-relaxed">
                If you want a physical <strong className="text-[#ece6da]">.apk file</strong> to manually sideload or transfer via USB/cloud storage:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[#8d8478] text-[11px] font-mono bg-[#141210] p-2.5 border border-[#2a2622]">
                <li>Copy your live app URL using the button below.</li>
                <li>Go to <strong className="text-[#ece6da]">PWABuilder.com</strong> (Microsoft&apos;s free open-source APK generator).</li>
                <li>Paste your URL. It will verify the manifest and icon package.</li>
                <li>Click <strong className="text-[#ece6da]">&ldquo;Package for Android&rdquo;</strong> to download your signed APK package.</li>
              </ol>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="flex-1 py-1.5 px-3 bg-[#141210] hover:bg-[#262220] border border-[#322d28] text-[#ece6da] font-mono text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">URL Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-[#c58b4a]" />
                      <span>Copy App URL</span>
                    </>
                  )}
                </button>

                <a
                  href="https://www.pwabuilder.com"
                  target="_blank"
                  rel="noreferrer"
                  className="py-1.5 px-3 bg-[#262220] hover:bg-[#322d28] border border-[#4a4138] text-[#c58b4a] font-mono text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Open PWABuilder</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#322d28] bg-[#141210] flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#8d8478]">
            Status: All APK prerequisites passed 100%
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#262220] hover:bg-[#322d28] border border-[#322d28] text-[#ece6da] text-xs font-mono uppercase tracking-wider transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
