import http.server
import socketserver
import os
import sys

PORT = 8000

# Custom handler to ensure CORS headers are set and we list directories properly
class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def run_server():
    # Make sure we serve from the directory containing server.py
    current_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(current_dir)
    
    Handler = CORSRequestHandler
    
    # Allow port reuse to avoid 'Address already in use' errors on restart
    socketserver.TCPServer.allow_reuse_address = True
    
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"\n==================================================")
            sys.stdout.write("\033[92m") # Green text
            print(f"Michi Method Print Layout Optimizer Running Successfully!")
            print(f"Server started at: http://localhost:{PORT}")
            sys.stdout.write("\033[0m") # Reset text color
            print(f"==================================================\n")
            print("To open the app, Ctrl+Click the link above or open it in your browser.")
            print("Press Ctrl+C to stop the server.\n")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server. Goodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_server()
