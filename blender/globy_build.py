"""Build the Globy mascot: low-poly light-spirit, emissive gold, shard trail,
simple armature with a 3s idle loop. Exports GLB for web (Three.js) use.

Run:  blender --background --factory-startup --python globy_build.py
Ref:  public/globy-turnaround.png (child proportions, big head, slim limbs,
      lower body dissolving into a comet trail sweeping back = +Y here;
      character faces -Y so it faces +Z after glTF's Y-up conversion).
"""
import bpy
import math
import os
import random
import sys

SCRATCH = os.path.dirname(os.path.abspath(__file__))
REPO = "C:/Users/Yan/globalpulse"
GLB_PATH = os.path.join(REPO, "public", "models", "globy.glb")
random.seed(2026)

# ── helpers ───────────────────────────────────────────────────────────────────


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hexcol(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) / 255.0 for i in (0, 2, 4))
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), 1.0)


def set_input(node, names, value):
    """Set a node input by any of several historical socket names."""
    for n in names:
        if n in node.inputs:
            node.inputs[n].default_value = value
            return True
    print(f"WARN: none of {names} found on {node.name}")
    return False


def make_mat(name, hex_color, emit_strength, alpha, emit_hex=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    col = hexcol(hex_color)
    set_input(bsdf, ["Base Color"], col)
    # Emission a notch deeper/more saturated than base so high strength
    # doesn't wash the gold out to cream.
    set_input(bsdf, ["Emission Color", "Emission"], hexcol(emit_hex) if emit_hex else col)
    set_input(bsdf, ["Emission Strength"], emit_strength)
    set_input(bsdf, ["Alpha"], alpha)
    set_input(bsdf, ["Roughness"], 0.5)
    set_input(bsdf, ["Metallic"], 0.0)
    # Alpha blending — property names differ across Blender generations.
    for attr, val in (("blend_method", "BLEND"), ("surface_render_method", "BLENDED")):
        if hasattr(mat, attr):
            try:
                setattr(mat, attr, val)
            except Exception as e:
                print(f"WARN: {attr}: {e}")
    mat.use_backface_culling = True
    return mat


def sphere(name, loc, radius, scale=(1, 1, 1), seg=12, rings=8, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=seg, ring_count=rings, radius=radius, location=loc
    )
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    o.rotation_euler = rot
    return o


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    return o


# ── clean scene ───────────────────────────────────────────────────────────────
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()

scene = bpy.context.scene
scene.render.fps = 24
scene.frame_start = 1
scene.frame_end = 72  # 3s loop; frame 73 == frame 1

# ── materials (gradient impression: brightest at head, deepest in the trail) ──
MAT_HEAD = make_mat("GlobyHead", "#E8C96D", 1.7, 0.92, emit_hex="#DFB44A")
MAT_BODY = make_mat("GlobyBody", "#DCBB5E", 1.45, 0.85, emit_hex="#D0A544")
MAT_TRAIL_A = make_mat("GlobyTrailNear", "#C9A84C", 1.3, 0.72, emit_hex="#C29B3E")
MAT_TRAIL_B = make_mat("GlobyTrailFar", "#C9A84C", 1.0, 0.45, emit_hex="#C29B3E")
MAT_EYES = make_mat("GlobyEyes", "#FFF4D6", 8.0, 1.0)

# ── meshes (Z up while modeling; faces -Y) ────────────────────────────────────
# Head: oversized, round (childlike ~1/5 of height).
head_parts = [sphere("head", (0, 0, 1.32), 0.155, scale=(1, 0.97, 1.04), seg=16, rings=12)]
head_parts.append(sphere("neck", (0, 0, 1.185), 0.05, scale=(0.9, 0.9, 1.3)))
head = join(head_parts, "GlobyHead")
assign(head, MAT_HEAD)

# Eyes: the only facial detail — two glowing points.
eyes = join(
    [
        sphere("eye.L", (0.052, -0.132, 1.335), 0.02, scale=(1, 0.6, 1.15), seg=8, rings=6),
        sphere("eye.R", (-0.052, -0.132, 1.335), 0.02, scale=(1, 0.6, 1.15), seg=8, rings=6),
    ],
    "GlobyEyes",
)
assign(eyes, MAT_EYES)

# Torso: slim chest + narrower hips, overlapping ellipsoids read as one form.
torso = join(
    [
        sphere("chest", (0, 0, 1.03), 0.115, scale=(1, 0.68, 1.5)),
        sphere("hips", (0, 0.005, 0.82), 0.088, scale=(1, 0.75, 1.5)),
    ],
    "GlobyTorso",
)
assign(torso, MAT_BODY)

# Arms: slim elongated ellipsoids tucked into the shoulders (tops overlap the
# chest so they read attached), slight outward angle, tiny hands.
arm_l = join(
    [
        sphere("armL", (0.122, 0, 1.0), 0.028, scale=(1, 1, 5.8), rot=(0, math.radians(6), 0), seg=10, rings=8),
        sphere("handL", (0.145, 0, 0.815), 0.03, scale=(1, 0.8, 1.25), seg=8, rings=6),
    ],
    "GlobyArmL",
)
assign(arm_l, MAT_BODY)
arm_r = join(
    [
        sphere("armR", (-0.122, 0, 1.0), 0.028, scale=(1, 1, 5.8), rot=(0, math.radians(-6), 0), seg=10, rings=8),
        sphere("handR", (-0.145, 0, 0.815), 0.03, scale=(1, 0.8, 1.25), seg=8, rings=6),
    ],
    "GlobyArmR",
)
assign(arm_r, MAT_BODY)

# Dissolving lower body: two fading leg stubs + a comet trail of shards
# sweeping back (+Y) and down, density and size tapering off.
near_parts = [
    sphere("legL", (0.048, 0.02, 0.62), 0.042, scale=(1, 1, 3.4), rot=(math.radians(8), 0, 0)),
    sphere("legR", (-0.048, 0.02, 0.62), 0.042, scale=(1, 1, 3.4), rot=(math.radians(-4), 0, 0)),
]
far_parts = []
N_SHARDS = 64
for i in range(N_SHARDS):
    t = (i / (N_SHARDS - 1)) ** 1.25  # bias density toward the hips
    z = 0.74 - t * 0.68 + random.uniform(-0.03, 0.03)
    y = (t**1.6) * 0.5 + random.uniform(-0.02, 0.05)
    spread = 0.055 + 0.05 * math.sin(t * math.pi)
    x = random.gauss(0, spread)
    size = (0.012 + 0.024 * (1 - t)) * random.uniform(0.6, 1.3)
    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=size, depth=size * 2.2, location=(x, y, z))
    shard = bpy.context.active_object
    shard.rotation_euler = (
        random.uniform(0, math.pi),
        random.uniform(0, math.pi),
        random.uniform(0, math.pi),
    )
    (near_parts if t < 0.45 else far_parts).append(shard)

