// supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://ziidawfildpacymfddqh.supabase.com'
const SUPABASE_KEY = 'your-anon-public-keyeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppaWRhd2ZpbGRwYWN5bWZkZHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MzM0NzQsImV4cCI6MjA2NTUwOTQ3NH0.AsyZJu6fcpvGDhHqak37q1LV4VDmfPvyDLDaU3b1tR4'
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
