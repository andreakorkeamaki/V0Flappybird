"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

// Create a server-side Supabase client
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function getLeaderboard(limit = 10) {
  const { data, error } = await supabase
    .from("scores")
    .select(`
      id,
      score,
      created_at,
      users (
        username
      )
    `)
    .order("score", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching leaderboard:", error)
    return []
  }

  return data.map((item) => ({
    id: item.id,
    score: item.score,
    created_at: item.created_at,
    username: item.users?.username || "Unknown",
  }))
}

export async function saveScore(username: string, score: number) {
  // First, check if user exists
  const { data: existingUser, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .single()

  let userId

  if (userError || !existingUser) {
    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({ username })
      .select("id")
      .single()

    if (createError) {
      console.error("Error creating user:", createError)
      return { success: false, error: "Failed to create user" }
    }

    userId = newUser.id
  } else {
    userId = existingUser.id
  }

  // Save score
  const { error: scoreError } = await supabase.from("scores").insert({ user_id: userId, score })

  if (scoreError) {
    console.error("Error saving score:", scoreError)
    return { success: false, error: "Failed to save score" }
  }

  revalidatePath("/")
  return { success: true }
}

