"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { REVEAL_INTERVAL_MS } from "@/lib/constants";

type Winner = {
  id: string;
  painterName: string;
  imagePath: string;
  voteCount: number;
  displayNumber: number;
};

const FLOWERS = ["🌸", "🌺", "🌼", "🌻", "🌷", "💐", "🪻", "🏵️"];

type SpotlightStep = "third" | "second" | "first";

function FlyingFlowers() {
  const [petals, setPetals] = useState<
    { id: number; left: number; delay: number; duration: number; emoji: string }[]
  >([]);

  useEffect(() => {
    const items = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 8,
      emoji: FLOWERS[Math.floor(Math.random() * FLOWERS.length)],
    }));
    setPetals(items);
  }, []);

  return (
    <>
      {petals.map((p) => (
        <span
          key={p.id}
          className="flower"
          style={{
            left: `${p.left}%`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </>
  );
}

function WinnerSpotlight({
  winner,
  place,
  medal,
  size,
}: {
  winner: Winner;
  place: string;
  medal: string;
  size: "third" | "second" | "first";
}) {
  return (
    <div className={`winner-card winner-reveal winner-reveal-${size} animate-pop-in`}>
      <span className="winner-medal">{medal}</span>
      <div className={`winner-frame ${size}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={winner.imagePath}
          alt={`${place} place — ${winner.painterName}`}
          className="winner-img"
        />
      </div>
      <p className="winner-meta">
        {place} Place · {winner.voteCount} votes
      </p>
      <h2 className={`winner-name ${size}`}>{winner.painterName}</h2>
    </div>
  );
}

const SPOTLIGHT_META: Record<
  SpotlightStep,
  { place: string; medal: string; size: "third" | "second" | "first"; nextLabel: string }
> = {
  third: { place: "3rd", medal: "🥉", size: "third", nextLabel: "Next winner" },
  second: { place: "2nd", medal: "🥈", size: "second", nextLabel: "Grand winner" },
  first: { place: "1st", medal: "🥇", size: "first", nextLabel: "Full results" },
};

export default function DisplayPage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [countdown, setCountdown] = useState(REVEAL_INTERVAL_MS / 1000);

  useEffect(() => {
    fetch("/api/results")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setWinners(data.winners ?? []);
        }
        setLoading(false);
      });
  }, []);

  const first = winners[0];
  const second = winners[1];
  const third = winners[2];

  const spotlightSequence = useMemo(() => {
    const steps: Array<{ key: SpotlightStep; winner: Winner }> = [];
    if (third) steps.push({ key: "third", winner: third });
    if (second) steps.push({ key: "second", winner: second });
    if (first) steps.push({ key: "first", winner: first });
    return steps;
  }, [first, second, third]);

  const showAll = stepIndex >= spotlightSequence.length;
  const currentSpotlight = spotlightSequence[stepIndex];

  useEffect(() => {
    if (spotlightSequence.length === 0 || error) return;

    setStepIndex(0);
    setCountdown(REVEAL_INTERVAL_MS / 1000);

    const timer = setInterval(() => {
      setStepIndex((i) => i + 1);
      setCountdown(REVEAL_INTERVAL_MS / 1000);
    }, REVEAL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [spotlightSequence.length, error]);

  useEffect(() => {
    if (showAll || spotlightSequence.length === 0) return;

    setCountdown(REVEAL_INTERVAL_MS / 1000);
    const tick = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);

    return () => clearInterval(tick);
  }, [stepIndex, showAll, spotlightSequence.length]);

  if (loading) {
    return (
      <main className="display-wait">
        <p className="loading-text" style={{ color: "white" }}>
          Counting votes…
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="display-wait">
        <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</p>
        <h1>Results Not Ready</h1>
        <p>{error}</p>
        <Link href="/" className="btn-link">
          ← Back home
        </Link>
      </main>
    );
  }

  return (
    <main className="display-page">
      <FlyingFlowers />

      <div className="display-inner">
        <p className="display-eyebrow">
          {showAll ? "🎉 Our Top 3 Artists! 🎉" : "🎉 And the winners are… 🎉"}
        </p>
        <h1 className="display-title">Little Artists Competition</h1>

        {winners.length === 0 && (
          <p style={{ color: "#d8b4fe", fontSize: "1.25rem" }}>No votes were cast.</p>
        )}

        {!showAll && currentSpotlight && (
          <>
            <WinnerSpotlight
              winner={currentSpotlight.winner}
              place={SPOTLIGHT_META[currentSpotlight.key].place}
              medal={SPOTLIGHT_META[currentSpotlight.key].medal}
              size={SPOTLIGHT_META[currentSpotlight.key].size}
            />
            <p className="reveal-countdown">
              {SPOTLIGHT_META[currentSpotlight.key].nextLabel} in {countdown}s…
            </p>
          </>
        )}

        {showAll && winners.length > 0 && (
          <div className="winners-row winners-final">
            {[third, second, first].filter(Boolean).map((winner, idx) => {
              const meta = [
                { place: "3rd", medal: "🥉", size: "third" as const },
                { place: "2nd", medal: "🥈", size: "second" as const },
                { place: "1st", medal: "🥇", size: "first" as const },
              ][idx];
              return (
                <WinnerSpotlight
                  key={winner!.id}
                  winner={winner!}
                  place={meta.place}
                  medal={meta.medal}
                  size={meta.size}
                />
              );
            })}
          </div>
        )}

        <Link href="/" className="display-link">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
