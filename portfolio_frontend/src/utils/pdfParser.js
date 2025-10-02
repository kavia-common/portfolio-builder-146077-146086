//
// Lightweight PDF text extraction and resume parsing using browser PDF.js via dynamic import.
// No extra dependencies are added; we'll use a dynamic CDN import for pdfjs-dist at runtime.
//
// PUBLIC_INTERFACE
export async function extractResumeDataFromPdf(fileOrUrl) {
  /**
   * PUBLIC_INTERFACE
   * Extracts structured resume data from a PDF. Accepts a File object (from input)
   * or a URL string. Uses pdfjs-dist via dynamic import from CDN so we don't add
   * a package dependency.
   *
   * Returns a normalized object:
   * {
   *   name: string,
   *   title: string,
   *   contact: { email, phone, location, links: string[] },
   *   summary: string,
   *   skills: string[],
   *   education: Array<{ degree, institution, period, details?: string }>,
   *   experience: Array<{ company, role, period, bullets: string[] }>,
   *   projects: Array<{ name, description, tech?: string[], link?: string }>
   * }
   */
  const pdfjs = await getPdfJs();
  let loadingTask;

  if (typeof fileOrUrl === 'string') {
    loadingTask = pdfjs.getDocument(fileOrUrl);
  } else if (fileOrUrl instanceof File) {
    const arrayBuffer = await fileOrUrl.arrayBuffer();
    loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  } else if (fileOrUrl && fileOrUrl.arrayBuffer) {
    // Blob-like
    const arrayBuffer = await fileOrUrl.arrayBuffer();
    loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  } else {
    throw new Error('Unsupported input to extractResumeDataFromPdf');
  }

  const pdf = await loadingTask.promise;
  const maxPages = Math.min(pdf.numPages, 10);
  let fullText = '';

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((it) => it.str).join('\n');
    fullText += '\n' + pageText;
  }

  const parsed = parseResumeText(fullText);
  return parsed;
}

async function getPdfJs() {
  // Load pdfjs-dist from CDN dynamically for browser use
  // eslint-disable-next-line no-undef
  const module = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');
  // Set workerSrc if available
  if (module && module.GlobalWorkerOptions) {
    module.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }
  return module;
}

// Heuristic text parser for common resume sections.
// Designed to be robust to variations and produce reasonable defaults.
function parseResumeText(text) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Join long text for regex searches
  const blob = lines.join('\n');

  // Name heuristic: first non-empty line usually name if <= 5 words and not a label
  const probableName = (lines[0] || '').length > 2 && (lines[0] || '').split(' ').length <= 6 ? lines[0] : guessNameFromText(lines);

  const emailMatch = blob.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/im);
  const phoneMatch = blob.match(/(\+?\d[\d\s\-().]{7,}\d)/m);
  const locationMatch = blob.match(/\b([A-Z][a-zA-Z]+(?:,\s*[A-Z][a-zA-Z]+)+)\b/);

  const links = Array.from(new Set([
    ...(blob.match(/https?:\/\/[^\s)]+/g) || []),
    ...(blob.match(/\bwww\.[^\s)]+/g) || []),
    ...(blob.match(/\bgithub\.com\/[^\s)]+/gi) || []),
    ...(blob.match(/\blinkedin\.com\/[^\s)]+/gi) || []),
    ...(blob.match(/\bportfolio\.[^\s)]+/gi) || []),
  ]));

  const skills = extractSkills(blob);
  const education = extractEducation(blob);
  const experience = extractExperience(blob);
  const projects = extractProjects(blob);

  const summary = extractSummary(blob, probableName);

  // Title heuristic: often present next to name or on 2nd line
  let title = '';
  if (lines[1] && lines[1].length < 80 && !lines[1].match(/(email|phone|linkedin|github|summary|objective|experience|education|projects)/i)) {
    title = lines[1];
  }

  return {
    name: probableName || '',
    title,
    contact: {
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      location: locationMatch ? locationMatch[1] : '',
      links,
    },
    summary,
    skills,
    education,
    experience,
    projects,
  };
}

function guessNameFromText(lines) {
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const l = lines[i];
    if (!l) continue;
    if (/^(email|contact|skills|education|experience|projects|summary|objective)\b/i.test(l)) continue;
    if (l.split(' ').length <= 6 && /^[A-Za-z .'-]+$/.test(l)) {
      return l.replace(/\s{2,}/g, ' ').trim();
    }
  }
  return '';
}

function extractSkills(text) {
  // Look for "Skills" or "Technical Skills" section
  const section = findSection(text, /(skills|technical skills)/i);
  if (!section) return [];
  // Split by commas or bullets or newlines
  const raw = section.split(/[\n•,;]+/).map((s) => s.trim()).filter(Boolean);
  // Remove header words
  const filtered = raw.filter((r) => !/^(skills|technical skills)$/i.test(r));
  // Flatten items like "Languages: JS, TS" -> ["JS","TS"]
  const expanded = filtered.flatMap((r) => {
    const afterColon = r.includes(':') ? r.split(':').slice(1).join(':') : r;
    return afterColon.split(/[,;•]+/).map((s) => s.trim()).filter(Boolean);
  });
  // Dedup and normalize capitalization
  return Array.from(new Set(expanded.map(cap)));
}

