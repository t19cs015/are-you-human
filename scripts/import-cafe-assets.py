"""Import selected CC0 assets from pinned official trees; embed dependencies as GLB."""
from pathlib import Path
import urllib.request,urllib.parse,json,struct,hashlib
PACKS={
 'house':('TinyTreats-Game-Assets/Tiny-Treats-Homely-House-1.0',['house','fence_straight','fence_post','package','doormat']),
 'park':('TinyTreats-Game-Assets/Tiny-Treats-Pretty-Park-1.0',['bench','street_lantern','tree','bush','hedge_straight','cobble_stones_large','flower_A','flower_B','grass_A']),
 'furniture':('KayKit-Game-Assets/KayKit-Furniture-Bits-1.0',['table_small','chair_A_wood','chair_stool_wood','book_single','cactus_medium_A','cactus_small_A','book_set','shelf_B_large_decorated','table_medium_long','chair_C','lamp_standing','rug_rectangle_A','armchair_pillows','cabinet_medium_decorated']),
 'city':('KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0',['box_A'])}
root=Path(__file__).resolve().parents[1];manifest=[]
def get(url):return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'AreYouHuman-CC0-Importer'})).read()
for pack,(repo,names) in PACKS.items():
 cache=Path('/tmp/ayh-free-assets/'+repo.split('/')[1]+'.json');existing=json.loads((root/'assets/cafe/manifest.json').read_text()) if (root/'assets/cafe/manifest.json').exists() else [];revision=next((m['revision'] for m in existing if m['repo']==repo),'main');tree=json.loads(cache.read_text()) if cache.exists() else json.loads(get('https://api.github.com/repos/'+repo+'/git/trees/'+revision+'?recursive=1'));commit=tree['sha'];base='https://raw.githubusercontent.com/'+repo+'/'+commit+'/'
 license=get(base+'LICENSE.txt');assert b'CC0' in license and b'commercial' in license
 (root/'docs/licenses'/f'{pack}-LICENSE.txt').write_bytes(license)
 for name in names:
  prior=next((m for m in existing if m['file']==f'{pack}-{name}.glb' and m['revision']==commit),None)
  if prior and (root/'assets/cafe'/prior['file']).exists() and hashlib.sha256((root/'assets/cafe'/prior['file']).read_bytes()).hexdigest()==prior['sha256']:
   manifest.append(prior);continue
  paths=[x['path'] for x in tree['tree'] if x['path'].endswith('/'+name+'.gltf')];assert len(paths)==1
  path=paths[0];gltf=json.loads(get(base+path));binary=bytearray()
  def append(data):
   while len(binary)%4:binary.append(0)
   offset=len(binary);binary.extend(data);return offset
  offsets=[]
  for buffer in gltf.get('buffers',[]):offsets.append(append(get(urllib.parse.urljoin(base+path,buffer['uri']))))
  for view in gltf.get('bufferViews',[]):view['byteOffset']=view.get('byteOffset',0)+offsets[view['buffer']];view['buffer']=0
  for img in gltf.get('images',[]):
   if 'uri' not in img:continue
   url=urllib.parse.urljoin(base+path,img.pop('uri'));data=get(url);offset=append(data);img['bufferView']=len(gltf.setdefault('bufferViews',[]));img['mimeType']='image/png' if data.startswith(b'\x89PNG') else 'image/jpeg';gltf['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(data)})
  gltf['buffers']=[{'byteLength':len(binary)}]
  js=json.dumps(gltf,separators=(',',':')).encode();js+=b' '*((-len(js))%4);binary.extend(b'\0'*((-len(binary))%4))
  glb=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary
  filename=f'{pack}-{name}.glb';(root/'assets/cafe'/filename).write_bytes(glb)
  manifest.append({'file':filename,'repo':repo,'revision':commit,'source':path,'license':'CC0-1.0','bytes':len(glb),'sha256':hashlib.sha256(glb).hexdigest()})
 print(pack,'imported',len(names))
(root/'assets/cafe/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Total bytes',sum(m['bytes'] for m in manifest))
