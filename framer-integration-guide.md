# Framer PayApp 연동 가이드

## 🚀 완성된 시스템 구성

### 1. Railway 서버 (백엔드)
- **URL**: `https://payapp-backend-production.up.railway.app`
- **기능**: PayApp API 연동, 결제 처리, 피드백 수신

### 2. Framer Code Component (프론트엔드)
- **파일**: `payapp_codecomponent.tsx`
- **기능**: 결제 UI, Railway 서버 연동

## 📋 Framer에서 사용 방법

### 1. Code Component 추가
1. Framer에서 **Code Component** 생성
2. `payapp_codecomponent.tsx` 파일 내용을 복사해서 붙여넣기
3. 컴포넌트 이름을 `PayAppCodeComponent`로 설정

### 2. 컴포넌트 설정
Framer에서 컴포넌트를 선택하면 우측 패널에서 다음 설정이 가능합니다:

#### 기본 설정
- **서버 URL**: `https://payapp-backend-production.up.railway.app`
- **결제 금액**: 결제할 금액 (예: 1000)
- **휴대폰번호**: 결제자 번호 (예: 01012345678)
- **상품명**: 결제할 상품명

#### 디자인 설정
- **버튼 색상**: 결제 버튼 배경색
- **버튼 글자색**: 결제 버튼 글자색
- **배경색**: 컴포넌트 배경색
- **글자색**: 텍스트 색상
- **모서리 둥글기**: 컴포넌트 모서리 둥글기

#### 고급 설정
- **자동 상태 확인**: 결제 후 자동으로 상태 확인 여부
- **디버그 정보 표시**: 개발용 정보 표시 여부

## 🔧 Railway 환경 변수 설정

Railway 대시보드에서 다음 환경 변수들을 설정해주세요:

```
PAYAPP_USERID=plusminuszero
PAYAPP_LINKKEY=7w/7M+M9rix9hr/Ohk23+O1DPJnCCRVaOgT+oqg6zaM=
PAYAPP_LINKVAL=7w/7M+M9rix9hr/Ohk23+PdC7QxGGa4QAbfQ6FxS/xI=
ALLOWED_ORIGINS=https://plusminus-zero.studio
NODE_ENV=production
```

## 📱 결제 플로우

1. **사용자가 결제 버튼 클릭**
2. **Framer → Railway 서버로 결제 요청**
3. **Railway 서버 → PayApp API로 결제 요청**
4. **PayApp 결제창 열림**
5. **사용자가 결제 완료**
6. **PayApp → Railway 서버로 피드백**
7. **결제 완료 처리**

## 🛠️ API 엔드포인트

### 결제 요청
```
POST /api/payapp/request
```
**요청 데이터:**
```json
{
  "amount": 1000,
  "phone": "01012345678",
  "productName": "상품명",
  "memo": "메모 (선택)",
  "var1": "주문번호 (선택)",
  "var2": "사용자ID (선택)"
}
```

**응답:**
```json
{
  "success": true,
  "orderId": "ORDER_1234567890",
  "payUrl": "https://payapp.kr/결제URL",
  "mulNo": "12345678"
}
```

### 결제 피드백
```
POST /api/payapp/callback
```
PayApp에서 자동으로 호출하는 엔드포인트입니다.

### 결제 상태 확인
```
GET /api/payapp/status/:orderId
```

### 결제 취소
```
POST /api/payapp/cancel
```

## 🔍 테스트 방법

### 1. 서버 상태 확인
브라우저에서 `https://payapp-backend-production.up.railway.app/health` 접속

### 2. 결제 테스트
1. Framer에서 컴포넌트 설정
2. 휴대폰번호와 금액 입력
3. 결제 버튼 클릭
4. PayApp 결제창에서 테스트 결제 진행

## 📞 PayApp 고객사 정보

- **고객사 ID**: `plusminuszero`
- **연동 KEY**: `7w/7M+M9rix9hr/Ohk23+O1DPJnCCRVaOgT+oqg6zaM=`
- **연동 VALUE**: `7w/7M+M9rix9hr/Ohk23+PdC7QxGGa4QAbfQ6FxS/xI=`

## ⚠️ 주의사항

1. **보안**: 연동 KEY와 VALUE는 외부에 노출되지 않도록 주의
2. **HTTPS**: Railway는 자동으로 HTTPS를 제공
3. **CORS**: Framer 도메인이 허용된 도메인에 포함되어야 함
4. **피드백 URL**: Railway 서버가 PayApp에서 접근 가능해야 함

## 🚀 배포 완료!

이제 Framer에서 PayApp 결제 시스템을 사용할 수 있습니다!

1. Railway 서버가 자동으로 배포됨
2. PayApp API와 완전 연동됨
3. Framer Code Component 준비 완료
4. 모든 환경 변수 설정됨
