import os
from datetime import datetime
import json
from dotenv import load_dotenv
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float, TypeDecorator
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

load_dotenv()

# PostgreSQL URL with dynamic local SQLite fallback
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./healstack.db")

# If using SQLite, we need to disable same_thread check
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Custom JSON TypeDecorator for SQLite/Postgres compatibility
class JSONEncodedDict(TypeDecorator):
    impl = Text

    def process_bind_param(self, value, dialect):
        if value is None:
            return '{}'
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return {}
        try:
            return json.loads(value)
        except Exception:
            return {}

# ==========================================
# 1. SAAS HIERARCHY & AUTHENTICATION
# ==========================================

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="organization", cascade="all, delete-orphan")
    memberships = relationship("OrganizationMembership", back_populates="organization", cascade="all, delete-orphan")

class OrganizationMembership(Base):
    __tablename__ = "organization_memberships"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, default="developer") # "owner", "admin", "developer", "viewer"
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="memberships")
    user = relationship("User", back_populates="memberships")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    memberships = relationship("OrganizationMembership", back_populates="user", cascade="all, delete-orphan")

# ==========================================
# 2. PROJECTS & CONTEXT CONTROL
# ==========================================

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    api_key = Column(String, unique=True, index=True, nullable=False) # Legacy compatibility
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="projects")
    organization = relationship("Organization", back_populates="projects")
    logs = relationship("Log", back_populates="project", cascade="all, delete-orphan")
    environments = relationship("Environment", back_populates="project", cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="project", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="project", cascade="all, delete-orphan")
    releases = relationship("Release", back_populates="project", cascade="all, delete-orphan")
    healing_actions = relationship("HealingAction", back_populates="project", cascade="all, delete-orphan")
    alert_configs = relationship("AlertConfig", back_populates="project", cascade="all, delete-orphan")
    plugins = relationship("Plugin", back_populates="project", cascade="all, delete-orphan")

class Environment(Base):
    __tablename__ = "environments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False) # "production", "staging", "development"
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="environments")
    api_keys = relationship("ApiKey", back_populates="environment", cascade="all, delete-orphan")

class ApiKey(Base):
    __tablename__ = "api_keys"

    key = Column(String, primary_key=True, index=True) # hs_live_[hex]
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    environment_id = Column(Integer, ForeignKey("environments.id", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="api_keys")
    environment = relationship("Environment", back_populates="api_keys")

# ==========================================
# 3. TELEMETRY & RUNTIME OBSERVABILITY
# ==========================================

class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True) # UUID string or SDK generated
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    environment_name = Column(String, default="production", nullable=False)
    user_identifier = Column(String, nullable=True)
    device_model = Column(String, nullable=True)
    os_version = Column(String, nullable=True)
    platform = Column(String, nullable=False) # "react", "flutter", "nextjs", etc.
    geo_country = Column(String, nullable=True)
    geo_city = Column(String, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="sessions")
    events = relationship("Event", back_populates="session", cascade="all, delete-orphan")

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False) # "click", "pageview", "feature_usage"
    name = Column(String, nullable=False)
    payload = Column(JSONEncodedDict, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="events")

# Legacy Log Model upgraded with relationship and extra telemetry
class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    type = Column(String, nullable=False) # "Frontend Error", "API Failure", "Performance Metric"
    platform = Column(String, nullable=False) # "flutter", "react", etc.
    message = Column(Text, nullable=False)
    url = Column(String, nullable=True)
    method = Column(String, nullable=True)
    status_code = Column(Integer, nullable=True)
    retry_count = Column(Integer, nullable=True)
    severity = Column(String, nullable=True)
    cause = Column(Text, nullable=True)
    solution = Column(Text, nullable=True)
    environment = Column(String, default="production") # "production", "staging"
    timestamp = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="logs")

class ApiMetric(Base):
    __tablename__ = "api_metrics"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    url = Column(String, nullable=False)
    method = Column(String, nullable=False)
    status_code = Column(Integer, nullable=True)
    latency_ms = Column(Integer, nullable=False)
    retry_count = Column(Integer, default=0, nullable=False)
    was_recovered = Column(Boolean, default=False, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class PerformanceMetric(Base):
    __tablename__ = "performance_metrics"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    metric_name = Column(String, nullable=False) # "app_startup", "cpu_usage", "memory_usage", "frame_drops"
    metric_value = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

# ==========================================
# 4. RELEASES & SELF-HEALING ENGINE
# ==========================================

class Release(Base):
    __tablename__ = "releases"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version_string = Column(String, nullable=False) # "v1.0.4"
    commit_sha = Column(String, nullable=True)
    deployed_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="healthy") # "healthy", "regressed", "rolled_back"

    project = relationship("Project", back_populates="releases")

class HealingAction(Base):
    __tablename__ = "healing_actions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    error_message = Column(Text, nullable=True)
    action_type = Column(String, nullable=False) # "api_retry", "fallback_routing", "cache_fallback", "rollback"
    target_endpoint = Column(String, nullable=True)
    success = Column(Boolean, nullable=False)
    duration_ms = Column(Integer, nullable=False)
    log_output = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="healing_actions")

# ==========================================
# 5. ALERTS, PLUGINS & AUDIT
# ==========================================

class AlertConfig(Base):
    __tablename__ = "alert_configs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    channel_type = Column(String, nullable=False) # "slack", "discord", "email", "webhook"
    webhook_url = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="alert_configs")

class Plugin(Base):
    __tablename__ = "plugins"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    plugin_name = Column(String, nullable=False) # "aws_cloudwatch", "openai_diagnostics", "vercel_rollback"
    config_payload = Column(JSONEncodedDict, default=dict, nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="plugins")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=True)
    action = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

# Database Initializer Function
def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
