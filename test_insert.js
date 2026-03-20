require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log("Signing up a test user...");
  const fakeEmail = 'test_child_insert_' + Date.now() + '@example.com';
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: fakeEmail,
    password: 'password123',
    options: {
      data: {
        name: 'Test Parent',
        role: 'parent'
      }
    }
  });

  if (authError) {
    console.error("Auth Error:", authError);
    return;
  }

  const user = authData.user;
  console.log("User created:", user.id);

  // Wait a moment for trigger to maybe finish (though it's synchronous)
  await new Promise(r => setTimeout(r, 1000));

  console.log("Inserting child...");
  const { data: insertData, error: insertError } = await supabase.from('children').insert({
    parent_id: user.id,
    name: 'Test Child',
    grade: '5',
    section: 'A'
  }).select();

  if (insertError) {
    console.error("Insert Error:", insertError);
  } else {
    console.log("Insert Success, returned data:", insertData);
  }

  console.log("Fetching children...");
  const { data: kidsData, error: kidsError } = await supabase.from('children').select('*').eq('parent_id', user.id);
  
  if (kidsError) {
    console.error("Select Error:", kidsError);
  } else {
    console.log("Selected Kids Count:", kidsData.length);
    console.log("Kids Data:", kidsData);
  }
}

run();
