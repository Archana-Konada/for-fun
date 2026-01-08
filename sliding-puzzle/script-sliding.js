class Timer {
  constructor(updateCb){
    this.updateCb = updateCb
    this.startTs = null
    this.elapsed = 0
    this._int = null
  }
  start(){
    if(this._int) return
    this.startTs = Date.now()
    this._int = setInterval(()=>{
      this.updateCb(this.getTime())
    },250)
  }
  stop(){
    if(!this._int) return
    clearInterval(this._int); this._int=null
    this.elapsed = this.getTime()
  }
  reset(){
    this.stop(); this.startTs=null; this.elapsed=0; this.updateCb(0)
  }
  getTime(){
    const base = this.elapsed || 0
    return base + (this.startTs? Math.floor((Date.now()-this.startTs)/1000):0)
  }
}

function formatTime(sec){
  const m = Math.floor(sec/60).toString().padStart(2,'0')
  const s = (sec%60).toString().padStart(2,'0')
  return `${m}:${s}`
}

// audio disabled: sound effects removed per user request

function isSolvable(arr){
  // General solvability check. `arr` contains numbers 1..(n-1) and 0 for blank.
  const size = arr.length
  const width = Math.sqrt(size)
  let inv = 0
  const flat = arr.filter(n=>n!==0)
  for(let i=0;i<flat.length;i++) for(let j=i+1;j<flat.length;j++) if(flat[i]>flat[j]) inv++

  if(width % 2 === 1){
    // odd grid: solvable when inversions is even
    return (inv % 2) === 0
  } else {
    // even grid: solvable when (inversions + blankRowFromBottom) is odd
    const blankIndex = arr.indexOf(0)
    const blankRowFromBottom = width - Math.floor(blankIndex/width)
    return ((inv + blankRowFromBottom) % 2) === 1
  }
}

// Solver: IDA* (iterative deepening A*) using Manhattan distance heuristic.
function solvePuzzle(startArr, maxNodes=500000){
  const size = startArr.length
  const width = Math.sqrt(size)
  const goalArr = Array.from({length:size},(_,i)=> i< size-1 ? i+1 : 0)

  function manhattan(arr){
    let sum = 0
    for(let i=0;i<size;i++){
      const v = arr[i]
      if(v===0) continue
      const goalIndex = v-1
      const r1 = Math.floor(i/width), c1 = i%width
      const r2 = Math.floor(goalIndex/width), c2 = goalIndex%width
      sum += Math.abs(r1-r2)+Math.abs(c1-c2)
    }
    return sum
  }

  // linear conflict: for each row/column, count pairs of tiles in the same line that are in each other's way
  function linearConflict(arr){
    let conflicts = 0
    // rows
    for(let r=0;r<width;r++){
      const tiles = []
      for(let c=0;c<width;c++){
        const idx = r*width + c
        const v = arr[idx]
        if(v===0) continue
        const goalIndex = v-1
        const gr = Math.floor(goalIndex/width), gc = goalIndex%width
        if(gr === r) tiles.push({curC: c, goalC: gc})
      }
      for(let i=0;i<tiles.length;i++) for(let j=i+1;j<tiles.length;j++) if(tiles[i].goalC > tiles[j].goalC) conflicts++
    }
    // columns
    for(let c=0;c<width;c++){
      const tiles = []
      for(let r=0;r<width;r++){
        const idx = r*width + c
        const v = arr[idx]
        if(v===0) continue
        const goalIndex = v-1
        const gr = Math.floor(goalIndex/width), gc = goalIndex%width
        if(gc === c) tiles.push({curR: r, goalR: gr})
      }
      for(let i=0;i<tiles.length;i++) for(let j=i+1;j<tiles.length;j++) if(tiles[i].goalR > tiles[j].goalR) conflicts++
    }
    return conflicts
  }

  function heuristic(arr){
    return manhattan(arr) + 2 * linearConflict(arr)
  }

  // Mutable copy of board for in-place moves
  const board = startArr.slice()
  let blankIdx = board.indexOf(0)

  // possible moves: offset and a guard function for validity
  const moves = [
    {off:-width, check: i => Math.floor(i/width) > 0}, // up
    {off:width,  check: i => Math.floor(i/width) < width-1}, // down
    {off:-1, check: i => (i%width) > 0}, // left
    {off:1,  check: i => (i%width) < width-1} // right
  ]

  let nodes = 0
  const path = [] // tile values moved
  const maxNodesLocal = maxNodes

  function dfs(g, threshold, prevMoveOff){
    nodes++
    if(nodes > maxNodesLocal) return {cutoff: 'limit', partial: path.slice()}
    const h = heuristic(board)
    const f = g + h
    if(h === 0) return {found: true}
    if(f > threshold) return {min: f}

    let minNext = Infinity
    // try moves in order (can be tuned)
    for(const m of moves){
      const off = m.off
      if(!m.check(blankIdx)) continue
      // avoid reversing the previous move
      if(prevMoveOff !== undefined && prevMoveOff === -off) continue
      const ti = blankIdx + off
      const tileVal = board[ti]
      // apply
      board[blankIdx] = tileVal
      board[ti] = 0
      const oldBlank = blankIdx
      blankIdx = ti
      path.push(tileVal)

      const res = dfs(g+1, threshold, off)
      if(res && res.found) return {found: true}
      if(res && res.cutoff === 'limit') return {cutoff: 'limit', partial: res.partial}
      if(res && res.min !== undefined){ if(res.min < minNext) minNext = res.min }

      // undo
      path.pop()
      board[ti] = tileVal
      board[oldBlank] = 0
      blankIdx = oldBlank
    }
    return {min: minNext}
  }

  let threshold = heuristic(board)
  if(threshold === 0) return {path: []}
  while(true){
    const res = dfs(0, threshold, undefined)
    if(res && res.found) return {path: path.slice()}
    if(res && res.cutoff === 'limit') return {error: 'limit', partial: res.partial || path.slice()}
    if(!res || res.min === Infinity) return {error: 'nosol'}
    threshold = res.min
  }
}

