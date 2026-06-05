"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Painting = {
  id: string;
  imagePath: string;
  displayNumber: number;
  painterName: string;
  voteCount?: number;
};

type AppState = {
  votingOpen: boolean;
  votingFrozen: boolean;
  authenticated: boolean;
};

const fetchOpts: RequestInit = { cache: "no-store" };

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [state, setState] = useState<AppState | null>(null);
  const [painterName, setPainterName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [qr, setQr] = useState<{ voteUrl: string; qrDataUrl: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [formKey, setFormKey] = useState(0);

  const loadPaintings = useCallback(async () => {
    const res = await fetch(`/api/paintings?reveal=true&_=${Date.now()}`, fetchOpts);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, []);

  const load = useCallback(async () => {
    const stateRes = await fetch("/api/state", fetchOpts);
    const stateData = await stateRes.json();
    setState(stateData);
    setAuthenticated(stateData.authenticated);

    if (stateData.authenticated) {
      setPaintings(await loadPaintings());

      try {
        const qrRes = await fetch("/api/qr", fetchOpts);
        if (qrRes.ok) {
          setQr(await qrRes.json());
        }
      } catch {
        /* QR is optional — don't block paintings list */
      }
    }
  }, [loadPaintings]);

  useEffect(() => {
    load();
  }, [load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setLoginError("Wrong password");
      return;
    }
    setPassword("");
    load();
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthenticated(false);
    setQr(null);
    setPaintings([]);
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !painterName.trim()) return;
    setUploading(true);
    setStatusMsg("");

    const form = new FormData();
    form.append("image", file);
    form.append("painterName", painterName.trim());

    const res = await fetch("/api/paintings", { method: "POST", body: form });
    if (!res.ok) {
      setStatusMsg("Upload failed");
    } else {
      const created = await res.json();
      setPainterName("");
      setFile(null);
      setFormKey((k) => k + 1);
      setStatusMsg("Painting uploaded!");

      const fresh = await loadPaintings();
      if (fresh.length > 0) {
        setPaintings(fresh);
      } else {
        setPaintings((prev) => [
          ...prev,
          {
            id: created.id,
            imagePath: created.imagePath,
            painterName: created.painterName,
            displayNumber: prev.length + 1,
            voteCount: 0,
          },
        ]);
      }
    }
    setUploading(false);
  }

  async function deletePainting(id: string) {
    if (!confirm("Delete this painting?")) return;
    await fetch(`/api/paintings?id=${id}`, { method: "DELETE" });
    setPaintings(await loadPaintings());
  }

  async function updateState(patch: Partial<AppState>) {
    setStatusMsg("");
    const res = await fetch("/api/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(data.error ?? "Action failed");
    } else {
      setStatusMsg(
        patch.votingFrozen
          ? "Voting frozen! Results are ready on the Display page."
          : patch.votingOpen
            ? "Voting is now open!"
            : "Updated."
      );
      load();
    }
  }

  async function resetAll() {
    if (
      !confirm(
        "Reset everything? This deletes all paintings and votes and returns voting to the start."
      )
    ) {
      return;
    }

    setStatusMsg("");
    const res = await fetch("/api/admin/reset", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setStatusMsg(data.error ?? "Reset failed");
    } else {
      setPainterName("");
      setFile(null);
      setFormKey((k) => k + 1);
      setPaintings([]);
      setState((s) =>
        s ? { ...s, votingOpen: false, votingFrozen: false } : s
      );
      setStatusMsg("Competition reset. You can upload paintings and start fresh.");
      await load();
    }
  }

  if (!authenticated) {
    return (
      <main className="admin-login-wrap">
        <form onSubmit={login} className="admin-login-card">
          <Link href="/" className="back-link">
            ← Home
          </Link>
          <h1>Admin Login</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input-field"
          />
          {loginError && <p className="error-text">{loginError}</p>}
          <button type="submit" className="btn-admin">
            Sign in
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div>
            <Link href="/" className="back-link">
              ← Home
            </Link>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--purple-dark)" }}>
              Admin Panel
            </h1>
          </div>
          <button type="button" onClick={logout} className="back-link">
            Log out
          </button>
        </div>
      </header>

      <div className="admin-content">
        {statusMsg && <div className="alert-success">{statusMsg}</div>}

        <section className="card">
          <h2>Voting Controls</h2>
          <div className="status-row">
            <span
              className={`status-badge ${
                state?.votingFrozen
                  ? "status-frozen"
                  : state?.votingOpen
                    ? "status-open"
                    : "status-idle"
              }`}
            >
              {state?.votingFrozen
                ? "🔒 Frozen"
                : state?.votingOpen
                  ? "✅ Voting Open"
                  : "⏸ Not started"}
            </span>

            {!state?.votingOpen && !state?.votingFrozen && (
              <button
                type="button"
                onClick={() => updateState({ votingOpen: true })}
                className="btn-sm btn-green"
              >
                Open Voting
              </button>
            )}

            {state?.votingOpen && !state?.votingFrozen && (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      "Freeze voting? No one will be able to change their selections."
                    )
                  ) {
                    updateState({ votingFrozen: true });
                  }
                }}
                className="btn-sm btn-red"
              >
                🔒 Freeze Voting
              </button>
            )}

            {state?.votingFrozen && (
              <Link href="/display" className="btn-sm btn-yellow">
                🏆 Open Display Page
              </Link>
            )}

            <button
              type="button"
              onClick={resetAll}
              className="btn-sm btn-reset"
            >
              ↺ Reset
            </button>
          </div>
        </section>

        {qr && (
          <section className="card">
            <h2>QR Code for Voting</h2>
            <p style={{ color: "var(--gray-500)", fontSize: "0.875rem", marginBottom: "1rem" }}>
              Scan to open the voting page on mobile devices.
            </p>
            <div className="qr-section">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr.qrDataUrl}
                alt="QR code for voting page"
                className="qr-image"
                width={200}
                height={200}
              />
              <div>
                <p style={{ fontSize: "0.875rem", color: "var(--gray-500)", marginBottom: "0.25rem" }}>
                  Voting URL
                </p>
                <a href={qr.voteUrl} className="qr-url">
                  {qr.voteUrl}
                </a>
              </div>
            </div>
          </section>
        )}

        {!state?.votingFrozen && (
          <section className="card">
            <h2>Upload Painting</h2>
            <form key={formKey} onSubmit={upload} className="form-stack">
              <div>
                <label className="label">Painter&apos;s Name</label>
                <input
                  type="text"
                  value={painterName}
                  onChange={(e) => setPainterName(e.target.value)}
                  placeholder="e.g. Emma, age 7"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Painting Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                />
              </div>
              <button type="submit" disabled={uploading} className="btn-teal">
                {uploading ? "Uploading…" : "Upload Painting"}
              </button>
            </form>
          </section>
        )}

        <section className="card">
          <h2>Uploaded Paintings ({paintings.length})</h2>
          {paintings.length === 0 ? (
            <p style={{ color: "var(--gray-500)" }}>No paintings yet.</p>
          ) : (
            <div className="admin-grid">
              {paintings.map((p) => (
                <div key={p.id} className="admin-art-card">
                  <div className="art-card-image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imagePath}
                      alt={p.painterName}
                      className="admin-art-img"
                    />
                  </div>
                  <div className="admin-art-body">
                    <p className="admin-art-name">{p.painterName}</p>
                    <p className="admin-art-meta">
                      #{p.displayNumber}
                      {state?.votingFrozen && ` · ${p.voteCount ?? 0} votes`}
                    </p>
                    {!state?.votingFrozen && (
                      <button
                        type="button"
                        onClick={() => deletePainting(p.id)}
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
