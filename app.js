const $=(s,p=document)=>p.querySelector(s);
const $$=(s,p=document)=>[...p.querySelectorAll(s)];
let soundOn=true,audio,activeOscillator=null,activeGame=null,score=0,level=0,locked=false,completedLevels=new Set();

const topics=[
  {name:'Transport',sprite:'assets/wordmatch-transport.png',words:[['car',0],['bus',1],['lorry',2],['train',3],['helicopter',4],['ship',5]]},
  {name:'Toys',sprite:'assets/wordmatch-toys.png',words:[['bear',0],['doll',1],['kite',2],['ball',3],['game',4],['bike',5]]},
  {name:'Room',sprite:'assets/wordmatch-room.png',words:[['lamp',0],['mat',1],['sofa',2],['table',3],['armchair',4]]}
];
const numberLevels=[
  {name:'Numbers 1–10',values:[1,2,3,4,5,6,7,8,9,10]},
  {name:'Numbers 11–21',values:[11,12,13,14,15,16,17,18,19,20,21]},
  {name:'Tens',values:[10,20,30,40,50,60,70,80,90,100]}
];
const numberWords={1:'one',2:'two',3:'three',4:'four',5:'five',6:'six',7:'seven',8:'eight',9:'nine',10:'ten',11:'eleven',12:'twelve',13:'thirteen',14:'fourteen',15:'fifteen',16:'sixteen',17:'seventeen',18:'eighteen',19:'nineteen',20:'twenty',21:'twenty-one',30:'thirty',40:'forty',50:'fifty',60:'sixty',70:'seventy',80:'eighty',90:'ninety',100:'one hundred'};
const gameNames={match:'WORD MATCH',sound:'SOUND DETECTIVE',unscramble:'UNSCRAMBLE'};
const instructions={
  match:'<span>Help Lorry Jay turn on the light to start the journey.</span><span>Open two cards. Match each English word with the correct picture.</span>',
  sound:'<span>Help Lorry Jay reach the finish line!</span><span>Press the speaker, listen carefully and choose the number you hear.</span>',
  unscramble:'<span>Help Lorry Jay pick up all the petrol cans and start the journey.</span><span>Press Listen, then choose the letters in the correct order.</span>'
};

function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function stopAudio(){speechSynthesis.cancel();if(activeOscillator){try{activeOscillator.stop()}catch{}activeOscillator=null}}
function tone(freq=440,d=.12,type='sine'){if(!soundOn)return;stopAudio();audio??=new AudioContext();let o=audio.createOscillator(),g=audio.createGain();activeOscillator=o;o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.07,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+d);o.onended=()=>{if(activeOscillator===o)activeOscillator=null}}
function speak(text){if(!soundOn)return;stopAudio();let u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.78;speechSynthesis.speak(u)}
function toggleSound(){soundOn=!soundOn;if(!soundOn)stopAudio();$$('.sound-toggle').forEach(b=>b.textContent=soundOn?'🔊 Sound':'🔇 Sound');if(soundOn)tone(520)}
$$('.sound-toggle').forEach(b=>b.onclick=toggleSound);
$$('[data-game]').forEach(b=>b.onclick=()=>startGame(b.dataset.game));

function startGame(id){
  activeGame=id;score=0;level=0;completedLevels=new Set();
  $('#score').textContent=0;$('.game-name').textContent=gameNames[id];
  $('#best').textContent=localStorage.getItem('lumen-'+id)||0;
  $('#secondary').textContent='1 / 3';$('#gameScreen').classList.add('open');
  coach("Let's play!");showLevelSelect();
}
function goHome(){$('#gameScreen').classList.remove('open');speechSynthesis.cancel()}
$('.back').onclick=goHome;$('.message-home').onclick=()=>showLevelSelect();
function hideMessage(){$('#gameMessage').classList.add('hidden')}
function message(title,text,finished=false,primaryLabel='Play again',secondaryLabel='Back to the main page',action='replay'){
  let m=$('#gameMessage');$('h2',m).textContent=title;$('p',m).textContent=text;
  $('.restart',m).textContent=primaryLabel;$('.restart',m).dataset.action=action;$('.message-home',m).textContent=secondaryLabel;
  $('.message-home',m).style.display=finished?'inline-block':'none';m.classList.toggle('final-screen',finished);m.classList.remove('hidden');
}
$('.restart').onclick=e=>{if(['match-replay','sound-replay','fuel-replay'].includes(e.currentTarget.dataset.action)){score=0;completedLevels=new Set();setScore(0);beginLevel(level)}else startGame(activeGame)};
function coach(text,good=true){let bubble=$('#jaySpeech');bubble.textContent=text;bubble.classList.toggle('try',!good)}
function setScore(n){score=n;$('#score').textContent=n}
function saveBest(){let best=Math.max(score,+(localStorage.getItem('lumen-'+activeGame)||0));localStorage.setItem('lumen-'+activeGame,best);$('#best').textContent=best}