function generateShuffle(){
  const arr = Array.from({length:16},(_,i)=>i)
  // Fisher-Yates
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]
  }
  if(!isSolvable(arr)){
    // swap two non-zero tiles to change parity
    if(arr[0]===0 || arr[1]===0) [arr[2],arr[3]]=[arr[3],arr[2]]
    else [arr[0],arr[1]]=[arr[1],arr[0]]
  }
  return arr
}

class PlayerBoard{
  constructor(id,container){
    this.id=id
    this.container = container
    this.moves = 0
    this.timer = new Timer(t=> this.timeEl.textContent = formatTime(t))
    this.createPanel()
    this.resetBoard()
  }
  createPanel(){
    const panel = document.createElement('div'); panel.className='player-panel'
    panel.innerHTML = `
      <div class="player-header">
        <div class="player-actions">
          <button class="btn-scrabble btn-pause">Pause</button>
          <button class="btn-scrabble btn-reset">Reset</button>
        </div>
        <div class="player-info">
          <input class="name" value="Player ${this.id+1}" />
          <div class="stats">Moves: <span class="moves">0</span></div>
          <div class="stats">Time: <span class="time">00:00</span></div>
        </div>
      </div>
      <div class="board-wrap">
        <div class="board"></div>
        <div class="help-panel">
          <div class="help-actions">
            <button class="btn-scrabble btn-hint">Hint</button>
            <button class="btn-scrabble btn-solve">Solve Steps</button>
          </div>
          <div class="help-box"></div>
        </div>
      </div>
      <div class="result"></div>
    `
    this.container.appendChild(panel)
    this.boardEl = panel.querySelector('.board')
    this.movesEl = panel.querySelector('.moves')
    this.timeEl = panel.querySelector('.time')
    this.nameInput = panel.querySelector('.name')
    this.resultEl = panel.querySelector('.result')
    this.hintBox = panel.querySelector('.help-box')
    panel.querySelector('.btn-pause').addEventListener('click',()=>this.pause())
    panel.querySelector('.btn-reset').addEventListener('click',()=>this.resetBoard())
    panel.querySelector('.btn-hint').addEventListener('click',()=>this.showHint())
    panel.querySelector('.btn-solve').addEventListener('click',()=>this.showSolutionSteps())
  }
  resetBoard(){
    // default solved position: 1..15 then blank (0) at last position
    this.arr = Array.from({length:16},(_,i)=> i<15 ? i+1 : 0)
    this.initialArr = this.arr.slice()
    this.moves=0; this.movesEl.textContent='0'
    this.timer.reset(); this.timeEl.textContent='00:00'
    this.render()
    this.resultEl.textContent=''
    this.hintedTileValue = null
    this.suggestedPath = null
    if(this.hintBox) this.hintBox.textContent = ''
  }
  shuffleStart(){
    // deprecated per-player shuffle; keep for compatibility
    this.arr = generateShuffle()
    this.initialArr = this.arr.slice()
    this.moves=0; this.movesEl.textContent='0'
    this.timer.reset(); this.timeEl.textContent='00:00'
    this.started=false; this.active=false
    this.hintedTileValue = null
    this.suggestedPath = null
    if(this.hintBox) this.hintBox.textContent = ''
    this.render()
  }
  render(){
    // FLIP animation: capture previous positions
    const oldRects = new Map()
    this.boardEl.querySelectorAll('.tile').forEach(el=>{
      const v = el.dataset.value
      if(v!==undefined) oldRects.set(v, el.getBoundingClientRect())
    })

    this.boardEl.innerHTML=''
    this.arr.forEach((val,idx)=>{
      const tile = document.createElement('div')
      tile.className = 'tile' + (val===0? ' empty':'')
      tile.textContent = val===0? '': val
      tile.dataset.value = String(val)
      tile.setAttribute('tabindex','-1')
      // ensure tiles do not take focus and won't cause scroll on click
      tile.style.outline = 'none'
      tile.style.willChange = 'transform'
      tile.addEventListener('click',()=> this.onTileClick(idx))
      this.boardEl.appendChild(tile)
      // after appended, compute FLIP
      const old = oldRects.get(String(val))
      if(old){
        const newRect = tile.getBoundingClientRect()
        const dx = old.left - newRect.left
        const dy = old.top - newRect.top
        if(dx||dy){
          tile.style.transition = 'transform 320ms cubic-bezier(.2,.8,.2,1)'
          tile.style.transform = `translate(${dx}px, ${dy}px)`
          requestAnimationFrame(()=>{
            tile.style.transform = ''
          })
          tile.addEventListener('transitionend', function te(){
            tile.style.transition = ''
            tile.style.willChange = ''
            tile.removeEventListener('transitionend', te)
          })
        }
      }
    })
    // apply hint visual if requested
    if(this.hintedTileValue!==undefined && this.hintedTileValue!==null){
      this.boardEl.querySelectorAll('.tile').forEach(t=>{
        if(t.dataset.value == String(this.hintedTileValue)){
          t.style.boxShadow = '0 0 0 4px rgba(255,165,0,0.9)'
        }
      })
    }
  }
  onTileClick(idx){
    // allow clicking to start or resume the timer
    if(this.resultEl.textContent) return
    const target = this.arr[idx]
    if(target===0) return
    if(!this.active){
      // if never started, start now; if paused, resume
      if(!this.started){ this.timer.start(); this.started = true }
      else { this.timer.start() }
      this.active = true
    }
    const blankIdx = this.arr.indexOf(0)
    const neighbors = this.getNeighbors(blankIdx)
    if(neighbors.includes(idx)){
      // ensure board is valid
      if(!Array.isArray(this.arr)){
        console.error('Board array invalid in onTileClick', this.arr)
        return
      }
      // record which tile value is being moved into the blank
      const movedTile = this.arr[idx]
      // safe swap
      const tmp = this.arr[idx]
      this.arr[idx] = this.arr[blankIdx]
      this.arr[blankIdx] = tmp
      this.moves++
      this.movesEl.textContent = String(this.moves)
      if(!this.started){ this.timer.start(); this.started=true }
      // tactile feedback only
      try{ if(navigator.vibrate) navigator.vibrate(12) }catch(e){}
      // if user followed the suggested step, advance the suggestion
      if(this.suggestedPath && this.suggestedPath.length && this.suggestedPath[0] === movedTile){
        this.suggestedPath.shift()
        this.hintedTileValue = this.suggestedPath.length? this.suggestedPath[0] : null
        if(this.suggestedPath.length){
          this.hintBox.textContent = this.suggestedPath.join(' → ')
        } else {
          this.hintBox.textContent = 'Solved (or no remaining suggested steps)'
        }
      }
      this.render()
      if(this.isSolved()) this.onWin()
    }
  }