trail_near = join(near_parts, "GlobyTrailNear")
assign(trail_near, MAT_TRAIL_A)
trail_far = join(far_parts, "GlobyTrailFar")
assign(trail_far, MAT_TRAIL_B)

MESHES = [head, eyes, torso, arm_l, arm_r, trail_near, trail_far]

# Smooth shading (shards keep readable facets at these poly counts anyway).
bpy.ops.object.select_all(action="DESELECT")
for o in MESHES:
    o.select_set(True)
bpy.context.view_layer.objects.active = head
bpy.ops.object.shade_smooth()
# Bake object transforms into vertices so skinning math is in armature space.
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# ── armature ──────────────────────────────────────────────────────────────────
arm_data = bpy.data.armatures.new("GlobyRig")
rig = bpy.data.objects.new("GlobyRig", arm_data)
bpy.context.collection.objects.link(rig)
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")

BONES = {
    #  name        head              tail              parent
    "root":   ((0, 0, 0.82),  (0, 0, 0.95),  None),
    "spine":  ((0, 0, 0.95),  (0, 0, 1.2),   "root"),
    "head":   ((0, 0, 1.2),   (0, 0, 1.5),   "spine"),
    "arm.L":  ((0.115, 0, 1.12), (0.15, 0, 0.8), "spine"),
    "arm.R":  ((-0.115, 0, 1.12), (-0.15, 0, 0.8), "spine"),
    "trail1": ((0, 0, 0.82),  (0, 0.12, 0.45), "root"),
    "trail2": ((0, 0.12, 0.45), (0, 0.5, 0.05), "trail1"),
}
ebs = {}
for name, (h, t, parent) in BONES.items():
    eb = arm_data.edit_bones.new(name)
    eb.head, eb.tail = h, t
    if parent:
        eb.parent = ebs[parent]
    ebs[name] = eb
bpy.ops.object.mode_set(mode="OBJECT")

SKIN = {
    "GlobyHead": "head",
    "GlobyEyes": "head",
    "GlobyTorso": "spine",
    "GlobyArmL": "arm.L",
    "GlobyArmR": "arm.R",
    "GlobyTrailNear": "trail1",
    "GlobyTrailFar": "trail2",
}
for obj in MESHES:
    bone = SKIN[obj.name]
    vg = obj.vertex_groups.new(name=bone)
    vg.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = rig
    obj.parent = rig

# ── idle animation: bob + arm sway + head tilt + trailing lag, 72f loop ───────
pose = rig.pose.bones
for pb in pose:
    pb.rotation_mode = "XYZ"

D = math.radians


def key_loc(bone, frame, y):
    pb = pose[bone]
    pb.location = (0, y, 0)  # bone-local Y = along the bone = world Z for root
    pb.keyframe_insert("location", frame=frame)