function showLevelSelect(){
  hideMessage();let area=$('#gameArea');
  activeGame==='match'?prepareMatchTruck(5):hideMatchTruck();
  hideFuelTruck();
  area.classList.toggle('match-select',activeGame==='match');area.classList.toggle('sound-select',activeGame==='sound');area.classList.remove('match-active','sound-active');$('#matchTruckProgress').classList.toggle('selecting',activeGame==='match');
  area.innerHTML=`<div class="level-select"><p class="game-instruction">${instructions[activeGame]}</p><h2>Choose the topic</h2><div class="level-buttons"></div></div>`;
  let names=activeGame==='match'?topics.map(t=>t.name):activeGame==='sound'?numberLevels.map(t=>t.name):['Transport','Toys & Room','Numbers'];
  names.forEach((n,i)=>{let b=document.createElement('button');b.textContent=n;b.disabled=completedLevels.has(i);b.onclick=()=>beginLevel(i);$('.level-buttons',area).append(b)});
}
function beginLevel(i){level=i;$('#secondary').textContent=`${i+1} / 3`;let area=$('#gameArea');area.classList.toggle('match-active',activeGame==='match');area.classList.toggle('sound-active',activeGame==='sound');area.classList.toggle('unscramble-active',activeGame==='unscramble');area.classList.remove('match-select','sound-select');$('#matchTruckProgress').classList.remove('selecting');activeGame==='match'?matchLevel():activeGame==='sound'?soundLevel():unscrambleLevel()}
function completeLevel(){
  if(!completedLevels.has(level)){completedLevels.add(level);setScore(score+5)}saveBest();tone(760,.35);
  if(activeGame==='match'){finishMatchLevel();return}
  if(activeGame==='sound'){finishSoundLevel();return}
  if(activeGame==='unscramble'){finishFuelLevel();return}
  coach('Amazing! You made Jay happy!');message('Great job!',`You earned 5 points. Score: ${score} / 15`,true);
}

const praisePhrases=['Great!','Well done!','Good job!','Amazing!'];
function prepareMatchTruck(count){
  let panel=$('#matchTruckProgress');panel.hidden=false;$('.jay-coach').style.display='none';panel.classList.remove('party','hop');
  $('#signalLights').innerHTML='<span class="signal-lamp roof-one" aria-label="Roof light 1"></span><span class="signal-lamp roof-two" aria-label="Roof light 2"></span><span class="signal-lamp roof-three" aria-label="Roof light 3"></span><span class="signal-lamp headlight-one" aria-label="Headlight 1"></span><span class="signal-lamp headlight-two" aria-label="Headlight 2"></span>';
  $('#lampStatus').textContent=`0 of ${count} pairs`;$('#matchPraise').textContent='';$('#confetti').innerHTML='';
}
function hideMatchTruck(){$('#matchTruckProgress').hidden=true;$('.jay-coach').style.display='block';$('#confetti').innerHTML=''}
function lightMatchLamp(found,total){
  let lamps=$$('.signal-lamp');lamps.forEach((lamp,i)=>lamp.classList.toggle('on',i<found));
  $('#lampStatus').textContent=`${found} of ${total} pairs`;
  $('#matchPraise').textContent=praisePhrases[(found-1)%praisePhrases.length];
  let panel=$('#matchTruckProgress');panel.classList.remove('hop');void panel.offsetWidth;panel.classList.add('hop');setTimeout(()=>panel.classList.remove('hop'),650);
}
function finishMatchLevel(){
  let panel=$('#matchTruckProgress');panel.classList.add('party');$('#matchPraise').textContent='Amazing!';
  $('#confetti').innerHTML=Array.from({length:64},(_,i)=>`<i style="--i:${i};--x:${3+Math.random()*94}%;--delay:${Math.random()*1.8}s;--dur:${2.8+Math.random()*2.4}s;--drift:${-90+Math.random()*180}px"></i>`).join('');
  setTimeout(()=>message('All pairs found!',`You earned 5 points. Score: ${score} / 15`,true,'Play Again','Choose Another Game','match-replay'),700);
}

