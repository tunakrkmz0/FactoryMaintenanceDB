
from __future__ import annotations
import os
from datetime import datetime, timedelta, date
from typing import Optional, List

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required
)
from sqlalchemy import (
    Column, Integer, String, Date, DateTime, ForeignKey, Text, DECIMAL, Boolean,
    func, create_engine
)
from sqlalchemy.orm import (
    declarative_base, relationship, sessionmaker, scoped_session
)
from marshmallow import Schema, fields, validate, ValidationError

# -------- Config --------
DB_SERVER = os.getenv("DB_SERVER", "localhost")
DB_DATABASE = os.getenv("DB_DATABASE", "FactoryMaintenanceDB")
DB_USER = os.getenv("DB_USER", "sa")
DB_PASSWORD = os.getenv("DB_PASSWORD", "1234")
JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
ODBC_DRIVER = os.getenv("ODBC_DRIVER", "ODBC Driver 18 for SQL Server")

DB_URL = (
    f"mssql+pyodbc://{DB_USER}:{DB_PASSWORD}@{DB_SERVER}/{DB_DATABASE}"
    f"?driver={ODBC_DRIVER.replace(' ', '+')}&Encrypt=no&TrustServerCertificate=yes"
)
# SQL Server: OUTPUT + TRIGGER çatışmasını engellemek için implicit_returning=False
# SQL Server: OUTPUT + TRIGGER çakışmasını kapat
engine = create_engine(DB_URL, pool_pre_ping=True, future=True, implicit_returning=False)

SessionLocal = scoped_session(sessionmaker(bind=engine, autoflush=False, autocommit=False))
Base = declarative_base()

# -------- ORM Modelleri (DDL ile birebir) --------
class Personnel(Base):
    __tablename__ = "Personnel"
    PersonnelID = Column(Integer, primary_key=True, autoincrement=True)
    FullName = Column(String(100), nullable=False)
    UserRole = Column(String(50))
    ContactInfo = Column(String(100))
    CreatedAt = Column(DateTime, server_default=func.getdate())

class Machines(Base):
    __tablename__ = "Machines"
    MachineID = Column(Integer, primary_key=True, autoincrement=True)
    MachineName = Column(String(100), nullable=False)
    MachineModel = Column(String(100))
    MachineLocation = Column(String(100))
    MachineStatus = Column(String(50), server_default="Aktif")
    LastMaintenanceDate = Column(Date)
    CreatedAt = Column(DateTime, server_default=func.getdate())
    UpdatedAt = Column(DateTime, server_default=func.getdate())

    maintenance_records = relationship("MaintenanceRecords", back_populates="machine", cascade="all, delete-orphan")
    schedules = relationship("MaintenanceSchedules", back_populates="machine", cascade="all, delete-orphan")
    alerts = relationship("Alerts", back_populates="machine", cascade="all, delete-orphan")

class Faults(Base):
    __tablename__ = "Faults"
    __table_args__ = {"implicit_returning": False}

    FaultID = Column(Integer, primary_key=True, autoincrement=True)
    FaultCode = Column(String(50), nullable=False)
    FaultDescription = Column(String(255))
    Severity = Column(String(50))  # CHECK: ('Düşük','Orta','Yüksek')
    CreatedAt = Column(DateTime, server_default=func.getdate())
    # SQL tarafında eklediğimiz sütun
    MachineID = Column(Integer, ForeignKey("Machines.MachineID"), nullable=True)

    machine = relationship("Machines")

class MaintenanceRecords(Base):
    __tablename__ = "MaintenanceRecords"
    __table_args__ = {"implicit_returning": False}
    MaintenanceID = Column(Integer, primary_key=True, autoincrement=True)
    MachineID = Column(Integer, ForeignKey("Machines.MachineID"), nullable=False)
    PersonnelID = Column(Integer, ForeignKey("Personnel.PersonnelID"), nullable=False)
    FaultID = Column(Integer, ForeignKey("Faults.FaultID"))
    MRDescription = Column(String(255))
    StartTime = Column(DateTime, nullable=False)
    EndTime = Column(DateTime)
    Cost = Column(DECIMAL(10,2), server_default="0")
    CreatedAt = Column(DateTime, server_default=func.getdate())

    machine = relationship("Machines", back_populates="maintenance_records")
    personnel = relationship("Personnel")
    fault = relationship("Faults")
    parts = relationship("MaintenanceParts", back_populates="maintenance", cascade="all, delete-orphan")

