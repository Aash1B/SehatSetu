import { useState, useRef, useCallback } from 'react';
import { extractMedicalInfo } from '../services/aiApi';

export interface LiveAudioState {
  isRecording: boolean;
  transcript: string;
  symptoms: string[];
  medicines: string[];
  labTests: string[];
  error: string | null;
}

export function useLiveAudioTranscription() {
  const [state, setState] = useState<LiveAudioState>({
    isRecording: false,
    transcript: '',
    symptoms: [],
    medicines: [],
    labTests: [],
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isRecording: true, error: null }));

      // Web Speech API for real-time speech-to-text fallback
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = async (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }

          if (currentTranscript.trim()) {
            setState(prev => ({
              ...prev,
              transcript: currentTranscript,
            }));

            // Extract AI Medical Entities live from transcript
            try {
              const res = await extractMedicalInfo(currentTranscript);
              if (res && res.data) {
                const syms = res.data.symptoms?.map(s => s.name) || [];
                const meds = res.data.medications?.map(m => `${m.name} ${m.dosage || ''}`.trim()) || [];
                const labs = res.data.lab_tests?.map(l => l.name) || [];

                setState(prev => ({
                  ...prev,
                  symptoms: Array.from(new Set([...prev.symptoms, ...syms])),
                  medicines: Array.from(new Set([...prev.medicines, ...meds])),
                  labTests: Array.from(new Set([...prev.labTests, ...labs])),
                }));
              }
            } catch (e) {
              console.error('Live AI Extraction Error:', e);
            }
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech Recognition notice:', e.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      // Also acquire Microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      recorder.start(3000); // 3-second slices
    } catch (err: any) {
      console.error('Microphone error:', err);
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: err.message || 'Microphone access denied',
      }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setState(prev => ({ ...prev, isRecording: false }));
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
  };
}
