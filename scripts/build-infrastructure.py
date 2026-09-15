"""Original town infrastructure. Blender --background --python this_file.py.
Metres, Z up, front -Y. Rotor and UpperWorks are retained as named animation nodes.
The residents and the existing town kit are never modified.
"""
import bpy, math, json, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/infrastructure'; SOURCE=ROOT/'art/infrastructure'
OUT.mkdir(parents=True,exist_ok=True); SOURCE.mkdir(parents=True,exist_ok=True)

def material(name,hex,emission=0):
    rgb=[int(hex[i:i+2],16)/255 for i in (0,2,4)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Roughness'].default_value=.47
    if 'brass' in name.lower():
        p.inputs['Metallic'].default_value=.72;p.inputs['Roughness'].default_value=.31
    if any(t in name.lower() for t in ['porcelain','enamel','ceramic']):
        p.inputs['Coat Weight'].default_value=.28;p.inputs['Coat Roughness'].default_value=.26
    if 'wood' in name.lower() or 'roof' in name.lower():p.inputs['Roughness'].default_value=.72
    if emission:p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=emission
    return m

def empty(name,loc=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o.parent=parent;return o

def finish(o,name,m,parent=None):
    o.name=name;o.data.materials.append(m)
    if parent:
        bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=parent;o.matrix_world=world
    return o

def box(name,loc,size,m,r=.08,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if r:
        mod=o.modifiers.new('Soft hand-made edges','BEVEL');mod.width=r;mod.segments=3
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,m,parent)

def cylinder(name,loc,r,depth,m,vertices=48,parent=None,top=None):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if top is None else top,depth=depth,location=loc)
    o=bpy.context.object
    for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
    if depth>.06 and r>.08:
        mod=o.modifiers.new('Turned softened lip','BEVEL');mod.width=min(.026,depth*.12,r*.05);mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,m,parent)

def sphere(name,loc,scale,m,parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=1,location=loc);o=bpy.context.object;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for f in o.data.polygons:f.use_smooth=True
    return finish(o,name,m,parent)

def pipe(name,points,r,m,parent=None):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2
    sp=c.splines.new('POLY');sp.points.add(len(points)-1)
    for p,co in zip(sp.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.object,name,m,parent)

def window(name,x,y,z,w,h,parent=None):
    box(name+' frame',(x,y,z),(w+.16,.16,h+.16),slate,.06,parent)
    box(name+' glass',(x,y-.09,z),(w,.055,h),glow,.045,parent)
    box(name+' mullion',(x,y-.14,z),(.055,.045,h),brass,.015,parent)
    box(name+' sill',(x,y-.15,z-h/2-.09),(w+.28,.27,.11),cream,.035,parent)
    box(name+' transom',(x,y-.15,z+h*.15),(w,.04,.04),brass,.012,parent)