    showHint(){
    this.hintBox.textContent = 'Solving...'
    setTimeout(()=>{
      try{
        const res = solvePuzzle(this.arr, 200000)
        if(res.error){
          if(res.error==='limit'){
                if(res.partial && res.partial.length){
                  this.suggestedPath = res.partial.slice()
                  this.hintedTileValue = this.suggestedPath[0]
                  this.hintBox.textContent = `Partial (limit): ${this.suggestedPath.join(' → ')}`
                  this.render()
                } else {
                  this.hintBox.textContent = 'No result (limit reached)'
                }
          } else this.hintBox.textContent = 'No solution found'
          return
        }
        if(!res.path || !res.path.length){
          this.hintBox.textContent = 'Already solved'
          return
        }
        this.suggestedPath = res.path.slice()
        const nextTile = this.suggestedPath[0]
        this.hintedTileValue = nextTile
        this.hintBox.textContent = `Click tile ${nextTile}`
        this.render()
      }catch(e){
        this.hintBox.textContent = 'Solver error'
        console.error(e)
      }
    },10)
    }

    showSolutionSteps(){
      this.hintBox.textContent = 'Solving...'
      setTimeout(()=>{
        try{
          const res = solvePuzzle(this.arr, 200000)
          if(res.error){
            if(res.error==='limit'){
              if(res.partial && res.partial.length){
                this.suggestedPath = res.partial.slice()
                this.hintedTileValue = this.suggestedPath[0]
                this.hintBox.textContent = `Partial (limit): ${this.suggestedPath.join(' → ')}`
                this.render()
              } else {
                this.hintBox.textContent = 'No result (limit reached)'
              }
            } else this.hintBox.textContent = 'No solution found'
            return
          }
          if(!res.path || !res.path.length){
            this.hintBox.textContent = 'Already solved'
            return
          }
          this.suggestedPath = res.path.slice()
          this.hintedTileValue = this.suggestedPath[0]
          this.hintBox.textContent = this.suggestedPath.join(' → ')
          this.render()
        }catch(e){
          this.hintBox.textContent = 'Solver error'
          console.error(e)
        }
      },10)
    }
  getNeighbors(i){
    const r=Math.floor(i/4), c=i%4
    const res=[]
    if(r>0) res.push(i-4)
    if(r<3) res.push(i+4)
    if(c>0) res.push(i-1)
    if(c<3) res.push(i+1)
    return res
  }
  isSolved(){
    for(let i=0;i<15;i++) if(this.arr[i]!==i+1) return false
    return this.arr[15]===0
  }
  onWin(){
    this.timer.stop()
    this.resultEl.innerHTML = `<div class="won">Solved in ${this.moves} moves · ${formatTime(this.timer.getTime())}</div>`
  }

