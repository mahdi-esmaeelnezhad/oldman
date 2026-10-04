# Family Care — Android Device Agent API (Complete)

سند کامل قرارداد API برای اپ **Kotlin / Device Owner** روی گوشی والد.

- این فایل را به Cursor پروژه اندروید بدهید.
- منبع حقیقت: بک‌اند Next.js همین ریپو.
- مخاطب: مهندس اندروید + Cursor Agent اندروید.
- زبان قراردادها: English keys / JSON (اجباری).

---

## 0) خلاصه برای همکار اندروید

دو اپ جدا داریم:

| اپ | پلتفرم | نقش |
|---|---|---|
| Caregiver Web/PWA | Next.js | داشبورد مراقب، ساخت Command |
| Parent Agent | Kotlin Android Device Owner | اجرای Command با API رسمی اندروید |

جریان درست:

```text
مراقب (PWA)
  → Next.js Command(PENDING)
  → Android Agent poll
  → Android API رسمی
  → Result به Next.js
  → نمایش در PWA
```

قوانین غیرقابل نقض:

1. هیچ Accessibility / Root / UI Automation / Hidden API.
2. اگر OS یا Policy اجازه نداد → `UNSUPPORTED`.
3. هویت دستگاه = `deviceIdentifier` تصادفی اپ (نه IMEI/MAC/Serial).
4. `deviceCredential` سکرت است؛ لاگ نکنید.
5. فقط APIهای این سند را صدا بزنید (APIهای caregiver با کوکی سشن برای اندروید نیست).

---

## 1) Base URL و ابزارها

| محیط | Base URL |
|---|---|
| Local Next.js | `http://localhost:3000` |
| Emulator → Host | `http://10.0.2.2:3000` |
| Device روی LAN | `http://<PC-LAN-IP>:3000` |

Swagger UI (اختیاری): `GET /swagger`  
OpenAPI JSON: `GET /api/openapi`

همه request/responseها: `Content-Type: application/json`  
تاریخ‌ها: ISO-8601 UTC مثل `2026-10-04T06:13:44.217Z`

---

## 2) فرمت خطا (همه APIها)

```json
{
  "error": {
    "code": "DEVICE_UNAUTHENTICATED",
    "message": "Device credentials are required."
  }
}
```

### کدهای مهم برای Agent

| code | HTTP | معنی |
|---|---:|---|
| `INVALID_JSON` | 400 | Body JSON نیست |
| `VALIDATION_ERROR` | 400 | Schema اشتباه |
| `ENROLLMENT_TOKEN_INVALID` | 400 | توکن QR نامعتبر/منقضی/مصرف‌شده |
| `DEVICE_IDENTIFIER_IN_USE` | 409 | `deviceIdentifier` تکراری |
| `DEVICE_UNAUTHENTICATED` | 401 | Bearer اشتباه/نیست |
| `COMMAND_NOT_FOUND` | 404 | فرمان برای این دستگاه نیست |
| `COMMAND_ALREADY_FINISHED` | 409 | فرمان تمام شده |
| `COMMAND_NOT_CANCELLABLE` | 409 | در حال EXECUTING قابل لغو نیست |
| `GEOFENCE_NOT_FOUND` | 404 | ژئوفنس نیست/غیرفعال |
| `INTERNAL_ERROR` | 500 | خطای داخلی |

---

## 3) احراز هویت دستگاه

### قبل از Enrollment
بدون هدر Authorization.

### بعد از Enrollment
برای همه `/api/device/*`:

```http
Authorization: Bearer <deviceCredential>
Content-Type: application/json
```

قوانین:

- `deviceCredential` فقط یک‌بار در پاسخ enrollment برمی‌گردد.
- طول credential باید ≥ 20 باشد.
- سرور فقط hash را نگه می‌دارد.
- هر درخواست معتبر، دستگاه را `ONLINE` و `lastSeenAt` را آپدیت می‌کند.

ذخیره‌سازی پیشنهادی اندروید:

- `EncryptedSharedPreferences` یا Android Keystore-backed storage
- هرگز در Logcat چاپ نکنید

---

## 4) Enrollment

### 4.1 محتوای QR

مراقب QR می‌سازد. محتوای QR این JSON است:

```json
{
  "v": 1,
  "token": "<one-time-enrollment-token>"
}
```

