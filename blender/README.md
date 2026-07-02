# Globy — Blender source

Source files for the 3D Globy mascot shown on the `/[lang]/2026` year-in-review
page (`public/models/globy.glb`, loaded by `src/app/[lang]/2026/GlobyModel.tsx`).

- `build_v2/` — the generator scripts (v2, current): run in order against a live
  Blender session, they build the whole model procedurally and export the GLB.
  - `s02_stage.py` — capture stage: 3 fixed cameras, dark world, render settings
  - `s03_base_mesh.py` — body: lathed-profile torso + skin-modifier limbs, head, eyes
  - `s05_materials.py` — emissive gold gradient, translucency, internal filaments
  - `s05b_glare.py` — fog-glow compositor (render previews only, not exported)
  - `s06_trail.py` / `s06b_cams.py` — head-originating trail; widened camera framing
  - `s07_rig.py` — 10-bone armature, region-blended weights, 72-frame `GlobyIdle`
  - `s09_export.py` — saves `globy.blend`, exports the GLB (Globy objects only)
- `globy.blend` — the saved v2 scene, for interactive editing.
  Visual reference: `public/globy-turnaround.png`.

## Regenerating the GLB

The scripts were written for the "Claude Bridge" addon (raw Python over TCP
:5000 into a live Blender), but each one is plain `bpy` code: to rerun without
the bridge, open Blender, then execute them in the Scripting workspace in
numeric order (skip `s05b`/`s06b` if you only need the asset, they only affect
preview renders). Paths inside are absolute; adjust if the repo moves.

Built with Blender 5.1 (note: 5.x compositor API — `scene.compositing_node_group`,
socket-driven Glare node).

## Editing the .blend by hand instead

Open `globy.blend`, edit, then export via File → Export → glTF 2.0 (.glb) to
`public/models/globy.glb` with animations enabled, selection = the `Globy*`
objects + `GlobyRig` only (leave out cameras/light). Keep it light: the web
budget is well under 2 MB (currently ~794 KB, ~27k tris) and the idle clip must
stay a single action named `GlobyIdle` (the React component plays it by name).

## History

v1 (`globy_build.py`, deleted) built a blob-style Globy headless from the CLI;
v2 replaced it 2026-07-02 with the fine silhouette, internal gold filaments and
head-originating trail, built checkpoint-by-checkpoint against the turnaround
sheet through the live bridge.
