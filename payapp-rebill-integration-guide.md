# PayApp 정기결제 연동 가이드

## 🔄 정기결제 시스템 구성

### 1. Railway 서버 (백엔드)
- **URL**: `https://payapp-backend-production.up.railway.app`
- **정기결제 API**: 완전 구현 완료

### 2. Framer 정기결제 Code Component (프론트엔드)
- **파일**: `payapp_rebill_codecomponent.tsx`
- **기능**: 정기결제 등록, 관리, 해지

## 📋 정기결제 API 엔드포인트

### 1. 정기결제 등록
```
POST /api/payapp/rebill/register
```
**요청 데이터:**
```json
{
  "goodname": "상품명",
  "goodprice": 10000,
  "recvphone": "01012345678",
  "recvemail": "user@example.com",
  "memo": "메모",
  "rebillCycleType": "Month",
  "rebillCycleMonth": "15",
  "rebillCycleWeek": "",
  "rebillExpire": "2025-12-31",
  "var1": "주문번호",
  "var2": "사용자ID",
  "openpaytype": "card,phone"
}
```

**응답:**
```json
{
  "success": true,
  "orderId": "REBILL_1234567890",
  "rebillNo": "12345678",
  "payUrl": "https://payapp.kr/정기결제승인URL"
}
```

### 2. 정기결제 해지
```
POST /api/payapp/rebill/cancel
```
**요청 데이터:**
```json
{
  "rebill_no": "12345678"
}
```

### 3. 정기결제 일시정지
```
POST /api/payapp/rebill/stop
```
**요청 데이터:**
```json
{
  "rebill_no": "12345678"
}
```

### 4. 정기결제 재시작
```
POST /api/payapp/rebill/start
```
**요청 데이터:**
```json
{
  "rebill_no": "12345678"
}
```

## 🎯 Framer에서 정기결제 사용 방법

### 1. Code Component 추가
1. Framer에서 **Code Component** 생성
2. `payapp_rebill_codecomponent.tsx` 파일 내용을 복사해서 붙여넣기
3. 컴포넌트 이름을 `PayAppRebillCodeComponent`로 설정

### 2. 정기결제 설정
Framer에서 컴포넌트를 선택하면 우측 패널에서 다음 설정이 가능합니다:

#### 기본 정보
- **서버 URL**: `https://payapp-backend-production.up.railway.app`
- **상품명**: 정기결제할 상품명
- **결제 금액**: 정기결제할 금액
- **휴대폰번호**: 결제자 번호
- **이메일**: 결제자 이메일 (선택사항)
- **메모**: 정기결제 메모 (선택사항)

#### 정기결제 설정
- **결제 주기**: 매월/매주/매일 선택
- **결제일/요일**: 
  - 매월: 1-31일 중 선택
  - 매주: 1-7 (월요일-일요일)
  - 매일: 무시됨
- **만료일**: 정기결제 만료일 (YYYY-MM-DD)
- **결제수단**: card(신용카드), phone(휴대폰) 또는 비워두면 전체

#### 디자인 설정
- **버튼 색상**: 정기결제 버튼 배경색
- **배경색**: 컴포넌트 배경색
- **글자색**: 텍스트 색상

## 🔄 정기결제 플로우

### 1. 정기결제 등록 플로우
1. **사용자가 정기결제 등록 버튼 클릭**
2. **Framer → Railway 서버로 정기결제 등록 요청**
3. **Railway 서버 → PayApp API로 정기결제 등록**
4. **PayApp 정기결제 승인창 열림**
5. **사용자가 최초 결제 승인 완료**
6. **정기결제 등록 완료**

### 2. 정기결제 관리 플로우
1. **등록 완료 후 관리 화면 표시**
2. **일시정지/재시작/해지 버튼 제공**
3. **각 기능별 Railway 서버 API 호출**
4. **PayApp API를 통한 실제 처리**

## 📱 정기결제 상태 관리

### 컴포넌트 상태
- **form**: 정기결제 등록 폼
- **success**: 등록 성공 후 승인 대기
- **management**: 정기결제 관리 화면

### PayApp 정기결제 상태
- **요청**: 정기결제 등록됨, 승인 대기
- **승인**: 정기결제 활성화, 정기 결제 진행
- **일시정지**: 정기결제 일시정지됨
- **해지**: 정기결제 완전 해지됨

## 🛠️ 정기결제 설정 예시

### 매월 15일 정기결제
```json
{
  "cycleType": "Month",
  "cycleDay": 15,
  "expireDate": "2025-12-31",
  "amount": 10000,
  "productName": "PlusMinus Zero 월 구독"
}
```

### 매주 월요일 정기결제
```json
{
  "cycleType": "Week",
  "cycleDay": 1,
  "expireDate": "2025-12-31",
  "amount": 5000,
  "productName": "PlusMinus Zero 주간 구독"
}
```

### 매일 정기결제
```json
{
  "cycleType": "Day",
  "expireDate": "2025-12-31",
  "amount": 1000,
  "productName": "PlusMinus Zero 일일 구독"
}
```

## 🔍 테스트 방법

### 1. 서버 상태 확인
브라우저에서 `https://payapp-backend-production.up.railway.app/health` 접속

### 2. 정기결제 테스트
1. Framer에서 컴포넌트 설정
2. 정기결제 정보 입력 (상품명, 금액, 주기, 만료일)
3. 정기결제 등록 버튼 클릭
4. PayApp 승인창에서 테스트 결제 진행
5. 정기결제 관리 기능 테스트

## ⚠️ 주의사항

1. **정기결제 주기**: 
   - 매월: 1-31일 중 선택 (90: 말일)
   - 매주: 1-7 (월요일-일요일)
   - 매일: 별도 설정 불필요

2. **만료일**: YYYY-MM-DD 형식으로 입력

3. **최초 승인**: 정기결제 등록 후 반드시 PayApp에서 최초 결제 승인 필요

4. **관리 기능**: 등록 완료 후에만 일시정지/재시작/해지 가능

## 🚀 정기결제 시스템 완성!

### ✅ 구현된 기능:
- **정기결제 등록** ✅
- **정기결제 해지** ✅  
- **정기결제 일시정지** ✅
- **정기결제 재시작** ✅
- **완전한 UI 관리** ✅

### 🎯 사용 가능한 정기결제:
- **구독 서비스** (월/주/일)
- **정기 배송**
- **정기 과금**
- **멤버십 서비스**

이제 Framer에서 정기결제 시스템을 완전히 사용할 수 있습니다! 🎉
