"""Original, quiet instrumental score and narration mix. No sampled music."""
from pathlib import Path
import numpy as np
import wave

ROOT=Path(__file__).resolve().parents[1]
RATE=48000
COUNT=RATE*60
with wave.open(str(ROOT/'data/film/narration.wav'),'rb') as source:
    assert source.getnchannels()==1 and source.getframerate()==RATE
    voice=np.frombuffer(source.readframes(source.getnframes()),dtype='<i2').astype(np.float64)/32768
assert len(voice)==COUNT
music=np.zeros((COUNT,2),np.float64)

def note(midi,start,duration=3.5,level=.022,pan=0):
    length=min(int(duration*RATE),COUNT-int(start*RATE))
    if length<=0:return
    t=np.arange(length)/RATE
    hz=440*2**((midi-69)/12)
    # A soft felt-key sound: three decaying partials, rounded attack, a quiet tail.
    sound=(np.sin(2*np.pi*hz*t)*np.exp(-t/1.8)+.24*np.sin(2*np.pi*hz*2.003*t)*np.exp(-t/.65)+.07*np.sin(2*np.pi*hz*3.008*t)*np.exp(-t/.35))
    sound*=np.minimum(t/.025,1)*np.minimum((duration-t)/.25,1)*level
    start=int(start*RATE)
    for delay,amount in [(0,1),(.17,.2),(.39,.12),(.68,.07)]:
        pos=start+int(delay*RATE);size=min(length,COUNT-pos)
        if size>0:music[pos:pos+size,0]+=sound[:size]*amount*np.sqrt((1-pan)/2);music[pos:pos+size,1]+=sound[:size]*amount*np.sqrt((1+pan)/2)

progression=[[48,55,59,64],[45,52,55,60],[41,48,52,57],[43,50,55,60],[48,55,59,64],[45,52,55,60],[41,48,52,57],[48,55,60,64]]
for bar,chord in enumerate(progression):
    at=bar*7.5
    for i,pitch in enumerate(chord):note(pitch,at+i*.48,5.8,.016 if i else .026,(-.3+i*.2))
    note(chord[2]+12,at+3.5,3,.016,.4)
    note(chord[3]+12,at+5,3,.011,-.25)
for base in [23.1,43.15,54.2]:
    for i,pitch in enumerate([67,72,76]):note(pitch,base+i*.18,3,.022,.2-i*.2)

# Duck the music under speech, with gentle transitions.
window=2400
cs=np.concatenate(([0.],np.cumsum(np.abs(voice))))
envelope=(cs[np.minimum(np.arange(COUNT)+window,COUNT)]-cs[np.arange(COUNT)])/window
duck=1-.62*np.clip(envelope/.025,0,1)
music*=duck[:,None]
fade_in=np.minimum(np.arange(COUNT)/RATE/1.1,1)
fade_out=np.minimum((COUNT-np.arange(COUNT))/RATE/.9,1)
mixed=voice[:,None]+music*fade_in[:,None]*fade_out[:,None]
mixed*=np.minimum((COUNT-np.arange(COUNT))/RATE/.35,1)[:,None]
peak=np.max(np.abs(mixed))
if peak>.9:mixed*=.9/peak
with wave.open(str(ROOT/'data/film/mix.wav'),'wb') as out:
    out.setnchannels(2);out.setsampwidth(2);out.setframerate(RATE);out.writeframes(np.round(np.clip(mixed,-1,1)*32767).astype('<i2').tobytes())
print(f'Mixed 60.00s stereo; peak {20*np.log10(np.max(np.abs(mixed))):.1f} dBFS. Original score by procedural synthesis.')
