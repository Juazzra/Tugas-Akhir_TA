--
-- PostgreSQL database dump
--

\restrict 9vPRZWGgyE0c8H0NZjdwaFZna8SgiZSfmz0oLvcqU0mdqGgeUNJpH4zJtD6tQWQ

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-04-27 14:41:31

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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
-- TOC entry 222 (class 1259 OID 16434)
-- Name: inventory_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    user_id uuid NOT NULL,
    tipe_transaksi character varying(10) NOT NULL,
    qty integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inventory_logs_qty_check CHECK ((qty > 0)),
    CONSTRAINT inventory_logs_tipe_transaksi_check CHECK (((tipe_transaksi)::text = ANY ((ARRAY['IN'::character varying, 'OUT'::character varying])::text[])))
);


ALTER TABLE public.inventory_logs OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16404)
-- Name: items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    barcode character varying(100) NOT NULL,
    nama_barang character varying(150) NOT NULL,
    jenis character varying(50),
    stok_aktual integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT items_stok_aktual_check CHECK ((stok_aktual >= 0))
);


ALTER TABLE public.items OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16421)
-- Name: scanner_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scanner_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    barcode character varying(100) NOT NULL,
    mode character varying(10) NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    scanned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT scanner_queue_mode_check CHECK (((mode)::text = ANY ((ARRAY['IN'::character varying, 'OUT'::character varying])::text[]))),
    CONSTRAINT scanner_queue_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);


ALTER TABLE public.scanner_queue OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16389)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama character varying(100) NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'staff'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 5052 (class 0 OID 16434)
-- Dependencies: 222
-- Data for Name: inventory_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_logs (id, item_id, user_id, tipe_transaksi, qty, created_at) FROM stdin;
\.


--
-- TOC entry 5050 (class 0 OID 16404)
-- Dependencies: 220
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.items (id, barcode, nama_barang, jenis, stok_aktual, created_at, updated_at) FROM stdin;
c7d8b18e-9ed7-4ac7-9cdf-fd10d62abb8c	8991234567890	Kabel Jumper Male to Male	Komponen Elektronik	50	2026-04-27 13:41:59.427588	2026-04-27 13:41:59.427588
\.


--
-- TOC entry 5051 (class 0 OID 16421)
-- Dependencies: 221
-- Data for Name: scanner_queue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scanner_queue (id, barcode, mode, status, scanned_at) FROM stdin;
\.


--
-- TOC entry 5049 (class 0 OID 16389)
-- Dependencies: 219
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, nama, username, password, role, created_at) FROM stdin;
c3326a06-f78e-4b87-8397-12466f064e95	Henry of Skalitz	Hernyquitehungry	$2b$10$Wc1h1gryICBOoHAYqrwXyuUG6UlqRVws0E64HUYhK.veoRetrEN6u	admin	2026-04-27 14:14:50.002234
\.


--
-- TOC entry 4899 (class 2606 OID 16448)
-- Name: inventory_logs inventory_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_logs
    ADD CONSTRAINT inventory_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4891 (class 2606 OID 16419)
-- Name: items items_barcode_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_barcode_key UNIQUE (barcode);


--
-- TOC entry 4893 (class 2606 OID 16417)
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- TOC entry 4895 (class 2606 OID 16433)
-- Name: scanner_queue scanner_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scanner_queue
    ADD CONSTRAINT scanner_queue_pkey PRIMARY KEY (id);


--
-- TOC entry 4886 (class 2606 OID 16401)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4888 (class 2606 OID 16403)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4889 (class 1259 OID 16420)
-- Name: idx_items_barcode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_items_barcode ON public.items USING btree (barcode);


--
-- TOC entry 4896 (class 1259 OID 16460)
-- Name: idx_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_created_at ON public.inventory_logs USING btree (created_at);


--
-- TOC entry 4897 (class 1259 OID 16459)
-- Name: idx_logs_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_item_id ON public.inventory_logs USING btree (item_id);


--
-- TOC entry 4900 (class 2606 OID 16449)
-- Name: inventory_logs inventory_logs_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_logs
    ADD CONSTRAINT inventory_logs_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- TOC entry 4901 (class 2606 OID 16454)
-- Name: inventory_logs inventory_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_logs
    ADD CONSTRAINT inventory_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


-- Completed on 2026-04-27 14:41:31

--
-- PostgreSQL database dump complete
--

\unrestrict 9vPRZWGgyE0c8H0NZjdwaFZna8SgiZSfmz0oLvcqU0mdqGgeUNJpH4zJtD6tQWQ

