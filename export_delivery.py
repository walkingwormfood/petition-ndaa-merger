"""Build the per-state delivery packets from a D1 export.

1. Export confirmed signatures:
   wrangler d1 execute petition --remote --command "SELECT name, zip, addr, confirmed_at FROM signatures WHERE confirmed = 1" --json > confirmed.json
2. Run: python export_delivery.py confirmed.json
   -> delivery/<STATE>.csv  (one per state, senator-ready)
   -> delivery/_summary.txt (counts per state, for cover letters)

State mapping uses standard USPS ZIP3 ranges (embedded below). Spot-check
delivery/UNKNOWN.csv for anything the ranges missed before final delivery.
"""
import csv
import json
import os
import sys

# state -> list of (lo, hi) inclusive ZIP3 ranges, standard USPS allocation
RANGES = {
 "MA": [(10, 27), (55, 55)], "RI": [(28, 29)], "NH": [(30, 38)], "ME": [(39, 49)],
 "VT": [(50, 54), (56, 59)], "CT": [(60, 69)], "NJ": [(70, 89)],
 "NY": [(90, 149), (4, 5)], "PA": [(150, 196)], "DE": [(197, 199)],
 "DC": [(200, 205), (569, 569)], "VA": [(201, 201), (220, 246)], "MD": [(206, 219)],
 "WV": [(247, 268)], "NC": [(270, 289)], "SC": [(290, 299)], "GA": [(300, 319), (398, 399)],
 "FL": [(320, 349)], "AL": [(350, 369)], "TN": [(370, 385)], "MS": [(386, 397)],
 "KY": [(400, 427)], "OH": [(430, 459)], "IN": [(460, 479)], "MI": [(480, 499)],
 "IA": [(500, 528)], "WI": [(530, 549)], "MN": [(550, 567)], "SD": [(570, 577)],
 "ND": [(580, 588)], "MT": [(590, 599)], "IL": [(600, 629)], "MO": [(630, 658)],
 "KS": [(660, 679)], "NE": [(680, 693)], "LA": [(700, 714)], "AR": [(716, 729)],
 "OK": [(730, 749)], "TX": [(750, 799), (885, 885)], "CO": [(800, 816)],
 "WY": [(820, 831)], "ID": [(832, 838)], "UT": [(840, 847)], "AZ": [(850, 865)],
 "NM": [(870, 884)], "NV": [(889, 898)], "CA": [(900, 961)], "HI": [(967, 968)],
 "OR": [(970, 979)], "WA": [(980, 994)], "AK": [(995, 999)],
 "PR": [(6, 9), (0, 0)], "VI": [(8, 8)],
}
LOOKUP = {}
for st, ranges in RANGES.items():
    for lo, hi in ranges:
        for p in range(lo, hi + 1):
            LOOKUP.setdefault(f"{p:03d}", st)

def main():
    data = json.load(open(sys.argv[1], encoding="utf-8"))
    rows = data[0]["results"] if isinstance(data, list) else data["results"]
    os.makedirs("delivery", exist_ok=True)
    by_state = {}
    for r in rows:
        st = LOOKUP.get(str(r["zip"])[:3], "UNKNOWN")
        by_state.setdefault(st, []).append(r)
    with open("delivery/_summary.txt", "w", encoding="utf-8") as s:
        for st in sorted(by_state):
            sigs = by_state[st]
            s.write(f"{st}: {len(sigs)}\n")
            with open(f"delivery/{st}.csv", "w", newline="", encoding="utf-8") as f:
                w = csv.writer(f)
                w.writerow(["Name", "ZIP", "Confirmed (UTC)"])
                for r in sorted(sigs, key=lambda x: str(x["zip"])):
                    w.writerow([r["name"], r["zip"], r["confirmed_at"]])
    total = sum(len(v) for v in by_state.values())
    print(f"{total} confirmed signatures across {len(by_state)} states -> delivery/")

if __name__ == "__main__":
    main()
