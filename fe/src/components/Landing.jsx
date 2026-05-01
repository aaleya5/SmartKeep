import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { useGoogleLogin } from '@react-oauth/google';
import './Landing.css';

/* ─── FLIM.AI STYLE FLOATING UI SHARDS ──────────────────────────
   Replaces the old photo strips with elegant, floating fragments 
   of the application's actual UI (highlights, searches, metrics).
──────────────────────────────────────────────────────────────── */

const SEARCH_RESULTS = [
  { title: "Rust Ownership and Memory Safety", snip: <><mark>Memory</mark> safety without GC — the borrow checker catches errors at compile time.</>, score: "0.94", c: "#f5c842" },
  { title: "Stack vs Heap in Systems Programming", snip: <>How <mark>memory</mark> allocation works under the hood in Rust, C++, Go.</>, score: "0.88", c: "#3ecf8e" },
  { title: "Why JVM Garbage Collection Feels Slow", snip: <><mark>Memory management</mark> in GC vs ownership-based languages compared.</>, score: "0.81", c: "#60b4f0" },
];

export default function Landing({ forceLogin = false }) {
  const curRef = useRef(null);
  const ringRef = useRef(null);
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(forceLogin);
  const [authMode, setAuthMode] = useState(forceLogin ? 'login' : 'register'); // 'login', 'register', or 'forgot-password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordWarning, setPasswordWarning] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  // Check password length as user types and prevent exceeding 72 bytes
  const handlePasswordChange = (e) => {
    let newPassword = e.target.value;
    const passwordBytes = new TextEncoder().encode(newPassword).length;
    
    // If password exceeds 72 bytes, truncate it
    if (passwordBytes > 72) {
      // Truncate character by character until we're under 72 bytes
      while (new TextEncoder().encode(newPassword).length > 72 && newPassword.length > 0) {
        newPassword = newPassword.slice(0, -1);
      }
      setPasswordWarning('Password truncated to 72 bytes maximum');
    } else if (passwordBytes > 60) {
      setPasswordWarning(`Password length: ${passwordBytes} bytes (max 72)`);
    } else {
      setPasswordWarning('');
    }
    
    setPassword(newPassword);
  };

  useEffect(() => {
    const mv = e => {
      if (curRef.current) { curRef.current.style.left = e.clientX + "px"; curRef.current.style.top = e.clientY + "px"; }
      if (ringRef.current) { ringRef.current.style.left = e.clientX + "px"; ringRef.current.style.top = e.clientY + "px"; }
    };
    window.addEventListener("mousemove", mv);
    return () => window.removeEventListener("mousemove", mv);
  }, []);

  // Check for GitHub OAuth callback code
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      setLoading(true);
      setError('');
      setShowAuthModal(true);
      
      // Clean up URL right away
      window.history.replaceState({}, document.title, window.location.pathname);
      
      authAPI.socialLogin(code, 'github')
        .then(response => {
          localStorage.setItem('smartkeep_auth_token', response.data.access_token);
          window.location.href = '/app';
        })
        .catch(err => {
          setError(err.response?.data?.detail || 'Failed to authenticate with GitHub');
          setLoading(false);
        });
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (authMode === 'forgot-password') {
      try {
        await authAPI.forgotPassword(email);
        setSuccessMessage('If an account exists, a reset link has been sent to your email.');
        setLoading(false);
        return;
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to send reset link');
        setLoading(false);
        return;
      }
    }

    try {
      let token;
      if (authMode === 'login') {
        const response = await authAPI.login(email, password);
        token = response.data.access_token;
      } else {
        // Register the user
        await authAPI.register(email, password);
        // Inform user to check email
        setSuccessMessage('Registration successful! Please check your email to verify your account.');
        setAuthMode('login');
        setLoading(false);
        return;
      }
      
      // Save token to localStorage
      localStorage.setItem('smartkeep_auth_token', token);
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
      setPasswordWarning('');
      // Use window.location to force App.jsx to remount and check auth state
      window.location.href = '/app';
    } catch (err) {
      let errorMsg = 'Authentication failed';
      const detail = err.response?.data?.detail;
      
      if (err.response?.status === 403 && detail?.includes('verified')) {
        errorMsg = 'Email not verified. Please check your inbox for the verification link.';
      } else if (err.userMessage) {
        errorMsg = err.userMessage;
      } else if (detail) {
        if (typeof detail === 'string') {
          errorMsg = detail;
        } else if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
          errorMsg = detail[0].msg;
        } else if (typeof detail === 'object' && detail.message) {
          errorMsg = detail.message;
        } else {
          errorMsg = JSON.stringify(detail);
        }
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        // Send the access token to backend
        const response = await authAPI.socialLogin(tokenResponse.access_token, 'google');
        localStorage.setItem('smartkeep_auth_token', response.data.access_token);
        window.location.href = '/app';
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to authenticate with Google');
        setLoading(false);
      }
    },
    onError: () => {
      setError('Google login failed or was cancelled');
    }
  });

  const handleGitHubLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId) {
      setError('GitHub client ID is not configured');
      return;
    }
    const redirectUri = window.location.origin; // Will redirect back to Landing page
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email`;
  };

  const doSave = () => {
    if (!url.trim()) {
      navigate('/app');
      return;
    }
    setSaved(true);
    setTimeout(() => { 
        setSaved(false); 
        setUrl("");
        navigate('/app');
    }, 1500);
  };

  return (
    <div className="landing-page-root">
      <div id="cur" ref={curRef} />
      <div id="cur-r" ref={ringRef} />

      {/* NAV */}
      <nav className="nav">
        <div className="logo">Smart<b>Keep</b></div>
        <ul className="nav-mid">
          <li><a href="#features">features</a></li>
          <li><a href="#reader">reader</a></li>
          <li><a href="#how">how_it_works</a></li>
          <li><a href="https://github.com" style={{ color: "var(--amber)" }}>github ↗</a></li>
        </ul>
        <button onClick={() => setShowAuthModal(true)} className="nav-cta border-none cursor-pointer">Open App →</button>
      </nav>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="auth-modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowAuthModal(false)}>×</button>
            <h2>
              {authMode === 'login' ? 'Welcome Back' : 
               authMode === 'register' ? 'Create Account' : 
               'Reset Password'}
            </h2>
            
            {successMessage ? (
              <div className="auth-success-state">
                <div className="success-icon">✓</div>
                <p>{successMessage}</p>
                <button onClick={() => setSuccessMessage('')} className="btn primary w-full mt-4">
                  Back to Login
                </button>
              </div>
            ) : (
              <>
                <form onSubmit={handleAuth}>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      disabled={loading}
                    />
                  </div>
                  
                  {authMode !== 'forgot-password' && (
                    <div className="form-group">
                      <div className="label-row">
                        <label htmlFor="password">Password</label>
                        {authMode === 'login' && (
                          <button 
                            type="button" 
                            className="link-btn small-link"
                            onClick={() => { setAuthMode('forgot-password'); setError(''); }}
                          >
                            Forgot?
                          </button>
                        )}
                      </div>
                      <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={handlePasswordChange}
                        placeholder="••••••••"
                        required
                        disabled={loading}
                      />
                      {passwordWarning && <div className="password-warning">{passwordWarning}</div>}
                    </div>
                  )}
                  
                  {error && <div className="auth-error">{error}</div>}
                  
                  <button type="submit" disabled={loading} className="btn primary" style={{ width: '100%' }}>
                    {loading ? 'Processing...' : (
                      authMode === 'login' ? 'Sign In' : 
                      authMode === 'register' ? 'Join SmartKeep' : 
                      'Send Reset Link'
                    )}
                  </button>
                </form>
                
                {authMode !== 'forgot-password' && (
                  <div className="social-auth-section">
                    <div className="divider"><span>or continue with</span></div>
                    <div className="social-btns">
                      <button type="button" onClick={() => loginWithGoogle()} className="social-btn google" disabled={loading}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" />
                        Google
                      </button>
                      <button type="button" onClick={handleGitHubLogin} className="social-btn github" disabled={loading}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" alt="GitHub" />
                        GitHub
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="auth-toggle">
                  {authMode === 'login' ? (
                    <>
                      New to SmartKeep? <button onClick={() => { setAuthMode('register'); setError(''); }} className="link-btn">Create an account</button>
                    </>
                  ) : (
                    <>
                      Already have an account? <button onClick={() => { setAuthMode('login'); setError(''); }} className="link-btn">Sign in</button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── HERO WITH FLOATING UI SHARDS (FLIM.AI STYLE) ── */}
      <section className="strips-hero">
        <div className="float-container">
          <div className="float-shard shard-1">
            <div className="sui-bar2" style={{ background: "#f5c842", position:"absolute", left:0, top:20, bottom:20, width:4, borderRadius:4 }} />
            <div style={{ paddingLeft: 12 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent-color)", marginBottom: 8, letterSpacing: '0.1em' }}>EXTRACTION_ENGINE</div>
              <div style={{ fontSize: 15, color: "var(--text-color)", lineHeight: 1.6 }}>
                Successfully parsed <mark style={{background: "rgba(245, 200, 66, 0.2)", color: "#fff", padding: "0 4px", borderRadius: "4px"}}>14 key paragraphs</mark> from article body.
              </div>
            </div>
          </div>

          <div className="float-shard shard-2">
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Rust Ownership Model</div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>Dangling pointers are impossible in safe Rust. The borrow checker...</div>
            <div style={{ display: "flex", gap: 8 }}>
               <span className="mono-tag amber" style={{fontSize: 10}}>SYSTEMS</span>
               <span className="mono-tag" style={{fontSize: 10, borderColor: "rgba(255,255,255,0.1)", color: "var(--text-secondary)"}}>8 MIN READ</span>
            </div>
          </div>

          <div className="float-shard shard-3">
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
               <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>POST /api/v1/enrich</span>
               <span style={{ color: "var(--success)", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600 }}>201 CREATED</span>
             </div>
             <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
               <div style={{ background: "rgba(255,255,255,0.05)", height: 8, borderRadius: 4, width: "100%" }}></div>
               <div style={{ background: "rgba(255,255,255,0.05)", height: 8, borderRadius: 4, width: "80%" }}></div>
               <div style={{ background: "rgba(255,255,255,0.05)", height: 8, borderRadius: 4, width: "90%" }}></div>
             </div>
          </div>

          <div className="float-shard shard-4">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid rgba(245,200,66,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-color)", background: "rgba(245,200,66,0.1)", fontSize: "20px" }}>⚡</div>
              <div>
                <div style={{ fontSize: 15, color: "#fff", fontWeight: 600, marginBottom: 4 }}>Semantic Match</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>Score: 0.9412</div>
              </div>
            </div>
          </div>
          
          <div className="float-shard shard-5">
            <div style={{ color: "var(--success)", fontFamily: "var(--font-mono)", fontSize: 11, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{width: 6, height: 6, borderRadius: "50%", background: "var(--success)"}}></span> AI SUMMARY READY
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              A comprehensive guide to transitioning from monolith to microservices using event-driven architecture...
            </div>
          </div>
        </div>

        {/* Overlay + vignette */}
        <div className="strips-overlay" />

        {/* Hero text floats above */}
        <div className="hero-text">
          <div className="hero-pill">
            <div className="pill-dot" />
            AI-powered · open source · self-hostable
          </div>
          <h1 className="hero-h">
            Every article<br />
            you ever saved,<br />
            <em>finally findable.</em>
          </h1>
          <p className="hero-sub">
            SmartKeep saves URLs, scrapes full text, generates{" "}
            <strong>AI summaries</strong>, and searches 3,000 articles
            by <strong>meaning</strong> — not just keywords.
          </p>
          <div className="hero-btns">
            <button onClick={() => setShowAuthModal(true)} className="btn-a cursor-pointer border-none">Enter App →</button>
            <a href="#reader" className="btn-b"><span>↓</span> See it in action</a>
          </div>
        </div>

        <div className="scroll-hint">
          <div className="scroll-arrow" />
          scroll
        </div>
      </section>

      {/* ── MOSAIC SECTION ── */}
      <section id="features" className="sec">
        <div className="sec-tag">What SmartKeep saves</div>
        <h2 className="sec-h">A library of everything<br /><em>you've ever read.</em></h2>
        <p className="sec-p">Wikipedia deep-dives. Medium think-pieces. arXiv papers. GitHub READMEs. Stack Overflow answers. Any URL.</p>

        <div className="mosaic">
          {/* Row 1 */}
          <div className="mosaic-cell" style={{ gridColumn: "1/5", gridRow: "1/2" }}>
            <img src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&h=200&fit=crop&q=80" alt="" />
            <div className="mosaic-ann"><span className="mosaic-ann-hl">7 articles saved</span> from this shelf<br /><span className="mosaic-ann-tag">distributed-systems</span><span className="mosaic-ann-tag">databases</span></div>
          </div>
          <div className="mosaic-cell" style={{ gridColumn: "5/8", gridRow: "1/2" }}>
            <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=200&fit=crop&q=80" alt="" />
            <div className="mosaic-ann"><span className="mosaic-ann-hl">~8 min read</span> · advanced<br /><span className="mosaic-ann-tag">rust</span><span className="mosaic-ann-tag">systems</span></div>
          </div>
          <div className="mosaic-cell" style={{ gridColumn: "8/13", gridRow: "1/2" }}>
            <img src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&h=200&fit=crop&q=80" alt="" />
            <div className="mosaic-ann"><span className="mosaic-ann-hl">Reading collection</span> · 23 items<br /><span className="mosaic-ann-tag">machine-learning</span></div>
          </div>

          {/* Row 2 */}
          <div className="mosaic-cell" style={{ gridColumn: "1/4", gridRow: "2/3" }}>
            <img src="https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&h=200&fit=crop&q=80" alt="" />
            <div className="mosaic-ann"><span className="mosaic-ann-hl">3 annotations</span> in this article<br /><span className="mosaic-ann-tag">writing</span></div>
          </div>
          <div className="mosaic-cell" style={{ gridColumn: "4/9", gridRow: "2/3" }}>
            <img src="https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=600&h=200&fit=crop&q=80" alt="" />
            <div className="mosaic-ann"><span className="mosaic-ann-hl">Highlighted 4 passages</span><br /><span className="mosaic-ann-tag">productivity</span><span className="mosaic-ann-tag">notes</span></div>
          </div>
          <div className="mosaic-cell" style={{ gridColumn: "9/13", gridRow: "2/3" }}>
            <img src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400&h=200&fit=crop&q=80" alt="" />
            <div className="mosaic-ann"><span className="mosaic-ann-hl">0.94 similarity</span> to your query<br /><span className="mosaic-ann-tag">code</span><span className="mosaic-ann-tag">performance</span></div>
          </div>

          {/* Row 3 */}
          <div className="mosaic-cell" style={{ gridColumn: "1/6", gridRow: "3/4" }}>
            <img src="https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=600&h=200&fit=crop&q=80" alt="" />
            <div className="mosaic-ann"><span className="mosaic-ann-hl">Your longest read</span> · 22 min<br /><span className="mosaic-ann-tag">philosophy</span></div>
          </div>
          <div className="mosaic-cell" style={{ gridColumn: "6/9", gridRow: "3/4" }}>
            <img src="https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=200&fit=crop&q=80" alt="" />
            <div className="mosaic-ann"><span className="mosaic-ann-hl">Saved 30 days ago</span> — revisit?<br /><span className="mosaic-ann-tag">forgotten-gems</span></div>
          </div>
          <div className="mosaic-cell" style={{ gridColumn: "9/13", gridRow: "3/4" }}>
            <img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=200&fit=crop&q=80" alt="" />
            <div className="mosaic-ann"><span className="mosaic-ann-hl">AI-generated summary</span> ready<br /><span className="mosaic-ann-tag">team-knowledge</span></div>
          </div>
        </div>
      </section>

      {/* ── READER DEMO ── */}
      <section id="reader" className="sec">
        <div className="sec-tag">The reader</div>
        <h2 className="sec-h">Read, highlight,<br /><em>remember everything.</em></h2>
        <p className="sec-p" style={{ marginBottom: 48 }}>Select any text to highlight in four colors. Add margin notes. Export as Markdown.</p>

        <div className="reader-strip">
          <div className="reader-left">
            <div className="reader-title">Understanding Rust's Ownership Model</div>
            <div className="reader-meta">medium.com · Arjun Mehta · ~8 min read · advanced</div>
            <div className="progress-bar"><div className="progress-fill" /></div>
            <br />
            <div className="reader-body">
              The ownership system is Rust's most unique feature, and has deep implications
              for the rest of the language. Ownership enables Rust to make{" "}
              <span className="hl-y">memory safety guarantees without needing a garbage collector</span>.
              <br /><br />
              There can only be one owner at a time. When the owner goes out of scope,
              <span className="hl-g"> the value will be dropped</span> — the memory is freed
              automatically, with no runtime overhead.
              <br /><br />
              This means <span className="hl-r">dangling pointers are impossible</span>{" "}
              in safe Rust. The borrow checker analyzes every reference at compile time
              and rejects programs that violate the ownership rules.
              <br /><br />
              References in Rust are <span className="hl-b">guaranteed to always point to valid data</span>.
              Unlike C++, you cannot accidentally free memory that is still being used.
            </div>
          </div>
          <div className="reader-right">
            <div className="ann-label">Annotations · 3</div>
            {[
              { hl: "memory safety guarantees without needing a garbage collector", note: "key insight — compare with Go's GC pause time", c: "#f5c842" },
              { hl: "the value will be dropped", note: "RAII pattern — same as C++ destructors but enforced", c: "#3ecf8e" },
              { hl: "dangling pointers are impossible", note: "this is why Rust is used in OS kernels", c: "#f07070" },
            ].map((a, i) => (
              <div className="ann-card" key={i}>
                <div className="ann-hl-text">
                  <span className="ann-color-dot" style={{ background: a.c }} />
                  "{a.hl}"
                </div>
                <div className="ann-note">{a.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FULL WIDTH PHOTO BREAK ── */}
      <div className="photo-break">
        <img src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1400&h=420&fit=crop&q=80" alt="" />
        <div className="photo-break-overlay">
          <div className="pb-quote">
            <div className="pb-q-mark">"</div>
            <div className="pb-q-text">I saved 3,000 articles over five years and could never find them. SmartKeep found a paper I saved in 2022 from a vague description I gave it.</div>
            <div className="pb-q-who">— Arjun M., ML Engineer · IIT Bombay</div>
          </div>
        </div>
      </div>

      {/* ── SEARCH DEMO ── */}
      <section id="search" className="sec">
        <div className="search-split">
          <div>
            <div className="sec-tag">Semantic search</div>
            <h2 className="sec-h">Search the way<br />you <em>think.</em></h2>
            <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.8, marginBottom: 32 }}>
              Type "memory management in systems languages" and find your Rust article —
              even if it's tagged "ownership model." Hybrid mode blends BM25 keyword
              ranking with cosine similarity on local embeddings.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["Keyword", "Semantic", "Hybrid"].map(m => (
                <span key={m} style={{
                  padding: "6px 16px", borderRadius: 99,
                  background: m === "Hybrid" ? "rgba(245,200,66,.12)" : "var(--bg3)",
                  color: m === "Hybrid" ? "var(--amber)" : "var(--muted)",
                  border: m === "Hybrid" ? "1px solid rgba(245,200,66,.3)" : "1px solid var(--border)",
                  fontFamily: "var(--mono)", fontSize: 11,
                }}>{m}</span>
              ))}
            </div>
          </div>

          {/* Left: stacked photos */}
          <div>
            <div className="search-ui">
              <div className="sui-bar">
                <div className="sui-modes">
                  <span className="sui-mode off">keyword</span>
                  <span className="sui-mode off">semantic</span>
                  <span className="sui-mode on">hybrid</span>
                </div>
                <div className="sui-q">memory management in systems languages…</div>
                <div className="sui-ms">38ms</div>
              </div>
              <div className="sui-results">
                {SEARCH_RESULTS.map((r, i) => (
                  <div className="sui-row" key={i}>
                    <div className="sui-bar2" style={{ background: r.c }} />
                    <div>
                      <div className="sui-title">{r.title}</div>
                      <div className="sui-snip">{r.snip}</div>
                      <span className="sui-score">{r.score} similarity</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="sec" style={{ maxWidth: 1280 }}>
          <div className="sec-tag">How it works</div>
          <h2 className="sec-h">From URL to<br /><em>understanding.</em></h2>
          <div className="tl">
            {[
              {
                n: "1", tag: "input", h: "Paste any URL",
                p: "Drop a link in — or use the bookmarklet. The scraper fetches full article text, strips ads, extracts author, publish date, and Open Graph image.",
                img: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=200&fit=crop&q=80",
                code: <><div><span className="k">POST</span> /content</div><div>{"{"}<span className="s">"url"</span>: <span className="v">"https://..."</span>{"}"}</div><div style={{marginTop:8,color:"var(--green)"}}>→ 201 · enrichment_status: <span className="v">"pending"</span></div></>
              },
              {
                n: "2", tag: "enrichment", h: "AI does the work",
                p: "sentence-transformers generates a 384-dim embedding locally. Groq's LLaMA writes a 2-sentence summary. Tags suggested. Flesch-Kincaid scores difficulty.",
                img: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=200&fit=crop&q=80",
                code: <><div><span className="k">embedding</span>: vector(<span className="n">384</span>)</div><div><span className="k">summary</span>: <span className="v">"Rust eliminates..."</span></div><div><span className="k">difficulty</span>: <span className="v">"advanced"</span></div><div style={{marginTop:8,color:"var(--green)"}}>✓ enrichment: <span className="v">"complete"</span></div></>
              },
              {
                n: "3", tag: "retrieval", h: "Search by meaning",
                p: "Hybrid mode: query is embedded, cosine similarity runs against all vectors, BM25 scores blend in at 0.4/0.6 weight. Results in under 50ms.",
                img: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=400&h=200&fit=crop&q=80",
                code: <><div><span className="k">GET</span> /search?q=memory+mgmt</div><div><span className="k">mode</span>=<span className="v">hybrid</span></div><div style={{marginTop:8}}><span className="k">latency</span>: <span className="n">38ms</span></div><div><span className="k">top_similarity</span>: <span className="n">0.94</span></div><div style={{marginTop:8,color:"var(--amber)",fontSize:10}}>Found "Rust Ownership" — semantic match</div></>
              },
            ].map(s => (
              <div className="tl-row" key={s.n}>
                <div className="tl-n">{s.n}</div>
                <div>
                  <div className="tl-tag">{s.tag}</div>
                  <div className="tl-h">{s.h}</div>
                  <div className="tl-p">{s.p}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="tl-photo"><img src={s.img} alt="" loading="lazy" /></div>
                  <div className="tl-code">{s.code}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="sec">
        <div className="sec-tag">By the numbers</div>
        <h2 className="sec-h">Built to last,<br /><em>tested to perform.</em></h2>
        <div className="stats-row">
          {[
            { n: "57", l: "API endpoints across 10 build phases" },
            { n: "<50ms", l: "Average hybrid search on 10,000 records" },
            { n: "384", l: "Embedding dimensions, all-MiniLM-L6-v2" },
            { n: "85%+", l: "Test coverage, enforced in CI pipeline" },
          ].map(s => (
            <div className="st-cell" key={s.n}>
              <div className="st-n">{s.n}</div>
              <div className="st-l">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PHOTO QUOTE CARDS ── */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="sec-tag">Early feedback</div>
        <h2 className="sec-h">What people<br /><em>actually said.</em></h2>
        <div className="pq-grid">
          {[
            {
              img: "https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=400&h=180&fit=crop&q=80",
              text: <>I saved 3,000 articles over 5 years. Could never find them. SmartKeep's semantic search found a paper I saved in 2022 from <strong>a vague description I gave it.</strong></>,
              name: "Arjun M.", role: "ML Engineer, IIT Bombay", a: "A", c: "#f5c842"
            },
            {
              img: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=400&h=180&fit=crop&q=80",
              text: <>The auto-summary is genuinely good. <strong>It reads the article and gives you the actual point.</strong> I stopped writing my own notes entirely.</>,
              name: "Priya S.", role: "CS Student, 6th Sem", a: "P", c: "#3ecf8e"
            },
            {
              img: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=180&fit=crop&q=80",
              text: <>The knowledge graph is addictive. <strong>Seeing how your content connects visually</strong> changed how I think about building expertise.</>,
              name: "Rahul K.", role: "Backend Developer", a: "R", c: "#60b4f0"
            },
          ].map(q => (
            <div className="pq-card" key={q.name}>
              <div className="pq-img"><img src={q.img} alt="" loading="lazy" /></div>
              <div className="pq-body">
                <div className="pq-text">{q.text}</div>
                <div className="pq-by">
                  <div className="pq-av" style={{ background: `${q.c}15`, color: q.c }}>{q.a}</div>
                  <div>
                    <div className="pq-name">{q.name}</div>
                    <div className="pq-role">{q.role}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="cta">
        <div className="cta-photo" />
        <div className="cta-inner">
          <h2 className="cta-h">Your saved articles<br />are <em>waiting to be found.</em></h2>
          <p className="cta-sub">Paste a URL. SmartKeep handles the rest.</p>
          <div className="url-row">
            <input className="url-inp" value={url} onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSave()}
              placeholder="https://medium.com/your-article…" />
            <button className="url-sub" onClick={doSave}>
              {saved ? "✓ Saved!" : "Enter App →"}
            </button>
          </div>
          <div className="cta-note">
            {saved ? "enrichment running · summary & tags incoming…" : "open source · self-hostable · no account required to try"}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">Smart<b>Keep</b></div>
        <div className="footer-links">
          <a href="#">github</a>
          <a href="#">docs</a>
          <a href="#">api_reference</a>
          <a href="#">changelog</a>
        </div>
        <div className="footer-r">fastapi · pgvector · react · sentence-transformers</div>
      </footer>
    </div>
  );
}
