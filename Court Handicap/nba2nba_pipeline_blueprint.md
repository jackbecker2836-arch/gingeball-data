# Film-Tracking Blueprint — extracted from `rjunw/nba2nba`
_Source: https://github.com/rjunw/nba2nba — "E2E system for generating next best actions for given NBA scenarios (offense + defense)." Methods/code repo, no committed data. This is the reference pipeline for our eventual film → tracking-data → next-best-action phase (the "without the video" gap)._

## Why this matters to us
The **front half** of this pipeline outputs exactly what our engine is missing: per-frame top-down (x,y) coordinates for all 10 players + ball + refs, from raw broadcast film. That spatial stream is the input our `true_possession.py` + `advantage_tagger.py` need to populate the empty advantage-chain tables (`player_advantage_stats`, `true_possessions`, `advantage_events`) and to turn COV / PTV / RPV from proxy into real spatial metrics. The **back half** (coords → embeddings → retrieval → LLM next-best-action) is a parallel design to our sim/next-best-action vision.

## The pipeline (stage → model → config)

1. **Player / ref / ball detection** — `RF-DETR Medium` (resolution 640; DINOv2 ViT backbone, deformable attention, NMS-free).
   - Trained: 50 epochs, batch 16, grad_accum 1. Checkpoint `rf_detr_od/checkpoint_best_total.pth`.
   - Dataset: Roboflow `roboflow-jvuqo/basketball-player-detection-2` v20 (train) / v19 (test), COCO format.
   - Lib: `from rfdetr import RFDETRMedium`.
   - Note: filter bboxes to players only (drop non-player classes) before tracking.

2. **Multi-object tracking** — `ByteTrack` over RF-DETR detections (Kalman-filter motion model + IoU association; associates *every* detection incl. low-confidence to survive occlusion).
   - `BYTETracker(frame_rate=30)`; score threshold τ=0.6; keep match if IoU > 0.2 else send to lost; lost-track buffer ~30 frames before deletion; track rebirth required for identity preservation.
   - Lib: `from bytetrack.byte_tracker import BYTETracker`.

3. **Court keypoint detection** — `YOLOv11x-pose` (`yolo11x-pose.pt`).
   - Trained: 300 epochs, default config. Checkpoint `yolov11x_kpd/checkpoint_best_total.pt`.
   - Dataset: Roboflow `roboflow-jvuqo/basketball-court-detection-2` v19, YOLOv8/pose format.
   - Lib: `from ultralytics import YOLO; YOLO(ckpt, task='pose')`.

4. **Homography → tactical map** — learn homography from detected court keypoints to a standard **94×50** top-down court, then project every tracked player/ball/ref coordinate into top-down space.
   - Reusable template: `court_keypoints_nba.py` (saved alongside this doc) — the `Court` class defines 32 keypoints (corners, 3pt arc start/top/bottom, paint, FT line, basket center, halfcourt) on a 94×50 court + edge list. This is the homography destination geometry.

5. **Jersey number / team → player ID** — fine-tuned `Qwen3-VL-4B-Instruct` (QLoRA via TRL SFT + bitsandbytes + peft).
   - 3 epochs on ~5000-sample NFL jersey dataset (used as a data-rich proxy for NBA jerseys). Adapter `qwen3-vl-4b-instruct-trl-sft-jersey`.
   - (An earlier from-scratch CNN-Transformer CTC OCR was tried and abandoned — too init-sensitive/inaccurate.)
   - Per-tracklet: keep current team + jersey number; on track loss/reappear, refresh. For ambiguous IDs at analysis time, pass the tracklet image sequence to a VLM/LLM for best guess.

### Back half (designed, not yet built in the repo — our build opportunity)
6. **Scene-transition detection** to split distinct plays (re-run tracking per play if needed).
7. **Top-down sequence → vector embeddings** for vector retrieval (similar-scenario lookup).
8. **Embeddings time-series → human-readable actions → Gemini** to generate next-best-actions (offense + defense).
9. **Serving**: FastAPI endpoints + Streamlit UI (video player with boxes/tracks à la NBA2K, play-by-play).

## Reproduction notes / caveats
- **Public datasets are the key unlock** — both Roboflow datasets (`basketball-player-detection-2` v20, `basketball-court-detection-2` v19) are reusable directly; needs a Roboflow API key. The jersey VLM uses an NFL jersey dataset on HF as proxy.
- **Compute**: RF-DETR + YOLOv11x + Qwen3-VL QLoRA fine-tunes need a GPU; not runnable in our current sandbox. This is a "when we stand up a GPU box" plan.
- **We must supply film**: the pipeline consumes broadcast clips (the repo pulls via yt-dlp in notebooks). Tracking quality depends on camera angle; broadcast (non-fixed) cameras are harder than fixed/all-22.
- **Notebook-phase**: front half (detect→track→keypoints→homography→jersey) is implemented; back half (embeddings→retrieval→LLM action) is TODO in the repo.

## Concrete next steps when we hit the film phase
1. Pull both Roboflow datasets; reproduce RF-DETR (players) + YOLOv11x-pose (court) on a GPU box.
2. Wire ByteTrack (τ=0.6, IoU 0.2, 30-frame buffer) on the player detector.
3. Use `court_keypoints_nba.py` as the homography target; output per-frame top-down (x,y) for 10 players + ball.
4. Feed that stream into our `true_possession.py` / `advantage_tagger.py` → populate `player_advantage_stats` and upgrade COV/PTV/RPV with real spatial advantage data.
5. (Parallel track) build the back half — scenario embeddings + retrieval + LLM next-best-action — as its own product aligned with our sim engine.
