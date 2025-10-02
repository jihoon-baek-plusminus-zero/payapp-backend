import { addPropertyControls, ControlType } from "framer"
import * as React from "react"

// PayApp 정기결제 컴포넌트
export function PayAppRebillCodeComponent(props: any) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [rebillData, setRebillData] = React.useState<any>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [step, setStep] = React.useState<'form' | 'success' | 'management'>('form')

  // 정기결제 등록 함수
  const handleRebillRegister = async () => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      // 정기결제 데이터 준비
      const rebillRequest = {
        goodname: props.productName,
        goodprice: props.amount,
        recvphone: props.phone,
        recvemail: props.email || "",
        memo: props.memo || "",
        rebillCycleType: props.cycleType,
        rebillCycleMonth: props.cycleType === 'Month' ? props.cycleDay : "",
        rebillCycleWeek: props.cycleType === 'Week' ? props.cycleDay : "",
        rebillExpire: props.expireDate,
        var1: props.orderId || `REBILL_${Date.now()}`,
        var2: props.userId || "",
        openpaytype: props.paymentMethods || ""
      }

      console.log("PayApp 정기결제 등록 요청:", rebillRequest)

      // Railway 서버에 정기결제 등록 요청
      const response = await fetch(`${props.serverUrl}/api/payapp/rebill/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rebillRequest)
      })

      const result = await response.json()

      if (result.success && result.payUrl) {
        console.log("정기결제 등록 성공:", result)
        setRebillData(result)
        setStep('success')
        
        // PayApp 정기결제 승인창 열기
        window.open(result.payUrl, "_blank", "width=500,height=700")
      } else {
        throw new Error(result.message || "정기결제 등록에 실패했습니다.")
      }
    } catch (err: any) {
      console.error("PayApp 정기결제 오류:", err)
      setError(err.message || "정기결제 등록 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 정기결제 해지 함수
  const handleRebillCancel = async () => {
    if (!rebillData?.rebillNo) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${props.serverUrl}/api/payapp/rebill/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rebill_no: rebillData.rebillNo
        })
      })

      const result = await response.json()

      if (result.success) {
        console.log("정기결제 해지 성공")
        setRebillData(null)
        setStep('form')
        alert("정기결제가 해지되었습니다.")
      } else {
        throw new Error(result.message || "정기결제 해지에 실패했습니다.")
      }
    } catch (err: any) {
      console.error("정기결제 해지 오류:", err)
      setError(err.message || "정기결제 해지 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 정기결제 일시정지 함수
  const handleRebillStop = async () => {
    if (!rebillData?.rebillNo) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${props.serverUrl}/api/payapp/rebill/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rebill_no: rebillData.rebillNo
        })
      })

      const result = await response.json()

      if (result.success) {
        console.log("정기결제 일시정지 성공")
        alert("정기결제가 일시정지되었습니다.")
      } else {
        throw new Error(result.message || "정기결제 일시정지에 실패했습니다.")
      }
    } catch (err: any) {
      console.error("정기결제 일시정지 오류:", err)
      setError(err.message || "정기결제 일시정지 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 정기결제 재시작 함수
  const handleRebillStart = async () => {
    if (!rebillData?.rebillNo) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${props.serverUrl}/api/payapp/rebill/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rebill_no: rebillData.rebillNo
        })
      })

      const result = await response.json()

      if (result.success) {
        console.log("정기결제 재시작 성공")
        alert("정기결제가 재시작되었습니다.")
      } else {
        throw new Error(result.message || "정기결제 재시작에 실패했습니다.")
      }
    } catch (err: any) {
      console.error("정기결제 재시작 오류:", err)
      setError(err.message || "정기결제 재시작 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 주기 텍스트 생성
  const getCycleText = () => {
    switch (props.cycleType) {
      case 'Month':
        return `매월 ${props.cycleDay}일`
      case 'Week':
        const weekDays = ['월', '화', '수', '목', '금', '토', '일']
        return `매주 ${weekDays[props.cycleDay - 1]}요일`
      case 'Day':
        return '매일'
      default:
        return '주기 설정'
    }
  }

  // 폼 검증
  const isFormValid = () => {
    return props.productName && 
           props.amount && 
           props.phone && 
           props.cycleType && 
           props.expireDate &&
           (props.cycleType !== 'Month' || props.cycleDay) &&
           (props.cycleType !== 'Week' || props.cycleDay)
  }

  if (step === 'success') {
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
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 10px 0", color: props.textColor }}>
            🎉 정기결제 등록 완료!
          </h3>
          <p style={{ margin: "0", fontSize: "14px", color: props.textColor }}>
            PayApp에서 결제 승인을 완료해주세요.
          </p>
        </div>

        <div style={{ marginBottom: "20px", fontSize: "14px", color: props.textColor }}>
          <p><strong>상품:</strong> {props.productName}</p>
          <p><strong>금액:</strong> {props.amount.toLocaleString()}원</p>
          <p><strong>주기:</strong> {getCycleText()}</p>
          <p><strong>만료일:</strong> {props.expireDate}</p>
        </div>

        <button
          onClick={() => setStep('management')}
          style={{
            width: "200px",
            height: "40px",
            backgroundColor: props.buttonColor,
            color: props.buttonTextColor,
            border: "none",
            borderRadius: "20px",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "10px"
          }}
        >
          정기결제 관리
        </button>

        <button
          onClick={() => setStep('form')}
          style={{
            width: "200px",
            height: "40px",
            backgroundColor: "transparent",
            color: props.textColor,
            border: `2px solid ${props.buttonColor}`,
            borderRadius: "20px",
            fontSize: "14px",
            cursor: "pointer"
          }}
        >
          새 정기결제 등록
        </button>
      </div>
    )
  }

  if (step === 'management') {
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
        <h3 style={{ margin: "0 0 20px 0", color: props.textColor }}>
          정기결제 관리
        </h3>

        <div style={{ marginBottom: "20px", fontSize: "14px", color: props.textColor, textAlign: "center" }}>
          <p><strong>상품:</strong> {props.productName}</p>
          <p><strong>금액:</strong> {props.amount.toLocaleString()}원</p>
          <p><strong>주기:</strong> {getCycleText()}</p>
          <p><strong>등록번호:</strong> {rebillData?.rebillNo}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "200px" }}>
          <button
            onClick={handleRebillStop}
            disabled={isLoading}
            style={{
              height: "40px",
              backgroundColor: "#ff9800",
              color: "white",
              border: "none",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.5 : 1
            }}
          >
            일시정지
          </button>

          <button
            onClick={handleRebillStart}
            disabled={isLoading}
            style={{
              height: "40px",
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.5 : 1
            }}
          >
            재시작
          </button>

          <button
            onClick={handleRebillCancel}
            disabled={isLoading}
            style={{
              height: "40px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.5 : 1
            }}
          >
            해지
          </button>
        </div>

        <button
          onClick={() => setStep('form')}
          style={{
            width: "200px",
            height: "40px",
            backgroundColor: "transparent",
            color: props.textColor,
            border: `2px solid ${props.buttonColor}`,
            borderRadius: "20px",
            fontSize: "14px",
            cursor: "pointer",
            marginTop: "20px"
          }}
        >
          새 정기결제 등록
        </button>

        {error && (
          <div style={{ 
            marginTop: "15px", 
            padding: "10px", 
            backgroundColor: "#ffebee", 
            color: "#c62828", 
            borderRadius: "5px",
            fontSize: "12px",
            textAlign: "center",
            maxWidth: "250px"
          }}>
            {error}
          </div>
        )}
      </div>
    )
  }

  // 정기결제 등록 폼
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
      {/* 정기결제 정보 표시 */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <h3 style={{ margin: "0 0 10px 0", color: props.textColor }}>
          🔄 {props.productName}
        </h3>
        <p style={{ margin: "0", fontSize: "18px", fontWeight: "bold", color: props.textColor }}>
          {props.amount.toLocaleString()}원
        </p>
        <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: props.textColor }}>
          {getCycleText()}
        </p>
        {props.memo && (
          <p style={{ margin: "10px 0 0 0", fontSize: "12px", color: props.textColor }}>
            {props.memo}
          </p>
        )}
      </div>

      {/* 정기결제 등록 버튼 */}
      <button
        onClick={handleRebillRegister}
        disabled={isLoading || !isFormValid()}
        style={{
          width: "250px",
          height: "50px",
          backgroundColor: isLoading ? "#ccc" : props.buttonColor,
          color: props.buttonTextColor,
          border: "none",
          borderRadius: "25px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: isLoading ? "not-allowed" : "pointer",
          transition: "all 0.3s ease",
          opacity: (!isFormValid()) ? 0.5 : 1,
        }}
        onMouseOver={(e) => {
          if (!isLoading && isFormValid()) {
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
          textAlign: "center",
          maxWidth: "300px"
        }}>
          {error}
        </div>
      )}

      {/* 필수 필드 안내 */}
      {!isFormValid() && (
        <div style={{ 
          marginTop: "15px", 
          fontSize: "12px", 
          color: "#666",
          textAlign: "center"
        }}>
          {!props.productName && "상품명을 입력해주세요."}<br/>
          {!props.amount && "결제 금액을 설정해주세요."}<br/>
          {!props.phone && "휴대폰번호를 입력해주세요."}<br/>
          {!props.cycleType && "결제 주기를 선택해주세요."}<br/>
          {!props.expireDate && "만료일을 설정해주세요."}<br/>
          {props.cycleType === 'Month' && !props.cycleDay && "월 결제일을 선택해주세요."}<br/>
          {props.cycleType === 'Week' && !props.cycleDay && "주 결제요일을 선택해주세요."}
        </div>
      )}

      {/* 정기결제 정보 (개발용) */}
      {props.showDebugInfo && (
        <div style={{ 
          marginTop: "20px", 
          padding: "10px", 
          backgroundColor: "#f5f5f5", 
          borderRadius: "5px",
          fontSize: "12px",
          textAlign: "left",
          maxWidth: "300px"
        }}>
          <strong>정기결제 설정:</strong><br/>
          주기: {props.cycleType}<br/>
          결제일: {props.cycleDay}<br/>
          만료일: {props.expireDate}<br/>
          결제수단: {props.paymentMethods || "전체"}
        </div>
      )}
    </div>
  )
}

// Framer 프로퍼티 컨트롤 설정
addPropertyControls(PayAppRebillCodeComponent, {
  // 서버 설정
  serverUrl: {
    title: "서버 URL",
    type: ControlType.String,
    defaultValue: "https://payapp-backend-production.up.railway.app",
    description: "Railway에 배포된 서버 URL"
  },

  // 정기결제 정보
  productName: {
    title: "상품명",
    type: ControlType.String,
    defaultValue: "PlusMinus Zero 정기결제",
    description: "정기결제할 상품명"
  },
  
  amount: {
    title: "결제 금액",
    type: ControlType.Number,
    defaultValue: 10000,
    min: 100,
    max: 10000000,
    description: "정기결제할 금액 (원)"
  },
  
  phone: {
    title: "휴대폰번호",
    type: ControlType.String,
    defaultValue: "01012345678",
    description: "결제자 휴대폰번호 (하이픈 없이)"
  },
  
  email: {
    title: "이메일",
    type: ControlType.String,
    defaultValue: "",
    description: "결제자 이메일 (선택사항)"
  },
  
  memo: {
    title: "메모",
    type: ControlType.String,
    defaultValue: "",
    description: "정기결제 메모 (선택사항)"
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

  // 정기결제 설정
  cycleType: {
    title: "결제 주기",
    type: ControlType.Enum,
    defaultValue: "Month",
    options: ["Month", "Week", "Day"],
    optionTitles: ["매월", "매주", "매일"],
    description: "정기결제 주기"
  },
  
  cycleDay: {
    title: "결제일/요일",
    type: ControlType.Number,
    defaultValue: 1,
    min: 1,
    max: 31,
    description: "월: 1-31일, 주: 1-7(월-일), 일: 무시"
  },
  
  expireDate: {
    title: "만료일",
    type: ControlType.String,
    defaultValue: "2025-12-31",
    description: "정기결제 만료일 (YYYY-MM-DD)"
  },
  
  paymentMethods: {
    title: "결제수단",
    type: ControlType.String,
    defaultValue: "",
    description: "card(신용카드), phone(휴대폰) 또는 비워두면 전체"
  },

  // 버튼 설정
  buttonText: {
    title: "버튼 텍스트",
    type: ControlType.String,
    defaultValue: "정기결제 등록하기",
    description: "정기결제 등록 버튼에 표시될 텍스트"
  },
  
  buttonColor: {
    title: "버튼 색상",
    type: ControlType.Color,
    defaultValue: "#007bff",
    description: "정기결제 버튼 배경색"
  },
  
  buttonTextColor: {
    title: "버튼 글자색",
    type: ControlType.Color,
    defaultValue: "#ffffff",
    description: "정기결제 버튼 글자색"
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
  showDebugInfo: {
    title: "디버그 정보 표시",
    type: ControlType.Boolean,
    defaultValue: false,
    description: "개발용 디버그 정보 표시"
  }
})

// 기본 내보내기
export default PayAppRebillCodeComponent
