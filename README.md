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
- 💬 Real-time ticket messages
- 🏷️ Tag system
- ⭐ Customer satisfaction ratings
- ⏱️ Response time tracking

### Analytics & Reporting
- 📊 Dedicated Analytics Dashboard
  - Ticket volume by status (pie chart)
  - Ticket activity trends (30-day line chart)
  - Real-time data updates
  - Role-based access (Admin/Agent only)
- 📊 Customer Statistics
  - Ticket status distribution
  - Average response time
  - Satisfaction ratings
  - Recent ticket history
  - Suggested knowledge base articles
- 📈 Agent Performance Metrics
  - Tickets handled
  - Average response time
  - Customer satisfaction scores
  - Resolution rates

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

### Automatic Knowledge Base Suggestions

The system automatically suggests relevant knowledge base articles to users when they create tickets, using AI-powered similarity matching:

1. **Real-time Suggestions**
   - When creating a ticket, users see suggested articles based on their title and description
   - Articles are ranked by relevance using vector similarity search
   - Helps users find solutions before submitting tickets

2. **Automated First Response**
   - When a new ticket is created, the system:
     - Generates embeddings for the ticket content using OpenAI
     - Searches for matching KB articles using PostgreSQL's vector similarity
     - Automatically posts relevant articles if a good match is found (similarity > 75%)
   - Users can:
     - View the suggested article
     - Mark their ticket as resolved if the article helped
     - Request further assistance if needed

3. **Technical Implementation**
   - Uses OpenAI embeddings to convert text into vector representations
   - Stores embeddings in Supabase using the pgvector extension
   - Performs real-time similarity search using cosine distance
   - Combines database triggers and client-side automation for a seamless experience

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL)
- **AI/ML**: OpenAI API for embeddings
- **Vector Search**: pgvector extension
- **Real-time**: Supabase Realtime subscriptions

## Architecture

### Automatic Response Flow

1. **Ticket Creation**
   ```
   User creates ticket → Generate embedding → Search KB articles → Post automated response
   ```

2. **Vector Search**
   ```
   Ticket content → OpenAI embedding → pgvector similarity search → Best matching articles
   ```

3. **Response Mechanism**
   ```
   Match found → Create automated message → Display interactive response UI
   ```

The system combines several components to provide automated assistance:

1. **Embedding Generation**
   - Uses OpenAI's text-embedding-ada-002 model
   - Converts ticket title and description into vector representations
   - Enables semantic search beyond simple keyword matching

2. **Vector Similarity Search**
   - Utilizes PostgreSQL's pgvector extension
   - Performs cosine similarity search against KB article embeddings
   - Returns articles ranked by relevance score (0-1)

3. **Automated Response System**
   - Database trigger creates initial "Checking..." message
   - Client-side automation finds best matching articles
   - Interactive UI allows users to:
     - View full article
     - Mark issue as resolved
     - Request human assistance

4. **Real-time Updates**
   - Supabase Realtime keeps UI in sync
   - Instant feedback on ticket status changes
   - Live updates for new messages and responses

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

### Knowledge Base Implementation
- Added public-facing Knowledge Base with search functionality
- Implemented admin interface for KB article management
- Added support for public/private article visibility
- Real-time search with vector similarity for better results
- Clean, user-friendly article listing and detail views
- Full CRUD operations for KB articles in admin dashboard
- Rich text editing for article content
- Article preview functionality
- Responsive design for all screen sizes

### Ticket Communication Enhancement
- Added real-time messaging system for tickets
- Implemented message deletion for message owners
- Added real-time updates for all ticket participants
- Enhanced ticket detail page with separate message and notes sections
- Improved user experience with real-time message delivery

### Analytics Dashboard Enhancement
- Added dedicated analytics page for agents and admins
- Implemented interactive pie chart for ticket status distribution
- Added 30-day ticket activity trend visualization
- Enhanced data visualization with real-time updates
- Improved loading states and error handling for analytics
- Added role-based access control for analytics features
- Added first response time tracking for better agent performance metrics

### Customer Experience Improvements
- Added customer satisfaction ratings for resolved tickets
- Implemented response time tracking and analytics
- Enhanced ticket status visibility
- Added suggested knowledge base articles
- Improved customer dashboard with comprehensive statistics

### Analytics Enhancements
- Added detailed customer statistics tracking
- Implemented agent performance metrics including first response time
- Added team-wide performance analytics
- Enhanced response time calculations with automatic tracking
- Added satisfaction rating system
- Improved agent performance tracking with first response metrics

### Technical Improvements
- Added stored procedures for complex business logic
- Enhanced database schema with response time tracking
- Improved real-time updates for analytics data
- Added robust error handling for data operations
- Implemented schema-first development approach

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

## Knowledge Base

The Knowledge Base (KB) section provides a public-facing documentation system with the following features:

### Features
- Public access to knowledge base articles (no login required)
- Vector similarity search using pgvector
- Related articles suggestions based on content similarity
- Article management interface for admins
- Real-time article updates with embeddings

### Technical Details
- Uses OpenAI embeddings for semantic search
- PostgreSQL vector similarity search with pgvector extension
- Cosine similarity for finding related articles
- Caching with React Query (5-minute stale time)
- Responsive loading states with skeleton UI

### Environment Variables
```bash
VITE_OPENAI_API_KEY=your_openai_api_key  # Required for embeddings
```

### Database Setup
The KB uses the following PostgreSQL extensions and features:
- pgvector extension for vector operations
- Vector similarity search index
- Automatic embedding updates on article changes

### API Functions
- `get_similar_articles`: Finds similar articles using vector similarity
- `match_kb_articles`: Performs semantic search across articles

### Vector Search Implementation
The Knowledge Base uses vector similarity search with the following features:

#### Search Functions
- `match_kb_articles`: Performs semantic search using query embeddings
  - Parameters:
    - `query_embedding`: vector(1536)
    - `match_threshold`: float (default: 0.1)
    - `match_count`: int (default: 5)
  - Returns articles ordered by similarity

#### Similarity Scoring
- Uses cosine similarity with pgvector
- Scores range from 0.0 to 1.0 (higher is better)
- Current threshold set to 0.1 to capture semantic relationships
- Results ordered by similarity score

#### Technical Implementation
- OpenAI text-embedding-3-small model for embeddings
- PostgreSQL pgvector extension for vector operations
- IVFFlat index for efficient similarity search
- Automatic embedding generation on article creation/update

#### Performance Optimization
- Vector index using `ivfflat` with `vector_cosine_ops`
- Caching of search results with React Query
- Automatic index usage for similarity queries
