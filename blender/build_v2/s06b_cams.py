import bpy, math

# Widen the fixed capture framing once so the full trail fits (same for all 3 cams)
target = bpy.data.objects["CamTarget"]
target.location = (0.0, 0.22, 0.78)
DIST = 3.6
HEIGHT = 0.95
for name, loc in {
    "CamFront": (0.0, -DIST, HEIGHT),
    "Cam34": (DIST * math.sin(math.radians(45)), -DIST * math.cos(math.radians(45)), HEIGHT),
    "CamSide": (DIST, 0.0, HEIGHT),
}.items():
    bpy.data.objects[name].location = loc
_result = "cams widened: dist 3.6, target y 0.22"
