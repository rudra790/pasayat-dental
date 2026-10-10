# Pasayat Dental Clinic

Responsive FastAPI website with local images, a moving clinic-name banner, a gallery, and a WhatsApp appointment form. **No database, appointment API, or server-side form storage.**

## Appointment flow

The visitor fills in name, phone, preferred date/time, treatment, and an optional message. Continue to WhatsApp opens a prefilled message addressed to **+91 9437245564**. The visitor must tap Send inside WhatsApp. The website does not claim the request has been sent or confirmed. Details are not sent to this site's server or stored in browser storage. JavaScript is required; phone and direct WhatsApp links remain available without it.

## Run locally

Python 3.13:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn main:app --reload
```

Open http://127.0.0.1:8000.

## Push to GitHub

Create an empty GitHub repository, then run from this folder:

```powershell
git init -b main
git add .
git commit -m "Prepare clinic website with WhatsApp appointments"
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

If the repository is already initialized, skip git init. No GitHub remote is configured by this project. `.gitignore` excludes local environments, credentials, caches, and the legacy data directory. Existing legacy data is preserved locally and never used by this app. Do not upload it manually.

## Deploy to Vercel

1. Import the GitHub repository into Vercel.
2. Choose **FastAPI** and this folder as the root directory.
3. Leave Build Command and Output Directory unset; keep the default installation settings.
4. Deploy. No database, API key, or required environment variable is needed.
5. Optionally set PUBLIC_SITE_URL to your final HTTPS domain, then redeploy for canonical URLs and the sitemap. Environment files are not automatically loaded locally.
6. Verify the five pages, gallery, mobile menu, and WhatsApp handoff on your own phone. Do not send a test message unless intended.

`vercel.json` selects FastAPI; `.python-version` selects Python 3.13; `main.py` exports the app. Setup follows [Vercel's FastAPI guide](https://vercel.com/docs/frameworks/backend/fastapi).

## Security and privacy

- No public data-write endpoint, database connection, patient-data file writes, or form fetch requests.
- Form submissions are blocked by CSP; JavaScript navigates directly to WhatsApp using encoded message text and a fixed clinic number.
- CSP uses per-response script nonces, denies framing and plugins, and restricts resources to this site.
- MIME-sniffing protection, no-referrer, restricted browser permissions, and HTTPS HSTS headers are included. API documentation endpoints are disabled.
- Secret files and legacy data are excluded from Git and Vercel uploads.
- The form checks Indian phone numbers, required fields, clinic hours, and past dates in Asia/Kolkata. These checks help visitors; they are not server-side abuse protection for WhatsApp.

## Checks

```powershell
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python -m unittest discover -s tests -v
node --check static/js/main.js
node --test tests/whatsapp.test.cjs
```

Automated checks cover pages, local assets, headers, private paths, disabled collection endpoints, and the JavaScript WhatsApp handoff. Browser/device visual testing requires a connected browser.

All nine supplied images are connected. Teeth images are labeled as references, not Pasayat patient results; some include third-party branding. Verify supplied photos are approved for publication.
