const cells = Array.from(document.querySelectorAll('.cell'))
const statusEl = document.getElementById('status')
const restartBtn = document.getElementById('restart')
const applyBtn = document.getElementById('apply')

const p1NameInput = document.getElementById('p1-name')
const p2NameInput = document.getElementById('p2-name')
const p1IconInput = document.getElementById('p1-icon')
const p2IconInput = document.getElementById('p2-icon')
const p1Label = document.getElementById('p1-label')
const p2Label = document.getElementById('p2-label')
const p1ScoreEl = document.getElementById('p1-score')
const p2ScoreEl = document.getElementById('p2-score')
const drawScoreEl = document.getElementById('draw-score')
const resetScoresBtn = document.getElementById('reset-scores')

const winningCombos = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
]

let players = [
  {name: 'Player 1', icon: 'X', color: '#ff4d4d'},
  {name: 'Player 2', icon: 'O', color: '#3273ff'}
]

let board = Array(9).fill(null) // store 0 or 1 for players, null = empty
let current = 0
let starter = 0 // which player should start the next game
let running = true

function updateStatus(){
  if(!running) return
  const p = players[current]
  statusEl.textContent = `Current: ${p.name} (${p.icon})`
}

function checkWin(){
  for(const combo of winningCombos){
    const [a,b,c] = combo
    if(board[a] !== null && board[a] === board[b] && board[a] === board[c]){
      return {winnerIndex: board[a], combo}
    }
  }
  if(board.every(v => v !== null)) return {draw:true}
  return null
}

function handleCellClick(e){
  const el = e.currentTarget
  const idx = Number(el.dataset.index)
  if(!running || board[idx] !== null) return
  board[idx] = current
  render()
  const result = checkWin()
  if(result && result.winnerIndex !== undefined){
    running = false
    const winner = players[result.winnerIndex]
    statusEl.textContent = `Winner: ${winner.name} (${winner.icon})`
    // highlight winning cells and celebrate
    result.combo.forEach(i=>{
      cells[i].classList.add('win')
      cells[i].classList.add('celebrate')
    })
    cells.forEach(c=>c.classList.add('disabled'))
    const boardEl = document.querySelector('.board')
    boardEl.classList.add('celebration')
    spawnConfetti(winner.color)
    // record winner in persistent scoreboard
    incrementWin(winner.name)
    // rotate who starts next
    starter = 1 - starter
    // remove celebration class after animation
    setTimeout(()=>{ boardEl.classList.remove('celebration') }, 1200)
    return
  }
  if(result && result.draw){
    running = false
    statusEl.textContent = `Draw`
    // record draw
    incrementDraw()
    // rotate who starts next
    starter = 1 - starter
    return
  }
  current = 1 - current
  updateStatus()
}

function render(){
  cells.forEach((cell,i)=>{
    const v = board[i]
    if(v === null){
      cell.textContent = ''
      cell.style.color = ''
      cell.classList.remove('disabled')
    } else {
      cell.textContent = players[v].icon
      cell.style.color = players[v].color
      cell.classList.add('disabled')
    }
  })
}

function restart(){
  board.fill(null)
  current = starter
  running = true
  cells.forEach(c=>{
    c.classList.remove('win')
    c.classList.remove('disabled')
    c.classList.remove('celebrate')
    c.style.removeProperty('color')
  })
  const boardEl = document.querySelector('.board')
  if(boardEl) boardEl.classList.remove('celebration')
  // remove any confetti pieces immediately when restarting
  document.querySelectorAll('.confetti-piece').forEach(p=>p.remove())
  updateStatus()
  render()
}

function applySettings(){
  const p1n = (p1NameInput.value || 'Player 1').trim()
  const p2n = (p2NameInput.value || 'Player 2').trim()
  const p1i = (p1IconInput.value || 'X').trim() || 'X'
  const p2i = (p2IconInput.value || 'O').trim() || 'O'
  // keep existing colors (defaults) and update name/icon
  players[0] = Object.assign(players[0] || {}, {name: p1n, icon: p1i})
  players[1] = Object.assign(players[1] || {}, {name: p2n, icon: p2i})
  // update scoreboard labels
  p1Label.textContent = players[0].name
  p2Label.textContent = players[1].name
  refreshScoresUI()
  restart()
}

// apply icon/color changes live without needing Apply
// Ensure players cannot pick the same icon. Disable the chosen option in the other select
function findFirstAvailable(selectEl, excludeValue){
  for(const opt of Array.from(selectEl.options)){
    if(opt.value !== excludeValue && !opt.disabled) return opt.value
  }
  // fallback to first different value
  for(const opt of Array.from(selectEl.options)){
    if(opt.value !== excludeValue) return opt.value
  }
  return selectEl.value
}

