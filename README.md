🏙️ ****UrbanFeed - Yerel Basın İzleme Sistemi****

UrbanFeed, yerel haber sitelerinden gelen verileri otomatik olarak toplayan, yapay zekâ (LLM) ile anlamlandıran ve merkezi bir yönetim panelinden sunan uçtan uca bir otomasyon projesidir. Bu sistem, dağınık yerel haber akışlarını tek bir noktada toplayarak "istek, şikayet, soru ve öneri" odaklı bir analiz sunar. 





🚀 **Öne Çıkan Özellikler**

Otomatik Haber Toplama: RSS akışları üzerinden şehir ve kaynak bazlı düzenli veri çekimi. 



AI Destekli İşleme: OpenAI API kullanılarak haberlerin "bir vatandaş yazmış gibi" tweet tarzı kısa metinlere dönüştürülmesi. 





Akıllı Sınıflandırma: Her haberin otomatik olarak İstek, Şikayet, Soru veya Öneri kategorilerinden birine atanması ve hashtag üretimi. 



Tekilleştirme: Aynı haberin farklı kaynaklarda tekrar etmesini önleyen Kanonik URL ve Fingerprint (parmak izi) doğrulama sistemi. 




Yönetim Paneli: Filtreleme (şehir, kategori, tarih, etiket), kaynak yönetimi ve güvenli giriş (Login) özelliklerine sahip arayüz. 





Dayanıklı Mimari: Rate limit ve bağlantı hatalarına karşı n8n üzerinde kurgulanmış "retry" (yeniden deneme) mekanizmaları. 


🛠️ **Teknoloji Yığını**

Backend: Node.js, Express.js 



Frontend: HTML5, JavaScript 


Veritabanı: PostgreSQL 



Otomasyon: n8n (Webhook & Hourly Fetch akışları) 




AI: OpenAI GPT (Chat Completions) 



Ortam: Replit 


🏗️ **Sistem Mimarisi**
Sistem üç ana katmandan oluşmaktadır: 



n8n Katmanı: Verileri çeker, LLM ile işler ve API üzerinden veritabanına gönderir. 



API Katmanı: Node.js ile yazılmış, x-api-key korumalı, veritabanı işlemlerini yöneten uç noktalar. 




UI Katmanı: Kullanıcının verileri filtreleyip yönetebildiği modern web arayüzü. 


🔧 **Kurulum ve Çalıştırma**

Veritabanı: schema.sql dosyasını PostgreSQL üzerinde çalıştırarak tabloları oluşturun. 



Bağımlılıklar: npm install komutu ile gerekli Node.js paketlerini yükleyin. 



Ortam Değişkenleri: .env dosyasını oluşturun ve PORT, DATABASE_URL ve API_KEY bilgilerini tanımlayın. 


n8n: automation/n8n altındaki JSON dosyalarını n8n arayüzüne "Import" ederek iş akışlarını aktif edin.
