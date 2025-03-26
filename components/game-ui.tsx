"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { saveScore } from "@/app/actions"
import { Leaderboard } from "./leaderboard"
import { useMobile } from "@/hooks/use-mobile"

interface GameUIProps {
  score: number
  lives: number
  gameState: "start" | "playing" | "paused" | "gameOver"
  powerUpActive: boolean
  powerUpTimeLeft: number
  username: string
  setUsername: (username: string) => void
  onStart: () => void
  onResume: () => void
  onRestart: () => void
  onRetry: () => void
  onReturnToMenu: () => void
  onPause: () => void
}

export function GameUI({
  score,
  lives,
  gameState,
  powerUpActive,
  powerUpTimeLeft,
  username,
  setUsername,
  onStart,
  onResume,
  onRestart,
  onRetry,
  onReturnToMenu,
  onPause,
}: GameUIProps) {
  const [scoreSaved, setScoreSaved] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const isMobile = useMobile()

  // Automatically save score when game over
  useEffect(() => {
    const saveScoreAutomatically = async () => {
      if (gameState === "gameOver" && !scoreSaved && username.trim() && score > 0) {
        try {
          setSaveError(null)
          const result = await saveScore(username, score)
          if (result.success) {
            setScoreSaved(true)
          } else if (result.error) {
            setSaveError(result.error)
          }
        } catch (error) {
          setSaveError("Failed to save score. Please try again.")
        }
      }
    }

    saveScoreAutomatically()
  }, [gameState, scoreSaved, username, score])

  // Ensure lives is a valid non-negative number for array creation
  const livesCount = Math.max(0, lives)

  // Prevent event propagation for input field
  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // Determine font sizes based on device
  const titleSize = isMobile ? "text-xl" : "text-2xl"
  const scoreSize = isMobile ? "text-base" : "text-lg"
  const buttonSize = isMobile ? "text-xs px-4 py-2" : "text-sm px-5 py-2.5"
  const modalWidth = isMobile ? "w-[90%] max-w-[320px]" : "w-full max-w-md"

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className={`absolute top-3 sm:top-5 left-3 sm:left-5 text-white ${scoreSize} tracking-wider`}>
        SCORE: {score}
      </div>

      <div className={`absolute top-3 sm:top-5 right-3 sm:right-5 text-white ${scoreSize} tracking-wider`}>
        LIVES:{" "}
        {
          // Safely create an array with a valid length
          [...Array(livesCount)].map((_, i) => (
            <span key={i} className="ml-1 inline-block">
              □
            </span>
          ))
        }
      </div>

      {powerUpActive && (
        <div
          className={`absolute top-10 sm:top-14 left-3 sm:left-5 text-white ${scoreSize} tracking-wider text-yellow-400`}
        >
          POWER UP: {Math.ceil(powerUpTimeLeft)}s
        </div>
      )}

      {gameState === "start" && (
        <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white p-4 sm:p-5 border-2 border-white text-center pointer-events-auto ${modalWidth}`}
        >
          <h1 className={`${titleSize} mb-4 sm:mb-5 tracking-widest`}>FLAPPY BIRD</h1>

          <div className="mb-3 sm:mb-4">
            <input
              type="text"
              placeholder="Enter username"
              className="bg-black text-white border border-white px-3 py-2 w-full mb-3 sm:mb-4 text-center"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onClick={(e) => {
                e.stopPropagation()
                // Ensure focus works on mobile
                ;(e.target as HTMLInputElement).focus()
              }}
              onTouchStart={(e) => {
                e.stopPropagation()
                // Prevent the touch event from bubbling up and triggering flap
              }}
              onKeyDown={(e) => e.stopPropagation()}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (username.trim()) onStart()
              }}
              disabled={!username.trim()}
              className={`bg-black text-white border border-white ${buttonSize} transition-all hover:bg-white hover:text-black tracking-wider disabled:opacity-50`}
            >
              START
            </button>
          </div>

          {isMobile ? (
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm">
              TAP to flap
              <br />
              TAP corners to pause
              <br />
              Collect power-ups for speed boost and invincibility!
            </p>
          ) : (
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm">
              SPACE or CLICK to flap
              <br />
              ESC or P to pause
              <br />
              Collect power-ups for speed boost and invincibility!
            </p>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowLeaderboard(!showLeaderboard)
            }}
            className={`mt-3 sm:mt-4 bg-black text-white border border-white ${buttonSize} transition-all hover:bg-white hover:text-black tracking-wider`}
          >
            {showLeaderboard ? "HIDE LEADERBOARD" : "SHOW LEADERBOARD"}
          </button>

          {showLeaderboard && (
            <div className="mt-3 sm:mt-4">
              <Leaderboard />
            </div>
          )}
        </div>
      )}

      {gameState === "paused" && (
        <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white p-4 sm:p-5 border-2 border-white text-center pointer-events-auto ${modalWidth}`}
        >
          <h1 className={`${titleSize} mb-4 sm:mb-5 tracking-widest`}>PAUSED</h1>
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onResume()
              }}
              className={`bg-black text-white border border-white ${buttonSize} transition-all hover:bg-white hover:text-black tracking-wider`}
            >
              RESUME
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRestart()
              }}
              className={`bg-black text-white border border-white ${buttonSize} transition-all hover:bg-white hover:text-black tracking-wider`}
            >
              RESTART
            </button>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onReturnToMenu()
            }}
            className={`block mx-auto mt-3 sm:mt-4 bg-black text-white border border-white ${buttonSize} transition-all hover:bg-white hover:text-black tracking-wider`}
          >
            MAIN MENU
          </button>
        </div>
      )}

      {gameState === "gameOver" && (
        <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white p-4 sm:p-5 border-2 border-white text-center pointer-events-auto ${modalWidth}`}
        >
          <h1 className={`${titleSize} mb-3 sm:mb-5 tracking-widest`}>GAME OVER</h1>
          <p className="mb-3 sm:mb-4">
            SCORE: <span>{score}</span>
          </p>

          <div className="flex flex-col gap-2 sm:gap-3">
            {scoreSaved ? (
              <p className="mb-1 sm:mb-2 text-green-400">Score saved automatically!</p>
            ) : saveError ? (
              <p className="mb-1 sm:mb-2 text-red-400">{saveError}</p>
            ) : score > 0 ? (
              <p className="mb-1 sm:mb-2 text-yellow-400">Saving score...</p>
            ) : (
              <p className="mb-1 sm:mb-2 text-gray-400">Score too low to save</p>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation()
                onRetry()
              }}
              className={`bg-black text-white border border-white ${buttonSize} transition-all hover:bg-white hover:text-black tracking-wider`}
            >
              RETRY
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onReturnToMenu()
              }}
              className={`bg-black text-white border border-white ${buttonSize} transition-all hover:bg-white hover:text-black tracking-wider`}
            >
              MAIN MENU
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowLeaderboard(!showLeaderboard)
              }}
              className={`bg-black text-white border border-white ${buttonSize} transition-all hover:bg-white hover:text-black tracking-wider`}
            >
              {showLeaderboard ? "HIDE LEADERBOARD" : "SHOW LEADERBOARD"}
            </button>
          </div>

          {showLeaderboard && (
            <div className="mt-3 sm:mt-4">
              <Leaderboard />
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-3 sm:bottom-5 left-3 sm:left-5 text-white text-[10px] sm:text-xs tracking-wider">
        {isMobile ? "TAP = FLAP | TAP CORNERS = PAUSE" : "SPACE = FLAP | ESC/P = PAUSE"}
      </div>

      {/* Mobile pause buttons in corners */}
      {isMobile && gameState === "playing" && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPause() // Use the onPause prop
            }}
            className="absolute top-0 right-0 w-16 h-16 opacity-0 pointer-events-auto"
            aria-label="Pause"
          />
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPause() // Use the onPause prop
            }}
            className="absolute top-0 left-0 w-16 h-16 opacity-0 pointer-events-auto"
            aria-label="Pause"
          />
        </>
      )}
    </div>
  )

  // Toggle pause function for mobile
  function togglePause(e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    if (gameState === "playing") {
      onPause()
    } else {
      onResume()
    }
  }
}

