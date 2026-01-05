--
-- PostgreSQL database dump
--

\restrict L0kX003ZpvamIgo3JgLe0vJR6nsJoS2uKMdocfDqd596fCbp8NnNOXiRkkbun9D

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

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

ALTER TABLE ONLY public.users DROP CONSTRAINT users_company_id_fkey;
ALTER TABLE ONLY public.stock_transactions DROP CONSTRAINT stock_transactions_item_id_fkey;
ALTER TABLE ONLY public.stock_transactions DROP CONSTRAINT stock_transactions_financial_year_id_fkey;
ALTER TABLE ONLY public.stock_transactions DROP CONSTRAINT stock_transactions_company_id_fkey;
ALTER TABLE ONLY public.salary_advances DROP CONSTRAINT salary_advances_user_id_fkey;
ALTER TABLE ONLY public.processes DROP CONSTRAINT processes_company_id_fkey;
ALTER TABLE ONLY public.payments DROP CONSTRAINT payments_party_id_fkey;
ALTER TABLE ONLY public.payments DROP CONSTRAINT payments_financial_year_id_fkey;
ALTER TABLE ONLY public.payments DROP CONSTRAINT payments_company_id_fkey;
ALTER TABLE ONLY public.payment_allocation DROP CONSTRAINT payment_allocation_payment_id_fkey;
ALTER TABLE ONLY public.payment_allocation DROP CONSTRAINT payment_allocation_invoice_id_fkey;
ALTER TABLE ONLY public.party DROP CONSTRAINT party_financial_year_id_fkey;
ALTER TABLE ONLY public.party DROP CONSTRAINT party_company_id_fkey;
ALTER TABLE ONLY public.party_challan DROP CONSTRAINT party_challan_party_id_fkey;
ALTER TABLE ONLY public.party_challan_items DROP CONSTRAINT party_challan_items_process_id_fkey;
ALTER TABLE ONLY public.party_challan_items DROP CONSTRAINT party_challan_items_party_challan_id_fkey;
ALTER TABLE ONLY public.party_challan_items DROP CONSTRAINT party_challan_items_item_id_fkey;
ALTER TABLE ONLY public.party_challan DROP CONSTRAINT party_challan_financial_year_id_fkey;
ALTER TABLE ONLY public.party_challan DROP CONSTRAINT party_challan_company_id_fkey;
ALTER TABLE ONLY public.items DROP CONSTRAINT items_process_id_fkey;
ALTER TABLE ONLY public.items DROP CONSTRAINT items_party_id_fkey;
ALTER TABLE ONLY public.items DROP CONSTRAINT items_financial_year_id_fkey;
ALTER TABLE ONLY public.items DROP CONSTRAINT items_company_id_fkey;
ALTER TABLE ONLY public.invoice DROP CONSTRAINT invoice_party_id_fkey;
ALTER TABLE ONLY public.invoice_items DROP CONSTRAINT invoice_items_item_id_fkey;
ALTER TABLE ONLY public.invoice_items DROP CONSTRAINT invoice_items_invoice_id_fkey;
ALTER TABLE ONLY public.invoice_items DROP CONSTRAINT invoice_items_delivery_challan_item_id_fkey;
ALTER TABLE ONLY public.invoice DROP CONSTRAINT invoice_financial_year_id_fkey;
ALTER TABLE ONLY public.invoice DROP CONSTRAINT invoice_company_id_fkey;
ALTER TABLE ONLY public.invoice DROP CONSTRAINT invoice_challan_id_fkey;
ALTER TABLE ONLY public.financial_year DROP CONSTRAINT financial_year_company_id_fkey;
ALTER TABLE ONLY public.expenses DROP CONSTRAINT expenses_party_id_fkey;
ALTER TABLE ONLY public.expenses DROP CONSTRAINT expenses_financial_year_id_fkey;
ALTER TABLE ONLY public.expenses DROP CONSTRAINT expenses_created_by_fkey;
ALTER TABLE ONLY public.expenses DROP CONSTRAINT expenses_company_id_fkey;
ALTER TABLE ONLY public.employee_profiles DROP CONSTRAINT employee_profiles_user_id_fkey;
ALTER TABLE ONLY public.delivery_challan DROP CONSTRAINT delivery_challan_party_id_fkey;
ALTER TABLE ONLY public.delivery_challan DROP CONSTRAINT delivery_challan_party_challan_id_fkey;
ALTER TABLE ONLY public.delivery_challan_items DROP CONSTRAINT delivery_challan_items_process_id_fkey;
ALTER TABLE ONLY public.delivery_challan_items DROP CONSTRAINT delivery_challan_items_party_challan_item_id_fkey;
ALTER TABLE ONLY public.delivery_challan_items DROP CONSTRAINT delivery_challan_items_item_id_fkey;
ALTER TABLE ONLY public.delivery_challan_items DROP CONSTRAINT delivery_challan_items_challan_id_fkey;
ALTER TABLE ONLY public.delivery_challan DROP CONSTRAINT delivery_challan_financial_year_id_fkey;
ALTER TABLE ONLY public.delivery_challan DROP CONSTRAINT delivery_challan_company_id_fkey;
ALTER TABLE ONLY public.audit_logs DROP CONSTRAINT audit_logs_user_id_fkey;
ALTER TABLE ONLY public.audit_logs DROP CONSTRAINT audit_logs_company_id_fkey;
ALTER TABLE ONLY public.attendance DROP CONSTRAINT attendance_user_id_fkey;
DROP INDEX public.ix_users_id;
DROP INDEX public.ix_users_email;
DROP INDEX public.ix_stock_transactions_id;
DROP INDEX public.ix_salary_advances_id;
DROP INDEX public.ix_processes_id;
DROP INDEX public.ix_payments_id;
DROP INDEX public.ix_payment_allocation_id;
DROP INDEX public.ix_party_id;
DROP INDEX public.ix_party_challan_id;
DROP INDEX public.ix_party_challan_challan_number;
DROP INDEX public.ix_items_id;
DROP INDEX public.ix_invoice_invoice_number;
DROP INDEX public.ix_invoice_id;
DROP INDEX public.ix_financial_year_id;
DROP INDEX public.ix_expenses_id;
DROP INDEX public.ix_employee_profiles_id;
DROP INDEX public.ix_delivery_challan_id;
DROP INDEX public.ix_delivery_challan_challan_number;
DROP INDEX public.ix_company_is_active;
DROP INDEX public.ix_company_id;
DROP INDEX public.ix_audit_logs_id;
DROP INDEX public.ix_attendance_id;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
ALTER TABLE ONLY public.attendance DROP CONSTRAINT unique_user_attendance_per_day;
ALTER TABLE ONLY public.party_challan DROP CONSTRAINT uix_pc_company_fy_party_challan_number;
ALTER TABLE ONLY public.delivery_challan DROP CONSTRAINT uix_delivery_company_fy_party_challan_number;
ALTER TABLE ONLY public.stock_transactions DROP CONSTRAINT stock_transactions_pkey;
ALTER TABLE ONLY public.salary_advances DROP CONSTRAINT salary_advances_pkey;
ALTER TABLE ONLY public.processes DROP CONSTRAINT processes_pkey;
ALTER TABLE ONLY public.payments DROP CONSTRAINT payments_pkey;
ALTER TABLE ONLY public.payment_allocation DROP CONSTRAINT payment_allocation_pkey;
ALTER TABLE ONLY public.party DROP CONSTRAINT party_pkey;
ALTER TABLE ONLY public.party_challan DROP CONSTRAINT party_challan_pkey;
ALTER TABLE ONLY public.party_challan_items DROP CONSTRAINT party_challan_items_pkey;
ALTER TABLE ONLY public.items DROP CONSTRAINT items_pkey;
ALTER TABLE ONLY public.invoice DROP CONSTRAINT invoice_pkey;
ALTER TABLE ONLY public.invoice_items DROP CONSTRAINT invoice_items_pkey;
ALTER TABLE ONLY public.financial_year DROP CONSTRAINT financial_year_pkey;
ALTER TABLE ONLY public.expenses DROP CONSTRAINT expenses_pkey;
ALTER TABLE ONLY public.employee_profiles DROP CONSTRAINT employee_profiles_user_id_key;
ALTER TABLE ONLY public.employee_profiles DROP CONSTRAINT employee_profiles_pkey;
ALTER TABLE ONLY public.delivery_challan DROP CONSTRAINT delivery_challan_pkey;
ALTER TABLE ONLY public.delivery_challan_items DROP CONSTRAINT delivery_challan_items_pkey;
ALTER TABLE ONLY public.company DROP CONSTRAINT company_pkey;
ALTER TABLE ONLY public.company DROP CONSTRAINT company_gst_number_key;
ALTER TABLE ONLY public.audit_logs DROP CONSTRAINT audit_logs_pkey;
ALTER TABLE ONLY public.attendance DROP CONSTRAINT attendance_pkey;
ALTER TABLE ONLY public.alembic_version DROP CONSTRAINT alembic_version_pkc;
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.stock_transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.salary_advances ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.processes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.payment_allocation ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.party_challan_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.party_challan ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.party ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.invoice_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.invoice ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.financial_year ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.expenses ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.employee_profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.delivery_challan_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.delivery_challan ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.company ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.audit_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.attendance ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE public.users_id_seq;
DROP TABLE public.users;
DROP SEQUENCE public.stock_transactions_id_seq;
DROP TABLE public.stock_transactions;
DROP SEQUENCE public.salary_advances_id_seq;
DROP TABLE public.salary_advances;
DROP SEQUENCE public.processes_id_seq;
DROP TABLE public.processes;
DROP SEQUENCE public.payments_id_seq;
DROP TABLE public.payments;
DROP SEQUENCE public.payment_allocation_id_seq;
DROP TABLE public.payment_allocation;
DROP SEQUENCE public.party_id_seq;
DROP SEQUENCE public.party_challan_items_id_seq;
DROP TABLE public.party_challan_items;
DROP SEQUENCE public.party_challan_id_seq;
DROP TABLE public.party_challan;
DROP TABLE public.party;
DROP SEQUENCE public.items_id_seq;
DROP TABLE public.items;
DROP SEQUENCE public.invoice_items_id_seq;
DROP TABLE public.invoice_items;
DROP SEQUENCE public.invoice_id_seq;
DROP TABLE public.invoice;
DROP SEQUENCE public.financial_year_id_seq;
DROP TABLE public.financial_year;
DROP SEQUENCE public.expenses_id_seq;
DROP TABLE public.expenses;
DROP SEQUENCE public.employee_profiles_id_seq;
DROP TABLE public.employee_profiles;
DROP SEQUENCE public.delivery_challan_items_id_seq;
DROP TABLE public.delivery_challan_items;
DROP SEQUENCE public.delivery_challan_id_seq;
DROP TABLE public.delivery_challan;
DROP SEQUENCE public.company_id_seq;
DROP TABLE public.company;
DROP SEQUENCE public.audit_logs_id_seq;
DROP TABLE public.audit_logs;
DROP SEQUENCE public.attendance_id_seq;
DROP TABLE public.attendance;
DROP TABLE public.alembic_version;
DROP TYPE public.userrole;
DROP TYPE public.salarytype;
DROP TYPE public.attendancestatus;
--
-- Name: attendancestatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.attendancestatus AS ENUM (
    'PRESENT',
    'ABSENT',
    'HALF_DAY',
    'LEAVE'
);


