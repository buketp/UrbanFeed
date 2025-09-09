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

ALTER TABLE IF EXISTS ONLY public.sources DROP CONSTRAINT IF EXISTS sources_city_id_fkey;
DROP INDEX IF EXISTS public.uniq_news_fingerprint;
DROP INDEX IF EXISTS public.news_fingerprint_key;
DROP INDEX IF EXISTS public.idx_sources_city;
DROP INDEX IF EXISTS public.idx_news_time;
DROP INDEX IF EXISTS public.idx_news_tags;
DROP INDEX IF EXISTS public.idx_news_published;
DROP INDEX IF EXISTS public.idx_news_province;
DROP INDEX IF EXISTS public.idx_news_category;
ALTER TABLE IF EXISTS ONLY public.sources DROP CONSTRAINT IF EXISTS sources_rss_url_key;
ALTER TABLE IF EXISTS ONLY public.sources DROP CONSTRAINT IF EXISTS sources_pkey;
ALTER TABLE IF EXISTS ONLY public.news DROP CONSTRAINT IF EXISTS news_pkey;
ALTER TABLE IF EXISTS ONLY public.cities DROP CONSTRAINT IF EXISTS cities_pkey;
ALTER TABLE IF EXISTS ONLY public.cities DROP CONSTRAINT IF EXISTS cities_name_key;
ALTER TABLE IF EXISTS ONLY public.cities DROP CONSTRAINT IF EXISTS cities_code_key;
ALTER TABLE IF EXISTS public.cities ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.sources;
DROP TABLE IF EXISTS public.news;
DROP SEQUENCE IF EXISTS public.cities_id_seq;
DROP TABLE IF EXISTS public.cities;
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
1	Adana	1	t	2025-09-09 06:09:15.67565+00
2	Adıyaman	2	t	2025-09-09 06:09:15.676367+00
3	Afyonkarahisar	3	t	2025-09-09 06:09:15.677842+00
4	Ağrı	4	t	2025-09-09 06:09:15.678239+00
5	Amasya	5	t	2025-09-09 06:09:15.678642+00
6	Ankara	6	t	2025-09-09 06:09:15.679232+00
7	Antalya	7	t	2025-09-09 06:09:15.679715+00
8	Artvin	8	t	2025-09-09 06:09:15.680176+00
9	Aydın	9	t	2025-09-09 06:09:15.680486+00
10	Balıkesir	10	t	2025-09-09 06:09:15.680765+00
11	Bilecik	11	t	2025-09-09 06:09:15.681111+00
12	Bingöl	12	t	2025-09-09 06:09:15.681337+00
13	Bitlis	13	t	2025-09-09 06:09:15.68155+00
14	Bolu	14	t	2025-09-09 06:09:15.681787+00
15	Burdur	15	t	2025-09-09 06:09:15.682028+00
16	Bursa	16	t	2025-09-09 06:09:15.682274+00
17	Çanakkale	17	t	2025-09-09 06:09:15.682482+00
18	Çankırı	18	t	2025-09-09 06:09:15.682699+00
19	Çorum	19	t	2025-09-09 06:09:15.682934+00
20	Denizli	20	t	2025-09-09 06:09:15.683164+00
21	Diyarbakır	21	t	2025-09-09 06:09:15.683354+00
22	Edirne	22	t	2025-09-09 06:09:15.683549+00
23	Elazığ	23	t	2025-09-09 06:09:15.683758+00
24	Erzincan	24	t	2025-09-09 06:09:15.684666+00
25	Erzurum	25	t	2025-09-09 06:09:15.685055+00
26	Eskişehir	26	t	2025-09-09 06:09:15.685367+00
27	Gaziantep	27	t	2025-09-09 06:09:15.685649+00
28	Giresun	28	t	2025-09-09 06:09:15.685971+00
29	Gümüşhane	29	t	2025-09-09 06:09:15.686255+00
30	Hakkari	30	t	2025-09-09 06:09:15.686522+00
31	Hatay	31	t	2025-09-09 06:09:15.686779+00
32	Isparta	32	t	2025-09-09 06:09:15.687052+00
33	Mersin	33	t	2025-09-09 06:09:15.687306+00
34	İstanbul	34	t	2025-09-09 06:09:15.687555+00
35	İzmir	35	t	2025-09-09 06:09:15.687829+00
36	Kars	36	t	2025-09-09 06:09:15.688088+00
37	Kastamonu	37	t	2025-09-09 06:09:15.68837+00
38	Kayseri	38	t	2025-09-09 06:09:15.688628+00
39	Kırklareli	39	t	2025-09-09 06:09:15.688877+00
40	Kırşehir	40	t	2025-09-09 06:09:15.689184+00
41	Kocaeli	41	t	2025-09-09 06:09:15.68942+00
42	Konya	42	t	2025-09-09 06:09:15.689659+00
43	Kütahya	43	t	2025-09-09 06:09:15.689877+00
44	Malatya	44	t	2025-09-09 06:09:15.690183+00
45	Manisa	45	t	2025-09-09 06:09:15.690393+00
46	Kahramanmaraş	46	t	2025-09-09 06:09:15.690635+00
47	Mardin	47	t	2025-09-09 06:09:15.690843+00
48	Muğla	48	t	2025-09-09 06:09:15.691079+00
49	Muş	49	t	2025-09-09 06:09:15.691277+00
50	Nevşehir	50	t	2025-09-09 06:09:15.69147+00
51	Niğde	51	t	2025-09-09 06:09:15.691695+00
52	Ordu	52	t	2025-09-09 06:09:15.691918+00
53	Rize	53	t	2025-09-09 06:09:15.692128+00
54	Sakarya	54	t	2025-09-09 06:09:15.692342+00
55	Samsun	55	t	2025-09-09 06:09:15.692566+00
56	Siirt	56	t	2025-09-09 06:09:15.692808+00
57	Sinop	57	t	2025-09-09 06:09:15.693071+00
58	Sivas	58	t	2025-09-09 06:09:15.693284+00
59	Tekirdağ	59	t	2025-09-09 06:09:15.693481+00
60	Tokat	60	t	2025-09-09 06:09:15.693677+00
61	Trabzon	61	t	2025-09-09 06:09:15.693922+00
62	Tunceli	62	t	2025-09-09 06:09:15.694153+00
63	Şanlıurfa	63	t	2025-09-09 06:09:15.694349+00
64	Uşak	64	t	2025-09-09 06:09:15.694572+00
65	Van	65	t	2025-09-09 06:09:15.694784+00
66	Yozgat	66	t	2025-09-09 06:09:15.695058+00
67	Zonguldak	67	t	2025-09-09 06:09:15.695274+00
68	Aksaray	68	t	2025-09-09 06:09:15.695488+00
69	Bayburt	69	t	2025-09-09 06:09:15.695699+00
70	Karaman	70	t	2025-09-09 06:09:15.695952+00
71	Kırıkkale	71	t	2025-09-09 06:09:15.696161+00
72	Batman	72	t	2025-09-09 06:09:15.696368+00
73	Şırnak	73	t	2025-09-09 06:09:15.696584+00
74	Bartın	74	t	2025-09-09 06:09:15.696818+00
75	Ardahan	75	t	2025-09-09 06:09:15.697075+00
76	Iğdır	76	t	2025-09-09 06:09:15.697279+00
77	Yalova	77	t	2025-09-09 06:09:15.697494+00
78	Karabük	78	t	2025-09-09 06:09:15.697691+00
79	Kilis	79	t	2025-09-09 06:09:15.697903+00
80	Osmaniye	80	t	2025-09-09 06:09:15.698121+00
81	Düzce	81	t	2025-09-09 06:09:15.698322+00
\.