- `v` حتماً `1`
- `token` کوتاه‌عمر و یک‌بارمصرف (~10 دقیقه)

### 4.2 Redeem

`POST /api/enrollments/redeem`  
Auth: ندارد

#### Request

```json
{
  "token": "string (20..200)",
  "deviceIdentifier": "string (8..200) — UUID تصادفی اپ",
  "name": "string (1..80)",
  "platform": "ANDROID",
  "manufacturer": "Samsung",
  "model": "Galaxy A54",
  "androidVersion": "14",
  "androidSdk": 34,
  "appVersion": "1.0.0"
}
```

| فیلد | الزامی | توضیح |
|---|---|---|
| `token` | بله | از QR |
| `deviceIdentifier` | بله | UUID اپ؛ نه سخت‌افزاری |
| `name` | بله | نام نمایشی دستگاه |
| `platform` | بله | فقط `"ANDROID"` |
| `manufacturer` | خیر | |
| `model` | خیر | |
| `androidVersion` | خیر | |
| `androidSdk` | خیر | int مثبت |
| `appVersion` | خیر | نسخه agent |

#### Response `201`

```json
{
  "device": {
    "id": "41352e9a-eac9-4bb3-9115-0270b4f5efe0",
    "familyId": "73583b6d-ae8c-445a-88df-72c1641b4810",
    "name": "مادر",
    "platform": "ANDROID",
    "status": "PENDING",
    "deviceCredential": "<SECRET>"
  }
}
```

بعد از موفقیت:

1. `device.id` و `familyId` و `deviceCredential` را ذخیره کن.
2. polling فرمان را شروع کن.
3. در صورت نیاز location/geofence listeners را فعال کن.

#### cURL نمونه

```bash
curl -X POST "http://localhost:3000/api/enrollments/redeem" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"PASTE_TOKEN_FROM_QR\",
    \"deviceIdentifier\": \"c4e8a1b2-6d3f-4a9e-8b17-2f5c9d0e6a41\",
    \"name\": \"Parent Phone\",
    \"platform\": \"ANDROID\",
    \"manufacturer\": \"Samsung\",
    \"model\": \"Galaxy A54\",
    \"androidVersion\": \"14\",
    \"androidSdk\": 34,
    \"appVersion\": \"1.0.0\"
  }"
```

---

## 5) Lifecycle فرمان‌ها

```text
PENDING
  → SENT          (وقتی Android با GET pending می‌گیرد)
  → RECEIVED      (اختیاری، PATCH)
  → EXECUTING     (PATCH هنگام شروع اجرا)
  → SUCCESS | FAILED | UNSUPPORTED
```

وضعیت‌های پایانی دیگر (سمت سرور/مراقب):

- `EXPIRED`
- `CANCELLED`

### قواعد اجرا

1. `GET /pending` حداکثر 20 فرمان `PENDING` را برمی‌گرداند و همان لحظه آن‌ها را `SENT` می‌کند.
2. یک فرمان غیرidempotent را دوبار اجرا نکن.
3. اگر رسمی پشتیبانی نمی‌شود → `UNSUPPORTED`.
4. وقتی `EXECUTING` است، لغو از سمت مراقب رد می‌شود.
5. Offline-first: اگر دستگاه آفلاین باشد فرمان `PENDING` می‌ماند تا poll بعدی.

---

## 6) Device Agent Endpoints

### 6.1 Pull pending commands

`GET /api/device/commands/pending`

#### Headers

```http
Authorization: Bearer <deviceCredential>
```

#### Response `200`

```json
{
  "commands": [
    {
      "commandId": "4e2f03fc-c6dd-4454-ab3f-8c5b69d14d45",
      "id": "4e2f03fc-c6dd-4454-ab3f-8c5b69d14d45",
      "familyId": "73583b6d-ae8c-445a-88df-72c1641b4810",
      "deviceId": "41352e9a-eac9-4bb3-9115-0270b4f5efe0",
      "createdBy": "0f6ffc9b-df1d-4ce6-9eb5-14113f618922",
      "type": "CREATE_CONTACT",
      "payload": {
        "displayName": "دکتر",
        "phoneNumber": "+982122222222"
      },
      "status": "SENT",
      "resultData": null,
      "errorCode": null,
      "errorMessage": null,
      "createdAt": "2026-10-04T06:13:44.217Z",
      "expiresAt": "2026-10-05T06:13:44.215Z",
      "sentAt": "2026-10-04T06:14:00.000Z",
      "receivedAt": null,
      "startedAt": null,
      "completedAt": null
    }
  ]
}
```

