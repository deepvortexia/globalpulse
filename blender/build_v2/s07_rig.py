import bpy, math

# ── clean previous rig ────────────────────────────────────────────────────────
old = bpy.data.objects.get("GlobyRig")
if old:
    bpy.data.objects.remove(old, do_unlink=True)
for a in list(bpy.data.actions):
    if a.name.startswith("GlobyIdle"):
        bpy.data.actions.remove(a)

arm_data = bpy.data.armatures.new("GlobyRig")
rig = bpy.data.objects.new("GlobyRig", arm_data)
bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")

BONES = {
    "root":   ((0, 0, 0.75), (0, 0, 0.90), None),
    "spine":  ((0, 0, 0.90), (0, 0, 1.16), "root"),
    "head":   ((0, 0, 1.16), (0, 0, 1.45), "spine"),
    "arm.L":  ((0.086, 0.0, 1.064), (0.132, -0.004, 0.712), "spine"),
    "arm.R":  ((-0.086, 0.0, 1.064), (-0.132, -0.004, 0.712), "spine"),
    "leg.L":  ((0.036, 0.006, 0.79), (0.054, -0.03, 0.02), "root"),
    "leg.R":  ((-0.036, 0.006, 0.79), (-0.054, -0.03, 0.02), "root"),
    "trail1": ((0, 0.10, 1.34), (0, 0.46, 1.25), "head"),
    "trail2": ((0, 0.46, 1.25), (0, 0.80, 0.80), "trail1"),
    "trail3": ((0, 0.80, 0.80), (0, 1.02, 0.45), "trail2"),
}
ebs = {}
for name, (h, t, parent) in BONES.items():
    eb = arm_data.edit_bones.new(name)
    eb.head, eb.tail = h, t
    if parent:
        eb.parent = ebs[parent]
        eb.use_connect = False
    ebs[name] = eb
bpy.ops.object.mode_set(mode="OBJECT")

def clamp01(v):
    return 0.0 if v < 0 else (1.0 if v > 1 else v)

def bind(obj_name, weight_fn):
    """weight_fn(x,y,z) -> {bone: weight}; adds armature mod + parents to rig."""
    o = bpy.data.objects.get(obj_name)
    if o is None:
        return 0
    groups = {}
    for i, v in enumerate(o.data.vertices):
        w = weight_fn(*v.co)
        total = sum(w.values()) or 1.0
        for bone, wt in w.items():
            if wt <= 0:
                continue
            if bone not in groups:
                groups[bone] = o.vertex_groups.new(name=bone)
            groups[bone].add([i], wt / total, "REPLACE")
    for m in list(o.modifiers):
        if m.type == "ARMATURE":
            o.modifiers.remove(m)
    mod = o.modifiers.new("Armature", "ARMATURE")
    mod.object = rig
    o.parent = rig
    return len(groups)

def rigid(bone):
    return lambda x, y, z: {bone: 1.0}

bind("GlobyTorso", rigid("spine"))
bind("GlobyHead", rigid("head"))
bind("GlobyEyes", rigid("head"))
bind("GlobyArmL", rigid("arm.L"))
bind("GlobyArmR", rigid("arm.R"))
bind("GlobyLegL", rigid("leg.L"))
bind("GlobyLegR", rigid("leg.R"))

def filament_w(x, y, z):
    # blend across regions so strands crossing boundaries deform smoothly
    if z >= 1.19:
        return {"head": 1.0}
    if z >= 1.13:
        t = (z - 1.13) / 0.06
        return {"head": t, "spine": 1 - t}
    ax = abs(x)
    if ax >= 0.085:
        return {"arm.L" if x > 0 else "arm.R": 1.0}
    if ax >= 0.065:
        t = (ax - 0.065) / 0.02
        side = "arm.L" if x > 0 else "arm.R"
        return {side: t, "spine": 1 - t}
    if z <= 0.74:
        return {"leg.L" if x > 0 else "leg.R": 1.0}
    if z <= 0.82:
        t = (0.82 - z) / 0.08
        side = "leg.L" if x > 0 else "leg.R"
        return {side: t, "spine": 1 - t}
    return {"spine": 1.0}

def trail_w(x, y, z):
    if y <= 0.35:
        return {"trail1": 1.0}
    if y <= 0.55:
        t = (y - 0.35) / 0.20
        return {"trail2": t, "trail1": 1 - t}
    if y <= 0.70:
        return {"trail2": 1.0}
    if y <= 0.90:
        t = (y - 0.70) / 0.20
        return {"trail3": t, "trail2": 1 - t}
    return {"trail3": 1.0}

bind("GlobyFilaments", filament_w)
bind("GlobyTrailMain", trail_w)
bind("GlobyTrailWisp", trail_w)

# ── idle: 4 poses over a 72-frame loop (frame 73 == frame 1) ─────────────────
pose = rig.pose.bones
for pb in pose:
    pb.rotation_mode = "XYZ"

D = math.radians

def key_loc(bone, frame, along):
    pb = pose[bone]
    pb.location = (0, along, 0)   # local Y = along bone = world Z for root
    pb.keyframe_insert("location", frame=frame)

def key_rot(bone, frame, x=0.0, y=0.0, z=0.0):
    pb = pose[bone]
    pb.rotation_euler = (x, y, z)
    pb.keyframe_insert("rotation_euler", frame=frame)

# root bob: ±5cm
for f, v in ((1, 0), (19, 0.05), (37, 0), (55, -0.05), (73, 0)):
    key_loc("root", f, v)
# spine breathes
for f, v in ((1, 0), (19, D(1.4)), (37, 0), (55, D(-1.4)), (73, 0)):
    key_rot("spine", f, x=v)
# head: loose counter-tilt, 90 deg phase offset
for f, xv, zv in ((1, D(2.2), D(1.4)), (19, 0, 0), (37, D(-2.2), D(-1.4)), (55, 0, 0), (73, D(2.2), D(1.4))):
    key_rot("head", f, x=xv, z=zv)
# arms: gentle opposite sway
for f, v in ((1, D(3.5)), (19, 0), (37, D(-3.5)), (55, 0), (73, D(3.5))):
    key_rot("arm.L", f, x=v, z=D(1.2))
    key_rot("arm.R", f, x=-v, z=D(-1.2))
# legs: tiny alternating drift
for f, v in ((1, D(1.5)), (19, 0), (37, D(-1.5)), (55, 0), (73, D(1.5))):
    key_rot("leg.L", f, x=v)
    key_rot("leg.R", f, x=-v)
# trail: comet lag, amplitude grows toward the tip, phase trails the bob
for f, v in ((1, 0), (19, D(-3)), (37, 0), (55, D(3)), (73, 0)):
    key_rot("trail1", f, x=v)
for f, v in ((1, D(3)), (19, 0), (37, D(-3)), (55, 0), (73, D(3))):
    key_rot("trail2", f, x=v)
for f, v in ((1, 0), (19, D(5)), (37, 0), (55, D(-5)), (73, 0)):
    key_rot("trail3", f, x=v)

action = rig.animation_data.action
action.name = "GlobyIdle"

_result = "rig done: %d bones, action=%s, bound objects parented" % (len(BONES), action.name)
