"""Derive Ren, Tomo and Shell from the approved original Mia construction.
Run Blender --background --python scripts/build-residents.py.
Reads mia.blend without overwriting it; writes three independent editable sources/GLBs.
Metres, Z up, front -Y; object joints retain the game animation contract.
"""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]

def mat(name,color,rough=.5):
    rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=rough
    return m

def recolor(name,color):
    old=bpy.data.materials[name];new=mat(name+' variant',color)
    rgba=new.diffuse_color;old.diffuse_color=rgba;old.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=rgba
    bpy.data.materials.remove(new)

def parent(o,p):
    bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=p;o.matrix_world=world;return o

def finish(o,name,material,p):
    o.name=name;o.data.materials.append(material)
    for poly in o.data.polygons:poly.use_smooth=True
    return parent(o,p)

def bevel(o,r=.025):
    bpy.context.view_layer.objects.active=o
    m=o.modifiers.new('Soft edges','BEVEL');m.width=r;m.segments=5;bpy.ops.object.modifier_apply(modifier=m.name)
    m=o.modifiers.new('Corner normals','WEIGHTED_NORMAL');m.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=m.name)

def cube(name,loc,size,r,material,p):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);bevel(o,r);return finish(o,name,material,p)

def ball(name,loc,size,material,p):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=loc);o=bpy.context.object;o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,material,p)

def curve(name,points,r,material,p,cyclic=False):
    d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.resolution_u=6;d.bevel_depth=r;d.bevel_resolution=3
    sp=d.splines.new('BEZIER');sp.bezier_points.add(len(points)-1);sp.use_cyclic_u=cyclic
    for b,co in zip(sp.bezier_points,points):b.co=co;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.object,name,material,p)

def remove_prefix(prefix):
    for o in list(root.children_recursive):
        if o.name.startswith(prefix):bpy.data.objects.remove(o,do_unlink=True)

def set_material(name,material):bpy.data.objects[name].data.materials.clear();bpy.data.objects[name].data.materials.append(material)

def face_y(x,z):
    d2=max(abs(x)-.275,0)**2+max(abs(z-1.46)-.155,0)**2
    return -.135-math.sqrt(max(.235**2-d2,0))-.031

def torso_y(x,z,offset=.006):
    width=.345*bpy.data.objects['Torso'].scale.x
    return -.27*math.sqrt(max(0,1-(x/width)**2-((z-.73)/.405)**2))-offset

def placket(material):
    verts=[];faces=[]
    for j in range(13):
        z=.75+j*.28/12
        for x in [-.038,0,.038]:verts.append((x,torso_y(x,z),z))
    for j in range(12):
        for i in range(2):k=j*3+i;faces.append((k,k+1,k+4,k+3))
    mesh=bpy.data.meshes.new('Curved shirt placket');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Shirt placket',mesh);bpy.context.collection.objects.link(o);finish(o,'Shirt placket',material,root)
    m=o.modifiers.new('Shirt thickness','SOLIDIFY');m.thickness=.006;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name);bevel(o,.003)

def spectacles(head,material):
    for side in [-1,1]:
        points=[];cx=side*.151;cz=1.495;w=.266;h=.22;r=.059
        for dx,dz,start in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
            for i in range(4):
                a=math.radians(start+i*90/4);x=cx+dx+r*math.cos(a);z=cz+dz+r*math.sin(a);points.append((x,face_y(x,z),z))
        curve('Glasses frame.'+str(side),points,.012,material,head,True)
        curve('Glasses temple.'+str(side),[(side*.286,face_y(side*.286,cz),cz),(side*.47,-.30,cz),(side*.52,-.10,cz),(side*.52,.035,cz-.025)],.011,material,head)
    curve('Glasses bridge',[(-.018,-.401,1.505),(0,-.406,1.516),(.018,-.401,1.505)],.011,material,head)

def ear(side,head,outer,inner):
    xs=[side*.19,side*.49,side*.43];zs=[1.77,1.78,2.105]
    verts=[(x,y,z) for y in [-.105,.105] for x,z in zip(xs,zs)]
    # Winding is recalculated below so both mirrored ears have outward normals.
    mesh=bpy.data.meshes.new('Cat ear');mesh.from_pydata(verts,[],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)]);mesh.update()
    o=bpy.data.objects.new('Cat ear',mesh);bpy.context.collection.objects.link(o);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free();bevel(o,.035);finish(o,'Cat ear.'+str(side),outer,head)
    verts=[(side*.265,-.114,1.815),(side*.438,-.114,1.821),(side*.407,-.114,2.007)]
    if side<0:verts.reverse()
    mesh=bpy.data.meshes.new('Ear inset');mesh.from_pydata(verts,[],[(0,1,2)]);mesh.update();o=bpy.data.objects.new('Ear inset',mesh);bpy.context.collection.objects.link(o);finish(o,'Ear inset.'+str(side),inner,head)
    o.data.materials[0].use_backface_culling=False
    m=o.modifiers.new('Inset thickness','SOLIDIFY');m.thickness=.014;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name);bevel(o,.015)

def leaf(name,start,end,width,material,p):
    start,end=Vector(start),Vector(end);direction=end-start;across=Vector((direction.z,0,-direction.x)).normalized();verts=[];faces=[]
    for j in range(13):
        t=j/12;center=start+direction*t
        for u in [-1,0,1]:
            v=center+across*(u*width*math.sin(math.pi*t));v.y-=.035*math.sin(math.pi*t)*(1-u*u);verts.append(v)
    for j in range(12):
        for i in range(2):k=j*3+i;faces.append((k,k+1,k+4,k+3))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,material,p)
    m=o.modifiers.new('Leaf thickness','SOLIDIFY');m.thickness=.009;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
    curve(name+' midrib',[start,start+direction*.5+Vector((0,-.038,0)),end],.003,vein,p)

