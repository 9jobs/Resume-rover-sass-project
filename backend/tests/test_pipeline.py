import pytest
from datetime import date
from backend.models import Profile
from backend.pipeline import generate,family,experience_months,guard
CASES=[("Software Developer","React","Software/Data"),("Sales Executive","CRM","Sales"),("Staff Nurse","RN","Healthcare"),("School Teacher","lesson planning","Education"),("Accountant","GAAP","Finance/Accounting"),("HR Recruiter","HRIS","HR"),("Graphic Designer","Figma","Design/Creative"),("Customer Support","customer service","Customer Support"),("Welder","welding","Engineering/Trades"),("Hotel Chef","food safety","Hospitality")]
def profile(title,skill):
    return Profile.model_validate({"personal":{"name":"Test Candidate"},"skills":[{"name":skill}],"experience":[{"company":"Example employer","title":title,"start":"2020-01","end":"2023-01","bullets":[{"text":"Delivered services using "+skill}]}]})
@pytest.mark.parametrize("title,skill,expected",CASES)
def test_professions(title,skill,expected):
    p=profile(title,skill);r=generate(p,title+"\nRequired: "+skill)
    assert r["jd"]["family"]==expected
    assert guard(p,r["profile"])
    assert 0<=r["estimated_score"]<=100
    assert sum(x["max"] for x in r["breakdown"])==100
def test_missing_does_not_become_fact():
    p=profile("Teacher","lesson planning")
    r=generate(p,"Teacher\nMust have RN and BLS")
    assert any(q.get("term")=="RN" for q in r["questions"])
    assert all(s["name"]!="RN" for s in r["profile"]["skills"])
def test_date_overlap():
    p=profile("Teacher","lesson planning")
    p.experience.append(p.experience[0].model_copy())
    assert experience_months(p.experience,date(2024,1,1))[0]==37
def test_guard():
    p=profile("Teacher","lesson planning");out=p.model_dump();out["experience"][0]["company"]="Invented"
    assert not guard(p,out)
def test_placeholders():
    with pytest.raises(ValueError):profile("Teacher (Fictional)","lesson planning")
@pytest.mark.parametrize("level",["student/fresher","career-changer"])
def test_no_invented_experience(level):
    p=Profile.model_validate({"personal":{"name":"Test Candidate"},"career_level":level})
    r=generate(p,"Accountant\nRequired Excel")
    assert not r["profile"]["experience"]

def test_personal_characteristics_do_not_affect_score_or_enter_output():
    a=profile("Teacher","lesson planning");b=a.model_copy(deep=True)
    b.personal.model_extra.update({"gender":"woman","age":52,"religion":"private"})
    ra=generate(a,"Teacher required lesson planning");rb=generate(b,"Teacher required lesson planning")
    assert ra["estimated_score"]==rb["estimated_score"]
    assert "gender" not in rb["profile"]["personal"]

def test_component_numbers_are_not_impact_metrics():
    p=profile("Engineer","React");p.experience[0].bullets[0].text="Developed React component 1-2."
    r=generate(p,"Software engineer required React")
    assert next(x for x in r["breakdown"] if x["category"]=="Quantified impact")["points"]==0
    assert any(q.get("status")=="needs metric" for q in r["questions"])