نکته: `commandId` و `id` یکسان‌اند. لیست خالی معتبر است.

#### cURL

```bash
curl "http://localhost:3000/api/device/commands/pending" \
  -H "Authorization: Bearer <deviceCredential>"
```

پیشنهاد poll: هر 5 تا 15 ثانیه + بلافاصله بعد از reconnect.

---

### 6.2 Update progress

`PATCH /api/device/commands/{commandId}`

`commandId` = UUID

#### Request (فقط یکی از این دو)

```json
{ "status": "RECEIVED" }
```

```json
{ "status": "EXECUTING" }
```

#### Response `200`

```json
{
  "command": {
    "commandId": "4e2f03fc-c6dd-4454-ab3f-8c5b69d14d45",
    "id": "4e2f03fc-c6dd-4454-ab3f-8c5b69d14d45",
    "status": "EXECUTING",
    "receivedAt": "2026-10-04T06:14:05.000Z",
    "startedAt": "2026-10-04T06:14:06.000Z"
  }
}
```

(سایر فیلدهای CommandView هم برمی‌گردد.)

#### cURL

```bash
curl -X PATCH "http://localhost:3000/api/device/commands/<commandId>" \
  -H "Authorization: Bearer <deviceCredential>" \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"EXECUTING\"}"
```

---

### 6.3 Submit final result

`POST /api/device/commands/{commandId}`

#### SUCCESS

```json
{
  "status": "SUCCESS",
  "data": { },
  "error": null
}
```

`data` باید مطابق نوع فرمان باشد (بخش 7).

#### FAILED

```json
{
  "status": "FAILED",
  "data": null,
  "error": {
    "code": "CONTACTS_PERMISSION_DENIED",
    "message": "WRITE_CONTACTS permission missing."
  }
}
```

#### UNSUPPORTED

```json
{
  "status": "UNSUPPORTED",
  "data": null,
  "error": {
    "code": "SYSTEM_APP",
    "message": "Protected application."
  }
}
```

`error.code`: 1..80 کاراکتر  
`error.message`: 1..400 کاراکتر

#### Response `200`

```json
{
  "command": {
    "commandId": "4e2f03fc-c6dd-4454-ab3f-8c5b69d14d45",
    "status": "SUCCESS",
    "resultData": {},
    "errorCode": null,
    "errorMessage": null,
    "completedAt": "2026-10-04T06:14:20.000Z"
  }
}
```

#### cURL

```bash
curl -X POST "http://localhost:3000/api/device/commands/<commandId>" \
  -H "Authorization: Bearer <deviceCredential>" \
  -H "Content-Type: application/json" \
  -d "{
    \"status\": \"SUCCESS\",
    \"data\": { \"contactId\": \"contact-doctor\" },
    \"error\": null
  }"
```

---

### 6.4 Report last-known location

`POST /api/device/location`  
(نه continuous tracking)

#### Request

```json
{
  "latitude": 35.6892,
  "longitude": 51.3890,
  "recordedAt": "2026-10-04T06:20:00.000Z",
  "locationPermission": "GRANTED",
  "locationServiceEnabled": true
}
```

| فیلد | الزامی | محدودیت |
|---|---|---|
| `latitude` | بله | -90..90 |
| `longitude` | بله | -180..180 |
| `recordedAt` | خیر | ISO datetime |
| `locationPermission` | خیر | `UNKNOWN` \| `PROMPT` \| `GRANTED` \| `DENIED` |
| `locationServiceEnabled` | خیر | boolean |

#### Response `200`

```json
{ "ok": true }
```

---

### 6.5 Report geofence ENTER/EXIT

`POST /api/device/geofence-events`

فقط با **Android Geofencing API رسمی**.

#### Request

```json
{
  "geofenceId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "type": "ENTERED",
  "occurredAt": "2026-10-04T06:25:00.000Z"
}
```

`type`: `ENTERED` | `EXITED`  
`geofenceId`: UUID سرور (از payload فرمان)  
`occurredAt`: اختیاری

#### Response پذیرفته‌شده `201`

