# PayApp 결제 서버 (PlusMinus Zero)

PayApp 결제 시스템을 위한 Node.js 백엔드 서버입니다. Railway에 배포하여 Framer 웹사이트(`https://plusminus-zero.studio`)와 연동할 수 있습니다.

## 🚀 기능

* ✅ PayApp 결제 요청 처리
* ✅ PayApp 피드백 수신 및 처리
* ✅ 결제 상태 확인 API
* ✅ Framer 웹사이트 CORS 지원

## 📋 API 엔드포인트

### POST /api/payapp/request

결제 요청을 처리합니다.

**요청:**
```json
{
  "amount": 1000,
  "phone": "01012345678",
  "productName": "상품명",
  "memo": "메모 (선택)",
  "var1": "임의변수1 (선택)",
  "var2": "임의변수2 (선택)"
}
```

**응답:**
```json
{
  "success": true,
  "orderId": "주문번호",
  "payUrl": "PayApp 결제 URL"
}
```

### POST /api/payapp/callback

PayApp에서 결제 결과를 전송합니다. (내부용)

### GET /api/payapp/status/:orderId

결제 상태를 확인합니다.

### GET /health

서버 상태를 확인합니다.

### GET /

API 엔드포인트 목록을 확인합니다.

## 🛠️ 설치 및 실행

### 로컬 개발

```bash
npm install
npm run dev
```

### Railway 배포

1. GitHub에 코드 푸시
2. Railway에서 GitHub 저장소 연결
3. 환경 변수 설정

## 🔧 환경 변수

### PayApp 설정 (PlusMinus Zero)

* `PAYAPP_USERID`: `plusminuszero`
* `PAYAPP_LINKKEY`: `7w/7M+M9rix9hr/Ohk23+O1DPJnCCRVaOgT+oqg6zaM=`
* `PAYAPP_LINKVAL`: `7w/7M+M9rix9hr/Ohk23+PdC7QxGGa4QAbfQ6FxS/xI=`
* `PAYAPP_FEEDBACK_URL`: `https://your-railway-app.up.railway.app/api/payapp/callback`

### 서버 설정

* `ALLOWED_ORIGINS`: `https://plusminus-zero.studio`
* `NODE_ENV`: `production`
* `PORT`: `3000`

## 🔗 Framer 연동

### 기본 사용법

```javascript
const response = await fetch('https://your-railway-app.up.railway.app/api/payapp/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 1000,
    phone: '01012345678',
    productName: '상품명'
  })
});

const data = await response.json();
if (data.success) {
  window.open(data.payUrl, '_blank');
}
```

## 🚀 배포 정보

* **서버 URL**: `https://payapp-backend-production.up.railway.app`
* **Framer 도메인**: `https://plusminus-zero.studio`
* **PayApp 고객사 ID**: `plusminuszero`

## 📝 라이선스

MIT License

## 👥 개발자

PlusMinus Zero - PayApp 결제 시스템 연동
