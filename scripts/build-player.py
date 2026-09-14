"""Build the player's editable memory body from Hina's resident proportions.
Run Blender --background --python scripts/build-player.py.
Only player.blend and player.glb are written; resident sources are untouched.
"""
from pathlib import Path
helpers=(Path(__file__).parent/'build-residents.py').read_text().split("for id in ['ren','tomo','shell']:")[0]
exec(compile(helpers,'resident constructors','exec'))
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/characters/mia.blend'))
bpy.context.preferences.filepaths.save_version=0
root=bpy.data.objects['Mia'];root.name='Player'
for prefix in ['Scarf','Badge']:remove_prefix(prefix)
recolor('Peach ceramic','DDDCCD');recolor('Warm enamel','ECDFC3')
recolor('Blue grey boots','739891');recolor('Woven terracotta','86A69A')
cream=bpy.data.materials['Warm enamel'];trim=bpy.data.materials['Soft graphite trim']
sage=mat('Soft sage memory casing','85A798',.46)
gold=mat('Memory contacts brass','D6B783',.37)
blue=mat('Central memory blue','8CBCD5',.38)
warm=mat('Own memory amber','F0BF78',.38)
violet=mat('Curious memory lavender','B4A1CB',.38)
cube('Memory housing',(0,-.247,.797),(.49,.17,.40),.065,sage,root)
cube('Memory cavity',(0,-.341,.797),(.391,.023,.31),.045,trim,root)
for i,x in enumerate([-.12,0,.12]):
    cube('Memory rail '+str(i),(x,-.364,.80),(.085,.023,.225),.014,gold,root)
    cube('MemoryBlock.'+str(i),(x,-.389,.83),(.079,.044,.17),.017,[blue,warm,violet][i],root)
    for z in [.727,.744]:cube('Contact',(x,-.408,z),(.036,.004,.006),.002,gold,root)
hatch=bpy.data.objects.new('MemoryHatch',None);bpy.context.collection.objects.link(hatch);hatch.location=(-.248,-.35,.797);parent(hatch,root)
cube('Memory hatch cover',(0,-.432,.797),(.488,.038,.395),.06,cream,hatch)
for i,x in enumerate([-.12,0,.12]):cube('Memory hatch lens '+str(i),(x,-.457,.833),(.058,.012,.102),.021,[blue,warm,violet][i],hatch)
cube('Hatch thumb notch',(.173,-.46,.709),(.08,.018,.023),.009,sage,hatch)
for z in [.67,.92]:ball('Hatch hinge',(-.248,-.384,z),(.018,.038,.022),gold,root)
for side,suffix in [(-1,'L'),(1,'R')]:
    arm=bpy.data.objects['Arm.'+suffix]
    cube('Wrist memory trim.'+suffix,(side*.43,-.012,.617),(.16,.17,.045),.021,sage,arm)
    ball('Glove thumb.'+suffix,(side*.356,-.064,.572),(.062,.066,.065),cream,arm)
cube('Quiet collar',(0,-.008,1.088),(.43,.37,.069),.032,sage,root)
head=bpy.data.objects['Head']
for side in [-1,1]:ball('Ear accent',(side*.495,0,1.46),(.021,.092,.13),sage,head)
root['character']='Player';root['source']='Original Are You Human? memory body; shares Hina resident proportions'
root['interaction']='MemoryHatch opens on its vertical pivot; three removable memory blocks'
objects=[root]+list(root.children_recursive)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/characters/player.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/characters/player.blend'),compress=True)
print('Player memory body exported:',len(objects),'objects')
