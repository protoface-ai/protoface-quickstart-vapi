"use client";

import Vapi from "@vapi-ai/web";
import { ProtofaceClient } from "protoface-client";
import { useRef, useState } from "react";
import type { StopListening } from "protoface-client";

const avatar = {
  vapi_agentid: requirePublicEnv(
    "NEXT_PUBLIC_VAPI_ASSISTANT_ID",
    process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? process.env.NEXT_PUBLIC_VAPI_AGENT_ID
  ),
  protoface_avatarid: process.env.NEXT_PUBLIC_PROTOFACE_AVATAR_ID || "av_stock_001"
};

type SessionState = "idle" | "starting" | "connected" | "disconnecting" | "disconnected" | "error";
type VapiMode = "idle" | "listening" | "speaking";

type DailyParticipantLike = {
  user_name?: string;
  tracks?: {
    audio?: {
      persistentTrack?: MediaStreamTrack | null;
    };
  };
};

interface ProtofaceConnectionResponse {
  sessionToken: string;
  livekitUrl: string;
  roomName: string;
  participantToken: string;
  sessionId?: string;
  avatarId?: string;
  avatarIdentity?: string;
  expiresAt?: string;
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const protofaceRef = useRef<ProtofaceClient | null>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const audioCleanupRef = useRef<StopListening | null>(null);
  const vapiAudioObserverRef = useRef<MutationObserver | null>(null);
  const cleanupPromiseRef = useRef<Promise<void> | null>(null);

  const [state, setState] = useState<SessionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [vapiMode, setVapiMode] = useState<VapiMode>("idle");

  const isRunning = state === "starting" || state === "connected" || state === "disconnecting";
  const canDisconnect = state === "starting" || state === "connected";

  async function start() {
    if (isRunning) {
      return;
    }

    setState("starting");
    setError(null);
    setEvents([]);

    try {
      const vapiApiKey = requirePublicEnv(
        "NEXT_PUBLIC_VAPI_API_KEY",
        process.env.NEXT_PUBLIC_VAPI_API_KEY
      );

      const connection = await createProtofaceConnection({
        avatarId: avatar.protoface_avatarid,
        maxSessionLength: 600,
        maxIdleTime: 180,
        metadata: {
          provider: "vapi"
        }
      });

      const protoface = new ProtofaceClient({
        avatarId: connection.avatarId ?? avatar.protoface_avatarid,
        livekitUrl: connection.livekitUrl,
        roomName: connection.roomName,
        participantToken: connection.participantToken,
        workerToken: "server-created",
        workerIdentity: connection.avatarIdentity,
        videoElement: videoRef.current,
        audioElement: audioRef.current,
        apiClient: createBrowserSessionApi(connection)
      });

      protoface.on("start", () => pushEvent("Protoface started."));
      protoface.on("error", ({ error: protofaceError }) => {
        setError(protofaceError.message);
        pushEvent(`Protoface error: ${protofaceError.message}`);
        void endSession("error");
      });
      protoface.on("speaking", () => pushEvent("Protoface is speaking."));
      protoface.on("silent", () => pushEvent("Protoface is ready."));

      await protoface.start();
      protofaceRef.current = protoface;

      const vapi = new Vapi(vapiApiKey);
      vapiRef.current = vapi;
      muteVapiAudioOutput();

      vapi.on("call-start", () => {
        muteVapiAudioOutput();
        setVapiMode("listening");
        pushEvent("Vapi call started.");
      });
      vapi.on("call-end", () => {
        setVapiMode("idle");
        pushEvent("Vapi call ended.");
        void endSession("disconnected");
      });
      vapi.on("speech-start", () => {
        setVapiMode("speaking");
        pushEvent("Vapi speech started.");
      });
      vapi.on("speech-end", () => {
        setVapiMode("listening");
        pushEvent("Vapi speech ended.");
        if (protoface.status === "started") {
          void protoface.clearBuffer();
        }
      });
      vapi.on("daily-participant-updated", (participant) => {
        muteVapiAudioOutput();
        void connectVapiAudioTrack(protoface, participant as DailyParticipantLike);
      });
      vapi.on("error", (vapiError) => {
        const message = normalizeError(vapiError);
        setError(message);
        pushEvent(`Vapi error: ${message}`);
        void endSession("error");
      });

      await vapi.start(avatar.vapi_agentid);
      await connectCurrentVapiSpeakerTrack(vapi, protoface);
      if (cleanupPromiseRef.current || vapiRef.current !== vapi || protofaceRef.current !== protoface) {
        return;
      }
      setState("connected");
    } catch (startError) {
      setError(normalizeError(startError));
      await endSession("error");
      setState("error");
    }
  }