function updateIconOptionStates(){
  const v1 = p1IconInput.value
  const v2 = p2IconInput.value
  // enable all first
  Array.from(p1IconInput.options).forEach(o=>o.disabled = false)
  Array.from(p2IconInput.options).forEach(o=>o.disabled = false)
  // disable the option in the opposite select to prevent duplicates
  Array.from(p1IconInput.options).forEach(o=>{ if(o.value === v2) o.disabled = true })
  Array.from(p2IconInput.options).forEach(o=>{ if(o.value === v1) o.disabled = true })
}

p1IconInput.addEventListener('change', ()=>{
  const val = p1IconInput.value
  // if p2 currently has the same value, pick another for p2
  if(p2IconInput.value === val){
    const next = findFirstAvailable(p2IconInput, val)
    p2IconInput.value = next
    players[1].icon = next
  }
  players[0].icon = val
  updateIconOptionStates()
  render()
})

p2IconInput.addEventListener('change', ()=>{
  const val = p2IconInput.value
  if(p1IconInput.value === val){
    const next = findFirstAvailable(p1IconInput, val)
    p1IconInput.value = next
    players[0].icon = next
  }
  players[1].icon = val
  updateIconOptionStates()
  render()
})
// no color inputs anymore; colors are internal defaults

// reflect name changes live on scoreboard labels so leaderboard matches input without pressing Apply
p1NameInput.addEventListener('input', ()=>{
  const name = (p1NameInput.value || 'Player 1').trim()
  players[0].name = name
  p1Label.textContent = name
  refreshScoresUI()
  // update status or winner label live
  const result = checkWin()
  if(!running){
    if(result && result.winnerIndex !== undefined){
      const winner = players[result.winnerIndex]
      statusEl.textContent = `Winner: ${winner.name} (${winner.icon})`
    } else if(result && result.draw){
      statusEl.textContent = `Draw`
    }
  } else {
    updateStatus()
  }
})

p2NameInput.addEventListener('input', ()=>{
  const name = (p2NameInput.value || 'Player 2').trim()
  players[1].name = name
  p2Label.textContent = name
  refreshScoresUI()
  const result = checkWin()
  if(!running){
    if(result && result.winnerIndex !== undefined){
      const winner = players[result.winnerIndex]
      statusEl.textContent = `Winner: ${winner.name} (${winner.icon})`
    } else if(result && result.draw){
      statusEl.textContent = `Draw`
    }
  } else {
    updateStatus()
  }
})

// confetti: spawn many small colored pieces that fall
function spawnConfetti(primaryColor){
  const container = document.querySelector('.container')
  const colors = [primaryColor, '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#c77dff']
  const count = 36
  const pieces = []
  for(let i=0;i<count;i++){
    const el = document.createElement('div')
    el.className = 'confetti-piece'
    const size = 6 + Math.floor(Math.random()*10)
    el.style.width = size + 'px'
    el.style.height = Math.max(6, size-2) + 'px'
    el.style.left = Math.floor(Math.random()*100) + '%'
    el.style.top = (-5 - Math.random()*10) + 'vh'
    el.style.background = colors[Math.floor(Math.random()*colors.length)]
    el.style.transform = `rotate(${Math.floor(Math.random()*360)}deg)`
    el.style.animationDelay = (Math.random()*300) + 'ms'
    container.appendChild(el)
    pieces.push(el)
  }
  // cleanup after animation
  setTimeout(()=>{
    pieces.forEach(p=>p.remove())
  }, 2000)
}

// -- scoreboard persistence --
const STORAGE_KEY = 'tictactoe_scores_v1'

function loadScores(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY)
    if(!raw) return {players: {}, draws:0}
    return JSON.parse(raw)
  }catch(e){
    return {players:{}, draws:0}
  }
}

function saveScores(data){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }catch(e){}
}

function incrementWin(playerName){
  const data = loadScores()
  data.players = data.players || {}
  data.players[playerName] = (data.players[playerName] || 0) + 1
  saveScores(data)
  refreshScoresUI()
}

function incrementDraw(){
  const data = loadScores()
  data.draws = (data.draws || 0) + 1
  saveScores(data)
  refreshScoresUI()
}

function refreshScoresUI(){
  const data = loadScores()
  const p1n = players[0].name
  const p2n = players[1].name
  p1ScoreEl.textContent = data.players && data.players[p1n] ? data.players[p1n] : 0
  p2ScoreEl.textContent = data.players && data.players[p2n] ? data.players[p2n] : 0
  drawScoreEl.textContent = data.draws || 0
}

function resetScores(){
  const data = {players:{}, draws:0}
  saveScores(data)
  refreshScoresUI()
}

resetScoresBtn.addEventListener('click', ()=>{
  if(confirm('Reset all saved scores?')) resetScores()
})

// initialize scoreboard labels and values on load (use current input values so names reflect immediately)
p1Label.textContent = (p1NameInput.value || players[0].name)
p2Label.textContent = (p2NameInput.value || players[1].name)
refreshScoresUI()

cells.forEach(cell=>{
  cell.addEventListener('click', handleCellClick)
  cell.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCellClick({currentTarget: cell}) }
  })
})

restartBtn.addEventListener('click', restart)
applyBtn.addEventListener('click', applySettings)

updateStatus()
render()