for id in ['ren','tomo','shell']:
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/characters/mia.blend'))
    bpy.context.preferences.filepaths.save_version=0
    root=bpy.data.objects['Mia'];root.name=id.title();head=bpy.data.objects['Head']
    for prefix in ['Scarf','Badge']:remove_prefix(prefix)
    cream=bpy.data.materials['Warm enamel'];edge=bpy.data.materials['Soft graphite trim']
    if id=='ren':
        recolor('Peach ceramic','A9BCCB');recolor('Warm enamel','E1E4DF');recolor('Woven terracotta','617E94');recolor('Blue grey boots','405770')
        vest=mat('Woven midnight vest','465A73',.92);brass=mat('Brushed spectacle metal','B69E6E',.55)
        set_material('Torso',vest);spectacles(head,brass)
        # A short stand collar, shirt insert and tiny pencil pocket are readable close up.
        ball('Shirt collar',(0,0,1.084),(.263,.217,.069),cream,root)
        placket(cream)
        for z in [.82,.9,.98]:ball('Vest button',(0,torso_y(0,z,.016),z),(.015,.012,.015),brass,root)
        pocket=cube('Breast pocket',(.173,-.223,.883),(.13,.034,.125),.018,vest,root)
        curve('Pocket hem',[(.12,-.248,.932),(.177,-.254,.927),(.231,-.233,.932)],.004,cream,root)
        cube('Pencil',(.194,-.228,1.001),(.014,.017,.125),.005,brass,root)
        head.scale=(.95,1,1.02);root.scale=(.95,1,1.035)
    elif id=='tomo':
        recolor('Peach ceramic','E4EDF1');recolor('Warm enamel','BCD9E6');recolor('Woven terracotta','75ACCA');recolor('Blue grey boots','80AEC6')
        blue=mat('Sky blue ear inset','84B9D5',.6);orange=mat('Amber prototype accents','D7A05C',.7);bodymat=bpy.data.materials['Peach ceramic']
        for side in [-1,1]:ear(side,head,bodymat,blue)
        tail=bpy.data.objects.new('Tail',None);bpy.context.collection.objects.link(tail);tail.location=(0,.22,.53);parent(tail,root)
        curve('Flexible tail',[(0,.25,.53),(.17,.4,.59),(.45,.48,.77),(.62,.43,.97),(.60,.39,1.09)],.038,blue,tail)
        ball('Tail tip',(.60,.39,1.09),(.047,.047,.065),cream,tail)
        ball('Utility belt',(0,0,.51),(.30,.245,.065),blue,root)
        cube('Tool pouch',(.274,-.10,.59),(.13,.16,.19),.035,orange,root)
        cube('Chest socket',(0,-.267,.86),(.135,.028,.12),.022,blue,root)
        for x in [-.029,.029]:ball('Socket LED',(x,-.291,.865),(.014,.012,.017),orange,root)
        for side,suffix in [(-1,'L'),(1,'R')]:
            for z in [.262,.291]:cube('Sneaker strap.'+suffix,(side*.168,-.187,z),(.195,.072,.027),.01,cream,bpy.data.objects['Foot.'+suffix])
        head.scale=(.98,1,.96);root.scale=(1,1,.97)
    else:
        recolor('Peach ceramic','A6C698');recolor('Warm enamel','E6E3C7');recolor('Woven terracotta','739A70');recolor('Blue grey boots','6E8D79')
        cloak=mat('Sage outer shell','668A77',.72);leafmat=mat('Living green antenna','91B778',.68);vein=mat('Leaf midrib','D3D6A0',.8);gold=mat('Archive brass','C3AE72',.55)
        # Rounded protective outer body, like a quiet caretaker's vest.
        set_material('Torso',cloak);bpy.data.objects['Torso'].scale.x=1.1
        ball('Soft collar',(0,0,1.064),(.29,.23,.076),cream,root)
        curve('Vest seam',[(0,torso_y(0,z,.004),z) for z in [1.055,1.015,.96,.9,.84,.78,.72,.66,.60,.54,.46]],.005,cream,root)
        ball('Archive clasp',(0,torso_y(0,.897,.017),.897),(.047,.018,.047),gold,root)
        curve('Sprout stem',[(0,0,1.80),(0,0,1.97),(.018,0,2.037)],.018,cloak,head)
        leaf('Right leaf',(.01,0,2.01),(.255,0,2.185),.08,leafmat,head)
        leaf('Left leaf',(.01,0,2.01),(-.225,.015,2.115),.075,leafmat,head)
        cube('Archive pack',(0,.312,.798),(.36,.155,.31),.055,cream,root)
        for x in [-.08,0,.08]:cube('Archive slot',(x,.399,.827),(.036,.01,.115),.01,cloak,root)
        head.scale=(1.025,1,1);root.scale=(1.025,1,1)
    root['character']=id.title();root['source']='Original model made for Are You Human?; shares Mia construction'
    face=bpy.data.images.load(str(ROOT/'art/characters'/f'{id}-face.png'));face.pack()
    for node in bpy.data.materials['Screen glass'].node_tree.nodes:
        if node.type=='TEX_IMAGE':node.image=face
    objects=[root]+list(root.children_recursive)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=root
    out=ROOT/'assets/characters'/f'{id}.glb'
    bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False)
    source=ROOT/'art/characters'/f'{id}.blend';bpy.ops.wm.save_as_mainfile(filepath=str(source),compress=True)
    triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects if o.type=='MESH')
    print(json.dumps({'id':id,'bytes':out.stat().st_size,'triangles':triangles,'objects':len(objects)}))
