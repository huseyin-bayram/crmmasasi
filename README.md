This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

The application uses system fonts, without downloading fonts from an external provider.

## Veri gizliliği

Excel, Word, kampanya metni ve HTML işleme işlemleri tarayıcıda gerçekleştirilir. Bağlantı incelemesi URL’leri sunucuya göndermez ve hedef siteleri ziyaret etmez. İsteğe bağlı yerel Python scriptinin raporundan HTTP/erişilebilirlik sonuçları gösterilebilir. Eski bağlantı kontrol API yolları veri okumadan ve dış istek yapmadan `410 Gone` döndürür.

### Yerel Python ile ağ kontrolü

Link Checker içindeki “Yerel Ağ Kontrolü” bölümünden scripti ve yalnızca ayıklanmış URL’leri içeren `link-input.json` dosyasını indirin. URL listesini indirmek açık onay gerektirir; kampanya metni dosyaya eklenmez. Python 3.10+ yeterlidir, paket kurmak gerekmez. Dosyaların bulunduğu klasörde çalıştırın:

```bash
python3 check_links.py link-input.json --allow-network
```

Windows’ta `py` kullanılabilir. Script yalnızca hedeflere doğrudan GET isteği gönderir; en fazla 5 yönlendirme, yani başlangıç dahil 6 istek izler. Her isteğin yanıt başlıklarını inceler ve gövdeyi okumadan bağlantıyı kapatır. JavaScript/meta-refresh yönlendirmeleri izlenmez. HTTP ve farklı alan adına yönlendirme varsayılan olarak engellenir; gerekiyorsa `--allow-http` ve `--allow-cross-domain-redirects` ile ayrı ayrı açık izin verin. Yerel/özel/ayrılmış IP’ler, URL içindeki kullanıcı adı/parola ve standart dışı portlar engellenir. Her adımda DNS sonuçları kontrol edilir; bağlantı kontrol edilen IP’ye sabitlenir ve HTTPS sertifikası asıl alan adı için doğrulanır. Çerez, Referer, Authorization veya ortam proxy’si kullanılmaz. İsteklere 10 saniyelik soket zaman aşımı uygulanır; bu toplam çalışma süresi sınırı değildir ve sistem DNS çözümleme süresi işletim sistemine bağlıdır.

Sonuçlar yalnızca yerel `link-report.json` dosyasına yazılır; var olan dosyanın üzerine yazılmaz (`--output yeni-rapor.json` kullanın). Unix üzerinde dosya izinleri `0600` olarak oluşturulur; Windows erişim izinleri işletim sistemi ayarlarına bağlıdır. Raporu arayüzde seçmek sunucuya yükleme yapmaz. 301/302/303/307/308 zinciri, ilk/son HTTP durumu, 4xx/5xx hataları, DNS/TLS/zaman aşımı, döngü ve yönlendirme sınırı sonuçları tabloda gösterilir. Rapor boyutu/şeması, URL eşleşmesi ve 5 adımlık zincir sınırı kontrol edilir. İçe aktarılan rapor bağımsız doğrulanmış değildir; sonuçlar ölçüm anına aittir ve 2xx içerik güvenliği garantisi vermez.

Ağ kontrolünde sıfır ifşa garantisi mümkün değildir: hedef siteler URL’yi ve IP adresinizi, DNS sağlayıcınız alan adlarını görebilir. HTTP şifresizdir. URL yolunda/sorgusunda kişisel veri veya token olabilir; GET isteği izleme veya tek kullanımlık işlemi tetikleyebilir. Script ve rapor dosyalarını yalnızca güvenli yerel klasörde tutun, işiniz bitince silin; bulut senkronizasyonu ve yerel cihaz güvenliği uygulamanın kontrolünde değildir. Canlı hedeflere istek atmadan script testlerini `python3 -B -m unittest discover -s tests -p 'test_local_link_checker.py'` ile çalıştırabilirsiniz.

Önizlemeler için oluşturulan HTML ayrıca temizlenir. HTML e-posta önizlemesi betik, form, gezinme bağlantısı ve dış kaynak yüklemesini engelleyen yalıtılmış bir çerçevede gösterilir. Harici görseller ve izleme pikselleri önizlemede yüklenmez; gömülü raster görseller korunur. Bu kısıtlamalar indirilen veya kopyalanan kampanya çıktısındaki asıl bağlantıları ve görselleri değiştirmez. Çıktı başka bir sistemde açıldığında o sistemin davranışları geçerlidir.

Uygulama genelindeki Content Security Policy üçüncü taraf kaynak ve bağlantılarını kısıtlar. Aynı kaynaktan sayfa, JavaScript, stil ve yerel görsel indirme ile Next.js gezinme istekleri korunur; bu, tamamen çevrimdışı veya sunucusuz barındırma anlamına gelmez. Barındırma sağlayıcısının erişim kayıtları, kontrol panelinden eklenen kodlar ve tarayıcı eklentileri bu kaynak kodu denetiminin kapsamı dışındadır. Netlify derlemelerinde Next.js telemetrisi kapatılmıştır.

Gizlilik regresyon kontrolleri dahil testleri `npm test`, tür kontrolünü `npx tsc --noEmit --incremental false` komutlarıyla çalıştırabilirsiniz.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