class Parts(Base):
    __tablename__ = "Parts"
    PartID = Column(Integer, primary_key=True, autoincrement=True)
    PartName = Column(String(100), nullable=False)
    PartNumber = Column(String(50))
    UnitCost = Column(DECIMAL(10,2), nullable=False)
    UnitsInStock = Column(Integer, nullable=False)
    CreatedAt = Column(DateTime, server_default=func.getdate())

class MaintenanceParts(Base):
    __tablename__ = "MaintenanceParts"
    __table_args__ = {"implicit_returning": False}
    MPID = Column(Integer, primary_key=True, autoincrement=True)
    MaintenanceID = Column(Integer, ForeignKey("MaintenanceRecords.MaintenanceID"), nullable=False)
    PartID = Column(Integer, ForeignKey("Parts.PartID"), nullable=False)
    Quantity = Column(Integer, nullable=False)
    UnitCost = Column(DECIMAL(10,2), nullable=False)
    # TotalCost hesaplanan sütun (DB tarafında): Quantity * UnitCost

    maintenance = relationship("MaintenanceRecords", back_populates="parts")
    part = relationship("Parts")

class MaintenanceSchedules(Base):
    __tablename__ = "MaintenanceSchedules"
    ScheduleID = Column(Integer, primary_key=True, autoincrement=True)
    MachineID = Column(Integer, ForeignKey("Machines.MachineID"), nullable=False)
    NextMaintenanceDate = Column(Date, nullable=False)
    FrequencyDays = Column(Integer)
    IsActive = Column(Boolean, server_default="1")
    CreatedAt = Column(DateTime, server_default=func.getdate())

    machine = relationship("Machines", back_populates="schedules")

class Alerts(Base):
    __tablename__ = "Alerts"
    AlertID = Column(Integer, primary_key=True, autoincrement=True)
    MachineID = Column(Integer, ForeignKey("Machines.MachineID"), nullable=False)
    AlertType = Column(String(100), nullable=False)
    AlertMessage = Column(String(255))
    CreatedAt = Column(DateTime, server_default=func.getdate())
    IsResolved = Column(Boolean, server_default="0")

    machine = relationship("Machines", back_populates="alerts")

# -------- Schemas (I/O doğrulama) --------
sev_values = ["Düşük", "Orta", "Yüksek"]

class PersonnelSchema(Schema):
    PersonnelID = fields.Int(dump_only=True)
    FullName = fields.Str(required=True)
    UserRole = fields.Str()
    ContactInfo = fields.Str()
    CreatedAt = fields.DateTime(dump_only=True)

class MachinesSchema(Schema):
    MachineID = fields.Int(dump_only=True)
    MachineName = fields.Str(required=True)
    MachineModel = fields.Str()
    MachineLocation = fields.Str()
    MachineStatus = fields.Str()
    LastMaintenanceDate = fields.Date(allow_none=True)
    CreatedAt = fields.DateTime(dump_only=True)
    UpdatedAt = fields.DateTime(dump_only=True)

class FaultsSchema(Schema):
    FaultID = fields.Int(dump_only=True)
    FaultCode = fields.Str(required=True)
    FaultDescription = fields.Str(allow_none=True)
    Severity = fields.Str(required=True, validate=validate.OneOf(sev_values))
    CreatedAt = fields.DateTime(dump_only=True)
    MachineID = fields.Int(allow_none=True)

class MaintenancePartLineSchema(Schema):
    PartID = fields.Int(required=True)
    Quantity = fields.Int(required=True, validate=validate.Range(min=1))
    UnitCost = fields.Decimal(as_string=True, required=False)  # verilmezse parça UnitCost alınır

