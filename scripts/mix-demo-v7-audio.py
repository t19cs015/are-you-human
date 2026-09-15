"""Small-town chamber score, material-specific Foley and continuous acoustic tails.
Kenney CC0 Foley sources/hashes: assets/sound/manifest.json. No stock music.
"""
from pathlib import Path
import json, wave, subprocess
import numpy as np
ROOT=Path(__file__).resolve().parents[1];DIR=ROOT/'data/film-v7'
RATE,DURATION=48000,60;COUNT=RATE*DURATION
rng=np.random.default_rng(4107)
manifest=json.loads((DIR/'audio-manifest.json').read_text())
def read_audio(path):
    b=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-ac','1','-ar',str(RATE),'-f','f32le','pipe:1'])
    return np.frombuffer(b,dtype='<f4').astype(float)
with wave.open(str(DIR/'narration.wav'),'rb') as f:voice=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float).reshape(-1,2)/32768
music=np.zeros_like(voice);foley=np.zeros_like(voice);ambience=np.zeros_like(voice);chimes=np.zeros_like(voice)
t=np.arange(COUNT)/RATE

def smooth(x):x=np.clip(x,0,1);return x*x*(3-2*x)
def edge(sound,attack=.004,release=.05):
    q=np.arange(len(sound))/RATE
    return sound*smooth(q/attack)*smooth((len(sound)/RATE-q)/release)
def add(target,sound,at,pan=0):
    begin=round(at*RATE);offset=max(0,-begin);begin=max(0,begin);n=min(len(sound)-offset,COUNT-begin)
    if n<=0:return
    target[begin:begin+n,0]+=sound[offset:offset+n]*np.sqrt((1-pan)/2)
    target[begin:begin+n,1]+=sound[offset:offset+n]*np.sqrt((1+pan)/2)
def filtered_noise(n,lo=80,hi=6000):
    raw=rng.normal(0,1,n);freq=np.fft.rfftfreq(n,1/RATE)
    curve=(1-np.exp(-(freq/max(1,lo))**2))*np.exp(-(freq/hi)**2)
    s=np.fft.irfft(np.fft.rfft(raw)*curve,n);return s/max(1e-8,np.std(s))
cache={}
def sample(name,at,level=.1,pan=0,speed=1,lowpass=6500):
    if name not in cache:cache[name]=read_audio(ROOT/'assets/sound'/(name+'.ogg'))
    source=cache[name];p=np.arange(0,len(source)-1,speed);s=np.interp(p,np.arange(len(source)),source)
    freq=np.fft.rfftfreq(len(s),1/RATE);s=np.fft.irfft(np.fft.rfft(s)*np.exp(-(freq/lowpass)**2),len(s))
    s=s/max(.01,np.max(np.abs(s)));add(foley,edge(s)*level,at,pan)

def mallet(midi,at,level=.03,length=2.6,pan=0,target=music,metal=False):
    q=np.arange(round(length*RATE))/RATE;hz=440*2**((midi-69)/12)
    # Damped resonant modes plus a soft felt excitation, instead of identical
    # electronic bleeps. The metal chimes use an inharmonic mode spectrum.
    ratios=[1,2.756,5.404,8.933] if metal else [1,2.001,3.005,4.009,5.014,6.02]
    s=np.zeros(len(q))
    for k,ratio in enumerate(ratios):
        decay=(1.6+k*.8) if metal else (1.35+k*1.4)
        s+=np.sin(2*np.pi*hz*ratio*q+.018*k)*np.exp(-q*decay)/(1+k)**1.8
    s*=1-np.exp(-q*(140 if metal else 80))
    hammer=filtered_noise(len(q),450,3500)*np.exp(-q*85)*.024
    tremolo=1+.025*np.sin(q*2*np.pi*4.6)
    add(target,edge((s*tremolo+hammer)*level,.003,.22),at,pan)

def bass(midi,at,level=.022,length=2.2):
    q=np.arange(round(length*RATE))/RATE;hz=440*2**((midi-69)/12);s=np.zeros(len(q))
    for k in range(1,9):s+=np.sin(2*np.pi*hz*k*q+.013*k)*np.exp(-q*(2.5+k*.7))/k**1.4
    add(music,edge(s*(1-np.exp(-q*130))*level,.002,.25),at)

