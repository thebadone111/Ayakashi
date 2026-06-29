# L3 — 木 Wood Kanji

Input: `input.png`
Output: drop generated mp4 into `output/`

*Kanji 木 on washi medallion · green palette · wood element*

**System:** Static camera. Never pan. Never zoom. Never rotate. Apply globally — do not repeat per block.
**Workflow settings:** `length: 97` · `pingpong: OFF` · `fps: 16` · `steps: 25 / split: 9` · ~6s raw · 12s ping-pong loop

---

## Win Loop

### Pass 1 — movement only
```
Primary:
• Medallion sways left.
• Pause.
• Sways right.
• Pause.
• Visible amplitude.
• Repeat.

Secondary:
• Slight tilt follows sway direction.
• Lags.
• Follow-through.
```

### Pass 2 — FX only
```
No medallion movement.

Light:
• Green glow pulses slowly.
• Brightens at kanji centre.
• Fades outward.

Particles:
• Several small leaves drift past.
• Exit frame slowly.
• Single petal drifts downward once per cycle.
```