class MaintenanceRecordsSchema(Schema):
    MaintenanceID = fields.Int(dump_only=True)
    MachineID = fields.Int(required=True)
    PersonnelID = fields.Int(required=True)
    FaultID = fields.Int(allow_none=True)
    MRDescription = fields.Str(allow_none=True)
    StartTime = fields.DateTime(required=True)
    EndTime = fields.DateTime(allow_none=True)
    Cost = fields.Decimal(as_string=True)
    CreatedAt = fields.DateTime(dump_only=True)
    Parts = fields.List(fields.Nested(MaintenancePartLineSchema))

class PartsSchema(Schema):
    PartID = fields.Int(dump_only=True)
    PartName = fields.Str(required=True)
    PartNumber = fields.Str()
    UnitCost = fields.Decimal(as_string=True, required=True)
    UnitsInStock = fields.Int(required=True, validate=validate.Range(min=0))
    CreatedAt = fields.DateTime(dump_only=True)

class MaintenanceSchedulesSchema(Schema):
    ScheduleID = fields.Int(dump_only=True)
    MachineID = fields.Int(required=True)
    NextMaintenanceDate = fields.Date(required=True)
    FrequencyDays = fields.Int(required=False, validate=validate.Range(min=1))
    IsActive = fields.Bool()
    CreatedAt = fields.DateTime(dump_only=True)

class AlertsSchema(Schema):
    AlertID = fields.Int(dump_only=True)
    MachineID = fields.Int(required=True)
    AlertType = fields.Str(required=True)
    AlertMessage = fields.Str(allow_none=True)
    CreatedAt = fields.DateTime(dump_only=True)
    IsResolved = fields.Bool()

