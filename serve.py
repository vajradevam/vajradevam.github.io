#!/usr/bin/env python3
"""Simple HTTP server for local preview."""
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
DIR = sys.argv[2] if len(sys.argv) > 2 else "."

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving {DIR} at http://localhost:{PORT}")
    httpd.serve_forever()
