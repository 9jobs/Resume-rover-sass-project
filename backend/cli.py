import json,sys
from .pipeline import generate
def canonical_profile(r):
    sections=r.get("sections",[])
    def content(kind):return next((s.get("content",{}) for s in sections if s.get("type")==kind),{})
    p=r.get("profile",{})
    experience=[]
    for e in content("experience").get("entries",[]):
        dates=e.get("dateRange","").replace("–"," - ").replace("—"," - ").split(" - ")
        experience.append({"company":e.get("organization",""),"title":e.get("title",""),"location":e.get("location",""),"start":dates[0].strip() if dates else "","end":dates[-1].strip() if len(dates)>1 else "","is_current":bool(dates and dates[-1].strip().lower() in ["present","current"]),"bullets":[{"text":b} for b in e.get("bullets",[])]})
    skills=[{"name":s} for s in content("skills").get("items",[])]
    for c in content("skills").get("categories",[]):
        skills.extend({"name":s,"group":c.get("name","General")} for s in c.get("items",[]))
    return {"personal":{"name":p.get("fullName",""),"email":p.get("email",""),"phone":p.get("phone",""),"city":p.get("location","")},"skills":skills,"experience":experience,"projects":content("projects").get("entries",[]),"education":content("education").get("entries",[])}
if __name__=="__main__":
    try:
        body=json.load(sys.stdin)
        result=generate(body.get("profile") or canonical_profile(body.get("resume",{})),body.get("jd",""))
        print(json.dumps({"ok":True,"result":result},ensure_ascii=True))
    except Exception as e:
        print(json.dumps({"ok":False,"error":"Profile validation failed. Replace placeholders and review required fields." if "validation error" in str(e).lower() else "Unable to analyse the supplied profile."}))
