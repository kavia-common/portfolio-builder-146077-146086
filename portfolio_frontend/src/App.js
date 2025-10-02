import React, { useState, useEffect } from 'react';
import './App.css';
import './index.css';
import { extractResumeDataFromPdf } from './utils/pdfParser';

// PUBLIC_INTERFACE
function App() {
  /**
   * PUBLIC_INTERFACE
   * Main portfolio app with:
   * - Upload area (top)
   * - Generated portfolio (below) using Ocean Professional theme
   * - Parses the provided PDF on first load as initial data
   */
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resume, setResume] = useState(null);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load the provided PDF as initial data source
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        setError('');
        // Use absolute path provided by environment (attachments mounted at project root)
        const initialUrl = '/attachments/20251002_075210_akshat_Mishra_resume_VB4P_1.pdf';
        const data = await extractResumeDataFromPdf(initialUrl);
        setResume(data);
      } catch (e) {
        console.error(e);
        setError('Unable to parse initial resume. You can upload a PDF to proceed.');
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, []);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // PUBLIC_INTERFACE
  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const data = await extractResumeDataFromPdf(file);
      setResume(data);
    } catch (err) {
      console.error(err);
      setError('Failed to parse PDF. Please try another file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App" style={styles.app}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.brandMark}>AM</div>
          <div style={styles.brandText}>
            <div style={styles.brandTitle}>Ocean Professional</div>
            <div style={styles.brandSub}>Portfolio Generator</div>
          </div>
        </div>

        <div style={styles.actions}>
          <label style={styles.uploadLabel}>
            <input
              type="file"
              accept="application/pdf"
              onChange={onFileChange}
              style={{ display: 'none' }}
            />
            Upload PDF
          </label>
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            style={styles.toggleBtn}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.uploadInfo}>
          <h1 style={styles.h1}>Build your portfolio in seconds</h1>
          <p style={styles.lead}>
            Upload a resume PDF and we will extract your information to generate a clean, modern portfolio.
          </p>
          <p style={styles.hint}>Using theme: Ocean Professional (Blue & Amber)</p>
        </section>

        {loading && <div style={styles.card}>Parsing PDF… Please wait.</div>}
        {error && <div style={{ ...styles.card, ...styles.errorCard }}>{error}</div>}

        {resume && (
          <section style={styles.portfolio}>
            <Hero data={resume} />
            <Content data={resume} />
          </section>
        )}
      </main>

      <footer style={styles.footer}>
        <span>© {new Date().getFullYear()} Generated with Ocean Professional</span>
      </footer>
    </div>
  );
}

function Hero({ data }) {
  const name = data?.name || 'Your Name';
  const title = data?.title || 'Software Engineer';
  const email = data?.contact?.email;
  const phone = data?.contact?.phone;
  const location = data?.contact?.location;
  const links = data?.contact?.links || [];
  const summary = data?.summary;

  return (
    <div style={styles.hero}>
      <div style={styles.heroLeft}>
        <h2 style={styles.name}>{name}</h2>
        <p style={styles.title}>{title}</p>
        {summary && <p style={styles.summary}>{summary}</p>}
        <div style={styles.tags}>
          {location && <span style={styles.tag}>{location}</span>}
          {email && <span style={styles.tag}>{email}</span>}
          {phone && <span style={styles.tag}>{phone}</span>}
        </div>
      </div>
      <div style={styles.heroRight}>
        {links.slice(0, 4).map((l, idx) => (
          <a key={idx} href={normalizeLink(l)} target="_blank" rel="noreferrer" style={styles.linkBtn}>
            {shortLink(l)}
          </a>
        ))}
      </div>
    </div>
  );
}

