"use client";

import { useEffect, useRef } from "react";

type RoundCue = "start" | "end";

export function roundCueForTransition(previous: string, current: string): RoundCue | undefined {
  if (previous !== "live" && current === "live") return "start";
  if (previous === "live" && current !== "live") return "end";
  return undefined;
}

export function useRoundAudio(phase: string) {
  const context = useRef<AudioContext | null>(null);
  const previousPhase = useRef(phase);
  const primed = useRef(false);

  useEffect(() => {
    const prime = () => {
      const AudioContextClass = window.AudioContext
        ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!context.current || context.current.state === "closed") context.current = new AudioContextClass();
      void context.current.resume().then(() => { primed.current = true; }).catch(() => undefined);
    };

    window.addEventListener("pointerdown", prime, { passive: true });
    window.addEventListener("keydown", prime);
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  useEffect(() => {
    const cue = roundCueForTransition(previousPhase.current, phase);
    previousPhase.current = phase;
    if (!cue || !primed.current || !context.current) return;
    playCue(context.current, cue);
  }, [phase]);

  useEffect(() => () => {
    const current = context.current;
    context.current = null;
    if (current?.state !== "closed") void current?.close().catch(() => undefined);
  }, []);
}

function playCue(context: AudioContext, cue: RoundCue) {
  const notes = cue === "start"
    ? [{ at: 0, hz: 660 }, { at: 0.11, hz: 880 }]
    : [{ at: 0, hz: 440 }, { at: 0.13, hz: 220 }];
  const now = context.currentTime;

  for (const note of notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = now + note.at;
    const end = start + 0.1;
    oscillator.type = cue === "start" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(note.hz, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end);
  }
}