```json
{
  "accepted": true,
  "notificationId": "uuid"
}
```

#### Response dedupe `200` (~15 دقیقه)

```json
{
  "accepted": false,
  "notificationId": null
}
```

---

## 7) کاتالوگ کامل Commandها

برای هر `type`:

- **In** = `payload` داخل فرمان pending
- **Out** = `data` داخل نتیجه `SUCCESS`

اگر اجرا نشد:

- `FAILED` یا `UNSUPPORTED` با `error`

### 7.1 GET_DEVICE_INFO

**In**

```json
{}
```

**Out**

```json
{
  "manufacturer": "Samsung",
  "model": "Galaxy A54",
  "androidVersion": "14",
  "androidSdk": 34,
  "appVersion": "1.0.0"
}
```

فیلدهای string می‌توانند `null` باشند.

---

### 7.2 GET_BATTERY

**In**

```json
{}
```

**Out**

```json
{
  "levelPercent": 80,
  "charging": false
}
```

---

### 7.3 GET_STORAGE

**In**

```json
{}
```

**Out**

```json
{
  "totalBytes": 128000000000,
  "availableBytes": 42000000000
}
```

عدد خام byte (نه string).

---

### 7.4 CREATE_CONTACT

**In**

```json
{
  "displayName": "دکتر نمونه",
  "phoneNumber": "+982100000000"
}
```

**Out (الزامی)**

```json
{
  "contactId": "stable-id"
}
```

اگر Android id پایدار نداد، خودتان یک id پایدار بسازید و همان را نگه دارید.

---

### 7.5 UPDATE_CONTACT

**In**

```json
{
  "contactId": "stable-id",
  "displayName": "نام جدید",
  "phoneNumber": "+98912..."
}
```

`displayName` و `phoneNumber` اختیاری‌اند؛ `contactId` الزامی است.

**Out**

```json
{ "contactId": "stable-id" }
```

---

### 7.6 DELETE_CONTACT

**In**

```json
{ "contactId": "stable-id" }
```

**Out**

```json
{ "contactId": "stable-id" }
```

---

### 7.7 GET_INSTALLED_APPS

**In**

```json
{}
```

**Out**

```json
{
  "apps": [
    {
      "packageName": "org.telegram.messenger",
      "label": "Telegram"
    }
  ]
}
```

---

### 7.8 INSTALL_APP

**In**

```json
{ "packageName": "com.spotify.music" }
```

**Out**

```json
{ "packageName": "com.spotify.music" }
```

اگر silent install ممکن نیست → `UNSUPPORTED`.  
پرچم قرارداد: `silentInstall` (اغلب `false`).

---

### 7.9 UNINSTALL_APP

**In**

```json
{ "packageName": "com.example.app" }
```

**Out**

```json
{ "packageName": "com.example.app" }
```

برای system/protected app → ترجیحاً `UNSUPPORTED`.

---

### 7.10 ENABLE_APP

**In**

```json
{ "packageName": "com.example.app" }
```

**Out**

```json
{ "packageName": "com.example.app" }
```

---

### 7.11 DISABLE_APP

**In**

```json
{ "packageName": "com.example.app" }
```

**Out**

```json
{ "packageName": "com.example.app" }
```

---

### 7.12 GET_LOCATION

**In**

```json
{}
```

**Out**

```json
{
  "latitude": 35.6892,
  "longitude": 51.3890,
  "recordedAt": "2026-10-04T06:20:00.000Z"
}
```

علاوه بر نتیجه فرمان، برای داشبورد از `POST /api/device/location` هم استفاده کنید.

---

### 7.13 CREATE_GEOFENCE

**In**

```json
{
  "geofenceId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "name": "خانه",
  "latitude": 35.6892,
  "longitude": 51.3890,
  "radiusMeters": 200
}
```

`radiusMeters` سمت مراقب: 50..50000

**Out**

```json
{
  "geofenceId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
}
```

حتماً همان `geofenceId` سرور را به‌عنوان requestId ژئوفنس اندروید استفاده کنید و در eventها همان را بفرستید.

---

### 7.14 UPDATE_GEOFENCE

**In**

```json
{
  "geofenceId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "name": "خانه",
  "latitude": 35.69,
  "longitude": 51.39,
  "radiusMeters": 250,
  "enabled": true
}
```

به‌جز `geofenceId` بقیه اختیاری‌اند.

