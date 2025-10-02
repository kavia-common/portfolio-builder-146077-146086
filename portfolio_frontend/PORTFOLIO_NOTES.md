# Portfolio Frontend — Ocean Professional

This app displays Akshat Mishra’s personal portfolio parsed directly from a bundled resume PDF.

Behavior:
- Single-user showcase ONLY (no upload, no editing).
- Always parses: `attachments/20251002_075656_akshat_Mishra_resume_VB4P_1.pdf` at runtime.
- Displays extracted Name, Contact, Skills, Education, Experience, and Projects.
- Modern "Ocean Professional" theme (primary: #2563EB, secondary: #F59E0B).
- Light/Dark mode toggle available.

Notes:
- PDF parsing is done in-browser using pdfjs-dist via dynamic import from CDN.
- No environment variables are required.
- If parsing fails, the UI shows an error and suggests refreshing the page.
