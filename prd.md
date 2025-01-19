# Product Requirements Document (PRD)

## 1. Overview

**Project Name:** AI-Enhanced Helpdesk (Zendesk-Clone) with Drizzle  
**Description:** This project aims to build a next-generation, AI-powered helpdesk system reminiscent of Zendesk, but leveraging **Vite (React + TypeScript)** for the front end, **Supabase** for database, auth, and realtime features, **Drizzle** ORM for type-safe database interactions, and AI integrations for automated ticket handling. The system will support ticket management, user authentication, a knowledge base, reporting, and analytics, all wrapped in a modern, customizable UI.

---

## 2. Goals & Objectives

1. **Streamlined Ticket Workflows:** Provide agents with a feature-rich interface for managing tickets—supported by automated AI suggestions.
2. **Scalable & Type-Safe Architecture:** Use **Supabase** + **Drizzle** to ensure robust schema management and typed queries, improving developer productivity and reducing errors.
3. **Seamless Auth Integration:** Combine **Supabase Auth** with a custom user table managed by Drizzle for advanced user relationships (e.g., user profiles, roles).
4. **Modern UI/UX:** Utilize shadcn/ui and Lucid for a streamlined agent and customer portal experience.
5. **Efficient Collaboration & Knowledge Sharing:** Enable internal notes, knowledge base articles, article feedback, and real-time updates.

---

## 3. Stakeholders & Users

- **Admins:** Oversee system setup, manage agent assignments, create knowledge base content, configure AI automations.
- **Agents:** Resolve tickets, communicate with customers, update ticket statuses, reference knowledge base articles, use AI suggestions for faster responses.
- **Customers:** Submit and track tickets, browse the knowledge base, receive notifications on ticket updates.
- **Product/Tech Team:** Manages the development, ensures alignment with business requirements, and handles deployments.

---

## 4. Key Features

1. **Authentication & RBAC**
   - **Supabase Auth** for core user authentication.
   - Separate “profiles” or custom user table in the public schema, maintained by **Drizzle**.
   - Role-based access (admin, agent, customer) for controlling ticket features.

2. **Ticket Management**
   - Ticket creation (with status, priority, and tags).
   - SLA tracking (time-to-respond, time-to-resolve).
   - Automated or manual assignment to agents.
   - Internal agent notes, file attachments, and real-time updates.

3. **Knowledge Base**
   - Article creation, versioning, and tagging.
   - Public vs. private articles (internal docs).
   - Feedback system (thumbs up/down) for article helpfulness.
   - Search capability (keyword-based or AI-assisted).

4. **AI Automation**
   - Automated ticket triage/classification based on content.
   - Suggested replies for repetitive inquiries.
   - Summaries of long conversation threads to expedite resolution.
   - Optional chatbot for customer self-service.

5. **Reporting & Analytics**
   - Dashboard for ticket volumes, agent performance, SLA compliance.
   - Graphical data visualization (e.g., Chart.js, Recharts).
   - Export or scheduled reports for management review.

---

## 5. Use Cases

1. **Customer Creating a Ticket**
   - Logs in via Supabase Auth or uses email-to-ticket integration.
   - Ticket is inserted into the `tickets` table (Drizzle-managed).
   - System (AI) assigns a priority or tags if relevant.

2. **Agent Resolving Tickets**
   - Agent logs in, sees assigned tickets in a queue.
   - AI suggests responses or a summarization of the conversation.
   - Agent marks the ticket as “Solved,” triggering notifications.

3. **Admin Managing Knowledge Base**
   - Admin creates or updates articles in the KB section.
   - Adds tags, toggles public/private visibility.
   - Articles are stored using Drizzle in a `kb_articles` table.

4. **Dashboard & Analytics**
   - Admin or manager views an analytics dashboard showing open vs. solved tickets, agent performance, SLA breaches.
   - Charts retrieve aggregated data from Supabase via Drizzle queries.

5. **AI Triage & Conversation Summaries**
   - AI examines new tickets, suggests an appropriate category or priority.
   - Agents can generate a one-click summary on lengthy threads to speed up resolution.

---

## 6. Technical Implementation

### 6.1 Frontend (Vite + React)

- **React + TypeScript** powered by Vite for fast builds and hot-module reloading.
- **UI Components**: shadcn/ui and Lucid for styling and reusable components.

### 6.2 Supabase & Drizzle Integration

- **Supabase**:
  - Hosts the core PostgreSQL database.
  - Manages main Auth flow (via `auth.users` table).
  - Provides real-time updates on ticket changes.
- **Drizzle**:
  - Handles type-safe schema definitions and migrations in the **public** schema.
  - Facilitates queries to custom tables (e.g., `tickets`, `profiles`, `kb_articles`).
  - Encourages strong typing, reducing runtime errors.

