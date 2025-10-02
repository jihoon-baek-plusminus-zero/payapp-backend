const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');
const { Pool } = require('pg');
const http = require('http');
const querystring = require('querystring');

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

/**
 * PayApp API 호출을 위한 HTTP 옵션 생성
 * @param {string} postData - POST 데이터
 */
function optionsMake(postData) {
  return {
    host: 'api.payapp.kr',
    path: '/oapi/apiLoad.html',
    port: '80',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
}

/**
 * PayApp API 응답 처리
 * @param {Object} response - HTTP 응답 객체
 * @param {Function} callback - 콜백 함수
 */
function readJSONResponse(response, callback) {
  let responseData = '';
  response.on('data', function (chunk) {
    responseData += chunk;
  });
  response.on('end', function () {
    const result = querystring.parse(responseData);
    // state = 1 이면 성공, state = 0 이면 실패
    console.log("PayApp API 응답:", JSON.stringify(result));
    if (callback) callback(result);
  });
  response.on('error', function (error) {
    console.error('PayApp API 응답 오류:', error);
    if (callback) callback({ state: '0', errorMessage: 'API 호출 실패' });
  });
}

/**
 * PayApp 결제 요청
 * @param {Object} params - 결제 요청 파라미터
 * @param {Function} callback - 콜백 함수
 */
function payRequest(params, callback) {
  const postData = querystring.stringify({
    'cmd': 'payrequest',
    'userid': process.env.PAYAPP_USERID,
    'goodname': params.productName || '상품',
    'price': params.amount.toString(),
    'recvphone': params.phone,
    'feedbackurl': process.env.PAYAPP_FEEDBACK_URL,
    'memo': params.memo || '',
    'reqaddr': '0',
    'var1': params.var1 || '',
    'var2': params.var2 || '',
    'smsuse': '',
    'reqmode': 'krw',
    'vccode': '',
    'returnurl': '',
    'openpaytype': '',
    'checkretry': 'y'
  });

  const request = http.request(optionsMake(postData), (response) => {
    readJSONResponse(response, callback);
  });

  request.on('error', function (error) {
    console.error('PayApp API 요청 오류:', error);
    if (callback) callback({ state: '0', errorMessage: 'API 요청 실패' });
  });

  request.write(postData);
  request.end();
}

// PayApp 결제 요청 API
app.post('/api/payapp/request', async (req, res) => {
  try {
    const { amount, phone, productName, memo, var1, var2 } = req.body;
    
    // 입력값 검증
    if (!amount || !phone) {
      return res.status(400).json({ 
        success: false, 
        error: '금액과 휴대폰번호는 필수입니다.' 
      });
    }

    // PayApp API 호출
    payRequest({
      amount: amount,
      phone: phone,
      productName: productName,
      memo: memo,
      var1: var1,
      var2: var2
    }, async (result) => {
      try {
        if (result.state === '0') {
          return res.status(400).json({ 
            success: false, 
            error: result.errorMessage || '결제 도중 에러가 발생했습니다.' 
          });
        }

        // 주문 정보 DB 저장
        const orderId = result.mul_no;
        await pool.query(
          'INSERT INTO orders (id, amount, phone, status, product_name, memo, var1, var2, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())',
          [orderId, amount, phone, 'pending', productName, memo, var1, var2]
        );

        res.json({
          success: true,
          orderId: orderId,
          payUrl: decodeURIComponent(result.payurl)
        });

      } catch (dbError) {
        console.error('DB 저장 오류:', dbError);
        res.status(500).json({ 
          success: false, 
          error: '주문 정보 저장 중 오류가 발생했습니다.' 
        });
      }
    });

  } catch (error) {
    console.error('결제 요청 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// PayApp 피드백 처리
app.post('/api/payapp/callback', async (req, res) => {
  try {
    console.log('PayApp 피드백 수신:', req.body);
    
    const { 
      userid, 
      linkkey, 
      linkval, 
      mul_no, 
      pay_state,
      goodname,
      price,
      recvphone,
      memo,
      reqaddr,
      reqdate,
      pay_memo,
      pay_addr,
      pay_date,
      pay_type,
      var1,
      var2,
      payurl,
      csturl,
      card_name,
      currency,
      vccode,
      score,
      vbank,
      vbankno,
      feedbacktype
    } = req.body;
    
    // PayApp 인증 확인
    if (userid !== process.env.PAYAPP_USERID || 
        linkkey !== process.env.PAYAPP_LINKKEY || 
        linkval !== process.env.PAYAPP_LINKVAL) {
      console.error('PayApp 인증 실패:', { userid, linkkey, linkval });
      return res.status(401).send('UNAUTHORIZED');
    }

    // 주문 상태 업데이트
    let status = 'pending';
    if (pay_state === '4') {
      status = 'completed';
    } else if (pay_state === '8' || pay_state === '16' || pay_state === '31') {
      status = 'cancelled';
    } else if (pay_state === '9' || pay_state === '64') {
      status = 'refunded';
    } else if (pay_state === '10') {
      status = 'waiting';
    } else {
      status = 'failed';
    }

    await pool.query(
      `UPDATE orders SET 
        status = $1, 
        pay_state = $2,
        goodname = $3,
        price = $4,
        recvphone = $5,
        memo = $6,
        reqaddr = $7,
        reqdate = $8,
        pay_memo = $9,
        pay_addr = $10,
        pay_date = $11,
        pay_type = $12,
        var1 = $13,
        var2 = $14,
        payurl = $15,
        csturl = $16,
        card_name = $17,
        currency = $18,
        vccode = $19,
        score = $20,
        vbank = $21,
        vbankno = $22,
        feedbacktype = $23,
        updated_at = NOW() 
      WHERE id = $24`,
      [
        status, pay_state, goodname, price, recvphone, memo, reqaddr, reqdate,
        pay_memo, pay_addr, pay_date, pay_type, var1, var2, payurl, csturl,
        card_name, currency, vccode, score, vbank, vbankno, feedbacktype, mul_no
      ]
    );

    console.log(`주문 ${mul_no} 상태 업데이트: ${status}`);
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
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    const order = result.rows[0];
    res.json({ 
      status: order.status,
      payState: order.pay_state,
      amount: order.amount,
      phone: order.phone,
      productName: order.product_name,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    });
  } catch (error) {
    console.error('상태 확인 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 주문 목록 조회 API (관리용)
app.get('/api/payapp/orders', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM orders';
    let params = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      orders: result.rows,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('주문 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'PayApp Backend',
    version: '1.0.0'
  });
});

// 루트 경로
app.get('/', (req, res) => {
  res.json({
    message: 'PayApp Backend Server',
    version: '1.0.0',
    endpoints: {
      'POST /api/payapp/request': '결제 요청',
      'POST /api/payapp/callback': 'PayApp 피드백 (내부용)',
      'GET /api/payapp/status/:orderId': '결제 상태 확인',
      'GET /api/payapp/orders': '주문 목록 조회',
      'GET /health': '서버 상태 확인'
    }
  });
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
  console.log(`환경: ${process.env.NODE_ENV || 'development'}`);
  console.log(`PayApp UserID: ${process.env.PAYAPP_USERID}`);
});
