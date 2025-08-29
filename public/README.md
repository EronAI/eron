# Entrepreneur Dashboard - Static Prototype

This workspace now contains a plain HTML/CSS/JS static prototype of the dashboard. No Node, npm, or build steps are required — just open the site in a browser.

Files:
- `index.html` — the single-page prototype
- `static/styles.css` — styles
- `static/app.js` — sample data and Chart.js wiring

How to run
- Double-click `index.html` in File Explorer, or open it from the browser via "File → Open".
- For a local static server (recommended for Chart.js), run in PowerShell if you have Python:

```powershell
cd "c:\Users\adil\Desktop\Test AI\entrepreneur-dashboard"
python -m http.server 5173

# then open http://localhost:5173 in your browser
```

Notes
- The prototype uses Chart.js from CDN. No build or dependencies required.
- If you want me to add export buttons, widget customization, or convert this back to a React/Vite project, tell me which and I'll implement it.