def water(at,length,level=.015,pan=0):
    n=round(length*RATE);q=np.arange(n)/RATE
    body=filtered_noise(n,180,2500)*(.7+.12*np.sin(q*3.3)+.1*np.sin(q*9.8))
    fizz=filtered_noise(n,1700,7500)*.19;s=(body+fizz)*level
    for _ in range(int(length*32)):
        a=rng.integers(0,n-9600);u=np.arange(9600)/RATE;hz=rng.uniform(380,1750)
        bubble=np.sin(2*np.pi*(hz*u+hz*.16*u*u))*np.exp(-u*rng.uniform(20,50))*(1-np.exp(-u*950))
        s[a:a+len(bubble)]+=bubble*level*rng.uniform(.18,.5)
    add(ambience,edge(s,.24,.5),at,pan)

def gust(at,length,level=.006,pan=0):
    n=round(length*RATE);q=np.arange(n)/RATE
    s=filtered_noise(n,70,850)*(.65+.2*np.sin(q*1.4)+.12*np.sin(q*3.3))*level
    add(ambience,edge(s,.4,.65),at,pan)

# A restrained, original eight-bar motif. Space, velocity and a warm low register
# keep the town playful without filling every action with a notification chime.
beat=60/96;chords=[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,67]]
phrase=[(0,0),(1.5,2),(3,1),(5,3),(6.5,2)]
for bar in range(12):
    start=bar*8*beat+.18;chord=chords[bar%4]
    for offset,index in phrase:
        at=start+offset*beat
        if at>=58.4:continue
        mallet(chord[index]+12,at,.029 if index!=3 else .024,pan=(-.24,.22)[index%2])
    for offset in [0,4]:
        at=start+offset*beat
        if at<57.8:bass(chord[0]-24,at,.024)
    for j,midi in enumerate(chord[1:]):
        if start<55:mallet(midi,start+.05*j,.008,3.8,(-.38,.1,.4)[j])
# The closing cadence resolves after Tomo has finished asking the question.
for i,m in enumerate([60,64,67,74]):mallet(m,56.8+i*.14,.023,3.4,(i-1.5)*.18)
mallet(79,58.55,.019,1.45,.12)

# Stone steps, cloth/body turns and a layered mechanical click for the blocks.
for i,at in enumerate(np.arange(.16,4.3,.47)):
    sample('footstep_concrete_00'+str(i%5),at,.062+(.006 if i%2 else 0),(-.12,.12)[i%2],.94+i%3*.035,3400)
for i,at in enumerate([.82,1.42,2.16,3.18,4.15]):sample('cloth'+str(i%3+1),at,.02,(-.55,.5)[i%2],.92+i*.03,4200)
gust(0,14.4,.0025)
gust(6.05,2.6,.007,-.35)
sample('creak1',6.67,.025,-.15,1.2,2500);sample('metalLatch',6.74,.032,-.15,.88,3800)
for i,m in enumerate([72,79,76]):mallet(m,6.9+i*.23,.026,2.2,(-.5,.05,.4)[i],chimes,True)
sample('metalLatch',8.62,.035,.2,.86,3500);sample('impactWood_light_001',8.71,.035,.1,.83,3500)
water(8.28,2.45,.014,.25);water(10.33,2.05,.012,-.1)

# Subtle mechanical breathing replaces a blunt tone at the memory refresh.
for at,length in [(14.45,2.25),(49.0,2.7)]:
    q=np.arange(round(length*RATE))/RATE
    hum=(np.sin(2*np.pi*(112*q+4*q*q))+.22*np.sin(2*np.pi*226*q))*np.sin(np.pi*q/length)**2*.008
    add(ambience,hum,at)
    sample('cloth2',at,.012,-.2,.66,3000)

sample('cloth1',18.83,.027,-.2,.85,3800);sample('impactWood_light_002',18.92,.036,0,.85)
sample('impactGlass_light_000',20.7,.034,-.1,1.02,4800)
sample('cloth3',21.0,.017,0,.92,3800)
sample('impactWood_light_000',22.7,.09,0,.85,4500)
sample('metalLatch',22.726,.036,.05,1.2,4500)
mallet(76,22.76,.018,.95,.2,chimes,True)
sample('bookFlip1',24.4,.055,.08,1.04,5500)
for i in range(27):sample('impactWood_light_00'+str(i%3),(760+round(i*2.8))/30,.018+i%4*.002,(-.06,.06)[i%2],1.8+(i%5)*.045,4400)
sample('metalClick',28.7,.04,0,1.1,4500);sample('impactWood_light_002',28.715,.05,0,.96,4000)
sample('cloth2',30.32,.025,.15,1.05,4200)
for i,at in enumerate(np.arange(36.95,38.65,.32)):sample('footstep_concrete_00'+str(i%5),at,.055,(-.16,.16)[i%2],1.02,3300)
mallet(76,39.09,.017,1.6,-.12,chimes,True)
for i,m in enumerate([60,64,67,72,67,76]):mallet(m+12,41.46+i*.17,.047,2.0,(-.4+i*.16),chimes,True)
water(42.45,1.9,.013,.12);gust(43.5,2.3,.004,.4)
sample('footstep_wood_001',42.57,.026,-.1,.95,3200)
# A restrained mechanical bloom follows the building wave under the narrator.
for i,at in enumerate([44.46,44.79,45.15,45.52]):
    sample('impactWood_light_00'+str(i%3),at,.026,(-.45,.3,-.15,.45)[i],.64+i*.06,2500)
    mallet(60+i*3,at+.06,.013,1.1,(-.35+i*.22),chimes,True)
