const $=(s,p=document)=>p.querySelector(s);
const $$=(s,p=document)=>[...p.querySelectorAll(s)];
let soundOn=true,audio,activeGame=null,score=0,level=0,locked=false,completedLevels=new Set();

const topics=[
  {name:'Transport',words:[['car','🚗'],['bus','🚌'],['lorry','🚚'],['train','🚂'],['helicopter','🚁'],['ship','🚢']]},
  {name:'Toys',words:[['bear','🧸'],['doll','🪆'],['kite','🪁'],['ball','⚽'],['game','🎮'],['bike','🚲']]},
  {name:'Room',words:[['lamp','💡'],['mat','🟫'],['sofa','🛋️'],['table','🪵'],['armchair','🪑']]}
];
const numberLevels=[
  {name:'Numbers 1–10',values:[1,2,3,4,5,6,7,8,9,10]},
  {name:'Numbers 11–21',values:[11,12,13,14,15,16,17,18,19,20,21]},
  {name:'Tens',values:[10,20,30,40,50,60,70,80,90,100]}
];
const numberWords={1:'one',2:'two',3:'three',4:'four',5:'five',6:'six',7:'seven',8:'eight',9:'nine',10:'ten',11:'eleven',12:'twelve',13:'thirteen',14:'fourteen',15:'fifteen',16:'sixteen',17:'seventeen',18:'eighteen',19:'nineteen',20:'twenty',21:'twenty-one',30:'thirty',40:'forty',50:'fifty',60:'sixty',70:'seventy',80:'eighty',90:'ninety',100:'one hundred'};
const gameNames={match:'WORD MATCH',sound:'SOUND DETECTIVE',unscramble:'UNSCRAMBLE'};
const instructions={
  match:'Open two cards. Match each English word with the correct picture.',
  sound:'Press the speaker, listen carefully and choose the number you hear.',
  unscramble:'Press Listen, then choose the letters in the correct order.'
};

function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function tone(freq=440,d=.12,type='sine'){if(!soundOn)return;audio??=new AudioContext();let o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.07,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+d)}
function speak(text){if(!soundOn)return;speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.78;speechSynthesis.speak(u)}
function toggleSound(){soundOn=!soundOn;$$('.sound-toggle').forEach(b=>b.textContent=soundOn?'🔊 Sound':'🔇 Sound');tone(520)}
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
$('.back').onclick=goHome;$('.message-home').onclick=goHome;
function hideMessage(){$('#gameMessage').classList.add('hidden')}
function message(title,text,finished=false){
  let m=$('#gameMessage');$('h2',m).textContent=title;$('p',m).textContent=text;
  $('.restart',m).textContent='Play again';$('.restart',m).dataset.action='replay';
  $('.message-home',m).style.display=finished?'inline-block':'none';m.classList.remove('hidden');
}
$('.restart').onclick=()=>startGame(activeGame);
function coach(text,good=true){let bubble=$('#jaySpeech');bubble.textContent=text;bubble.classList.toggle('try',!good)}
function setScore(n){score=n;$('#score').textContent=n}
function saveBest(){let best=Math.max(score,+(localStorage.getItem('lumen-'+activeGame)||0));localStorage.setItem('lumen-'+activeGame,best);$('#best').textContent=best}

function showLevelSelect(){
  hideMessage();let area=$('#gameArea');
  area.innerHTML=`<div class="level-select"><p class="game-instruction">${instructions[activeGame]}</p><h2>Choose a level</h2><div class="level-buttons"></div></div>`;
  let names=activeGame==='match'?topics.map(t=>t.name):activeGame==='sound'?numberLevels.map(t=>t.name):['Transport','Toys & Room','Numbers'];
  names.forEach((n,i)=>{let b=document.createElement('button');b.innerHTML=`<span>${completedLevels.has(i)?'✓':'0'+(i+1)}</span>${n}`;b.disabled=completedLevels.has(i);b.onclick=()=>beginLevel(i);$('.level-buttons',area).append(b)});
}
function beginLevel(i){level=i;$('#secondary').textContent=`${i+1} / 3`;activeGame==='match'?matchLevel():activeGame==='sound'?soundLevel():unscrambleLevel()}
function completeLevel(){
  if(!completedLevels.has(level)){completedLevels.add(level);setScore(score+5)}saveBest();tone(760,.35);
  coach('Amazing! You made Jay happy!');message('Great job!',`You earned 5 points. Score: ${score} / 15`,true);
}

