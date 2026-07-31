"use strict";

const elements = {
  start: document.querySelector("#startButton"),
  pause: document.querySelector("#pauseButton"),
  resume: document.querySelector("#resumeButton"),
  stop: document.querySelector("#stopButton"),
  send: document.querySelector("#sendButton"),
  reset: document.querySelector("#resetButton"),
  file: document.querySelector("#fileInput"),
  preview: document.querySelector("#audioPreview"),
  timer: document.querySelector("#timer"),
  loading: document.querySelector("#loading"),
  error: document.querySelector("#errorMessage"),
  result: document.querySelector("#result"),
  transcript: document.querySelector("#transcript"),
  language: document.querySelector("#language"),
  includeSegments: document.querySelector("#includeSegments"),
  detectedLanguage: document.querySelector("#detectedLanguage"),
  processingTime: document.querySelector("#processingTime"),
  chunkDuration: document.querySelector("#chunkDuration"),
  connectionStatus: document.querySelector("#connectionStatus"),
  chunkSequence: document.querySelector("#chunkSequence"),
  liveLanguage: document.querySelector("#liveLanguage"),
  streamProcessing: document.querySelector("#streamProcessing"),
  liveTranscript: document.querySelector("#liveTranscript"),
  finalTranscript: document.querySelector("#finalTranscript"),
  reconnect: document.querySelector("#reconnectButton"),
  recordingMimeType: document.querySelector("#recordingMimeType"),
  recordedBlobSize: document.querySelector("#recordedBlobSize"),
  microphoneName: document.querySelector("#microphoneName"),
  inputLevel: document.querySelector("#inputLevel"),
  chunkStatus: document.querySelector("#chunkStatus"),
};

let recorder = null;
let microphoneStream = null;
let selectedAudio = null;
let previewUrl = null;
let timerId = null;
let recordingStartedAt = 0;
let busy = false;
let liveSocket = null;
let liveSessionId = null;
let liveSequence = 1;
let chunkStartedAt = 0;
let liveChunkQueue = [];
let activeLiveChunk = null;
let finalizeRequested = false;
let recordingChunks = [];
let selectedRecordingMimeType = "";
const MIN_BROWSER_RECORDING_BYTES = 1024;
const MIN_RECORDING_DURATION_MS = 1000;
let audioContext = null;
let levelAnimationFrame = null;
let lowInputFrames = 0;

function resetLiveSession(createSession = false) {
  liveSequence = 1;
  chunkStartedAt = 0;
  liveChunkQueue = [];
  activeLiveChunk = null;
  finalizeRequested = false;
  liveSessionId = createSession ? crypto.randomUUID() : null;
  elements.chunkSequence.textContent = "0";
  elements.streamProcessing.hidden = true;
}

function closeLiveSocket(cancel = false) {
  if (liveSocket?.readyState === WebSocket.OPEN && cancel && liveSessionId) {
    liveSocket.send(JSON.stringify({ type: "cancel", session_id: liveSessionId }));
  }
  liveSocket?.close();
  liveSocket = null;
}

