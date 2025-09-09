--
-- PostgreSQL database dump
--

-- Dumped from database version 16.5
-- Dumped by pg_dump version 16.5

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
-- Name: cities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cities (
    id integer NOT NULL,
    name text NOT NULL,
    code smallint,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cities OWNER TO postgres;

--
-- Name: cities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cities_id_seq OWNER TO postgres;

--
-- Name: cities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cities_id_seq OWNED BY public.cities.id;


--
-- Name: news; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.news (
    id text NOT NULL,
    source text NOT NULL,
    province text NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    category text NOT NULL,
    tags text[],
    summary text,
    published_at timestamp with time zone,
    tweet_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    fingerprint text,
    CONSTRAINT news_category_check CHECK ((category = ANY (ARRAY['şikayet'::text, 'soru'::text, 'öneri'::text, 'istek'::text])))
);


ALTER TABLE public.news OWNER TO postgres;

--
-- Name: sources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sources (
    id text NOT NULL,
    city_id integer NOT NULL,
    name text NOT NULL,
    rss_url text NOT NULL,
    website_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sources OWNER TO postgres;

--
-- Name: cities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cities ALTER COLUMN id SET DEFAULT nextval('public.cities_id_seq'::regclass);


--
-- Data for Name: cities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cities (id, name, code, is_active, created_at) FROM stdin;
1	Adana	1	t	2025-09-08 13:06:47.246566+00
2	Adıyaman	2	t	2025-09-08 13:06:47.247492+00
3	Afyonkarahisar	3	t	2025-09-08 13:06:47.248013+00
4	Ağrı	4	t	2025-09-08 13:06:47.248528+00
5	Amasya	5	t	2025-09-08 13:06:47.249131+00
6	Ankara	6	t	2025-09-08 13:06:47.249819+00
7	Antalya	7	t	2025-09-08 13:06:47.250421+00
8	Artvin	8	t	2025-09-08 13:06:47.250787+00
9	Aydın	9	t	2025-09-08 13:06:47.251388+00
10	Balıkesir	10	t	2025-09-08 13:06:47.251751+00
11	Bilecik	11	t	2025-09-08 13:06:47.252056+00
12	Bingöl	12	t	2025-09-08 13:06:47.25408+00
13	Bitlis	13	t	2025-09-08 13:06:47.254379+00
14	Bolu	14	t	2025-09-08 13:06:47.254657+00
15	Burdur	15	t	2025-09-08 13:06:47.255028+00
16	Bursa	16	t	2025-09-08 13:06:47.255496+00
17	Çanakkale	17	t	2025-09-08 13:06:47.255828+00
18	Çankırı	18	t	2025-09-08 13:06:47.256169+00
19	Çorum	19	t	2025-09-08 13:06:47.256463+00
20	Denizli	20	t	2025-09-08 13:06:47.256748+00
21	Diyarbakır	21	t	2025-09-08 13:06:47.257161+00
22	Edirne	22	t	2025-09-08 13:06:47.257461+00
23	Elazığ	23	t	2025-09-08 13:06:47.25773+00
24	Erzincan	24	t	2025-09-08 13:06:47.258037+00
25	Erzurum	25	t	2025-09-08 13:06:47.258374+00
26	Eskişehir	26	t	2025-09-08 13:06:47.258665+00
27	Gaziantep	27	t	2025-09-08 13:06:47.258968+00
28	Giresun	28	t	2025-09-08 13:06:47.259244+00
29	Gümüşhane	29	t	2025-09-08 13:06:47.259511+00
30	Hakkari	30	t	2025-09-08 13:06:47.259786+00
31	Hatay	31	t	2025-09-08 13:06:47.260043+00
32	Isparta	32	t	2025-09-08 13:06:47.260327+00
33	Mersin	33	t	2025-09-08 13:06:47.260591+00
34	İstanbul	34	t	2025-09-08 13:06:47.260859+00
35	İzmir	35	t	2025-09-08 13:06:47.261139+00
36	Kars	36	t	2025-09-08 13:06:47.261402+00
37	Kastamonu	37	t	2025-09-08 13:06:47.261682+00
38	Kayseri	38	t	2025-09-08 13:06:47.261953+00
39	Kırklareli	39	t	2025-09-08 13:06:47.26227+00
40	Kırşehir	40	t	2025-09-08 13:06:47.262583+00
41	Kocaeli	41	t	2025-09-08 13:06:47.262899+00
42	Konya	42	t	2025-09-08 13:06:47.263214+00
43	Kütahya	43	t	2025-09-08 13:06:47.263472+00
44	Malatya	44	t	2025-09-08 13:06:47.263717+00
45	Manisa	45	t	2025-09-08 13:06:47.263973+00
46	Kahramanmaraş	46	t	2025-09-08 13:06:47.264272+00
47	Mardin	47	t	2025-09-08 13:06:47.264541+00
48	Muğla	48	t	2025-09-08 13:06:47.264814+00
49	Muş	49	t	2025-09-08 13:06:47.265083+00
50	Nevşehir	50	t	2025-09-08 13:06:47.265364+00
51	Niğde	51	t	2025-09-08 13:06:47.265628+00
52	Ordu	52	t	2025-09-08 13:06:47.265892+00
53	Rize	53	t	2025-09-08 13:06:47.266221+00
54	Sakarya	54	t	2025-09-08 13:06:47.266533+00
55	Samsun	55	t	2025-09-08 13:06:47.266801+00
56	Siirt	56	t	2025-09-08 13:06:47.26706+00
57	Sinop	57	t	2025-09-08 13:06:47.267359+00
58	Sivas	58	t	2025-09-08 13:06:47.26762+00
59	Tekirdağ	59	t	2025-09-08 13:06:47.274282+00
60	Tokat	60	t	2025-09-08 13:06:47.274705+00
61	Trabzon	61	t	2025-09-08 13:06:47.275057+00
62	Tunceli	62	t	2025-09-08 13:06:47.275962+00
63	Şanlıurfa	63	t	2025-09-08 13:06:47.276315+00
64	Uşak	64	t	2025-09-08 13:06:47.276603+00
65	Van	65	t	2025-09-08 13:06:47.276931+00
66	Yozgat	66	t	2025-09-08 13:06:47.277249+00
67	Zonguldak	67	t	2025-09-08 13:06:47.277555+00
68	Aksaray	68	t	2025-09-08 13:06:47.277839+00
69	Bayburt	69	t	2025-09-08 13:06:47.278197+00
70	Karaman	70	t	2025-09-08 13:06:47.278513+00
71	Kırıkkale	71	t	2025-09-08 13:06:47.278785+00
72	Batman	72	t	2025-09-08 13:06:47.279099+00
73	Şırnak	73	t	2025-09-08 13:06:47.279405+00
74	Bartın	74	t	2025-09-08 13:06:47.279684+00
75	Ardahan	75	t	2025-09-08 13:06:47.279965+00
76	Iğdır	76	t	2025-09-08 13:06:47.280403+00
77	Yalova	77	t	2025-09-08 13:06:47.280692+00
78	Karabük	78	t	2025-09-08 13:06:47.280937+00
79	Kilis	79	t	2025-09-08 13:06:47.281234+00
80	Osmaniye	80	t	2025-09-08 13:06:47.281539+00
81	Düzce	81	t	2025-09-08 13:06:47.281816+00
\.


--
-- Data for Name: news; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.news (id, source, province, title, url, category, tags, summary, published_at, tweet_text, created_at, fingerprint) FROM stdin;
mfb52guzmy2lyqglwce	rss	Sivas	Sivas’ta 114 bin öğrenci için ders zili çaldı	https://www.haber58.com.tr/sivasta-114-bin-ogrenci-icin-ders-zili-caldi/	öneri	{eğitim,sivas,öğrenci}	Sivas’ta 2025-2026 eğitim öğretim yılı başladı, kentte 114 bin öğrenci ders başı yaptı. Sivas’ta 114 bin öğrenci için ders zili çaldı Tüm yurtta olduğu gibi Sivas’ta da yeni eğitim öğretim yılının ilk ders zili çaldı. Öğrenciler, yaz tatilinin sona ermesinin ardından yeniden okullarına ve arkadaşlarına kavuşmanın heyecanını yaşadı. Kentte 114 bin öğrenci ve 10 bin […] The post Sivas’ta 114 bin öğrenci için ders zili çaldı appeared first on Sivas Haber 58.	2025-09-08 11:14:24+00	Sivas’ta 114 bin öğrenci yeni eğitim yılına başladı. Yaz tatili bitti, okullar ve arkadaşlar tekrar buluştu. Umarım bu yıl sağlık ve başarı dolu geçer herkes için.	2025-09-08 13:09:46.332191+00	115018534c150912b66db50ef36872d2
mfb53a9tngb0sad2arc	rss	Sivas	CHP’li vekiller Gürsel Tekin’in girmeye çalıştığı makam odasına barikat kurdu	https://gundemsivas.com/gursel-tekin-chp-istanbul-il-baskanligi-kayyum/	şikayet	{siyaset,chp,gurseltekin}	CHP İstanbul İl Başkanlığına kayyum atanan Gürsel Tekin, polis eşliğinde binaya girdi. Makam odasının önünde barikat kuruldu.	2025-09-08 13:05:19+00	Gürsel Tekin polis eşliğinde İstanbul İl Başkanlığına girdi ama CHP’li vekiller makam odasına girmesini engellemek için barikat kurdu. Bu ne hal böyle?	2025-09-08 13:10:24.449374+00	20360f262cef91e0991023653e7b22a1
mfb542hx9a1gq9zvxy	rss	Sivas	Maç Kaybet, İtibarını Değil!	https://sivasolay.com/mac-kaybet-itibarini-degil/	şikayet	{spor,futbol,sivasspor}	“Ben şampiyonluk adayı değilim” dese de rakiplerinin “Doğal şampiyon adayı” gördüğü Sivasspor, geride kalan 4 maçta ne yazık ki ,bu itibarına ve büyüklüğüne yakışmayan sonuçlar aldı. Sadece kötü sonuç mu? Hayır ,ortaya koyduğu futbolda ne adına ne de şanına yakıştı! Zaten asıl insanı üzende oynadığı futbol! Yani Sivasspor geride kalan 4 maçta oynadığı oyunla bize […]	2025-09-07 15:19:48+00	Sivasspor’un son maçları hem sonuç hem oyun olarak bizleri üzüyor. Bu itibarına hiç yakışmıyor. Lütfen eski ruhunuzla sahada olun, şanınızı geri kazanın.	2025-09-08 13:11:01.030045+00	db334841dc9e734a871758b1b0cb3bf3
\.


--
-- Data for Name: sources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sources (id, city_id, name, rss_url, website_url, is_active, created_at) FROM stdin;
eca614e5-049b-41f2-9973-2bd76c612558	58	Haber 58	https://www.haber58.com.tr/feed/	https://www.haber58.com.tr/	t	2025-09-08 13:09:35.337931+00
f2968b11-4630-4f06-ab7a-d0dee414215f	58	Gündem Sivas	https://gundemsivas.com/feed/	https://gundemsivas.com/	t	2025-09-08 13:10:15.040587+00
8ffcf453-b6d8-4b4b-b02a-e3baa6022aec	58	Sivas Olay	https://sivasolay.com/feed/	https://sivasolay.com/	t	2025-09-08 13:10:52.035163+00
\.


--
-- Name: cities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cities_id_seq', 81, true);


--
-- Name: cities cities_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_code_key UNIQUE (code);


--
-- Name: cities cities_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_name_key UNIQUE (name);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: news news_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_pkey PRIMARY KEY (id);


--
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id);


--
-- Name: sources sources_rss_url_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_rss_url_key UNIQUE (rss_url);


--
-- Name: idx_news_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_news_category ON public.news USING btree (category);


--
-- Name: idx_news_province; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_news_province ON public.news USING btree (province);


--
-- Name: idx_news_published; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_news_published ON public.news USING btree (COALESCE(published_at, created_at) DESC);


--
-- Name: idx_news_tags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_news_tags ON public.news USING gin (tags);


--
-- Name: idx_news_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_news_time ON public.news USING btree (COALESCE(published_at, created_at));


--
-- Name: idx_sources_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sources_city ON public.sources USING btree (city_id);


--
-- Name: news_fingerprint_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX news_fingerprint_key ON public.news USING btree (fingerprint);


--
-- Name: uniq_news_fingerprint; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uniq_news_fingerprint ON public.news USING btree (fingerprint);


--
-- Name: sources sources_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

