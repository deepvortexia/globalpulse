import bpy, os

GLB_PATH = r"C:\Users\Yan\globalpulse\public\models\globy.glb"
BLEND_PATH = r"C:\Users\Yan\globalpulse\blender\globy.blend"

scene = bpy.context.scene
scene.frame_set(1)

# Save working file into the repo's blender/ sources
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)

EXPORT = ["GlobyRig", "GlobyTorso", "GlobyHead", "GlobyEyes", "GlobyArmL", "GlobyArmR",
          "GlobyLegL", "GlobyLegR", "GlobyFilaments", "GlobyTrailMain", "GlobyTrailWisp"]
for o in bpy.data.objects:
    o.select_set(o.name in EXPORT)
bpy.context.view_layer.objects.active = bpy.data.objects["GlobyRig"]

bpy.ops.export_scene.gltf(filepath=GLB_PATH, export_format="GLB", use_selection=True)
size = os.path.getsize(GLB_PATH)
_result = "exported %s (%.0f KB); blend saved to %s" % (GLB_PATH, size / 1024, BLEND_PATH)