--
-- Data for Name: news; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.news (id, source, province, title, url, category, tags, summary, published_at, tweet_text, created_at, fingerprint) FROM stdin;
mfc5jci0zqrnvoy4bs	rss	Sivas	Sivas İl Tarım Orman Müdürlüğü’ne Önemli Ziyaretler Gerçekleşti	https://gundemsivas.com/sivas-il-tarim-orman-mudurlugune-onemli-ziyaretler-gerceklesti-2	öneri	{tarim,orman,sivas}	Sivas İl Tarım Orman Müdürlüğü’ne Ziyaretler Sivas İl Tarım Orman Müdürlüğü, önemli isimlerin ziyaretlerine ev sahipliği yaptı. Sivas İl Tarım Orman Müdürü Salih İnan, makamında çeşitli ziyaretçileri ağırladı. Ziyaretçiler Kimlerdi? Sivas İl Göç İdaresi Müdürü Hamza Demir, Gemerek Belediye Başkanı Sezai Çelikten ve Palanga A Ş Yöneticisi Yılmaz Doğan, İl Tarım Orman Müdürü Salih İnan’ı …	2025-09-08 22:30:45+00	Sivas İl Tarım Orman Müdürlüğü’nde önemli ziyaretler gerçekleşmiş. Yetkililerin bir arada olması tarım ve orman için güzel gelişmelerin habercisi olabilir. Takipteyiz.	2025-09-09 06:10:40.009297+00	22846af0fb3c089529d3ec8feb641423
mfc5kstvqgn4o3vd8r	rss	Sivas	Maç Kaybet, İtibarını Değil!	https://sivasolay.com/mac-kaybet-itibarini-degil	şikayet	{futbol,sivasspor,performans}	“Ben şampiyonluk adayı değilim” dese de rakiplerinin “Doğal şampiyon adayı” gördüğü Sivasspor, geride kalan 4 maçta ne yazık ki ,bu itibarına ve büyüklüğüne yakışmayan sonuçlar aldı. Sadece kötü sonuç mu? Hayır ,ortaya koyduğu futbolda ne adına ne de şanına yakıştı! Zaten asıl insanı üzende oynadığı futbol! Yani Sivasspor geride kalan 4 maçta oynadığı oyunla bize […]	2025-09-07 15:19:48+00	Sivasspor'dan beklenti büyük ama son 4 maçta hem sonuçlar hem oyun çok kötü. Böyle performans itibarımıza yakışmıyor, umarım toparlanırız.	2025-09-09 06:11:47.827716+00	9816814a9007bf93df87bc180bb26732
mfc5j8kpkfjrwhmk80m	rss	Sivas	Sivas’ta 114 bin öğrenci için ders zili çaldı	https://www.haber58.com.tr/sivasta-114-bin-ogrenci-icin-ders-zili-caldi	öneri	{ogrenci,sivas,egitim,ogrenim,okullar}	Sivas’ta 2025-2026 eğitim öğretim yılı başladı, kentte 114 bin öğrenci ders başı yaptı. Sivas’ta 114 bin öğrenci için ders zili çaldı Tüm yurtta olduğu gibi Sivas’ta da yeni eğitim öğretim yılının ilk ders zili çaldı. Öğrenciler, yaz tatilinin sona ermesinin ardından yeniden okullarına ve arkadaşlarına kavuşmanın heyecanını yaşadı. Kentte 114 bin öğrenci ve 10 bin […] The post Sivas’ta 114 bin öğrenci için ders zili çaldı appeared first on Sivas Haber 58.	2025-09-08 11:14:24+00	Sivas'ta 114 bin öğrenci yepyeni bir eğitim-öğretim yılına başladı. Yaz tatili bitti, okullar açıldı, umutlar ve heyecanlar yeniden başladı. Başarılar dilerim tüm öğrencilere!	2025-09-09 06:10:34.922549+00	e5819f6ef1bd3e56b69d9e465a0b5003
\.


--
-- Data for Name: sources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sources (id, city_id, name, rss_url, website_url, is_active, created_at) FROM stdin;
85da3115-0ae6-4426-bda4-96f667bf3a32	58	Gündem Sivas	https://gundemsivas.com/feed/	https://gundemsivas.com/	t	2025-09-09 06:10:32.219484+00
80106469-418f-4d33-a89f-df53b4c22914	58	Sivas Olay	https://sivasolay.com/feed/	https://sivasolay.com/	t	2025-09-09 06:11:39.793119+00
fd904bdf-9617-469c-a238-3a480268b602	58	Haber 58	https://www.haber58.com.tr/feed/	https://www.haber58.com.tr/	t	2025-09-09 06:10:24.005611+00
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