def key_rot(bone, frame, x=0.0, y=0.0, z=0.0):
    pb = pose[bone]
    pb.rotation_euler = (x, y, z)
    pb.keyframe_insert("rotation_euler", frame=frame)


# Vertical bob (root): full sine over 72 frames, ±6cm.
for f, v in ((1, 0), (19, 0.06), (37, 0), (55, -0.06), (73, 0)):
    key_loc("root", f, v)
# Spine: breathes with the bob, ±1.2° pitch.
for f, v in ((1, 0), (19, D(1.2)), (37, 0), (55, D(-1.2)), (73, 0)):
    key_rot("spine", f, x=v)
# Head: gentle tilt, 90° phase offset from the bob so it feels loose.
for f, x, z in ((1, D(2.2), D(1.5)), (19, 0, 0), (37, D(-2.2), D(-1.5)), (55, 0, 0), (73, D(2.2), D(1.5))):
    key_rot("head", f, x=x, z=z)
# Arms: opposite subtle sway.
for f, v in ((1, D(4)), (19, 0), (37, D(-4)), (55, 0), (73, D(4))):
    key_rot("arm.L", f, x=v, z=D(1.5))
    key_rot("arm.R", f, x=-v, z=D(-1.5))
# Trail: lags the bob like a comet tail, larger at the tip.
for f, v in ((1, 0), (19, D(-3)), (37, 0), (55, D(3)), (73, 0)):
    key_rot("trail1", f, x=v)
for f, v in ((1, D(4)), (19, 0), (37, D(-4)), (55, 0), (73, D(4))):
    key_rot("trail2", f, x=v)

action = rig.animation_data.action
action.name = "GlobyIdle"

# ── stats ─────────────────────────────────────────────────────────────────────
total_tris = 0
for o in MESHES:
    o.data.calc_loop_triangles()
    total_tris += len(o.data.loop_triangles)
print(f"STATS: meshes={len(MESHES)} tris={total_tris} action={action.name} "
      f"frames={scene.frame_start}-{scene.frame_end}")

# ── save .blend ───────────────────────────────────────────────────────────────
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SCRATCH, "globy.blend"))

# ── preview renders ───────────────────────────────────────────────────────────
world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = next((n for n in world.node_tree.nodes if n.type == "BACKGROUND"), None)
if bg:
    bg.inputs[0].default_value = (0.005, 0.005, 0.012, 1.0)

bpy.ops.object.light_add(type="AREA", location=(2, -2.5, 2.5))
light = bpy.context.active_object
light.data.energy = 120
light.data.size = 3

target = bpy.data.objects.new("CamTarget", None)
target.location = (0, 0.1, 0.85)
bpy.context.collection.objects.link(target)
cam_data = bpy.data.cameras.new("Cam")
cam = bpy.data.objects.new("Cam", cam_data)
bpy.context.collection.objects.link(cam)
scene.camera = cam
con = cam.constraints.new("TRACK_TO")
con.target = target
con.track_axis = "TRACK_NEGATIVE_Z"
con.up_axis = "UP_Y"

for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "CYCLES"):
    try:
        scene.render.engine = eng
        break
    except Exception:
        continue
print(f"RENDER ENGINE: {scene.render.engine}")
if scene.render.engine == "CYCLES":
    scene.cycles.samples = 24
scene.render.resolution_x = 700
scene.render.resolution_y = 900
scene.render.image_settings.file_format = "PNG"

SHOTS = [
    ("front_f1", (0, -3.2, 1.0), 1),
    ("threequarter_f1", (2.1, -2.4, 1.15), 1),
    ("side_f37", (3.1, 0.3, 0.95), 37),
]
for shot_name, loc, frame in SHOTS:
    cam.location = loc
    scene.frame_set(frame)
    scene.render.filepath = os.path.join(SCRATCH, f"globy_{shot_name}.png")
    try:
        bpy.ops.render.render(write_still=True)
        print(f"RENDERED: {shot_name}")
    except Exception as e:
        print(f"RENDER FAILED ({shot_name}): {e}")

# ── export GLB ────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)
# Renders' camera/light/target must not ship in the GLB.
bpy.ops.object.select_all(action="DESELECT")
for o in MESHES + [rig]:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=GLB_PATH, export_format="GLB", use_selection=True)
size = os.path.getsize(GLB_PATH)
print(f"EXPORTED: {GLB_PATH} ({size/1024:.0f} KB)")

# ── validate round-trip: reimport the GLB into an empty scene ─────────────────
bpy.ops.wm.read_homefile(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB_PATH)
anims = [(a.name, a.frame_range[:]) for a in bpy.data.actions]
objs = [(o.name, o.type) for o in bpy.data.objects]
tris = 0
for o in bpy.data.objects:
    if o.type == "MESH":
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
print(f"REIMPORT: objects={objs}")
print(f"REIMPORT: actions={anims} tris={tris}")
print("DONE")
sys.stdout.flush()
