"use client";
import { useState, useEffect, useRef } from "react";
import { auth, provider, db } from "../firebase"; 
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, orderBy, getDoc, setDoc } from "firebase/firestore";

// --- [컴포넌트 1: 시장 상황 게이지] ---
const MarketGauge = ({ status, emoji, theme }) => {
  const statusScore = { "공포 (Fear)": 30, "주의 (Caution)": 50 };
  const score = statusScore[status] || 50; 
  const angle = (score / 100 * 180) - 90;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px 0' }}>
      <svg width="240" height="130" viewBox="0 0 240 130">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff3b30" /> 
            <stop offset="30%" stopColor="#ff9500" /> 
            <stop offset="70%" stopColor="#ffcc00" /> 
            <stop offset="100%" stopColor="#34c759" /> 
          </linearGradient>
        </defs>
        <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="url(#gaugeGradient)" strokeWidth="18" strokeLinecap="butt" />
        {[-45, 0, 45].map((sepAngle) => (
          <line key={sepAngle} x1="120" y1="10" x2="120" y2="30" stroke={theme.bg} strokeWidth="3" transform={`rotate(${sepAngle} 120 120)`} />
        ))}
        <text x="20" y="145" fontSize="12" fill={theme.subText} textAnchor="middle" fontWeight="bold">공포</text>
        <text x="220" y="145" fontSize="12" fill={theme.subText} textAnchor="middle" fontWeight="bold">탐욕</text>
        <g transform={`translate(120, 120) rotate(${angle})`}>
          <path d="M -5 0 L 0 -105 L 5 0 Z" fill={theme.text} />
          <circle cx="0" cy="0" r="8" fill={theme.text} />
        </g>
      </svg>
      <div style={{ marginTop: -30, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 45, marginBottom: 0, lineHeight: 1 }}>{emoji}</div>
          <div style={{ fontWeight: 'bold', fontSize: 18, color: theme.text, marginTop: 10 }}>{status}</div>
      </div>
    </div>
  );
};

// --- [컴포넌트 2: CNN 스타일 차트] ---
const TradingViewChart = ({ theme }) => {
  const chartContainerId = "tradingview_widget_container";

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const script = document.createElement("script");
        script.src = src; script.async = true;
        script.onload = resolve; script.onerror = reject;
        document.head.appendChild(script);
      });
    };
    loadScript("https://s3.tradingview.com/tv.js").then(() => {
      if (window.TradingView) {
        new window.TradingView.widget({
          "width": "100%", "height": 350, "symbol": "NASDAQ:QQQ", "interval": "D",
          "timezone": "Asia/Seoul", "theme": "dark", "style": "3", "locale": "kr",
          "toolbar_bg": "#000000", "enable_publishing": false, "hide_top_toolbar": true,    
          "hide_side_toolbar": true, "hide_legend": false, "save_image": false,
          "container_id": chartContainerId, "backgroundColor": "#000000", 
          "gridLineColor": "rgba(42, 46, 57, 0.3)", "scalePosition": "right", "scaleMode": "Normal",
        });
      }
    });
  }, []);

  return (
    <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 0, marginLeft: 0, marginRight: 0, position: 'relative', backgroundColor: '#000000', borderRadius: 16, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
      <div id={chartContainerId} style={{ height: "350px" }} />
    </div>
  );
};

