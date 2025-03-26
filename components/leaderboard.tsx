"use client"

import { useEffect, useState } from "react"
import type { Score } from "@/lib/supabase"
import { getLeaderboard } from "@/app/actions"
import { useMobile } from "@/hooks/use-mobile"

export function Leaderboard() {
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const isMobile = useMobile()

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true)
      const data = await getLeaderboard()
      setScores(data)
      setLoading(false)
    }

    fetchLeaderboard()
  }, [])

  return (
    <div className="bg-black/70 text-white p-3 sm:p-5 border-2 border-white w-full max-w-md">
      <h2 className="text-base sm:text-xl mb-3 sm:mb-4 tracking-widest text-center">LEADERBOARD</h2>

      {loading ? (
        <p className="text-center">Loading...</p>
      ) : scores.length === 0 ? (
        <p className="text-center">No scores yet. Be the first!</p>
      ) : (
        <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
          {scores.map((score, index) => (
            <div key={score.id} className="flex justify-between items-center">
              <div className="flex items-center gap-1 sm:gap-2">
                <span>{index + 1}.</span>
                <span className="font-bold truncate max-w-[120px] sm:max-w-[200px]">{score.username}</span>
              </div>
              <span>{score.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

