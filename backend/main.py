import secrets
from fastapi import FastAPI, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from database import init_db, get_db, User as DBUser, Project as DBProject, Log as DBLog
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from ai_engine import analyze_error

# Initialize the database schemas
init_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connected websocket clients for realtime streaming
connected_websockets: List[WebSocket] = []

async def broadcast_log(entry: dict):
    to_remove = []
    for ws in connected_websockets:
        try:
            await ws.send_json(entry)
        except Exception:
            to_remove.append(ws)

    for ws in to_remove:
        try:
            connected_websockets.remove(ws)
        except ValueError:
            pass

# Pydantic schemas for request validation
class UserRegister(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ProjectCreate(BaseModel):
    name: str

@app.get("/")
async def home():
    return {
        "message": "HealStack SaaS Backend Running"
    }

# ================= AUTHENTICATION ENDPOINTS =================

@app.post("/auth/register")
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(DBUser).filter(DBUser.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash password and store user
    hashed_password = get_password_hash(user_data.password)
    new_user = DBUser(email=user_data.email, password_hash=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create access token
    access_token = create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer", "email": new_user.email}

@app.post("/auth/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "email": user.email}

# ================= PROJECT ENDPOINTS =================

@app.post("/projects")
def create_project(project_data: ProjectCreate, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    # Generate secure project API key (e.g. hs_live_...)
    secure_key = f"hs_live_{secrets.token_hex(16)}"
    new_project = DBProject(name=project_data.name, api_key=secure_key, user_id=current_user.id)
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@app.get("/projects")
def get_projects(current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.query(DBProject).filter(DBProject.user_id == current_user.id).all()
    return projects

# ================= ERROR REPORTING ENDPOINTS =================

@app.get("/logs")
def get_logs(project_id: Optional[int] = None, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    # Authenticated user can fetch logs from their own projects
    user_projects = db.query(DBProject).filter(DBProject.user_id == current_user.id).all()
    project_ids = [p.id for p in user_projects]

    if project_id:
        if project_id not in project_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
        logs = db.query(DBLog).filter(DBLog.project_id == project_id).order_by(DBLog.timestamp.desc()).all()
    else:
        logs = db.query(DBLog).filter(DBLog.project_id.in_(project_ids)).order_by(DBLog.timestamp.desc()).all()

    # Format logs to maintain dashboard compatibility
    formatted_logs = []
    for log in logs:
        formatted_logs.append({
            "id": log.id,
            "project_id": log.project_id,
            "type": log.type,
            "data": {
                "platform": log.platform,
                "message": log.message,
                "url": log.url,
                "method": log.method,
                "statusCode": log.status_code,
                "retryCount": log.retry_count
            },
            "analysis": {
                "severity": log.severity,
                "cause": log.cause,
                "solution": log.solution
            },
            "timestamp": log.timestamp.isoformat()
        })
    return formatted_logs

def verify_and_get_project(api_key: Optional[str], db: Session) -> DBProject:
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key missing"
        )
    project = db.query(DBProject).filter(DBProject.api_key == api_key).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key"
        )
    return project

@app.post("/error")
async def receive_error(data: dict, db: Session = Depends(get_db)):
    api_key_str = data.get("apiKey")
    project = verify_and_get_project(api_key_str, db)

    # Analyze error via AI
    analysis = analyze_error(data)

    # Persist log to PostgreSQL/SQLite
    new_log = DBLog(
        project_id=project.id,
        type="Frontend Error",
        platform=data.get("platform", "unknown"),
        message=data.get("message", ""),
        severity=analysis.get("severity", "Unknown"),
        cause=analysis.get("cause", "Unrecognized issue"),
        solution=analysis.get("solution", "Manual inspection required")
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    log_dict = {
        "id": new_log.id,
        "project_id": new_log.project_id,
        "type": new_log.type,
        "data": {
            "platform": new_log.platform,
            "message": new_log.message,
            "apiKey": api_key_str
        },
        "analysis": {
            "severity": new_log.severity,
            "cause": new_log.cause,
            "solution": new_log.solution
        },
        "timestamp": new_log.timestamp.isoformat()
    }

    # Broadcast log event to dashboard clients
    await broadcast_log(log_dict)
    print(f"\n========== SAAS FRONTEND ERROR (Project: {project.name}) ==========")
    print(data)

    return {"status": "received", "id": new_log.id}

@app.post("/api-error")
async def receive_api_error(data: dict, db: Session = Depends(get_db)):
    # Support both apiKey in body (Flutter) and custom API Key header
    api_key_str = data.get("apiKey")
    project = verify_and_get_project(api_key_str, db)

    # Analyze API failure via AI
    analysis = analyze_error(data)

    # Persist log to PostgreSQL/SQLite
    new_log = DBLog(
        project_id=project.id,
        type="API Failure",
        platform=data.get("platform", "unknown"),
        message=data.get("message", ""),
        url=data.get("url"),
        method=data.get("method"),
        status_code=data.get("statusCode"),
        retry_count=data.get("retryCount"),
        severity=analysis.get("severity", "Unknown"),
        cause=analysis.get("cause", "Unrecognized issue"),
        solution=analysis.get("solution", "Manual inspection required")
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    log_dict = {
        "id": new_log.id,
        "project_id": new_log.project_id,
        "type": new_log.type,
        "data": {
            "platform": new_log.platform,
            "message": new_log.message,
            "url": new_log.url,
            "method": new_log.method,
            "statusCode": new_log.status_code,
            "retryCount": new_log.retry_count,
            "apiKey": api_key_str
        },
        "analysis": {
            "severity": new_log.severity,
            "cause": new_log.cause,
            "solution": new_log.solution
        },
        "timestamp": new_log.timestamp.isoformat()
    }

    # Broadcast log event to dashboard clients
    await broadcast_log(log_dict)
    print(f"\n========== SAAS API FAILURE (Project: {project.name}) ==========")
    print(data)

    return {"status": "received", "id": new_log.id}

# ================= REALTIME STREAMING WEBSOCKET =================

@app.websocket("/ws/logs")
async def websocket_logs_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.append(websocket)
    try:
        while True:
            # Maintain websocket link
            await websocket.receive_text()
    except WebSocketDisconnect:
        try:
            connected_websockets.remove(websocket)
        except ValueError:
            pass