**Out**

```json
{ "geofenceId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }
```

---

### 7.15 DELETE_GEOFENCE

**In**

```json
{ "geofenceId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }
```

**Out**

```json
{ "geofenceId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }
```

---

### 7.16 GET_SETTINGS

**In**

```json
{}
```

**Out**

```json
{
  "settings": {
    "device_name": "مادر",
    "screen_timeout_seconds": 60,
    "developer_options": false,
    "wifi_enabled": true,
    "mobile_data_enabled": true,
    "brightness": 70,
    "auto_brightness": true,
    "font_scale": 1.15,
    "ring_volume": 6,
    "media_volume": 8,
    "do_not_disturb": false,
    "screen_lock_enabled": true,
    "install_unknown_apps": false,
    "auto_update_apps": true
  }
}
```

مقدار هر setting فقط: `string | number | boolean`  
کلیدهای پشتیبانی‌نشده را invent نکنید؛ حذف کنید.

#### کلیدهای شناخته‌شده بک‌اند

| key | type | writable |
|---|---|---|
| `device_name` | string | yes |
| `screen_timeout_seconds` | number | yes |
| `developer_options` | boolean | no |
| `wifi_enabled` | boolean | yes |
| `mobile_data_enabled` | boolean | yes |
| `airplane_mode` | boolean | no |
| `brightness` | number | yes |
| `auto_brightness` | boolean | yes |
| `font_scale` | number | yes |
| `ring_volume` | number | yes |
| `media_volume` | number | yes |
| `do_not_disturb` | boolean | yes |
| `screen_lock_enabled` | boolean | yes |
| `unknown_sources` | boolean | no |
| `install_unknown_apps` | boolean | yes |
| `auto_update_apps` | boolean | yes |

---

### 7.17 SET_SETTING

**In**

```json
{
  "key": "brightness",
  "value": 70
}
```

**Out**

```json
{ "key": "brightness" }
```

اگر رسمی قابل اعمال نیست → `UNSUPPORTED` یا `FAILED`.

---

## 8) DeviceCapability

اندروید باید فقط قابلیت‌های واقعی را true کند:

```json
{
  "GET_DEVICE_INFO": true,
  "GET_BATTERY": true,
  "GET_STORAGE": true,
  "CREATE_CONTACT": true,
  "UPDATE_CONTACT": true,
  "DELETE_CONTACT": true,
  "GET_INSTALLED_APPS": true,
  "INSTALL_APP": false,
  "UNINSTALL_APP": false,
  "ENABLE_APP": false,
  "DISABLE_APP": false,
  "GET_LOCATION": true,
  "CREATE_GEOFENCE": true,
  "UPDATE_GEOFENCE": true,
  "DELETE_GEOFENCE": true,
  "GET_SETTINGS": true,
  "SET_SETTING": false,
  "silentInstall": false
}
```

PWA فقط عملیات true را نشان می‌دهد.

---

## 9) مدل دادهٔ مفید برای Kotlin

```kotlin
data class EnrollmentQrPayload(
  val v: Int,          // must be 1
  val token: String,
)

data class RedeemRequest(
  val token: String,
  val deviceIdentifier: String,
  val name: String,
  val platform: String = "ANDROID",
  val manufacturer: String? = null,
  val model: String? = null,
  val androidVersion: String? = null,
  val androidSdk: Int? = null,
  val appVersion: String? = null,
)

data class CommandView(
  val commandId: String,
  val id: String,
  val familyId: String,
  val deviceId: String,
  val createdBy: String,
  val type: String,
  val payload: Map<String, Any?>,
  val status: String,
  val createdAt: String,
  val expiresAt: String,
)

data class ProgressBody(val status: String) // RECEIVED | EXECUTING

data class SuccessResult(
  val status: String = "SUCCESS",
  val data: Map<String, Any?>,
  val error: Nothing? = null,
)

data class ErrorResult(
  val status: String, // FAILED | UNSUPPORTED
  val data: Nothing? = null,
  val error: ApiError,
)

data class ApiError(
  val code: String,
  val message: String,
)
```

---

## 10) حلقهٔ پیشنهادی Agent

