# Gap 2 — Spatial / Movement Tracking: Hunting Guide
_What closes Gap 2: continuous (x,y) coordinates for 10 players + ball over time → real gravity,
MIV, spacing, true defender positioning, advantage-chain tables. Verified June 2026._

## The hard wall (know this before you hunt)
Public NBA coordinate tracking exists ONLY for **2013-14 → 2015-16** (last public season = 2015-16).
- 2013-2016: SportVU (Stats LLC) — publicly leaked/archived.
- 2017-2023: Second Spectrum — **private**.
- Current: Hawk-Eye Innovations — **private**.
So there are TWO separate hunts:
- **PATH A** — harvest the 2013-16 SportVU coordinates. Use to PROTOTYPE + TRAIN the spatial
  methods (gravity, spacing, MIV, defender-distance) on real coordinates now. Not current.
- **PATH B** — generate your OWN coordinates from broadcast film via CV. The ONLY route to
  2017-present / current-season spatial data. This is the differentiated asset.

---

## PATH A — existing public SportVU coordinates (2013-16)

### Best entry point (VERIFIED, full season, easiest)
- **`dcayton/nba_tracking_data_15_16`** (Hugging Face Datasets) — FULL 2015-16 season raw SportVU
  (x,y for all players+ball, 25 Hz) **already merged with play-by-play**, with size-subsampled
  configs for quick loading. Far better starting point than the one-game samples.
  `load_dataset("dcayton/nba_tracking_data_15_16")`.

### Raw game-log repos (VERIFIED)
- **`sealneaward/nba-movement-data`** — mirror of neilmj's logs + scripts to JSON→DataFrame and
  full-court→half-court conversion; includes `data/shots/fixed_shots.csv`.
- **`neilmj/BasketballData`** — the original `2016.NBA.Raw.SportVU.Game.Logs` (per-game .7z JSON).
- **`linouk23/NBA-Player-Movements`** — raw 2016 SportVU logs + play animation.
  (NOTE: correct repo name is `NBA-Player-Movements`, NOT "…Movement-Data" — that earlier name was wrong.)
- **`rajshah4/NBA_SportVu`** — you already have this; R parsing/EDA, convex-hull spacing, velocity/accel.
- **`josedv82/sportVU_NBA_Tracking`** — physical-demands (speed/accel) workbook on the same data.
- **`josedv82/public_sport_science_datasets`** — compilation; has a direct SportVU 2015 download link.

### What Path A gives you that you can build immediately
Defender distance at every frame, convex-hull spacing/floor-balance, player velocity/accel/jerk,
gravity-by-displacement, true closeout speed — i.e. real versions of MIV and the spatial inputs to
COV/RPV — validated on 2015-16, then ported to your Path-B current-season coordinates.

### Path A search strings
- GitHub: `SportVU movement data`, `NBA SportVU json logs`, `nba-movement-data`,
  `2016.NBA.Raw.SportVU.Game.Logs`, `NBA player movements`, `nba tracking 2015-16`
- Hugging Face: `nba tracking`, `sportvu`, `basketball tracking coordinates`
- Kaggle: `NBA SportVU`, `NBA movement tracking` (VERIFY — some are reuploads of the above)
- Google: `SportVU raw logs github 2015-16`, `savvas tjortjoglou nba play by play movements`

---

## PATH B — generate your own coordinates from broadcast film (current seasons)

This is the `nba2nba` pipeline you already have blueprinted (RF-DETR Medium → ByteTrack →
YOLOv11x-pose court keypoints → homography to 94×50 → jersey OCR). Below = the CURRENT (2025-26)
public building blocks to feed it, all verified this session.

### Turnkey, current tutorials (VERIFIED — read these first; they ARE the pipeline)
- **Roboflow blog "Detect NBA 3-Second Violations with AI"** (Jul 2025) — player tracking + Meta
  **SAM2** + **court-keypoint detection** + **homography → top-down radar**. The exact detect→track→
  keypoint→project chain, current code.
- **Roboflow blog "How to Detect, Track, and Identify Basketball Players with CV"** (Sep 2025) —
  jersey-number ID via **SmolVLM2 fine-tuned on 3.6k jersey crops from the 2025 NBA Playoffs**, plus
  a ResNet-32 classifier alternative. A lighter, current substitute for nba2nba's Qwen3-VL OCR stage.
- **Roboflow blog "Sports Analytics AI pipeline"** (Jun 2026) — RF-DETR + Gemini + top-down homography,
  end-to-end Workflows template.

### Detection / keypoint datasets (VERIFIED, Roboflow Universe — reusable, need a free API key)
- `roboflow-jvuqo/basketball-player-detection-2` (v20 train / v19 test) — nba2nba's player detector set.
- `roboflow-jvuqo/basketball-court-detection-2` (v19) — court-keypoint set (homography source).
- `roboflow-universe-projects/basketball-players-fy4c2` — alt player-detection set (2025).
- Search Roboflow Universe: `class:basketball`, `basketball court keypoints`, `basketball players detection`.

### Academic tracking datasets / methods (VERIFIED — for labels, benchmarks, and SOTA trackers)
- **SportsMOT** — multi-object tracking incl. basketball (broadcast). Keyword: `SportsMOT`.
- **DeepSport / DeepSport-Basketball** (DeepSportRadar challenges) — basketball broadcast, with
  court calibration labels. Keywords: `DeepSportRadar`, `DeepSport basketball instance`.
- **TeamTrack** — soccer/basketball/handball, fisheye/drone. Keyword: `TeamTrack dataset`.
- **TrackID3x3** (arXiv 2503.18282, 2025) — 3x3 basketball MOT + ID + pose + on-court coords.
  Tangential (3x3, not 5-on-5) but labeled court-coordinate data + a tracker (`Basketball-SORT`).
- **SoccerNet-GSR (Game State Reconstruction)** — soccer, but THE reference for the full
  "broadcast → top-down player states" task; methods port directly. Keyword: `SoccerNet game state reconstruction`.
- Trackers to copy: `ByteTrack`, `Basketball-SORT` (Hu et al. 2024, basketball-specific occlusion), `BoT-SORT`, `Deep-EIoU`.

### Path B search strings
- arXiv / Scholar: `basketball player tracking broadcast`, `sports game state reconstruction`,
  `court homography keypoint detection basketball`, `multi-object tracking basketball occlusion`,
  `jersey number recognition broadcast`, `monocular player localization court`
- GitHub: `basketball tracking RF-DETR`, `basketball homography court`, `sports radar top-down`,
  `nba broadcast tracking`, `basketball ByteTrack`, `SoccerNet calibration` (port to basketball)
- Roboflow Universe: `basketball court`, `basketball players`, `basketball keypoints`
- Hugging Face: `basketball detection`, `jersey number`, `court keypoints`, `pose basketball`
- YouTube/data: `NBA full game broadcast` (your film input; yt-dlp), and note **broadcast (moving)
  cameras are harder than fixed/all-22** — expect homography jitter; SAM2 + keypoint smoothing helps.

---

## Honest framing
PATH A gets you real coordinates to BUILD and validate the spatial methods now (one full season, free).
PATH B is the only way to current-season spatial data and is a real CV project (GPU for fine-tunes;
Roboflow hosted-train avoids standing up a box for the two detectors). The 2025-era Roboflow basketball
tutorials mean the pipeline is now substantially pre-built vs the original nba2nba effort — start there,
reuse `court_keypoints_nba.py` as the homography target, and pipe output into `true_possession.py` /
`advantage_tagger.py` to fill the empty advantage-chain tables.
