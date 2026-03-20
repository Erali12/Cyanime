import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://fxajyxnwggbwdlpjvblt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4YWp5eG53Z2did2RscGp2Ymx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDkzODMsImV4cCI6MjA4OTU4NTM4M30.QNom67PHkd3-mXmmaVAqXZMqnGIdk4vQd2o1TdqEKkQ'

export const supabase = createClient(supabaseUrl, supabaseKey)