ALTER TYPE public.attendancestatus OWNER TO postgres;

--
-- Name: salarytype; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.salarytype AS ENUM (
    'MONTHLY',
    'DAILY'
);


ALTER TYPE public.salarytype OWNER TO postgres;

--
-- Name: userrole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.userrole AS ENUM (
    'SUPER_ADMIN',
    'COMPANY_ADMIN',
    'USER'
);


ALTER TYPE public.userrole OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    id integer NOT NULL,
    user_id integer NOT NULL,
    date date NOT NULL,
    status public.attendancestatus,
    notes character varying(255),
    overtime_hours numeric(4,2),
    bonus_amount numeric(10,2),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.attendance OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_id_seq OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    company_id integer,
    action character varying(255) NOT NULL,
    details text,
    ip_address character varying(50),
    created_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: company; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    gst_number character varying(20),
    address character varying,
    phone character varying(20),
    email character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    subscription_start date NOT NULL,
    subscription_end date NOT NULL,
    is_active boolean DEFAULT true,
    logo character varying(500)
);


ALTER TABLE public.company OWNER TO postgres;

--
-- Name: company_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.company_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_id_seq OWNER TO postgres;

--
-- Name: company_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_id_seq OWNED BY public.company.id;


--
-- Name: delivery_challan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_challan (
    id integer NOT NULL,
    company_id integer NOT NULL,
    financial_year_id integer NOT NULL,
    party_id integer NOT NULL,
    challan_date date,
    status character varying(20),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    challan_number character varying(50) NOT NULL,
    notes text,
    is_active boolean DEFAULT true,
    party_challan_id integer,
    vehicle_number character varying(50)
);


ALTER TABLE public.delivery_challan OWNER TO postgres;

--
-- Name: delivery_challan_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.delivery_challan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.delivery_challan_id_seq OWNER TO postgres;

--
-- Name: delivery_challan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.delivery_challan_id_seq OWNED BY public.delivery_challan.id;


--
-- Name: delivery_challan_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_challan_items (
    id integer NOT NULL,
    challan_id integer,
    item_id integer,
    party_challan_item_id integer,
    quantity numeric(10,2),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    process_id integer,
    ok_qty numeric(10,2) DEFAULT '0'::numeric,
    cr_qty numeric(10,2) DEFAULT '0'::numeric,
    mr_qty numeric(10,2) DEFAULT '0'::numeric
);


ALTER TABLE public.delivery_challan_items OWNER TO postgres;

--
-- Name: delivery_challan_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.delivery_challan_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.delivery_challan_items_id_seq OWNER TO postgres;

--
-- Name: delivery_challan_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.delivery_challan_items_id_seq OWNED BY public.delivery_challan_items.id;


--
-- Name: employee_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    designation character varying(100),
    phone character varying(20),
    address character varying(255),
    pan_number character varying(20),
    aadhar_number character varying(20),
    pan_doc_path character varying(255),
    aadhar_doc_path character varying(255),
    resume_doc_path character varying(255),
    joining_date date,
    salary_type public.salarytype,
    base_salary numeric(12,2),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    photo_path character varying(255)
);


ALTER TABLE public.employee_profiles OWNER TO postgres;

--
-- Name: employee_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employee_profiles_id_seq OWNER TO postgres;

