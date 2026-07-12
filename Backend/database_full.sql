--
-- PostgreSQL database dump
--

\restrict rczeYJLOe8JFhe0y2MnxbSGRDzee0iGBbxm4USldx5gYjC8CkfAhFGVBULRNKgb

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    nama_dept character varying(100) NOT NULL
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_id_seq OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: inventory_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    user_id uuid,
    tipe_transaksi character varying(10) NOT NULL,
    qty integer NOT NULL,
    referensi_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inventory_logs_qty_check CHECK ((qty > 0)),
    CONSTRAINT inventory_logs_tipe_transaksi_check CHECK (((tipe_transaksi)::text = ANY ((ARRAY['IN'::character varying, 'OUT'::character varying])::text[])))
);


ALTER TABLE public.inventory_logs OWNER TO postgres;

--
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
    is_active boolean DEFAULT true,
    stok_min integer DEFAULT 0,
    stok_safety integer DEFAULT 0,
    stok_max integer DEFAULT 0,
    rata_kebutuhan_bulanan integer DEFAULT 0,
    harga_per_unit numeric(15,2) DEFAULT 0.00,
    foto_barang text,
    CONSTRAINT items_stok_aktual_check CHECK ((stok_aktual >= 0))
);


ALTER TABLE public.items OWNER TO postgres;

--
-- Name: request_detail; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.request_detail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid,
    item_id uuid,
    jumlah integer NOT NULL,
    alasan character varying(100),
    foto_bukti text,
    is_scanned boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT request_detail_jumlah_check CHECK ((jumlah > 0))
);


ALTER TABLE public.request_detail OWNER TO postgres;

