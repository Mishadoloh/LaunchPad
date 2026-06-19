import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("admin@launchpad.dev");
  const [password, setPassword] = useState("launchpad123");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signIn({ email, password });
    } catch {
      setError("Could not sign in with those credentials.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="brand floating">
          <div className="brand-mark">LP</div>
          <div>
            <strong>LaunchPad</strong>
            <span>Product studio workspace</span>
          </div>
        </div>
        <div className="login-snapshot">
          <div className="snapshot-header">
            <span />
            <span />
            <span />
          </div>
          <div className="snapshot-grid">
            <div />
            <div />
            <div />
            <div />
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div>
          <span className="eyebrow">Product studio OS</span>
          <h1>Run projects, tasks, team load, and delivery metrics in one workspace.</h1>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <span>
              <Mail size={17} />
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
            </span>
          </label>
          <label>
            Password
            <span>
              <LockKeyhole size={17} />
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
            </span>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button full" disabled={isLoading}>
            <span>{isLoading ? "Signing in" : "Open workspace"}</span>
            <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}
