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
    auth_user_id uuid NOT NULL,
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
    ticket_number integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    customer_id uuid NOT NULL,
    assigned_to_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    first_response_at timestamp with time zone,
    resolution_time interval,
    satisfaction_rating integer,
    satisfaction_feedback text,
    CONSTRAINT tickets_satisfaction_rating_check CHECK (((satisfaction_rating >= 1) AND (satisfaction_rating <= 5)))
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- Name: tickets_ticket_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tickets_ticket_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tickets_ticket_number_seq OWNER TO postgres;

--
-- Name: tickets_ticket_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tickets_ticket_number_seq OWNED BY public.tickets.ticket_number;


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
-- Name: tickets ticket_number; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets ALTER COLUMN ticket_number SET DEFAULT nextval('public.tickets_ticket_number_seq'::regclass);


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
e844a8ab-8ad6-4c92-8870-57714445019c	31816721-45fc-4ce4-a625-7ff774bb8264	lukas.maechtel@outlook.com	Lukas2	2025-01-19 23:17:52.642304	2025-01-19 23:17:52.642304
f4935274-cb77-43e8-bf9f-757d7ef2b12b	a92b70e2-6cde-4bcc-b6b7-e750443d3355	lukasjmchagas@gmail.com	Lukas Customer	2025-01-19 23:24:45.750472	2025-01-19 23:24:45.750472
44def246-5cff-4b30-a6c6-e3a9104f6bfb	0d2b3b4d-da53-494c-a835-4db902bcd5b2	qrz69797@msssg.com	Test Customer	2025-01-22 08:55:24.779168	2025-01-22 08:55:24.779168
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

