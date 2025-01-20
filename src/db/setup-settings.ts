import { createDrizzleClient } from './server';
import { settings } from './schema';

async function setupSettings() {
  const db = createDrizzleClient();

  console.log('Creating initial settings...');
  
  // Create default settings
  await db.insert(settings)
    .values([
      {
        key: 'system.maintenance_mode',
        value: { enabled: false },
        description: 'Enable/disable system maintenance mode',
      },
      {
        key: 'tickets.auto_assignment',
        value: { enabled: true },
        description: 'Automatically assign tickets to available agents',
      },
      {
        key: 'notifications.email',
        value: { enabled: true, types: ['ticket_created', 'ticket_updated', 'ticket_assigned'] },
        description: 'Email notification settings',
      },
      {
        key: 'kb.default_visibility',
        value: { public: false },
        description: 'Default visibility for new knowledge base articles',
      },
    ])
    .onConflictDoNothing();

  console.log('Successfully set up initial settings');
}

setupSettings().catch(console.error); 