function matchLevel(){
  hideMessage();locked=false;let area=$('#gameArea'),chosen=shuffle(topics[level].words).slice(0,5);
  let cards=shuffle(chosen.flatMap((w,id)=>[{content:w[0],id,word:true},{content:w[1],id,word:false}]));
  area.innerHTML=`<div class="lesson-head"><h2>${topics[level].name}</h2><p><b id="pairsLeft">5</b> pairs left</p></div><div class="match-grid"></div>`;
  let first=null,found=0;
  cards.forEach(c=>{
    let b=document.createElement('button');b.className='match-card';b.dataset.id=c.id;b.innerHTML='<span class="card-back">⚙</span>';
    b.onclick=()=>{
      if(locked||b.classList.contains('found')||b===first)return;
      b.classList.add('open');b.innerHTML=c.word?`<span>${c.content}</span><i>WORD</i>`:`<span class="picture">${c.content}</span><i>PICTURE</i>`;
      if(c.word)speak(c.content);
      if(!first){first=b;return}
      if(first.dataset.id===b.dataset.id){
        b.classList.add('found');first.classList.add('found');first=null;found++;$('#pairsLeft').textContent=5-found;tone(620);coach('Great match!');
        if(found===5)setTimeout(completeLevel,600);
      }else{
        locked=true;tone(180);coach('Try another card!',false);let previous=first;first=null;
        setTimeout(()=>{[previous,b].forEach(x=>{x.classList.remove('open');x.innerHTML='<span class="card-back">⚙</span>'});locked=false},750);
      }
    };$('.match-grid',area).append(b);
  });
}

function soundLevel(){
  hideMessage();let pool=numberLevels[level].values,questions=shuffle(pool).slice(0,5),q=0,area=$('#gameArea');
  function render(){
    let answer=questions[q],options=shuffle([answer,...shuffle(pool.filter(n=>n!==answer)).slice(0,3)]);
    area.innerHTML=`<div class="sound-game"><p class="eyebrow">QUESTION ${q+1} OF 5</p><button class="speaker">🔊</button><h2>Which number did you hear?</h2><div class="answer-grid"></div><p class="feedback">You can listen again</p></div>`;
    $('.speaker',area).onclick=()=>speak(numberWords[answer]);
    options.forEach(n=>{let b=document.createElement('button');b.textContent=n;b.onclick=()=>{
      if(locked)return;locked=true;
      if(n===answer){b.classList.add('correct');$('.feedback',area).textContent=`Well done! ${numberWords[answer]}`;coach('Well done!');tone(650)}
      else{b.classList.add('wrong');$('.feedback',area).textContent=`The answer is ${answer} — ${numberWords[answer]}`;coach('Good try! Listen again.',false);tone(170);$$('.answer-grid button',area).find(x=>+x.textContent===answer).classList.add('correct')}
      setTimeout(()=>{locked=false;q++;q<5?render():completeLevel()},1100);
    };$('.answer-grid',area).append(b)});setTimeout(()=>speak(numberWords[answer]),300);
  }render();
}

function unscrambleLevel(){
  hideMessage();let sets=[topics[0].words,topics[1].words.concat(topics[2].words),Object.entries(numberWords).map(([n,w])=>[w,n])];
  let words=shuffle(sets[level]).slice(0,5),q=0,area=$('#gameArea');
  function render(){
    let word=words[q][0],target=word.replace(/[- ]/g,''),chars=shuffle(target.split('').map((char,id)=>({char,id}))),built=[];
    area.innerHTML=`<div class="unscramble"><p class="eyebrow">WORD ${q+1} OF 5</p><button class="listen-word">🔊 Listen</button><div class="word-slots"></div><div class="letter-bank"></div><button class="erase">← Remove a letter</button><p class="feedback">Choose the letters in the correct order</p></div>`;
    let bank=$('.letter-bank',area),slots=$('.word-slots',area);$('.listen-word',area).onclick=()=>speak(word);setTimeout(()=>speak(word),250);
    chars.forEach(o=>{let b=document.createElement('button');b.textContent=o.char;b.onclick=()=>{
      b.disabled=true;built.push({char:o.char,button:b});slots.textContent=built.map(x=>x.char).join('');tone(380+built.length*20);
      if(built.length===target.length){
        if(slots.textContent===target){slots.classList.add('correct-word');$('.feedback',area).textContent='Perfect spelling!';coach('Perfect spelling!');speak(word);setTimeout(()=>{q++;q<5?render():completeLevel()},900)}
        else{$('.feedback',area).textContent='Almost! Remove a letter and try again.';coach('Almost! Try again.',false)}
      }
    };bank.append(b)});
    $('.erase',area).onclick=()=>{let last=built.pop();if(last){last.button.disabled=false;slots.textContent=built.map(x=>x.char).join('');$('.feedback',area).textContent='Choose the letters in the correct order'}};
  }render();
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#gameScreen').classList.contains('open'))goHome()});
