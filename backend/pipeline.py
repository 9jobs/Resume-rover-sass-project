"""Conservative, source-preserving ATS analysis. No model-generated facts."""
import json, re, calendar, copy
from pathlib import Path
from datetime import date
from rapidfuzz.fuzz import ratio
from .models import Profile

ONTOLOGY=json.loads((Path(__file__).parent.parent/"ontology/aliases.json").read_text(encoding="utf-8"))
FAMILIES={
"Healthcare":["nurse","patient care","clinical","rn","bls"],
"Education":["teacher","teaching","classroom","lesson planning"],
"Finance/Accounting":["accountant","gaap","ifrs","financial reporting","bookkeeping"],
"HR":["recruiter","recruitment","hris","payroll"],
"Sales":["sales","pipeline","quota","crm"],
"Marketing":["seo","marketing","campaign"],
"Design/Creative":["graphic designer","figma","photoshop","design portfolio"],
"Customer Support":["customer support","customer service","tickets"],
"Legal":["lawyer","litigation","bar admission","paralegal"],
"Operations/Supply Chain":["supply chain","inventory","procurement","warehouse"],
"Hospitality":["hotel","hospitality","food safety","chef"],
"Engineering/Trades":["mechanical engineer","autocad","welding","electrician"],
"Software/Data":["software developer","software engineer","react","python","sql"],
"Executive":["chief","executive","vice president"],
"Government":["civil service","public administration"],
}
def norm(text):
    return re.sub(r"\s+"," ",str(text).lower()).strip()
def contains(text,term):
    return bool(re.search(r"(?<!\w)"+re.escape(norm(term))+r"(?!\w)",norm(text)))
def family(jd):
    counts={name:sum(contains(jd,t) for t in terms) for name,terms in FAMILIES.items()}
    return max(counts,key=counts.get) if max(counts.values(),default=0)>0 else "General"
def parse_jd(jd):
    lines=[line.strip() for line in re.split(r"[\n;]",jd) if not re.search(r"(?i)equal opportunity|benefits include|privacy policy",line)]
    clean="\n".join(lines)
    keywords=[]
    for term,aliases in ONTOLOGY.items():
        if any(contains(clean,t) for t in [term]+aliases):
            relevant=[line for line in lines if any(contains(line,t) for t in [term]+aliases)]
            weight=1 if relevant and all(re.search(r"(?i)preferred|nice.to.have|bonus",l) for l in relevant) else 3 if any(re.search(r"(?i)must|required|essential",l) for l in relevant) else 2
            keywords.append({"term":term,"weight":weight})
    years=re.findall(r"(\d+)\+?\s*(?:years|yrs)",clean,re.I)
    unknown=[]
    for line in lines:
        if re.search(r"(?i)must|required|essential|licen[cs]e|certif",line):
            unknown.append(line[:400])
    return {"title":lines[0][:150] if lines else "", "family":family(clean),"keywords":keywords,"years_required":max(map(int,years),default=0),"unclassified_requirements":unknown}
def month(value):
    value=str(value).strip()
    if not value:return None
    if re.fullmatch(r"\d{4}-\d{2}",value):
        year,mon=map(int,value.split("-"))
        if not 1<=mon<=12:return None
        return year*12+mon-1
    match=re.fullmatch(r"([A-Za-z]+)\s+(\d{4})",value)
    if match:
        names={name.lower():i for i,name in enumerate(calendar.month_abbr) if name}
        mon=names.get(match[1][:3].lower())
        return int(match[2])*12+mon-1 if mon else None
    return None
def experience_months(experience,today=None):
    today=today or date.today()
    intervals=[];warnings=[]
    for e in experience:
        start=month(e.start);end=today.year*12+today.month-1 if e.is_current else month(e.end)
        if start is None or end is None:
            warnings.append("Incomplete or ambiguous dates: experience years cannot be inferred.")
        elif end<start:warnings.append("An end date precedes its start date.")
        elif start>today.year*12+today.month-1:warnings.append("An experience start date is in the future.")
        else:intervals.append((start,end+1))
    intervals.sort();merged=[]
    for start,end in intervals:
        if merged and start<=merged[-1][1]:merged[-1]=(merged[-1][0],max(end,merged[-1][1]))
        else:merged.append((start,end))
    return sum(end-start for start,end in merged),warnings
def guard(source,output):
    """Only exact source records may enter a tailored profile."""
    original=source.model_dump()
    for section in ["skills","experience","projects","education","certifications_licenses"]:
        allowed=original.get(section,[])
        for item in output.get(section,[]):
            if section=="experience":
                match=next((e for e in allowed if all(e.get(k)==item.get(k) for k in ["company","title","start","end"])),None)
                if not match or any(b not in match["bullets"] for b in item["bullets"]):return False
            elif item not in allowed:return False
    return all(original.get("personal",{}).get(k)==v for k,v in output.get("personal",{}).items())
