import bpy, bmesh, math, random

random.seed(7)

# ── clean previous filaments ──────────────────────────────────────────────────
for o in list(bpy.data.objects):
    if o.name.startswith("GlobyFilaments"):
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
    bsdf.inputs["Metallic"].default_value = 0.0
    for attr, val in (("blend_method", "BLEND"), ("surface_render_method", "BLENDED")):
        if hasattr(mat, attr):
            try:
                setattr(mat, attr, val)
            except Exception:
                pass
    mat.use_backface_culling = True
    return mat

# Vertical gold gradient, stepped per part: head brightest -> legs deepest
MAT_HEAD = light_mat("GlobyHeadMat", "#E8C96D", 1.55, 0.80, emit_hex="#D9B04A")
MAT_TORSO = light_mat("GlobyTorsoMat", "#DCBB5E", 1.35, 0.72, emit_hex="#C9A038")
MAT_ARMS = light_mat("GlobyArmsMat", "#D5B356", 1.25, 0.70, emit_hex="#C09630")
MAT_LEGS = light_mat("GlobyLegsMat", "#C9A84C", 1.15, 0.66, emit_hex="#B88E2C")
MAT_FILA = light_mat("GlobyFilamentMat", "#EFD07A", 2.6, 1.0, emit_hex="#E6BE55")
MAT_FILA.use_backface_culling = False
MAT_EYES = light_mat("GlobyEyesMat", "#FFF6DC", 14.0, 1.0)

def assign(obj_name, mat):
    o = bpy.data.objects.get(obj_name)
    if o:
        o.data.materials.clear()
        o.data.materials.append(mat)

assign("GlobyHead", MAT_HEAD)
assign("GlobyTorso", MAT_TORSO)
assign("GlobyArmL", MAT_ARMS)
assign("GlobyArmR", MAT_ARMS)
assign("GlobyLegL", MAT_LEGS)
assign("GlobyLegR", MAT_LEGS)
assign("GlobyEyes", MAT_EYES)

# ── internal light filaments ─────────────────────────────────────────────────
# torso rx by z (matches the build profile, scaled inward)
TORSO_RX = [(1.175, 0.024), (1.120, 0.028), (1.078, 0.086), (1.030, 0.092),
            (0.950, 0.070), (0.895, 0.052), (0.840, 0.068), (0.790, 0.078),
            (0.735, 0.060), (0.700, 0.036)]

def rx_at(z):
    for i in range(len(TORSO_RX) - 1):
        z0, r0 = TORSO_RX[i]
        z1, r1 = TORSO_RX[i + 1]
        if z1 <= z <= z0:
            t = (z0 - z) / (z0 - z1)
            return r0 * (1 - t) + r1 * t
    return TORSO_RX[-1][1]

curve = bpy.data.curves.new("GlobyFilamentsCurve", "CURVE")
curve.dimensions = "3D"
curve.bevel_depth = 0.003
curve.bevel_resolution = 2
curve.resolution_u = 8

def add_spline(pts):
    sp = curve.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = p
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"

# torso: 5 helical strands winding through the body volume, loosened by jitter
for i in range(5):
    a0 = i * 2 * math.pi / 5 + random.uniform(-0.3, 0.3)
    turns = random.uniform(0.7, 1.4) * 2 * math.pi
    pts = []
    N = 9
    for k in range(N):
        t = k / (N - 1)
        z = 1.13 - t * 0.41                      # 1.13 -> 0.72
        r = rx_at(z) * random.uniform(0.35, 0.65)
        a = a0 + turns * t
        pts.append((r * math.cos(a) + random.uniform(-0.008, 0.008),
                    r * 0.5 * math.sin(a) + random.uniform(-0.006, 0.006), z))
    add_spline(pts)

# head: 3 arcs hugging the back half of the skull (kept clear of the face)
for i, phi in enumerate((-0.5, 0.0, 0.5)):
    d = (math.sin(phi), math.cos(phi), 0.0)      # +Y = back of head
    r = 0.085 + 0.012 * i
    pts = []
    for k in range(6):
        psi = math.radians(-10 + 130 * k / 5)    # top -> back-low
        pts.append((d[0] * r * math.sin(psi) + random.uniform(-0.005, 0.005),
                    d[1] * r * math.sin(psi) + random.uniform(-0.005, 0.005),
                    1.30 + r * math.cos(psi)))
    add_spline(pts)

# limbs: one wavy strand down the core of each
LIMBS = [
    [(0.086, 0.0, 1.064), (0.113, 0.014, 0.920), (0.126, 0.008, 0.790), (0.132, -0.004, 0.712)],
    [(-0.086, 0.0, 1.064), (-0.113, 0.014, 0.920), (-0.126, 0.008, 0.790), (-0.132, -0.004, 0.712)],
    [(0.036, 0.006, 0.790), (0.046, 0.002, 0.600), (0.048, 0.0, 0.440),
     (0.050, 0.010, 0.300), (0.052, 0.016, 0.115), (0.054, -0.030, 0.020)],
    [(-0.036, 0.006, 0.790), (-0.046, 0.002, 0.600), (-0.048, 0.0, 0.440),
     (-0.050, 0.010, 0.300), (-0.052, 0.016, 0.115), (-0.054, -0.030, 0.020)],
]
for path in LIMBS:
    pts = [(x + random.uniform(-0.006, 0.006), y + random.uniform(-0.006, 0.006), z)
           for x, y, z in path]
    add_spline(pts)

fil_obj = bpy.data.objects.new("GlobyFilamentsTmp", curve)
bpy.context.scene.collection.objects.link(fil_obj)
deps = bpy.context.evaluated_depsgraph_get()
fil_mesh = bpy.data.meshes.new_from_object(fil_obj.evaluated_get(deps))
fil_mesh.name = "GlobyFilamentsMesh"
bpy.data.objects.remove(fil_obj, do_unlink=True)
bpy.data.curves.remove(curve)
fil_mesh.polygons.foreach_set("use_smooth", [True] * len(fil_mesh.polygons))
fil_mesh.update()
filaments = bpy.data.objects.new("GlobyFilaments", fil_mesh)
bpy.context.scene.collection.objects.link(filaments)
fil_mesh.materials.append(MAT_FILA)

fil_mesh.calc_loop_triangles()
_result = "materials + %d filament tris + glare comp done" % len(fil_mesh.loop_triangles)
