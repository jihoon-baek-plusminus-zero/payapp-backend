# PayApp 결제 서버

PayApp 결제 시스템을 위한 Node.js 백엔드 서버입니다. Railway에 배포하여 Framer 웹사이트와 연동할 수 있습니다.

## 🚀 기능

- PayApp 결제 요청 처리
- PayApp 피드백 수신 및 처리
- 결제 상태 확인 API
- PostgreSQL 데이터베이스 연동

## 📋 API 엔드포인트

### POST /api/payapp/request
결제 요청을 처리합니다.

**요청:**
```json
{
  "amount": 1000,
  "phone": "01012345678",
  "productName": "상품명"
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
  "status": "completed" // pending, completed, failed
}
```

### GET /health
서버 상태를 확인합니다.

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
4. PostgreSQL 서비스 추가

## 🔧 환경 변수

- `PAYAPP_USERID`: PayApp 판매자 아이디
- `PAYAPP_LINKKEY`: PayApp 연동 키
- `PAYAPP_LINKVAL`: PayApp 연동 값
- `PAYAPP_FEEDBACK_URL`: 피드백 URL
- `ALLOWED_ORIGINS`: 허용된 도메인 (쉼표로 구분)
- `DATABASE_URL`: PostgreSQL 연결 URL (Railway에서 자동 설정)

## 📊 데이터베이스 스키마

```sql
CREATE TABLE orders (
    id VARCHAR(255) PRIMARY KEY,
    amount INTEGER NOT NULL,
    phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔗 Framer 연동

Framer Override에서 다음과 같이 사용:

```javascript
const response = await fetch('https://your-app.railway.app/api/payapp/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 1000,
    phone: '01012345678',
    productName: '상품명'
  })
});
```

## 📝 라이선스

MIT License