def has_metric(bullet):
    return bool(bullet.metric or re.search(r"(?i)(?:[$₹£€]\s*\d|\b\d+(?:\.\d+)?\s*(?:%|percent|patients?|students?|tickets?|customers?|clients?|cases?|hours?|minutes?|days?|revenue|sales|people|employees?)\b)",bullet.text))
def generate(profile,jd):
    profile=Profile.model_validate(profile) if isinstance(profile,dict) else profile
    parsed=parse_jd(jd);data=profile.model_dump()
    bullets=[b.text for e in profile.experience for b in e.bullets]
    context=" ".join(bullets+[json.dumps(p,ensure_ascii=False) for p in profile.projects])
    skills=" ".join(s.name for s in profile.skills)
    allfacts=context+" "+skills+" "+json.dumps(profile.certifications_licenses)
    matched=[];partial=[];missing=[]
    for keyword in parsed["keywords"]:
        variants=[keyword["term"]]+ONTOLOGY.get(keyword["term"],[])
        in_context=any(contains(context,t) for t in variants)
        in_skills=any(contains(skills,t) for t in variants)
        if in_context or in_skills:matched.append({**keyword,"credit":1 if in_context else .6,"evidence":"experience/projects" if in_context else "skills only"})
        else:
            close=max((ratio(norm(s.name),norm(t)) for s in profile.skills for t in variants),default=0)
            if close>=90:partial.append({**keyword,"reason":"Similar spelling; confirmation required."})
            missing.append(keyword)
    questions=[{"id":"skill:"+x["term"],"question":"Do you have confirmed experience or a current qualification in "+x["term"]+"?","details_required":True,"term":x["term"]} for x in missing]
    questions += [{"id":"requirement:"+str(i),"question":line,"details_required":True,"status":"unclassified requirement; needs human review"} for i,line in enumerate(parsed["unclassified_requirements"])]
    months,warnings=experience_months(profile.experience)
    metric_bullets=sum(has_metric(b) for e in profile.experience for b in e.bullets)
    count=len(bullets)
    total_weight=sum(k["weight"] for k in parsed["keywords"])
    keyword_points=35*sum(k["weight"]*k["credit"] for k in matched)/total_weight if total_weight else 0
    responsibilities=sum(any(contains(b,k["term"]) for k in parsed["keywords"]) for b in bullets)
    categories=[
      ("Keyword match",35,keyword_points,"Context earns full credit; skills-only evidence earns 60%. Unknown requirements remain questions."),
      ("Title and seniority",8,(4 if any(contains(e.title,parsed["title"]) for e in profile.experience) else 0)+(4 if parsed["years_required"] and months/12>=parsed["years_required"] else 0),"Only entered dates are counted; overlapping months are merged."),
      ("Experience relevance",15,15*responsibilities/count if count else 0,"Conservative keyword context coverage; semantic model not configured."),
      ("Quantified impact",10,10*metric_bullets/count if count else 0,"Only source numbers and supplied metrics receive credit."),
      ("Qualifications",7,0,"Required qualifications need explicit validation; no automatic equivalence assumed."),
      ("Section completeness",5,sum(bool(data.get(k)) for k in ["skills","experience","education","projects"])*1.25,"Based on populated profile sections."),
      ("Formatting",10,0,"Awaiting actual exported-document inspection."),
      ("Re-extraction",5,0,"Awaiting PDF/DOCX text round-trip."),
      ("Readability",5,5*sum(len(b.split())<=40 for b in bullets)/count if count else 0,"Long bullets need review.")
    ]
    output=copy.deepcopy(data)
    safe_personal={"name","phone","email","city","state","country","linkedin_url","website","portfolio","publications_url"}
    output["personal"]={k:v for k,v in output["personal"].items() if k in safe_personal}
    protected=set(data["personal"])-safe_personal
    if protected:warnings.append("Optional sensitive personal fields were excluded from the tailored output.")
    for e in output["experience"]:
        e["bullets"].sort(key=lambda b:sum(contains(b["text"],k["term"])*k["weight"] for k in parsed["keywords"]),reverse=True)
    if not guard(profile,output):raise ValueError("Unsupported output fact; export blocked.")
    for i,e in enumerate(profile.experience):
        for j,b in enumerate(e.bullets):
            if not has_metric(b):
                questions.append({"id":f"metric:{i}:{j}","question":"Can you supply a verified result (volume, accuracy, turnaround time, revenue, people served, team size or budget)?","details_required":True,"status":"needs metric"})
    return {"profile":output,"jd":parsed,"estimated_score":round(sum(p for _,_,p,_ in categories),1),"breakdown":[{"category":n,"max":m,"points":round(p,1),"explanation":e} for n,m,p,e in categories],"matched":matched,"partial":partial,"gaps":missing,"questions":questions,"experience_months":months,"warnings":warnings,"truthfulness_passed":True,"iterations":1,"blocked_improvements":["Missing facts cannot be invented.","Formatting and extraction points are withheld until export verification."],"label":"Estimated ATS score — employer systems differ.","provider":"local deterministic rules; no LLM inference","capabilities":{"semantic_embeddings":False,"spacy_model":False,"qualification_equivalence":False}}
