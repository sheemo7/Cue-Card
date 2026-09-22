import React, { useEffect, useState } from 'react';
import { X, Volume2, Check, Headphones, Info } from 'lucide-react';

interface AudioOutputModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDeviceId: string | null;
  onSelectDevice: (deviceId: string | null, label: string) => void;
}

export const AudioOutputModal: React.FC<AudioOutputModalProps> = ({
  isOpen,
  onClose,
  currentDeviceId,
  onSelectDevice,
}) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const checkDevices = async () => {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
        setIsSupported(false);
        return;
      }

      // Check setSinkId support
      const hasSetSinkId = 'setSinkId' in HTMLAudioElement.prototype;
      setIsSupported(hasSetSinkId);

      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = allDevices.filter((d) => d.kind === 'audiooutput');
        setDevices(audioOutputs);
      } catch (err) {
        console.warn('Failed to enumerate audio devices:', err);
      }
    };

    checkDevices();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1d1a17] border border-[#322d28] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#322d28] pb-3">
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-[#c58b4a]" />
            <h2 className="text-base font-bold text-[#ece6da] uppercase tracking-wider">
              Audio Output Routing
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#8d8478] hover:text-[#ece6da]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#8d8478] leading-relaxed">
          Select which speaker, in-ear monitor, or connected Bluetooth earpiece receives the cue prompter audio.
        </p>

        {/* Device List */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => {
              onSelectDevice(null, 'Default audio output');
              onClose();
            }}
            className={`w-full p-3 border text-left flex items-center justify-between text-xs transition-colors ${
              !currentDeviceId
                ? 'border-[#c58b4a] bg-[#262220] text-[#ece6da]'
                : 'border-[#322d28] bg-[#121110] text-[#8d8478] hover:border-[#4a4138]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#c58b4a]" />
              <span className="font-bold">System Default Output</span>
            </div>
            {!currentDeviceId && <Check className="w-4 h-4 text-[#c58b4a]" />}
          </button>

          {devices.map((device, idx) => {
            const isSelected = currentDeviceId === device.deviceId;
            return (
              <button
                key={device.deviceId || idx}
                type="button"
                onClick={() => {
                  onSelectDevice(device.deviceId, device.label || `Output Device ${idx + 1}`);
                  onClose();
                }}
                className={`w-full p-3 border text-left flex items-center justify-between text-xs transition-colors ${
                  isSelected
                    ? 'border-[#c58b4a] bg-[#262220] text-[#ece6da]'
                    : 'border-[#322d28] bg-[#121110] text-[#8d8478] hover:border-[#4a4138]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-[#c58b4a]" />
                  <span className="font-bold truncate max-w-[260px]">
                    {device.label || `Audio Device ${idx + 1}`}
                  </span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#c58b4a]" />}
              </button>
            );
          })}
        </div>

        {/* Note on Mobile & Bluetooth */}
        <div className="p-3 bg-[#121110] border border-[#322d28] flex items-start gap-2 text-xs text-[#8d8478]">
          <Info className="w-4 h-4 text-[#c58b4a] flex-none mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#ece6da]">Bluetooth in-ear tip:</strong> When using wireless earbuds on phones or tablets, connecting via your device's Bluetooth menu automatically routes in-ear cues directly.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 border border-[#322d28] hover:bg-[#262220] text-[#ece6da] text-xs font-bold uppercase tracking-wider"
        >
          Close
        </button>
      </div>
    </div>
  );
};
