from pathlib import Path
import json,hashlib,subprocess
root=Path(__file__).resolve().parent;src=Path('D:/ATS-Rover-Clerk/rover-resume');manifest=json.loads((root/'baseline-sha256.json').read_text());changes=[];copy_changes=[]
for rel,expected in manifest.items():
 p=src/rel
 if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=expected:changes.append(rel)
 c=root/'engine'/rel
 if not c.exists() or hashlib.sha256(c.read_bytes()).hexdigest()!=expected:copy_changes.append(rel)
status=subprocess.check_output(['git','--no-optional-locks','-C',str(src),'status','--porcelain=v1'],text=True)
baseline=(root/'baseline-git-status.txt').read_text();result={'files_checked':len(manifest),'original_hash_differences':changes,'copied_source_hash_differences':copy_changes,'git_status_matches_baseline':status==baseline,'git_status':status}
(root/'integrity-result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2));raise SystemExit(bool(changes or copy_changes or status!=baseline))
