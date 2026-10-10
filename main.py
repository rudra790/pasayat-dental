"""Pasayat Dental Clinic website with WhatsApp appointment requests."""

from html import escape
import os
from pathlib import Path
import secrets

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, PlainTextResponse, Response

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"

MAP_URL = "https://www.google.com/maps/place/Pasayat+Dental+Clinic+-+Braces+Specialist%2FTop+Dental+Clinic+in+Rourkela/@22.2588,84.8624768,17z/data=!3m1!4b1!4m6!3m5!1s0x3a201ec90dac97d9:0x9e8b292e2d89f005!8m2!3d22.2588!4d84.8650517!16s%2Fg%2F12ml2msb1"
PUBLIC_SITE_URL = os.getenv("PUBLIC_SITE_URL", "").rstrip("/")

app = FastAPI(title="Pasayat Dental Clinic", docs_url=None, redoc_url=None, openapi_url=None)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    nonce = secrets.token_urlsafe(24)
    request.state.csp_nonce = nonce
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        f"script-src 'self' 'nonce-{nonce}'; "
        "style-src 'self'; img-src 'self' data:; font-src 'self'; "
        "connect-src 'self'; object-src 'none'; base-uri 'none'; "
        "frame-ancestors 'none'; form-action 'none'"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if os.getenv("VERCEL") or request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
    if not request.url.path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-store"
    return response


PAGE_TITLES = {
    "/": "Home",
    "/about": "About",
    "/treatments": "Treatments",
    "/gallery": "Gallery",
    "/contact": "Contact",
}

PAGE_SEO = {
    "/": {
        "title": "Pasayat Dental Clinic | Dental Care in Rourkela",
        "description": "Pasayat Dental Clinic in Rourkela, Odisha. DR PASAYAT, MDS, has 15 years of experience. View treatments and request an appointment.",
    },
    "/about": {
        "title": "About Pasayat Dental Clinic | Rourkela",
        "description": "Learn about Pasayat Dental Clinic in Ispat Central Market, Rourkela, and DR PASAYAT, MDS, with 15 years of experience.",
    },
    "/treatments": {
        "title": "Dental Treatments | Pasayat Dental Clinic, Rourkela",
        "description": "Explore Braces, Root Canal, Teeth Cleaning, and Fillings at Pasayat Dental Clinic in Rourkela, Odisha.",
    },
    "/gallery": {
        "title": "Clinic Gallery | Pasayat Dental Clinic, Rourkela",
        "description": "Explore dental equipment, team photographs, and dental care reference images at Pasayat Dental Clinic in Rourkela.",
    },
    "/contact": {
        "title": "Contact & Appointments | Pasayat Dental Clinic",
        "description": "Contact Pasayat Dental Clinic in Rourkela, Odisha. Call, WhatsApp, view the clinic location, or send an appointment request.",
    },
}


def get_site_origin(request: Request) -> str:
    """Use the configured public origin or the current request origin."""
    return PUBLIC_SITE_URL or str(request.base_url).rstrip("/")


def build_business_schema(site_origin: str) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "Dentist",
        "@id": f"{site_origin}/#dentist",
        "name": "Pasayat Dental Clinic",
        "url": f"{site_origin}/",
        "telephone": "09437245564",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Ispat Central Market, Ambagan Cir, behind Civic Centre, Bank Street, Sector 19",
            "addressLocality": "Rourkela",
            "addressRegion": "Odisha",
            "postalCode": "769005",
        },
        "hasMap": MAP_URL,
    }


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
@app.get("/about", response_class=HTMLResponse, include_in_schema=False)
@app.get("/treatments", response_class=HTMLResponse, include_in_schema=False)
@app.get("/gallery", response_class=HTMLResponse, include_in_schema=False)
@app.get("/contact", response_class=HTMLResponse, include_in_schema=False)
async def page(request: Request):
    path = request.url.path
    site_origin = get_site_origin(request)
    canonical_url = f"{site_origin}{path if path != '/' else '/'}"
    return templates.TemplateResponse(
        request=request,
        name=f"{PAGE_TITLES[path].lower()}.html",
        context={
            "page_title": PAGE_TITLES[path],
            "seo": PAGE_SEO[path],
            "canonical_url": canonical_url,
            "site_origin": site_origin,
            "business_schema": build_business_schema(site_origin),
        },
    )

@app.get("/robots.txt", include_in_schema=False)
async def robots_txt(request: Request):
    site_origin = get_site_origin(request)
    content = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /api/\n"
        f"Sitemap: {site_origin}/sitemap.xml\n"
    )
    return PlainTextResponse(content, media_type="text/plain")


@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml(request: Request):
    site_origin = get_site_origin(request)
    locations = [
        f"{site_origin}{path if path != '/' else '/'}"
        for path in PAGE_TITLES
    ]
    url_entries = "\n".join(
        f"  <url><loc>{escape(location)}</loc></url>" for location in locations
    )
    content = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{url_entries}\n"
        "</urlset>"
    )
    return Response(content=content, media_type="application/xml")


@app.exception_handler(404)
async def not_found(request: Request, exc):
    site_origin = get_site_origin(request)
    return templates.TemplateResponse(
        request=request,
        name="404.html",
        context={
            "page_title": "Page not found",
            "seo": {
                "title": "Page not found | Pasayat Dental Clinic",
                "description": "This page could not be found. Visit Pasayat Dental Clinic in Rourkela.",
            },
            "canonical_url": None,
            "noindex": True,
            "site_origin": site_origin,
            "business_schema": build_business_schema(site_origin),
        },
        status_code=404,
    )
