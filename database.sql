-- PayApp 결제 시스템 데이터베이스 스키마
-- PostgreSQL용

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
    mul_no VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_mul_no ON orders(mul_no);
CREATE INDEX IF NOT EXISTS idx_orders_var1 ON orders(var1);

-- 결제 상태 업데이트 함수
CREATE OR REPLACE FUNCTION update_order_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_order_status ON orders;
CREATE TRIGGER trigger_update_order_status
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_status();
