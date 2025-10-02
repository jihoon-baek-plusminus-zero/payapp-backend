-- PayApp 주문 테이블 생성
CREATE TABLE IF NOT EXISTS orders (
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
    
    -- 타임스탬프
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_pay_state ON orders(pay_state);