function matchLevel(){
  hideMessage();prepareMatchTruck(5);locked=false;let area=$('#gameArea'),chosen=shuffle(topics[level].words).slice(0,5);
  let cards=shuffle(chosen.flatMap((w,id)=>[{content:w[0],id,word:true},{content:w[1],id,word:false}]));
  area.innerHTML=`<div class="lesson-head"><h2>${topics[level].name}</h2><p><b id="pairsLeft">5</b> pairs left</p></div><h3 class="match-mission">Help Lorry Jay turn on the light to start the journey.</h3><div class="match-grid"></div>`;
  let first=null,found=0;
  cards.forEach(c=>{
    let b=document.createElement('button');b.className='match-card';b.dataset.id=c.id;b.innerHTML='<span class="card-back">⚙</span>';
    b.onclick=()=>{
      if(locked||b.classList.contains('found')||b===first)return;
      b.classList.add('open');
      if(c.word)b.innerHTML=`<span>${c.content}</span>`;
      else{let x=(c.content%3)*50,y=Math.floor(c.content/3)*100;b.innerHTML=`<span class="object-picture" style="--sprite:url('${topics[level].sprite}');--x:${x}%;--y:${y}%" role="img" aria-label="matching picture"></span>`}
      if(c.word)speak(c.content);
      if(!first){first=b;return}
      if(first.dataset.id===b.dataset.id){
        b.classList.add('found');first.classList.add('found');first=null;found++;$('#pairsLeft').textContent=5-found;tone(620);lightMatchLamp(found,5);
        if(found===5)setTimeout(completeLevel,600);
      }else{
        locked=true;tone(180);coach('Try another card!',false);let previous=first;first=null;
        setTimeout(()=>{[previous,b].forEach(x=>{x.classList.remove('open');x.innerHTML='<span class="card-back">⚙</span>'});locked=false},750);
      }
    };$('.match-grid',area).append(b);
  });
}

function soundLevel(){
  hideMessage();hideMatchTruck();$('.jay-coach').style.display='none';locked=false;
  let pool=numberLevels[level].values,questions=shuffle(pool).slice(0,5),q=0,correct=0,area=$('#gameArea');
  area.innerHTML='<div class="sound-road" id="soundRoad"><div class="road-line"><span class="start-mark">START</span><span class="finish-line"></span><img class="road-truck" src="assets/lorry-jay.png" alt="Lorry Jay on the road"></div><div class="road-progress-text" id="roadProgressText">0 / 5</div></div><div class="sound-stage"></div>';
  function moveTruck(){let road=$('#soundRoad');road.style.setProperty('--road-progress',`${5+correct*18}%`);$('#roadProgressText').textContent=`${correct} / 5`;road.classList.remove('driving');void road.offsetWidth;road.classList.add('driving')}
  function render(){
    let answer=questions[q],options=shuffle([answer,...shuffle(pool.filter(n=>n!==answer)).slice(0,3)]),stage=$('.sound-stage',area);
    stage.innerHTML='<button class="speaker">🎙️ <span>Listen again</span></button><div class="answer-grid"></div><p class="feedback" aria-live="polite"></p>';
    $('.speaker',stage).onclick=()=>speak(numberWords[answer]);
    options.forEach(n=>{let b=document.createElement('button');b.textContent=n;b.onclick=()=>{
      if(locked)return;locked=true;
      if(n===answer){
        b.classList.add('correct');correct++;let praise=praisePhrases[(correct-1)%praisePhrases.length];$('.feedback',stage).textContent=praise;tone(650);moveTruck();
        setTimeout(()=>{q++;locked=false;q<5?render():completeLevel()},950);
      }else{
        b.classList.add('wrong');$('.feedback',stage).textContent='Try again!';tone(210,.16,'triangle');
        setTimeout(()=>{b.classList.remove('wrong');locked=false},650);
      }
    };$('.answer-grid',stage).append(b)});setTimeout(()=>speak(numberWords[answer]),250);
  }moveTruck();render();
}

