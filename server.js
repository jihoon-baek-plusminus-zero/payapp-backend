const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

// Supabase 연동 모듈 추가 (결제 처리용만)
// const { syncAllProducts, getSyncStatus } = require('./railway-supabase-integration');

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
        // Supabase에 결제 완료 처리
        await handlePaymentCompletion(feedbackData);
        break;
      case '8':
      case '32':
        console.log('요청 취소:', { mul_no, var1, var2 });
        break;
      case '9':
      case '64':
        console.log('승인 취소:', { mul_no, var1, var2 });
        // Supabase에 환불 처리
        await handlePaymentRefund(feedbackData);
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

// ==================== Supabase 결제 처리 함수 ====================

// 결제 완료 처리
async function handlePaymentCompletion(feedbackData) {
  try {
    const { mul_no, var1, var2, goodprice } = feedbackData;
    
    // var1에서 사용자 ID와 상품 정보 추출 (예: "user_id:product_id")
    const [userId, productId] = var1 ? var1.split(':') : [null, null];
    
    if (!userId || !productId) {
      console.error('결제 완료 처리 실패: 사용자 ID 또는 상품 ID 누락', { var1 });
      return;
    }

    // Supabase에 결제 내역 추가
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 결제 내역 삽입
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        product_id: productId,
        product_type: productId === 'all_products' ? 'all_products' : 
                     (productId.startsWith('notion_') ? 'notion_template' : 'goodnote_template'),
        payment_id: mul_no,
        amount: parseFloat(goodprice) || 0,
        status: 'completed',
        completed_at: new Date().toISOString(),
        webhook_processed: true
      });

    if (paymentError) {
      console.error('Supabase 결제 내역 삽입 실패:', paymentError);
    } else {
      console.log('Supabase 결제 완료 처리 성공:', { userId, productId, mul_no });
    }

  } catch (error) {
    console.error('결제 완료 처리 오류:', error);
  }
}

// 환불 처리
async function handlePaymentRefund(feedbackData) {
  try {
    const { mul_no, var1 } = feedbackData;
    
    // var1에서 사용자 ID와 상품 정보 추출
    const [userId, productId] = var1 ? var1.split(':') : [null, null];
    
    if (!userId || !productId) {
      console.error('환불 처리 실패: 사용자 ID 또는 상품 ID 누락', { var1 });
      return;
    }

    // Supabase 클라이언트
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 결제 내역을 환불 상태로 업데이트
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        webhook_processed: true
      })
      .eq('payment_id', mul_no);

    if (updateError) {
      console.error('Supabase 환불 처리 실패:', updateError);
    } else {
      console.log('Supabase 환불 처리 성공:', { userId, productId, mul_no });
    }

  } catch (error) {
    console.error('환불 처리 오류:', error);
  }
}

// ==================== 정기결제 API ====================

