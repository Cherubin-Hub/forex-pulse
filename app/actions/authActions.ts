"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  // FIXED: Await the correct function name
  const supabase = await createServerSupabaseClient()
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Purge the cache for the layout so the user state updates
  revalidatePath("/", "layout")
  redirect("/")
}

export async function logout() {
  // FIXED: Await the correct function name
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  
  revalidatePath("/", "layout")
  redirect("/login")
}
