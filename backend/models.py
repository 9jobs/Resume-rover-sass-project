from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Literal
import re

class Record(BaseModel):
    model_config = ConfigDict(extra="allow")
class Personal(Record):
    name: str = Field(min_length=1, max_length=150)
    email: str = ""
    phone: str = ""
    city: str = ""
class Skill(Record):
    name: str
    group: str = "General"
    years_used: float | None = Field(default=None, ge=0)
    proficiency: str = ""
class Bullet(Record):
    text: str = Field(max_length=2000)
    skills_or_tools_used: list[str] = []
    metric: str | None = None
    impact_type: str = ""
class Experience(Record):
    company: str = ""
    title: str = ""
    location: str = ""
    employment_type: str = "full-time"
    start: str = ""
    end: str = ""
    is_current: bool = False
    bullets: list[Bullet] = []
class Profile(Record):
    personal: Personal
    career_level: str = "mid"
    region: str = "US/Canada"
    skills: list[Skill] = []
    experience: list[Experience] = []
    education: list[dict] = []
    projects: list[dict] = []
    certifications_licenses: list[dict] = []
    @model_validator(mode="after")
    def placeholders(self):
        import json
        text=json.dumps(self.model_dump(),ensure_ascii=False)
        if re.search(r"(?i)\b(lorem ipsum|TBD|XYZ Company)\b|\(fictional\)",text):
            raise ValueError("Replace placeholder content with confirmed personal facts.")
        return self
class GenerateRequest(Record):
    profile: Profile
    jd: str = Field(min_length=10,max_length=20000)
