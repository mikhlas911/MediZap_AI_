import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const pathname = url.pathname
  const method = req.method

  // Get JWT from Authorization header if present
  const authHeader = req.headers.get('authorization')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!, // Use anon key for public access
    authHeader
      ? {
          global: {
            headers: {
              Authorization: authHeader,
            },
          },
        }
      : undefined
  )

  // Parse request body if needed
  let body: any = {}
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    body = await req.json()
  }

  // Example: /doctors, /appointments, /clinics, /departments, /walk_ins
  if (pathname.endsWith('/doctors')) {
    if (method === 'GET') {
      const { data, error } = await supabase.from('doctors').select('*')
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
    }
    // You can add POST/PUT for doctors here if needed
  }

  if (pathname.endsWith('/appointments')) {
    if (method === 'GET') {
      const { data, error } = await supabase.from('appointments').select('*')
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
    }
    if (method === 'POST') {
      const { data, error } = await supabase.from('appointments').insert([body]).select()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
    }
  }

  if (pathname.endsWith('/clinics')) {
    if (method === 'GET') {
      const { data, error } = await supabase.from('clinics').select('*')
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
    }
  }

  if (pathname.endsWith('/departments')) {
    if (method === 'GET') {
      const { data, error } = await supabase.from('departments').select('*')
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
    }
  }

  if (pathname.endsWith('/walk_ins')) {
    if (method === 'GET') {
      const { data, error } = await supabase.from('walk_ins').select('*')
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
    }
    if (method === 'POST') {
      const { data, error } = await supabase.from('walk_ins').insert([body]).select()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
    }
  }

  // Default: Not Found
  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
})
