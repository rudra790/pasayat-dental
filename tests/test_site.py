import os
import re
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
import main


class SiteTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)
        self.payload = dict(name="Test Visitor", phone="+91 9876543210",
                            preferred_date="2099-01-01", preferred_time="11:00",
                            treatment="Braces", message=None, website="")

    def test_pages_and_local_assets(self):
        for route in main.PAGE_TITLES:
            response = self.client.get(route)
            self.assertEqual(response.status_code, 200)
            self.assertIn('name="viewport"', response.text)
            self.assertIn('/static/js/main.js', response.text)
            for asset in re.findall(r'(?:src|href|data-photo)="(/static/[^"?#]+)', response.text):
                self.assertEqual(self.client.get(asset).status_code, 200, asset)
            for link in re.findall(r'href="(/[^"#]*)', response.text):
                self.assertLess(self.client.get(link or '/').status_code, 400, link)

    def test_security_and_private_paths(self):
        for path in ['/', '/contact', '/missing', '/data/appointments.txt', '/.env', '/openapi.json']:
            response = self.client.get(path)
            self.assertEqual(response.headers['x-content-type-options'], 'nosniff')
            self.assertIn("frame-ancestors 'none'", response.headers['content-security-policy'])
            if path not in ['/', '/contact']:
                self.assertEqual(response.status_code, 404)
        response = self.client.get('/')
        nonce = re.search(r'nonce="([^"]+)"', response.text).group(1)
        self.assertIn(f"'nonce-{nonce}'", response.headers['content-security-policy'])
        self.assertEqual(self.client.get('/robots.txt').status_code, 200)
        self.assertEqual(self.client.get('/sitemap.xml').status_code, 200)

    def test_no_appointment_collection_endpoint(self):
        response = self.client.post('/api/appointment', json=self.payload)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.client.post('/contact', data=self.payload).status_code, 405)
        page = self.client.get('/contact').text
        self.assertIn('Continue to WhatsApp', page)
        self.assertNotIn('/api/appointment', page)
        self.assertIn("form-action 'none'", self.client.get('/contact').headers['content-security-policy'])

    def test_production_headers(self):
        with patch.dict(os.environ, {'VERCEL': '1'}):
            response = self.client.get('/')
            self.assertIn('strict-transport-security', response.headers)
            self.assertEqual(response.headers['referrer-policy'], 'no-referrer')


if __name__ == '__main__':
    unittest.main()
