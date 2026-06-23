#!/usr/bin/env python3
"""
gingeball name-integrity gate + repair.

Accented player names (Jokić, Dončić, Porziņģis, Vučević, Valančiūnas ...) get
corrupted in ingestion in two ways:

  A) MOJIBAKE   "N. JokiÄ\x87"   UTF-8 bytes decoded as Latin-1, then re-saved.  Reversible.
  B) TRUNCATION "N. Joki"        cut at the first non-ASCII byte.               NOT reversible
                                 from the string -> identity must key on nba_id, not name.

Commands:
  check   scan CSV(s) for corruption; exit 1 if found.            (CI / pre-load gate)
          - always flags mojibake
          - flags truncation when --canonical <file/col> is given
          - --audit-zeros also flags iib==0 with real possessions (DB phantom signature)
  repair  un-mangle mode-A names; map mode-B via --crosswalk (bad_name,canonical_name).

Idempotent: repair twice == repair once; a repaired file passes `check`.
"""
import argparse, csv, sys, signal
try: signal.signal(signal.SIGPIPE, signal.SIG_DFL)  # clean exit when piped to head
except (AttributeError, ValueError): pass

MOJIBAKE_MARKERS = "ÃÄÅÂÐ£¦§©»½¿"

def looks_mojibake(s): return any(c in s for c in MOJIBAKE_MARKERS)

def unmangle(s):
    try:
        from ftfy import fix_text
        f = fix_text(s)
        if f != s: return f
    except Exception: pass
    try: return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError): return s

def fnum(x):
    x = (x or "").strip()
    try: return float(x)
    except ValueError: return None

def find_col(fields, *cands):
    low = {f.lower(): f for f in fields}
    for c in cands:
        if c in low: return low[c]
    return None

def load_canon(spec):
    """spec = path.csv:column  (or path.csv -> first col). Returns set of canonical names."""
    if not spec: return set()
    path, _, col = spec.partition(":")
    rows = list(csv.DictReader(open(path, encoding="utf-8")))
    if not rows: return set()
    col = col or list(rows[0].keys())[0]
    return {(r[col] or "").strip() for r in rows if (r.get(col) or "").strip()}

def truncated_against(s, canon):
    s = s.strip()
    for full in canon:
        if full != s and full.startswith(s) and len(full) > len(s) and ord(full[len(s)]) > 127:
            return full
    return None

def scan(path, name_field, canon, audit_zeros):
    rows = list(csv.DictReader(open(path, encoding="utf-8", newline="")))
    if not rows: return rows, []
    fn = list(rows[0].keys())
    name_col = name_field or find_col(fn, "player", "name", "player_name")
    iib_col, poss_col = find_col(fn, "iib", "iib_box"), find_col(fn, "possessions", "poss", "off_poss")
    issues = []
    for i, r in enumerate(rows, 2):
        nm = (r.get(name_col) or "").strip() if name_col else ""
        if nm and looks_mojibake(nm):
            issues.append((i, "mojibake", nm, unmangle(nm)))
        elif nm and canon:
            full = truncated_against(nm, canon)
            if full: issues.append((i, "truncated", nm, full))
        if audit_zeros and iib_col and poss_col:
            iib, poss = fnum(r.get(iib_col)), fnum(r.get(poss_col))
            if iib == 0.0 and poss and poss > 500:
                issues.append((i, "zero_iib_w_poss", nm or "(unnamed)", f"poss={int(poss)}"))
    return rows, issues

def cmd_check(a):
    canon = load_canon(a.canonical)
    total = 0
    for path in a.files:
        _, issues = scan(path, a.name_field, canon, a.audit_zeros)
        if issues:
            print(f"FAIL  {path}: {len(issues)} issue(s)")
            for ln, kind, found, detail in issues[:100]:
                print(f"   line {ln:>5}  {kind:<16} {found!r}  ->  {detail}")
            total += len(issues)
        else:
            print(f"ok    {path}")
    if total:
        print(f"\n{total} issue(s). Do NOT load this data.", file=sys.stderr); return 1
    print("\nAll files clean."); return 0

def cmd_repair(a):
    crosswalk = {}
    if a.crosswalk:
        for r in csv.DictReader(open(a.crosswalk, encoding="utf-8")):
            crosswalk[r["bad_name"].strip()] = r["canonical_name"].strip()
    rows, _ = scan(a.file, a.name_field, set(), False)
    fn = list(rows[0].keys())
    name_col = a.name_field or find_col(fn, "player", "name", "player_name")
    fixed = 0
    for r in rows:
        nm = (r.get(name_col) or "").strip()
        if not nm: continue
        new = crosswalk.get(nm, unmangle(nm) if looks_mojibake(nm) else nm)
        if new != nm: r[name_col] = new; fixed += 1
    out = a.output or a.file
    with open(out, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fn); w.writeheader(); w.writerows(rows)
    print(f"repaired {fixed} name(s) -> {out}"); return 0

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Gingeball name-integrity gate + repair")
    sub = ap.add_subparsers(required=True)
    c = sub.add_parser("check"); c.add_argument("files", nargs="+")
    c.add_argument("--name-field"); c.add_argument("--canonical", help="path.csv:col of canonical names (enables truncation detection)")
    c.add_argument("--audit-zeros", action="store_true", help="also flag iib==0 with >500 possessions")
    c.set_defaults(func=cmd_check)
    r = sub.add_parser("repair"); r.add_argument("file"); r.add_argument("--output")
    r.add_argument("--crosswalk", help="CSV with columns bad_name,canonical_name"); r.add_argument("--name-field")
    r.set_defaults(func=cmd_repair)
    a = ap.parse_args(); sys.exit(a.func(a))