function connectLiveSocket(resume = false) {
  if (liveSocket?.readyState === WebSocket.OPEN) return Promise.resolve();
  if (!liveSessionId) resetLiveSession(true);
  return new Promise((resolve, reject) => {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    liveSocket = new WebSocket(`${protocol}//${location.host}/api/v1/live-transcription/ws`);
    elements.connectionStatus.textContent = "Connecting";
    liveSocket.addEventListener("open", () => {
      elements.connectionStatus.textContent = "Connected";
      liveSocket.send(JSON.stringify(resume ? {
        type: "session_resume",
        session_id: liveSessionId,
        last_received_sequence_number: liveSequence - 1,
        current_transcript: elements.liveTranscript.textContent,
      } : {
        type: "session_start",
        session_id: liveSessionId,
        language: elements.language.value,
        output_language: null,
        chunk_duration_ms: Number(elements.chunkDuration.value),
      }));
      resolve();
    }, { once: true });
    liveSocket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "transcript_update") {
        if (activeLiveChunk && message.chunk_id === activeLiveChunk.chunkId) {
          liveSequence = activeLiveChunk.sequence + 1;
          activeLiveChunk = null;
        }
        elements.liveTranscript.textContent = message.merged_transcript;
        elements.liveLanguage.textContent = message.detected_language;
        elements.chunkSequence.textContent = String(message.sequence_number);
        elements.chunkStatus.textContent = message.speech_detected
          ? "Transcribed"
          : "No speech detected";
        elements.streamProcessing.hidden = true;
        dispatchNextLiveChunk();
      } else if (message.type === "transcript_final") {
        elements.finalTranscript.textContent = message.final_transcript;
        closeLiveSocket();
        resetLiveSession();
      } else if (message.type === "chunk_received") {
        if (!activeLiveChunk || message.chunk_id !== activeLiveChunk.chunkId) return;
        if (message.duplicate) {
          liveSequence = activeLiveChunk.sequence + 1;
          if (message.merged_transcript) {
            elements.liveTranscript.textContent = message.merged_transcript;
          }
          activeLiveChunk = null;
          dispatchNextLiveChunk();
        } else {
          liveSocket.send(activeLiveChunk.blob);
        }
      } else if (message.type === "error") {
        showError(`${message.code}: ${message.message}`);
        elements.chunkStatus.textContent = message.code === "NO_SPEECH_DETECTED"
          ? "No speech detected"
          : "Failed";
        elements.streamProcessing.hidden = true;
        if (message.code === "SESSION_NOT_STARTED") {
          closeLiveSocket();
          resetLiveSession();
        }
      }
    });
    liveSocket.addEventListener("close", () => {
      elements.connectionStatus.textContent = "Disconnected";
    });
    liveSocket.addEventListener("error", () => reject(new Error("WebSocket connection failed.")), { once: true });
  });
}

function sendLiveChunk(blob, duration) {
  if (!blob.size) return;
  liveChunkQueue.push({
    blob,
    chunkId: crypto.randomUUID(),
    timestampStart: chunkStartedAt,
    timestampEnd: chunkStartedAt + duration,
  });
  chunkStartedAt += duration;
  dispatchNextLiveChunk();
}

function dispatchNextLiveChunk() {
  if (
    activeLiveChunk ||
    liveSocket?.readyState !== WebSocket.OPEN ||
    !liveChunkQueue.length
  ) {
    if (
      finalizeRequested &&
      !activeLiveChunk &&
      !liveChunkQueue.length &&
      liveSocket?.readyState === WebSocket.OPEN
    ) {
      finalizeRequested = false;
      liveSocket.send(JSON.stringify({
        type: "finalize",
        session_id: liveSessionId,
      }));
    }
    return;
  }
  activeLiveChunk = liveChunkQueue.shift();
  activeLiveChunk.sequence = liveSequence;
  liveSocket.send(JSON.stringify({
    type: "audio_chunk_metadata",
    session_id: liveSessionId,
    chunk_id: activeLiveChunk.chunkId,
    sequence_number: activeLiveChunk.sequence,
    mime_type: (
      selectedRecordingMimeType ||
      activeLiveChunk.blob.type ||
      recorder.mimeType
    ),
    timestamp_start_ms: activeLiveChunk.timestampStart,
    timestamp_end_ms: activeLiveChunk.timestampEnd,
    is_final: false,
  }));
  elements.streamProcessing.hidden = false;
}

