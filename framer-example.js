// Framer에서 사용할 PayApp 결제 컴포넌트 예시
// 이 코드를 Framer Code Component에서 사용할 수 있습니다

import { addPropertyControls, ControlType } from "framer";

// 결제 요청 함수
async function requestPayment(paymentData) {
  try {
    const response = await fetch('https://payapp-backend-production.up.railway.app/api/payapp/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: paymentData.amount,
        phone: paymentData.phone,
        productName: paymentData.productName,
        memo: paymentData.memo || '',
        var1: paymentData.var1 || '',
        var2: paymentData.var2 || ''
      })
    });

    const result = await response.json();
    
    if (result.success) {
      // 결제창 열기
      window.open(result.payUrl, '_blank');
      
      // 결제 상태 확인 시작
      checkPaymentStatus(result.orderId);
      
      return {
        success: true,
        orderId: result.orderId,
        message: '결제 요청이 성공적으로 생성되었습니다.'
      };
    } else {
      return {
        success: false,
        message: result.message || '결제 요청에 실패했습니다.'
      };
    }
  } catch (error) {
    console.error('결제 요청 오류:', error);
    return {
      success: false,
      message: '네트워크 오류가 발생했습니다.'
    };
  }
}

// 결제 상태 확인 함수
async function checkPaymentStatus(orderId) {
  try {
    const response = await fetch(`https://payapp-backend-production.up.railway.app/api/payapp/status/${orderId}`);
    const result = await response.json();
    
    return result;
  } catch (error) {
    console.error('결제 상태 확인 오류:', error);
    return null;
  }
}

// 결제 상태 폴링 함수 (결제 완료까지 주기적으로 확인)
function pollPaymentStatus(orderId, onStatusChange, maxAttempts = 60) {
  let attempts = 0;
  
  const poll = async () => {
    if (attempts >= maxAttempts) {
      console.log('결제 상태 확인 시간 초과');
      return;
    }
    
    const status = await checkPaymentStatus(orderId);
    
    if (status && onStatusChange) {
      onStatusChange(status);
    }
    
    // 결제가 완료되거나 실패할 때까지 계속 확인
    if (status && !['completed', 'failed', 'cancelled'].includes(status.status)) {
      attempts++;
      setTimeout(poll, 5000); // 5초마다 확인
    }
  };
  
  poll();
}

// Framer Code Component 예시
export default function PayAppButton(props) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [paymentStatus, setPaymentStatus] = React.useState(null);
  
  const handlePayment = async () => {
    setIsLoading(true);
    setPaymentStatus(null);
    
    const paymentData = {
      amount: props.amount || 1000,
      phone: props.phone || '01012345678',
      productName: props.productName || '상품명',
      memo: props.memo || '',
      var1: props.var1 || '',
      var2: props.var2 || ''
    };
    
    const result = await requestPayment(paymentData);
    
    if (result.success) {
      // 결제 상태 모니터링 시작
      pollPaymentStatus(result.orderId, (status) => {
        setPaymentStatus(status);
        
        // 결제 완료 시 처리
        if (status.status === 'completed') {
          console.log('결제 완료!', status);
          // 여기에 결제 완료 후 처리 로직 추가
          if (props.onPaymentComplete) {
            props.onPaymentComplete(status);
          }
        }
      });
    } else {
      alert(result.message);
    }
    
    setIsLoading(false);
  };
  
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <button
        onClick={handlePayment}
        disabled={isLoading}
        style={{
          padding: '15px 30px',
          fontSize: '16px',
          backgroundColor: isLoading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          minWidth: '200px'
        }}
      >
        {isLoading ? '처리 중...' : props.buttonText || '결제하기'}
      </button>
      
      {paymentStatus && (
        <div style={{ marginTop: '10px', fontSize: '14px' }}>
          <p>결제 상태: {paymentStatus.status}</p>
          {paymentStatus.message && (
            <p>메시지: {paymentStatus.message}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Framer 속성 컨트롤 설정
addPropertyControls(PayAppButton, {
  amount: {
    type: ControlType.Number,
    title: "결제 금액",
    defaultValue: 1000,
    min: 100,
    max: 1000000
  },
  phone: {
    type: ControlType.String,
    title: "휴대폰 번호",
    defaultValue: "01012345678"
  },
  productName: {
    type: ControlType.String,
    title: "상품명",
    defaultValue: "상품명"
  },
  memo: {
    type: ControlType.String,
    title: "메모",
    defaultValue: ""
  },
  buttonText: {
    type: ControlType.String,
    title: "버튼 텍스트",
    defaultValue: "결제하기"
  },
  onPaymentComplete: {
    type: ControlType.EventHandler,
    title: "결제 완료 이벤트"
  }
});