// --- [컴포넌트 3: 상단 네비게이션 & 햄버거 메뉴] ---
const TopNav = ({ user, handleLogin, handleLogout, theme }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', backgroundColor: theme.card, borderBottom: `1px solid ${theme.border}`, position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>🥚 InvestLogic</div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {user ? <button onClick={handleLogout} style={{ padding:'6px 12px', fontSize:12, backgroundColor: theme.bg, color: theme.text, border:`1px solid ${theme.border}`, borderRadius:4, cursor:'pointer' }}>로그아웃</button> 
              : <button onClick={handleLogin} style={{ padding:'6px 12px', fontSize:12, backgroundColor:'#4285F4', color:'white', border:'none', borderRadius:4, fontWeight:'bold', cursor:'pointer' }}>로그인</button>}
        
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: theme.text }}>
          ☰
        </button>
      </div>

      {isMenuOpen && (
        <div style={{ position: 'absolute', top: '60px', right: '20px', width: '200px', backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div onClick={() => window.location.href='/'} style={{ padding: '12px 15px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', color: theme.text, fontWeight: 'bold' }}>🏠 홈 (분할계산기)</div>
          <div onClick={() => window.location.href='/stocklab'} style={{ padding: '12px 15px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', color: theme.text }}>🔍 종목탐구 LAB</div>
          <div style={{ padding: '12px 15px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', color: theme.text }}>💎 PRO 등급 안내</div>
          <div style={{ padding: '12px 15px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', color: theme.text }}>⚙️ 마이페이지</div>
          <div onClick={() => window.location.href='/admin'} style={{ padding: '12px 15px', cursor: 'pointer', color: theme.subText, fontSize: 12 }}>🔒 어드민 센터</div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userTier, setUserTier] = useState("FREE"); 
  const theme = { bg: "#F2F2F7", card: "#FFFFFF", text: "#000000", subText: "#6e6e73", border: "#d1d1d6", inputBg: "#F2F2F7" };

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.style.backgroundColor = theme.bg;
      document.body.style.margin = "0";
    }
  }, [theme.bg]);

  const [totalCapital, setTotalCapital] = useState(100000000); 
  const [stockSettings, setStockSettings] = useState({
    "SOXL": { percent: 100, currentPrice: 30 }, "TQQQ": { percent: 100, currentPrice: 55 },
  });
  const [symbol, setSymbol] = useState("SOXL"); 
  
  const [tradeHistory, setTradeHistory] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState("");

  const marketTemplates = { "공포": { status: "공포 (Fear)", emoji: "🥶", ratios: [4, 4, 4, 8, 8, 8, 12, 12, 20, 20], drops: [0, 0.05, 0.10, 0.15, 0.20, 0.28, 0.33, 0.38, 0.43, 0.48] } };
  const currentMarket = marketTemplates["공포"];

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser); 
      setLoading(false);
      setUserTier("FREE"); 

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
           await setDoc(userRef, { 
             uid: currentUser.uid, 
             email: currentUser.email, // 🔥 이제 파이어베이스 콘솔에서 이메일이 바로 보입니다.
             tier: "FREE", 
             createdAt: new Date().toISOString() 
           });
           setUserTier("FREE");
        } else {
           setUserTier(userSnap.data().tier || "FREE");
        }

        const q = query(collection(db, "trades"), where("uid", "==", currentUser.uid), orderBy("date", "desc"));
        const unsubscribeDb = onSnapshot(q, (snapshot) => { setTradeHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
        return () => unsubscribeDb();
      } else { 
        setTradeHistory([]); 
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) {} };
  const handleLogout = () => { signOut(auth); };

  const getPlanData = () => {
    const mySetting = stockSettings[symbol] || { percent: 0, currentPrice: 0 };
    const allocatedBudget = (totalCapital * mySetting.percent) / 100;
    const basePrice = mySetting.currentPrice;

    return currentMarket.ratios.map((percent, index) => {
      const dropRate = currentMarket.drops[index] || 0;
      const targetPrice = basePrice * (1 - dropRate); 
      const amount = (allocatedBudget * percent) / 100; 
      const qty = targetPrice > 0 ? amount / targetPrice : 0;
      const isExecuted = tradeHistory.some(t => t.symbol === symbol && t.round === (index + 1) && t.type === 'buy');

      let accumAmount = 0; let accumQty = 0; let prevAccumAmount = 0; let prevAccumQty = 0;
      for (let i = 0; i <= index; i++) {
         const pRate = currentMarket.drops[i] || 0; const pPrice = basePrice * (1 - pRate);
         const pAmt = (allocatedBudget * currentMarket.ratios[i]) / 100;
         accumAmount += pAmt; accumQty += (pPrice > 0 ? pAmt / pPrice : 0);
         if (i < index) { prevAccumAmount += pAmt; prevAccumQty += (pPrice > 0 ? pAmt / pPrice : 0); }
      }
      const avgPrice = accumQty > 0 ? accumAmount / accumQty : 0;
      const prevAvgPrice = prevAccumQty > 0 ? prevAccumAmount / prevAccumQty : basePrice;
      const improvement = prevAvgPrice > 0 ? ((prevAvgPrice - avgPrice) / prevAvgPrice * 100) : 0;

      return { turn: index + 1, dropRate: dropRate, targetPrice: targetPrice, percent: percent, amount: amount, expectedQty: qty, expectedAvg: avgPrice, improvement: improvement.toFixed(1), isExecuted: isExecuted };
    });
  };

  const buyPlan = getPlanData();
  const mySetting = stockSettings[symbol];
  const allocatedBudget = (totalCapital * mySetting.percent) / 100;

  const myTrades = tradeHistory.filter(t => t.symbol === symbol && t.type === 'buy');
  const totalInvested = myTrades.reduce((acc, cur) => acc + cur.amount, 0);
  const totalQty = myTrades.reduce((acc, cur) => acc + (cur.qty || 0), 0);
  const realAvgPrice = totalQty > 0 ? totalInvested / totalQty : 0;
  
  const executedRounds = myTrades.map(t => t.round);
  const currentRound = executedRounds.length > 0 ? Math.max(...executedRounds) : 0;
