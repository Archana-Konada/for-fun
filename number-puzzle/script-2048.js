document.addEventListener('DOMContentLoaded', ()=>{
  const SIZE = 4
  let grid = Array(SIZE).fill(0).map(()=>Array(SIZE).fill(0))
  let score = 0
  const boardEl = document.getElementById('board')
  const scoreEl = document.getElementById('score')
  const bestBadgeEl = document.getElementById('best-badge')
  const timeEl = document.getElementById('time')
  const restartBtn = document.getElementById('restart')

  const BEST_KEY = 'number-puzzle_best_v1'
  let best = (function(){ try{ return Number(localStorage.getItem(BEST_KEY)) || 0 }catch(e){return 0} })()
  if(bestBadgeEl) bestBadgeEl.textContent = best

  // timer state
  let elapsed = 0
  let timerId = null
  let timerStarted = false
  function formatTime(sec){
    const m = Math.floor(sec/60).toString().padStart(2,'0')
    const s = (sec%60).toString().padStart(2,'0')
    return `${m}:${s}`
  }
  function startTimer(){ if(timerStarted) return; timerStarted = true; timeEl.textContent = formatTime(elapsed); timerId = setInterval(()=>{ elapsed++; timeEl.textContent = formatTime(elapsed) },1000) }
  function stopTimer(){ if(timerId) clearInterval(timerId); timerId = null; timerStarted = false }
  function resetTimer(){ stopTimer(); elapsed = 0; timeEl.textContent = formatTime(elapsed) }

  function emptyPositions(){
    const res = []
    for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) if(!grid[r][c]) res.push([r,c])
    return res
  }

  function spawn(){
    const empties = emptyPositions()
    if(!empties.length) return false
    const [r,c] = empties[Math.floor(Math.random()*empties.length)]
    grid[r][c] = Math.random()<0.9?2:4
    return true
  }

  function copyGrid(){ return grid.map(row=>row.slice()) }

  function rotateLeft(m){
    const out = Array(SIZE).fill(0).map(()=>Array(SIZE).fill(0))
    for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) out[SIZE-1-c][r]=m[r][c]
    return out
  }

  function moveLeft(){
    let moved=false
    for(let r=0;r<SIZE;r++){
      const row = grid[r].filter(v=>v)
      for(let i=0;i<row.length-1;i++){
        if(row[i]===row[i+1]){ row[i]*=2; score+=row[i]; row.splice(i+1,1) }
      }
      while(row.length<SIZE) row.push(0)
      for(let c=0;c<SIZE;c++){ if(grid[r][c]!==row[c]) moved=true; grid[r][c]=row[c] }
    }
    return moved
  }

  function move(dir){
    // dir: 0 left, 1 up, 2 right, 3 down
    let moved=false
    // normalize by rotating board so moveLeft always applies
    let times = dir
    let mat = copyGrid()
    for(let i=0;i<times;i++) mat = rotateLeft(mat)
    const old = JSON.stringify(mat)
    // apply moveLeft on mat
    for(let r=0;r<SIZE;r++){
      const row = mat[r].filter(v=>v)
      for(let i=0;i<row.length-1;i++){
        if(row[i]===row[i+1]){ row[i]*=2; row.splice(i+1,1); score+=row[i] }
      }
      while(row.length<SIZE) row.push(0)
      mat[r]=row
    }
    if(JSON.stringify(mat)!==old){ moved=true }
    // rotate back
    for(let i=0;i<(4-times)%4;i++) mat = rotateLeft(mat)
    grid = mat
    return moved
  }

  function isGameOver(){
    if(emptyPositions().length>0) return false
    for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
      const v = grid[r][c]
      if((r+1<SIZE && grid[r+1][c]===v) || (c+1<SIZE && grid[r][c+1]===v)) return false
    }
    return true
  }

  function render(spawnPositions = [], mergePositions = []){
    boardEl.innerHTML = ''
    // create background cells
    for(let i=0;i<SIZE*SIZE;i++){
      const el = document.createElement('div'); el.className='cell'; boardEl.appendChild(el)
    }
    // compute cell positions from actual grid cells to ensure perfect alignment
    const cellEls = Array.from(boardEl.querySelectorAll('.cell'))

    // create tile elements
    for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
      const v = grid[r][c]
      if(!v) continue
      const t = document.createElement('div')
      t.className = 'tile n'+v
      t.textContent = v
      // add animation classes for spawn/merge
      if(spawnPositions.some(p=>p[0]===r && p[1]===c)) t.classList.add('spawn')
      if(mergePositions.some(p=>p[0]===r && p[1]===c)) t.classList.add('merge')
      const idx = r*SIZE + c
      const cell = cellEls[idx]
      if(cell){
        t.style.width = cell.offsetWidth + 'px'
        t.style.height = cell.offsetHeight + 'px'
        t.style.left = cell.offsetLeft + 'px'
        t.style.top = cell.offsetTop + 'px'
      }
      boardEl.appendChild(t)
      // cleanup animation classes after they run
      if(t.classList.contains('spawn') || t.classList.contains('merge')){
        setTimeout(()=>{ t.classList.remove('spawn'); t.classList.remove('merge') }, 400)
      }
    }
    scoreEl.textContent = score
    // update best if beat
    if(score > best){ best = score; try{ localStorage.setItem(BEST_KEY, String(best)) }catch(e){}; if(bestBadgeEl) bestBadgeEl.textContent = best }
  }

  function step(dir){
    // dir 0 left,1 up,2 right,3 down
    // convert: arrowLeft 0, arrowUp 1, arrowRight 2, arrowDown 3
    // To use rotateLeft helper, we want times = dir (number of left rotations) so mapping is: left->0, up->1, right->2, down->3
    const prev = copyGrid()
    const moved = move(dir)
    if(moved){
      // start timer on first real move
      if(!timerStarted) startTimer()
      spawn()
      // detect spawn and merge positions by comparing prev and current grid
      const spawnPos = []
      const mergePos = []
      for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
        const pv = prev[r][c]
        const nv = grid[r][c]
        if(pv===0 && nv!==0) spawnPos.push([r,c])
        if(pv!==0 && nv>pv) mergePos.push([r,c])
      }
      render(spawnPos, mergePos)
      if(isGameOver()){ stopTimer(); setTimeout(()=>alert('Game over — score: '+score),40) }
    }
  }

  // input handlers
  document.addEventListener('keydown',(e)=>{
    const map = {ArrowLeft:0,ArrowUp:1,ArrowRight:2,ArrowDown:3}
    if(map[e.key]!==undefined){ e.preventDefault(); step(map[e.key]) }
  })

  // simple swipe detection
  let touchStart = null
  boardEl.addEventListener('touchstart', e=>{ touchStart = e.touches[0] })
  boardEl.addEventListener('touchend', e=>{
    if(!touchStart) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.clientX
    const dy = t.clientY - touchStart.clientY
    if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>30) step(dx<0?0:2)
    else if(Math.abs(dy)>30) step(dy<0?1:3)
    touchStart = null
  })

  restartBtn.addEventListener('click', ()=>{
    grid = Array(SIZE).fill(0).map(()=>Array(SIZE).fill(0)); score=0; resetTimer(); spawn(); spawn(); render()
  })

  // initialize
  resetTimer()
  spawn(); spawn(); render()
})
