const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
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
    const { amount, phone, productName, memo, var1, var2 } = req.body;
    
    // 필수 필드 검증
    if (!amount || !phone || !productName) {
      return res.status(400).json({
        success: false,
        message: '필수 필드가 누락되었습니다: amount, phone, productName'
      });
    }

    // 주문 ID 생성
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // PayApp API 호출을 위한 데이터 준비
    const payappData = {
      cmd: 'payrequest',
      userid: process.env.PAYAPP_USERID,
      goodname: productName,
      price: amount.toString(),
      recvphone: phone,
      memo: memo || '',
      feedbackurl: process.env.PAYAPP_FEEDBACK_URL || `${req.protocol}://${req.get('host')}/api/payapp/callback`,
      var1: var1 || orderId,
      var2: var2 || '',
      smsuse: 'n',
      checkretry: 'y',
      skip_cstpage: 'y'
    };

    // PayApp API 호출 (axios 사용)
    const axios = require('axios');
    const payappResponse = await axios.post('https://api.payapp.kr/oapi/apiLoad.html', payappData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // 응답 파싱
    const responseData = new URLSearchParams(payappResponse.data);
    const state = responseData.get('state');
    
    if (state === '1') {
      // 성공
      const payurl = responseData.get('payurl');
      const mul_no = responseData.get('mul_no');
      
      res.json({
        success: true,
        orderId: orderId,
        payUrl: payurl,
        mulNo: mul_no,
        message: '결제 요청이 성공적으로 생성되었습니다.'
      });
    } else {
      // 실패
      const errorMessage = responseData.get('errorMessage');
      res.status(400).json({
        success: false,
        message: errorMessage || 'PayApp API 호출 실패'
      });
    }
  } catch (error) {
    console.error('PayApp 요청 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

// PayApp 피드백 처리
app.post('/api/payapp/callback', async (req, res) => {
  try {
    const feedbackData = req.body;
    console.log('PayApp 피드백 수신:', feedbackData);
    
    // PayApp에 SUCCESS 응답
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
    
    res.json({
      orderId: orderId,
      status: 'pending',
      message: '결제 상태 확인 기능 (추후 데이터베이스 연동 예정)'
    });
  } catch (error) {
    console.error('상태 확인 오류:', error);
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
  console.log(`- PAYAPP_USERID: ${process.env.PAYAPP_USERID ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`- PAYAPP_LINKKEY: ${process.env.PAYAPP_LINKKEY ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`- PAYAPP_LINKVAL: ${process.env.PAYAPP_LINKVAL ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`- ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS || '기본값 사용'}`);
});
