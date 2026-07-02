import bpy, math, os, sys, types, json, traceback

SCRATCH = r"C:\Users\Yan\AppData\Local\Temp\claude\C--Users-Yan\4be2464e-4e1f-40d6-8283-1e068249a04f\scratchpad"

# Replace default camera/light with a controlled capture stage
for name in ("Camera", "Light"):
    o = bpy.data.objects.get(name)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 640
scene.render.resolution_y = 880
scene.render.image_settings.file_format = "PNG"
scene.render.fps = 24
scene.frame_start = 1
scene.frame_end = 72

# Dark, near-black world so the emissive character reads like the sheet
world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = next((n for n in world.node_tree.nodes if n.type == "BACKGROUND"), None)
if bg:
    bg.inputs[0].default_value = (0.004, 0.004, 0.010, 1.0)

# Soft fill so non-emissive fallback still reads; emission carries the look
light_data = bpy.data.lights.new("StageFill", type="AREA")
light_data.energy = 60
light_data.size = 4
light = bpy.data.objects.new("StageFill", light_data)
light.location = (1.5, -2.5, 2.5)
scene.collection.objects.link(light)

# Camera target: mid-figure, slightly toward the trail so it stays in frame
target = bpy.data.objects.new("CamTarget", None)
target.location = (0.0, 0.12, 0.78)
scene.collection.objects.link(target)

# Character faces -Y. Front cam sits at -Y; 3/4 and side sweep around +X.
DIST = 3.1
HEIGHT = 0.95
CAMS = {
    "CamFront": (0.0, -DIST, HEIGHT),
    "Cam34":    (DIST * math.sin(math.radians(45)), -DIST * math.cos(math.radians(45)), HEIGHT),
    "CamSide":  (DIST, 0.0, HEIGHT),
}
for name, loc in CAMS.items():
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    cd = bpy.data.cameras.new(name)
    cd.lens = 60
    cam = bpy.data.objects.new(name, cd)
    cam.location = loc
    scene.collection.objects.link(cam)
    con = cam.constraints.new("TRACK_TO")
    con.target = target
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"

# Persistent helper module so later snippets can just: import globy_stage
mod = types.ModuleType("globy_stage")

def capture(prefix, frame=1):
    """Render the 3 fixed cameras to SCRATCH/<prefix>_<cam>.png + status json."""
    status = {"ok": True, "files": [], "errors": []}
    sc = bpy.context.scene
    sc.frame_set(frame)
    for cam_name in ("CamFront", "Cam34", "CamSide"):
        cam = bpy.data.objects.get(cam_name)
        if cam is None:
            status["errors"].append("missing " + cam_name)
            continue
        sc.camera = cam
        path = os.path.join(SCRATCH, "%s_%s.png" % (prefix, cam_name))
        sc.render.filepath = path
        try:
            bpy.ops.render.render(write_still=True)
            status["files"].append(path)
        except Exception:
            status["ok"] = False
            status["errors"].append(traceback.format_exc())
    with open(os.path.join(SCRATCH, prefix + "_status.json"), "w") as f:
        json.dump(status, f)
    return status

mod.capture = capture
mod.SCRATCH = SCRATCH
sys.modules["globy_stage"] = mod

_result = "Stage ready: cams=%s, world dark, 640x880, helper module installed" % (
    ", ".join(sorted(CAMS)))