manifest=[]
for kind in ['windmill','pump','tower','data-center','city-house']:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for m in list(bpy.data.materials):bpy.data.materials.remove(m)
    cream=material('Warm porcelain','D4D7C6');slate=material('Midnight enamel','465F70')
    teal=material('Sage ceramic','86A69A');wood=material('Old honey wood','A88867');brass=material('Dull brass','BBA477')
    rose=material('Dusty rose roof','AD827F');glass=material('Quiet blue glass','739BA7')
    linen=material('Woven sail linen','D8CEB3');linen.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.94
    glow=material('Window glow','F3D69B',.65);cool=material('New window glow','B8DADF',.65)
    root=empty(kind)
    if kind=='windmill':
        cylinder('Stone footing',(0,0,.22),2.25,.44,slate,parent=root)
        cylinder('White tapered mill',(0,0,2.65),1.8,4.9,cream,32,root,1.25)
        cylinder('Roof eaves',(0,0,5.2),1.75,.22,wood,parent=root)
        cylinder('Rose roof',(0,0,5.9),1.82,1.3,rose,24,root,0)
        box('Door',(0,-1.79,1.05),(.8,.14,1.8),teal,.18,root)
        for x in [-.8,.8]:window('Small mill window',x,-1.4,2.7,.45,.7,root)
        rotor=empty('Rotor',(0,-1.65,5.3),root)
        sphere('Rotor hub',(0,-1.9,5.3),(.32,.38,.32),brass,rotor)
        for i in range(4):
            a=i*math.pi/2+.28
            for name,dist,width,length,m in [('Blade arm',1.78,.13,3.5,wood),('Linen sail',2.3,.63,1.65,linen)]:
                o=box(name,(math.sin(a)*dist,-1.83,5.3+math.cos(a)*dist),(width,.12,length),m,.035,rotor);o.rotation_euler.y=a
            for j in range(5):
                d=1.6+j*.31;o=box('Sail stitch',(math.sin(a)*d,-1.91,5.3+math.cos(a)*d),(.64,.028,.038),wood,.005,rotor);o.rotation_euler.y=a
        box('Service box',(1.5,-.8,.65),(.7,.65,1.1),teal,.12,root)
        pipe('Copper cable',[(1.5,-.8,1),(2,-.8,.45),(2,-2,.45)],.055,brass,root)
    elif kind=='pump':
        box('Pump platform',(0,0,.18),(3.5,3,.36),slate,.18,root)
        box('Rounded pump shed',(-.5,.3,1.4),(2,1.8,2.5),teal,.25,root)
        box('Pump roof',(-.5,.3,2.72),(2.3,2.1,.27),rose,.13,root)
        window('Gauge window',-.5,-.64,1.7,.8,.62,root)
        cylinder('Pressure tank',(1,.2,1.2),.48,2.05,cream,parent=root)
        sphere('Tank cap',(1,.2,2.2),(.48,.48,.22),cream,root)
        pipe('Water intake',[(1,.2,.65),(1,1.7,.65),(1,2.3,.1)],.18,brass,root)
        pipe('Water outlet',[(-.5,0,1.2),(-1.6,0,1.2),(-1.6,-1.7,.55)],.16,slate,root)
        valve=empty('Rotor',(-.6,-1.1,.7),root)
        for i in range(5):
            a=i*math.pi/5;o=box('Valve spoke',(-.6,-1.1,.7),(.65,.08,.065),brass,.02,valve);o.rotation_euler.y=a
        sphere('Valve center',(-.6,-1.15,.7),(.13,.08,.13),rose,valve)
    elif kind=='tower':
        cylinder('Tower foot',(0,0,.22),2,.44,slate,parent=root)
        cylinder('Tower ceramic',(0,0,5.4),1.42,10.3,cream,32,root,.62)
        for z in [1.6,3.5,5.4,7.3,9.2]:
            cylinder('Brass collar',(0,0,z),1.5-z*.078,.18,brass,parent=root)
            box('Glow panel',(0,-(1.4-z*.075),z+.5),(.27,.06,.65),cool,.08,root)
        cylinder('Lantern base',(0,0,11),1.5,.45,slate,parent=root)
        cylinder('Beacon glass',(0,0,12),1.04,1.7,glass,parent=root)
        for i in range(8):
            a=i*math.pi/4;box('Beacon pillar',(math.cos(a)*1.15,math.sin(a)*1.15,12),(.12,.12,1.9),brass,.025,root)
        sphere('Beacon glow',(0,0,12),(.7,.7,.7),glow,root)
        cylinder('Lantern crown',(0,0,13.1),1.45,.6,teal,24,root,.55)
        cylinder('Aerial',(0,0,14),.06,1.7,brass,12,root)
        sphere('Aerial star',(0,0,14.85),(.15,.15,.22),glow,root)
        window('Tower door',0,-1.44,1,.6,1.5,root)
    elif kind=='data-center':
        box('Central foundations',(0,0,.2),(8.5,6.8,.4),slate,.25,root)
        box('Municipal hall',(0,0,1.9),(8,6.1,3.4),cream,.48,root)
        box('Front canopy',(0,-3.45,2.65),(5.1,1.15,.24),teal,.14,root)
        box('Central entrance',(0,-3.1,1.24),(1.4,.15,2.1),slate,.3,root)
        for x in [-2.8,-1.65,1.65,2.8]:window('Hall window',x,-3.08,1.7,.75,1.1,root)
        box('Roof garden',(0,0,3.65),(8.3,6.4,.35),teal,.24,root)
        for x in [-2.8,2.8]:
            box('Vent housing',(x,.65,4.05),(1.3,2.2,.7),slate,.14,root)
            for y in [-.1,.3,.7,1.1,1.5]:box('Vent louver',(x,y,4.42),(1.1,.08,.07),brass,.01,root)
        upper=empty('UpperWorks',(0,0,3.7),root)
        box('New central floor',(0,0,4.7),(4.4,3.6,2),slate,.32,upper)
        for x in [-1.5,-.5,.5,1.5]:box('New blue window',(x,-1.83,4.8),(.62,.055,1.25),cool,.14,upper)
        sphere('Learning dome',(0,0,6.05),(1.5,1.5,.8),glass,upper)
        for z in [4.0,5.7]:box('Central cornice',(0,0,z),(4.7,3.9,.16),brass,.07,upper)
    else:
        box('New home foundation',(0,0,.15),(3.3,3.3,.3),slate,.16,root)
        box('Rounded high-rise',(0,0,3.7),(3,3,7.2),cream,.32,root)
        box('Blue upper facade',(0,-1.51,3.9),(2.5,.1,6.2),glass,.16,root)
        for z in [1.2,2.5,3.8,5.1,6.4]:
            for x in [-.72,.72]:box('Window',(x,-1.58,z),(.7,.04,.83),cool,.1,root)
            box('Floor cornice',(0,0,z+.65),(3.17,3.17,.09),brass,.04,root)
        box('Roof lip',(0,0,7.4),(3.4,3.4,.35),teal,.18,root)
        box('Rooftop garden',(0,0,7.64),(2.6,2.6,.16),wood,.1,root)
        sphere('Roof shrub',(-.65,.6,7.95),(.5,.55,.42),teal,root)
        box('Rooftop service',(1,.6,7.9),(.7,.8,.6),slate,.1,root)
    # Handcrafted details stay inside each existing collision footprint.
    if kind=='windmill':
        for z in [4.9]:cylinder('Turned stone and eave bands',(0,0,z),1.9 if z<1 else 1.4,.13,wood if z>1 else cream,parent=root)
        for i in range(24):
            a=i*math.tau/24
            pipe('Standing roof seam',[(math.cos(a)*1.78,math.sin(a)*1.78,5.3),(math.cos(a)*.18,math.sin(a)*.18,6.4)],.024,wood,root)
        sphere('Roof finial',(0,0,6.61),(.12,.12,.17),brass,root)
        for x in [-.32,0,.32]:box('Door timber slats',(x,-1.876,1.05),(.018,.025,1.48),wood,.005,root)
        for z in [.46,1.53]:box('Forged door hinge',(0,-1.90,z),(.65,.035,.065),slate,.01,root)
        sphere('Door latch',(.24,-1.94,1.05),(.055,.055,.055),brass,root)
        for i in range(4):
            a=i*math.pi/2+.28
            for side in [-1,1]:
                dx=math.cos(a)*side*.34;dz=-math.sin(a)*side*.34
                pipe('Sail timber edging',[(math.sin(a)*1.48+dx,-1.935,5.3+math.cos(a)*1.48+dz),(math.sin(a)*3.13+dx,-1.935,5.3+math.cos(a)*3.13+dz)],.026,wood,rotor)
        for z in [.35,.8]:box('Service panel edging',(1.5,-1.15,z),(.54,.05,.045),brass,.012,root)
        for i in range(4):box('Service louvers',(1.5,-1.145,.48+i*.10),(.38,.04,.035),slate,.008,root)
    elif kind=='pump':
        for z in [.55,1.83]:cylinder('Tank retaining band',(1,.2,z),.499,.09,brass,parent=root)
        for x in [-1.24,.24]:
            for z in [.4,2.45]:sphere('Shed brass fastener',(x,-.62,z),(.038,.025,.038),brass,root)
        for i in range(7):box('Cooling grille',(-.5,.3+i*.21,2.878),(1.45,.045,.025),slate,.007,root)
        gauge=cylinder('Round gauge surround',(1,-.315,1.6),.255,.10,brass,parent=root);gauge.rotation_euler.x=math.pi/2
        face=cylinder('Ivory gauge dial',(1,-.382,1.6),.218,.025,cream,parent=root);face.rotation_euler.x=math.pi/2
        for i in range(9):
            a=-2.3+i*.575
            tick=box('Gauge calibration',(1+math.sin(a)*.17,-.406,1.6+math.cos(a)*.17),(.018,.012,.043),slate,.002,root);tick.rotation_euler.y=a
        needle=box('Gauge needle',(1.055,-.421,1.66),(.025,.02,.19),rose,.006,root);needle.rotation_euler.y=.7
        for y in [.7,1.3,1.7]:
            collar=cylinder('Pipe compression collar',(1,y,.65),.218,.09,slate,parent=root);collar.rotation_euler.x=math.pi/2
        for x in [-1.17,-.5,.17]:box('Shed standing roof seam',(x,.3,2.872),(.025,1.88,.02),wood,.005,root)
    elif kind=='tower':
        for i in range(8):
            a=i*math.pi/4
            pipe('Crown roof seam',[(math.cos(a)*1.45,math.sin(a)*1.45,12.81),(math.cos(a)*.55,math.sin(a)*.55,13.4)],.027,brass,root)
            for z in [11.25,12.8]:
                pipe('Lantern rail',[(math.cos(a)*1.15,math.sin(a)*1.15,z),(math.cos(a+math.pi/4)*1.15,math.sin(a+math.pi/4)*1.15,z)],.034,brass,root)
    elif kind=='data-center':
        for x in [-3.76,3.76]:
            box('Hall corner pilaster',(x,-3.05,1.9),(.27,.26,3.05),teal,.065,root)
            for z in [.55,3.25]:box('Pilaster capital',(x,-3.08,z),(.39,.34,.13),brass,.025,root)
        for x in [-2.15,2.15]:
            box('Porch column',(x,-3.77,1.5),(.18,.18,2.35),teal,.035,root)
            sphere('Porch opal lamp',(x,-3.77,2.35),(.14,.14,.18),glow,root)
        for y in [-2,-.7,.6,1.9]:
            for x in [-4.012,4.012]:
                box('Hall side frame',(x,y,1.83),(.08,.76,1.17),slate,.04,root)
                box('Hall side pane',(x+math.copysign(.05,x),y,1.83),(.035,.62,1.03),glow,.035,root)
        for x in [-.55,0,.55]:box('Entrance inset',(x,-3.20,1.25),(.38,.04,1.8),glass,.075,root)
        for z in [.55,3.43]:box('Facade cornice',(0,-3.075,z),(7.5,.14,.11),brass,.025,root)
        for i in range(12):
            a=i*math.tau/12
            pipe('Dome rib',[(math.cos(a)*1.49,math.sin(a)*1.49,6.08),(math.cos(a)*1.25,math.sin(a)*1.25,6.48),(math.cos(a)*.5,math.sin(a)*.5,6.80),(0,0,6.85)],.025,brass,upper)
    # Merge by animation parent and material. Detailed models keep a small draw-call
    # budget; Rotor and UpperWorks remain independently animated editable nodes.
    buckets={}
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH':buckets.setdefault((o.parent.name if o.parent else '',o.data.materials[0].name),[]).append(o)
    for (parent_name,mat_name),objects in buckets.items():
        if len(objects)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=parent_name+' · '+mat_name
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(kind+'.blend')))
    path=OUT/(kind+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False)
    manifest.append({'id':kind,'file':path.name,'source':'Original Blender construction for Are You Human?','editable':'art/infrastructure/'+kind+'.blend','generator':'scripts/build-infrastructure.py','sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size})
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Built five original, editable infrastructure assets.')
