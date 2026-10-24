# Firebase güvenlik kurulumu

Bu dosya, uygulamanın şifre kontrolünü tarayıcıdan Firebase Authentication'a taşıyan kurulumu anlatır.
Şifreler bu depoya ve koda yazılmaz. Yalnızca Firebase konsolunda tutulur.

Sıra önemlidir. Kuralları en son uygulayın, aksi halde yayındaki site çalışmaz.

## 1. Giriş yöntemini aç (konsol)

Firebase konsolu > proje `soru-takip-uygulamasi` > **Authentication** > **Sign-in method** > **E-posta/Parola** > Etkinleştir.
"E-posta bağlantısı (şifresiz giriş)" kapalı kalsın.

## 2. Dört hesap oluştur (konsol)

Authentication > **Users** > **Add user**. E-posta adresleri uygulamanın içinde sabittir, birebir şöyle yazılmalıdır:

| Hesap | E-posta | Yetki |
|---|---|---|
| Ömer Doruk | `omer@lgs.local` | Kendi verisini okur ve yazar |
| Zeynep Alya | `zeynep@lgs.local` | Kendi verisini okur ve yazar |
| Yönetici (Arif) | `saldanli@istanbul.edu.tr` | Her ikisini okur ve yazar, yedek ve Excel yükleme |
| Öğretmen | `teacher@lgs.local` | Her ikisini yalnızca okur |

Öğrenci ve öğretmen adresleri (`...@lgs.local`) gerçek posta kutusu değildir, bilerek takma adreslerdir. Çocukların gerçek e-postaları herkese açık kodda yer almaz.
Yönetici adresi gerçektir. Bu hesapla "şifremi unuttum" e-postası alınabilir.

Şifre en az 6 karakter olmalıdır. Eski şifreler herkese açık depoda göründüğü için **yenilerini** belirleyin.
Yönetici hesabı için 8 karakter veya daha uzun bir şifre önerilir (bu hesap tüm veriyi değiştirebilir).
Şifreleri bu depoya veya bir dosyaya yazmayın.

## 3. Siteyi yayınla (kod)

Yeni sürüm `main`'e push edilir. Kurallar henüz eski olduğu için site bu aşamada da çalışır.
Yayından sonra dört hesapla da giriş yapıp kontrol edin:

- Ömer ve Zeynep: günlük ekran açılıyor, veri girilebiliyor, hedef kaydedilebiliyor.
- Öğretmen: öğrenci seçim penceresi geliyor, veriler görünüyor, veri girişi kapalı.
- Yönetici: karşılaştırma sekmeleri geliyor. Giriş ekranındaki "Tüm Verileri Yedekle" çalışıyor.
- `?izle` bağlantısı: şifre olarak öğretmen şifresi istenir.

## Öğretmen için gizli bağlantı

Öğretmenin şifre yazmaması için şifresi bir bağlantıya konabilir:

`https://asaldanli.github.io/LGS/?o=ÖĞRETMEN_ŞİFRESİ`

- Bağlantı açılınca uygulama şifreyi adres çubuğundan siler, öğretmen hesabıyla otomatik giriş yapar ve öğrenci seçimini açar.
- Öğretmen yer imine veya ana ekrana ekleyebilir. Öğretmen modunda "Değiştir" öğrenci seçimine döner, şifre sormaz.
- Şifrede harf ve rakam dışında karakter varsa adrese eklerken kodlanmalıdır (örneğin `&` yerine `%26`). Harf ve rakamdan oluşan bir şifre bunu gerektirmez.
- Bağlantı yalnızca öğretmene gönderilmeli, herkese açık bir yere yazılmamalıdır. Sızarsa konsolda `teacher@lgs.local` şifresi değiştirilir, eski bağlantı geçersiz olur.
- Bağlantısız girişte öğretmen şifresiyle de girilebilir.

## 4. Kuralları uygula (konsol)

Realtime Database > **Rules**. Önce mevcut kuralları bir yere kopyalayın (geri dönüş için).
`database.rules.json` dosyasının içeriğini yapıştırıp **Publish** edin.

Not: Aynı veritabanındaki kullanılmayan `yds-vocabulary` uygulamasının verisi yedeklenip kuraldan çıkarıldı.
Kuralda yer almayan hiçbir yola istemci erişemez. Bu uygulama yeniden kullanılacaksa kendi kuralları eklenmelidir.

Rules Playground ile (Simulate) kontrol edin:

| Deneme | Beklenen |
|---|---|
| Giriş yok, `records/omer` oku | Reddedilir |
| `omer@lgs.local` ile `records/omer` yaz | İzin verilir |
| `omer@lgs.local` ile `records/zeynep` oku | Reddedilir |
| `teacher@lgs.local` ile `records/zeynep` oku | İzin verilir |
| `teacher@lgs.local` ile `records/zeynep` yaz | Reddedilir |
| `saldanli@istanbul.edu.tr` ile `records/omer` yaz | İzin verilir |

## 5. Kuralları uyguladıktan sonra

- Giriş yapmadan veri okunamamalı: tarayıcıda `https://soru-takip-uygulamasi-default-rtdb.firebaseio.com/records/omer.json` açıldığında `Permission denied` görülmeli.
- Dört hesapla uygulamayı tekrar deneyin (3. adımdaki liste).

## Kural güncellemeleri

Yeni özellikler yeni veri yolları ekler. Kurallar eskiyse ilgili özellik "izin yok" hatası verir, diğer ekranlar etkilenmez.

- **Genel Deneme ders bazlı sonuç (`denemeler/<öğrenci>`):** `database.rules.json` içindeki `denemeler` bölümü gerekir.
  Konsolda Rules sekmesine dosyanın güncel halini yapıştırıp Publish edin. İstatistik sayfasındaki "Deneme Sonuçları"
  kartında "okunamadı" yazıyorsa kurallar henüz güncellenmemiştir.

- **Denemede özel soru sayısı (`denemeler/<öğrenci>/<id>/q`):** LGS'den farklı uzunlukta denemeler (örneğin 75 soru) için
  ders soru sayıları kayda `q` olarak yazılır. `database.rules.json` içindeki güncel `q` alanını ve yükseltilmiş doğru/yanlış
  sınırını (60) konsolda yayınlayın. Yayınlanmazsa yalnızca özel soru sayılı denemeler "izin yok" hatası verir; LGS düzenindeki
  (90 soru) denemeler eskisi gibi kaydedilir.

## Geri dönüş

Sorun çıkarsa Rules sekmesine eski kuralları geri yapıştırıp Publish edin. Site koduna dokunmak gerekmez.
Kod tarafında eski sürüme dönmek için `yedek-20261017` etiketi kullanılır, ancak o sürüm şifreleri kodda taşır.

## Bilinenler

- `records/<tarih>` ve `goals/<ay>` altındaki eski, öğrencisiz kayıtlar (Ocak-Mart 2026 tarihli kopyalar) yeni kurallarla uygulamadan erişilemez. Silinmedi, yalnızca konsoldan görünür.
- Profil resimleri giriş yapılana kadar giriş ekranında görünmez (okuma artık girişe bağlı).
- Hesap şifresi unutulursa Firebase konsolundan Users bölümünde değiştirilir.
- İleride API anahtarını yalnızca `https://asaldanli.github.io/*` adresine sınırlamak (Google Cloud Console > API anahtarı > HTTP yönlendirici) ek bir önlemdir. Yerel testi engeller.
