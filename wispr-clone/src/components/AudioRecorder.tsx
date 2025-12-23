import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface AudioRecorderProps {
  isRecording: boolean;
  onRecordingChange: (recording: boolean) => void;
  onTranscription: (text: string) => void;
  apiKey: string;
}

export default function AudioRecorder({
  isRecording,
  onRecordingChange,
  onTranscription,
  apiKey,
}: AudioRecorderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isRecording) {
      startRecording();
    } else if (mediaRecorderRef.current) {
      stopRecording();
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processRecording();
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Failed to access microphone. Please check permissions.");
      onRecordingChange(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      setError("No audio recorded");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });

      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...uint8Array));

      // Send to Rust backend for transcription
      const result = await invoke<string>("transcribe_audio", {
        audioData: base64,
        apiKey: apiKey,
      });

      onTranscription(result);

      // Type the transcription into the active window
      if (result.trim()) {
        await invoke("type_text", { text: result });
      }
    } catch (err) {
      console.error("Transcription error:", err);
      setError(`Transcription failed: ${err}`);
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  const toggleRecording = () => {
    onRecordingChange(!isRecording);
  };

  return (
    <div className="audio-recorder">
      <button
        className={`record-button ${isRecording ? "recording" : ""} ${
          isProcessing ? "processing" : ""
        }`}
        onClick={toggleRecording}
        disabled={isProcessing || !apiKey}
        title={!apiKey ? "Please set Deepgram API key in settings" : ""}
      >
        {isProcessing ? (
          <Loader2 className="spinner" size={48} />
        ) : isRecording ? (
          <MicOff size={48} />
        ) : (
          <Mic size={48} />
        )}
      </button>

      <div className="recorder-status">
        {isProcessing && <p>Processing audio...</p>}
        {isRecording && <p>Recording... Click to stop</p>}
        {!isRecording && !isProcessing && <p>Click to start recording</p>}
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {!apiKey && (
        <div className="warning-message">
          <p>⚠️ Please configure your Deepgram API key in settings</p>
        </div>
      )}
    </div>
  );
}