### 6.3 Linking Supabase Auth to Drizzle

> **Yes, you can set up Supabase Auth with Drizzle ORM, but there are some considerations to keep in mind:**

1. **`auth.users` Table**  
   - This built-in table is **not directly accessible** through Drizzle ORM [[1]](https://www.reddit.com/r/Supabase/comments/1bogqtf/how_to_access_auth_table_with_drizzle_orm/) [[4]](https://www.answeroverflow.com/m/1214009602899710022).

2. **Create a Separate User Table**  
   - **Best practice**: Make a `profiles` (or `users_public`) table in the public schema that references `auth.users` [[2]](https://github.com/orgs/supabase/discussions/27426) [[6]](https://github.com/supabase/supabase/issues/19883).

3. **Trigger & Function**  
   - Add a trigger on `auth.users` to automatically insert or update rows in your Drizzle-managed `profiles` table whenever new users register [[2]](https://github.com/orgs/supabase/discussions/27426).

4. **UUID Linking**  
   - Use a UUID column in the `profiles` table that matches the Supabase Auth user ID, enabling relationships and foreign keys [[4]](https://www.answeroverflow.com/m/1214009602899710022).

5. **Drizzle Clients**  
   - `getDrizzleSupabaseClient()`: Respects RLS for normal operations.  
   - `getDrizzleSupabaseAdminClient()`: Bypasses RLS; use with caution [[5]](https://makerkit.dev/docs/next-supabase-turbo/recipes/drizzle-supabase).

6. **Environment Variables**  
   - Ensure `SUPABASE_DATABASE_URL` is configured in your environment for Drizzle usage [[5]](https://makerkit.dev/docs/next-supabase-turbo/recipes/drizzle-supabase).

7. **Server Environment Only**  
   - Run Drizzle code in server contexts (like AWS Lambda or serverless API routes). Drizzle is not intended for direct client/browser usage.

### 6.4 AI Features

- **OpenAI** or other LLM provider for:
  - Automatic triage (priority/labeling).
  - Suggested replies and conversation summarization.
- **Integration**:
  - Possibly done in serverless functions to keep secret keys secure.
  - Vite front-end calls these endpoints to retrieve suggestions.

### 6.5 Deployment

- **AWS Amplify** handles:
  - Deploying the static front-end (built with Vite).
  - Environment variables for Supabase keys, Drizzle DB URL, and AI keys.
  - Optional serverless functions for secure AI interactions.

---

## 7. Success Metrics & KPIs

1. **Resolution Time**: Average time per ticket to move from “New” to “Solved.”  
2. **Agent Efficiency**: Number of tickets closed daily, improved with AI suggestions.  
3. **User Adoption**: Frequency of customers accessing the knowledge base prior to ticket creation.  
4. **CSAT Scores**: Customer satisfaction from post-resolution surveys.  
5. **SLA Compliance**: Rate of tickets resolved within allocated time.

---

## 8. Timeline & Milestones

1. **Phase 1 
   - Basic Drizzle-based schema (`profiles`, `tickets`), triggered from Supabase Auth.  
   - Ticket creation & listing, minimal AI for suggested replies.
   - Knowledge base CRUD.

2. **Phase 2 
   - SLA metrics, email-to-ticket, real-time features, advanced RBAC.  
   - AI improvements (auto-labelling, conversation summarization).  
   - Basic analytics dashboard.

3. **Phase 3 
   - UI refinement (shadcn/ui and Lucid), final QA, performance optimizations.  
   - Security review (RLS, restricted Drizzle admin client usage).  
   - Deployment to production with robust environment variable management in AWS Amplify.

---

## 9. Risks & Mitigations

- **Risk**: Complexity of linking Supabase Auth and Drizzle.  
  - **Mitigation**: Use official Drizzle and Supabase docs; set up triggers and a separate user table carefully.
- **Risk**: Exposing AI keys if used in client code.  
  - **Mitigation**: Make calls from serverless endpoints or restricted environment with Drizzle.
- **Risk**: RLS misconfiguration leading to unauthorized data access.  
  - **Mitigation**: Thoroughly test row-level security policies and confirm Drizzle usage with the correct client.

---

## 10. Conclusion

By combining **Vite + React + TypeScript**, **Supabase** for hosting the database/auth layer, **Drizzle** for type-safe SQL management, and **AI** for ticket automation, we can deliver a powerful, scalable helpdesk system. This approach addresses the complexities of linking Supabase Auth with a custom user schema, while preserving a seamless developer experience with Drizzle. The result is a robust, modern helpdesk solution poised to match—and extend—the capabilities of traditional platforms like Zendesk.
