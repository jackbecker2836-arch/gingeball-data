# GPU + RF-DETR — Decisions & Next Steps (Film Phase)
_Parked until we reach the film-tracking phase. Companion to `nba2nba_pipeline_blueprint.md`._

## Headline insight (matters for a non-developer)
**We may not need our own GPU box for the two detection models at all.** Roboflow offers **hosted "Custom Train"** — version a dataset, click Custom Train, pick RF-DETR size, it trains in their cloud and can be deployed in cloud or on your own hardware. That removes the hardest part (standing up + configuring a GPU).

Realistic staged path:
1. **Detectors (player + court keypoints): hosted-train on Roboflow.** No GPU box needed.
2. **Jersey OCR (Qwen3-VL-4B QLoRA): defer.** It's the only stage that truly wants a rented GPU. v1 can assign players by tracking continuity / manual tag and add jersey-OCR later — or use a hosted VLM API for jersey reading instead of fine-tuning.

## RF-DETR — confirmed facts (current as of June 2026)
- **Medium is the right size.** Base variant deprecated as of July 2025; Medium replaced it (substantially better accuracy at comparable latency). nba2nba's Medium choice holds.
- Param counts: Nano 30.5M, Small 32.1M, Medium 33.7M (all NAS-discovered), Large 129M, plus XL/2XL.
- **VRAM:** ≥8GB minimum to fine-tune (RTX 3060 / T4 / A10); Nano/Small fit 6GB with reduced batch; **16GB recommended for comfortable training.**
- **License clean:** Nano–Large + all code are Apache 2.0. Only XL/2XL need `rfdetr[plus]` (PML 1.0). Medium = Apache, fine for us.
- Install: `pip install rfdetr`, Python ≥3.10.
- **New — RF-DETR keypoint detection (preview).** Could eventually replace nba2nba's *separate* YOLOv11x-pose court-keypoint model and unify the stack into one model. Preview only right now — watch it.

## GPU sizing (if we do rent instead of hosted)
- **One 24GB card** (RTX 4090 / L4 / A10G class) covers the whole pipeline including the heaviest stage (Qwen3-VL-4B QLoRA).
- **16GB** covers the two detectors alone (RF-DETR Medium + YOLOv11x-pose).
- Providers to price: RunPod, Vast.ai, Lambda (rentals); Colab/Kaggle (small/free-tier runs).

## What I (Claude) can do for the GPU workstream
Everything except executing CUDA in the sandbox:
- Pick provider + size the GPU
- Write the training scripts/configs (RF-DETR fine-tune, YOLOv11x-pose, ByteTrack wiring, Qwen3-VL QLoRA)
- Prep/wrangle the datasets in-sandbox
- Estimate cost
- Debug from logs you paste back

## Open items to look up when we start
1. Roboflow Custom Train **pricing**, and whether you can **download the trained weights** (needed to run inference on your own machine vs. being locked to their hosted API).
2. **Current dataset versions** — nba2nba used `basketball-player-detection-2` v20 and `basketball-court-detection-2` v19; check for newer versions + confirm still public + license terms.
3. **Actual VRAM** the Medium @ res-640, batch-16 config consumes → decides 16GB vs 24GB rental.
4. **Current GPU rental $/hr** for the chosen tier (moves weekly — search fresh at commit time).
