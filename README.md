# AI-Enhanced Helpdesk (Zendesk Clone)

A modern, AI-powered helpdesk system built with React, TypeScript, Supabase, and Drizzle ORM. This project aims to provide a scalable and feature-rich support ticket management system with role-based access control.

## Features

### Authentication & Authorization
- 🔐 Email/Password authentication via Supabase Auth
- 👥 Role-based access control (Admin, Agent, Customer)
- 🛡️ Protected routes based on user roles
- 📝 Automatic user profile creation
- 🔄 Session persistence

### Core Functionality
- 📊 Dashboard with key metrics
- 🎫 Ticket management system
- 📚 Knowledge base articles
- 📈 Analytics and reporting
- 👥 User management

## Tech Stack

- **Frontend:**
  - React + TypeScript
  - Vite (Build tool)
  - TailwindCSS (Styling)
  - React Router (Navigation)

- **Backend:**
  - Supabase (Database & Auth)
  - Drizzle ORM (Type-safe DB queries)
  - PostgreSQL (Database)

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/yourusername/zendesk-replica.git
cd zendesk-replica
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Create a \`.env.local\` file in the root directory:
\`\`\`env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url
\`\`\`

4. Run database migrations:
\`\`\`bash
npm run migrate
\`\`\`

5. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

### Database Setup

The project uses Supabase as the database with the following main tables:

1. \`profiles\` - User profiles and roles
2. \`tickets\` - Support tickets
3. \`kb_articles\` - Knowledge base articles

Migrations are handled by Drizzle ORM.

## Project Structure

\`\`\`
src/
├── components/        # Reusable UI components
├── contexts/         # React contexts (Auth, etc.)
├── db/              # Database configuration and schemas
├── lib/             # Utility functions
├── pages/           # Page components
└── types/           # TypeScript type definitions
\`\`\`

## Authentication Flow

1. **Sign Up:**
   - User creates account with email/password
   - Supabase Auth creates user
   - Trigger creates profile in \`profiles\` table
   - Default role is 'customer'

2. **Sign In:**
   - User signs in with credentials
   - Session is created
   - Profile is fetched
   - User is redirected based on role

3. **Authorization:**
   - Routes are protected based on user role
   - Components render conditionally based on permissions
   - Admin users have full access
   - Agents can manage tickets
   - Customers can create and view their tickets

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run preview\` - Preview production build
- \`npm run migrate\` - Run database migrations

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by Zendesk's functionality
- Built with modern web technologies
- Designed for scalability and maintainability
