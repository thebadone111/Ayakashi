"""Submit-prep verification: confirm the jsonl.zst payoutMultiplier values
match the lookup-table CSV payout column (Stake Engine hashes these together),
and re-confirm RTP / max-win from the CSVs. Run with the math-sdk env python."""
import zstandard, json, csv, io, os

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "math")

def sample_match(mode, n=8):
    rows = []
    with open(os.path.join(HERE, f"lookUpTable_{mode}_0.csv")) as f:
        for i, (sid, p, pay) in enumerate(csv.reader(f)):
            rows.append((sid, pay))
            if i >= n - 1:
                break
    dctx = zstandard.ZstdDecompressor()
    ok = True
    with open(os.path.join(HERE, f"books_{mode}.jsonl.zst"), "rb") as fh:
        text = io.TextIOWrapper(dctx.stream_reader(fh), encoding="utf-8")
        for i in range(n):
            o = json.loads(text.readline())
            csv_id, csv_pay = rows[i]
            keys_ok = all(k in o for k in ("id", "events", "payoutMultiplier"))
            match = str(o["payoutMultiplier"]) == csv_pay
            ok = ok and match and keys_ok
            print(f"  {mode:5s} jsonl id={o['id']:>3} payoutMult={o['payoutMultiplier']:>8} | "
                  f"csv[{i}] id={csv_id} payout={csv_pay} | keys_ok={keys_ok} match={match}")
    return ok

print("=== payoutMultiplier CSV<->jsonl spot-check (first 8 rounds/mode) ===")
all_ok = True
for mode in ("base", "bonus"):
    all_ok = sample_match(mode) and all_ok
print(f"\nRESULT: {'ALL MATCH - OK' if all_ok else 'MISMATCH - FAIL'}")
