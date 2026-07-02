import bpy, bmesh, math

PARTS = ("GlobyTorso", "GlobyArmL", "GlobyArmR", "GlobyLegL", "GlobyLegR",
         "GlobyHead", "GlobyEyes", "GlobyBody")
for name in PARTS:
    o = bpy.data.objects.get(name)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)

def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hexcol(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), 1.0)

def make_mat(name, hex_color, strength, alpha=1.0, emit_hex=None):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = hexcol(hex_color)
    bsdf.inputs["Emission Color"].default_value = hexcol(emit_hex or hex_color)
    bsdf.inputs["Emission Strength"].default_value = strength
    bsdf.inputs["Alpha"].default_value = alpha
    bsdf.inputs["Roughness"].default_value = 0.5
    return mat

MAT_BODY = make_mat("GlobyBodyMat", "#DCBB5E", 1.5)
MAT_EYES = make_mat("GlobyEyesMat", "#FFF4D6", 8.0)

scene_coll = bpy.context.scene.collection

def link(o):
    scene_coll.objects.link(o)
    return o

def smooth(mesh):
    mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))
    mesh.update()

def bake_modifiers(obj):
    deps = bpy.context.evaluated_depsgraph_get()
    baked = bpy.data.meshes.new_from_object(obj.evaluated_get(deps))
    obj.modifiers.clear()
    old = obj.data
    baked.name = old.name
    obj.data = baked
    bpy.data.meshes.remove(old)
    smooth(baked)
    return baked

# ── torso: lathed profile — exact silhouette control, no subsurf ─────────────
# (z, center_y, rx, ry) control rows, top to bottom
PROFILE = [
    (1.175, 0.000, 0.024, 0.024),   # neck top (hidden inside head)
    (1.120, 0.000, 0.028, 0.028),   # neck
    (1.078, -0.002, 0.086, 0.048),  # shoulder shelf
    (1.030, -0.004, 0.092, 0.056),  # chest
    (0.950, -0.002, 0.070, 0.048),
    (0.895, 0.002, 0.052, 0.040),   # waist
    (0.840, 0.006, 0.068, 0.050),   # hip flare
    (0.790, 0.008, 0.078, 0.056),   # hips widest
    (0.735, 0.006, 0.060, 0.047),
    (0.700, 0.004, 0.036, 0.032),   # crotch taper
]

def resample_profile(rows, n):
    zs = [r[0] for r in rows]
    out = []
    for i in range(n):
        z = zs[0] + (zs[-1] - zs[0]) * i / (n - 1)
        j = 0
        while j < len(rows) - 2 and z <= zs[j + 1]:
            j += 1
        z0, z1 = zs[j], zs[j + 1]
        t = (z - z0) / (z1 - z0) if z1 != z0 else 0.0
        t = t * t * (3 - 2 * t)  # smoothstep between control rows
        out.append(tuple(rows[j][k] * (1 - t) + rows[j + 1][k] * t for k in range(4)))
    # two light smoothing passes on radii to kill crease rings
    for _ in range(2):
        sm = list(out)
        for i in range(1, len(out) - 1):
            sm[i] = (out[i][0], out[i][1],
                     0.25 * out[i - 1][2] + 0.5 * out[i][2] + 0.25 * out[i + 1][2],
                     0.25 * out[i - 1][3] + 0.5 * out[i][3] + 0.25 * out[i + 1][3])
        out = sm
    return out

ROWS = resample_profile(PROFILE, 28)
SEG = 32
bm = bmesh.new()
rings = []
for z, cy, rx, ry in ROWS:
    ring = []
    for k in range(SEG):
        a = 2 * math.pi * k / SEG
        ring.append(bm.verts.new((rx * math.cos(a), cy + ry * math.sin(a), z)))
    rings.append(ring)
for i in range(len(rings) - 1):
    a, b = rings[i], rings[i + 1]
    for k in range(SEG):
        bm.faces.new((a[k], a[(k + 1) % SEG], b[(k + 1) % SEG], b[k]))
