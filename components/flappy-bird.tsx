"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { GameUI } from "./game-ui"
import { useMobile } from "@/hooks/use-mobile"

export default function FlappyBird() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [gameState, setGameState] = useState<"start" | "playing" | "paused" | "gameOver">("start")
  const [powerUpActive, setPowerUpActive] = useState(false)
  const [powerUpTimeLeft, setPowerUpTimeLeft] = useState(0)
  const [username, setUsername] = useState("")
  const isMobile = useMobile()

  // Game refs to persist between renders
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const birdRef = useRef<THREE.Mesh | null>(null)
  const pipesRef = useRef<any[]>([])
  const cloudsRef = useRef<any[]>([])
  const powerUpsRef = useRef<any[]>([])
  const groundRef = useRef<THREE.Mesh | null>(null)
  const velocityRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const scoreRef = useRef(0)
  const livesRef = useRef(3)
  const gameActiveRef = useRef(false)
  const gamePausedRef = useRef(false)
  const powerUpActiveRef = useRef(false)
  const powerUpTimerRef = useRef<NodeJS.Timeout | null>(null)
  const powerUpTimeLeftRef = useRef(0)
  const usernameRef = useRef("")
  const lastFlapTimeRef = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const debugRef = useRef<HTMLDivElement | null>(null)

  // Game settings
  const birdSize = 0.8
  const pipeWidth = 2
  const pipeGap = isMobile ? 7 : 6 // Slightly wider gap on mobile
  const pipeDistance = 15
  const normalPipeSpeed = 0.1
  const boostedPipeSpeed = 0.2 // Doubled speed when power-up is active
  const pipeSpeedRef = useRef(normalPipeSpeed)
  const flapStrength = 0.4
  const gravity = 0.025
  const powerUpDuration = 5 // seconds
  const powerUpSpawnRate = 0.005 // chance per frame
  const flapCooldown = 150 // Reduced from 300ms to 150ms

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize the game
    init()

    // Start animation loop
    animate()

    // Add event listeners
    window.addEventListener("resize", onWindowResize)
    window.addEventListener("keydown", onKeyDown)

    // Use a more specific click handler
    const handleDocumentClick = (e: MouseEvent) => onClick(e)
    document.addEventListener("click", handleDocumentClick)

    // MOBILE TOUCH HANDLING - Multiple approaches to ensure it works
    
    // 1. Document level touch handler
    const handleDocumentTouch = (e: TouchEvent) => {
      // Skip if touching UI elements
      if ((e.target as HTMLElement).closest(".pointer-events-auto") || (e.target as HTMLElement).tagName === "INPUT") {
        return
      }
      
      e.preventDefault()
      e.stopPropagation()
      
      // Debug
      console.log("Document touch event", e.type)
      
      // Flap with cooldown
      const now = Date.now()
      if (now - lastFlapTimeRef.current < flapCooldown) return
      
      lastFlapTimeRef.current = now
      flap()
    }
    
    // 2. Container level touch handler
    const handleContainerTouch = (e: TouchEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      // Debug
      console.log("Container touch event", e.type)
      
      // Flap with cooldown
      const now = Date.now()
      if (now - lastFlapTimeRef.current < flapCooldown) return
      
      lastFlapTimeRef.current = now
      flap()
    }
    
    // Add all touch event listeners to document
    document.addEventListener("touchstart", handleDocumentTouch, { passive: false })
    
    // Add all touch event listeners to container
    containerRef.current.addEventListener("touchstart", handleContainerTouch, { passive: false })
    containerRef.current.addEventListener("touchend", handleContainerTouch, { passive: false })
    
    // 3. Canvas touch handler - add after canvas is created
    const setupCanvasTouchHandlers = () => {
      if (canvasRef.current) {
        const handleCanvasTouch = (e: TouchEvent) => {
          e.preventDefault()
          e.stopPropagation()
          
          // Debug
          console.log("Canvas touch event", e.type)
          
          // Flap with cooldown
          const now = Date.now()
          if (now - lastFlapTimeRef.current < flapCooldown) return
          
          lastFlapTimeRef.current = now
          flap()
        }
        
        canvasRef.current.addEventListener("touchstart", handleCanvasTouch, { passive: false })
        canvasRef.current.addEventListener("touchend", handleCanvasTouch, { passive: false })
        console.log("Canvas touch handlers added")
      }
    }
    
    // Try to add canvas handlers immediately
    setupCanvasTouchHandlers()
    
    // Also try after a delay to ensure canvas is ready
    setTimeout(setupCanvasTouchHandlers, 500)
    setTimeout(setupCanvasTouchHandlers, 1000)
    setTimeout(setupCanvasTouchHandlers, 2000)

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (rendererRef.current && rendererRef.current.domElement) {
        containerRef.current?.removeChild(rendererRef.current.domElement)
      }

      if (powerUpTimerRef.current) {
        clearTimeout(powerUpTimerRef.current)
      }

      window.removeEventListener("resize", onWindowResize)
      window.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("click", handleDocumentClick)
      
      // Remove all touch handlers
      document.removeEventListener("touchstart", handleDocumentTouch)
      
      containerRef.current?.removeEventListener("touchstart", handleContainerTouch)
      containerRef.current?.removeEventListener("touchend", handleContainerTouch)
      
      if (canvasRef.current) {
        canvasRef.current.removeEventListener("touchstart", handleCanvasTouch)
        canvasRef.current.removeEventListener("touchend", handleCanvasTouch)
      }

      // Dispose of Three.js objects
      if (sceneRef.current) {
        sceneRef.current.clear()
      }
    }
  }, [isMobile])

  // Initialize the game
  const init = () => {
    // Set up scene
    sceneRef.current = new THREE.Scene()
    sceneRef.current.background = new THREE.Color(0x000000)
    sceneRef.current.fog = new THREE.Fog(0x000000, 20, 60)

    // Set up camera
    cameraRef.current = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    cameraRef.current.position.z = isMobile ? 18 : 15 // Move camera back on mobile for better view
    cameraRef.current.position.y = 0

    // Set up renderer
    rendererRef.current = new THREE.WebGLRenderer({ antialias: true })
    rendererRef.current.setSize(window.innerWidth, window.innerHeight)
    rendererRef.current.shadowMap.enabled = true
    containerRef.current?.appendChild(rendererRef.current.domElement)

    // Store canvas reference
    canvasRef.current = rendererRef.current.domElement

    // Create lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
    sceneRef.current.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7)
    directionalLight.position.set(10, 20, 15)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.near = 0.1
    directionalLight.shadow.camera.far = 100
    directionalLight.shadow.camera.left = -20
    directionalLight.shadow.camera.right = 20
    directionalLight.shadow.camera.top = 20
    directionalLight.shadow.camera.bottom = -20
    sceneRef.current.add(directionalLight)

    // Create game elements
    createBird()
    createGround()
    createClouds()
    createInitialPipes()

    // Initialize game state
    scoreRef.current = 0
    livesRef.current = 3
    gameActiveRef.current = false
    gamePausedRef.current = false
    powerUpActiveRef.current = false
    powerUpTimeLeftRef.current = 0
    pipeSpeedRef.current = normalPipeSpeed
  }

  // Create the bird
  const createBird = () => {
    if (!sceneRef.current) return

    const bodyGeometry = new THREE.BoxGeometry(birdSize, birdSize, birdSize)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.2,
    })

    birdRef.current = new THREE.Mesh(bodyGeometry, bodyMaterial)
    birdRef.current.castShadow = true
    birdRef.current.receiveShadow = true
    birdRef.current.position.set(-3, 0, 0)

    sceneRef.current.add(birdRef.current)
  }

  // Create ground
  const createGround = () => {
    if (!sceneRef.current) return

    const groundGeometry = new THREE.BoxGeometry(200, 1, 20)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.2,
    })

    groundRef.current = new THREE.Mesh(groundGeometry, groundMaterial)
    groundRef.current.position.set(0, -12, 0)
    groundRef.current.receiveShadow = true

    sceneRef.current.add(groundRef.current)
  }

  // Create clouds
  const createClouds = () => {
    if (!sceneRef.current) return

    for (let i = 0; i < 5; i++) {
      const cloudGroup = new THREE.Group()

      const cloudGeometry = new THREE.BoxGeometry(4, 0.5, 2)
      const cloudMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.7,
        metalness: 0.1,
        transparent: true,
        opacity: 0.4,
      })

      const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial)
      cloudGroup.add(cloudMesh)

      cloudGroup.position.set(Math.random() * 100 - 50, Math.random() * 10 + 5, Math.random() * 10 - 20)

      cloudsRef.current.push({
        mesh: cloudGroup,
        speed: Math.random() * 0.01 + 0.005,
      })

      sceneRef.current.add(cloudGroup)
    }
  }

  // Create power-up
  const createPowerUp = (position: number) => {
    if (!sceneRef.current) return

    const yPosition = Math.random() * 10 - 5

    // Create power-up (star shape)
    const powerUpGroup = new THREE.Group()

    // Use a different geometry for the power-up
    const powerUpGeometry = new THREE.OctahedronGeometry(1, 0)
    const powerUpMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00, // Yellow color
      emissive: 0xffff00,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.8,
    })

    const powerUpMesh = new THREE.Mesh(powerUpGeometry, powerUpMaterial)
    powerUpMesh.castShadow = true
    powerUpGroup.add(powerUpMesh)

    powerUpGroup.position.set(position, yPosition, 0)

    // Add rotation animation
    const rotationSpeed = Math.random() * 0.03 + 0.01

    sceneRef.current.add(powerUpGroup)

    // Store power-up
    powerUpsRef.current.push({
      mesh: powerUpGroup,
      position: position,
      collected: false,
      rotationSpeed,
    })
  }

  // Create pipe
  const createPipe = (position: number) => {
    if (!sceneRef.current) return

    const gapPosition = Math.random() * 6 - 3

    // Group for both pipes
    const pipeGroup = new THREE.Group()

    // Pipe material
    const pipeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.2,
    })

    // Top pipe
    const topPipeGeometry = new THREE.BoxGeometry(pipeWidth, 24, pipeWidth)
    const topPipe = new THREE.Mesh(topPipeGeometry, pipeMaterial)
    topPipe.position.set(0, gapPosition + pipeGap / 2 + 12, 0)
    topPipe.castShadow = true
    topPipe.receiveShadow = true
    pipeGroup.add(topPipe)

    // Bottom pipe
    const bottomPipeGeometry = new THREE.BoxGeometry(pipeWidth, 24, pipeWidth)
    const bottomPipe = new THREE.Mesh(bottomPipeGeometry, pipeMaterial)
    bottomPipe.position.set(0, gapPosition - pipeGap / 2 - 12, 0)
    bottomPipe.castShadow = true
    bottomPipe.receiveShadow = true
    pipeGroup.add(bottomPipe)

    pipeGroup.position.set(position, 0, 0)
    sceneRef.current.add(pipeGroup)

    // Store pipe
    pipesRef.current.push({
      group: pipeGroup,
      topPipe: topPipe,
      bottomPipe: bottomPipe,
      position: position,
      passed: false,
    })

    // Randomly spawn a power-up
    if (Math.random() < 0.3) {
      // 30% chance to spawn a power-up with each pipe
      createPowerUp(position + Math.random() * 5)
    }
  }

  // Create initial pipes
  const createInitialPipes = () => {
    for (let i = 0; i < 3; i++) {
      createPipe(15 + i * pipeDistance)
    }
  }

  // Activate power-up
  const activatePowerUp = () => {
    powerUpActiveRef.current = true
    setPowerUpActive(true)

    // Change bird color to indicate power-up
    if (birdRef.current) {
      const material = birdRef.current.material as THREE.MeshStandardMaterial
      material.color.set(0xffff00)
      material.emissive.set(0xffff00)
      material.emissiveIntensity = 0.5
    }

    // Increase speed
    pipeSpeedRef.current = boostedPipeSpeed

    // Set timer
    powerUpTimeLeftRef.current = powerUpDuration
    setPowerUpTimeLeft(powerUpDuration)

    // Clear any existing timer
    if (powerUpTimerRef.current) {
      clearInterval(powerUpTimerRef.current)
    }

    // Start countdown
    powerUpTimerRef.current = setInterval(() => {
      powerUpTimeLeftRef.current -= 0.1
      setPowerUpTimeLeft(powerUpTimeLeftRef.current)

      if (powerUpTimeLeftRef.current <= 0) {
        deactivatePowerUp()
      }
    }, 100)
  }

  // Deactivate power-up
  const deactivatePowerUp = () => {
    powerUpActiveRef.current = false
    setPowerUpActive(false)

    // Reset bird color
    if (birdRef.current) {
      const material = birdRef.current.material as THREE.MeshStandardMaterial
      material.color.set(0xffffff)
      material.emissive.set(0x000000)
      material.emissiveIntensity = 0
    }

    // Reset speed
    pipeSpeedRef.current = normalPipeSpeed

    // Clear timer
    if (powerUpTimerRef.current) {
      clearInterval(powerUpTimerRef.current)
      powerUpTimerRef.current = null
    }
  }

  // Update game state
  const update = () => {
    if (!gameActiveRef.current || gamePausedRef.current) return
    if (!birdRef.current || !sceneRef.current) return

    // Apply gravity
    velocityRef.current += gravity

    // Add velocity damping
    if (velocityRef.current > 0.5) velocityRef.current = 0.5

    birdRef.current.position.y -= velocityRef.current

    // Rotate bird
    birdRef.current.rotation.z = -velocityRef.current * 0.1

    // Move pipes
    for (let i = 0; i < pipesRef.current.length; i++) {
      const pipe = pipesRef.current[i]
      pipe.position -= pipeSpeedRef.current
      pipe.group.position.x -= pipeSpeedRef.current

      // Check if bird passed pipe
      if (!pipe.passed && pipe.group.position.x < birdRef.current.position.x) {
        scoreRef.current++
        setScore(scoreRef.current)
        pipe.passed = true

        // Play score sound
        playSound("score")
      }

      // Check collision with pipes
      if (
        !powerUpActiveRef.current &&
        (checkCollision(birdRef.current, pipe.topPipe) || checkCollision(birdRef.current, pipe.bottomPipe))
      ) {
        loseLife()
      }

      // Remove pipes that are off screen
      if (pipe.group.position.x < -15) {
        sceneRef.current.remove(pipe.group)
        pipesRef.current.splice(i, 1)
        i--

        // Create new pipe
        createPipe(15 + pipeDistance)
      }
    }

    // Update power-ups
    for (let i = 0; i < powerUpsRef.current.length; i++) {
      const powerUp = powerUpsRef.current[i]

      // Move power-up
      powerUp.mesh.position.x -= pipeSpeedRef.current

      // Rotate power-up
      powerUp.mesh.rotation.y += powerUp.rotationSpeed
      powerUp.mesh.rotation.x += powerUp.rotationSpeed / 2

      // Check collision with bird
      if (!powerUp.collected && checkCollisionWithPowerUp(birdRef.current, powerUp.mesh)) {
        powerUp.collected = true
        sceneRef.current.remove(powerUp.mesh)

        // Activate power-up
        activatePowerUp()

        // Play power-up sound
        playSound("powerUp")
      }

      // Remove power-ups that are off screen
      if (powerUp.mesh.position.x < -15) {
        sceneRef.current.remove(powerUp.mesh)
        powerUpsRef.current.splice(i, 1)
        i--
      }
    }

    // Move clouds
    for (let i = 0; i < cloudsRef.current.length; i++) {
      const cloud = cloudsRef.current[i]
      cloud.mesh.position.x -= cloud.speed

      // Reset cloud position when it's off screen
      if (cloud.mesh.position.x < -50) {
        cloud.mesh.position.x = 50
      }
    }

    // Check if bird hits top or bottom
    if (!powerUpActiveRef.current && (birdRef.current.position.y > 10 || birdRef.current.position.y < -10)) {
      loseLife()
    }
  }

  // Check collision between bird and pipe
  const checkCollision = (bird: THREE.Mesh, pipe: THREE.Mesh) => {
    const birdBox = new THREE.Box3().setFromObject(bird)
    const pipeBox = new THREE.Box3().setFromObject(pipe)
    return birdBox.intersectsBox(pipeBox)
  }

  // Check collision with power-up
  const checkCollisionWithPowerUp = (bird: THREE.Mesh, powerUp: THREE.Object3D) => {
    const birdBox = new THREE.Box3().setFromObject(bird)
    const powerUpBox = new THREE.Box3().setFromObject(powerUp)
    return birdBox.intersectsBox(powerUpBox)
  }

  // Flap the bird
  const flap = () => {
    // Record the flap time
    const now = Date.now()
    if (now - lastFlapTimeRef.current < flapCooldown) {
      // Cooldown in effect
      return
    }
    lastFlapTimeRef.current = now

    if (!gameActiveRef.current) {
      startGame()
      return
    }

    if (gamePausedRef.current) {
      resumeGame()
      return
    }

    // Add velocity damping
    if (velocityRef.current > 0) {
      velocityRef.current = -flapStrength
    } else {
      velocityRef.current = Math.max(-0.6, velocityRef.current - flapStrength * 0.7)
    }

    // Play flap sound
    playSound("flap")
  }

  // Start game
  const startGame = () => {
    if (!username.trim()) return

    gameActiveRef.current = true
    setGameState("playing")
    usernameRef.current = username
    resetBird()
  }

  // Pause game
  const pauseGame = () => {
    if (!gameActiveRef.current) return

    gamePausedRef.current = true
    setGameState("paused")
  }

  // Resume game
  const resumeGame = () => {
    gamePausedRef.current = false
    setGameState("playing")
  }

  // Toggle pause
  const togglePause = () => {
    if (!gameActiveRef.current) return

    if (gamePausedRef.current) {
      resumeGame()
    } else {
      pauseGame()
    }
  }

  // Lose a life
  const loseLife = () => {
    // If power-up is active, don't lose a life
    if (powerUpActiveRef.current) return

    livesRef.current = Math.max(0, livesRef.current - 1)
    setLives(livesRef.current)

    // Play hurt sound
    playSound("hurt")

    if (livesRef.current <= 0) {
      gameOver()
    } else {
      resetBird()
    }
  }

  // Reset bird position
  const resetBird = () => {
    if (!birdRef.current) return

    birdRef.current.position.set(-3, 0, 0)
    birdRef.current.rotation.z = 0
    velocityRef.current = 0
  }

  // Game over
  const gameOver = () => {
    gameActiveRef.current = false
    setGameState("gameOver")

    // Deactivate power-up if active
    if (powerUpActiveRef.current) {
      deactivatePowerUp()
    }

    // Play game over sound
    playSound("gameOver")
  }

  // Reset game
  const resetGame = () => {
    if (!sceneRef.current) return

    // Reset bird
    resetBird()

    // Remove all pipes
    for (let i = 0; i < pipesRef.current.length; i++) {
      sceneRef.current.remove(pipesRef.current[i].group)
    }
    pipesRef.current = []

    // Remove all power-ups
    for (let i = 0; i < powerUpsRef.current.length; i++) {
      sceneRef.current.remove(powerUpsRef.current[i].mesh)
    }
    powerUpsRef.current = []

    // Deactivate power-up if active
    if (powerUpActiveRef.current) {
      deactivatePowerUp()
    }

    // Create new pipes
    createInitialPipes()

    // Reset score and lives
    scoreRef.current = 0
    livesRef.current = 3
    setScore(0)
    setLives(3)

    // Reset pipe speed
    pipeSpeedRef.current = normalPipeSpeed

    // Start game
    gameActiveRef.current = true
    gamePausedRef.current = false
    setGameState("playing")
  }

  // Play sound
  const playSound = (sound: string) => {
    console.log("Playing sound:", sound)
    // This would normally play a sound
  }

  // Handle window resize
  const onWindowResize = () => {
    if (!cameraRef.current || !rendererRef.current) return

    // Update camera
    cameraRef.current.aspect = window.innerWidth / window.innerHeight
    cameraRef.current.updateProjectionMatrix()

    // Update renderer
    rendererRef.current.setSize(window.innerWidth, window.innerHeight)

    // Adjust camera position based on screen size
    if (isMobile) {
      cameraRef.current.position.z = 18
    } else {
      cameraRef.current.position.z = 15
    }
  }

  // Handle key press
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === "Space") {
      flap()
    }

    if (event.code === "KeyP" || event.code === "Escape") {
      togglePause()
    }
  }

  // Handle click
  const onClick = (e: MouseEvent) => {
    // Don't flap if clicking on UI elements
    const target = e.target as HTMLElement
    if (target.closest(".pointer-events-auto")) {
      return
    }

    // Use the same cooldown mechanism as touch events
    const now = Date.now()
    if (now - lastFlapTimeRef.current < flapCooldown) {
      // Cooldown in effect
      return
    }

    lastFlapTimeRef.current = now
    flap()
  }

  // Direct touch handler for the JSX element
  const handleTouchEvent = (e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Debug
    console.log("JSX touch event", e.type)
    
    // Flap with cooldown
    const now = Date.now()
    if (now - lastFlapTimeRef.current < flapCooldown) return
    
    lastFlapTimeRef.current = now
    flap()
  }

  // Return to main menu
  const returnToMenu = () => {
    // Reset game state
    gameActiveRef.current = false
    gamePausedRef.current = false

    // Reset game elements
    if (sceneRef.current) {
      // Remove all pipes
      for (let i = 0; i < pipesRef.current.length; i++) {
        sceneRef.current.remove(pipesRef.current[i].group)
      }
      pipesRef.current = []

      // Remove all power-ups
      for (let i = 0; i < powerUpsRef.current.length; i++) {
        sceneRef.current.remove(powerUpsRef.current[i].mesh)
      }
      powerUpsRef.current = []
    }

    // Deactivate power-up if active
    if (powerUpActiveRef.current) {
      deactivatePowerUp()
    }

    // Reset bird position
    resetBird()

    // Reset score and lives
    scoreRef.current = 0
    livesRef.current = 3
    setScore(0)
    setLives(3)

    // Reset pipe speed
    pipeSpeedRef.current = normalPipeSpeed

    // Set game state to start
    setGameState("start")
  }

  // Animation loop
  const animate = () => {
    animationFrameRef.current = requestAnimationFrame(animate)
    update()

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }
  }

  return (
    <div 
      className="relative w-full h-full game-container"
      onTouchStart={handleTouchEvent}
      onTouchEnd={handleTouchEvent}
    >
      <div 
        ref={containerRef} 
        className="w-full h-full touch-action-none" 
        style={{ 
          touchAction: "none", 
          WebkitTouchCallout: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTapHighlightColor: "transparent"
        }}
      />
      <GameUI
        score={score}
        lives={lives}
        gameState={gameState}
        powerUpActive={powerUpActive}
        powerUpTimeLeft={powerUpTimeLeft}
        username={username}
        setUsername={setUsername}
        onStart={startGame}
        onResume={resumeGame}
        onRestart={resetGame}
        onRetry={resetGame}
        onReturnToMenu={returnToMenu}
        onPause={pauseGame}
      />
    </div>
  )
}