// 정기결제 등록
app.post('/api/payapp/rebill/register', async (req, res) => {
  try {
    const { 
      goodname, 
      goodprice, 
      recvphone, 
      recvemail,
      memo,
      rebillCycleType,
      rebillCycleMonth,
      rebillCycleWeek,
      rebillExpire,
      var1,
      var2,
      openpaytype
    } = req.body;
    
    // 필수 필드 검증
    if (!goodname || !goodprice || !recvphone || !rebillCycleType || !rebillExpire) {
      return res.status(400).json({
        success: false,
        message: '필수 필드가 누락되었습니다: goodname, goodprice, recvphone, rebillCycleType, rebillExpire'
      });
    }

    // 주문 ID 생성
    const orderId = var1 || `REBILL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // PayApp 정기결제 등록 API 호출
    const rebillData = new URLSearchParams({
      cmd: 'rebillRegist',
      userid: PAYAPP_CONFIG.USERID,
      goodname: goodname,
      goodprice: goodprice.toString(),
      recvphone: recvphone,
      recvemail: recvemail || '',
      memo: memo || '',
      rebillCycleType: rebillCycleType, // Month, Week, Day
      rebillCycleMonth: rebillCycleMonth || '',
      rebillCycleWeek: rebillCycleWeek || '',
      rebillExpire: rebillExpire, // yyyy-mm-dd
      feedbackurl: process.env.PAYAPP_FEEDBACK_URL || `${req.protocol}://${req.get('host')}/api/payapp/callback`,
      var1: orderId,
      var2: var2 || '',
      smsuse: 'n',
      openpaytype: openpaytype || '', // card, phone
      returnurl: ''
    });

    console.log('PayApp 정기결제 등록 요청:', rebillData.toString());

    const rebillResponse = await axios.post(PAYAPP_CONFIG.API_URL, rebillData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'ko-KR'
      },
      timeout: 30000
    });

    console.log('PayApp 정기결제 등록 응답:', rebillResponse.data);

    const responseData = new URLSearchParams(rebillResponse.data);
    const state = responseData.get('state');
    
    if (state === '1') {
      const rebill_no = responseData.get('rebill_no');
      const payurl = responseData.get('payurl');
      
      console.log('정기결제 등록 성공:', { orderId, rebill_no, payurl });
      
      res.json({
        success: true,
        orderId: orderId,
        rebillNo: rebill_no,
        payUrl: payurl,
        message: '정기결제가 성공적으로 등록되었습니다.'
      });
    } else {
      const errorMessage = responseData.get('errorMessage');
      const errno = responseData.get('errno');
      
      console.error('PayApp 정기결제 등록 오류:', { state, errorMessage, errno });
      
      res.status(400).json({
        success: false,
        message: errorMessage || '정기결제 등록에 실패했습니다.',
        errorCode: errno,
        state: state
      });
    }
  } catch (error) {
    console.error('정기결제 등록 오류:', error);
    
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

// 정기결제 해지
app.post('/api/payapp/rebill/cancel', async (req, res) => {
  try {
    const { rebill_no } = req.body;
    
    if (!rebill_no) {
      return res.status(400).json({
        success: false,
        message: '정기결제 등록번호(rebill_no)가 필요합니다.'
      });
    }

    // PayApp 정기결제 해지 API 호출
    const cancelData = new URLSearchParams({
      cmd: 'rebillCancel',
      userid: PAYAPP_CONFIG.USERID,
      linkkey: PAYAPP_CONFIG.LINKKEY,
      rebill_no: rebill_no
    });

    console.log('PayApp 정기결제 해지 요청:', cancelData.toString());

    const cancelResponse = await axios.post(PAYAPP_CONFIG.API_URL, cancelData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const responseData = new URLSearchParams(cancelResponse.data);
    const state = responseData.get('state');
    
    if (state === '1') {
      console.log('정기결제 해지 성공:', { rebill_no });
      
      res.json({
        success: true,
        message: '정기결제가 성공적으로 해지되었습니다.'
      });
    } else {
      const errorMessage = responseData.get('errorMessage');
      
      console.error('PayApp 정기결제 해지 오류:', { state, errorMessage });
      
      res.status(400).json({
        success: false,
        message: errorMessage || '정기결제 해지에 실패했습니다.'
      });
    }
  } catch (error) {
    console.error('정기결제 해지 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

// 정기결제 일시정지
app.post('/api/payapp/rebill/stop', async (req, res) => {
  try {
    const { rebill_no } = req.body;
    
    if (!rebill_no) {
      return res.status(400).json({
        success: false,
        message: '정기결제 등록번호(rebill_no)가 필요합니다.'
      });
    }

    // PayApp 정기결제 일시정지 API 호출
    const stopData = new URLSearchParams({
      cmd: 'rebillStop',
      userid: PAYAPP_CONFIG.USERID,
      linkkey: PAYAPP_CONFIG.LINKKEY,
      rebill_no: rebill_no
    });

    console.log('PayApp 정기결제 일시정지 요청:', stopData.toString());

    const stopResponse = await axios.post(PAYAPP_CONFIG.API_URL, stopData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const responseData = new URLSearchParams(stopResponse.data);
    const state = responseData.get('state');
    
    if (state === '1') {
      console.log('정기결제 일시정지 성공:', { rebill_no });
      
      res.json({
        success: true,
        message: '정기결제가 성공적으로 일시정지되었습니다.'
      });
    } else {
      const errorMessage = responseData.get('errorMessage');
      
      console.error('PayApp 정기결제 일시정지 오류:', { state, errorMessage });
      
      res.status(400).json({
        success: false,
        message: errorMessage || '정기결제 일시정지에 실패했습니다.'
      });
    }
  } catch (error) {
    console.error('정기결제 일시정지 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

// 정기결제 재시작
app.post('/api/payapp/rebill/start', async (req, res) => {
  try {
    const { rebill_no } = req.body;
    
    if (!rebill_no) {
      return res.status(400).json({
        success: false,
        message: '정기결제 등록번호(rebill_no)가 필요합니다.'
      });
    }

    // PayApp 정기결제 재시작 API 호출
    const startData = new URLSearchParams({
      cmd: 'rebillStart',
      userid: PAYAPP_CONFIG.USERID,
      linkkey: PAYAPP_CONFIG.LINKKEY,
      rebill_no: rebill_no
    });

    console.log('PayApp 정기결제 재시작 요청:', startData.toString());

    const startResponse = await axios.post(PAYAPP_CONFIG.API_URL, startData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const responseData = new URLSearchParams(startResponse.data);
    const state = responseData.get('state');
    
    if (state === '1') {
      console.log('정기결제 재시작 성공:', { rebill_no });
      
      res.json({
        success: true,
        message: '정기결제가 성공적으로 재시작되었습니다.'
      });
    } else {
      const errorMessage = responseData.get('errorMessage');
      
      console.error('PayApp 정기결제 재시작 오류:', { state, errorMessage });
      
      res.status(400).json({
        success: false,
        message: errorMessage || '정기결제 재시작에 실패했습니다.'
      });
    }
  } catch (error) {
    console.error('정기결제 재시작 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

// ==================== Framer CMS 연동 API (제거됨) ====================
// Framer API 없이 결제 시점에 필요한 데이터만 처리
// 상품 정보는 Framer CMS에서 직접 관리

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
  console.log('\n🔹 일반 결제:');
  console.log('  POST /api/payapp/request - PayApp 결제 요청');
  console.log('  POST /api/payapp/callback - PayApp 피드백 수신');
  console.log('  GET  /api/payapp/status/:orderId - 결제 상태 확인');
  console.log('  POST /api/payapp/cancel - 결제 취소');
  console.log('\n🔹 정기결제:');
  console.log('  POST /api/payapp/rebill/register - 정기결제 등록');
  console.log('  POST /api/payapp/rebill/cancel - 정기결제 해지');
  console.log('  POST /api/payapp/rebill/stop - 정기결제 일시정지');
  console.log('  POST /api/payapp/rebill/start - 정기결제 재시작');
  console.log('\n🔹 Framer CMS 연동:');
  console.log('  (Framer API 없이 결제 시점에 필요한 데이터만 처리)');
  console.log('\n🔹 시스템:');
  console.log('  GET  /health - 서버 상태 확인');
});