COPY public.tickets (id, ticket_number, title, description, status, priority, customer_id, assigned_to_id, created_at, updated_at, first_response_at, resolution_time, satisfaction_rating, satisfaction_feedback) FROM stdin;
40c86de0-a9db-4892-9017-338597114cf5	1	test	test	new	low	d7087860-bf5d-465a-a2d6-d5933ad794b8	d7087860-bf5d-465a-a2d6-d5933ad794b8	2025-01-19 22:44:25.236343+00	2025-01-19 22:44:25.236343+00	\N	\N	\N	\N
55e1da56-894b-415d-a431-5f63fe4647c7	2	Test2	test2	new	medium	d7087860-bf5d-465a-a2d6-d5933ad794b8	\N	2025-01-20 00:25:25.57175+00	2025-01-20 00:25:25.57175+00	\N	\N	\N	\N
d8a2046a-f627-41df-bb7f-cc5fbe6c325a	3			new	medium	d7087860-bf5d-465a-a2d6-d5933ad794b8	\N	2025-01-20 21:09:54.952649+00	2025-01-20 21:09:54.952649+00	\N	\N	\N	\N
e6d2991c-5620-47c9-bbf9-6f3aad0eda16	5	test4	test3	resolved	medium	d7087860-bf5d-465a-a2d6-d5933ad794b8	f4965fff-0d50-481e-9a0c-ee2268035f72	2025-01-20 21:18:23.28178+00	2025-01-20 22:43:48.104+00	\N	\N	\N	\N
960a714d-dfa2-45f9-afe3-c0d95d26ebb3	4	test3	test3	new	medium	d7087860-bf5d-465a-a2d6-d5933ad794b8	d7087860-bf5d-465a-a2d6-d5933ad794b8	2025-01-20 21:17:08.51344+00	2025-01-21 00:19:01.908+00	\N	\N	\N	\N
6004f08d-3a3c-4151-b3e0-3b790c75fd6c	6	Test	test ticket	open	urgent	f4935274-cb77-43e8-bf9f-757d7ef2b12b	\N	2025-01-21 00:43:47.847066+00	2025-01-22 08:18:26.254+00	\N	\N	\N	\N
01551c38-b97e-4350-8679-7b3740f956b0	7	test	test	resolved	medium	f4935274-cb77-43e8-bf9f-757d7ef2b12b	d7087860-bf5d-465a-a2d6-d5933ad794b8	2025-01-21 00:52:49.978912+00	2025-01-22 08:02:01.381+00	\N	1 day 07:09:08.981608	4	\N
e290f493-bf50-40dd-a3dd-283542123a19	69	realtime test	trealtime test	resolved	urgent	f4935274-cb77-43e8-bf9f-757d7ef2b12b	\N	2025-01-22 09:01:31.146413+00	2025-01-22 09:02:00.638+00	\N	00:00:29.679448	\N	\N
a08beecb-5fd4-461a-860e-48072e86eb3b	68	Late delivery	Package is not arriving on time	open	medium	f4935274-cb77-43e8-bf9f-757d7ef2b12b	d7087860-bf5d-465a-a2d6-d5933ad794b8	2025-01-22 08:28:04.254804+00	2025-01-22 17:43:04.347+00	2025-01-22 17:49:41.486858+00	\N	\N	\N
7e91f4f8-fa1d-4e66-af03-b8fdab72163e	70	Live Chat test	Hi, can you see my message	new	medium	d7087860-bf5d-465a-a2d6-d5933ad794b8	\N	2025-01-22 22:45:34.206904+00	2025-01-22 22:45:34.206904+00	\N	\N	\N	\N
98cd76ce-f811-43d7-955b-405d82615fda	71	Live Chat test	Hi, can you see my message	pending	medium	d7087860-bf5d-465a-a2d6-d5933ad794b8	d7087860-bf5d-465a-a2d6-d5933ad794b8	2025-01-22 22:46:41.24253+00	2025-01-22 22:51:35.383+00	\N	\N	\N	\N
072d0e8e-006d-4cb2-aa7a-0b8d53863e45	72	live chat test	test	new	medium	f4935274-cb77-43e8-bf9f-757d7ef2b12b	d7087860-bf5d-465a-a2d6-d5933ad794b8	2025-01-22 22:52:15.408267+00	2025-01-22 22:55:33.03+00	\N	\N	\N	\N
630af736-d85b-46ef-aa58-97db6fe58ba5	73	Test Support	test support	new	medium	f4935274-cb77-43e8-bf9f-757d7ef2b12b	d7087860-bf5d-465a-a2d6-d5933ad794b8	2025-01-22 23:01:53.00471+00	2025-01-22 23:02:09.137+00	2025-01-22 23:02:14.523247+00	\N	\N	\N
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, user_id, role_id, created_at, updated_at) FROM stdin;
655b1174-cd03-46fc-9697-91e492a7ba79	d7087860-bf5d-465a-a2d6-d5933ad794b8	0976d10b-541b-4ed0-a4cd-0579d996a64b	2025-01-19 19:43:58.150409	2025-01-19 19:43:58.150409
d30cda35-6fcf-4933-aa82-9014ecada3fd	d7087860-bf5d-465a-a2d6-d5933ad794b8	9675dffd-0247-4175-a63a-dfe6d20aeee9	2025-01-19 23:33:18.070496	2025-01-19 23:33:18.070496
16c29a5b-8e86-4f38-abe3-57e371d0fa6f	f4965fff-0d50-481e-9a0c-ee2268035f72	9675dffd-0247-4175-a63a-dfe6d20aeee9	2025-01-20 00:57:46.714791	2025-01-20 00:57:46.714791
2541b91a-ca52-4299-9748-80715fe97401	f4935274-cb77-43e8-bf9f-757d7ef2b12b	eaf538b0-6f8a-42c3-8495-742f36c77fe7	2025-01-21 02:26:25.227686	2025-01-21 02:26:25.227686
410c6db7-6d65-445b-98a7-dd2aeaccda7c	e844a8ab-8ad6-4c92-8870-57714445019c	0976d10b-541b-4ed0-a4cd-0579d996a64b	2025-01-22 07:26:19.288726	2025-01-22 07:26:19.288726
38469d5c-f202-4934-80b7-aa521a5a064e	44def246-5cff-4b30-a6c6-e3a9104f6bfb	eaf538b0-6f8a-42c3-8495-742f36c77fe7	2025-01-22 08:55:25.118528	2025-01-22 08:55:25.118528
\.


--
-- Name: tickets_ticket_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tickets_ticket_number_seq', 73, true);


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
-- Name: tickets_assigned_to_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tickets_assigned_to_id_idx ON public.tickets USING btree (assigned_to_id);


--
-- Name: tickets_customer_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tickets_customer_id_idx ON public.tickets USING btree (customer_id);


--
-- Name: tickets_ticket_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX tickets_ticket_number_key ON public.tickets USING btree (ticket_number);


--
-- Name: tickets create_conversation_for_ticket; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER create_conversation_for_ticket AFTER INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.create_ticket_conversation();


--
-- Name: tickets update_resolution_time_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_resolution_time_trigger BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_ticket_resolution_time();


--
-- Name: tickets fk_tickets_assigned_to; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_tickets_assigned_to FOREIGN KEY (assigned_to_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tickets fk_tickets_customer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_tickets_customer FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: kb_articles kb_articles_author_id_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_author_id_profiles_id_fk FOREIGN KEY (author_id) REFERENCES public.profiles(id);


--
-- Name: tickets tickets_assigned_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


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
-- Name: SEQUENCE tickets_ticket_number_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tickets_ticket_number_seq TO anon;
GRANT ALL ON SEQUENCE public.tickets_ticket_number_seq TO authenticated;
GRANT ALL ON SEQUENCE public.tickets_ticket_number_seq TO service_role;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;


--
-- PostgreSQL database dump complete
--

