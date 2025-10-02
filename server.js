const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// PostgreSQL 연결 (Railway에서 자동 제공)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// 미들웨어 설정
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// CORS 설정 (Framer에서 호출하기 위해)
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));

// PayApp 결제 요청 API
app.post('/api/payapp/request', async (req, res) => {
  try {
    const { amount, phone, productName } = req.body;
    
    // PayApp API 호출을 위한 데이터 준비
    const postData = new URLSearchParams({
      'cmd': 'payrequest',
      'userid': process.env.PAYAPP_USERID,
      'goodname': productName || '상품',
      'price': amount.toString(),
      'recvphone': phone,
      'feedbackurl': process.env.PAYAPP_FEEDBACK_URL
    });

    // PayApp API 호출
    const response = await fetch('http://api.payapp.kr/oapi/apiLoad.html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: postData.toString()
    });

    const responseText = await response.text();
    const result = new URLSearchParams(responseText);
    
    if (result.get('state') === '0') {
      return res.status(400).json({ 
        success: false, 
        error: '결제 도중 에러가 발생했습니다.' 
      });
    }

    // 주문 정보 DB 저장
    const orderId = result.get('mul_no');
    await pool.query(
      'INSERT INTO orders (id, amount, phone, status, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [orderId, amount, phone, 'pending']
    );

    res.json({
      success: true,
      orderId: orderId,
      payUrl: decodeURIComponent(result.get('payurl'))
    });

  } catch (error) {
    console.error('PayApp API 호출 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// PayApp 피드백 처리
app.post('/api/payapp/callback', async (req, res) => {
  try {
    const { userid, linkkey, linkval, mul_no, pay_state } = req.body;
    
    // PayApp 인증 확인
    if (userid !== process.env.PAYAPP_USERID || 
        linkkey !== process.env.PAYAPP_LINKKEY || 
        linkval !== process.env.PAYAPP_LINKVAL) {
      return res.status(401).send('UNAUTHORIZED');
    }

    // 주문 상태 업데이트
    const status = pay_state === '4' ? 'completed' : 'failed';
    await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, mul_no]
    );

    res.send('SUCCESS');
  } catch (error) {
    console.error('피드백 처리 오류:', error);
    res.status(500).send('ERROR');
  }
});

// 결제 상태 확인 API
app.get('/api/payapp/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const result = await pool.query(
      'SELECT status FROM orders WHERE id = $1',
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    res.json({ status: result.rows[0].status });
  } catch (error) {
    console.error('상태 확인 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 처리
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API를 찾을 수 없습니다.' });
});

// 에러 처리
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PayApp 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