  // Apply a shared starting array (same puzzle for all players)
  applyShared(startArr, autoStart=false){
    this.initialArr = startArr.slice()
    this.arr = startArr.slice()
    this.moves = 0; this.movesEl.textContent='0'
    this.timer.reset(); this.timeEl.textContent='00:00'
    this.started = false
    this.active = !!autoStart
    if(autoStart){ this.timer.start(); this.started=true }
    this.resultEl.textContent=''
    this.render()
  }

  pause(){
    this.active = false
    this.timer.stop()
  }
  
}

// UI wiring
document.addEventListener('DOMContentLoaded',()=>{
  const playerCountEl = document.getElementById('playerCount')
  // sound UI removed; audio playback disabled
  const shuffleAll = document.getElementById('shuffleAll')
  const playersContainer = document.getElementById('playersContainer')
  let boards = []
  let sharedStart = null

  function createPlayers(n){
    playersContainer.innerHTML=''
    boards = []
    for(let i=0;i<n;i++){
      boards.push(new PlayerBoard(i,playersContainer))
    }
    // mark single-player layout
    if(n===1) playersContainer.classList.add('single-player')
    else playersContainer.classList.remove('single-player')
    // if there's an existing shared start, apply it to all newly-created players
    if(sharedStart) boards.forEach(b=>b.applyShared(sharedStart, false))
  }

  // create players when the player count input changes
  playerCountEl.addEventListener('input',()=>{
    const n = Math.min(6, Math.max(1, parseInt(playerCountEl.value||1)))
    playerCountEl.value = n
    createPlayers(n)
  })

  // universal shuffle: create one solvable puzzle and apply to all players
  shuffleAll.addEventListener('click',()=>{
    sharedStart = generateShuffle()
    boards.forEach(b=>b.applyShared(sharedStart, false))
  })

  // create default
  createPlayers(parseInt(playerCountEl.value||1))
})

// audio removed per user request
