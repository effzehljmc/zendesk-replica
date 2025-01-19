import { createDrizzleClient } from './server';
import { roles, profiles, userRoles } from './schema';
import { eq } from 'drizzle-orm';

async function setupRoles() {
  const db = createDrizzleClient();

  console.log('Creating initial roles...');
  
  // Create roles
  await db.insert(roles)
    .values([
      { name: 'admin', description: 'Administrator with full access' },
      { name: 'agent', description: 'Support agent with ticket management access' },
      { name: 'customer', description: 'Regular customer with basic access' },
    ])
    .onConflictDoNothing();

  // Get admin role
  const adminRole = await db
    .select()
    .from(roles)
    .where(eq(roles.name, 'admin'))
    .then(rows => rows[0]);

  if (!adminRole) {
    throw new Error('Admin role not found');
  }

  // Find the user by email
  const user = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, 'lukas.maechtel@gauntletai.com'))
    .then(rows => rows[0]);

  if (!user) {
    throw new Error('User not found');
  }

  // Assign admin role to user
  await db.insert(userRoles)
    .values({
      user_id: user.id,
      role_id: adminRole.id,
    })
    .onConflictDoNothing();

  console.log('Successfully set up roles and assigned admin role to user');
}

setupRoles().catch(console.error); 