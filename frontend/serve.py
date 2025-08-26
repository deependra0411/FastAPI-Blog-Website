#!/usr/bin/env python3
"""
Simple development server for the frontend.
This script serves the static frontend files.
"""

import http.server
import socketserver
import webbrowser
import os

PORT = 3000

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)

def main():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Frontend server running at http://localhost:{PORT}")
        print("Open your browser and navigate to the URL above")
        print("Press Ctrl+C to stop the server")
        
        # Automatically open browser
        webbrowser.open(f"http://localhost:{PORT}")
        
        httpd.serve_forever()

if __name__ == "__main__":
    main()
