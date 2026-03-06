"""
Passenger WSGI config for Smart-RT Backend.

This file is used by Phusion Passenger to serve the FastAPI application.
Place this file in the backend root directory (alongside requirements.txt).

For more information about Phusion Passenger, visit:
https://www.phusionpassenger.com/
"""
import os
import sys

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Set the working directory
os.chdir(backend_dir)

# Import the FastAPI app from main.py
from app.main import app as application

# For Passenger, we need to expose the app as 'application'
# This is the WSGI callable that Passenger will use
app = application

# Optional: Add logging configuration for Passenger
if __name__ != "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
