import bpy, math, random

random.seed(11)

for o in list(bpy.data.objects):
    if o.name.startswith("GlobyTrail"):
        bpy.data.objects.remove(o, do_unlink=True)

def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hexcol(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), 1.0)

def light_mat(name, hex_color, strength, alpha, emit_hex=None):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = hexcol(hex_color)
    bsdf.inputs["Emission Color"].default_value = hexcol(emit_hex or hex_color)
    bsdf.inputs["Emission Strength"].default_value = strength
    bsdf.inputs["Alpha"].default_value = alpha
    bsdf.inputs["Roughness"].default_value = 0.6
    for attr, val in (("blend_method", "BLEND"), ("surface_render_method", "BLENDED")):
        if hasattr(mat, attr):
            try:
                setattr(mat, attr, val)
            except Exception:
                pass
    return mat

MAT_NEAR = light_mat("GlobyTrailNearMat", "#EED27E", 2.4, 0.85, emit_hex="#E2BC55")
MAT_MID = light_mat("GlobyTrailMidMat", "#DDBA58", 1.8, 0.60, emit_hex="#CFA742")
MAT_FAR = light_mat("GlobyTrailFarMat", "#C9A84C", 1.4, 0.35, emit_hex="#BD9433")

# Master flow (y, z): tight crown rise, then one continuous sweep back and down
MASTER = [(0.12, 1.34), (0.26, 1.38), (0.46, 1.25), (0.68, 1.00),
          (0.87, 0.72), (1.00, 0.46)]

def strand_points(x0, length, seed_jitter):
    """Sample the master flow, scaled to `length` (0..1], with growing jitter."""
    n_pts = max(3, round(len(MASTER) * length))
    pts, radii = [], []
    for k in range(n_pts):
        t = k / (len(MASTER) - 1)
        y, z = MASTER[k]
        y = 0.06 + (y - 0.06) * 1.0
        jit = seed_jitter * t
        x = x0 * (1 + 0.4 * t) + random.uniform(-jit, jit)
        pts.append((x, y + random.uniform(-jit, jit) * 0.5,
                    z + random.uniform(-jit, jit) * 0.6))
        radii.append(max(0.12, 1.25 - 1.05 * t))
    return pts, radii

def build_curve(name, bevel):
    c = bpy.data.curves.new(name, "CURVE")
    c.dimensions = "3D"
    c.bevel_depth = bevel
    c.bevel_resolution = 1
    c.resolution_u = 6
    c.use_fill_caps = True
    return c

def add_strand(curve, x0, length, jitter):
    pts, radii = strand_points(x0, length, jitter)
    sp = curve.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for bp, p, r in zip(sp.bezier_points, pts, radii):
        bp.co = p
        bp.radius = r
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"

# 7 main ribbons: full or near-full length, rooted across the back of the skull
main = build_curve("GlobyTrailMainCurve", 0.011)
for i in range(7):
    x0 = (i - 3) * 0.014 + random.uniform(-0.004, 0.004)
    add_strand(main, x0, random.uniform(0.85, 1.0), 0.045)

# 8 wisps: thinner, shorter — density tapers along the flow
wisp = build_curve("GlobyTrailWispCurve", 0.005)
for i in range(8):
    x0 = (i - 3.5) * 0.013 + random.uniform(-0.005, 0.005)
    add_strand(wisp, x0, random.uniform(0.45, 0.8), 0.06)

def curve_to_obj(curve, obj_name):
    tmp = bpy.data.objects.new(obj_name + "Tmp", curve)
    bpy.context.scene.collection.objects.link(tmp)
    deps = bpy.context.evaluated_depsgraph_get()
    m = bpy.data.meshes.new_from_object(tmp.evaluated_get(deps))
    m.name = obj_name + "Mesh"
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.curves.remove(curve)
    m.polygons.foreach_set("use_smooth", [True] * len(m.polygons))
    m.update()
    o = bpy.data.objects.new(obj_name, m)
    bpy.context.scene.collection.objects.link(o)
    # brightness/alpha taper: assign material zone by distance along the flow
    for mat in (MAT_NEAR, MAT_MID, MAT_FAR):
        m.materials.append(mat)
    for poly in m.polygons:
        y = poly.center.y
        poly.material_index = 0 if y < 0.38 else (1 if y < 0.72 else 2)
    return o

t_main = curve_to_obj(main, "GlobyTrailMain")
t_wisp = curve_to_obj(wisp, "GlobyTrailWisp")

tris = 0
for o in (t_main, t_wisp):
    o.data.calc_loop_triangles()
    tris += len(o.data.loop_triangles)
_result = "trail built: 15 strands, %d tris" % tris