function extractEducation(text) {
  const section = findSection(text, /(education|academics|academic background)/i);
  if (!section) return [];
  const entries = [];
  const lines = section.split('\n').map((l) => l.trim()).filter(Boolean);
  let current = null;

  lines.forEach((l) => {
    if (/^(education|academics)/i.test(l)) return;

    // New entry detection: line with Degree at Institution (Year - Year)
    if (/(\bB\.?Tech|B\.?E|B\.?Sc|M\.?Tech|M\.?E|M\.?Sc|Bachelor|Master|Diploma|Ph\.?D)/i.test(l)) {
      if (current) entries.push(current);
      current = { degree: l, institution: '', period: '', details: '' };
    } else if (/university|college|institute|school/i.test(l)) {
      if (!current) current = { degree: '', institution: '', period: '', details: '' };
      if (current.institution) current.institution += ' ' + l;
      else current.institution = l;
    } else if (/\b(20\d{2}).{0,5}(\b20\d{2}\b|present|current)/i.test(l)) {
      if (!current) current = { degree: '', institution: '', period: '', details: '' };
      current.period = l;
    } else {
      if (!current) current = { degree: '', institution: '', period: '', details: '' };
      current.details = (current.details ? current.details + ' ' : '') + l;
    }
  });
  if (current) entries.push(current);

  return entries.map((e) => ({
    degree: e.degree || e.details || '',
    institution: e.institution || '',
    period: e.period || '',
    details: e.details || '',
  }));
}

function extractExperience(text) {
  const section = findSection(text, /(experience|work experience|professional experience)/i);
  if (!section) return [];
  const lines = section.split('\n').map((l) => l.trim()).filter(Boolean);

  const entries = [];
  let current = null;
  lines.forEach((l) => {
    if (/^(experience|work experience|professional experience)$/i.test(l)) return;

    // Start of new role: often "Company – Role" or "Role at Company"
    if (/[–-]/.test(l) && /at|@| - | – |—/.test(l) || /intern|engineer|developer|manager|lead/i.test(l)) {
      if (current) entries.push(current);
      current = { company: '', role: '', period: '', bullets: [] };

      // Attempt to split "Role - Company"
      const parts = l.split(/[-–—]| at | @ /i).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        // Heuristic: the shorter part is often role, but try keywords
        const roleIdx = parts.findIndex((p) => /intern|engineer|developer|manager|lead|analyst|consultant/i.test(p));
        if (roleIdx >= 0) {
          current.role = parts[roleIdx];
          current.company = parts.filter((_, i) => i !== roleIdx).join(' - ');
        } else {
          current.role = parts[0];
          current.company = parts.slice(1).join(' - ');
        }
      } else {
        current.role = l;
      }
    } else if (/\b(20\d{2}).{0,12}(\b20\d{2}\b|present|current)/i.test(l)) {
      if (!current) current = { company: '', role: '', period: '', bullets: [] };
      current.period = l;
    } else if (/^[-•]/.test(l) || l.length < 140) {
      if (!current) current = { company: '', role: '', period: '', bullets: [] };
      current.bullets.push(l.replace(/^[-•]\s?/, '').trim());
    } else {
      // Additional description
      if (!current) current = { company: '', role: '', period: '', bullets: [] };
      current.bullets.push(l);
    }
  });
  if (current) entries.push(current);
  return entries;
}

function extractProjects(text) {
  const section = findSection(text, /(projects|personal projects)/i);
  if (!section) return [];
  const lines = section.split('\n').map((l) => l.trim()).filter(Boolean);
  const entries = [];

  let current = null;
  lines.forEach((l) => {
    if (/^(projects|personal projects)$/i.test(l)) return;

    if (/^[-•]/.test(l) || /^[A-Z][A-Za-z0-9 ._-]{2,}$/.test(l)) {
      if (current) entries.push(current);
      current = { name: l.replace(/^[-•]\s?/, '').trim(), description: '', tech: [], link: '' };
    } else if (/tech|stack|tools/i.test(l)) {
      if (!current) current = { name: '', description: '', tech: [], link: '' };
      const parts = l.split(/:|-/).slice(1).join(':').split(/[,;•]+/).map((s) => s.trim()).filter(Boolean);
      current.tech = Array.from(new Set([...(current.tech || []), ...parts.map(cap)]));
    } else if (/https?:\/\/|github\.com|demo|live/i.test(l)) {
      if (!current) current = { name: '', description: '', tech: [], link: '' };
      const link = (l.match(/https?:\/\/[^\s)]+/) || [l])[0];
      current.link = link;
    } else {
      if (!current) current = { name: '', description: '', tech: [], link: '' };
      current.description = current.description ? current.description + ' ' + l : l;
    }
  });
  if (current) entries.push(current);
  return entries;
}

function extractSummary(text, name) {
  const section = findSection(text, /(summary|objective|about)/i);
  if (section) {
    const withoutHeader = section.replace(/^(summary|objective|about)\s*:?/i, '').trim();
    return withoutHeader.split('\n').slice(0, 3).join(' ');
  }
  // Fallback: first 2-3 lines after name that look like sentence
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const startIdx = Math.max(0, lines.findIndex((l) => l.includes(name)));
  const candidate = lines.slice(startIdx + 1, startIdx + 5).filter((l) => /[.!]$/.test(l)).slice(0, 2).join(' ');
  return candidate || '';
}

function findSection(text, headerRegex) {
  // Find the header
  const lines = text.split('\n');
  const indexes = [];
  lines.forEach((l, idx) => {
    if (headerRegex.test(l)) indexes.push(idx);
  });
  if (!indexes.length) return '';

  const start = indexes[0];
  // Find next header-like line to bound the section
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^(skills|technical skills|experience|work experience|professional experience|education|academics|projects|personal projects|summary|objective|about|certifications|awards)\b/i.test(lines[i])) {
      end = i;
      break;
    }
  }

  return lines.slice(start, end).join('\n').trim();
}

function cap(s) {
  return s.replace(/\s+/g, ' ').trim().replace(/\b\w/g, (m) => m.toUpperCase());
}