```text
onBoot / onEnrolled:
  startForegroundService(AgentLoop)

AgentLoop:
  loop forever:
    GET /api/device/commands/pending
    for each command:
      PATCH RECEIVED
      PATCH EXECUTING
      result = executeOfficialAndroidApi(type, payload)
      POST result
    sleep(pollInterval)

Geofencing callbacks:
  POST /api/device/geofence-events { geofenceId, ENTERED|EXITED, occurredAt }

Periodic / significant location:
  POST /api/device/location { lat, lng, permission, serviceEnabled }
```

---

## 11) سناریوی تست end-to-end

1. بک‌اند: `docker compose up -d` سپس `pnpm dev`
2. ورود مراقب:
   - email: `owner@example.com`
   - password: `demo-password`
3. ساخت Enrollment QR از UI خانواده
4. اندروید QR را redeem کند
5. از PWA یک مخاطب بساز (CREATE_CONTACT)
6. Agent pending را بگیرد → SENT
7. Agent نتیجه SUCCESS با `contactId` بدهد
8. مخاطب در PWA دیده شود
9. یک ژئوفنس بساز → CREATE_GEOFENCE با `geofenceId`
10. شبیه‌سازی ENTER → `/api/device/geofence-events`

برای تست لوکال fixture (فقط dev):

- device credential seed: `demo-device-credential-token-sprint3-verify`

---

## 12) جدول Endpointها (فقط Agent)

| Method | Path | Auth | کار |
|---|---|---|---|
| POST | `/api/enrollments/redeem` | ندارد | عضویت دستگاه |
| GET | `/api/device/commands/pending` | Bearer | گرفتن فرمان‌ها (PENDING→SENT) |
| PATCH | `/api/device/commands/{commandId}` | Bearer | RECEIVED / EXECUTING |
| POST | `/api/device/commands/{commandId}` | Bearer | نتیجه نهایی |
| POST | `/api/device/location` | Bearer | آخرین موقعیت |
| POST | `/api/device/geofence-events` | Bearer | ENTERED / EXITED |

---

## 13) چک‌لیست امنیتی

- [ ] بدون Root
- [ ] بدون Accessibility automation
- [ ] بدون UI automation
- [ ] بدون Hidden/Private API
- [ ] بدون لاگ token/credential
- [ ] `deviceIdentifier` تصادفی اپ
- [ ] credential رمزنگاری‌شده
- [ ] capability واقعی
- [ ] `UNSUPPORTED` به‌جای فیک‌کردن موفقیت
- [ ] TLS در production

---

## 14) پرامپت آماده برای Cursor اندروید

این را در پروژه Kotlin به Cursor بدهید:

```text
You are implementing the Family Care Android Device Owner / DPC agent.

Read ANDROID_AGENT_API.md as the only API contract source of truth.

Implement exactly:
1) QR scan → EnrollmentQrPayload(v=1, token)
2) POST /api/enrollments/redeem with platform=ANDROID
3) Securely store deviceCredential, deviceId, familyId, deviceIdentifier
4) Poll GET /api/device/commands/pending with Authorization: Bearer <deviceCredential>
5) For each command: PATCH RECEIVED, PATCH EXECUTING, execute via official Android APIs, POST SUCCESS/FAILED/UNSUPPORTED
6) Match every command payload/result schema from section 7
7) POST /api/device/location for last-known location
8) POST /api/device/geofence-events for ENTERED/EXITED using official Geofencing API and server geofenceId
9) No Accessibility, root, UI automation, or undocumented APIs
10) If unsupported by OS/policy, return UNSUPPORTED

Do not invent endpoints or fields. Follow ANDROID_AGENT_API.md exactly.
```

---

## 15) فایل‌های مرتبط در بک‌اند (برای ارجاع)

- `src/types/contracts/command.ts`
- `src/types/contracts/command-result.ts`
- `src/types/contracts/command-status.ts`
- `src/types/contracts/device-capability.ts`
- `src/types/contracts/enrollment.ts`
- `src/app/api/enrollments/redeem/route.ts`
- `src/app/api/device/commands/pending/route.ts`
- `src/app/api/device/commands/[commandId]/route.ts`
- `src/app/api/device/location/route.ts`
- `src/app/api/device/geofence-events/route.ts`
- `src/features/enrollment/schemas.ts`
- `src/features/apps/schemas.ts`
- `src/features/geofencing/schemas.ts`
- `src/config/device-settings.ts`

---

*End of Android Agent API handbook.*
