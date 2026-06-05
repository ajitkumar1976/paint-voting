import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home">
      <div className="home-icon animate-float">🎨</div>
      <h1>Little Artists</h1>
      <p className="home-sub">
        Celebrate creativity! Vote for your favorite paintings or watch the winners
        reveal.
      </p>

      <div className="home-actions">
        <Link href="/vote" className="btn btn-vote">
          🗳️ Cast Your Vote
        </Link>
        <Link href="/display" className="btn btn-results">
          🏆 View Results
        </Link>
      </div>

      <Link href="/admin" className="link-muted">
        Admin panel →
      </Link>
    </main>
  );
}
