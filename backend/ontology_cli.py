import argparse,json
from pathlib import Path
p=argparse.ArgumentParser(description="Add a human-confirmed alias to the local ontology")
p.add_argument("term");p.add_argument("alias");p.add_argument("--confirm-equivalent",action="store_true")
a=p.parse_args()
if not a.confirm_equivalent:p.error("Confirm equivalence explicitly; related terms must not be treated as identical.")
file=Path(__file__).parent.parent/"ontology/aliases.json"
data=json.loads(file.read_text(encoding="utf-8"));data.setdefault(a.term,[])
if a.alias not in data[a.term]:data[a.term].append(a.alias)
file.write_text(json.dumps(data,indent=2,ensure_ascii=False),encoding="utf-8")
