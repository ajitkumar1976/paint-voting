"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { REQUIRED_VOTES } from "@/lib/constants";

type Painting = {
  id: string;
  imagePath: string;
  displayNumber: number;
  performerKey: string;
};

type AppState = {
  votingOpen: boolean;
  votingFrozen: boolean;
};

function isTouchDevice() {
  return typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
}

export default function VotePage() {
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [zoomPainting, setZoomPainting] = useState<Painting | null>(null);

  const load = useCallback(async () => {
    const [stateRes, paintingsRes, votesRes] = await Promise.all([
      fetch("/api/state"),
      fetch("/api/paintings"),
      fetch("/api/votes"),
    ]);
    const stateData = await stateRes.json();
    setState(stateData);
    setPaintings(await paintingsRes.json());
    const votesData = await votesRes.json();
    if (votesData.votes?.length) {
      setSelected(votesData.votes);
      setSaved(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!zoomPainting) return;

    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setZoomPainting(null);
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [zoomPainting]);

  function isPerformerTaken(painting: Painting, currentSelection: string[]): boolean {
    return currentSelection.some((sid) => {
      if (sid === painting.id) return false;
      const other = paintings.find((p) => p.id === sid);
      return other?.performerKey === painting.performerKey;
    });
  }

  function toggle(id: string, checked: boolean) {
    if (state?.votingFrozen) return;

    const painting = paintings.find((p) => p.id === id);
    if (!painting) return;

    setSelected((prev) => {
      if (!checked) {
        setMessage("");
        return prev.filter((x) => x !== id);
      }
      if (prev.includes(id)) return prev;

      if (isPerformerTaken(painting, prev)) {
        setMessage("You can only vote once per performer.");
        return prev;
      }
      if (prev.length >= REQUIRED_VOTES) {
        setMessage(`You can only select exactly ${REQUIRED_VOTES} paintings.`);
        return prev;
      }

      setMessage("");
      return [...prev, id];
    });
    setSaved(false);
  }

  function openPreview(painting: Painting, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setZoomPainting(painting);
  }

  function handleImageActivate(painting: Painting, e: React.MouseEvent) {
    if (isTouchDevice()) {
      openPreview(painting, e);
    }
  }

  async function submitVotes() {
    if (selected.length < REQUIRED_VOTES) {
      setMessage(
        `Please select exactly ${REQUIRED_VOTES} paintings. You chose ${selected.length}.`
      );
      return;
    }
    if (selected.length > REQUIRED_VOTES) {
      setMessage(`You can only select exactly ${REQUIRED_VOTES} paintings.`);
      return;
    }

    setSubmitting(true);
    setMessage("");

    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paintingIds: selected }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error ?? "Could not save votes.");
    } else {
      setSaved(true);
      setMessage("Your votes have been saved! 🎉");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <main className="loading-screen">
        <p className="loading-text">Loading artworks…</p>
      </main>
    );
  }

  const frozen = state?.votingFrozen;
  const notOpen = !state?.votingOpen && !frozen;
  const canSelect = Boolean(state?.votingOpen && !frozen);
  const selectionComplete = selected.length === REQUIRED_VOTES;

  return (
    <main className="vote-page">
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <Link href="/" className="back-link">
              ← Home
            </Link>
            <h1>Vote for Art! 🎨</h1>
          </div>
          {!frozen && state?.votingOpen && (
            <div className="vote-counter">
              <p className="vote-counter-label">Your picks</p>
              <p
                className="vote-counter-value"
                style={selectionComplete ? { color: "#22c55e" } : undefined}
              >
                {selected.length} / {REQUIRED_VOTES}
              </p>
            </div>
          )}
        </div>
      </header>

      <div className="container-narrow" style={{ paddingTop: "1.5rem" }}>
        {notOpen && (
          <div className="alert alert-wait">
            <p style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⏳</p>
            <p className="alert-wait-title">Voting hasn&apos;t started yet</p>
            <p style={{ color: "var(--gray-500)", marginTop: "0.5rem" }}>
              Please check back soon!
            </p>
          </div>
        )}

        {frozen && (
          <div className="alert alert-frozen">
            <p className="alert-frozen-title">🔒 Voting is closed</p>
            <p style={{ color: "var(--gray-500)", marginTop: "0.25rem" }}>
              {saved
                ? "Your selections are locked in."
                : "No new votes can be submitted."}
            </p>
            <Link href="/display" className="btn-purple">
              See winners →
            </Link>
          </div>
        )}

        {state?.votingOpen && !frozen && (
          <p className="hint-text">
            Select exactly <strong>{REQUIRED_VOTES}</strong> paintings — one per
            performer. Double-click or tap a painting to view it larger. Names
            stay secret until results!
          </p>
        )}

        {!canSelect && !notOpen && !frozen && paintings.length > 0 && (
          <p className="hint-text">
            Double-click or tap a painting to view it larger.
          </p>
        )}

        {paintings.length === 0 ? (
          <p className="empty-text">No artworks uploaded yet.</p>
        ) : (
          <div className="art-grid">
            {paintings.map((p) => {
              const isSelected = selected.includes(p.id);
              const performerTaken = isPerformerTaken(p, selected);
              const atLimit = selected.length >= REQUIRED_VOTES && !isSelected;
              const disabled = atLimit || (performerTaken && !isSelected);

              return (
                <div
                  key={p.id}
                  className={`art-card${isSelected ? " selected" : ""}${disabled && canSelect ? " art-card-disabled" : ""}`}
                >
                  <div
                    className="art-card-image art-card-zoomable"
                    onDoubleClick={(e) => openPreview(p, e)}
                    onClick={(e) => handleImageActivate(p, e)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View artwork number ${p.displayNumber} full size`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setZoomPainting(p);
                      }
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imagePath}
                      alt={`Artwork #${p.displayNumber}`}
                      className="art-grid-img"
                      draggable={false}
                    />
                    <span className="art-zoom-hint" aria-hidden="true">
                      🔍
                    </span>
                    {canSelect && (
                      <span className="art-checkbox-wrap">
                        <input
                          type="checkbox"
                          className="art-checkbox"
                          checked={isSelected}
                          disabled={disabled}
                          onChange={(e) => toggle(p.id, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select artwork number ${p.displayNumber}`}
                        />
                      </span>
                    )}
                    {frozen && isSelected && (
                      <span className="art-checkbox-wrap art-checkbox-frozen">
                        <span className="art-checkbox-checked" aria-hidden="true">
                          ✓
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="art-card-footer">
                    <span className="art-number">#{p.displayNumber}</span>
                    {isSelected && <span className="badge-picked">Selected</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {message && (
          <p className={`toast ${saved ? "toast-success" : "toast-error"}`}>
            {message}
          </p>
        )}
      </div>

      {zoomPainting && (
        <div
          className="paint-lightbox"
          onClick={() => setZoomPainting(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Artwork number ${zoomPainting.displayNumber}`}
        >
          <div
            className="paint-lightbox-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="paint-lightbox-back"
              onClick={() => setZoomPainting(null)}
            >
              ← Back to grid
            </button>
            <button
              type="button"
              className="paint-lightbox-close"
              onClick={() => setZoomPainting(null)}
              aria-label="Close preview"
            >
              ✕
            </button>
            <p className="paint-lightbox-title">
              Artwork #{zoomPainting.displayNumber}
            </p>
            <div className="paint-lightbox-image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomPainting.imagePath}
                alt={`Artwork #${zoomPainting.displayNumber}`}
                className="paint-lightbox-image"
              />
            </div>
            {canSelect && (
              <label className="paint-lightbox-select">
                <input
                  type="checkbox"
                  checked={selected.includes(zoomPainting.id)}
                  disabled={
                    (selected.length >= REQUIRED_VOTES &&
                      !selected.includes(zoomPainting.id)) ||
                    (isPerformerTaken(zoomPainting, selected) &&
                      !selected.includes(zoomPainting.id))
                  }
                  onChange={(e) => toggle(zoomPainting.id, e.target.checked)}
                />
                Select this painting
              </label>
            )}
          </div>
        </div>
      )}

      {state?.votingOpen && !frozen && (
        <div className="vote-bar">
          <div className="vote-bar-inner">
            <button
              type="button"
              onClick={() => {
                setSelected([]);
                setSaved(false);
                setMessage("");
              }}
              className="btn-clear"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={submitVotes}
              disabled={submitting || selected.length !== REQUIRED_VOTES}
              className="btn-submit"
            >
              {submitting
                ? "Saving…"
                : saved
                  ? "Update My Votes"
                  : `Submit ${REQUIRED_VOTES} Votes`}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
