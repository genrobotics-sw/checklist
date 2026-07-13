import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

async function seed() {
  console.log('Seeding users...')

  const users = [
    { email: 'admin@checklistflow.com', password: 'password123', role: 'ADMIN', name: 'Admin User' },
    { email: 'employee1@checklistflow.com', password: 'password123', role: 'EMPLOYEE', name: 'Alice Employee' },
    { email: 'employee2@checklistflow.com', password: 'password123', role: 'EMPLOYEE', name: 'Bob Employee' },
  ]

  for (const u of users) {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.name },
    })

    if (authError) {
      console.error(`Failed to create ${u.email}:`, authError.message)
      continue
    }

    if (authData.user) {
      // The trigger will auto-create the profile as EMPLOYEE. 
      // We need to update the role to ADMIN if necessary.
      if (u.role === 'ADMIN') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: 'ADMIN' })
          .eq('id', authData.user.id)
        
        if (profileError) {
          console.error(`Failed to update profile role for ${u.email}:`, profileError.message)
        } else {
          console.log(`Created ${u.email} as ADMIN`)
        }
      } else {
        console.log(`Created ${u.email} as EMPLOYEE`)
      }
    }
  }

  console.log('Done.')
}

seed().catch(console.error)
