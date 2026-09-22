export interface RecordResult {
  blob: Blob;
  duration: number;
  url: string;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private recordedChunks: Blob[] = [];
  private startTime = 0;
  private isRecording = false;

  public onVolumeUpdate?: (volume: number) => void;

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public async start(): Promise<boolean> {
    this.recordedChunks = [];
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Set up AudioContext for real-time waveform & volume analysis
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.audioStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
      }

      // Determine supported mimeType
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg',
      ];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const options = selectedMime ? { mimeType: selectedMime } : undefined;
      this.mediaRecorder = new MediaRecorder(this.audioStream, options);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100);
      this.startTime = Date.now();
      this.isRecording = true;
      return true;
    } catch (err) {
      console.error('Error starting audio recording:', err);
      this.cleanup();
      return false;
    }
  }

  public stop(): Promise<RecordResult | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        this.cleanup();
        resolve(null);
        return;
      }

      const duration = (Date.now() - this.startTime) / 1000;

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        this.cleanup();
        resolve({
          blob,
          duration: Math.max(0.5, duration),
          url,
        });
      };

      try {
        this.mediaRecorder.stop();
      } catch {
        this.cleanup();
        resolve(null);
      }
      this.isRecording = false;
    });
  }

  public cancel(): void {
    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.isRecording = false;
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
  }
}
