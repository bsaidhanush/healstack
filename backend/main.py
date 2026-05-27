from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from typing import List

from ai_engine import analyze_error


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary in-memory storage
logs = []

# Connected websocket clients for realtime streaming
connected_websockets: List[WebSocket] = []

async def broadcast_log(entry: dict):
    text = entry
    to_remove = []
    for ws in connected_websockets:
        try:
            await ws.send_json(text)
        except Exception:
            to_remove.append(ws)

    for ws in to_remove:
        try:
            connected_websockets.remove(ws)
        except ValueError:
            pass

@app.get("/")
async def home():
    return {
        "message": "HealStack Backend Running"
    }

@app.get("/logs")
async def get_logs():
    return logs

@app.post("/error")
async def receive_error(data: dict):
    analysis = analyze_error(data)

    log = {
        "type": "Frontend Error",
        "data": data,
        "analysis": analysis
    }

    logs.append(log)
    # broadcast to websocket clients (best-effort)
    try:
        await broadcast_log(log)
    except Exception:
        pass

    print("\n========== FRONTEND ERROR ==========")
    print(data)

    return {"status": "received"}

@app.post("/api-error")
async def receive_api_error(data: dict):
    analysis = analyze_error(data)

    log = {
        "type": "API Failure",
        "data": data,
        "analysis": analysis
    }

    logs.append(log)
    # broadcast to websocket clients (best-effort)
    try:
        await broadcast_log(log)
    except Exception:
        pass

    print("\n========== API FAILURE ==========")
    print(data)

    return {"status": "received"}


@app.websocket("/ws/logs")
async def websocket_logs_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.append(websocket)
    try:
        while True:
            # keep connection alive; receive optional pings from client
            await websocket.receive_text()
    except WebSocketDisconnect:
        try:
            connected_websockets.remove(websocket)
        except ValueError:
            pass