  async function stop() {
    await endSession("disconnected");
    pushEvent("Session stopped.");
  }

  async function endSession(nextState: "disconnected" | "error") {
    if (cleanupPromiseRef.current) {
      await cleanupPromiseRef.current;
      return;
    }

    setState("disconnecting");
    cleanupPromiseRef.current = cleanupSession();
    await cleanupPromiseRef.current;
    cleanupPromiseRef.current = null;
    setState(nextState);
  }

  async function cleanupSession() {
    setVapiMode("idle");
    audioCleanupRef.current?.();
    audioCleanupRef.current = null;
    vapiAudioObserverRef.current?.disconnect();
    vapiAudioObserverRef.current = null;
    await Promise.allSettled([vapiRef.current?.stop(), protofaceRef.current?.stop()]);
    vapiRef.current = null;
    protofaceRef.current = null;
  }

  async function connectCurrentVapiSpeakerTrack(vapi: Vapi, protoface: ProtofaceClient) {
    const participants = vapi.getDailyCallObject()?.participants();
    const speaker = Object.values(participants ?? {}).find(
      (participant) => participant?.user_name === "Vapi Speaker"
    );

    if (speaker) {
      await connectVapiAudioTrack(protoface, speaker as DailyParticipantLike);
    }
  }

  async function connectVapiAudioTrack(protoface: ProtofaceClient, participant: DailyParticipantLike) {
    if (participant.user_name !== "Vapi Speaker") {
      return;
    }

    const track = participant.tracks?.audio?.persistentTrack;
    if (!track || audioCleanupRef.current) {
      return;
    }

    audioCleanupRef.current = await protoface.listenToMediaStreamTrack(track);
    pushEvent("Vapi audio connected to Protoface.");
  }

  function pushEvent(message: string) {
    setEvents((current) => [message, ...current].slice(0, 8));
  }

  function muteVapiAudioOutput() {
    document.querySelectorAll<HTMLAudioElement>("audio[data-participant-id]").forEach((audio) => {
      audio.muted = true;
      audio.volume = 0;
    });

    if (vapiAudioObserverRef.current) {
      return;
    }

    vapiAudioObserverRef.current = new MutationObserver(() => {
      document.querySelectorAll<HTMLAudioElement>("audio[data-participant-id]").forEach((audio) => {
        audio.muted = true;
        audio.volume = 0;
      });
    });
    vapiAudioObserverRef.current.observe(document.body, { childList: true, subtree: true });
  }

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="https://protoface.com" target="_blank" rel="noreferrer">
          <span>Protoface</span>
        </a>

        <nav className="navLinks" aria-label="Starter links">
          <a href="https://docs.protoface.com/guides/avatars" target="_blank" rel="noreferrer">
            Docs
          </a>
          <a href="https://dashboard.vapi.ai/assistants" target="_blank" rel="noreferrer">
            Vapi
          </a>
          <a href="https://app.protoface.com" target="_blank" rel="noreferrer">
            Login
          </a>
        </nav>
      </header>

      <div className="shell">
        <section className="stage" aria-label="Protoface avatar stage">
          {state !== "connected" ? (
            <div className="stagePreview">
              <p className="eyebrow">Protoface preview</p>
              <h2>Your avatar will appear here once the conversation starts.</h2>
              <p>Start a session to test your Vapi assistant with a realtime Protoface avatar.</p>
            </div>
          ) : null}
          <video ref={videoRef} className="avatarVideo" autoPlay playsInline />
          <audio ref={audioRef} autoPlay />
        </section>