const nextPlan = buyPlan.find(p => p.turn === currentRound + 1);
  const nextTargetPrice = nextPlan ? nextPlan.targetPrice : null;

  // 🔥 PRO 전략 적용 시뮬레이션 수치
  const finalFreeAvg = buyPlan.length > 0 ? buyPlan[buyPlan.length - 1].expectedAvg : 0;
  const proAvg = finalFreeAvg * 0.944;

  const updateStockSetting = (key, value) => { setStockSettings(prev => ({ ...prev, [symbol]: { ...prev[symbol], [key]: Number(value) } })); };

  const toggleExecution = async (planItem) => {
    // 🔥 비회원일 경우 명확한 알림창 노출
    if (!user) { alert("기록 저장은 로그인 후 가능합니다."); return; }
    if (planItem.isExecuted) { alert("이미 실행된 회차입니다."); return; }
    if (confirm(`${symbol} ${planItem.turn}회차 (목표가: ${Math.floor(planItem.targetPrice).toLocaleString()}) 기록하시겠습니까?`)) {
      try { await addDoc(collection(db, "trades"), { uid: user.uid, symbol: symbol, type: "buy", round: planItem.turn, amount: Math.floor(planItem.amount), price: Number(planItem.targetPrice.toFixed(2)), qty: Number(planItem.expectedQty.toFixed(4)), date: new Date().toISOString(), memo: "자동등록됨" }); } catch (e) { alert("저장 실패"); }
    }
  };

  const deleteTrade = async (id) => { if(confirm("삭제?")) await deleteDoc(doc(db, "trades", id)); };
  
  const saveEdit = async (trade) => {
    if (!editPrice || isNaN(editPrice)) return alert("가격 확인 필요");
    const priceNum = Number(editPrice); const calculatedQty = priceNum > 0 ? trade.amount / priceNum : 0;
    await updateDoc(doc(db, "trades", trade.id), { price: priceNum, qty: calculatedQty });
    setEditingId(null);
  };

  const styles = getStyles(theme);

  if (loading) return <div style={styles.loading}>⏳ 로딩 중...</div>;

  return (
    <>
      <style>{`
        .responsive-layout { 
          display: grid; 
          grid-template-columns: 1fr; 
          gap: 20px; 
          max-width: 1200px; 
          margin: 0 auto; 
          padding: 20px; 
          grid-template-areas: 
            "controls" 
            "main" 
            "chart"; 
        }
        .grid-controls { grid-area: controls; }
        .grid-main { grid-area: main; min-width: 0; }
        .grid-chart { grid-area: chart; }

        @media (min-width: 768px) { 
          .responsive-layout { 
            grid-template-columns: 400px 1fr; 
            grid-template-rows: max-content 1fr;
            align-items: start;
            column-gap: 20px; 
            row-gap: 5px;
            grid-template-areas: 
              "controls main" 
              "chart main"; 
          } 
        }
      `}</style>

      <TopNav user={user} handleLogin={handleLogin} handleLogout={handleLogout} theme={theme} />

      <div className="responsive-layout" style={{ fontFamily: '-apple-system, sans-serif' }}>
        
        {/* ================= 1. 컨트롤 영역 ================= */}
        <div className="grid-controls">
          <div style={styles.gaugeSection}>
               <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 'bold', color: theme.text, marginTop: 5 }}>
                   오늘 시장 구간: <span style={{color: '#3b82f6'}}>Z2 (공포)</span> / 전략: 3~5차 대기
               </div>
               <MarketGauge status={currentMarket.status} emoji={currentMarket.emoji} theme={theme} />
          </div>

          <div style={styles.capitalBox}>
            <label style={{color: theme.subText, fontSize:12}}>나의 총 투자 원금 (Total Capital)</label>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
               <span style={{fontSize:20, fontWeight:'bold', color: theme.text}}>₩</span>
               <input type="text" value={totalCapital.toLocaleString()} onChange={(e) => { const val = e.target.value.replaceAll(',', ''); if(!isNaN(val)) setTotalCapital(Number(val)); }} style={styles.capitalInput} />
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.tabContainer}>
                {Object.keys(stockSettings).map((t) => (
                    <button key={t} onClick={() => setSymbol(t)} style={symbol === t ? styles.activeTab : styles.tab}>{t}</button>
                ))}
            </div>
            <div style={styles.controlGrid}>
                <div style={styles.controlItem}>
                    <label style={{color: theme.text}}>이 종목 비중 (%)</label>
                    <div style={{display:'flex', alignItems:'center'}}>
                        <input type="number" value={mySetting.percent} onChange={(e) => updateStockSetting('percent', e.target.value)} style={styles.smallInput} />
                        <span style={{marginLeft:5, color: theme.text}}>%</span>
                    </div>
                </div>
                <div style={styles.controlItem}>
                    <label style={{color: theme.text}}>배정된 투자금</label>
                    <div style={{color:'#30d158', fontWeight:'bold', fontSize:18}}>
                        {Math.floor(allocatedBudget).toLocaleString()} <span style={{fontSize:12}}>원</span>
                    </div>
                </div>
            </div>
            <div style={{...styles.controlItem, marginTop:10}}>
                <label style={{color: theme.text}}>현재 기준 가격 (Start Price)</label>
                <input type="number" value={mySetting.currentPrice} onChange={(e) => updateStockSetting('currentPrice', e.target.value)} style={styles.fullInput} placeholder="현재가 입력" />
            </div>
          </div>
        </div>

        {/* ================= 2. 메인 표 영역 ================= */}
        <div className="grid-main">
          <div style={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: theme.bg, padding: '10px 15px', borderRadius: 8, marginBottom: 15, fontSize: 12, border: `1px solid ${theme.border}` }}>
                <div style={{textAlign: 'center'}}><div style={{color: theme.subText, marginBottom: 2}}>진입 회차</div><div style={{fontWeight: 'bold', color: theme.text}}>{!user ? "-" : `${currentRound}차 완료`}</div></div>
                <div style={{textAlign: 'center'}}><div style={{color: theme.subText, marginBottom: 2}}>누적 평단가</div><div style={{fontWeight: 'bold', color: '#30d158'}}>{!user ? "-" : (realAvgPrice > 0 ? `$${realAvgPrice.toLocaleString(undefined, {maximumFractionDigits:2})}` : "-")}</div></div>
                <div style={{textAlign: 'center'}}><div style={{color: theme.subText, marginBottom: 2}}>다음 진입가</div><div style={{fontWeight: 'bold', color: '#ff453a'}}>{!user ? "-" : (nextTargetPrice > 0 ? `$${nextTargetPrice.toLocaleString(undefined, {maximumFractionDigits:1})}` : "대기")}</div></div>
            </div>

            <div style={{...styles.sectionHeader, marginBottom: 10}}><h3 style={{color: theme.text}}>📉 매수 플랜 상세</h3></div>

            <div style={styles.tableScroll}>
                <div style={{ position: 'relative' }}>
                    <div style={styles.tableHeader}>
                        <div style={{width:40}}>실행</div><div style={{width:50}}>회차</div><div style={{width:60}}>하락%</div><div style={{width:80, color:'#81b0ff'}}>목표가</div><div style={{width:50}}>비중</div><div style={{width:100, textAlign:'right'}}>매수금액</div><div style={{width:80, textAlign:'right', color: theme.subText}}>예상평단</div>
                    </div>
                    
                    {buyPlan.map((plan, index) => {
                        {/* 🔥 블러 처리 삭제: 누구나 10차까지 선명하게 볼 수 있음 */}
                        const rowStyle = plan.isExecuted ? styles.rowExecuted : styles.row;

                        return (
                            <div key={plan.turn} style={rowStyle}>
                                <div style={{width:40}}>
                                    <input type="checkbox" checked={plan.isExecuted} onChange={() => toggleExecution(plan)} style={{cursor: 'pointer', width: '20px', height: '20px', accentColor: '#30d158'}} />
                                </div>
                                <div style={{width:50, color: theme.text}}>{plan.turn}차</div>
                                <div style={{width:60, color:'#ff453a'}}>{(plan.dropRate * 100).toFixed(0)}%</div>
                                <div style={{width:80, color:'#81b0ff', fontWeight:'bold'}}>{plan.targetPrice > 0 ? plan.targetPrice.toLocaleString(undefined, {maximumFractionDigits:1}) : "-"}</div>
                                <div style={{width:50, fontSize:12, color: theme.text}}>{plan.percent}%</div>
                                <div style={{width:100, textAlign:'right', fontWeight:'bold', color: theme.text}}>{Math.floor(plan.amount).toLocaleString()}</div>
                                <div style={{width:80, textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
                                    <span style={{color: theme.subText, fontSize: 12}}>{plan.expectedAvg.toLocaleString(undefined, {maximumFractionDigits:1})}</span>
                                    {plan.improvement > 0 && !plan.isExecuted && <span style={{color: '#30d158', fontSize: 10, fontWeight: 'bold'}}>↓ {plan.improvement}% 개선</span>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            
            <div style={styles.totalBar}>
                 <span style={{color: theme.text}}>총 매수 운영금 합계</span>
                 <span style={{fontSize:18, color:'#30d158'}}>{user ? totalInvested.toLocaleString() : 0} 원</span>
            </div>

            {/* 🔥 1. 비회원 전용: 기록 저장 로그인 유도 뷰 */}
            {!user && (
                <div style={{ textAlign: 'center', backgroundColor: '#fff3cd', padding: '12px', borderRadius: 8, marginTop: 15, border: '1px solid #ffeeba', cursor: 'pointer' }} onClick={handleLogin}>
                    <span style={{color: '#856404', fontSize: 13, fontWeight: 'bold'}}>🔒 기록 저장 및 나의 세팅을 유지하려면 로그인하세요. (무료)</span>
                </div>
            )}

            {/* 🔥 2. 비회원 & FREE 회원 공통: PRO 전략 엔진 티저 박스 */}
            {userTier !== 'PRO' && (
                <div style={{ backgroundColor: '#f5f3ff', padding: '18px', borderRadius: 8, marginTop: 15, border: '1px solid #ddd6fe', cursor: 'pointer' }} onClick={() => !user ? handleLogin() : alert('PRO 결제 안내 페이지로 이동합니다.')}>
                    <div style={{ fontSize: 15, color: '#6d28d9', fontWeight: 'bold', marginBottom: 10 }}>
                        💎 PRO 전략 엔진 활성화 🔒
                    </div>
                    <div style={{ fontSize: 13, color: '#4c1d95', marginBottom: 12, lineHeight: '1.6' }}>
                        • 하락장 자동 방어<br/>
                        • 상승장 자동 비율 조정
                    </div>

                    {/* 🔥 비회원 (로그인 전): 실제 방어 차이 확인으로 호기심 자극 */}
                    {!user && (
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.5)', padding: '12px', borderRadius: 6, marginBottom: 10, textAlign: 'center' }}>
                            <div style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 'bold' }}>
                                🔒 로그인하면 실제 방어 차이 즉시 확인
                            </div>
                        </div>
                    )}
                    
                    {/* 🔥 로그인한 FREE 회원: 추가 방어 확보라는 감정적 베네핏 강조 */}
                    {user && (
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.5)', padding: '10px', borderRadius: 6, marginBottom: 10 }}>
                            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                                📊 현재 기본 전략 예상 평단 : <span style={{fontWeight: 'bold', color: theme.text}}>${finalFreeAvg.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 'bold' }}>
                                ✨ PRO 전략 적용 시 평단 : ${proAvg.toLocaleString(undefined, {maximumFractionDigits:2})} (↓ 5.6% 추가 방어 확보)
                            </div>
                        </div>
                    )}

                    <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 'bold', textAlign: 'right' }}>
                        {!user ? "👉 로그인 후 실제 전략 비교 가능" : "👉 폭락장 자동 방어 모드 켜기"}
                    </div>
                </div>
            )}

            {/* 🔥 3. 시스템 철학 안내 (간격을 30px로 띄워서 PRO 박스와 시각적 분리) */}
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: '#166534', backgroundColor: '#dcfce7', padding: '10px', borderRadius: 8, marginTop: 30, border: '1px solid #bbf7d0' }}>
                💡 하락장 누적 평단가를 최대 60%까지 낮추도록 설계된 시스템입니다.
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}><h3 style={{color: theme.text}}>💰 {symbol} 실제 매수 기록</h3></div>
            {tradeHistory.filter(t => t.symbol === symbol).map((trade) => (
                <div key={trade.id} style={styles.historyItem}>
                     {editingId === trade.id ? (
                        <div style={{display:'flex', gap:5}}>
                            <input type="number" value={editPrice} onChange={(e)=>setEditPrice(e.target.value)} style={styles.smallInput} />
                            <button onClick={()=>saveEdit(trade)} style={styles.saveBtn}>저장</button>
                        </div>
                     ) : (
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                            <div>
                                <span style={{fontWeight:'bold', marginRight:10, color: theme.text}}>{trade.round}차</span>
                                <span style={{color: theme.subText}}>{trade.amount.toLocaleString()}원</span>
                                <span style={{fontSize:12, color: theme.subText, marginLeft:5}}>(@ {trade.price})</span>
                            </div>
                            <div style={{display:'flex', gap:5}}>
                                 <button onClick={()=>{setEditingId(trade.id); setEditPrice(trade.price);}} style={styles.editBtn}>수정</button>
                                 <button onClick={()=>deleteTrade(trade.id)} style={styles.delBtn}>삭제</button>
                            </div>
                        </div>
                     )}
                </div>
            ))}
          </div>
        </div>

        {/* ================= 3. 차트 영역 ================= */}
        <div className="grid-chart">
          <TradingViewChart theme={theme} />
          <div style={{ textAlign: 'center', fontSize: 11, color: theme.subText, marginTop: 8 }}>※ 본 차트는 Invesco QQQ ETF의 15분 지연 데이터입니다.</div>
        </div>

      </div>
    </>
  );
}