function finishSoundLevel(){
  let road=$('#soundRoad');road?.classList.add('finish');
  $('#confetti').innerHTML=Array.from({length:54},(_,i)=>`<i style="--i:${i};--x:${3+Math.random()*94}%;--delay:${Math.random()*1.2}s;--dur:${2.5+Math.random()*2}s;--drift:${-80+Math.random()*160}px"></i>`).join('');
  setTimeout(()=>tone(880,.4,'triangle'),120);setTimeout(()=>message('You reached the finish!','',true,'Play Again','Choose Another Game','sound-replay'),850);
}

function prepareFuelTruck(total){
  let panel=$('#fuelTruckProgress');panel.hidden=false;panel.classList.remove('ready','flash');$('.jay-coach').style.display='none';
  $('#fuelCans').innerHTML='';$('#fuelCount').textContent=`Fuel: 0/${total}`;$('#fuelPraise').textContent='';
}
function hideFuelTruck(){$('#fuelTruckProgress').hidden=true}
function addFuelCan(found,total){
  let can=document.createElement('span');can.className='fuel-can';can.style.setProperty('--can-index',found-1);can.innerHTML='<i></i>';$('#fuelCans').append(can);
  $('#fuelCount').textContent=`Fuel: ${found}/${total}`;$('#fuelPraise').textContent=praisePhrases[(found-1)%praisePhrases.length];
  let panel=$('#fuelTruckProgress');panel.classList.remove('flash');void panel.offsetWidth;panel.classList.add('flash');setTimeout(()=>panel.classList.remove('flash'),700);
}
function finishFuelLevel(){
  let panel=$('#fuelTruckProgress');panel.classList.add('ready');$('#fuelPraise').textContent='Amazing!';tone(125,.55,'sawtooth');
  setTimeout(()=>{hideFuelTruck();message('The truck is ready to go!','',true,'Play Again','Choose Another Game','fuel-replay')},900);
}

function unscrambleLevel(){
  hideMessage();hideMatchTruck();prepareFuelTruck(5);let sets=[topics[0].words,topics[1].words.concat(topics[2].words),Object.entries(numberWords).map(([n,w])=>[w,n])];
  let words=shuffle(sets[level]).slice(0,5),q=0,area=$('#gameArea');
  function render(){
    let word=words[q][0],target=word.replace(/[- ]/g,''),chars=shuffle(target.split('').map((char,id)=>({char,id}))),built=[];
    area.innerHTML=`<div class="unscramble"><p class="eyebrow">WORD ${q+1} OF 5</p><button class="listen-word">🔊 Listen</button><div class="word-slots"></div><div class="letter-bank"></div><button class="erase">← Remove a letter</button><p class="feedback" aria-live="polite"></p></div>`;
    let bank=$('.letter-bank',area),slots=$('.word-slots',area);$('.listen-word',area).onclick=()=>speak(word);setTimeout(()=>speak(word),250);
    chars.forEach(o=>{let b=document.createElement('button');b.textContent=o.char;b.onclick=()=>{
      b.disabled=true;built.push({char:o.char,button:b});slots.textContent=built.map(x=>x.char).join('');tone(380+built.length*20);
      if(built.length===target.length){
        if(slots.textContent===target){slots.classList.add('correct-word');let praise=praisePhrases[q%praisePhrases.length];$('.feedback',area).textContent=praise;addFuelCan(q+1,5);speak(word);setTimeout(()=>{q++;q<5?render():completeLevel()},900)}
        else{slots.classList.remove('wrong-word');void slots.offsetWidth;slots.classList.add('wrong-word');$('.feedback',area).textContent='Try again!'}
      }
    };bank.append(b)});
    $('.erase',area).onclick=()=>{let last=built.pop();if(last){last.button.disabled=false;slots.textContent=built.map(x=>x.char).join('');slots.classList.remove('wrong-word');$('.feedback',area).textContent=''}};
  }render();
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#gameScreen').classList.contains('open'))goHome()});
