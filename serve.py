"""
Simple HTTPS server for PMP Study App PWA.

Run this script, then open the URL on your phone (same WiFi network).
Your phone will prompt you to "Add to Home Screen" for the app experience.

Usage:
  python serve.py

Then open: https://<your-ip>:8443
(Accept the self-signed certificate warning on your phone)
"""
import http.server
import ssl
import socket
import os
import subprocess
import sys

PORT = 8443
DIR = os.path.dirname(os.path.abspath(__file__))

def get_local_ip():
    """Get the machine's local IP address."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def generate_cert():
    """Generate a self-signed certificate for HTTPS (required for PWA)."""
    cert_file = os.path.join(DIR, 'server.pem')
    key_file = os.path.join(DIR, 'server-key.pem')
    
    if os.path.exists(cert_file) and os.path.exists(key_file):
        return cert_file, key_file
    
    print("Generating self-signed certificate for HTTPS...")
    try:
        subprocess.run([
            'openssl', 'req', '-x509', '-newkey', 'rsa:2048',
            '-keyout', key_file, '-out', cert_file,
            '-days', '365', '-nodes',
            '-subj', '/CN=localhost'
        ], check=True, capture_output=True)
        print("Certificate generated.")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("OpenSSL not available. Falling back to HTTP (PWA install won't work,")
        print("but audio playback will still function for testing).")
        return None, None
    
    return cert_file, key_file

def main():
    os.chdir(DIR)
    ip = get_local_ip()
    
    handler = http.server.SimpleHTTPRequestHandler
    # Add proper MIME types
    handler.extensions_map.update({
        '.mp3': 'audio/mpeg',
        '.json': 'application/json',
        '.js': 'application/javascript',
        '.html': 'text/html',
        '.png': 'image/png',
    })
    
    cert_file, key_file = generate_cert()
    
    server = http.server.HTTPServer(('0.0.0.0', PORT), handler)
    
    if cert_file and key_file:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(cert_file, key_file)
        server.socket = context.wrap_socket(server.socket, server_side=True)
        protocol = "https"
    else:
        # Fallback to HTTP on port 8080
        server.server_close()
        PORT_HTTP = 8080
        server = http.server.HTTPServer(('0.0.0.0', PORT_HTTP), handler)
        protocol = "http"
        print(f"\n{'='*50}")
        print(f"  PMP Study App v40 - HTTP Mode (testing only)")
        print(f"  Open on this computer: http://localhost:{PORT_HTTP}")
        print(f"  Open on your phone:    http://{ip}:{PORT_HTTP}")
        print(f"{'='*50}\n")
        server.serve_forever()
        return
    
    print(f"\n{'='*50}")
    print(f"  PMP Study App v40 - PWA Server Running")
    print(f"  ")
    print(f"  On this computer: {protocol}://localhost:{PORT}")
    print(f"  On your phone:    {protocol}://{ip}:{PORT}")
    print(f"  ")
    print(f"  Steps for phone:")
    print(f"  1. Connect phone to same WiFi as this computer")
    print(f"  2. Open the URL above in Chrome/Safari")
    print(f"  3. Accept the certificate warning")
    print(f"  4. Tap 'Add to Home Screen' (browser menu)")
    print(f"  5. The app will cache and work offline!")
    print(f"{'='*50}\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.server_close()

if __name__ == '__main__':
    main()
