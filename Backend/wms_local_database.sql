-- ============================================================
--  WMS ROAD WORK — Local PostgreSQL Setup
--  Generated: 2026-05-20
--  Compatible: PostgreSQL 14+
--
--  Cara pakai:
--    psql -U postgres -d nama_database -f wms_local_database.sql
--  Atau dari psql:
--    \i wms_local_database.sql
-- ============================================================

-- Aktifkan UUID generator (built-in di pg 13+, pakai gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- CLEANUP (aman dijalankan berulang saat development)
-- ============================================================
DROP TABLE IF EXISTS public.scanner_queue     CASCADE;
DROP TABLE IF EXISTS public.inventory_logs    CASCADE;
DROP TABLE IF EXISTS public.request_detail    CASCADE;
DROP TABLE IF EXISTS public.request_header    CASCADE;
DROP TABLE IF EXISTS public.items             CASCADE;
DROP TABLE IF EXISTS public.users             CASCADE;
DROP TABLE IF EXISTS public.departments       CASCADE;


-- ============================================================
-- 1. DEPARTMENTS
-- ============================================================
CREATE TABLE public.departments (
    id         SERIAL PRIMARY KEY,
    nama_dept  VARCHAR(100) NOT NULL,
    CONSTRAINT departments_nama_dept_key UNIQUE (nama_dept)
);

COMMENT ON TABLE public.departments IS 'Master departemen/divisi pabrik';


-- ============================================================
-- 2. USERS (Karyawan & Admin)
-- ============================================================
CREATE TABLE public.users (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    nik             VARCHAR(20) NOT NULL,
    pin             VARCHAR(255) NOT NULL,           -- bcrypt hash
    nama            VARCHAR(100) NOT NULL,
    departemen_id   INTEGER     REFERENCES public.departments(id) ON DELETE SET NULL,
    nama_leader     VARCHAR(100),
    tipe_karyawan   VARCHAR(20) DEFAULT 'tetap'      NOT NULL,
    role            VARCHAR(20)                      NOT NULL,
    foto_profil     TEXT,
    is_active       BOOLEAN     DEFAULT TRUE         NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()        NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW()        NOT NULL,

    CONSTRAINT users_nik_key           UNIQUE (nik),
    CONSTRAINT users_role_check        CHECK (role IN ('admin', 'karyawan')),
    CONSTRAINT users_tipe_check        CHECK (tipe_karyawan IN ('tetap', 'kontrak', 'magang'))
);

COMMENT ON TABLE  public.users IS 'Akun karyawan dan admin gudang';
COMMENT ON COLUMN public.users.pin IS 'Disimpan sebagai bcrypt hash, bukan plain text';


-- ============================================================
-- 3. ITEMS (Master Barang)
-- ============================================================
CREATE TABLE public.items (
    id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    barcode      VARCHAR(100) NOT NULL,
    nama_barang  VARCHAR(150) NOT NULL,
    jenis        VARCHAR(50),
    stok_aktual  INTEGER      DEFAULT 0    NOT NULL,
    foto_barang  TEXT,
    is_active    BOOLEAN      DEFAULT TRUE NOT NULL,
    created_at   TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
    updated_at   TIMESTAMPTZ  DEFAULT NOW() NOT NULL,

    CONSTRAINT items_barcode_key       UNIQUE (barcode),
    -- Guard akhir: stok tidak boleh negatif
    CONSTRAINT items_stok_aktual_check CHECK (stok_aktual >= 0)
);

COMMENT ON TABLE  public.items IS 'Master katalog barang gudang';
COMMENT ON COLUMN public.items.stok_aktual IS 'Guard CHECK >= 0 ada di DB sebagai safety net terakhir';


-- ============================================================
-- 4. REQUEST_HEADER (Nota Permintaan Karyawan)
-- ============================================================
CREATE TABLE public.request_header (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    -- SET NULL agar riwayat request tetap ada meski karyawan dihapus
    user_id         UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    tgl_pengambilan DATE        NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending' NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()     NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW()     NOT NULL,

    -- FIX AUDIT: Whitelist status yang valid di level database
    CONSTRAINT request_header_status_check CHECK (
        status IN ('pending', 'approved', 'rejected', 'processing', 'completed')
    ),
    -- Tanggal pengambilan tidak boleh di masa lalu saat dibuat
    -- (dinonaktifkan default, aktifkan jika bisnis rules memerlukan)
    -- CONSTRAINT request_header_tgl_check CHECK (tgl_pengambilan >= CURRENT_DATE)
    CONSTRAINT request_header_tgl_check CHECK (tgl_pengambilan IS NOT NULL)
);

COMMENT ON TABLE  public.request_header IS 'Header nota permintaan barang dari karyawan';
COMMENT ON COLUMN public.request_header.user_id IS 'SET NULL saat karyawan dihapus — riwayat transaksi tetap terjaga';
COMMENT ON COLUMN public.request_header.status IS 'Nilai valid: pending, approved, rejected, processing, completed';


-- ============================================================
-- 5. REQUEST_DETAIL (Item dalam Nota)
-- ============================================================
CREATE TABLE public.request_detail (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id  UUID        NOT NULL REFERENCES public.request_header(id) ON DELETE CASCADE,
    item_id     UUID        NOT NULL REFERENCES public.items(id)          ON DELETE CASCADE,
    jumlah      INTEGER     NOT NULL,
    alasan      VARCHAR(100),
    foto_bukti  TEXT,
    is_scanned  BOOLEAN     DEFAULT FALSE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT request_detail_jumlah_check CHECK (jumlah > 0)
);

COMMENT ON TABLE  public.request_detail IS 'Baris-baris barang dalam satu nota request';
COMMENT ON COLUMN public.request_detail.is_scanned IS 'TRUE setelah ESP32 scan fisik saat serah terima';


-- ============================================================
-- 6. INVENTORY_LOGS (Riwayat Mutasi Stok)
-- ============================================================
CREATE TABLE public.inventory_logs (
    id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id          UUID        NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    -- SET NULL: log tetap ada meski admin/karyawan dihapus
    user_id          UUID        REFERENCES public.users(id)          ON DELETE SET NULL,
    tipe_transaksi   VARCHAR(10) NOT NULL,
    qty              INTEGER     NOT NULL,
    -- referensi ke request_header (nullable: transaksi IN tidak punya request)
    referensi_id     UUID,
    created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT inventory_logs_tipe_check CHECK (tipe_transaksi IN ('IN', 'OUT')),
    -- qty harus positif; arah mutasi ditentukan oleh tipe_transaksi
    CONSTRAINT inventory_logs_qty_check  CHECK (qty > 0)
);

COMMENT ON TABLE  public.inventory_logs IS 'Audit trail semua perubahan stok (IN = masuk, OUT = keluar)';
COMMENT ON COLUMN public.inventory_logs.referensi_id IS 'FK ke request_header.id untuk transaksi OUT; NULL untuk transaksi IN';


-- ============================================================
-- 7. SCANNER_QUEUE (Antrean Scan ESP32 Mode IN)
-- ============================================================
CREATE TABLE public.scanner_queue (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    barcode     VARCHAR(100) NOT NULL,
    mode        VARCHAR(10)  NOT NULL,
    status      VARCHAR(20)  DEFAULT 'PENDING' NOT NULL,
    scanned_at  TIMESTAMPTZ  DEFAULT NOW()     NOT NULL,

    CONSTRAINT scanner_queue_mode_check   CHECK (mode   IN ('IN', 'OUT')),
    CONSTRAINT scanner_queue_status_check CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUCCESS'))
    -- Catatan: tidak ada FK ke items.barcode karena scanner_queue
    -- sengaja menampung barcode yang belum terdaftar (barang baru)
);

COMMENT ON TABLE  public.scanner_queue IS 'Buffer sementara hasil scan ESP32 sebelum dikonfirmasi Admin';
COMMENT ON COLUMN public.scanner_queue.status IS 'SUCCESS ditambahkan untuk mode OUT (serah terima)';


-- ============================================================
-- INDEXES (Performa Query Utama)
-- ============================================================

-- Users: login pakai NIK
CREATE INDEX idx_users_nik        ON public.users(nik);
CREATE INDEX idx_users_is_active  ON public.users(is_active);

-- Items: katalog + lookup barcode
CREATE INDEX idx_items_barcode    ON public.items(barcode);
CREATE INDEX idx_items_is_active  ON public.items(is_active);
CREATE INDEX idx_items_nama       ON public.items(nama_barang);  -- untuk ILIKE search

-- Request: filter per karyawan dan per status
CREATE INDEX idx_reqhdr_user_id   ON public.request_header(user_id);
CREATE INDEX idx_reqhdr_status    ON public.request_header(status);
CREATE INDEX idx_reqhdr_created   ON public.request_header(created_at DESC);
CREATE INDEX idx_reqdtl_request   ON public.request_detail(request_id);
CREATE INDEX idx_reqdtl_item      ON public.request_detail(item_id);

-- Logs: laporan mutasi stok
CREATE INDEX idx_logs_item_id     ON public.inventory_logs(item_id);
CREATE INDEX idx_logs_created     ON public.inventory_logs(created_at DESC);

-- Scanner: polling antrean PENDING
CREATE INDEX idx_scanner_status   ON public.scanner_queue(status);
CREATE INDEX idx_scanner_barcode  ON public.scanner_queue(barcode);


-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_items_updated_at
    BEFORE UPDATE ON public.items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_reqhdr_updated_at
    BEFORE UPDATE ON public.request_header
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- SEED DATA: Departments
-- ============================================================
INSERT INTO public.departments (nama_dept) VALUES
    ('Produksi'),
    ('Quality Control'),
    ('Maintenance'),
    ('Gudang'),
    ('HRGA'),
    ('K3'),
    ('Engineering');


-- ============================================================
-- SEED DATA: Admin Default
-- PIN default: 123456 (bcrypt hash rounds=10)
-- GANTI PASSWORD INI SETELAH PERTAMA LOGIN!
-- ============================================================
INSERT INTO public.users (nik, pin, nama, role, tipe_karyawan) VALUES (
    'ADMIN001',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- 123456
    'Administrator',
    'admin',
    'tetap'
);


-- ============================================================
-- VERIFIKASI HASIL
-- ============================================================
DO $$
DECLARE
    tbl RECORD;
BEGIN
    RAISE NOTICE '=== WMS Database Setup Selesai ===';
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        RAISE NOTICE '  ✓ Tabel: %', tbl.tablename;
    END LOOP;
    RAISE NOTICE '=====================================';
    RAISE NOTICE 'Admin default → NIK: ADMIN001 | PIN: 123456';
    RAISE NOTICE 'WAJIB ganti PIN setelah login pertama!';
END $$;