        <aside className="controls">
          <section className="intro">
            <h1>Realtime avatars for AI.</h1>
            <p>
              Add a realtime Protoface avatar to your Vapi assistant. Start a session to try the full conversation flow.
            </p>
          </section>

          <section className="status">
            <div className="buttonRow">
              <button className="button" type="button" onClick={start} disabled={isRunning}>
                {state === "starting" ? "Starting" : "Start conversation"}
              </button>
              <button className="button secondary" type="button" onClick={stop} disabled={!canDisconnect}>
                End conversation
              </button>
            </div>

            <div className="statusList">
              <div className="statusItem">
                <strong>Session</strong>
                <span className="pill">{formatStatusLabel(state)}</span>
              </div>
              <div className="statusItem">
                <strong>Mode</strong>
                <span className="pill">{formatStatusLabel(vapiMode)}</span>
              </div>
              <div className="statusItem">
                <strong>Protoface avatar</strong>
                <span className="pill">{avatar.protoface_avatarid}</span>
              </div>
              <div className="statusItem">
                <strong>Vapi agent</strong>
                <span className="pill">{shortId(avatar.vapi_agentid)}</span>
              </div>
            </div>

            {error ? <p className="error">{error}</p> : null}
          </section>

          <section className="log">
            <h2>Events</h2>
            <ul className="logList">
              {events.length > 0 ? (
                events.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)
              ) : (
                <li>Ready when you are.</li>
              )}
            </ul>
          </section>

          <section className="quickStart">
            <h2>Quick start</h2>
            <ol>
              <li>Add keys to `.env`.</li>
              <li>Create a Vapi agent.</li>
              <li>Set the avatar ID you want to preview.</li>
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}

function requirePublicEnv(name: string, value: string | undefined) {
  if (!value || value.includes("-API-KEY")) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

function formatStatusLabel(value: string | null | undefined) {
  if (!value) {
    return "Not started";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      error?: unknown;
      type?: unknown;
    };
    if (typeof candidate.message === "string") {
      return candidate.message;
    }
    if (candidate.error instanceof Error) {
      return candidate.error.message;
    }
    if (typeof candidate.error === "string") {
      return candidate.error;
    }
    if (candidate.error && typeof candidate.error === "object") {
      const nested = candidate.error as { message?: unknown; errorMsg?: unknown; errorDetail?: unknown };
      if (typeof nested.message === "string") {
        return nested.message;
      }
      if (typeof nested.errorMsg === "string") {
        return nested.errorMsg;
      }
      if (typeof nested.errorDetail === "string") {
        return nested.errorDetail;
      }
    }
    if (typeof candidate.type === "string") {
      return candidate.type;
    }
  }
  return "Something went wrong.";
}

function shortId(value: string) {
  if (!value) {
    return "Not set";
  }
  return value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

async function createProtofaceConnection(body: {
  avatarId: string;
  maxSessionLength?: number;
  maxIdleTime?: number;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<ProtofaceConnectionResponse> {
  const response = await fetch("/api/protoface/session-token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  const payload = (await response.json()) as Partial<ProtofaceConnectionResponse> & {
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Failed to create Protoface session.");
  }

  for (const key of ["sessionToken", "livekitUrl", "roomName", "participantToken"] as const) {
    if (!payload[key]) {
      throw new Error(`Protoface session response is missing ${key}.`);
    }
  }

  return payload as ProtofaceConnectionResponse;
}

function createBrowserSessionApi(connection: ProtofaceConnectionResponse) {
  return {
    async createLiveKitSession() {
      return {
        id: connection.sessionId ?? connection.sessionToken,
        status: "running" as const,
        avatar_id: connection.avatarId ?? avatar.protoface_avatarid,
        transport: {
          type: "livekit" as const,
          url: connection.livekitUrl,
          room_name: connection.roomName,
          audio_source: "data_stream" as const,
          worker_identity: connection.avatarIdentity
        },
        quality: "standard",
        max_duration_seconds: 600,
        idle_timeout_seconds: 180,
        metadata: {},
        created_at: new Date().toISOString()
      };
    },
    async endSession(sessionId: string) {
      await fetch("/api/protoface/session-token", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
    }
  };
}
