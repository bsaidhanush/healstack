import secrets
import random
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from database import (
    init_db, get_db, 
    User as DBUser, Project as DBProject, Log as DBLog,
    Organization as DBOrg, OrganizationMembership as DBOrgMember,
    Session as DBSession, Event as DBEvent, ApiMetric as DBApiMetric,
    PerformanceMetric as DBPerfMetric, Release as DBRelease,
    HealingAction as DBHealing, AlertConfig as DBAlert, Plugin as DBPlugin
)
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from ai_engine import analyze_error, copilot_chat_query

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

class CopilotQuery(BaseModel):
    message: str
    project_id: int

class SimulateHealing(BaseModel):
    type: str # "stripe_timeout", "react_render_crash", "db_bottleneck", "memory_leak"
    project_id: int

class AlertConfigure(BaseModel):
    project_id: int
    channel_type: str
    webhook_url: str

class PluginToggle(BaseModel):
    project_id: int
    plugin_name: str
    is_enabled: bool

@app.get("/")
async def home():
    return {
        "message": "HealStack 3.0 Real-time Intelligent SaaS Engine Running"
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

    # Generate a default Organization for the user
    new_org = DBOrg(name=f"{user_data.email.split('@')[0]}'s Workspace")
    db.add(new_org)
    db.commit()
    db.refresh(new_org)

    # Membership
    member = DBOrgMember(organization_id=new_org.id, user_id=new_user.id, role="owner")
    db.add(member)
    db.commit()

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
    
    # Grab the user's organization
    membership = db.query(DBOrgMember).filter(DBOrgMember.user_id == current_user.id).first()
    org_id = membership.organization_id if membership else None

    new_project = DBProject(
        name=project_data.name, 
        api_key=secure_key, 
        user_id=current_user.id,
        organization_id=org_id
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    # Create standard defaults: Releases, Plugins, Alerts for this project to be used
    seed_project_defaults(new_project.id, db)

    return {
        "id": new_project.id,
        "name": new_project.name,
        "api_key": new_project.api_key,
        "user_id": new_project.user_id,
        "organization_id": new_project.organization_id,
        "created_at": new_project.created_at.isoformat()
    }


def seed_project_defaults(project_id: int, db: Session):
    # Seed Plugins
    plugins_list = ["aws_cloudwatch", "openai_diagnostics", "vercel_rollback", "security_audits", "slack_notify"]
    for plugin in plugins_list:
        db_plugin = DBPlugin(project_id=project_id, plugin_name=plugin, is_enabled=(plugin == "openai_diagnostics"))
        db.add(db_plugin)

    # Seed Releases
    releases = [
        ("v1.0.0", "stable"),
        ("v1.1.0", "stable"),
        ("v2.0.0", "stable"),
        ("v2.1.0-beta", "regressed")
    ]
    for idx, (version, status) in enumerate(releases):
        db_release = DBRelease(
            project_id=project_id, 
            version_string=version, 
            status=status,
            commit_sha=f"sha_{secrets.token_hex(4)}",
            deployed_at=datetime.utcnow() - timedelta(days=(4 - idx))
        )
        db.add(db_release)

    # Seed initial Alert Configs
    db_alert = DBAlert(
        project_id=project_id,
        channel_type="slack",
        webhook_url="https://hooks.slack.com/services/T000/B000/X000",
        is_active=True
    )
    db.add(db_alert)

    db.commit()

@app.get("/projects")
def get_projects(current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.query(DBProject).filter(DBProject.user_id == current_user.id).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "api_key": p.api_key,
            "user_id": p.user_id,
            "organization_id": p.organization_id,
            "created_at": p.created_at.isoformat()
        } for p in projects
    ]


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

    # Format logs
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
    api_key_str = data.get("apiKey")
    project = verify_and_get_project(api_key_str, db)

    # Analyze API failure via AI
    analysis = analyze_error(data)

    # Persist log
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

# ================= SAAS 3.0 ANALYTICS SUMMARY ENDPOINT =================

@app.get("/analytics/summary")
def get_analytics_summary(project_id: int, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    # Authenticate project ownership
    project = db.query(DBProject).filter(DBProject.id == project_id, DBProject.user_id == current_user.id).first()
    if not project:
         raise HTTPException(status_code=403, detail="Project access denied")

    # Dynamic generation of seed analytics metrics to ensure charts look beautiful instantly
    random.seed(project_id) # Consistent data per project
    
    # 1. DAU / MAU Trend timeseries (last 14 days)
    dau_mau_data = []
    base_date = datetime.utcnow()
    for i in range(14, 0, -1):
        date_str = (base_date - timedelta(days=i)).strftime("%b %d")
        # Generates realistic fluctuating DAU & MAU workloads
        dau = int(random.randint(1800, 3200))
        mau = int(random.randint(12000, 18000))
        dau_mau_data.append({"date": date_str, "dau": dau, "mau": mau})

    # 2. Conversion Funnel steps
    conversion_funnel = [
        {"step": "1. Signup Flow", "sessions": 8500, "rate": 100},
        {"step": "2. Product Search", "sessions": 6400, "rate": 75},
        {"step": "3. Add to Cart", "sessions": 3820, "rate": 44},
        {"step": "4. Checkout Begin", "sessions": 2100, "rate": 24},
        {"step": "5. Order Purchased", "sessions": 1560, "rate": 18}
    ]

    # 3. User Cohort Retention curves
    retention_curves = [
        {"day": "Day 0", "retention": 100},
        {"day": "Day 1", "retention": 72},
        {"day": "Day 3", "retention": 54},
        {"day": "Day 5", "retention": 45},
        {"day": "Day 7", "retention": 39},
        {"day": "Day 14", "retention": 31},
        {"day": "Day 30", "retention": 24}
    ]

    # 4. Performance metrics timelines (CPU, Memory)
    cpu_timeline = []
    mem_timeline = []
    for h in range(12, 0, -1):
        time_str = (datetime.utcnow() - timedelta(hours=h)).strftime("%H:%M")
        cpu_timeline.append({"time": time_str, "value": round(random.uniform(15.0, 65.0), 1)})
        mem_timeline.append({"time": time_str, "value": round(random.uniform(120.0, 350.0), 1)})

    # 5. Geographic Active Segments
    geo_metrics = [
        {"country": "United States", "sessions": 4850, "lat": 37.0902, "lng": -95.7129},
        {"country": "United Kingdom", "sessions": 1950, "lat": 55.3781, "lng": -3.4360},
        {"country": "Germany", "sessions": 1200, "lat": 51.1657, "lng": 10.4515},
        {"country": "India", "sessions": 950, "lat": 20.5937, "lng": 78.9629},
        {"country": "Singapore", "sessions": 650, "lat": 1.3521, "lng": 103.8198}
    ]

    # 6. Releases tracking lists
    releases_db = db.query(DBRelease).filter(DBRelease.project_id == project_id).all()
    releases_data = []
    for r in releases_db:
        releases_data.append({
            "version": r.version_string,
            "status": r.status,
            "sha": r.commit_sha,
            "deployed_at": r.deployed_at.strftime("%b %d, %Y")
        })

    # 7. Self-Healing Action Logs
    healing_db = db.query(DBHealing).filter(DBHealing.project_id == project_id).order_by(DBHealing.timestamp.desc()).all()
    healing_data = []
    for h in healing_db:
        healing_data.append({
            "id": h.id,
            "action_type": h.action_type,
            "target": h.target_endpoint,
            "success": h.success,
            "duration": h.duration_ms,
            "error": h.error_message,
            "timestamp": h.timestamp.strftime("%H:%M:%S")
        })

    # Pre-populate dynamic counts
    plugins_db = db.query(DBPlugin).filter(DBPlugin.project_id == project_id).all()
    plugins_data = {p.plugin_name: p.is_enabled for p in plugins_db}

    alert_configs_db = db.query(DBAlert).filter(DBAlert.project_id == project_id).all()
    alert_configs_data = [{"type": a.channel_type, "url": a.webhook_url, "active": a.is_active} for a in alert_configs_db]

    return {
        "dau_mau": dau_mau_data,
        "funnel": conversion_funnel,
        "retention": retention_curves,
        "cpu": cpu_timeline,
        "memory": mem_timeline,
        "geo": geo_metrics,
        "releases": releases_data,
        "healing_actions": healing_data,
        "plugins": plugins_data,
        "alerts": alert_configs_data,
        "summary": {
            "health_score": random.randint(92, 98),
            "crash_free_users": round(random.uniform(98.5, 99.9), 2),
            "avg_api_latency": random.randint(180, 240),
            "healing_success_rate": round(random.uniform(88.0, 95.5), 1),
            "dau_today": int(random.randint(1800, 3200)),
            "active_sessions": int(random.randint(450, 890))
        }
    }

# ================= SAAS 3.0 AI COPILOT CHAT ENDPOINT =================

@app.post("/copilot/chat")
def get_copilot_chat(query: CopilotQuery, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    # Authenticate project ownership
    project = db.query(DBProject).filter(DBProject.id == query.project_id, DBProject.user_id == current_user.id).first()
    if not project:
         raise HTTPException(status_code=403, detail="Project access denied")

    # Fetch recent database logs for the AI context analyzer
    logs = db.query(DBLog).filter(DBLog.project_id == query.project_id).order_by(DBLog.timestamp.desc()).limit(15).all()
    logs_history = []
    for log in logs:
        logs_history.append({
            "type": log.type,
            "data": {
                "message": log.message,
                "url": log.url,
                "method": log.method,
                "statusCode": log.status_code
            },
            "analysis": {
                "severity": log.severity,
                "cause": log.cause,
                "solution": log.solution
            },
            "timestamp": log.timestamp.isoformat()
        })

    # Call AI Copilot engine
    ai_markdown_response = copilot_chat_query(query.message, logs_history)
    return {"response": ai_markdown_response}

# ================= SAAS 3.0 SELF-HEALING SIMULATOR =================

@app.post("/self-heal/simulate")
async def trigger_self_healing_simulation(payload: SimulateHealing, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(DBProject).filter(DBProject.id == payload.project_id, DBProject.user_id == current_user.id).first()
    if not project:
         raise HTTPException(status_code=403, detail="Project access denied")

    # Configure different error classes based on simulated type
    sim_type = payload.type
    err_message = ""
    err_type = "Frontend Error"
    platform = "web-next"
    severity = "High"
    cause = ""
    solution = ""
    action_type = "api_retry"
    target_endpoint = None
    healing_success = True
    recovery_duration = random.randint(120, 480)
    log_output = ""

    if sim_type == "stripe_timeout":
        err_type = "API Failure"
        err_message = "AxiosError: timeout of 5000ms exceeded during checkout request."
        url = "https://api.stripe.com/v3/charges"
        method = "POST"
        status_code = 504
        cause = "Stripe connection pooling gateway timeout on regional checkout node."
        solution = "Switch Stripe checkout traffic dynamically to EU alternative fallback server."
        action_type = "fallback_routing"
        target_endpoint = "https://api-fallback.stripe.com/v3/charges"
        log_output = (
            "[HealStack Core] Intercepted HTTP 504 on primary node.\n"
            "[HealStack Core] Auto-healing activated: autoHeal=true\n"
            "[HealStack Recovery] Initiating fallback URL mapping: Stripe -> Stripe Backup Node\n"
            "[HealStack Recovery] Retrying charge operation on: https://api-fallback.stripe.com/v3/charges\n"
            "[HealStack Recovery] Alternative node resolved: HTTP 200 OK. Transaction completed successfully!"
        )
    elif sim_type == "react_render_crash":
        err_type = "Frontend Error"
        err_message = "TypeError: Cannot read properties of undefined (reading 'avatar_url') inside NavigationPanel."
        cause = "React components rendering profile state parameters before profile payload async load finishes."
        solution = "Encapsulate user widgets inside profile boundary conditional loaders or add safe chaining (?.)"
        action_type = "cache_fallback"
        log_output = (
            "[HealStack Core] Native JavaScript Uncaught Exception trapped: TypeError\n"
            "[HealStack Core] Auto-healing activated: autoHeal=true\n"
            "[HealStack Recovery] Recovering user context: checking profile snapshot cache...\n"
            "[HealStack Recovery] Local storage profile schema restored. React component tree refresh invoked.\n"
            "[HealStack Recovery] Recovered layout state automatically without screen crash!"
        )
    elif sim_type == "db_bottleneck":
        err_type = "API Failure"
        err_message = "SQLAlchemyException: Max pool connections exceeded (100 threads)."
        url = "https://api.healstack.io/v1/user/settings"
        method = "GET"
        status_code = 500
        cause = "Downstream database thread pooling saturated by active telemetry ingestion loads."
        solution = "Add composite database table indexes and toggle cache retrieval for settings endpoints."
        action_type = "api_retry"
        log_output = (
            "[HealStack Core] API failure caught: HTTP 500 Internal Database Error\n"
            "[HealStack Core] Auto-healing activated: autoHeal=true\n"
            "[HealStack Recovery] Triggering smart retry pipeline: Attempt 1\n"
            "[HealStack Recovery] Exponential backoff delay (250ms) applied...\n"
            "[HealStack Recovery] Retrying v1/user/settings: resolved HTTP 200 after database lock cleared."
        )
    elif sim_type == "memory_leak":
        err_type = "Frontend Error"
        err_message = "FatalError: Node.js out of memory. Heap footprint exceeded allocation limits (4096MB)."
        cause = "Circular reference memory leaks inside tracking microservices event handlers."
        solution = "Initiate automated Vercel rollback deployment to last healthy release version (v2.0.0)."
        action_type = "rollback"
        log_output = (
            "[HealStack Core] Process trapped heap leakage metrics: CPU 95%, Memory 4.1GB\n"
            "[HealStack Core] Core trigger: release regression alert fired for beta branch\n"
            "[HealStack Core] Triggering autonomous rollbacks through marketplace plugin Vercel Deploy\n"
            "[HealStack Vercel Plugin] Requesting CD API version rollback: v2.1.0-beta -> v2.0.0 stable\n"
            "[HealStack Vercel Plugin] Version rollback completed successfully in production."
        )
    else:
        err_message = "UnknownError: Simulated telemetry event triggered manually."
        cause = "Interactive simulation mode dashboard action."
        solution = "Analyze live dashboard reports."
        action_type = "api_retry"

    # Create Database Error Log
    new_log = DBLog(
        project_id=project.id,
        type=err_type,
        platform=platform,
        message=err_message,
        url=url if err_type == "API Failure" else None,
        method=method if err_type == "API Failure" else None,
        status_code=status_code if err_type == "API Failure" else None,
        retry_count=1 if action_type == "api_retry" else 0,
        severity=severity,
        cause=cause,
        solution=solution
    )
    db.add(new_log)

    # Save to Healing Action Database Audits
    new_healing = DBHealing(
        project_id=project.id,
        error_message=err_message,
        action_type=action_type,
        target_endpoint=target_endpoint,
        success=healing_success,
        duration_ms=recovery_duration,
        log_output=log_output
    )
    db.add(new_healing)
    db.commit()
    db.refresh(new_log)
    db.refresh(new_healing)

    # Broadcast log event to dashboard clients in real-time
    ws_dict = {
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
            "apiKey": project.api_key
        },
        "analysis": {
            "severity": new_log.severity,
            "cause": new_log.cause,
            "solution": new_log.solution
        },
        "timestamp": new_log.timestamp.isoformat()
    }
    await broadcast_log(ws_dict)

    return {
        "status": "simulated",
        "log": ws_dict,
        "healing": {
            "id": new_healing.id,
            "action": action_type,
            "success": healing_success,
            "duration": recovery_duration,
            "output": log_output
        }
    }

# ================= SAAS 3.0 ALERTS CONFIGURATION ENDPOINT =================

@app.post("/alerts/configure")
def configure_alert_settings(payload: AlertConfigure, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(DBProject).filter(DBProject.id == payload.project_id, DBProject.user_id == current_user.id).first()
    if not project:
         raise HTTPException(status_code=403, detail="Project access denied")

    # Update or insert new configuration
    config = db.query(DBAlert).filter(DBAlert.project_id == payload.project_id, DBAlert.channel_type == payload.channel_type).first()
    if config:
        config.webhook_url = payload.webhook_url
        config.is_active = True
    else:
        config = DBAlert(
            project_id=payload.project_id,
            channel_type=payload.channel_type,
            webhook_url=payload.webhook_url,
            is_active=True
        )
        db.add(config)
    db.commit()
    return {"status": "configured", "channel": payload.channel_type, "url": payload.webhook_url}

# ================= SAAS 3.0 PLUGINS MARKETPLACE ENDPOINT =================

@app.post("/plugins/toggle")
def toggle_plugin_status(payload: PluginToggle, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(DBProject).filter(DBProject.id == payload.project_id, DBProject.user_id == current_user.id).first()
    if not project:
         raise HTTPException(status_code=403, detail="Project access denied")

    # Update or insert
    plugin = db.query(DBPlugin).filter(DBPlugin.project_id == payload.project_id, DBPlugin.plugin_name == payload.plugin_name).first()
    if plugin:
        plugin.is_enabled = payload.is_enabled
    else:
        plugin = DBPlugin(
            project_id=payload.project_id,
            plugin_name=payload.plugin_name,
            is_enabled=payload.is_enabled
        )
        db.add(plugin)
    db.commit()
    return {"status": "updated", "plugin": payload.plugin_name, "enabled": payload.is_enabled}

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