#!/usr/bin/env python3
"""Loopback-only static server for the labeler plus noclip texture-view proxy."""
from __future__ import annotations

import argparse
import http.client
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit

UPSTREAM_HOST, UPSTREAM_PORT = "127.0.0.1", 18089
PROXY_PREFIXES = ("/textured/", "/three/", "/static/", "/data/MarioKartWii/")

class LabelerHandler(SimpleHTTPRequestHandler):
    def should_proxy(self, path: str) -> bool:
        return path.startswith(PROXY_PREFIXES)

    def do_GET(self):
        path = urlsplit(self.path).path
        if self.should_proxy(path):
            if path.startswith(("/textured/", "/three/")):
                upstream_path = self.path[self.path.find("/", 1):]
            else:
                upstream_path = self.path
            try:
                conn = http.client.HTTPConnection(UPSTREAM_HOST, UPSTREAM_PORT, timeout=30)
                conn.request("GET", upstream_path, headers={"Host": f"{UPSTREAM_HOST}:{UPSTREAM_PORT}"})
                response = conn.getresponse()
                body = response.read()
            except OSError as error:
                self.send_error(502, f"noclip renderer unavailable: {error}")
                return
            self.send_response(response.status, response.reason)
            for key, value in response.getheaders():
                if key.lower() not in {"connection", "transfer-encoding", "content-encoding"}:
                    self.send_header(key, value)
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=18088)
    args = parser.parse_args()
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), LabelerHandler)
    print(f"labeler server: http://127.0.0.1:{args.port}", flush=True)
    server.serve_forever()

if __name__ == "__main__":
    main()