--
-- Name: request_header; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.request_header (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    tgl_pengambilan date NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    pengambilan_oleh character varying(50),
    CONSTRAINT request_header_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'processing'::character varying, 'waiting_pickup'::character varying, 'completed'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.request_header OWNER TO postgres;

--
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
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nik character varying(20) NOT NULL,
    pin character varying(255) NOT NULL,
    nama character varying(100) NOT NULL,
    departemen_id integer,
    nama_leader character varying(100),
    tipe_karyawan character varying(20) DEFAULT 'tetap'::character varying,
    role character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    foto_profil text,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'karyawan'::character varying])::text[]))),
    CONSTRAINT users_tipe_karyawan_check CHECK (((tipe_karyawan)::text = ANY ((ARRAY['tetap'::character varying, 'kontrak'::character varying, 'magang'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, nama_dept) FROM stdin;
1	Stamping
2	Assembly
3	Plant Maintenance
4	DPC
5	PPIC
6	PE & Tool Maintenance
7	Tool Manufacture
8	NPC
9	Quality Assurance
10	EHS
11	QEMS
12	Sales
13	Finance Accounting
14	Purchasing
15	ICT
16	HRGA
17	Thailand Team
18	Security
\.


--
-- Data for Name: inventory_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_logs (id, item_id, user_id, tipe_transaksi, qty, referensi_id, created_at) FROM stdin;
350f348c-1e71-49d4-bcc0-831e1907703b	eac8b1c7-87e8-47ff-a04f-d6e0f55d2c2f	adbf3284-301b-4bcb-9a65-58e5f959f9c4	OUT	1	a363dd69-743c-4dbe-9b9c-79bed65056b6	2026-05-04 14:53:12.798363
d696f533-54e3-4d51-9fb6-3b5abc056aac	93644b02-e041-4d42-80cf-6eef0b5f0028	adbf3284-301b-4bcb-9a65-58e5f959f9c4	OUT	1	a363dd69-743c-4dbe-9b9c-79bed65056b6	2026-05-04 14:53:12.798363
5adc9ddf-566b-4d7f-91a2-b9e5b0ab5f1b	eac8b1c7-87e8-47ff-a04f-d6e0f55d2c2f	adbf3284-301b-4bcb-9a65-58e5f959f9c4	OUT	3	c84d70eb-0d4f-40b5-9786-42aa13484069	2026-05-05 14:27:55.826023
79dff5a4-a82a-48c7-972f-f2e9fda95985	93644b02-e041-4d42-80cf-6eef0b5f0028	adbf3284-301b-4bcb-9a65-58e5f959f9c4	OUT	1	c84d70eb-0d4f-40b5-9786-42aa13484069	2026-05-05 14:27:55.826023
fe13a412-1ccd-4a9c-a29c-fbf3612ba3c0	eac8b1c7-87e8-47ff-a04f-d6e0f55d2c2f	adbf3284-301b-4bcb-9a65-58e5f959f9c4	OUT	1	e455d5ff-f3f1-43df-9c3f-8b02aaba95ce	2026-07-03 16:15:47.369615
f35f0fe2-b971-4832-adf2-934932dcb7a2	eac8b1c7-87e8-47ff-a04f-d6e0f55d2c2f	adbf3284-301b-4bcb-9a65-58e5f959f9c4	OUT	1	5ba74995-85a2-41a9-bb52-65055e65fd53	2026-07-03 16:18:49.573028
53ac6dd2-614a-449b-8b6b-2bf00bcf8610	cf174aa4-99d0-431b-ae57-eb9e72f84975	adbf3284-301b-4bcb-9a65-58e5f959f9c4	IN	1	\N	2026-07-06 12:57:31.383909
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.items (id, barcode, nama_barang, jenis, stok_aktual, created_at, updated_at, is_active, stok_min, stok_safety, stok_max, rata_kebutuhan_bulanan, harga_per_unit, foto_barang) FROM stdin;
eac8b1c7-87e8-47ff-a04f-d6e0f55d2c2f	899123456002	Seragam XL	Seragam	14	2026-05-04 14:13:58.361764	2026-05-04 15:43:40.088686	t	0	0	0	0	0.00	\N
cf174aa4-99d0-431b-ae57-eb9e72f84975	1231221	Barang Baru test	APD	21	2026-07-03 16:39:18.491611	2026-07-03 16:39:18.491611	f	5	10	30	0	200000.00	\N
93644b02-e041-4d42-80cf-6eef0b5f0028	899123456001	Helm Safety Proyek	APD	0	2026-05-02 15:50:43.473176	2026-05-02 15:50:43.473176	t	0	0	0	0	0.00	\N
\.


--
-- Data for Name: request_detail; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.request_detail (id, request_id, item_id, jumlah, alasan, foto_bukti, is_scanned, created_at) FROM stdin;
dd6cf0d2-3664-4001-aa0e-d63294c5e93b	a2c4035b-8308-4a5d-b7df-bee0cf3cd87b	93644b02-e041-4d42-80cf-6eef0b5f0028	2	Baru gabung proyek	\N	t	2026-05-04 11:37:32.339872
9b123894-8a55-4711-9e8f-66368c844c3f	9741e23a-f5a6-48eb-98de-9f8e0103abf0	93644b02-e041-4d42-80cf-6eef0b5f0028	2	Baru gabung proyek	\N	f	2026-05-04 12:04:08.137634
b9fc21bb-3dcf-4cff-a29a-f621015bf0e2	6b52959e-2436-4649-9474-f5a83f65a5e2	93644b02-e041-4d42-80cf-6eef0b5f0028	2	Baru gabung proyek	\N	f	2026-05-04 12:04:38.689195
0ca7cf0f-1bd6-41e6-964a-661e1c3b48bc	a363dd69-743c-4dbe-9b9c-79bed65056b6	eac8b1c7-87e8-47ff-a04f-d6e0f55d2c2f	1	\N	\N	t	2026-05-04 14:22:01.837789
686e1307-327c-4885-9651-04f3218dee60	a363dd69-743c-4dbe-9b9c-79bed65056b6	93644b02-e041-4d42-80cf-6eef0b5f0028	1	\N	\N	t	2026-05-04 14:22:01.837789
e26cb1c4-a1b4-4931-9e2b-fb28e155d221	44d2a85c-6150-4a26-9604-44bb7d563120	93644b02-e041-4d42-80cf-6eef0b5f0028	3	Rusak	\N	f	2026-05-04 14:58:48.67762
a4e45f26-3afa-476a-8568-0b615e832a36	44d2a85c-6150-4a26-9604-44bb7d563120	eac8b1c7-87e8-47ff-a04f-d6e0f55d2c2f	3	Rusak	\N	f	2026-05-04 14:58:48.67762
3ffe4fb3-47d9-4a87-b47d-24f11d921a4c	c84d70eb-0d4f-40b5-9786-42aa13484069	eac8b1c7-87e8-47ff-a04f-d6e0f55d2c2f	3	rusak	\N	t	2026-05-05 14:26:10.292272
fdd7e80b-e9c1-4078-ac5a-a6066bf032b4	c84d70eb-0d4f-40b5-9786-42aa13484069	93644b02-e041-4d42-80cf-6eef0b5f0028	1	pecah	\N	t	2026-05-05 14:26:10.292272
b1af7901-f057-437c-bbc7-1cc70fbe92ec	e455d5ff-f3f1-43df-9c3f-8b02aaba95ce	eac8b1c7-87e8-47ff-a04f-d6e0f55d2c2f	1	Kebutuhan Baru	http://localhost:3000/uploads/BuktiAlasan/req_e455d5ff-f3f1-43df-9c3f-8b02aaba95ce_item_eac8b1c7_1783069857014.jpg	t	2026-07-03 16:10:57.005379
0aea3ab0-9ae0-4d7f-bee8-3d41838b2cc8	5ba74995-85a2-41a9-bb52-65055e65fd53	eac8b1c7-87e8-47ff-a04f-d6e0f55d2c2f	1	Penggantian Berkala	\N	t	2026-07-03 16:18:33.819187
8eb79872-3641-4225-a40c-a71dcd5d4864	85b5c578-b1a1-44ac-8a12-84d123028006	93644b02-e041-4d42-80cf-6eef0b5f0028	1	Penggantian Berkala	\N	f	2026-07-03 16:22:27.990121
d1f796ea-8e18-443a-b981-531e80b0b6e9	10caf79e-9e02-483c-8e1a-83216692148d	cf174aa4-99d0-431b-ae57-eb9e72f84975	1	Rusak	http://localhost:3000/uploads/BuktiAlasan/req_10caf79e-9e02-483c-8e1a-83216692148d_item_cf174aa4_1783316475275.jpg	f	2026-07-06 12:41:15.250406
3d23c152-baf4-407f-9798-672b4d28dc4a	5c55445f-2208-4712-9da2-6512d895b3da	eac8b1c7-87e8-47ff-a04f-d6e0f55d2c2f	1	Kebutuhan Baru	\N	f	2026-07-06 13:40:29.938975
532b20ae-ab51-4d02-9a59-0b0448ed3ccb	953ffa70-5c19-4795-9ee2-351bcc30ff14	eac8b1c7-87e8-47ff-a04f-d6e0f55d2c2f	1	Kebutuhan Baru	\N	t	2026-07-03 16:23:35.33574
\.


--
-- Data for Name: request_header; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.request_header (id, user_id, tgl_pengambilan, status, created_at, updated_at, pengambilan_oleh) FROM stdin;
a2c4035b-8308-4a5d-b7df-bee0cf3cd87b	adbf3284-301b-4bcb-9a65-58e5f959f9c4	2026-05-10	approved	2026-05-04 11:37:32.339872	2026-05-04 11:46:31.282377	\N
6b52959e-2436-4649-9474-f5a83f65a5e2	adbf3284-301b-4bcb-9a65-58e5f959f9c4	2026-05-10	approved	2026-05-04 12:04:38.689195	2026-05-04 14:43:44.152849	\N
9741e23a-f5a6-48eb-98de-9f8e0103abf0	adbf3284-301b-4bcb-9a65-58e5f959f9c4	2026-05-10	approved	2026-05-04 12:04:08.137634	2026-05-04 14:43:45.445038	\N
a363dd69-743c-4dbe-9b9c-79bed65056b6	f7158e6b-4d12-4c9b-954c-cdf0ef4b70cc	2026-12-23	completed	2026-05-04 14:22:01.837789	2026-05-04 14:43:42.63324	\N
44d2a85c-6150-4a26-9604-44bb7d563120	f7158e6b-4d12-4c9b-954c-cdf0ef4b70cc	2026-04-05	rejected	2026-05-04 14:58:48.67762	2026-05-04 14:59:42.526148	\N
c84d70eb-0d4f-40b5-9786-42aa13484069	f7158e6b-4d12-4c9b-954c-cdf0ef4b70cc	2026-05-05	completed	2026-05-05 14:26:10.292272	2026-05-05 14:27:12.79723	\N
e455d5ff-f3f1-43df-9c3f-8b02aaba95ce	f7158e6b-4d12-4c9b-954c-cdf0ef4b70cc	2002-12-12	completed	2026-07-03 16:10:57.005379	2026-07-03 16:14:21.289444	ambil_sendiri
5ba74995-85a2-41a9-bb52-65055e65fd53	f7158e6b-4d12-4c9b-954c-cdf0ef4b70cc	1222-12-12	completed	2026-07-03 16:18:33.819187	2026-07-03 16:18:44.284335	ambil_sendiri
85b5c578-b1a1-44ac-8a12-84d123028006	f7158e6b-4d12-4c9b-954c-cdf0ef4b70cc	3334-12-12	approved	2026-07-03 16:22:27.990121	2026-07-03 16:23:49.479566	\N
953ffa70-5c19-4795-9ee2-351bcc30ff14	59e8e488-0d0b-4d7d-ae09-c0c2f95ccb56	3333-03-31	processing	2026-07-03 16:23:35.33574	2026-07-03 16:23:50.660721	\N
5c55445f-2208-4712-9da2-6512d895b3da	f7158e6b-4d12-4c9b-954c-cdf0ef4b70cc	2222-12-12	approved	2026-07-06 13:40:29.938975	2026-07-06 13:40:43.947194	\N
10caf79e-9e02-483c-8e1a-83216692148d	f7158e6b-4d12-4c9b-954c-cdf0ef4b70cc	2026-12-12	rejected	2026-07-06 12:41:15.250406	2026-07-06 13:40:49.230209	\N
\.


--
-- Data for Name: scanner_queue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scanner_queue (id, barcode, mode, status, scanned_at) FROM stdin;
025ea62f-9156-4a0a-aa22-38fe713feec6	1231221	IN	APPROVED	2026-07-03 16:35:37.248008
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, nik, pin, nama, departemen_id, nama_leader, tipe_karyawan, role, created_at, is_active, foto_profil) FROM stdin;
06295653-8e1c-4b96-aa6b-9764b2e3bce8	SEC003	$2b$10$dkQokxfRrKAo9RggaR2PoOEP6LUM3zqRqsV9xuZYy8vTL43kD5Gje	JUAN	16	Ryan gosling	tetap	admin	2026-05-04 12:45:55.109277	t	\N
adbf3284-301b-4bcb-9a65-58e5f959f9c4	HRG001	$2b$10$dkQokxfRrKAo9RggaR2PoOEP6LUM3zqRqsV9xuZYy8vTL43kD5Gje	Budi Santoso	16	Pak Direktur	tetap	admin	2026-05-02 15:43:24.439597	t	\N
f7158e6b-4d12-4c9b-954c-cdf0ef4b70cc	SEC001	$2b$10$dkQokxfRrKAo9RggaR2PoOEP6LUM3zqRqsV9xuZYy8vTL43kD5Gje	Henry Skalitz	18	Sir Radzig of Kobly\\	tetap	karyawan	2026-05-04 12:23:20.868486	t	\N
59e8e488-0d0b-4d7d-ae09-c0c2f95ccb56	SEC002	$2b$10$OHpUZelFt0RzP4EVgp8ceOM8kom7IkJLa/mlso0OHNbVjBsqyMAzK	Juandra	16	sdasda	tetap	karyawan	2026-07-03 16:23:15.506077	t	\N
\.


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departments_id_seq', 18, true);


--
-- Name: departments departments_nama_dept_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_nama_dept_key UNIQUE (nama_dept);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: inventory_logs inventory_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_logs
    ADD CONSTRAINT inventory_logs_pkey PRIMARY KEY (id);


--
-- Name: items items_barcode_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_barcode_key UNIQUE (barcode);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: request_detail request_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.request_detail
    ADD CONSTRAINT request_detail_pkey PRIMARY KEY (id);


--
-- Name: request_header request_header_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.request_header
    ADD CONSTRAINT request_header_pkey PRIMARY KEY (id);


--
-- Name: scanner_queue scanner_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scanner_queue
    ADD CONSTRAINT scanner_queue_pkey PRIMARY KEY (id);


--
-- Name: users users_nik_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_nik_key UNIQUE (nik);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_items_barcode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_items_barcode ON public.items USING btree (barcode);


--
-- Name: idx_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_created_at ON public.inventory_logs USING btree (created_at);


--
-- Name: inventory_logs inventory_logs_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_logs
    ADD CONSTRAINT inventory_logs_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: inventory_logs inventory_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_logs
    ADD CONSTRAINT inventory_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: request_detail request_detail_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.request_detail
    ADD CONSTRAINT request_detail_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: request_detail request_detail_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.request_detail
    ADD CONSTRAINT request_detail_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.request_header(id) ON DELETE CASCADE;


--
-- Name: request_header request_header_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.request_header
    ADD CONSTRAINT request_header_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_departemen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_departemen_id_fkey FOREIGN KEY (departemen_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict rczeYJLOe8JFhe0y2MnxbSGRDzee0iGBbxm4USldx5gYjC8CkfAhFGVBULRNKgb

