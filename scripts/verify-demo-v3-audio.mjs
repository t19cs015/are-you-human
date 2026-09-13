import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {defaults} from '../server/config.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),build=root+'data/film-v3/';
// The opening deliberately overlaps voices; verify the clear narration and
// gameplay dialogue independently after that authored crowd scene.
execFileSync('ffmpeg',['-y','-v','error','-ss','8.4','-i',build+'master.wav','-t','51.6','-ac','1',build+'verification-voice.wav']);
const form=new FormData();form.set('model','gpt-4o-mini-transcribe');
form.set('file',new File([await readFile(build+'verification-voice.wav')],'v3.wav',{type:'audio/wav'}));
const response=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:'Bearer '+defaults.key},body:form,signal:AbortSignal.timeout(60000)});
if(!response.ok)throw new Error('Audio verification failed: HTTP '+response.status);
const transcript=await response.json(),script=JSON.parse(await readFile(root+'art/timelapse/v3-script.json','utf8'));
const normalized=text=>text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
const expected=script.segments.filter(s=>s.start>=8.4).map(s=>s.text).join(' '),matches=normalized(transcript.text)===normalized(expected);
await writeFile(build+'narration-verification.json',JSON.stringify({matches,range:'8.4–60 seconds; opening voices intentionally overlap',expected,transcript:transcript.text},null,2));
console.log(matches?'Narration and gameplay dialogue match independent transcription.':'Inspect data/film-v3/narration-verification.json for transcript differences.');
