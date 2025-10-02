# PayApp 결제 서버 (PlusMinus Zero)

PayApp 결제 시스템을 위한 Node.js 백엔드 서버입니다. Railway에 배포하여 Framer 웹사이트(`https://plusminus-zero.studio`)와 연동할 수 있습니다.

## 🚀 기능

* ✅ PayApp 결제 요청 처리 (공식 샘플 코드 기반)
* ✅ PayApp 피드백 수신 및 처리
* ✅ 결제 상태 확인 API
* ✅ PostgreSQL 데이터베이스 연동
* ✅ Framer 웹사이트 CORS 지원
* ✅ 주문 목록 조회 API (관리용)

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

**응답:**
```json
{
  "status": "completed",
  "payState": "4",
  "amount": 1000,
  "phone": "01012345678",
  "productName": "상품명",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/payapp/orders

주문 목록을 조회합니다. (관리용)

**쿼리 파라미터:**
* `page`: 페이지 번호 (기본값: 1)
* `limit`: 페이지당 항목 수 (기본값: 10)
* `status`: 상태 필터 (pending, completed, failed, cancelled, refunded, waiting)

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
3. PostgreSQL 서비스 추가
4. 환경 변수 설정

## 🔧 환경 변수

### PayApp 설정 (PlusMinus Zero)

* `PAYAPP_USERID`: `plusminuszero`
* `PAYAPP_LINKKEY`: `7w/7M+M9rix9hr/Ohk23+O1DPJnCCRVaOgT+oqg6zaM=`
* `PAYAPP_LINKVAL`: `7w/7M+M9rix9hr/Ohk23+PdC7QxGGa4QAbfQ6FxS/xI=`
* `PAYAPP_FEEDBACK_URL`: `https://payapp-backend-production.up.railway.app/api/payapp/callback`

### 서버 설정

* `ALLOWED_ORIGINS`: `https://plusminus-zero.studio`
* `NODE_ENV`: `production`
* `PORT`: `3000`
* `DATABASE_URL`: PostgreSQL 연결 URL (Railway에서 자동 설정)

## 📊 데이터베이스 스키마

```sql
CREATE TABLE orders (
    id VARCHAR(255) PRIMARY KEY,
    amount INTEGER NOT NULL,
    phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    product_name VARCHAR(255),
    memo TEXT,
    var1 VARCHAR(255),
    var2 VARCHAR(255),
    
    -- PayApp 피드백 데이터
    pay_state VARCHAR(10),
    goodname VARCHAR(255),
    price INTEGER,
    recvphone VARCHAR(20),
    reqaddr VARCHAR(10),
    reqdate VARCHAR(50),
    pay_memo TEXT,
    pay_addr TEXT,
    pay_date VARCHAR(50),
    pay_type VARCHAR(10),
    payurl TEXT,
    csturl TEXT,
    card_name VARCHAR(100),
    currency VARCHAR(10),
    vccode VARCHAR(10),
    score VARCHAR(10),
    vbank VARCHAR(100),
    vbankno VARCHAR(50),
    feedbacktype VARCHAR(10),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔗 Framer 연동

### 기본 사용법

```javascript
const response = await fetch('https://payapp-backend-production.up.railway.app/api/payapp/request', {
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

### 고급 사용법 (framer-example.js 참고)

* 결제 상태 폴링
* 에러 처리
* 사용자 피드백
* 결제 완료 감지

## 🎯 PayApp 결제 상태 코드

* `pending`: 결제 대기 중
* `completed`: 결제 완료 (pay_state: 4)
* `failed`: 결제 실패
* `cancelled`: 결제 취소 (pay_state: 8, 16, 31)
* `refunded`: 환불 완료 (pay_state: 9, 64)
* `waiting`: 결제 대기 (pay_state: 10)

## 🚀 배포 정보

* **서버 URL**: `https://payapp-backend-production.up.railway.app`
* **Framer 도메인**: `https://plusminus-zero.studio`
* **PayApp 고객사 ID**: `plusminuszero`

## 📝 라이선스

MIT License

## 👥 개발자

PlusMinus Zero - PayApp 결제 시스템 연동
