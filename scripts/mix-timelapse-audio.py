"""An original lullaby that acquires a quiet machine undertone, with English VO."""
from pathlib import Path
import sys
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RATE = 48000
ARRIVAL = '--arrival' in sys.argv
V3 = '--v3' in sys.argv
DURATION = 60 if ARRIVAL or V3 else 24
DIRECTORY = ROOT / ('data/film-v3' if V3 else 'data/arrival-film' if ARRIVAL else 'data/timelapse')
COUNT = RATE * DURATION
with wave.open(str(DIRECTORY / 'narration.wav'), 'rb') as source:
    assert source.getnchannels() == (2 if V3 else 1) and source.getframerate() == RATE
    voice = np.frombuffer(source.readframes(source.getnframes()), dtype='<i2').astype(float) / 32768
    if V3:
        voice = voice.reshape(-1, 2)
assert len(voice) == COUNT
music = np.zeros((COUNT, 2))

def note(midi, start, duration=3, level=.033, pan=0, detune=0):
    begin = int(start * RATE)
    size = min(int(duration * RATE), COUNT - begin)
    if size <= 0:
        return
    t = np.arange(size) / RATE
    hz = 440 * 2 ** ((midi - 69 + detune / 100) / 12)
    tone = (np.sin(2*np.pi*hz*t) * np.exp(-t/1.9)
            + .20*np.sin(2*np.pi*hz*2.002*t) * np.exp(-t/.65)
            + .045*np.sin(2*np.pi*hz*3.01*t) * np.exp(-t/.3))
    tone *= np.minimum(t/.024, 1) * np.minimum((duration-t)/.25, 1) * level
    for delay, amount in [(0, 1), (.21, .19), (.47, .10), (.77, .065)]:
        at = begin + int(delay * RATE)
        length = min(size, COUNT-at)
        if length > 0:
            music[at:at+length, 0] += tone[:length]*amount*np.sqrt((1-pan)/2)
            music[at:at+length, 1] += tone[:length]*amount*np.sqrt((1+pan)/2)

# Keep the same small, friendly melody even as the skyline grows too large.
melody = [72, 76, 79, 76, 74, 72, 67, 71]
for i in range(int(DURATION/.72)):
    start = .1 + i*.72
    note(melody[i % 8], start, 3.2, .026, -.3 + (i % 3)*.3)
    uneasy = 14 < start < 25 if V3 else 27 < start < 43 if ARRIVAL else start > 12
    if uneasy:
        note(melody[i % 8], start+.035, 3.1, .004, .35, -13)
chords = [[48,55,64], [45,52,60], [41,48,59], [45,52,59]]
for bar in range(int(DURATION/5.76)+1):
    chord = chords[bar % 4] if (not ARRIVAL and not V3) or bar < (5 if V3 else 8) else [48,55,64]
    for i, pitch in enumerate(chord):
        note(pitch, bar*5.76+i*.18, 6.5, .023, (i-1)*.35)

t = np.arange(COUNT)/RATE
growth = np.clip((t-(13 if V3 else 21 if ARRIVAL else 5))/(8 if V3 else 15), 0, 1)
growth = growth*growth*(3-2*growth)
if ARRIVAL or V3:
    growth *= 1-.65*np.clip((t-(27 if V3 else 43))/8, 0, 1)
    # Little mechanical murmurs follow the residents' successive glances.
    for at, pitch in [(1.05,79),(1.53,74),(1.91,83),(2.34,76)]:
        note(pitch, at, .26, .024, -.45+(at-1)*.6)
        note(pitch-5, at+.12, .23, .016, -.45+(at-1)*.6)
if V3:
    # Soft approaching footsteps and a little bustle around the listener.
    rng = np.random.default_rng(37)
    for i, at in enumerate(np.arange(.15, 4.7, .57)):
        size = int(.10*RATE)
        step_t = np.arange(size)/RATE
        step = (rng.standard_normal(size)*.025 + np.sin(2*np.pi*93*step_t)*.035)*np.exp(-step_t*65)
        begin = int(at*RATE)
        music[begin:begin+size, i % 2] += step
    for at in [32.0, 40.4, 46.2]:
        for i, pitch in enumerate([67,72,76]):
            note(pitch, at+i*.10, 1.4, .010, (i-1)*.2)
# A restrained fan/drone, never a sting: warm music remains audible throughout.
hum = (np.sin(2*np.pi*55*t)*.021 + np.sin(2*np.pi*110.35*t)*.009
       + np.sin(2*np.pi*164.8*t)*.004) * growth
music[:, 0] += hum*(.9+.1*np.sin(t*.47))
music[:, 1] += hum*(.9+.1*np.cos(t*.43))
window = 2400
cs = np.concatenate(([0.], np.cumsum(np.abs(voice).mean(axis=1) if V3 else np.abs(voice))))
envelope = (cs[np.minimum(np.arange(COUNT)+window, COUNT)]-cs[np.arange(COUNT)])/window
music *= (1-.55*np.clip(envelope/.028, 0, 1))[:, None]
music *= np.minimum(t/1.1, 1)[:, None]*np.minimum((DURATION-t)/.7, 1)[:, None]
mixed = (voice if V3 else voice[:, None]) + music
mixed *= np.minimum((DURATION-t)/.3, 1)[:, None]
peak = np.max(np.abs(mixed))
mixed *= .83/max(peak, .01)
with wave.open(str(DIRECTORY/'mix.wav'), 'wb') as output:
    output.setnchannels(2)
    output.setsampwidth(2)
    output.setframerate(RATE)
    output.writeframes(np.round(np.clip(mixed, -1, 1)*32767).astype('<i2').tobytes())
print(f'{DURATION}.00-second stereo score mixed. Original synthesized music and machine ambience.')