sample('metalLatch',48.04,.035,0,.92,4400)
for i,m in enumerate([64,71,76]):mallet(m,48.1+i*.16,.022,2.2,(-.22+i*.22),chimes,True)
mallet(79,51.5,.026,2.4,.35,chimes,True);gust(49.15,6.8,.0035,.2)

# Short early reflections and a diffuse, damped stereo room. Tails pass across
# picture cuts; the direct voice remains close and intelligible.
def room(source,wet=.1):
    result=np.zeros_like(source)
    for delay,gain in [(.029,.34),(.043,.27),(.071,.21),(.109,.14),(.157,.10),(.229,.065),(.313,.038),(.421,.02)]:
        n=round(delay*RATE);result[n:,0]+=source[:-n,1]*gain*wet;result[n:,1]+=source[:-n,0]*gain*wet
    return result
voice_room=np.zeros_like(voice)
for c in manifest['clips']:
    if c['who']=='NARRATOR':continue
    a=round(c['start']*RATE);b=min(COUNT,a+round(c['renderedDuration']*RATE))
    wet=.065 if c['who']=='CENTRAL' else .11 if c.get('crowd') else .055
    local=np.zeros_like(voice);local[a:b]=voice[a:b];voice_room+=room(local,wet)
music+=room(music,.26);foley+=room(foley,.14);chimes+=room(chimes,.17)

# Sample-accurate, eased duck envelopes never make a hard level jump at a cut.
duck=np.ones(COUNT);chime_duck=np.ones(COUNT)
for c in manifest['clips']:
    begin=c['start'];end=begin+c['renderedDuration'];floor=.5 if c.get('crowd') else .27
    amount=smooth((t-(begin-.22))/.22)*smooth(((end+.42)-t)/.42)
    duck=np.minimum(duck,1-amount*(1-floor))
    chime_floor=.65 if c.get('crowd') else .2 if c['who']=='NARRATOR' else .34
    chime_duck=np.minimum(chime_duck,1-amount*(1-chime_floor))
sync=1-.88*smooth((t-14.15)/.45)*smooth((19.35-t)/.6)
# A gentle high shelf takes the brittle edge off upper mallet modes.
freq=np.fft.rfftfreq(COUNT,1/RATE);shelf=1-.38*smooth((freq-1700)/3800)
for channel in range(2):
    music[:,channel]=np.fft.irfft(np.fft.rfft(music[:,channel])*shelf,COUNT)
    chimes[:,channel]=np.fft.irfft(np.fft.rfft(chimes[:,channel])*shelf,COUNT)
music*=duck[:,None]*sync[:,None]
chimes*=chime_duck[:,None]
# Reduce the music-stop chimes under the continuing dialogue, retaining the touch.
foley*=np.maximum(.58,duck)[:,None]
ambience*=np.maximum(.75,duck)[:,None]
mix=voice+voice_room+music+foley+ambience+chimes
mix*=smooth(t/.1)[:,None]*smooth((60-t)/.65)[:,None]
peak=np.max(np.abs(mix));mix*=min(1,.88/peak)
def save(name,signal):
    with wave.open(str(DIR/name),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes((np.clip(signal,-1,1)*32767).astype('<i2').tobytes())
save('master.wav',mix);save('foley-stem.wav',foley+ambience+chimes);save('music-stem.wav',music)
(DIR/'audio-mix.json').write_text(json.dumps({'version':'6','duration':60,'sampleRate':RATE,'channels':2,'peak':float(np.max(np.abs(mix))),'originalScore':True,'materialSpecificFoley':True,'sampleSources':'assets/sound/manifest.json','unclippedSpeech':True,'preservedReverbTails':True},indent=2))
print('60-second mix: complete performances, CC0 material Foley, original resonant score, continuous tails.')
