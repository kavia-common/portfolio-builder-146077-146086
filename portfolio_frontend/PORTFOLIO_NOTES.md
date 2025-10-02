# Portfolio Frontend — Ocean Professional

This app generates a modern personal portfolio from a PDF resume.

Features:
- Upload area at the top to select a PDF
- Parses the provided initial resume (attachments/20251002_075210_akshat_Mishra_resume_VB4P_1.pdf) on first load
- Displays extracted Name, Contact, Skills, Education, Experience, and Projects
- Modern "Ocean Professional" theme (primary: #2563EB, secondary: #F59E0B)
- Light/Dark mode toggle

Notes:
- PDF parsing is done in-browser using pdfjs-dist via dynamic import from CDN.
- No environment variables are required for basic operation.
- If parsing fails, the UI will display an error and you can try another file.
