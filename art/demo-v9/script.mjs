// Leave room for the complete delivery, including breaths and the final consonant.
export function v9Script(replay){
  const direction={NARRATOR:'A warm, quietly delighted guide talking beside a friend. Connected, conversational phrasing with a smile, gently forward-moving. Let each thought flow; this is not an advertisement.',CENTRAL:'Calm, kind, composed and reassuring. A welcoming presence, with a tiny thoughtful pause and a soft, fully finished ending.',TOMO:'An openhearted, curious small-town friend. Speak with a relaxed smile and natural connected speech. A real conversational response, never an announcer or a robotic voice.','YOUR VOICE':'A friendly invitation to someone you know. Easy, sincere, conversational, with a slight smile.',MIA:'You have just noticed a newcomer. A warm little intake of surprise, then a delighted smile in your voice.',SHELL:'Quietly amused curiosity. You are calling gently to someone across a small square.',REN:'Welcoming a newcomer through a small group of friends, casually and cheerfully.'};
  const line=(id,who,start,end,voice,text,extra={})=>({id,who,start,end,voice,text,instructions:`Natural spoken English. ${direction[who]} Read the entire line as one connected thought. Preserve natural articulation and finish the last word clearly. No music or sound effects.`,...extra});
  return {title:'Words You Keep — Demo v9',duration:60,segments:[
    line('new','MIA',.65,2.8,'shimmer','Oh, someone new!',{pan:-.55}),
    line('look','TOMO',1.5,3.5,'coral','Look, look!',{pan:.52,gain:.72,crowd:true}),
    line('shell','SHELL',2.1,4.5,'cedar','A visitor? Over here.',{pan:-.28,gain:.55,crowd:true}),
    line('ren','REN',3.05,4.9,'ash','Make some room!',{pan:.7,gain:.6,crowd:true}),
    line('hello','TOMO',4.35,6.2,'coral','Hey, come on over!',{pan:.1}),
    line('play','NARRATOR',6.5,11.8,'cedar','Welcome to a little town with a lot to discover.'),
    line('promise','TOMO',12.35,14.4,'coral','Meet me by the lights!'),
    line('sync','CENTRAL',14.55,16.45,'marin','Refreshing memories.'),
    line('forgot','TOMO',16.6,19.1,'coral','Oh, hi. Have we met?'),
    line('choose','NARRATOR',19.75,24.25,'cedar','Pick a memory, and put what matters first.'),
    line('write','NARRATOR',25.0,29.0,'cedar','Or rewrite it in your own words.'),
    line('player','YOUR VOICE',30.95,35.55,'ash',replay.dialogue.player),
    // Tomo's full recorded response continues naturally across the travel cut.
    line('answer','TOMO',35.7,41.5,'coral',replay.dialogue.resident),
    line('agency','NARRATOR',41.8,46.1,'cedar','Your memories shape your words. Their choices shape the town.'),
    line('keep','CENTRAL',46.45,49.25,'marin',"A moment worth keeping. I'll pass it on."),
    line('remember','TOMO',53.5,56.0,'coral','Will you remember this?'),
  ]};
}
