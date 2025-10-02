import { addPropertyControls, ControlType } from "framer"
import * as React from "react"

// PayApp 결제 컴포넌트
export function PayAppCodeComponent(props: any) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [paymentData, setPaymentData] = React.useState<any>(null)
  const [error, setError] = React.useState<string | null>(null)

  // PayApp 결제 요청 함수
  const handlePayment = async () => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      // 결제 데이터 준비
      const paymentRequest = {
        amount: props.amount,
        phone: props.phone,
        productName: props.productName,
        memo: props.memo || "",
        var1: props.orderId || `ORDER_${Date.now()}`,
        var2: props.userId || "",
        skip_cstpage: "y"
      }

      console.log("PayApp 결제 요청:", paymentRequest)

      // Railway 서버에 결제 요청
      const response = await fetch(`${props.serverUrl}/api/payapp/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentRequest)
      })

      const result = await response.json()

      if (result.success && result.payUrl) {
        console.log("결제 요청 성공:", result)
        setPaymentData(result)
        
        // PayApp 결제창 열기
        window.open(result.payUrl, "_blank", "width=500,height=700")
        
        // 결제 완료 확인을 위한 폴링 (선택사항)
        if (props.autoCheckStatus) {
          checkPaymentStatus(result.orderId)
        }
      } else {
        throw new Error(result.message || "결제 요청에 실패했습니다.")
      }
    } catch (err: any) {
      console.error("PayApp 결제 오류:", err)
      setError(err.message || "결제 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 결제 상태 확인 함수
  const checkPaymentStatus = async (orderId: string) => {
    try {
      const response = await fetch(`${props.serverUrl}/api/payapp/status/${orderId}`)
      const status = await response.json()
      console.log("결제 상태:", status)
      return status
    } catch (err) {
      console.error("결제 상태 확인 오류:", err)
    }
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: props.backgroundColor,
        borderRadius: props.borderRadius,
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* 결제 정보 표시 */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <h3 style={{ margin: "0 0 10px 0", color: props.textColor }}>
          {props.productName}
        </h3>
        <p style={{ margin: "0", fontSize: "18px", fontWeight: "bold", color: props.textColor }}>
          {props.amount.toLocaleString()}원
        </p>
        {props.memo && (
          <p style={{ margin: "10px 0 0 0", fontSize: "14px", color: props.textColor }}>
            {props.memo}
          </p>
        )}
      </div>

      {/* 결제 버튼 */}
      <button
        onClick={handlePayment}
        disabled={isLoading || !props.phone || !props.amount}
        style={{
          width: "200px",
          height: "50px",
          backgroundColor: isLoading ? "#ccc" : props.buttonColor,
          color: props.buttonTextColor,
          border: "none",
          borderRadius: "25px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: isLoading ? "not-allowed" : "pointer",
          transition: "all 0.3s ease",
          opacity: (!props.phone || !props.amount) ? 0.5 : 1,
        }}
        onMouseOver={(e) => {
          if (!isLoading && props.phone && props.amount) {
            e.currentTarget.style.transform = "scale(1.05)"
          }
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "scale(1)"
        }}
      >
        {isLoading ? "처리중..." : props.buttonText}
      </button>

      {/* 오류 메시지 */}
      {error && (
        <div style={{ 
          marginTop: "15px", 
          padding: "10px", 
          backgroundColor: "#ffebee", 
          color: "#c62828", 
          borderRadius: "5px",
          fontSize: "14px",
          textAlign: "center"
        }}>
          {error}
        </div>
      )}

      {/* 결제 정보 (개발용) */}
      {paymentData && props.showDebugInfo && (
        <div style={{ 
          marginTop: "20px", 
          padding: "10px", 
          backgroundColor: "#f5f5f5", 
          borderRadius: "5px",
          fontSize: "12px",
          textAlign: "left"
        }}>
          <strong>결제 정보:</strong><br/>
          주문번호: {paymentData.orderId}<br/>
          결제 URL: {paymentData.payUrl}<br/>
          Mul No: {paymentData.mulNo}
        </div>
      )}

      {/* 필수 필드 안내 */}
      {(!props.phone || !props.amount) && (
        <div style={{ 
          marginTop: "15px", 
          fontSize: "12px", 
          color: "#666",
          textAlign: "center"
        }}>
          {!props.phone && "휴대폰번호를 입력해주세요."}<br/>
          {!props.amount && "결제 금액을 설정해주세요."}
        </div>
      )}
    </div>
  )
}

// Framer 프로퍼티 컨트롤 설정
addPropertyControls(PayAppCodeComponent, {
  // 서버 설정
  serverUrl: {
    title: "서버 URL",
    type: ControlType.String,
    defaultValue: "https://payapp-backend-production.up.railway.app",
    description: "Railway에 배포된 서버 URL"
  },

  // 결제 정보
  amount: {
    title: "결제 금액",
    type: ControlType.Number,
    defaultValue: 1000,
    min: 100,
    max: 10000000,
    description: "결제할 금액 (원)"
  },
  
  phone: {
    title: "휴대폰번호",
    type: ControlType.String,
    defaultValue: "01012345678",
    description: "결제자 휴대폰번호 (하이픈 없이)"
  },
  
  productName: {
    title: "상품명",
    type: ControlType.String,
    defaultValue: "PlusMinus Zero 상품",
    description: "결제할 상품명"
  },
  
  memo: {
    title: "메모",
    type: ControlType.String,
    defaultValue: "",
    description: "결제 메모 (선택사항)"
  },
  
  orderId: {
    title: "주문번호",
    type: ControlType.String,
    defaultValue: "",
    description: "주문번호 (비워두면 자동 생성)"
  },
  
  userId: {
    title: "사용자 ID",
    type: ControlType.String,
    defaultValue: "",
    description: "사용자 ID (선택사항)"
  },

  // 버튼 설정
  buttonText: {
    title: "버튼 텍스트",
    type: ControlType.String,
    defaultValue: "PayApp로 결제하기",
    description: "결제 버튼에 표시될 텍스트"
  },
  
  buttonColor: {
    title: "버튼 색상",
    type: ControlType.Color,
    defaultValue: "#007bff",
    description: "결제 버튼 배경색"
  },
  
  buttonTextColor: {
    title: "버튼 글자색",
    type: ControlType.Color,
    defaultValue: "#ffffff",
    description: "결제 버튼 글자색"
  },

  // 디자인 설정
  backgroundColor: {
    title: "배경색",
    type: ControlType.Color,
    defaultValue: "#ffffff",
    description: "컴포넌트 배경색"
  },
  
  textColor: {
    title: "글자색",
    type: ControlType.Color,
    defaultValue: "#333333",
    description: "텍스트 색상"
  },
  
  borderRadius: {
    title: "모서리 둥글기",
    type: ControlType.Number,
    defaultValue: 10,
    min: 0,
    max: 50,
    description: "컴포넌트 모서리 둥글기"
  },

  // 기능 설정
  autoCheckStatus: {
    title: "자동 상태 확인",
    type: ControlType.Boolean,
    defaultValue: false,
    description: "결제 후 자동으로 상태 확인"
  },
  
  showDebugInfo: {
    title: "디버그 정보 표시",
    type: ControlType.Boolean,
    defaultValue: false,
    description: "개발용 디버그 정보 표시"
  }
})

// 기본 내보내기
export default PayAppCodeComponent
