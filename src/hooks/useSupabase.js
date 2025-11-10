import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kfkcohosbpaeuzxuohrm.supabase.co'
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma2NvaG9zYnBhZXV6eHVvaHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMDgyODgsImV4cCI6MjA2OTc4NDI4OH0.0f5ux3Z1B2Y8acpn7ZC40HiLeW3QhZcvZkr758ySivk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_API_KEY)

export const useSupabase = () => {
  return supabase
}


