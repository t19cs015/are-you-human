"""Build the original Mia character in Blender; export editable source and game GLB.
Run: Blender --background --factory-startup --python scripts/build-mia.py
Coordinates: metres, Z up, front -Y. Named empty joints become game pivots.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
bpy.context.preferences.filepaths.save_version=0

def mat(name,hexcolor,rough=.5,coat=0):
    rgb=[int(hexcolor[i:i+2],16)/255 for i in (0,2,4)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=rough;p.inputs['Coat Weight'].default_value=coat
    return m
shell=mat('Peach ceramic','E7B69C',.36,.25)
cream=mat('Warm enamel','F1D8BD',.4,.2)
edge=mat('Soft graphite trim','344853',.55)
glass=mat('Screen glass','102B35',.28,.2)
fabric=mat('Woven terracotta','C97D60',.95)
fabric_edge=mat('Woven edge','AD624D',.95)
sole=mat('Rubber sole','354853',.9)
boot=mat('Blue grey boots','617985',.5)
badge=mat('Warm brass badge','DCBE83',.45)
root=bpy.data.objects.new('Mia',None);bpy.context.collection.objects.link(root)

def parent(obj,p=root):
    bpy.context.view_layer.update();world=obj.matrix_world.copy();obj.parent=p;obj.matrix_world=world
    return obj

def finish(obj,name,material,p=root):
    obj.name=name;obj.data.materials.append(material)
    for poly in obj.data.polygons:poly.use_smooth=True
    return parent(obj,p)

def cube(name,loc,size,r,material,p=root):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=o.modifiers.new('Rounded manufactured edges','BEVEL');mod.width=r;mod.segments=6
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');mod.keep_sharp=True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,material,p)

def ellipsoid(name,loc,scale,material,p=root,segments=24,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=loc)
    o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,material,p)

def pivot(name,loc,p=root):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;return parent(o,p)

def rounded_panel(name,w,h,r,y,z,material,p=root):
    coords=[]
    for cx,cz,start in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
        for i in range(9):
            a=math.radians(start+i*90/8);coords.append((cx+r*math.cos(a),y,cz+r*math.sin(a)+z))
    # Conform every vertex to the rounded head surface, including the screen corners.
    def surface(x,zz):
        d2=max(abs(x)-.275,0)**2+max(abs(zz-1.46)-.155,0)**2
        return -.135-math.sqrt(max(.235**2-d2,0))+(y+.37)
    verts=[(0,surface(0,z),z)];faces=[];count=len(coords);rings=10
    for j in range(1,rings+1):
        t=j/rings
        for x,_,zz in coords:
            x*=t;zz=z+(zz-z)*t;verts.append((x,surface(x,zz),zz))
    for i in range(count):faces.append((0,i+1,(i+1)%count+1))
    for j in range(rings-1):
        for i in range(count):
            a=1+j*count+i;b=1+j*count+(i+1)%count
            faces.append((a,a+count,b+count,b))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            v=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(v.x/w+.5,(v.z-z)/h+.5)
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return finish(o,name,material,p)

def curve(name,points,thickness,material,p=root):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=8;data.bevel_depth=thickness;data.bevel_resolution=2
    spline=data.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for b,co in zip(spline.bezier_points,points):b.co=co;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
    for a in bpy.context.selected_objects:
        if a!=o:a.select_set(False)
    bpy.ops.object.convert(target='MESH');return finish(bpy.context.object,name,material,p)

# A rounded body with visible, soft joint sockets instead of intersecting spheres.
ellipsoid('Torso',(0,0,.73),(.345,.27,.405),shell,segments=32,rings=16)
ellipsoid('Lower body seam',(0,.018,.445),(.278,.23,.082),edge)
cube('Back service panel',(0,.259,.78),(.28,.025,.25),.04,cream)
for x in [-.075,0,.075]:cube('Back ventilation slit',(x,.28,.8),(.025,.012,.095),.009,edge)

head=pivot('Head',(0,0,1.19))
cube('Head shell',(0,0,1.46),(1.02,.74,.78),.235,shell,head)
# A nearly flush, rounded screen: the perimeter is only 8 mm proud of the shell.
rounded_panel('Face rim',.846,.535,.165,-.374,1.465,cream,head)
rounded_panel('Face gasket',.818,.507,.154,-.376,1.465,edge,head)
rounded_panel('FaceScreen',.784,.477,.143,-.378,1.465,glass,head)
for side in [-1,1]:
    ellipsoid('Side earpiece',(side*.498,.02,1.44),(.055,.148,.175),cream,head)
    ellipsoid('Earpiece inset',(side*.541,.02,1.44),(.012,.084,.098),fabric,head)

# The scarf is a shaped cloth band with a rounded, draped end, not a cylinder + block.
verts=[];faces=[];N=64;R=6
for j in range(R):
    t=j/(R-1)
    for i in range(N):
        a=i/N*math.tau;radius=.294+.02*math.sin(t*math.pi)
        verts.append((radius*math.cos(a),radius*.89*math.sin(a),1.038+t*.137+.011*math.sin(a*2+t)))
for j in range(R-1):
    for i in range(N):
        k=j*N+i;n=j*N+(i+1)%N;faces.append((k,n,n+N,k+N))
mesh=bpy.data.meshes.new('Scarf band');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Scarf wrap',mesh);bpy.context.collection.objects.link(o);finish(o,'Scarf wrap',fabric)
mod=o.modifiers.new('Fabric thickness','SOLIDIFY');mod.thickness=.018;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
# Rounded hem, changing curvature as it drapes over the chest.
verts=[];faces=[];rows=16;cols=8
for j in range(rows):
    t=j/(rows-1);width=.15*(1-.1*t)
    for i in range(cols):
        u=i/(cols-1)*2-1
        verts.append((-.17+.038*t+u*width/2,-.292-.014*math.sin(t*math.pi)-.012*(1-u*u),1.115-t*.365+.025*u*u*t**8))
for j in range(rows-1):
    for i in range(cols-1):k=j*cols+i;faces.append((k,k+1,k+cols+1,k+cols))
mesh=bpy.data.meshes.new('Draped scarf');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Scarf drape',mesh);bpy.context.collection.objects.link(o);finish(o,'Scarf drape',fabric)
mod=o.modifiers.new('Cloth thickness','SOLIDIFY');mod.thickness=.022;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
mod=o.modifiers.new('Soft hem','BEVEL');mod.width=.008;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
def hem_point(t,u):
    width=.15*(1-.1*t)
    return (-.17+.038*t+u*width/2,-.292-.014*math.sin(t*math.pi)-.012*(1-u*u)-.004,1.115-t*.365+.025*u*u*t**8)
curve('Scarf stitched hem',[hem_point(t,-.87) for t in [.12,.4,.7,.93]]+[hem_point(.97,u) for u in [-.6,0,.6]]+[hem_point(t,.87) for t in [.93,.7,.4,.12]],.0018,fabric_edge)
ellipsoid('Scarf soft knot',(-.17,-.29,1.102),(.099,.063,.066),fabric)
# One small enamel badge, keeping the chest quiet.
ellipsoid('Badge mount',(.137,-.257,.873),(.063,.014,.07),badge)
ellipsoid('Badge enamel',(.137,-.272,.878),(.034,.007,.038),cream)

for side,suffix in [(-1,'L'),(1,'R')]:
    ellipsoid('Shoulder socket.'+suffix,(side*.327,0,.956),(.094,.112,.112),edge)
    arm=pivot('Arm.'+suffix,(side*.378,0,.97))
    ellipsoid('Sleeve.'+suffix,(side*.405,0,.849),(.105,.116,.164),shell,arm)
    ellipsoid('Wrist cuff.'+suffix,(side*.416,-.005,.723),(.09,.095,.048),cream,arm)
    ellipsoid('Mitten.'+suffix,(side*.416,-.012,.652),(.097,.112,.093),shell,arm)
    ellipsoid('Thumb.'+suffix,(side*.35,-.078,.651),(.046,.057,.06),shell,arm)
    foot=pivot('Foot.'+suffix,(side*.168,0,.362))
    ellipsoid('Ankle.'+suffix,(side*.168,0,.34),(.096,.106,.099),edge,foot)
    cube('Boot sole.'+suffix,(side*.168,-.06,.117),(.267,.405,.075),.036,sole,foot)
    cube('Boot upper.'+suffix,(side*.168,-.06,.22),(.265,.394,.18),.085,boot,foot)
    cube('Boot toe.'+suffix,(side*.168,-.209,.231),(.204,.063,.08),.03,cream,foot)

# A neutral editable presentation scene; export selects only the character hierarchy.
root['character']='Mia';root['source']='Original model made for Are You Human?';root['rig']='Named object pivots: Head, Arm.L, Arm.R, Foot.L, Foot.R'
root['front']='-Y in Blender; +Z in glTF';root['screen']='FaceScreen UV uses the in-game expression texture'
bpy.context.view_layer.update()
objects=[root]+list(root.children_recursive)
for o in bpy.context.scene.objects:o.select_set(o in objects)
bpy.context.view_layer.objects.active=root
out=ROOT/'assets/characters/mia.glb';out.parent.mkdir(parents=True,exist_ok=True)
# Pack the default game expression so Blender and standalone viewers also show Mia's face.
face_image=bpy.data.images.load(str(ROOT/'art/characters/mia-face.png'));face_image.pack()
face_texture=glass.node_tree.nodes.new('ShaderNodeTexImage');face_texture.image=face_image
principled=glass.node_tree.nodes.get('Principled BSDF')
glass.node_tree.links.new(face_texture.outputs['Color'],principled.inputs['Base Color'])
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False)
# Make the saved .blend useful for further manual work.
world=bpy.context.scene.world;world.color=(.2,.2,.2)
bpy.ops.object.camera_add(location=(3,-5,2.7));camera=bpy.context.object;camera.name='Portrait camera';direction=Vector((0,0,1))-camera.location;camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=2.7;bpy.context.scene.camera=camera
for name,loc,power,size in [('Key',(-3,-4,5),450,4),('Fill',(3,-2,3),250,3),('Rim',(0,3,4),350,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=32
bpy.context.scene.render.resolution_x=800;bpy.context.scene.render.resolution_y=900;bpy.context.scene.render.resolution_percentage=100
for o in bpy.context.selected_objects:o.select_set(False)
root.select_set(True);bpy.context.view_layer.objects.active=root
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_distance=3.5;area.spaces.active.region_3d.view_location=Vector((0,0,1))
source=ROOT/'art/characters/mia.blend';source.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(source),compress=True)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects if o.type=='MESH')
print(json.dumps({'glb':str(out),'bytes':out.stat().st_size,'triangles':triangles,'objects':len(objects),'blend':str(source)}))