# -------- App Factory --------
def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    app.config["JWT_SECRET_KEY"] = JWT_SECRET
    JWTManager(app)

    def db():
        return SessionLocal()

    # Health
    @app.get("/health")
    def health():
        return {"status": "ok", "db": str(engine.url.database)}, 200

    # Auth (demo)
    @app.post("/auth/login")
    def login():
        data = request.get_json() or {}
        if not data.get("username") or not data.get("password"):
            return {"msg": "username/password gerekli"}, 400
        token = create_access_token(identity=data["username"], expires_delta=timedelta(hours=8))
        return {"access_token": token}

    # ---------- Machines ----------
    @app.get("/machines")
    def machines_list():
        q = request.args.get("q")
        with db() as s:
            query = s.query(Machines)
            if q:
                like = f"%{q}%"
                query = query.filter(Machines.MachineName.ilike(like))
            items = query.order_by(Machines.MachineID.desc()).all()
            return {"items": MachinesSchema(many=True).dump(items)}

    @app.post("/machines")
    @jwt_required()
    def machines_create():
        payload = MachinesSchema().load(request.get_json() or {})
        with db() as s:
            obj = Machines(**payload)
            s.add(obj)
            s.commit(); s.refresh(obj)
            return MachinesSchema().dump(obj), 201

    @app.put("/machines/<int:mid>")
    @jwt_required()
    def machines_update(mid:int):
        with db() as s:
            obj = s.get(Machines, mid)
            if not obj:
                return {"msg":"not found"}, 404
            data = request.get_json() or {}
            for k,v in data.items():
                if hasattr(obj, k):
                    setattr(obj, k, v)
            obj.UpdatedAt = datetime.utcnow()
            s.commit(); s.refresh(obj)
            return MachinesSchema().dump(obj)

    @app.delete("/machines/<int:mid>")
    @jwt_required()
    def machines_delete(mid:int):
        with db() as s:
            obj = s.get(Machines, mid)
            if not obj:
                return {"msg":"not found"}, 404
            s.delete(obj); s.commit()
            return {"msg":"deleted"}

    # ---------- Personnel ----------
    @app.get("/personnel")
    def personnel_list():
        with db() as s:
            items = s.query(Personnel).all()
            return {"items": PersonnelSchema(many=True).dump(items)}

    @app.post("/personnel")
    @jwt_required()
    def personnel_create():
        payload = PersonnelSchema().load(request.get_json() or {})
        with db() as s:
            obj = Personnel(**payload)
            s.add(obj); s.commit(); s.refresh(obj)
            return PersonnelSchema().dump(obj), 201

    # ---------- Faults ----------
    @app.get("/faults")
    def faults_list():
        with db() as s:
            items = s.query(Faults).order_by(Faults.FaultID.desc()).all()
            return {"items": FaultsSchema(many=True).dump(items)}

    @app.post("/faults")
    @jwt_required()
    def faults_create():
        payload = FaultsSchema().load(request.get_json() or {})
        with db() as s:
            f = Faults(**payload)
            s.add(f)
            s.flush()
            # Uygulama katmanı: kritik arıza ise makineyi Arızalı yap ve alert oluştur (DB trigger da var)
            if f.Severity == "Yüksek" and f.MachineID:
                m = s.get(Machines, f.MachineID)
                if m:
                    m.MachineStatus = "Arızalı"
                    m.UpdatedAt = datetime.utcnow()
                s.add(Alerts(MachineID=f.MachineID, AlertType="Kritik Arıza", AlertMessage=f"Kritik arıza ({f.FaultCode})", IsResolved=False))
            s.commit(); s.refresh(f)
            return FaultsSchema().dump(f), 201

    # ---------- Parts ----------
    @app.get("/parts")
    def parts_list():
        with db() as s:
            items = s.query(Parts).all()
            return {"items": PartsSchema(many=True).dump(items)}

    @app.post("/parts")
    @jwt_required()
    def parts_create():
        payload = PartsSchema().load(request.get_json() or {})
        with db() as s:
            p = Parts(**payload)
            s.add(p); s.commit(); s.refresh(p)
            return PartsSchema().dump(p), 201

    @app.post("/parts/<int:pid>/adjust")
    @jwt_required()
    def parts_adjust(pid:int):
        body = request.get_json() or {}
        amount = int(body.get("amount", 0))
        with db() as s:
            p = s.get(Parts, pid)
            if not p:
                return {"msg":"not found"}, 404
            new_stock = (p.UnitsInStock or 0) + amount
            if new_stock < 0:
                return {"msg":"stok negatif olamaz"}, 400
            p.UnitsInStock = new_stock
            s.commit(); s.refresh(p)
            return PartsSchema().dump(p)

    # ---------- MaintenanceRecords + lines ----------
    @app.get("/maintenance")
    def maintenance_list():
        with db() as s:
            items = s.query(MaintenanceRecords).order_by(MaintenanceRecords.MaintenanceID.desc()).limit(300).all()
            return {"items": MaintenanceRecordsSchema(many=True).dump(items)}

    @app.post("/maintenance")
    @jwt_required()
    def maintenance_create():
        payload = MaintenanceRecordsSchema().load(request.get_json() or {})
        with db() as s:
            mrec = MaintenanceRecords(
                MachineID=payload["MachineID"],
                PersonnelID=payload["PersonnelID"],
                FaultID=payload.get("FaultID"),
                MRDescription=payload.get("MRDescription"),
                StartTime=payload["StartTime"],
                EndTime=payload.get("EndTime"),
                Cost=payload.get("Cost", 0)
            )
            s.add(mrec); s.flush()  # MaintenanceID oluşsun

            # Parça satırları
            for line in (payload.get("Parts") or []):
                part = s.get(Parts, line["PartID"]) if line.get("PartID") else None
                if not part:
                    raise ValidationError(f"PartID {line.get('PartID')} bulunamadı")
                unit_cost = line.get("UnitCost")
                if unit_cost is None:
                    unit_cost = part.UnitCost  # DDL: NOT NULL, varsayılanı parçadan al
                qty = int(line["Quantity"])
                # stok kontrol
                if (part.UnitsInStock or 0) < qty:
                    raise ValidationError(f"Stok yetersiz: {part.PartName} (elde {part.UnitsInStock}, istenen {qty})")
                part.UnitsInStock = int(part.UnitsInStock) - qty
                s.add(MaintenanceParts(MaintenanceID=mrec.MaintenanceID, PartID=part.PartID, Quantity=qty, UnitCost=unit_cost))

            s.commit(); s.refresh(mrec)
            return MaintenanceRecordsSchema().dump(mrec), 201

    # ---------- Schedules ----------
    @app.get("/schedules")
    def schedules_list():
        with db() as s:
            items = s.query(MaintenanceSchedules).order_by(MaintenanceSchedules.NextMaintenanceDate.asc()).all()
            return {"items": MaintenanceSchedulesSchema(many=True).dump(items)}

    @app.post("/schedules")
    @jwt_required()
    def schedules_create():
        payload = MaintenanceSchedulesSchema().load(request.get_json() or {})
        with db() as s:
            sch = MaintenanceSchedules(**payload)
            s.add(sch); s.commit(); s.refresh(sch)
            return MaintenanceSchedulesSchema().dump(sch), 201

    # Rapor: yaklaşan bakım (MaintenanceSchedules üzerinden)
    @app.get("/reports/due-maintenance")
    def due_maintenance():
        days = int(request.args.get("days", 7))
        today = date.today()
        until = today + timedelta(days=days)
        with db() as s:
            q = (
                s.query(MaintenanceSchedules, Machines)
                .join(Machines, MaintenanceSchedules.MachineID == Machines.MachineID)
                .filter(MaintenanceSchedules.IsActive == True)
                .filter(MaintenanceSchedules.NextMaintenanceDate <= until)
            )
            items = []
            for sch, mach in q.all():
                items.append({
                    "ScheduleID": sch.ScheduleID,
                    "MachineID": mach.MachineID,
                    "MachineName": mach.MachineName,
                    "NextMaintenanceDate": sch.NextMaintenanceDate.isoformat(),
                    "DaysLeft": (sch.NextMaintenanceDate - today).days
                })
            return {"items": items}

    # ---------- Alerts ----------
    @app.get("/alerts")
    def alerts_list():
        with db() as s:
            items = s.query(Alerts).order_by(Alerts.AlertID.desc()).all()
            return {"items": AlertsSchema(many=True).dump(items)}

    @app.post("/alerts")
    @jwt_required()
    def alerts_create():
        payload = AlertsSchema().load(request.get_json() or {})
        with db() as s:
            al = Alerts(**payload)
            s.add(al); s.commit(); s.refresh(al)
            return AlertsSchema().dump(al), 201

    @app.post("/alerts/<int:aid>/resolve")
    @jwt_required()
    def alerts_resolve(aid:int):
        with db() as s:
            al = s.get(Alerts, aid)
            if not al:
                return {"msg":"not found"}, 404
            al.IsResolved = True
            s.commit(); s.refresh(al)
            return AlertsSchema().dump(al)

    # ---------- Rapor: Aylık bakım maliyeti (MaintenanceRecords üzerinden) ----------
    @app.get("/reports/monthly-maintenance-cost")
    def monthly_cost():
        with db() as s:
            rows = (
                s.query(
                    func.year(MaintenanceRecords.StartTime).label("Year"),
                    func.month(MaintenanceRecords.StartTime).label("Month"),
                    func.sum(MaintenanceRecords.Cost).label("TotalCost"),
                    func.count(MaintenanceRecords.MaintenanceID).label("Jobs")
                )
                .group_by(func.year(MaintenanceRecords.StartTime), func.month(MaintenanceRecords.StartTime))
                .order_by(func.year(MaintenanceRecords.StartTime), func.month(MaintenanceRecords.StartTime))
            ).all()
            items = [{"Year":r.Year, "Month":r.Month, "TotalCost": float(r.TotalCost or 0), "Jobs": int(r.Jobs or 0)} for r in rows]
            return {"items": items}

    # ---------- Error handlers ----------
    @app.errorhandler(ValidationError)
    def handle_validation(err:ValidationError):
        return {"msg":"validation_error", "errors": err.messages}, 400

    @app.errorhandler(404)
    def handle_404(err):
        return {"msg":"not found"}, 404

    @app.errorhandler(Exception)
    def handle_500(err:Exception):
        return {"msg":"internal_error", "detail": str(err)}, 500

    return app

app = create_app()

if __name__ == "__main__":
    # Dikkat: Prod’da migration kullanılmalı; aşağıdaki create_all sadece geliştime içindir.
    # Base.metadata.create_all(engine)
    app.run(host="0.0.0.0", port=5000, debug=True)