const RECORDING_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function selectSupportedAudioMimeType() {
  const support = Object.fromEntries(
    RECORDING_MIME_TYPES.map((type) => [
      type,
      MediaRecorder.isTypeSupported(type),
    ]),
  );
  console.debug("MediaRecorder MIME support", support);
  return RECORDING_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function extensionForMimeType(mimeType) {
  const normalized = (mimeType || "").toLowerCase().split(";")[0].trim();
  const extensions = {
    "audio/webm": "webm",
    "video/webm": "webm",
    "audio/ogg": "ogg",
    "application/ogg": "ogg",
    "audio/mp4": "m4a",
    "video/mp4": "mp4",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/x-m4a": "m4a",
  };
  return extensions[normalized] || "webm";
}

function showError(message) {
  elements.error.textContent = message;
  elements.error.hidden = false;
}

function clearError() {
  elements.error.textContent = "";
  elements.error.hidden = true;
}

function stopTracks() {
  if (levelAnimationFrame) cancelAnimationFrame(levelAnimationFrame);
  levelAnimationFrame = null;
  audioContext?.close();
  audioContext = null;
  elements.inputLevel.value = 0;
  if (microphoneStream) {
    microphoneStream.getTracks().forEach((track) => track.stop());
    microphoneStream = null;
  }
}

function monitorMicrophoneLevel(stream) {
  audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  audioContext.createMediaStreamSource(stream).connect(analyser);
  const levels = new Uint8Array(analyser.frequencyBinCount);
  const updateLevel = () => {
    analyser.getByteTimeDomainData(levels);
    const peak = Math.max(...levels.map((value) => Math.abs(value - 128)));
    const percentage = Math.min(100, Math.round((peak / 128) * 100));
    elements.inputLevel.value = percentage;
    lowInputFrames = percentage < 3 ? lowInputFrames + 1 : 0;
    if (lowInputFrames === 180) {
      showError("Microphone input is very low. Move closer or check the selected device.");
    }
    levelAnimationFrame = requestAnimationFrame(updateLevel);
  };
  updateLevel();
}

function updateButtons(recording = false) {
  elements.start.disabled = recording || busy;
  elements.stop.disabled = !recording || busy;
  elements.send.disabled = !selectedAudio || recording || busy;
  elements.file.disabled = recording || busy;
  elements.pause.disabled = !recording || recorder?.state !== "recording";
  elements.resume.disabled = recorder?.state !== "paused";
}

function setPreview(blob) {
  selectedAudio = blob;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(blob);
  elements.preview.src = previewUrl;
  elements.preview.hidden = false;
  elements.recordingMimeType.textContent = blob.type || "Browser default";
  elements.recordedBlobSize.textContent = `${blob.size} bytes`;
  updateButtons(false);
}

function updateTimer() {
  const seconds = Math.floor((Date.now() - recordingStartedAt) / 1000);
  elements.timer.textContent =
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

async function startRecording() {
  clearError();
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    showError("This browser does not support microphone recording with MediaRecorder.");
    return;
  }
  if (recorder?.state === "recording") return;
  try {
    closeLiveSocket(true);
    resetLiveSession(true);
    elements.liveTranscript.textContent = "";
    elements.finalTranscript.textContent = "";
    recordingChunks = [];
    await connectLiveSocket();
    microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const microphoneTrack = microphoneStream.getAudioTracks()[0];
    elements.microphoneName.textContent = (
      microphoneTrack?.label || "Default microphone"
    );
    microphoneTrack?.addEventListener("ended", () => {
      showError("The selected microphone is no longer available.");
      elements.chunkStatus.textContent = "Microphone disconnected";
    });
    monitorMicrophoneLevel(microphoneStream);
    const mimeType = selectSupportedAudioMimeType();
    selectedRecordingMimeType = mimeType;
    elements.recordingMimeType.textContent = mimeType || "Browser default";
    recorder = new MediaRecorder(microphoneStream, mimeType ? { mimeType } : undefined);
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) {
        recordingChunks.push(event.data);
        console.debug("MediaRecorder dataavailable", {
          mimeType: event.data.type,
          blobSize: event.data.size,
          sequence: liveSequence,
          durationMs: Date.now() - recordingStartedAt,
        });
        elements.chunkStatus.textContent = "Complete audio received";
      }
    });
    recorder.addEventListener("stop", () => {
      const duration = Date.now() - recordingStartedAt;
      const type = recorder.mimeType || mimeType || recordingChunks[0]?.type;
      const completeRecording = new Blob(recordingChunks, { type });
      if (
        duration < MIN_RECORDING_DURATION_MS ||
        completeRecording.size < MIN_BROWSER_RECORDING_BYTES
      ) {
        showError(
          "No usable audio data was recorded. Please record for at least one second and try again.",
        );
        elements.chunkStatus.textContent = "No usable speech";
        closeLiveSocket(true);
        resetLiveSession();
        stopTracks();
        updateButtons(false);
        return;
      }
      setPreview(completeRecording);
      elements.chunkStatus.textContent = "Queued for transcription";
      sendLiveChunk(completeRecording, duration);
      finalizeRequested = true;
      dispatchNextLiveChunk();
      stopTracks();
    }, { once: true });
    recorder.start();
    elements.chunkStatus.textContent = "Recording";
    recordingStartedAt = Date.now();
    updateTimer();
    timerId = window.setInterval(updateTimer, 250);
    updateButtons(true);
  } catch (error) {
    stopTracks();
    const denied = error?.name === "NotAllowedError";
    showError(denied
      ? "Microphone permission was denied. Allow access or upload an audio file."
      : "The microphone could not be started. Check the device and try again.");
  }
}

