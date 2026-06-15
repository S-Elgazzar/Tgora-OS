export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing server environment variables' });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const currentUserResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: SERVICE_KEY,
      },
    });

    const currentUser = await currentUserResponse.json();

    if (!currentUser?.id) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    const roleResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/team_members?auth_user_id=eq.${currentUser.id}&select=role_type`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
      }
    );

    const roleData = await roleResponse.json();
    const currentRole = roleData?.[0]?.role_type;

    if (currentRole !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create members' });
    }

    const {
      name,
      email,
      password,
      job_title,
      department,
      role_type,
      status,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Name, email and password are required',
      });
    }

    const createUserResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
      }),
    });

    const authUser = await createUserResponse.json();

    if (!createUserResponse.ok) {
      return res.status(400).json({
        error: authUser?.msg || authUser?.message || 'Failed to create auth user',
      });
    }

    const insertMemberResponse = await fetch(`${SUPABASE_URL}/rest/v1/team_members`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        name,
        email,
        job_title,
        department,
        role_type,
        status,
        auth_user_id: authUser.id,
      }),
    });

    const memberData = await insertMemberResponse.json();

    if (!insertMemberResponse.ok) {
      return res.status(400).json({
        error: memberData?.message || 'Failed to create team member',
      });
    }

    return res.status(200).json({
      member: memberData[0],
    });
  } catch (error) {
    console.error('create-member error:', error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}
