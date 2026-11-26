"""Optional standalone loopback API. Existing SaaS auth remains in the Node bridge."""
import os,json,secrets
from fastapi import FastAPI,Depends,Header,HTTPException
from sqlalchemy import create_engine,Column,String,Text,select,delete
from sqlalchemy.orm import DeclarativeBase,Session
from .models import Profile,GenerateRequest
from .pipeline import generate,parse_jd
class Base(DeclarativeBase):pass
class StoredProfile(Base):
    __tablename__="ats_profiles"
    owner=Column(String,primary_key=True)
    data=Column(Text,nullable=False)
engine=create_engine(os.getenv("ATS_DATABASE_URL","sqlite:///backend/ats-profiles.sqlite"))
Base.metadata.create_all(engine)
app=FastAPI(title="ATS Resume Maker",version="0.1.0")
def identity(authorization:str=Header(default=""),x_ats_user:str=Header(default="")):
    token=os.getenv("ATS_INTERNAL_TOKEN","")
    if not token or not secrets.compare_digest(authorization,"Bearer "+token) or not x_ats_user:
        raise HTTPException(401,"Internal authenticated bridge required")
    return x_ats_user
@app.get("/profile")
def get_profile(owner=Depends(identity)):
    with Session(engine) as db:
        p=db.get(StoredProfile,owner)
        if not p:raise HTTPException(404,"Profile not found")
        return json.loads(p.data)
@app.post("/profile")
@app.put("/profile")
def save_profile(profile:Profile,owner=Depends(identity)):
    with Session(engine) as db:
        db.merge(StoredProfile(owner=owner,data=profile.model_dump_json()));db.commit()
    return profile
@app.post("/jd/parse")
def jd_parse(body:dict,owner=Depends(identity)):
    jd=body.get("jd","")
    if not 10<=len(jd)<=20000:raise HTTPException(422,"JD must contain 10–20000 characters")
    return parse_jd(jd)
@app.post("/resume/generate")
@app.post("/resume/rescore")
def resume_generate(body:GenerateRequest,owner=Depends(identity)):
    return generate(body.profile,body.jd)
@app.delete("/user-data")
def delete_data(owner=Depends(identity)):
    with Session(engine) as db:
        db.execute(delete(StoredProfile).where(StoredProfile.owner==owner));db.commit()
    return {"deleted":"dedicated ATS profile only; existing SaaS data is managed separately"}
