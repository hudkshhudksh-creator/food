# Өдрийн хоол

Байгууллагын өдрийн хоол захиалгын систем. Ажилтан өнөөдрийн хоолыг захиална, тогооч цэс болон захиалгыг удирдана.

## Ажиллуулах

```bash
npm install
npm run dev
```

Хөтөч дээр [http://localhost:3000](http://localhost:3000) нээнэ.

Supabase тохируулаагүй үед апп `data/store.json` файлд өгөгдлөө хадгална. Анхны ачаалалт дээр демо хоол, салбар, захиалга үүснэ.

### Туршилтын нэвтрэлт

| Үүрэг | Имэйл | Нууц үг |
| --- | --- | --- |
| Тогооч | admin@company.mn | Admin123! |
| Ажилтан | employee@company.mn | Employee123! |

Демо өгөгдлийг шинэчлэхийн тулд `data/store.json` файлыг устгаад серверийг дахин асаана.

## Орчны хувьсагч

`.env.example` файлыг `.env.local` болгон хуулна.

| Хувьсагч | Хаана | Тайлбар |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | нийтийн | Supabase төслийн URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | нийтийн | Supabase anon түлхүүр. Service role биш. |
| `SESSION_SECRET` | зөвхөн сервер | Локал нэвтрэлтийн нууц. Хамгийн багадаа 16 тэмдэгт. |
| `DEMO_MODE` | сервер | `true` бол production дээр туршилтын бүртгэлийг харуулна. |
| `SUPABASE_SERVICE_ROLE_KEY` | зөвхөн сервер | Апп үүнийг ашиглахгүй. Хөтөч рүү бүү оруул. |

## Supabase

1. Шинэ Supabase төсөл үүсгэнэ.
2. SQL Editor дээр `supabase/migrations/001_init.sql` файлыг ажиллуулна.
3. Authentication → Users дээр тогоочийн хэрэглэгч үүсгэж, User Metadata дээр `{"role":"admin"}` өгнө. Trigger нь `profiles` мөр үүсгэнэ.
4. `.env.local` дээр URL болон anon key-г бөглөнө.
5. Storage bucket `meal-images` миграци үүсгэнэ. Хоолны зураг тэнд хадгалагдана.

Захиалга үүсгэх болон үлдэгдэл хасах үйлдэл `place_order` функц дотор түгжигдэнэ. Статус солих үед цуцлагдсан захиалгын порц буцаж нэмэгдэнэ.
