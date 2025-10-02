// Framer Override에서 사용할 PayApp 결제 연동 예제 코드

// 1. 결제 요청 함수
export async function requestPayment(amount, phone, productName = '상품', memo = '') {
  try {
    const response = await fetch('https://payapp-backend-production.up.railway.app/api/payapp/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        phone: phone,
        productName: productName,
        memo: memo,
        var1: 'framer_order', // Framer 주문 구분
        var2: new Date().toISOString() // 주문 시간
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // PayApp 결제 페이지 열기
      const payWindow = window.open(data.payUrl, '_blank', 'width=500,height=700');
      
      // 결제 완료 감지
      return {
        success: true,
        orderId: data.orderId,
        payWindow: payWindow
      };
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('결제 요청 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 2. 결제 상태 확인 함수
export async function checkPaymentStatus(orderId) {
  try {
    const response = await fetch(`https://payapp-backend-production.up.railway.app/api/payapp/status/${orderId}`);
    const data = await response.json();
    
    return {
      success: true,
      status: data.status,
      payState: data.payState,
      amount: data.amount,
      phone: data.phone,
      productName: data.productName,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  } catch (error) {
    console.error('결제 상태 확인 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 3. 결제 상태 폴링 함수
export function pollPaymentStatus(orderId, onStatusChange, interval = 3000) {
  const pollInterval = setInterval(async () => {
    try {
      const result = await checkPaymentStatus(orderId);
      
      if (result.success) {
        onStatusChange(result);
        
        // 결제 완료 또는 실패 시 폴링 중지
        if (result.status === 'completed' || result.status === 'failed' || result.status === 'cancelled') {
          clearInterval(pollInterval);
        }
      }
    } catch (error) {
      console.error('결제 상태 폴링 오류:', error);
    }
  }, interval);

  return pollInterval; // 폴링 중지용 반환
}

// 4. Framer Override 컴포넌트 예제
export function PaymentButton({ amount, phone, productName, onSuccess, onError, onStatusChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [orderId, setOrderId] = useState(null);

  const handlePayment = async () => {
    setIsLoading(true);
    
    try {
      const result = await requestPayment(amount, phone, productName);
      
      if (result.success) {
        setOrderId(result.orderId);
        
        // 결제 상태 폴링 시작
        const pollInterval = pollPaymentStatus(result.orderId, (status) => {
          setPaymentStatus(status);
          if (onStatusChange) onStatusChange(status);
          
          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setIsLoading(false);
            if (onSuccess) onSuccess(status);
          } else if (status.status === 'failed' || status.status === 'cancelled') {
            clearInterval(pollInterval);
            setIsLoading(false);
            if (onError) onError(status);
          }
        });
      } else {
        setIsLoading(false);
        if (onError) onError(result);
      }
    } catch (error) {
      setIsLoading(false);
      if (onError) onError({ error: error.message });
    }
  };

  return (
    <div>
      <button 
        onClick={handlePayment} 
        disabled={isLoading}
        style={{
          padding: '12px 24px',
          backgroundColor: isLoading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? '결제 진행 중...' : `${amount.toLocaleString()}원 결제하기`}
      </button>
      
      {paymentStatus && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <p>주문번호: {orderId}</p>
          <p>상태: {getStatusText(paymentStatus.status)}</p>
          {paymentStatus.status === 'completed' && (
            <p style={{ color: 'green', fontWeight: 'bold' }}>결제가 완료되었습니다!</p>
          )}
        </div>
      )}
    </div>
  );
}

// 5. 상태 텍스트 변환 함수
function getStatusText(status) {
  const statusMap = {
    'pending': '결제 대기 중',
    'completed': '결제 완료',
    'failed': '결제 실패',
    'cancelled': '결제 취소',
    'refunded': '환불 완료',
    'waiting': '결제 대기'
  };
  return statusMap[status] || status;
}

// 6. 사용 예제
/*
// Framer Override에서 사용하는 방법:

import { PaymentButton } from './framer-example';

export function MyPaymentComponent() {
  const handleSuccess = (result) => {
    console.log('결제 성공:', result);
    // 결제 성공 후 처리
  };

  const handleError = (error) => {
    console.error('결제 실패:', error);
    // 결제 실패 후 처리
  };

  const handleStatusChange = (status) => {
    console.log('결제 상태 변경:', status);
    // 결제 상태 변경 시 처리
  };

  return (
    <PaymentButton
      amount={10000}
      phone="01012345678"
      productName="테스트 상품"
      onSuccess={handleSuccess}
      onError={handleError}
      onStatusChange={handleStatusChange}
    />
  );
}
*/
