#Project Specs
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

## 7. Implementation Steps

Below is a high-level sequence of tasks to get from a blank repository to a running AI-Enhanced Helpdesk system, integrating Drizzle and Supabase Auth:

1. **Project & Repo Setup**
   - Create a new GitHub repo (e.g., `helpdesk-drizzle`) or clone an existing one.  
   - Initialize a Vite + React + TypeScript project:
     ```bash
     npm create vite@latest . -- --template react-ts
     ```
   - Commit and push to GitHub.

2. **AWS Amplify Connection**
   - Go to AWS Amplify Console and connect the new repo.  
   - Configure build settings (should detect Vite automatically).  
   - Set up environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.) in Amplify for secure usage.

3. **Install & Configure Drizzle + Supabase Client**
   - In your project:
     ```bash
     npm install @supabase/supabase-js drizzle-orm
     ```
   - Create a file for your Drizzle setup (e.g., `drizzle.config.ts`) specifying `SUPABASE_DATABASE_URL`.
   - Add a `supabaseClient.ts` for the standard Supabase client, used for Auth/Realtime:
     ```ts
     import { createClient } from '@supabase/supabase-js';
     export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
     ```

4. **Database Schema with Drizzle**
   - Define your `profiles`, `tickets`, `kb_articles` schema in Drizzle. Example:
     ```ts
     // drizzle/schema.ts
     import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
     
     export const profiles = pgTable("profiles", {
       id: uuid("id").primaryKey().defaultRandom(),
       authUserId: uuid("auth_user_id").notNull(),
       createdAt: timestamp("created_at").defaultNow(),
       // ...
     });

     export const tickets = pgTable("tickets", {
       id: uuid("id").primaryKey().defaultRandom(),
       title: varchar("title", { length: 255 }).notNull(),
       status: varchar("status", { length: 50 }).notNull().default("New"),
       // ...
     });
     ```
   - Create migrations or apply changes to your Supabase DB via Drizzle.

5. **Linking Supabase Auth to Drizzle `profiles` Table**
   - Create a `profiles` table with a `authUserId` column referencing `auth.users`.  
   - Setup a **trigger** on `auth.users` to auto-insert into `profiles` when new users register.  
     ```sql
     CREATE OR REPLACE FUNCTION handle_new_user()
     RETURNS trigger AS $$
     BEGIN
       INSERT INTO public.profiles (auth_user_id) VALUES (NEW.id);
       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql;

     CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW
     EXECUTE PROCEDURE handle_new_user();
     ```

6. **Build Core Ticket Features**
   - **Ticket Create/List**: Use Drizzle queries in serverless endpoints or use the Supabase client for quick CRUD.  
   - **Assignment & SLA**: Add columns for assigned agents, time to respond, etc.  
   - **Real-Time**: Tap into Supabase Realtime or subscriptions for instant UI updates.

7. **Knowledge Base & Article Management**
   - Define Drizzle schema for `kb_articles`.  
   - Create a React UI (e.g., `ArticleList`, `ArticleEditor`) that interacts with these tables via your serverless calls or direct Supabase queries.

8. **AI Integration**
   - **Serverless Function**: Create an endpoint (e.g., `api/ai/suggest`) that takes a ticket body, calls OpenAI, and returns a suggested response.  
   - **Summaries & Classification**: Similar approach—create endpoints for summarization or auto-tagging.

9. **UI/UX with shadcn/ui & Lucid**
   - Integrate component libraries for consistent design.  
   - Add navigation, layout, and dynamic forms for creating/editing tickets, articles, etc.

10. **Reporting & Analytics**
    - Summaries of tickets, response times, agent performance.  
    - Use Drizzle to aggregate and compute statistics (e.g., count of tickets with status “Open”).  
    - Display in a dashboard with charts (Chart.js, Recharts).

11. **Testing & QA**
    - Verify RLS rules are correct.  
    - Ensure your triggers for the `profiles` table are firing.  
    - Validate AI suggestions before going live (especially for accuracy).

12. **Production Hardening & Deployment**
    - Finalize environment variables in Amplify (DB URL, AI keys, etc.).  
    - Thoroughly test RLS, ensuring no unauthorized data access.  
    - Confirm that the client-side code references only the public keys, while serverless or backend code handles sensitive secrets.

---

## 8. Success Metrics & KPIs

1. **Resolution Time**: Average time per ticket from “New” to “Solved.”  
2. **Agent Efficiency**: Number of tickets closed daily, improved via AI suggestions.  
3. **User Adoption**: Frequency of customers accessing the knowledge base prior to ticket creation.  
4. **CSAT Scores**: Customer satisfaction from post-resolution surveys.  
5. **SLA Compliance**: Percentage of tickets resolved within allocated SLA timeframe.

---

## 9. Timeline & Milestones

1. **Phase 1 (4-6 Weeks)**  
   - Drizzle-based schema (`profiles`, `tickets`), triggered from Supabase Auth.  
   - Basic Ticket CRUD with AI suggestion stubs.  
   - Knowledge Base CRUD (admin only).

2. **Phase 2 (4 Weeks)**  
   - SLA metrics, email-to-ticket integration, real-time features.  
   - Enhanced AI (auto-labelling, conversation summarization).  
   - Reporting & analytics dashboard.

3. **Phase 3 (2 Weeks)**  
   - UI refinement (shadcn/ui & Lucid), final QA.  
   - Security review for Drizzle admin client usage, RLS configuration.  
   - Production deployment on AWS Amplify.

---

## 10. Risks & Mitigations

- **Risk**: Complexity of linking Supabase Auth and Drizzle.  
  - **Mitigation**: Use official Drizzle & Supabase docs, carefully test triggers.  
- **Risk**: Possible exposure of AI keys if done client-side.  
  - **Mitigation**: Implement serverless AI calls behind protected endpoints.  
- **Risk**: Performance overhead with real-time queries on large ticket volumes.  
  - **Mitigation**: Configure Supabase Realtime and indexing properly.

---

## 11. Conclusion

By combining **Vite (React + TypeScript)** for a modern frontend, **Supabase** for database hosting and auth, **Drizzle** for type-safe schema management and migrations, and AI for automated ticket workflows, this helpdesk project can match (and exceed) Zendesk’s core functionality. Following the above **Implementation Steps** ensures a streamlined build process, robust data integrity, and an extensible architecture that accommodates future growth and features.
