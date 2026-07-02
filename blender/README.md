# Globy — Blender source

Source files for the 3D Globy mascot shown on the `/[lang]/2026` year-in-review
page (`public/models/globy.glb`, loaded by `src/app/[lang]/2026/GlobyModel.tsx`).

- `globy_build.py` — generator script: builds the whole model procedurally
  (meshes, emissive gold materials, shard trail, `GlobyRig` armature, the 3s
  `GlobyIdle` loop), renders preview stills, exports the GLB to
  `public/models/globy.glb`, and validates it by reimporting.
- `globy.blend` — the scene the script produced, for interactive editing.
  Visual reference: `public/globy-turnaround.png`.

## Regenerating the GLB

The script is the source of truth — tweak proportions/materials/animation in it,
then rerun (paths inside it are absolute; adjust `REPO`/`SCRATCH` at the top if
the repo lives elsewhere):

```
"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --factory-startup --python blender\globy_build.py
```

Built with Blender 5.1. Note: the script overwrites `public/models/globy.glb`
and writes `globy.blend` + preview PNGs next to itself.

## Editing the .blend by hand instead

Open `globy.blend`, edit, then export via File → Export → glTF 2.0 (.glb) to
`public/models/globy.glb` with animations enabled. Keep it light: the web
budget is well under 2 MB (currently ~121 KB, ~2k tris) and the idle clip must
stay a single action named `GlobyIdle` (the React component plays it by name).
Hand edits are lost the next time the script runs.
