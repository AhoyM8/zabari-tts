#!/usr/bin/env python3
"""
Kokoro TTS Server for Chat Messages
Provides a simple HTTP API to convert chat messages to speech using Kokoro-82M
"""
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from pathlib import Path
import io

from kokoro import KPipeline
import soundfile as sf
import torch

class TTSServer(BaseHTTPRequestHandler):
    # Class-level pipeline instance (initialized once)
    pipeline = None
    available_voices = [
        'af', 'af_bella', 'af_heart', 'af_nicole', 'af_sarah', 'af_sky',
        'am_adam', 'am_michael',
        'bf_emma', 'bf_isabella',
        'bm_george', 'bm_lewis'
    ]

    @classmethod
    def initialize_pipeline(cls, lang_code='a', device='cpu'):
        """Initialize Kokoro pipeline once at startup"""
        if cls.pipeline is None:
            print(f"Initializing Kokoro pipeline (lang={lang_code}, device={device})...")

            # Validate and set device
            if device == 'cuda' and not torch.cuda.is_available():
                print("WARNING: CUDA requested but not available. Falling back to CPU.")
                device = 'cpu'

            cls.pipeline = KPipeline(lang_code=lang_code, device=device)

            # Report which device is actually being used
            actual_device = next(cls.pipeline.model.parameters()).device
            print(f"Kokoro pipeline initialized successfully on device: {actual_device}")

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """Handle POST requests for TTS synthesis"""
        if self.path == '/synthesize':
            try:
                # Read request body
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))

                text = data.get('text', '')
                voice = data.get('voice', 'af_heart')  # default voice
                speed = data.get('speed', 1.0)  # optional speed parameter

                if not text:
                    self.send_error(400, "No text provided")
                    return

                print(f"Synthesizing: '{text}' with voice '{voice}' at speed {speed}")

                # Validate voice
                if voice not in self.available_voices:
                    self.send_error(404, f"Voice '{voice}' not found. Available: {', '.join(self.available_voices)}")
                    return

                # Generate audio using Kokoro
                generator = self.pipeline(text, voice=voice, speed=speed)

                # Kokoro yields (graphemes, phonemes, audio) tuples
                # We'll concatenate all audio chunks
                audio_chunks = []
                for gs, ps, audio in generator:
                    audio_chunks.append(audio)
                    print(f"  Generated chunk: {len(audio)} samples")

                # Concatenate all audio chunks
                if audio_chunks:
                    import numpy as np
                    full_audio = np.concatenate(audio_chunks)
                else:
                    self.send_error(500, "No audio generated")
                    return

                # Convert to WAV bytes
                buffer = io.BytesIO()
                sf.write(buffer, full_audio, 24000, format='WAV')
                audio_bytes = buffer.getvalue()

                # Send response
                self.send_response(200)
                self.send_header('Content-Type', 'audio/wav')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(audio_bytes)))
                self.end_headers()
                self.wfile.write(audio_bytes)

                print(f"✓ Synthesized {len(audio_bytes)} bytes ({len(full_audio)} samples)")

            except Exception as e:
                print(f"Error during synthesis: {str(e)}")
                import traceback
                traceback.print_exc()
                self.send_error(500, f"Synthesis error: {str(e)}")
        else:
            self.send_error(404, "Endpoint not found")

    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {"status": "ok", "model": "kokoro-82m"}
            self.wfile.write(json.dumps(response).encode())
        elif self.path == '/voices':
            # List available Kokoro voices
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {"voices": self.available_voices}
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_error(404, "Endpoint not found")

def run_server(port=8766, lang_code='a', device='cpu'):
    """Start the TTS server"""
    print(f"Starting Kokoro TTS server on port {port}...")

    # Initialize Kokoro pipeline
    TTSServer.initialize_pipeline(lang_code, device)

    server_address = ('', port)
    httpd = HTTPServer(server_address, TTSServer)

    print(f"\nKokoro TTS Server running at http://localhost:{port}")
    print(f"   POST /synthesize - Synthesize speech")
    print(f"   GET  /health     - Check server health")
    print(f"   GET  /voices     - List available voices")
    print(f"\nAvailable voices:")
    print(f"   American Female: af, af_bella, af_heart, af_nicole, af_sarah, af_sky")
    print(f"   American Male: am_adam, am_michael")
    print(f"   British Female: bf_emma, bf_isabella")
    print(f"   British Male: bm_george, bm_lewis\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Kokoro TTS server...")
        httpd.shutdown()

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='TTS Server for Kokoro-82M')
    parser.add_argument('--port', type=int, default=8766, help='Port to run server on')
    parser.add_argument('--lang', type=str, default='a',
                        help='Language code: a=American English, b=British English, e=Spanish, f=French, h=Hindi, i=Italian, j=Japanese, p=Portuguese, z=Chinese')
    parser.add_argument('--device', type=str, default='cpu', choices=['cpu', 'cuda'],
                        help='Device to run inference on: cpu or cuda (GPU)')
    args = parser.parse_args()

    run_server(args.port, args.lang, args.device)
