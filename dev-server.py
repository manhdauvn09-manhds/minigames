# Dev-only static server: serves files with Cache-Control: no-store
# Tránh ES module cache cứng đầu khi dev nhanh.
import http.server, socketserver, sys

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', port), NoCacheHandler) as httpd:
        print(f'Serving on http://localhost:{port}/ with no-cache headers')
        httpd.serve_forever()
