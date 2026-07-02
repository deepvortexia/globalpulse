import bpy

scene = bpy.context.scene
try:
    scene.view_settings.view_transform = "Standard"
except Exception:
    pass

ng = bpy.data.node_groups.get("GlobyGlare")
if ng is None:
    ng = bpy.data.node_groups.new("GlobyGlare", "CompositorNodeTree")
ng.nodes.clear()
try:
    for item in list(ng.interface.items_tree):
        ng.interface.remove(item)
except Exception:
    pass
ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")

rl = ng.nodes.new("CompositorNodeRLayers")
glare = ng.nodes.new("CompositorNodeGlare")
notes = []
# 5.1: everything is an input socket; Type/Quality are menu sockets
for sock_name, candidates in (("Type", ("FOG_GLOW", "Fog Glow", "BLOOM", "Bloom")),
                              ("Quality", ("MEDIUM", "Medium"))):
    sock = glare.inputs.get(sock_name)
    if sock is None:
        notes.append(sock_name + ": missing")
        continue
    for v in candidates:
        try:
            sock.default_value = v
            notes.append("%s=%s" % (sock_name, v))
            break
        except Exception:
            continue
for sock_name, v in (("Threshold", 1.0), ("Strength", 0.5), ("Size", 0.4)):
    sock = glare.inputs.get(sock_name)
    if sock is not None:
        try:
            sock.default_value = v
            notes.append("%s=%s" % (sock_name, v))
        except Exception as e:
            notes.append("%s: %s" % (sock_name, e))
out = ng.nodes.new("NodeGroupOutput")
ng.links.new(rl.outputs["Image"], glare.inputs["Image"])
ng.links.new(glare.outputs["Image"], out.inputs[0])

scene.compositing_node_group = ng
scene.render.use_compositing = True
_result = "glare attached: " + ", ".join(notes)