function stopRecording() {
  if (!recorder || recorder.state === "inactive") return;
  if (recorder.state === "paused") recorder.resume();
  recorder.stop();
  window.clearInterval(timerId);
  timerId = null;
  updateButtons(false);
}

function pauseRecording() {
  if (recorder?.state !== "recording") return;
  recorder.pause();
  liveSocket?.send(JSON.stringify({ type: "pause", session_id: liveSessionId }));
  elements.start.disabled = true;
  elements.stop.disabled = false;
  elements.pause.disabled = true;
  elements.resume.disabled = false;
}

function resumeRecording() {
  if (recorder?.state !== "paused") return;
  recorder.resume();
  liveSocket?.send(JSON.stringify({ type: "resume", session_id: liveSessionId }));
  elements.start.disabled = true;
  elements.stop.disabled = false;
  elements.pause.disabled = false;
  elements.resume.disabled = true;
}

async function sendForTranscription() {
  if (!selectedAudio || busy) return;
  clearError();
  busy = true;
  elements.loading.hidden = false;
  elements.result.hidden = true;
  updateButtons(false);
  const form = new FormData();
  const extension = extensionForMimeType(selectedAudio.type);
  form.append(
    "file",
    selectedAudio,
    selectedAudio.name || `browser-recording.${extension}`,
  );
  form.append("language", elements.language.value);
  form.append("include_segments", String(elements.includeSegments.checked));
  form.append("task", "transcribe");
  try {
    const response = await fetch("/api/v1/transcribe", { method: "POST", body: form });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "Transcription failed.");
    elements.transcript.textContent = body.data.transcript;
    elements.detectedLanguage.textContent = body.data.detected_language || "Unknown";
    const seconds = body.data.processing_time_seconds;
    elements.processingTime.textContent = seconds == null ? "Unavailable" : `${seconds.toFixed(2)} seconds`;
    elements.result.hidden = false;
  } catch (error) {
    showError(error.message || "Unable to send audio for transcription.");
  } finally {
    busy = false;
    elements.loading.hidden = true;
    updateButtons(false);
  }
}

function resetPage() {
  if (recorder?.state === "recording") recorder.stop();
  stopTracks();
  window.clearInterval(timerId);
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  recorder = null; selectedAudio = null; previewUrl = null; busy = false;
  recordingChunks = []; selectedRecordingMimeType = "";
  elements.file.value = ""; elements.preview.removeAttribute("src");
  elements.preview.hidden = true; elements.result.hidden = true;
  elements.timer.textContent = "00:00"; clearError(); updateButtons(false);
  elements.recordingMimeType.textContent = "Not selected";
  elements.recordedBlobSize.textContent = "0 bytes";
  elements.microphoneName.textContent = "Not selected";
  elements.chunkStatus.textContent = "Idle";
  closeLiveSocket(true);
  resetLiveSession();
}

elements.start.addEventListener("click", startRecording);
elements.stop.addEventListener("click", stopRecording);
elements.pause.addEventListener("click", pauseRecording);
elements.resume.addEventListener("click", resumeRecording);
elements.send.addEventListener("click", sendForTranscription);
elements.reset.addEventListener("click", resetPage);
elements.reconnect.addEventListener("click", () => {
  closeLiveSocket(true);
  resetLiveSession(true);
  connectLiveSocket().catch((error) => showError(error.message));
});
elements.file.addEventListener("change", () => {
  clearError();
  if (elements.file.files[0]) setPreview(elements.file.files[0]);
});
window.addEventListener("beforeunload", stopTracks);
updateButtons(false);