top = bm.verts.new((0, ROWS[0][1], ROWS[0][0] + ROWS[0][2]))
bot = bm.verts.new((0, ROWS[-1][1], ROWS[-1][0] - ROWS[-1][3]))
for k in range(SEG):
    bm.faces.new((rings[0][(k + 1) % SEG], rings[0][k], top))
    bm.faces.new((rings[-1][k], rings[-1][(k + 1) % SEG], bot))
tm = bpy.data.meshes.new("GlobyTorsoMesh")
bm.to_mesh(tm)
bm.free()
smooth(tm)
torso = link(bpy.data.objects.new("GlobyTorso", tm))
torso.data.materials.append(MAT_BODY)

# ── limbs: skin-modifier chains (linear, so no branch collapse) ──────────────
def skin_chain(obj_name, points):
    m = bpy.data.meshes.new(obj_name + "Mesh")
    m.from_pydata([p for p, _ in points], [(i, i + 1) for i in range(len(points) - 1)], [])
    o = link(bpy.data.objects.new(obj_name, m))
    sk = o.modifiers.new("Skin", "SKIN")
    sk.use_smooth_shade = True
    sb = o.modifiers.new("Subd", "SUBSURF")
    sb.levels = 2
    for i, (_, r) in enumerate(points):
        sv = m.skin_vertices[0].data[i]
        sv.radius = (r, r)
        try:
            sv.use_root = (i == 0)
        except Exception:
            pass
    bake_modifiers(o)
    o.data.materials.append(MAT_BODY)
    return o

for sx, suffix in ((1, "L"), (-1, "R")):
    skin_chain("GlobyArm" + suffix, [
        ((sx * 0.086, 0.000, 1.064), 0.026),
        ((sx * 0.113, 0.014, 0.920), 0.019),
        ((sx * 0.126, 0.008, 0.790), 0.014),
        ((sx * 0.132, -0.004, 0.710), 0.018),
    ])
    skin_chain("GlobyLeg" + suffix, [
        ((sx * 0.036, 0.006, 0.790), 0.040),
        ((sx * 0.046, 0.002, 0.600), 0.037),
        ((sx * 0.048, 0.000, 0.440), 0.028),
        ((sx * 0.050, 0.010, 0.300), 0.024),
        ((sx * 0.052, 0.016, 0.115), 0.016),
        ((sx * 0.054, -0.030, 0.020), 0.008),
    ])

# ── head + eyes ───────────────────────────────────────────────────────────────
def add_sphere_obj(name, radius, loc, scale, mat, useg=24, vseg=16):
    m = bpy.data.meshes.new(name + "Mesh")
    b = bmesh.new()
    bmesh.ops.create_uvsphere(b, u_segments=useg, v_segments=vseg, radius=radius)
    b.to_mesh(m)
    b.free()
    smooth(m)
    o = link(bpy.data.objects.new(name, m))
    o.location = loc
    o.scale = scale
    m.materials.append(mat)
    return o

add_sphere_obj("GlobyHead", 0.138, (0, 0, 1.300), (1.0, 0.96, 1.06), MAT_BODY)

em = bpy.data.meshes.new("GlobyEyesMesh")
bm = bmesh.new()
for sx in (1, -1):
    ret = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.021)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(1.0, 0.55, 1.15))
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(sx * 0.052, -0.118, 1.320))
bm.to_mesh(em)
bm.free()
smooth(em)
eyes = link(bpy.data.objects.new("GlobyEyes", em))
em.materials.append(MAT_EYES)

tris = 0
for n in ("GlobyTorso", "GlobyArmL", "GlobyArmR", "GlobyLegL", "GlobyLegR", "GlobyHead", "GlobyEyes"):
    d = bpy.data.objects[n].data
    d.calc_loop_triangles()
    tris += len(d.loop_triangles)
_result = "v3 built: 7 parts, %d tris total" % tris
