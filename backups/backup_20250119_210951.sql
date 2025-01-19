--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 16.6 (Ubuntu 16.6-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: kb_articles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kb_articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    author_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.kb_articles OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auth_user_id text NOT NULL,
    email text NOT NULL,
    full_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    status character varying(50) DEFAULT 'new'::character varying NOT NULL,
    priority character varying(50) DEFAULT 'medium'::character varying NOT NULL,
    created_by uuid NOT NULL,
    assigned_to uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Data for Name: kb_articles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kb_articles (id, title, content, is_public, author_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profiles (id, auth_user_id, email, full_name, created_at, updated_at) FROM stdin;
f4965fff-0d50-481e-9a0c-ee2268035f72	f8f9bd9a-746c-426f-9c6f-13835f89c7d1	lukas.m.chagas@outlook.com	Lukas2	2025-01-19 19:39:34.245053	2025-01-19 19:39:34.245053
d7087860-bf5d-465a-a2d6-d5933ad794b8	63b47707-0e90-434b-a748-7f03c7447916	lukas.maechtel@gauntletai.com	Lukas	2025-01-19 19:40:31.569184	2025-01-19 19:40:31.569184
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, created_at, updated_at) FROM stdin;
0976d10b-541b-4ed0-a4cd-0579d996a64b	admin	Administrator with full access	2025-01-19 19:43:57.850315	2025-01-19 19:43:57.850315
9675dffd-0247-4175-a63a-dfe6d20aeee9	agent	Support agent with ticket management access	2025-01-19 19:43:57.850315	2025-01-19 19:43:57.850315
eaf538b0-6f8a-42c3-8495-742f36c77fe7	customer	Regular customer with basic access	2025-01-19 19:43:57.850315	2025-01-19 19:43:57.850315
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tickets (id, title, description, status, priority, created_by, assigned_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, user_id, role_id, created_at, updated_at) FROM stdin;
655b1174-cd03-46fc-9697-91e492a7ba79	d7087860-bf5d-465a-a2d6-d5933ad794b8	0976d10b-541b-4ed0-a4cd-0579d996a64b	2025-01-19 19:43:58.150409	2025-01-19 19:43:58.150409
\.


--
-- Name: kb_articles kb_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_auth_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_auth_user_id_unique UNIQUE (auth_user_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: kb_articles kb_articles_author_id_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_author_id_profiles_id_fk FOREIGN KEY (author_id) REFERENCES public.profiles(id);


--
-- Name: tickets tickets_assigned_to_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assigned_to_profiles_id_fk FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);


--
-- Name: tickets tickets_created_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_created_by_profiles_id_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: user_roles user_roles_role_id_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: user_roles user_roles_user_id_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: TABLE kb_articles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.kb_articles TO anon;
GRANT ALL ON TABLE public.kb_articles TO authenticated;
GRANT ALL ON TABLE public.kb_articles TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.roles TO anon;
GRANT ALL ON TABLE public.roles TO authenticated;
GRANT ALL ON TABLE public.roles TO service_role;


--
-- Name: TABLE tickets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tickets TO anon;
GRANT ALL ON TABLE public.tickets TO authenticated;
GRANT ALL ON TABLE public.tickets TO service_role;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;


--
-- PostgreSQL database dump complete
--