--
-- Name: employee_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employee_profiles_id_seq OWNED BY public.employee_profiles.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    company_id integer NOT NULL,
    financial_year_id integer NOT NULL,
    party_id integer,
    date date NOT NULL,
    category character varying(100) NOT NULL,
    description character varying,
    amount numeric(12,2) NOT NULL,
    payment_method character varying(50),
    reference_no character varying(100),
    cheque_no character varying(50),
    cheque_date date,
    bank_name character varying(255),
    payee_name character varying(255),
    is_recurring boolean,
    recurring_frequency character varying(50),
    next_due_date date,
    status character varying(50),
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expenses_id_seq OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: financial_year; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.financial_year (
    id integer NOT NULL,
    company_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean,
    is_locked boolean,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.financial_year OWNER TO postgres;

--
-- Name: financial_year_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.financial_year_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.financial_year_id_seq OWNER TO postgres;

--
-- Name: financial_year_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.financial_year_id_seq OWNED BY public.financial_year.id;


--
-- Name: invoice; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice (
    id integer NOT NULL,
    company_id integer NOT NULL,
    financial_year_id integer NOT NULL,
    party_id integer NOT NULL,
    challan_id integer,
    invoice_date date,
    subtotal numeric(12,2),
    gst_amount numeric(12,2),
    grand_total numeric(12,2),
    is_locked boolean,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    invoice_number character varying(50) NOT NULL,
    due_date date,
    status character varying(20),
    notes text,
    paid_amount numeric(12,2),
    payment_status character varying(20)
);


ALTER TABLE public.invoice OWNER TO postgres;

--
-- Name: invoice_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoice_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_id_seq OWNER TO postgres;

--
-- Name: invoice_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoice_id_seq OWNED BY public.invoice.id;


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_items (
    id integer NOT NULL,
    invoice_id integer,
    item_id integer,
    quantity numeric(10,2),
    rate numeric(10,2),
    amount numeric(10,2),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    grn_no character varying(50),
    delivery_challan_item_id integer
);


ALTER TABLE public.invoice_items OWNER TO postgres;

--
-- Name: invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_items_id_seq OWNER TO postgres;

--
-- Name: invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoice_items_id_seq OWNED BY public.invoice_items.id;


--
-- Name: items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.items (
    id integer NOT NULL,
    company_id integer NOT NULL,
    name character varying(255) NOT NULL,
    hsn_code character varying(20),
    rate numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    financial_year_id integer,
    party_id integer,
    is_active boolean DEFAULT true,
    po_number character varying(50),
    casting_weight numeric(10,3) DEFAULT 0,
    scrap_weight numeric(10,3) DEFAULT 0,
    process_id integer
);


ALTER TABLE public.items OWNER TO postgres;

--
-- Name: items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.items_id_seq OWNER TO postgres;

--
-- Name: items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.items_id_seq OWNED BY public.items.id;


--
-- Name: party; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.party (
    id integer NOT NULL,
    company_id integer NOT NULL,
    financial_year_id integer NOT NULL,
    name character varying(255) NOT NULL,
    gst_number character varying(20),
    address character varying,
    phone character varying(20),
    opening_balance numeric(12,2),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


ALTER TABLE public.party OWNER TO postgres;

--
-- Name: party_challan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.party_challan (
    id integer NOT NULL,
    company_id integer NOT NULL,
    financial_year_id integer NOT NULL,
    party_id integer NOT NULL,
    challan_number character varying(50) NOT NULL,
    challan_date date,
    notes text,
    status character varying(20),
    is_active boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    working_days integer
);


ALTER TABLE public.party_challan OWNER TO postgres;

--
-- Name: party_challan_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.party_challan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.party_challan_id_seq OWNER TO postgres;

--
-- Name: party_challan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.party_challan_id_seq OWNED BY public.party_challan.id;


--
-- Name: party_challan_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.party_challan_items (
    id integer NOT NULL,
    party_challan_id integer NOT NULL,
    item_id integer NOT NULL,
    quantity_ordered numeric(10,2) NOT NULL,
    quantity_delivered numeric(10,2),
    rate numeric(10,2),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    process_id integer
);


ALTER TABLE public.party_challan_items OWNER TO postgres;

--
-- Name: party_challan_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.party_challan_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.party_challan_items_id_seq OWNER TO postgres;

--
-- Name: party_challan_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.party_challan_items_id_seq OWNED BY public.party_challan_items.id;


--
-- Name: party_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.party_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.party_id_seq OWNER TO postgres;

--
-- Name: party_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.party_id_seq OWNED BY public.party.id;


--
-- Name: payment_allocation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_allocation (
    id integer NOT NULL,
    payment_id integer NOT NULL,
    invoice_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payment_allocation OWNER TO postgres;

--
-- Name: payment_allocation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_allocation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_allocation_id_seq OWNER TO postgres;

--
-- Name: payment_allocation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_allocation_id_seq OWNED BY public.payment_allocation.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    company_id integer NOT NULL,
    financial_year_id integer NOT NULL,
    party_id integer NOT NULL,
    payment_date date NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_type character varying(50) NOT NULL,
    payment_mode character varying(50) NOT NULL,
    reference_number character varying(100),
    notes character varying(500),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: processes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.processes (
    id integer NOT NULL,
    company_id integer NOT NULL,
    name character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.processes OWNER TO postgres;

--
-- Name: processes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.processes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.processes_id_seq OWNER TO postgres;

--
-- Name: processes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.processes_id_seq OWNED BY public.processes.id;


--
-- Name: salary_advances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salary_advances (
    id integer NOT NULL,
    user_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    date date NOT NULL,
    reason character varying(255),
    is_deducted boolean,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.salary_advances OWNER TO postgres;

--
-- Name: salary_advances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salary_advances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salary_advances_id_seq OWNER TO postgres;

--
-- Name: salary_advances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salary_advances_id_seq OWNED BY public.salary_advances.id;


--
-- Name: stock_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_transactions (
    id integer NOT NULL,
    company_id integer NOT NULL,
    financial_year_id integer NOT NULL,
    item_id integer NOT NULL,
    quantity numeric(10,2) NOT NULL,
    transaction_type character varying(10),
    reference_type character varying(20),
    reference_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.stock_transactions OWNER TO postgres;

--
-- Name: stock_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_transactions_id_seq OWNER TO postgres;

--
-- Name: stock_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_transactions_id_seq OWNED BY public.stock_transactions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    company_id integer,
    name character varying(255) NOT NULL,
    email character varying(255),
    password_hash character varying(255),
    role public.userrole NOT NULL,
    is_active boolean,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: company id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company ALTER COLUMN id SET DEFAULT nextval('public.company_id_seq'::regclass);


--
-- Name: delivery_challan id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_challan ALTER COLUMN id SET DEFAULT nextval('public.delivery_challan_id_seq'::regclass);


--
-- Name: delivery_challan_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_challan_items ALTER COLUMN id SET DEFAULT nextval('public.delivery_challan_items_id_seq'::regclass);


--
-- Name: employee_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_profiles ALTER COLUMN id SET DEFAULT nextval('public.employee_profiles_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: financial_year id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_year ALTER COLUMN id SET DEFAULT nextval('public.financial_year_id_seq'::regclass);


--
-- Name: invoice id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice ALTER COLUMN id SET DEFAULT nextval('public.invoice_id_seq'::regclass);


--
-- Name: invoice_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items ALTER COLUMN id SET DEFAULT nextval('public.invoice_items_id_seq'::regclass);


--
-- Name: items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items ALTER COLUMN id SET DEFAULT nextval('public.items_id_seq'::regclass);


--
-- Name: party id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party ALTER COLUMN id SET DEFAULT nextval('public.party_id_seq'::regclass);


--
-- Name: party_challan id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_challan ALTER COLUMN id SET DEFAULT nextval('public.party_challan_id_seq'::regclass);


--
-- Name: party_challan_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_challan_items ALTER COLUMN id SET DEFAULT nextval('public.party_challan_items_id_seq'::regclass);


--
-- Name: payment_allocation id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_allocation ALTER COLUMN id SET DEFAULT nextval('public.payment_allocation_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: processes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processes ALTER COLUMN id SET DEFAULT nextval('public.processes_id_seq'::regclass);


--
-- Name: salary_advances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_advances ALTER COLUMN id SET DEFAULT nextval('public.salary_advances_id_seq'::regclass);


--
-- Name: stock_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transactions ALTER COLUMN id SET DEFAULT nextval('public.stock_transactions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
e7cc317a1b92
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance (id, user_id, date, status, notes, overtime_hours, bonus_amount, created_at, updated_at) FROM stdin;
3	21	2026-01-04	PRESENT		0.00	0.00	2026-01-05 00:46:28.556006	2026-01-05 00:46:28.556006
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, company_id, action, details, ip_address, created_at, updated_at) FROM stdin;
8	2	\N	DELETE_COMPANY	Deleted company MPKD (ID: 6) safely	\N	2026-01-01 05:43:35.670364	2026-01-01 11:13:35.671444
11	2	\N	DELETE_COMPANY	Deleted company Kirti Heat Treatment (ID: 4) safely	\N	2026-01-01 05:46:00.486249	2026-01-01 11:16:00.487308
12	2	5	RESET_PASSWORD	Reset password for sam@demo.com	\N	2026-01-01 05:46:34.06795	2026-01-01 11:16:34.068624
13	2	\N	DELETE_COMPANY	Deleted company Samarth Industries (ID: 3) safely	\N	2026-01-01 05:59:51.474272	2026-01-01 11:29:51.475571
14	2	\N	DELETE_COMPANY	Deleted company Demo Company (ID: 1) safely	\N	2026-01-01 05:59:58.521504	2026-01-01 11:29:58.522566
15	2	5	TOGGLE_STATUS	Deactivated company	\N	2026-01-01 06:57:46.493023	2026-01-01 12:27:46.482288
16	2	5	TOGGLE_STATUS	Activated company	\N	2026-01-01 06:58:01.239391	2026-01-01 12:28:01.239168
17	2	2	TOGGLE_STATUS	Deactivated company	\N	2026-01-01 09:20:33.090122	2026-01-01 14:50:33.073208
18	2	2	TOGGLE_STATUS	Activated company	\N	2026-01-01 09:20:49.777741	2026-01-01 14:50:49.77658
19	2	10	CREATE_COMPANY	Created company SAMARATH INDUSTRIES	\N	2026-01-01 12:41:34.088881	2026-01-01 18:11:34.083397
20	2	10	CREATE_ADMIN	Created admin samarth@gmail.com	\N	2026-01-01 12:42:13.557162	2026-01-01 18:12:13.557344
\.


--
-- Data for Name: company; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company (id, name, gst_number, address, phone, email, created_at, updated_at, subscription_start, subscription_end, is_active, logo) FROM stdin;
5	Samarth Industries	\N	\N	7845124578	sam@demo.com	2025-12-31 14:31:56.185074+05:30	2026-01-01 12:28:01.232671+05:30	2025-12-31	2026-12-31	t	\N
2	SAMARTH INDUSTRIES	27AJUPK5039Q1Z8	Plot No. 16, Datta Colony, Kaneri, Kolhapur-416234	8605228787	admin@demo.com	2025-12-22 17:01:14.277521+05:30	2026-01-01 14:50:49.641995+05:30	2025-12-27	2026-12-27	t	\N
10	SHRI SAMARATH INDUSTRIES	27AJUPK5039Q1Z9	Plot No. -16, Datta Colony, Kaneri, Kolhapur	8605228787	samarth@gmail.com	2026-01-01 18:11:34.064272+05:30	2026-01-04 08:54:47.270827+05:30	2026-01-01	2027-01-01	t	/uploads/logos/company_10_logo.jpg
\.


--
-- Data for Name: delivery_challan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_challan (id, company_id, financial_year_id, party_id, challan_date, status, created_at, updated_at, challan_number, notes, is_active, party_challan_id, vehicle_number) FROM stdin;
3	2	1	1	2025-12-23	OPEN	2025-12-23 13:50:31.148201+05:30	2025-12-23 13:50:31.148201+05:30	CH-003	\N	t	\N	\N
5	2	1	1	2025-12-23	BILLED	2025-12-23 14:20:21.991204+05:30	2025-12-23 14:25:28.743722+05:30	CH-005	\N	t	\N	\N
60	2	12	1	2026-01-02	sent	2026-01-02 13:51:51.045334+05:30	\N	DC-001		t	\N	
61	2	12	1	2026-01-02	sent	2026-01-02 13:54:03.490036+05:30	\N	DC-002		t	\N	
62	2	12	1	2026-01-02	sent	2026-01-02 13:54:24.967385+05:30	\N	DC-003		t	\N	
74	10	15	10	2026-01-03	delivered	2026-01-03 13:09:34.019366+05:30	2026-01-04 15:32:07.117518+05:30	DC-001		t	\N	
72	10	15	11	2026-01-03	delivered	2026-01-03 12:44:52.987604+05:30	2026-01-04 15:51:09.838729+05:30	DC-001		t	\N	
73	10	15	11	2026-01-04	delivered	2026-01-03 13:00:32.306811+05:30	2026-01-04 15:57:07.309656+05:30	DC-002		t	\N	
75	10	15	11	2026-01-04	delivered	2026-01-04 16:15:26.197148+05:30	2026-01-04 16:16:46.302344+05:30	DC-003		t	\N	
76	10	15	10	2026-01-04	delivered	2026-01-04 16:18:54.581667+05:30	2026-01-04 16:20:16.908723+05:30	DC-002		t	\N	
77	10	15	10	2026-01-04	delivered	2026-01-04 16:19:33.079942+05:30	2026-01-04 16:20:35.555413+05:30	DC-003		t	\N	
78	10	15	10	2026-01-04	delivered	2026-01-04 16:19:48.076338+05:30	2026-01-04 16:20:49.954954+05:30	DC-004		t	\N	
40	2	6	1	2025-12-31	draft	2025-12-31 16:22:38.908022+05:30	\N	DC-001		t	\N	
43	5	14	9	2026-01-01	draft	2026-01-01 11:25:22.450347+05:30	\N	DC-001		t	\N	
\.


--
-- Data for Name: delivery_challan_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_challan_items (id, challan_id, item_id, party_challan_item_id, quantity, created_at, updated_at, process_id, ok_qty, cr_qty, mr_qty) FROM stdin;
68	72	\N	62	100.00	2026-01-03 12:44:52.987604	2026-01-03 12:44:52.987604	4	100.00	0.00	0.00
69	73	\N	63	100.00	2026-01-03 13:00:32.306811	2026-01-03 13:00:32.306811	4	100.00	0.00	0.00
70	74	\N	64	100.00	2026-01-03 13:09:34.019366	2026-01-03 13:09:34.019366	4	100.00	0.00	0.00
71	75	\N	65	100.00	2026-01-04 16:15:26.197148	2026-01-04 16:15:26.197148	4	90.00	5.00	5.00
72	76	\N	67	100.00	2026-01-04 16:18:54.581667	2026-01-04 16:18:54.581667	4	100.00	0.00	0.00
73	77	\N	67	200.00	2026-01-04 16:19:33.079942	2026-01-04 16:19:33.079942	4	100.00	50.00	50.00
74	78	\N	67	400.00	2026-01-04 16:19:48.076338	2026-01-04 16:19:48.076338	4	400.00	0.00	0.00
31	40	\N	45	100.00	2025-12-31 16:22:38.908022	2025-12-31 16:22:38.908022	1	100.00	0.00	0.00
34	43	\N	48	100.00	2026-01-01 11:25:22.450347	2026-01-01 11:25:22.450347	3	100.00	0.00	0.00
54	60	\N	47	200.00	2026-01-02 13:51:51.045334	2026-01-02 13:51:51.045334	2	200.00	0.00	0.00
55	61	\N	49	100.00	2026-01-02 13:54:03.490036	2026-01-02 13:54:03.490036	1	100.00	0.00	0.00
56	62	\N	46	300.00	2026-01-02 13:54:24.967385	2026-01-02 13:54:24.967385	1	300.00	0.00	0.00
\.


--
-- Data for Name: employee_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_profiles (id, user_id, designation, phone, address, pan_number, aadhar_number, pan_doc_path, aadhar_doc_path, resume_doc_path, joining_date, salary_type, base_salary, created_at, updated_at, photo_path) FROM stdin;
2	21	Senior Developer	8275831212	A/P-Kaneri, Tal-Karveer, Dist-Kolhapur, State-Maharashtra, 416234	CCOPP5793D	502478658941	\N	\N	\N	2026-01-03	MONTHLY	100000.00	2026-01-04 23:11:26.063646	2026-01-04 23:11:27.707663	uploads\\21\\photo_IMG_20190817_081308.jpg
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, company_id, financial_year_id, party_id, date, category, description, amount, payment_method, reference_no, cheque_no, cheque_date, bank_name, payee_name, is_recurring, recurring_frequency, next_due_date, status, created_by, created_at, updated_at) FROM stdin;
8	10	15	11	2026-01-03	Rent		1000.00	Cheque	\N	124512	2026-01-03	\N	BESPASK ENGINEER PVT. LTD.	f	\N	\N	PAID	\N	2026-01-03 22:13:29.229798	2026-01-03 22:13:29.229798
\.


--
-- Data for Name: financial_year; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.financial_year (id, company_id, start_date, end_date, is_active, is_locked, created_at, updated_at) FROM stdin;
12	2	2026-04-01	2027-03-31	f	f	2025-12-29 11:07:40.499838	2026-01-02 13:54:48.527143
6	2	2025-12-26	2026-12-01	t	f	2025-12-26 18:46:35.779092	2026-01-02 13:54:48.527143
1	2	2025-12-22	2025-12-22	f	f	2025-12-22 18:14:26.713411	2025-12-26 12:59:20.757642
14	5	2026-01-01	2026-01-31	t	f	2026-01-01 11:16:59.508562	2026-01-01 11:16:59.508562
17	10	2024-04-01	2025-03-31	f	f	2026-01-03 14:20:43.290313	2026-01-03 17:42:27.811302
16	10	2026-04-01	2027-03-31	f	f	2026-01-01 18:13:52.343153	2026-01-03 18:19:13.622579
15	10	2025-04-01	2026-03-31	t	f	2026-01-01 18:13:12.203828	2026-01-03 18:19:13.622579
\.


--
-- Data for Name: invoice; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice (id, company_id, financial_year_id, party_id, challan_id, invoice_date, subtotal, gst_amount, grand_total, is_locked, created_at, updated_at, invoice_number, due_date, status, notes, paid_amount, payment_status) FROM stdin;
1	2	1	1	5	2025-12-23	900.00	162.00	1062.00	t	2025-12-23 14:25:28.743722	2025-12-23 14:25:28.743722	INV-OLD-1	\N	\N	\N	\N	\N
30	10	15	11	\N	2026-01-04	1200.00	216.00	1416.00	f	2026-01-04 15:51:09.838729	2026-01-04 16:49:19.807126	INV/25-26/002	\N	BILLED		0.00	\N
31	10	15	11	\N	2026-01-04	2000.00	360.00	2360.00	f	2026-01-04 15:57:07.309656	2026-01-04 16:49:19.807126	INV/25-26/003	\N	BILLED		0.00	\N
29	10	15	10	\N	2026-01-04	9000.00	1620.00	10620.00	f	2026-01-04 15:32:07.117518	2026-01-04 17:16:43.897656	INV/25-26/001	\N	PAID		10620.00	PAID
33	10	15	10	\N	2026-01-04	9000.00	1620.00	10620.00	f	2026-01-04 16:20:16.908723	2026-01-04 17:16:43.897656	INV/25-26/005	\N	PAID		10620.00	PAID
34	10	15	10	\N	2026-01-04	13500.00	2430.00	15930.00	f	2026-01-04 16:20:35.555413	2026-01-04 17:16:43.897656	INV/25-26/006	\N	PAID		15930.00	PAID
35	10	15	10	\N	2026-01-04	36000.00	6480.00	42480.00	f	2026-01-04 16:20:49.954954	2026-01-04 17:16:43.897656	INV/25-26/007	\N	PAID		42480.00	PAID
32	10	15	11	\N	2026-01-04	1140.00	205.20	1345.20	f	2026-01-04 16:16:46.302344	2026-01-04 16:16:46.302344	INV/25-26/004	\N	OPEN		0.00	PENDING
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_items (id, invoice_id, item_id, quantity, rate, amount, created_at, updated_at, grn_no, delivery_challan_item_id) FROM stdin;
39	29	11	100.00	90.00	9000.00	2026-01-04 15:32:07.117518	2026-01-04 15:32:07.117518	12	70
40	30	10	100.00	12.00	1200.00	2026-01-04 15:51:09.838729	2026-01-04 15:51:09.838729	122	68
41	31	9	100.00	20.00	2000.00	2026-01-04 15:57:07.309656	2026-01-04 15:57:07.309656	56	69
42	32	10	95.00	12.00	1140.00	2026-01-04 16:16:46.302344	2026-01-04 16:16:46.302344	78	71
43	33	11	100.00	90.00	9000.00	2026-01-04 16:20:16.908723	2026-01-04 16:20:16.908723	78	72
44	34	11	150.00	90.00	13500.00	2026-01-04 16:20:35.555413	2026-01-04 16:20:35.555413	89	73
45	35	11	400.00	90.00	36000.00	2026-01-04 16:20:49.954954	2026-01-04 16:20:49.954954	457	74
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.items (id, company_id, name, hsn_code, rate, created_at, updated_at, financial_year_id, party_id, is_active, po_number, casting_weight, scrap_weight, process_id) FROM stdin;
3	2	Item1	Huh45	77.00	2025-12-29 12:54:07.98961	2025-12-29 14:20:41.638609	12	5	t		0.000	0.000	1
1	2	Steel Rod	hy459	79.00	2025-12-23 12:51:57.475447	2025-12-29 14:22:50.254007	\N	1	t	78d	9.000	9.000	2
7	2	Rod	HN-1	30.00	2025-12-30 11:06:02.300399	2025-12-30 11:06:02.300399	12	1	t	2025	3.000	3.000	1
8	5	vr	fr	4.00	2026-01-01 11:18:11.495178	2026-01-01 11:18:11.495178	14	9	t	fre	4.000	8.000	3
10	10	SHIFTING BLAST	7845	12.00	2026-01-01 18:24:58.228827	2026-01-01 18:25:57.407484	15	11	t	BEPL/22-23/016	5.000	6.000	5
11	10	SENSER BRCKET	7845	90.00	2026-01-01 18:28:34.190214	2026-01-01 18:28:34.190214	15	10	t	BJ-45/2	5.000	7.000	4
9	10	BEARING CAP	1212	20.00	2026-01-01 18:22:40.756886	2026-01-02 20:44:21.047811	15	11	t	BEPL/22-23/016	5.000	5.000	4
\.


--
-- Data for Name: party; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.party (id, company_id, financial_year_id, name, gst_number, address, phone, opening_balance, created_at, updated_at, is_active) FROM stdin;
1	2	1	ABC Traders	27ABCDE1234F1Z5	Kolhapur	7878787878	5000.00	2025-12-23 12:50:09.380272	2025-12-29 18:36:26.798232	t
6	2	12	mayur	GYv5611	Kolhapur	7845124578	0.00	2025-12-29 18:20:12.906349	2025-12-29 18:36:28.831647	t
7	2	12	Newdigital	guyg456	Mumbai	7845124587	0.00	2025-12-29 18:20:44.673611	2025-12-29 18:36:30.789195	t
5	2	12	Bespack1 Pvt. Ltd.	27ATYBH78451	Plot No.- 12, Gokul Shirgaon MIDC, Tal-Karveer, Dist-Kolhapur, Pin Code-416231	7845124571	10000000.00	2025-12-29 12:05:20.775716	2025-12-29 18:37:31.529577	t
9	5	14	mayur	fregv	vvr	78454124878	0.00	2026-01-01 11:17:27.4734	2026-01-01 11:17:27.4734	t
10	10	15	SHRI GANESH ENGNIEERING	27ABSFS4655G1ZL	A-101 FIVE STAR MIDC, Tal-Kagal, Dist-Kolhapur, State- Maharashtra 46203	4578451245	0.00	2026-01-01 18:17:12.874609	2026-01-02 20:43:02.83305	t
11	10	15	BESPASK ENGINEER PVT. LTD.	27AABCB7393M1Z5	Plot No B-15, Gokul Shirgaon MIDC, Tal: Karveer, Dist:Kolhapur 416234	4512457845	0.00	2026-01-01 18:19:59.613962	2026-01-02 20:44:14.522864	t
\.


--
-- Data for Name: party_challan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.party_challan (id, company_id, financial_year_id, party_id, challan_number, challan_date, notes, status, is_active, created_at, updated_at, working_days) FROM stdin;
53	10	15	10	P-01	2026-01-03		completed	t	2026-01-03 13:09:18.136664+05:30	2026-01-03 13:09:34.019366+05:30	\N
54	10	15	11	P-03	2026-01-02		completed	t	2026-01-03 13:21:22.544839+05:30	2026-01-04 16:15:26.197148+05:30	\N
56	10	15	10	P-04	2026-01-04		partial	t	2026-01-04 16:18:26.560333+05:30	2026-01-04 16:18:54.581667+05:30	\N
13	2	6	5	1	2025-12-29		open	t	2025-12-29 21:10:53.050723+05:30	\N	\N
15	2	6	5	2	2025-12-29		open	t	2025-12-29 22:10:08.606924+05:30	\N	\N
36	2	6	1	P-06	2025-12-31		completed	t	2025-12-31 19:09:10.134644+05:30	2026-01-02 13:51:51.045334+05:30	\N
38	2	12	1	P-01	2026-01-01		completed	t	2026-01-01 14:54:13.686464+05:30	2026-01-02 13:54:03.490036+05:30	\N
34	2	6	1	P-02	2025-12-31		completed	t	2025-12-31 16:15:21.895847+05:30	2025-12-31 16:22:38.908022+05:30	\N
35	2	6	1	P-05	2025-12-31		completed	t	2025-12-31 19:08:15.312121+05:30	2026-01-02 13:54:24.967385+05:30	\N
37	5	14	9	4	2026-01-01		partial	t	2026-01-01 11:18:28.040181+05:30	2026-01-01 11:25:22.450347+05:30	\N
51	10	15	11	P-01	2026-01-03		completed	t	2026-01-03 12:44:34.358392+05:30	2026-01-03 12:44:52.987604+05:30	\N
52	10	15	11	P-02	2026-01-03		completed	t	2026-01-03 13:00:08.224729+05:30	2026-01-03 13:00:32.306811+05:30	\N
\.


--
-- Data for Name: party_challan_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.party_challan_items (id, party_challan_id, item_id, quantity_ordered, quantity_delivered, rate, created_at, updated_at, process_id) FROM stdin;
48	37	8	120.00	100.00	\N	2026-01-01 11:18:28.040181	2026-01-01 11:25:22.450347	3
10	13	1	1.00	0.00	\N	2025-12-29 21:10:53.050723	2025-12-29 21:10:53.050723	1
12	15	3	1.00	0.00	\N	2025-12-29 22:10:08.606924	2025-12-29 22:10:08.606924	1
62	51	10	100.00	100.00	\N	2026-01-03 12:44:34.358392	2026-01-03 12:44:52.987604	4
63	52	9	100.00	100.00	\N	2026-01-03 13:00:08.224729	2026-01-03 13:00:32.306811	4
64	53	11	100.00	100.00	\N	2026-01-03 13:09:18.136664	2026-01-03 13:09:34.019366	4
65	54	10	100.00	100.00	\N	2026-01-03 13:21:22.544839	2026-01-04 16:15:26.197148	4
67	56	11	900.00	700.00	\N	2026-01-04 16:18:26.560333	2026-01-04 16:19:48.076338	4
47	36	1	200.00	200.00	\N	2025-12-31 19:09:10.134644	2026-01-02 13:51:51.045334	2
45	34	1	100.00	100.00	\N	2025-12-31 16:15:21.895847	2025-12-31 16:22:38.908022	1
49	38	1	100.00	100.00	\N	2026-01-01 14:54:13.686464	2026-01-02 13:54:03.490036	1
46	35	1	300.00	300.00	\N	2025-12-31 19:08:15.312121	2026-01-02 13:54:24.967385	1
\.


--
-- Data for Name: payment_allocation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_allocation (id, payment_id, invoice_id, amount, created_at, updated_at) FROM stdin;
26	25	29	10620.00	2026-01-04 17:16:43.897656	2026-01-04 17:16:43.897656
27	25	33	10620.00	2026-01-04 17:16:43.897656	2026-01-04 17:16:43.897656
28	25	34	15930.00	2026-01-04 17:16:43.897656	2026-01-04 17:16:43.897656
29	25	35	42480.00	2026-01-04 17:16:43.897656	2026-01-04 17:16:43.897656
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, company_id, financial_year_id, party_id, payment_date, amount, payment_type, payment_mode, reference_number, notes, created_at, updated_at) FROM stdin;
25	10	15	10	2026-01-04	79650.00	RECEIVED	CHEQUE	124578		2026-01-04 17:16:43.897656	2026-01-04 17:16:43.897656
\.


--
-- Data for Name: processes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.processes (id, company_id, name, is_active, created_at, updated_at) FROM stdin;
2	2	Mayur	t	2025-12-29 14:16:42.549892	2025-12-29 18:05:38.773341
1	2	Maching	t	2025-12-29 14:01:29.103107	2025-12-30 11:05:22.863302
3	5	Mach	t	2026-01-01 11:17:56.553695	2026-01-01 11:17:56.553695
4	10	Machining	t	2026-01-01 18:21:57.579843	2026-01-01 18:21:57.579843
5	10	Vending	t	2026-01-01 18:24:26.351576	2026-01-01 18:24:26.351576
\.


--
-- Data for Name: salary_advances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_advances (id, user_id, amount, date, reason, is_deducted, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stock_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_transactions (id, company_id, financial_year_id, item_id, quantity, transaction_type, reference_type, reference_id, created_at, updated_at) FROM stdin;
69	2	12	1	200.00	IN	DELIVERY_CHALLAN	60	2026-01-02 13:51:51.045334	2026-01-02 13:51:51.045334
70	2	12	1	100.00	IN	DELIVERY_CHALLAN	61	2026-01-02 13:54:03.490036	2026-01-02 13:54:03.490036
71	2	12	1	300.00	IN	DELIVERY_CHALLAN	62	2026-01-02 13:54:24.967385	2026-01-02 13:54:24.967385
31	2	6	1	100.00	IN	DELIVERY_CHALLAN	40	2025-12-31 16:22:38.908022	2025-12-31 16:22:38.908022
34	5	14	8	100.00	IN	DELIVERY_CHALLAN	43	2026-01-01 11:25:22.450347	2026-01-01 11:25:22.450347
95	10	15	11	100.00	IN	INV_UPD_REVERT	22	2026-01-03 08:22:33.303752	2026-01-03 08:22:33.303752
97	10	15	11	100.00	IN	INV_UPD_REVERT	22	2026-01-03 08:23:36.534947	2026-01-03 08:23:36.534947
100	10	15	10	50.00	IN	INV_UPD_REVERT	22	2026-01-03 08:25:16.153596	2026-01-03 08:25:16.153596
107	10	15	10	100.00	IN	PARTY_CHALLAN	51	2026-01-03 12:44:34.358392	2026-01-03 12:44:34.358392
108	10	15	10	100.00	OUT	DELIVERY_CHALLAN	72	2026-01-03 12:44:52.987604	2026-01-03 12:44:52.987604
109	10	15	9	100.00	IN	PARTY_CHALLAN	52	2026-01-03 13:00:08.224729	2026-01-03 13:00:08.224729
110	10	15	9	100.00	OUT	DELIVERY_CHALLAN	73	2026-01-03 13:00:32.306811	2026-01-03 13:00:32.306811
111	10	15	11	100.00	IN	PARTY_CHALLAN	53	2026-01-03 13:09:18.136664	2026-01-03 13:09:18.136664
112	10	15	11	100.00	OUT	DELIVERY_CHALLAN	74	2026-01-03 13:09:34.019366	2026-01-03 13:09:34.019366
113	10	15	10	100.00	IN	PARTY_CHALLAN	54	2026-01-03 13:21:22.544839	2026-01-03 13:21:22.544839
115	10	15	10	100.00	OUT	DELIVERY_CHALLAN	75	2026-01-04 16:15:26.197148	2026-01-04 16:15:26.197148
116	10	15	11	900.00	IN	PARTY_CHALLAN	56	2026-01-04 16:18:26.560333	2026-01-04 16:18:26.560333
117	10	15	11	100.00	OUT	DELIVERY_CHALLAN	76	2026-01-04 16:18:54.581667	2026-01-04 16:18:54.581667
118	10	15	11	200.00	OUT	DELIVERY_CHALLAN	77	2026-01-04 16:19:33.079942	2026-01-04 16:19:33.079942
119	10	15	11	400.00	OUT	DELIVERY_CHALLAN	78	2026-01-04 16:19:48.076338	2026-01-04 16:19:48.076338
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, company_id, name, email, password_hash, role, is_active, created_at, updated_at) FROM stdin;
7	5	Samarth	sam@demo.com	$2b$12$UQg1gMO0hQPQmaq6zIMAweIP9r.bSmVpAtUraa5frUIVKkwT/Gcve	COMPANY_ADMIN	t	2025-12-31 14:42:44.887341	2026-01-01 11:16:33.598711
19	10	Samarath	samarth@gmail.com	$2b$12$Lir2AQ3XHi/FrMlEANGrHOKgGV5rvAciIfjWA90MmDruWsBcRHxCy	COMPANY_ADMIN	t	2026-01-01 18:12:11.444357	2026-01-01 18:12:11.444357
21	10	Mayur Patil	mayur@gmail.com	\N	USER	t	2026-01-04 23:11:26.063646	2026-01-04 23:38:19.1824
1	2	Kesarkar	admin1@demo.com	$2b$12$VY9fhGGHIMhsnSlHCH8X8Oh4b/B9kygIb1sHcVx5u02KGi13T6DCy	COMPANY_ADMIN	t	2025-12-22 17:01:14.295634	2025-12-31 18:27:54.039001
13	2	Mayur Patil	mayur@mayur.com	\N	USER	t	2025-12-31 18:45:48.328522	2025-12-31 18:45:48.328522
2	\N	Super Admin	superadmin@smartbill.com	$2b$12$xq2Bv1I0y2zkY3R5X1syl.Ec7/LaGpXYX3iTB0lDMSuxCii8rzqY2	SUPER_ADMIN	t	2025-12-27 20:09:14.014719	2026-01-01 10:44:37.309914
\.


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendance_id_seq', 3, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 20, true);


--
-- Name: company_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.company_id_seq', 10, true);


--
-- Name: delivery_challan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.delivery_challan_id_seq', 78, true);


--
-- Name: delivery_challan_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.delivery_challan_items_id_seq', 74, true);


--
-- Name: employee_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employee_profiles_id_seq', 2, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expenses_id_seq', 13, true);


--
-- Name: financial_year_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.financial_year_id_seq', 17, true);


--
-- Name: invoice_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoice_id_seq', 35, true);


--
-- Name: invoice_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoice_items_id_seq', 45, true);


--
-- Name: items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.items_id_seq', 11, true);


--
-- Name: party_challan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.party_challan_id_seq', 56, true);


--
-- Name: party_challan_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.party_challan_items_id_seq', 67, true);


--
-- Name: party_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.party_id_seq', 11, true);


--
-- Name: payment_allocation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_allocation_id_seq', 29, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 25, true);


--
-- Name: processes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.processes_id_seq', 5, true);


--
-- Name: salary_advances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_advances_id_seq', 1, false);


--
-- Name: stock_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_transactions_id_seq', 119, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 21, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: company company_gst_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company
    ADD CONSTRAINT company_gst_number_key UNIQUE (gst_number);


--
-- Name: company company_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company
    ADD CONSTRAINT company_pkey PRIMARY KEY (id);


--
-- Name: delivery_challan_items delivery_challan_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_challan_items
    ADD CONSTRAINT delivery_challan_items_pkey PRIMARY KEY (id);


--
-- Name: delivery_challan delivery_challan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_challan
    ADD CONSTRAINT delivery_challan_pkey PRIMARY KEY (id);


--
-- Name: employee_profiles employee_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_profiles
    ADD CONSTRAINT employee_profiles_pkey PRIMARY KEY (id);


--
-- Name: employee_profiles employee_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_profiles
    ADD CONSTRAINT employee_profiles_user_id_key UNIQUE (user_id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: financial_year financial_year_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_year
    ADD CONSTRAINT financial_year_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoice invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_pkey PRIMARY KEY (id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: party_challan_items party_challan_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_challan_items
    ADD CONSTRAINT party_challan_items_pkey PRIMARY KEY (id);


--
-- Name: party_challan party_challan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_challan
    ADD CONSTRAINT party_challan_pkey PRIMARY KEY (id);


--
-- Name: party party_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party
    ADD CONSTRAINT party_pkey PRIMARY KEY (id);


--
-- Name: payment_allocation payment_allocation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_allocation
    ADD CONSTRAINT payment_allocation_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: processes processes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processes
    ADD CONSTRAINT processes_pkey PRIMARY KEY (id);


--
-- Name: salary_advances salary_advances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_advances
    ADD CONSTRAINT salary_advances_pkey PRIMARY KEY (id);


--
-- Name: stock_transactions stock_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transactions
    ADD CONSTRAINT stock_transactions_pkey PRIMARY KEY (id);


--
-- Name: delivery_challan uix_delivery_company_fy_party_challan_number; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_challan
    ADD CONSTRAINT uix_delivery_company_fy_party_challan_number UNIQUE (company_id, financial_year_id, party_id, challan_number);


--
-- Name: party_challan uix_pc_company_fy_party_challan_number; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_challan
    ADD CONSTRAINT uix_pc_company_fy_party_challan_number UNIQUE (company_id, financial_year_id, party_id, challan_number);


--
-- Name: attendance unique_user_attendance_per_day; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT unique_user_attendance_per_day UNIQUE (user_id, date);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_attendance_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_attendance_id ON public.attendance USING btree (id);


--
-- Name: ix_audit_logs_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_id ON public.audit_logs USING btree (id);


--
-- Name: ix_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_company_id ON public.company USING btree (id);


--
-- Name: ix_company_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_company_is_active ON public.company USING btree (is_active);


--
-- Name: ix_delivery_challan_challan_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_delivery_challan_challan_number ON public.delivery_challan USING btree (challan_number);


--
-- Name: ix_delivery_challan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_delivery_challan_id ON public.delivery_challan USING btree (id);


--
-- Name: ix_employee_profiles_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_employee_profiles_id ON public.employee_profiles USING btree (id);


--
-- Name: ix_expenses_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_expenses_id ON public.expenses USING btree (id);


--
-- Name: ix_financial_year_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_financial_year_id ON public.financial_year USING btree (id);


--
-- Name: ix_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoice_id ON public.invoice USING btree (id);


--
-- Name: ix_invoice_invoice_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_invoice_invoice_number ON public.invoice USING btree (invoice_number);


--
-- Name: ix_items_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_items_id ON public.items USING btree (id);


--
-- Name: ix_party_challan_challan_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_party_challan_challan_number ON public.party_challan USING btree (challan_number);


--
-- Name: ix_party_challan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_party_challan_id ON public.party_challan USING btree (id);


--
-- Name: ix_party_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_party_id ON public.party USING btree (id);


--
-- Name: ix_payment_allocation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_payment_allocation_id ON public.payment_allocation USING btree (id);


--
-- Name: ix_payments_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_payments_id ON public.payments USING btree (id);


--
-- Name: ix_processes_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_processes_id ON public.processes USING btree (id);


--
-- Name: ix_salary_advances_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_salary_advances_id ON public.salary_advances USING btree (id);


--
-- Name: ix_stock_transactions_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_stock_transactions_id ON public.stock_transactions USING btree (id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: attendance attendance_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: delivery_challan delivery_challan_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_challan
    ADD CONSTRAINT delivery_challan_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id);


--
-- Name: delivery_challan delivery_challan_financial_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_challan
    ADD CONSTRAINT delivery_challan_financial_year_id_fkey FOREIGN KEY (financial_year_id) REFERENCES public.financial_year(id);


--
-- Name: delivery_challan_items delivery_challan_items_challan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_challan_items
    ADD CONSTRAINT delivery_challan_items_challan_id_fkey FOREIGN KEY (challan_id) REFERENCES public.delivery_challan(id);


--
-- Name: delivery_challan_items delivery_challan_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_challan_items
    ADD CONSTRAINT delivery_challan_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: delivery_challan_items delivery_challan_items_party_challan_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_challan_items
    ADD CONSTRAINT delivery_challan_items_party_challan_item_id_fkey FOREIGN KEY (party_challan_item_id) REFERENCES public.party_challan_items(id);


--
-- Name: delivery_challan_items delivery_challan_items_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_challan_items
    ADD CONSTRAINT delivery_challan_items_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.processes(id);


--
-- Name: delivery_challan delivery_challan_party_challan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_challan
    ADD CONSTRAINT delivery_challan_party_challan_id_fkey FOREIGN KEY (party_challan_id) REFERENCES public.party_challan(id);


--
-- Name: delivery_challan delivery_challan_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_challan
    ADD CONSTRAINT delivery_challan_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.party(id);


--
-- Name: employee_profiles employee_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_profiles
    ADD CONSTRAINT employee_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: expenses expenses_financial_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_financial_year_id_fkey FOREIGN KEY (financial_year_id) REFERENCES public.financial_year(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.party(id) ON DELETE SET NULL;


--
-- Name: financial_year financial_year_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_year
    ADD CONSTRAINT financial_year_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE CASCADE;


--
-- Name: invoice invoice_challan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_challan_id_fkey FOREIGN KEY (challan_id) REFERENCES public.delivery_challan(id);


--
-- Name: invoice invoice_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id);


--
-- Name: invoice invoice_financial_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_financial_year_id_fkey FOREIGN KEY (financial_year_id) REFERENCES public.financial_year(id);


--
-- Name: invoice_items invoice_items_delivery_challan_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_delivery_challan_item_id_fkey FOREIGN KEY (delivery_challan_item_id) REFERENCES public.delivery_challan_items(id);


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoice(id);


--
-- Name: invoice_items invoice_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: invoice invoice_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.party(id);


--
-- Name: items items_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE CASCADE;


--
-- Name: items items_financial_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_financial_year_id_fkey FOREIGN KEY (financial_year_id) REFERENCES public.financial_year(id) ON DELETE CASCADE;


--
-- Name: items items_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.party(id) ON DELETE SET NULL;


--
-- Name: items items_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.processes(id) ON DELETE SET NULL;


--
-- Name: party_challan party_challan_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_challan
    ADD CONSTRAINT party_challan_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id);


--
-- Name: party_challan party_challan_financial_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_challan
    ADD CONSTRAINT party_challan_financial_year_id_fkey FOREIGN KEY (financial_year_id) REFERENCES public.financial_year(id);


--
-- Name: party_challan_items party_challan_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_challan_items
    ADD CONSTRAINT party_challan_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: party_challan_items party_challan_items_party_challan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_challan_items
    ADD CONSTRAINT party_challan_items_party_challan_id_fkey FOREIGN KEY (party_challan_id) REFERENCES public.party_challan(id);


--
-- Name: party_challan_items party_challan_items_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_challan_items
    ADD CONSTRAINT party_challan_items_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.processes(id);


--
-- Name: party_challan party_challan_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_challan
    ADD CONSTRAINT party_challan_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.party(id);


--
-- Name: party party_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party
    ADD CONSTRAINT party_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE CASCADE;


--
-- Name: party party_financial_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party
    ADD CONSTRAINT party_financial_year_id_fkey FOREIGN KEY (financial_year_id) REFERENCES public.financial_year(id) ON DELETE CASCADE;


--
-- Name: payment_allocation payment_allocation_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_allocation
    ADD CONSTRAINT payment_allocation_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoice(id);


--
-- Name: payment_allocation payment_allocation_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_allocation
    ADD CONSTRAINT payment_allocation_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);


--
-- Name: payments payments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id);


--
-- Name: payments payments_financial_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_financial_year_id_fkey FOREIGN KEY (financial_year_id) REFERENCES public.financial_year(id);


--
-- Name: payments payments_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.party(id);


--
-- Name: processes processes_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processes
    ADD CONSTRAINT processes_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE CASCADE;


--
-- Name: salary_advances salary_advances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_advances
    ADD CONSTRAINT salary_advances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: stock_transactions stock_transactions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transactions
    ADD CONSTRAINT stock_transactions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id);


--
-- Name: stock_transactions stock_transactions_financial_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transactions
    ADD CONSTRAINT stock_transactions_financial_year_id_fkey FOREIGN KEY (financial_year_id) REFERENCES public.financial_year(id);


--
-- Name: stock_transactions stock_transactions_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transactions
    ADD CONSTRAINT stock_transactions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict L0kX003ZpvamIgo3JgLe0vJR6nsJoS2uKMdocfDqd596fCbp8NnNOXiRkkbun9D

