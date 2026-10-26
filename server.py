import os
import socket
try:
    import dns.resolver
    dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
    dns.resolver.default_resolver.nameservers = ['8.8.8.8', '1.1.1.1']
except Exception:
    pass

from http.server import HTTPServer, SimpleHTTPRequestHandler
from pymongo import MongoClient

MONGO_URI = "mongodb+srv://nayakprincenayak15_db_user:Prince12345@cluster0.yezkro4.mongodb.net/?retryWrites=true&w=majority"

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    db = client['wingo_game']
    users_collection = db['users']
    print("Successfully connected to MongoDB Atlas!")
except Exception as e:
    print(f"Database connection failed: {e}")

class MyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        super().do_GET()

def run(server_class=HTTPServer, handler_class=MyHandler, port=3000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"Server running on port {port}...")
    httpd.serve_forever()

if __name__ == '__main__':
    run()