function Content({ data }) {
  const skills = data?.skills || [];
  const education = data?.education || [];
  const experience = data?.experience || [];
  const projects = data?.projects || [];

  return (
    <div style={styles.grid}>
      <div style={styles.column}>
        <Card title="Skills" accent="secondary">
          {skills.length ? (
            <div style={styles.skillWrap}>
              {skills.map((s, i) => (
                <span key={i} style={styles.skillChip}>{s}</span>
              ))}
            </div>
          ) : (
            <Empty text="No skills detected" />
          )}
        </Card>

        <Card title="Education">
          {education.length ? education.map((e, i) => (
            <div key={i} style={styles.eduItem}>
              <div style={styles.eduHeader}>
                <strong>{e.degree}</strong>
                <span style={styles.muted}>{e.period}</span>
              </div>
              <div style={styles.muted}>{e.institution}</div>
              {e.details && <div style={styles.bodyText}>{e.details}</div>}
            </div>
          )) : <Empty text="No education entries detected" />}
        </Card>
      </div>

      <div style={styles.column}>
        <Card title="Experience" accent="primary">
          {experience.length ? experience.map((ex, i) => (
            <div key={i} style={styles.expItem}>
              <div style={styles.expHeader}>
                <strong>{ex.role || ex.company}</strong>
                <span style={styles.muted}>{ex.period}</span>
              </div>
              {ex.company && <div style={styles.muted}>{ex.company}</div>}
              {ex.bullets && ex.bullets.length > 0 && (
                <ul style={styles.bullets}>
                  {ex.bullets.slice(0, 6).map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          )) : <Empty text="No experience entries detected" />}
        </Card>

        <Card title="Projects" accent="secondary">
          {projects.length ? projects.map((p, i) => (
            <div key={i} style={styles.projectItem}>
              <div style={styles.projectHeader}>
                <strong>{p.name || 'Untitled Project'}</strong>
                {p.link && (
                  <a href={normalizeLink(p.link)} target="_blank" rel="noreferrer" style={styles.projectLink}>
                    View
                  </a>
                )}
              </div>
              {p.description && <div style={styles.bodyText}>{p.description}</div>}
              {p.tech && p.tech.length > 0 && (
                <div style={styles.techWrap}>
                  {p.tech.slice(0, 6).map((t, j) => (
                    <span key={j} style={styles.techChip}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          )) : <Empty text="No projects detected" />}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children, accent = 'primary' }) {
  const color = accent === 'secondary' ? themeColors.secondary : themeColors.primary;
  return (
    <div style={{ ...styles.card, borderTop: `4px solid ${color}` }}>
      <div style={styles.cardHeader}>
        <h3 style={{ ...styles.h3, color }}>{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Empty({ text }) {
  return <div style={styles.empty}>{text}</div>;
}

const themeColors = {
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
  primary: '#2563EB',
  secondary: '#F59E0B',
  error: '#EF4444',
};

const styles = {
  app: {
    background: themeColors.background,
    color: themeColors.text,
    minHeight: '100vh',
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    background: themeColors.surface,
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 12 },
  brandMark: {
    width: 40, height: 40, borderRadius: 10,
    background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(17,24,39,0.05))',
    color: themeColors.primary,
    display: 'grid', placeItems: 'center',
    fontWeight: 800,
    border: '1px solid #e5e7eb'
  },
  brandText: { display: 'flex', flexDirection: 'column', lineHeight: 1.1 },
  brandTitle: { fontWeight: 700, fontSize: 14, color: themeColors.text },
  brandSub: { fontSize: 12, color: '#6b7280' },
  actions: { display: 'flex', alignItems: 'center', gap: 10 },
  uploadLabel: {
    background: themeColors.primary,
    color: 'white',
    border: 0,
    padding: '8px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
  },
  toggleBtn: {
    background: 'white',
    color: themeColors.text,
    border: '1px solid #e5e7eb',
    padding: '8px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
  },
  main: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '24px 16px 48px',
  },
  uploadInfo: {
    background: 'linear-gradient(180deg, rgba(37,99,235,0.08), rgba(245,158,11,0.06))',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  h1: { margin: 0, fontSize: 28 },
  lead: { margin: '8px 0 0', color: '#374151' },
  hint: { marginTop: 6, color: '#6b7280', fontSize: 12 },
  portfolio: { display: 'flex', flexDirection: 'column', gap: 16 },
  hero: {
    background: themeColors.surface,
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 20,
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
  },
  heroLeft: { flex: 1, minWidth: 260 },
  heroRight: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' },
  name: { fontSize: 26, margin: '0 0 4px', color: themeColors.text },
  title: { margin: '0 0 12px', color: themeColors.primary, fontWeight: 600 },
  summary: { margin: '0 0 8px', color: '#374151' },
  tags: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  tag: {
    background: '#F3F4F6',
    border: '1px solid #E5E7EB',
    color: '#111827',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 12,
  },
  linkBtn: {
    background: 'white',
    color: themeColors.primary,
    border: `1px solid ${themeColors.primary}33`,
    padding: '8px 12px',
    borderRadius: 10,
    fontWeight: 600,
    textDecoration: 'none',
    boxShadow: '0 6px 16px rgba(37,99,235,0.12)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 16,
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  card: {
    background: themeColors.surface,
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 8px 24px rgba(17,24,39,0.04)',
  },
  errorCard: {
    borderColor: themeColors.error,
    color: themeColors.error,
    background: '#FEF2F2',
  },
  cardHeader: {
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  h3: { margin: 0, fontSize: 18 },
  empty: {
    color: '#6b7280',
    fontStyle: 'italic',
  },
  skillWrap: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    background: '#EFF6FF',
    color: '#1D4ED8',
    border: '1px solid #DBEAFE',
    padding: '6px 10px',
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 12,
  },
  eduItem: { padding: '8px 0', borderTop: '1px dashed #e5e7eb' },
  eduHeader: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  muted: { color: '#6b7280' },
  bodyText: { color: '#374151', marginTop: 6 },
  expItem: { padding: '10px 0', borderTop: '1px dashed #e5e7eb' },
  expHeader: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  bullets: { margin: '8px 0 0 16px' },
  projectItem: { padding: '10px 0', borderTop: '1px dashed #e5e7eb' },
  projectHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  projectLink: {
    color: themeColors.secondary,
    textDecoration: 'none',
    fontWeight: 700,
  },
  techWrap: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  techChip: {
    background: '#FFFBEB',
    color: '#B45309',
    border: '1px solid #FEF3C7',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  },
  footer: {
    textAlign: 'center',
    padding: '16px',
    color: '#6b7280',
  },
  // Responsive grid for larger screens
  '@media(min-width: 900px)': {},
};

// Helpers
function shortLink(url) {
  try {
    const u = new URL(normalizeLink(url));
    return u.hostname.replace('www.', '');
  } catch {
    return url.length > 24 ? url.slice(0, 24) + '…' : url;
  }
}
function normalizeLink(link) {
  if (!/^https?:\/\//i.test(link)) {
    return 'https://' + link;
  }
  return link;
}

export default App;
