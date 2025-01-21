# AI-Enhanced Helpdesk (Zendesk Clone)

A modern, AI-powered helpdesk system built with React, TypeScript, Supabase, and Drizzle ORM. This project aims to provide a scalable and feature-rich support ticket management system with role-based access control.

## Features

### Authentication & Authorization
- 🔐 Email/Password authentication via Supabase Auth
- 👥 Role-based access control (Admin, Agent, Customer)
- 🛡️ Protected routes based on user roles
- 📝 Automatic user profile creation
- 🔄 Session persistence

### User Management
- 👥 Comprehensive user listing with search
- ✨ Role-based filtering and management
- 📝 User profile creation and editing
- 🎭 Role assignment and updates
- 🔍 User activity tracking
- 📊 Ticket statistics per user
- 🎯 Inline role updates
- 🔄 Real-time UI updates

### Ticket Management
- 📋 Ticket listing with search and filters
- 🔍 Status and priority filtering
- 📊 Sortable table view
- ✏️ Ticket creation and editing
- 👤 Agent assignment
- 📈 Status and priority updates
- 🔒 Role-based access (Admin/Agent only)
- 📝 Ticket notes
- 🏷️ Tag system

### Core Functionality
- 📊 Dashboard with key metrics
  - Ticket statistics cards
  - Quick navigation to ticket management
  - Role-specific views
- 👥 User Management (Admin only)
  - User invitation system
  - Role assignment and management
  - User activity tracking
  - Profile management
- ⚙️ Settings Management (Admin only)
  - System configuration
  - Role management

### UI Components
- 🎨 Modern UI with Tailwind CSS
- 🔄 Loading states and error handling
- 📱 Responsive design
- 🎯 Accessible components using Radix UI
- 🌙 Dark mode support (planned)

## Tech Stack

- **Frontend:**
  - React 18 + TypeScript
  - Vite (Build tool)
  - TailwindCSS + shadcn/ui (Styling)
  - React Router v6 (Navigation)
  - React Hook Form (Form handling)
  - Radix UI (Accessible components)
  - Lucide React (Icons)

- **Backend:**
  - Supabase (Database & Auth)
  - Drizzle ORM (Type-safe DB queries)
  - PostgreSQL (Database)

## Environment Setup

The project uses environment variables for configuration. These are stored in `.env.local` and should contain:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url
```

> **Note**: The `.env.local` file is already set up in the project with the correct values. You don't need to modify it unless you're setting up a new environment.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/zendesk-replica.git
cd zendesk-replica
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url
```

4. Run database migrations:
```bash
npm run migrate
```

5. Start the development server:
```bash
npm run dev
```

### Database Setup

The project uses Supabase as the database with the following main tables:

1. `profiles` - User profiles linked to Supabase Auth
2. `user_roles` - Role assignments for users (many-to-many relationship)
3. `roles` - Role definitions (admin, agent, customer)
4. `tickets` - Support tickets
5. `kb_articles` - Knowledge base articles
6. `settings` - System-wide configuration settings
7. `ticket_notes` - Internal notes for tickets
8. `tags` - Tag management
9. `ticket_tags` - Many-to-many relationship for tickets and tags

Migrations are handled by Drizzle ORM.

## Project Structure

```
src/
├── components/        # Reusable UI components
├── contexts/         # React contexts (Auth, etc.)
├── db/              # Database configuration and schemas
├── lib/             # Utility functions
├── pages/           # Page components
│   ├── admin/       # Admin-specific pages
│   │   ├── Users.tsx       # User management
│   │   ├── UserDetail.tsx  # User details view
│   │   └── UserEdit.tsx    # User editing
│   └── ...
└── types/           # TypeScript type definitions
```

## Authentication Flow

1. **Sign Up:**
   - User creates account with email/password
   - Supabase Auth creates user
   - Trigger creates profile in `profiles` table
   - Default role is 'customer'

2. **Sign In:**
   - User signs in with credentials
   - Session is created
   - Profile is fetched with roles
   - User is redirected based on role

3. **Authorization:**
   - Routes are protected based on user role
   - Components render conditionally based on permissions
   - Admin users have full access
   - Agents can manage tickets
   - Customers can create and view their tickets

4. **User Management:**
   - Admins can invite new users
   - Role assignment through dropdown
   - User activity tracking
   - Profile updates and management

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run migrate` - Run database migrations

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by Zendesk's functionality
- Built with modern web technologies
- Designed for scalability and maintainability

## Recent Updates

### User Management Improvements
- Added comprehensive user listing with search
- Implemented user invitation system
- Added role management with inline editing
- Enhanced user detail view with activity information
- Added ticket count tracking per user
- Improved error handling and loading states

### Admin Dashboard Improvements
- Enhanced ticket statistics with real-time updates
- Fixed user count calculations using proper role-based filtering
- Added 30-day ticket activity visualization
- Improved error handling and loading states

### Settings Management
- Added system-wide settings management
- Implemented settings table for storing configuration
- Created admin interface for managing settings
- Added role-based access control for settings

### Technical Improvements
- Fixed TypeScript type definitions across components
- Improved error handling in admin statistics
- Enhanced database queries with proper joins and filtering
- Added proper role-based filtering for user counts
- Implemented proper error boundaries and loading states

## Planned Features

### Knowledge Base
- 📚 Article creation and management
- 🔍 Search functionality
- 🏷️ Categories and tags
- 👁️ Public/private visibility
- 📜 Version history

### Ticket Enhancements
- 💬 Comments and updates
- 📎 File attachments
- ⏰ SLA tracking
- 📨 Email notifications
- 📊 Advanced reporting
- 🤖 AI automation

### User Experience
- 🌙 Dark mode
- 📱 Mobile optimization
- 🔔 Toast notifications
- ✅ Confirmation dialogs
- 🔍 Global search
- 📋 Saved views
