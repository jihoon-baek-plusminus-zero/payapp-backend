const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'https://plusminus-zero.studio'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// PayApp API 설정
const PAYAPP_CONFIG = {
  API_URL: 'https://api.payapp.kr/oapi/apiLoad.html',
  USERID: process.env.PAYAPP_USERID || 'plusminuszero',
  LINKKEY: process.env.PAYAPP_LINKKEY || '7w/7M+M9rix9hr/Ohk23+O1DPJnCCRVaOgT+oqg6zaM=',
  LINKVAL: process.env.PAYAPP_LINKVAL || '7w/7M+M9rix9hr/Ohk23+PdC7QxGGa4QAbfQ6FxS/xI='
};

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'PayApp Backend Server',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'POST /api/payapp/request - 결제 요청',
      'POST /api/payapp/callback - PayApp 피드백',
      'GET /api/payapp/status/:orderId - 결제 상태 확인',
      'GET /health - 서버 상태 확인'
    ]
  });
});

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// PayApp 결제 요청 API
app.post('/api/payapp/request', async (req, res) => {
  try {
    const { amount, phone, productName, memo, var1, var2, skip_cstpage } = req.body;
    
    // 필수 필드 검증
    if (!amount || !phone || !productName) {
      return res.status(400).json({
        success: false,
        message: '필수 필드가 누락되었습니다: amount, phone, productName'
      });
    }

    // 주문 ID 생성
    const orderId = var1 || `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // PayApp API 호출을 위한 데이터 준비 (URLSearchParams 사용)
    const payappData = new URLSearchParams({
      cmd: 'payrequest',
      userid: PAYAPP_CONFIG.USERID,
      goodname: productName,
      price: amount.toString(),
      recvphone: phone,
      memo: memo || '',
      feedbackurl: process.env.PAYAPP_FEEDBACK_URL || `${req.protocol}://${req.get('host')}/api/payapp/callback`,
      var1: orderId,
      var2: var2 || '',
      smsuse: 'n',
      checkretry: 'y',
      skip_cstpage: skip_cstpage || 'y',
      openpaytype: '', // 모든 결제수단 허용
      reqaddr: '0', // 주소 요청 안함
      returnurl: '', // 결제 완료 후 이동 URL
      charset: 'utf-8'
    });

    console.log('PayApp API 요청 데이터:', payappData.toString());

    // PayApp API 호출
    const payappResponse = await axios.post(PAYAPP_CONFIG.API_URL, payappData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'ko-KR'
      },
      timeout: 30000
    });

    console.log('PayApp API 응답:', payappResponse.data);

    // 응답 파싱
    const responseData = new URLSearchParams(payappResponse.data);
    const state = responseData.get('state');
    
    if (state === '1') {
      // 성공
      const payurl = responseData.get('payurl');
      const mul_no = responseData.get('mul_no');
      const qrurl = responseData.get('qrurl');
      
      console.log('PayApp 결제 요청 성공:', { orderId, mul_no, payurl });
      
      res.json({
        success: true,
        orderId: orderId,
        payUrl: payurl,
        qrUrl: qrurl,
        mulNo: mul_no,
        message: '결제 요청이 성공적으로 생성되었습니다.'
      });
    } else {
      // 실패
      const errorMessage = responseData.get('errorMessage');
      const errno = responseData.get('errno');
      
      console.error('PayApp API 오류:', { state, errorMessage, errno });
      
      res.status(400).json({
        success: false,
        message: errorMessage || 'PayApp API 호출 실패',
        errorCode: errno,
        state: state
      });
    }
  } catch (error) {
    console.error('PayApp 요청 오류:', error);
    
    // axios 오류 처리
    if (error.response) {
      console.error('PayApp API 응답 오류:', error.response.data);
    } else if (error.request) {
      console.error('PayApp API 요청 실패:', error.request);
    }
    
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PayApp 피드백 처리
app.post('/api/payapp/callback', async (req, res) => {
  try {
    const feedbackData = req.body;
    console.log('PayApp 피드백 수신:', feedbackData);
    
    // PayApp 인증 확인
    const { userid, linkkey, linkval, pay_state, mul_no, var1, var2 } = feedbackData;
    
    // 인증 검증
    if (userid !== PAYAPP_CONFIG.USERID || 
        linkkey !== PAYAPP_CONFIG.LINKKEY || 
        linkval !== PAYAPP_CONFIG.LINKVAL) {
      console.error('PayApp 피드백 인증 실패');
      return res.status(401).send('FAIL');
    }
    
    // 결제 상태별 처리
    switch (pay_state) {
      case '1':
        console.log('결제 요청:', { mul_no, var1, var2 });
        break;
      case '4':
        console.log('결제 완료:', { mul_no, var1, var2 });
        // 여기서 실제 결제 완료 처리 (DB 업데이트, 상품 배송 등)
        break;
      case '8':
      case '32':
        console.log('요청 취소:', { mul_no, var1, var2 });
        break;
      case '9':
      case '64':
        console.log('승인 취소:', { mul_no, var1, var2 });
        break;
      case '10':
        console.log('결제 대기:', { mul_no, var1, var2 });
        break;
      default:
        console.log('기타 상태:', { pay_state, mul_no, var1, var2 });
    }
    
    // PayApp에 SUCCESS 응답 (필수)
    res.send('SUCCESS');
  } catch (error) {
    console.error('피드백 처리 오류:', error);
    res.status(500).send('FAIL');
  }
});

// 결제 상태 확인
app.get('/api/payapp/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // 실제 구현에서는 데이터베이스에서 주문 상태를 조회
    // 현재는 임시 응답
    res.json({
      orderId: orderId,
      status: 'pending',
      message: '결제 상태 확인 기능 (추후 데이터베이스 연동 예정)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

// PayApp 결제 취소 API (추가 기능)
app.post('/api/payapp/cancel', async (req, res) => {
  try {
    const { mul_no, cancelmemo } = req.body;
    
    if (!mul_no) {
      return res.status(400).json({
        success: false,
        message: '결제요청번호(mul_no)가 필요합니다.'
      });
    }

    // PayApp 결제 취소 API 호출
    const cancelData = new URLSearchParams({
      cmd: 'paycancel',
      userid: PAYAPP_CONFIG.USERID,
      linkkey: PAYAPP_CONFIG.LINKKEY,
      mul_no: mul_no,
      cancelmemo: cancelmemo || '사용자 요청 취소',
      partcancel: '0', // 전체 취소
      cancelprice: '0'
    });

    const cancelResponse = await axios.post(PAYAPP_CONFIG.API_URL, cancelData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const responseData = new URLSearchParams(cancelResponse.data);
    const state = responseData.get('state');
    
    if (state === '1') {
      res.json({
        success: true,
        message: '결제가 성공적으로 취소되었습니다.'
      });
    } else {
      const errorMessage = responseData.get('errorMessage');
      res.status(400).json({
        success: false,
        message: errorMessage || '결제 취소에 실패했습니다.'
      });
    }
  } catch (error) {
    console.error('결제 취소 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 PayApp Backend Server가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📊 서버 상태: http://localhost:${PORT}/health`);
  console.log(`🔗 API 문서: http://localhost:${PORT}/`);
  
  // 환경 변수 확인
  console.log('\n🔧 환경 변수 설정:');
  console.log(`- PAYAPP_USERID: ${PAYAPP_CONFIG.USERID ? '✅ 설정됨' : '❌ 미설정'} (${PAYAPP_CONFIG.USERID})`);
  console.log(`- PAYAPP_LINKKEY: ${PAYAPP_CONFIG.LINKKEY ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`- PAYAPP_LINKVAL: ${PAYAPP_CONFIG.LINKVAL ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`- ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS || '기본값 사용'}`);
  console.log(`- PAYAPP_FEEDBACK_URL: ${process.env.PAYAPP_FEEDBACK_URL || '자동 설정'}`);
  
  console.log('\n📋 사용 가능한 API 엔드포인트:');
  console.log('  POST /api/payapp/request - PayApp 결제 요청');
  console.log('  POST /api/payapp/callback - PayApp 피드백 수신');
  console.log('  GET  /api/payapp/status/:orderId - 결제 상태 확인');
  console.log('  POST /api/payapp/cancel - 결제 취소');
  console.log('  GET  /health - 서버 상태 확인');
});
