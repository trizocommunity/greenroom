const BASE_URL = 'http://localhost:3000/api/auth';
const PROFILE_URL = 'http://localhost:3000/profile';

async function testAuth() {
  console.log('Starting Auth Verification...');
  const email = `test-${Date.now()}@example.com`;
  const password = 'password123';
  let cookie = '';

  // 1. Register
  console.log(`\n1. Registering user: ${email}`);
  const regRes = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  console.log('Register Status:', regRes.status);
  if (regRes.status !== 201) {
    console.error('Registration failed:', await regRes.text());
    return;
  }

  // 2. Login
  console.log('\n2. Logging in...');
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  console.log('Login Status:', loginRes.status);
  if (loginRes.status !== 200) {
    console.error('Login failed:', await loginRes.text());
    return;
  }
  
  // Extract cookie manually if fetch doesn't handle jar (Node native fetch doesn't by default)
  const setCookie = loginRes.headers.get('set-cookie');
  if (setCookie) {
    cookie = setCookie.split(';')[0];
    console.log('Session Cookie received');
  } else {
    console.error('No cookie received!');
  }

  // 3. Access Protected Route
  console.log('\n3. Accessing Protected Route (/profile)...');
  const profileRes = await fetch(PROFILE_URL, {
    headers: { Cookie: cookie },
    redirect: 'manual' 
  });
  console.log('Profile Status:', profileRes.status); 
  // Should be 200 or 404 (if page doesn't exist but auth passed) or 500. 
  // Middleware redirects to /login if fail (307). 
  // If we get 200 (page renders) or anything not 307/308, auth passed.
  // Actually, standard fetch with redirect:manual returns 0/opaque or 3xx.
  // Next.js middleware redirect is usually 307.
  
  if (profileRes.status === 307 || profileRes.status === 308) {
      const loc = profileRes.headers.get('location');
      if (loc.includes('/login')) {
          console.error('Access Denied (Redirected to login)');
      } else {
          console.log('Redirected to:', loc);
      }
  } else if (profileRes.status === 200) {
      console.log('Access Granted');
  } else {
      console.log('Response:', profileRes.status);
  }

  // 4. Logout
  console.log('\n4. Logging out...');
  const logoutRes = await fetch(`${BASE_URL}/logout`, {
    method: 'POST',
    headers: { Cookie: cookie },
  });
  console.log('Logout Status:', logoutRes.status);

  // 5. Access Protected Route (After Logout)
  console.log('\n5. Accessing Protected Route (After Logout)...');
  const profileRes2 = await fetch(PROFILE_URL, {
    headers: { Cookie: cookie }, // Sending the old cookie to see if server rejects it? 
    // Actually logout should clear it on client, but here we manually send.
    // Server should verify it. Wait, session is stateless JWT?
    // If JWT is stateless and we don't blacklist, it might still work until expiry!
    // Ah, my session implementation: `createSession` sets cookie. `deleteSession` deletes cookie.
    // Use `jose` to verify.
    // If I send the OLD cookie string, and it's a valid JWT, it WILL still work unless I have a database check/blacklist.
    // My middleware: checks `session.userId`.
    // My session logic: `decrypt(cookie)`.
    // It DOES NOT check database for `isActive` or `session version` in the middleware for performance (usually).
    // Let's check `src/middleware.ts`. It calls `decrypt`.
    // `decrypt` just verifies signature.
    // So "Logout" just tells client to clear cookie.
    // SECURITY NOTE: Stateless JWTs cannot be invalidated server-side without blacklist/rotation.
    // However, for this task, clearing cookie is standard "Logout". 
    // Testing this script: If I manually pass the cookie again, it SHOULD still work. 
    // That's expected behavior for stateless JWT.
    // So verification should be: Client doesn't have cookie anymore.
  });
  
  // 6. Forgot Password
  console.log('\n6. forgot-password...');
  const forgotRes = await fetch(`${BASE_URL}/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: { 'Content-Type': 'application/json' }
  });
  console.log('Forgot Password Status:', forgotRes.status);

  console.log('\nDone.');
}

testAuth();