const getStyles = (theme) => ({
  loading: { display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', backgroundColor: theme.bg, color: theme.text },
  gaugeSection: { marginBottom: 20, padding: 15, paddingBottom: 0, overflow:'hidden', backgroundColor: theme.card, borderRadius: 15, border: `1px solid ${theme.border}` },
  capitalBox: { marginBottom: 20, backgroundColor: theme.card, padding:15, borderRadius:12, border:`1px solid ${theme.border}`, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  capitalInput: { background:'transparent', border:'none', color: theme.text, fontSize:24, fontWeight:'bold', width:'100%', outline:'none' },
  section: { marginBottom: 20, backgroundColor: theme.card, padding:15, borderRadius:15, border:`1px solid ${theme.border}`, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  sectionHeader: { marginBottom:15, borderBottom:`1px solid ${theme.border}`, paddingBottom:10 },
  tabContainer: { display:'flex', gap:5, marginBottom: 15 },
  tab: { flex:1, padding: '10px', backgroundColor: theme.bg, border:`1px solid ${theme.border}`, color: theme.subText, borderRadius: 8, cursor:'pointer' },
  activeTab: { flex:1, padding: '10px', backgroundColor:'#0a84ff', border:'none', color:'white', borderRadius: 8, fontWeight:'bold' },
  controlGrid: { display:'flex', gap:10, marginBottom:10 },
  controlItem: { flex:1, backgroundColor: theme.bg, padding:10, borderRadius:8, border:`1px solid ${theme.border}` },
  smallInput: { width:'60px', padding:8, borderRadius:4, border:`1px solid ${theme.border}`, textAlign:'center', fontWeight:'bold', fontSize:16, backgroundColor: theme.card, color: theme.text },
  fullInput: { width:'100%', padding:10, borderRadius:6, border:`1px solid ${theme.border}`, backgroundColor: theme.card, color: theme.text, fontSize:16, fontWeight:'bold', marginTop:5 },
  tableScroll: { overflowX:'hidden' },
  tableHeader: { display:'flex', fontSize:11, color: theme.subText, paddingBottom:8, borderBottom:`1px solid ${theme.border}`, minWidth: 0 },
  row: { display:'flex', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${theme.border}`, fontSize:13, minWidth: 0 },
  rowExecuted: { display:'flex', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${theme.border}`, fontSize:13, opacity: 0.4, minWidth: 0 },
  totalBar: { display:'flex', justifyContent:'space-between', marginTop:15, paddingTop:15, borderTop:`1px solid ${theme.border}`, fontWeight:'bold' },
  historyItem: { backgroundColor: theme.bg, padding:12, borderRadius:8, marginBottom:8, border:`1px solid ${theme.border}` },
  editBtn: { padding:'4px 8px', backgroundColor:'#4285F4', color:'white', border:'none', borderRadius:4, fontSize:11, cursor:'pointer' },
  delBtn: { padding:'4px 8px', backgroundColor:'#ff453a', color:'white', border:'none', borderRadius:4, fontSize:11, cursor:'pointer' },
  saveBtn: { padding:'4px 8px', backgroundColor:'#30d158', color:'black', border:'none', borderRadius:4, fontSize:11, cursor:'pointer', fontWeight:'bold' }
});