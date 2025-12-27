"use client";
import { useState, useEffect } from "react";
import { auth, provider, db } from "../firebase"; 
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, orderBy } from "firebase/firestore";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 1. 사용자 입력값
  const [symbol, setSymbol] = useState("TQQQ"); 
  const [seedMoney, setSeedMoney] = useState(10000000); 
  
  // 2. 정산 데이터 (매수/매도 내역)
  const [tradeHistory, setTradeHistory] = useState([]);

  // --- [관리자(Admin) 설정: 시장 상태별 템플릿] ---
  const marketTemplates = {
    "공포": {
      status: "공포 (Fear)",
      level: "orange",
      icon: "🥶",
      color: "#fd7e14",
      desc: "지하실이 있을 수 있습니다. 초반은 정찰병만 보내고(4%), 9~10차에 승부를 거세요.",
      // 10분할, 후반 집중형 배열
      ratios: [4, 4, 4, 8, 8, 8, 12, 12, 20, 20] 
    },
    "주의": {
      status: "주의 (Caution)",
      level: "yellow",
      icon: "🤔",
      color: "#fcc419",
      desc: "방향성이 모호합니다. 8분할로 넓게 그물을 치세요.",
      // 8분할, 중반 비중 확대
      ratios: [8, 8, 12, 12, 12, 16, 16, 16]
    }
  };

  // 현재 적용된 시장 상태
  const currentMarket = marketTemplates["공포"];

  // --- [Firebase 연동] ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        const q = query(
          collection(db, "trades"), 
          where("uid", "==", currentUser.uid),
          orderBy("date", "desc")
        );
        const unsubscribeDb = onSnapshot(q, (snapshot) => {
          const trades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTradeHistory(trades);
        });
        return () => unsubscribeDb();
      } else {
        setTradeHistory([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) {} };
  const handleLogout = () => { signOut(auth); };

  // --- [핵심 기능 1: 계산기 로직] ---
  const generatePlan = () => {
    const plan = [];
    const ratios = currentMarket.ratios;
    let accumPercent = 0;

    ratios.forEach((percent, index) => {
      const amount = (seedMoney * percent) / 100;
      accumPercent += percent;
      
      const isExecuted = tradeHistory.some(
        t => t.symbol === symbol && t.round === (index + 1) && t.type === 'buy'
      );

      plan.push({
        turn: index + 1,
        percent: percent,
        amount: amount,
        accumPercent: accumPercent,
        isExecuted: isExecuted
      });
    });
    return plan;
  };

  const buyPlan = generatePlan();

  // --- [핵심 기능 2: 체크박스 연동 (A안)] ---
  const toggleExecution = async (planItem) => {
    if (!user) { alert("로그인이 필요한 기능입니다."); return; }

    if (planItem.isExecuted) {
      alert("이미 정산 내역에 등록된 회차입니다. 취소하려면 아래 정산표에서 삭제하세요.");
      return;
    }

    if (confirm(`${symbol} ${planItem.turn}회차 매수 기록을 정산에 등록하시겠습니까?`)) {
      try {
        await addDoc(collection(db, "trades"), {
          uid: user.uid,
          symbol: symbol,
          type: "buy", 
          round: planItem.turn,
          amount: Math.floor(planItem.amount), 
          price: 0, 
          qty: 0,   
          date: new Date().toISOString(),
          memo: "자동등록됨"
        });
      } catch (e) {
        console.error("저장 실패", e);
        alert("저장 중 오류가 발생했습니다.");
      }
    }
  };

  const deleteTrade = async (id) => {
    if (confirm("이 내역을 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "trades", id));
    }
  };

  const totalBuy = tradeHistory.filter(t => t.type === 'buy').reduce((acc, cur) => acc + cur.amount, 0);

  if (loading) return <div style={styles.loading}>⏳ 시스템 로딩 중...</div>;

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <div style={styles.logo}>🥚 나스닥 다마고치</div>
        {user ? <button onClick={handleLogout} style={styles.smallBtn}>로그아웃</button> 
              : <button onClick={handleLogin} style={styles.loginBtn}>로그인</button>}
      </div>

      {/* [A] 상단: 시장 상태 카드 */}
      <div style={{...styles.heroCard, borderColor: currentMarket.color}}>
        <div style={{fontSize: 50, marginBottom:10}}>{currentMarket.icon}</div>
        <div style={{color: currentMarket.color, fontWeight:'bold', fontSize:20}}>{currentMarket.status}</div>
        <div style={styles.descBox}>
           💡 <strong>전략 가이드:</strong> {currentMarket.desc}
        </div>
      </div>

      {/* [B] 중단: 분할매수 계산기 */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
            <h3>🧮 전략 계산기</h3>
            <div style={styles.badge}>추천: {currentMarket.ratios.length}분할</div>
        </div>

        <div style={{marginBottom: 20}}>
            <div style={styles.tabContainer}>
                {["TQQQ", "SOXL", "BTC", "ETH"].map((t) => (
                    <button key={t} onClick={() => setSymbol(t)} style={symbol === t ? styles.activeTab : styles.tab}>{t}</button>
                ))}
            </div>
            <label style={{fontSize:12, color:'#888'}}>총 투자 원금</label>
            <input 
                type="text" 
                value={seedMoney.toLocaleString()} 
                onChange={(e) => {
                   const val = e.target.value.replaceAll(',', '');
                   if(!isNaN(val)) setSeedMoney(Number(val));
                }}
                style={styles.input}
            />
        </div>

        {/* 회차 리스트 */}
        <div style={styles.listContainer}>
            <div style={styles.listHeader}>
                <div style={{flex:1}}>실행</div>
                <div style={{flex:1}}>회차</div>
                <div style={{flex:1}}>비중</div>
                <div style={{flex:2, textAlign:'right'}}>매수금액</div>
            </div>
            
            {buyPlan.map((plan) => (
                <div key={plan.turn} style={plan.isExecuted ? styles.rowExecuted : styles.row}>
                    <div style={{flex:1}}>
                        <input 
                            type="checkbox" 
                            checked={plan.isExecuted} 
                            onChange={() => toggleExecution(plan)}
                            style={{cursor:'pointer', width:18, height:18}}
                        />
                    </div>
                    <div style={{flex:1, color: plan.isExecuted ? '#666' : 'white'}}>
                        {plan.turn}차
                    </div>
                    <div style={{flex:1, fontSize:12, color:'#888'}}>
                        {plan.percent}%
                    </div>
                    <div style={{flex:2, textAlign:'right', fontWeight:'bold', color: plan.isExecuted ? '#666' : 'white'}}>
                        {Math.floor(plan.amount).toLocaleString()}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* [C] 하단: 정산 시스템 */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
            <h3>💰 내 정산 내역 (ERP)</h3>
            {!user && <span style={{fontSize:12, color:'#ff6b6b'}}>로그인 필요</span>}
        </div>

        {user ? (
            <>
                <div style={styles.summaryBox}>
                    <span>총 매수 운영금</span>
                    <span style={{fontSize:18, fontWeight:'bold', color:'#30d158'}}>
                        {totalBuy.toLocaleString()} 원
                    </span>
                </div>

                <div style={styles.historyList}>
                    {tradeHistory.length === 0 ? (
                        <p style={{textAlign:'center', color:'#666', padding:20}}>
                            위 계산기에서 체크(✅)하면<br/>자동으로 여기에 기록됩니다.
                        </p>
                    ) : (
                        tradeHistory.map((trade) => (
                            <div key={trade.id} style={styles.historyItem}>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:5}}>
                                    <span style={{fontWeight:'bold', color:'white'}}>
                                        {trade.symbol} {trade.round}차
                                    </span>
                                    <span style={{fontSize:12, color:'#888'}}>
                                        {new Date(trade.date).toLocaleDateString()}
                                    </span>
                                </div>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span style={{color:'#ccc'}}>
                                        {trade.amount.toLocaleString()} 원
                                    </span>
                                    <button onClick={() => deleteTrade(trade.id)} style={styles.delBtn}>삭제</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </>
        ) : (
            <div style={styles.loginBlur}>
                <p>로그인하면 매매일지가 자동 생성됩니다.</p>
                <button onClick={handleLogin} style={styles.ctaBtnSmall}>구글 로그인</button>
            </div>
        )}
      </div>

      <div style={{marginTop:50, textAlign:'center', color:'#444', fontSize:11}}>
        <p>Copyright © Nasdaq Tamagotchi. All rights reserved.</p>
      </div>
    </div>
  );
}

// 스타일 정의 (여기가 안 짤리게 주의해서 복사해주세요!)
const styles = {
  container: { maxWidth: '480px', margin: '0 auto', padding: '20px', backgroundColor: '#000000', color: 'white', minHeight: '100vh', fontFamily: '-apple-system, sans-serif' },
  loading: { display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', backgroundColor:'#000', color:'white' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20 },
  logo: { fontSize: 16, fontWeight:'bold' },
  smallBtn: { padding:'5px 10px', fontSize:12, backgroundColor:'#333', color:'#ccc', border:'none', borderRadius:4, cursor:'pointer' },
  loginBtn: { padding:'6px 12px', fontSize:12, backgroundColor:'#4285F4', color:'white', border:'none', borderRadius:4, cursor:'pointer', fontWeight:'bold' },

  heroCard: { textAlign:'center', padding:'20px', backgroundColor:'#111', borderRadius:15, border:'2px solid #333', marginBottom: 20 },
  descBox: { marginTop:10, fontSize:13, color:'#ccc', lineHeight:1.4, backgroundColor:'rgba(255,255,255,0.05)', padding:10, borderRadius:8 },

  section: { marginBottom: 30, backgroundColor:'#1c1c1e', padding:20, borderRadius:15 },
  sectionHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15, borderBottom:'1px solid #333', paddingBottom:10 },
  badge: { fontSize:12, backgroundColor:'#333', padding:'4px 8px', borderRadius:4, color:'#ccc' },

  tabContainer: { display:'flex', gap:5, marginBottom: 15, flexWrap:'wrap' },
  tab: { flex:1, padding: '8px', backgroundColor:'#2c2c2e', border:'none', color:'#888', borderRadius: 6, cursor:'pointer', fontSize:13, minWidth:'60px' },
  activeTab: { flex:1, padding: '8px', backgroundColor:'#0a84ff', border:'none', color:'white', borderRadius: 6, cursor:'pointer', fontWeight:'bold', fontSize:13, minWidth:'60px' },
  input: { width:'100%', padding:12, fontSize:20, backgroundColor:'#000', border:'1px solid #333', color:'white', borderRadius:8, textAlign:'right', boxSizing:'border-box', outline:'none', fontWeight:'bold' },

  listContainer: { marginTop: 10 },
  listHeader: { display:'flex', fontSize:12, color:'#666', paddingBottom:8, borderBottom:'1px solid #333', marginBottom:5 },
  row: { display:'flex', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #2c2c2e', fontSize:14 },
  rowExecuted: { display:'flex', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #2c2c2e', fontSize:14, opacity: 0.5, textDecoration:'line-through' },

  summaryBox: { display:'flex', justifyContent:'space-between', alignItems:'center', backgroundColor:'#000', padding:15, borderRadius:10, marginBottom:15 },
  historyList: { maxHeight:'300px', overflowY:'auto' },
  historyItem: { backgroundColor:'#2c2c2e', padding:12, borderRadius:8, marginBottom:8 },
  delBtn: { padding:'4px 8px', backgroundColor:'#ff453a', color:'white', border:'none', borderRadius:4, fontSize:11, cursor:'pointer' },

  loginBlur: { textAlign:'center', padding:20, opacity:0.7 },
  ctaBtnSmall: { marginTop:10, padding:'8px 16px', backgroundColor:'#4285F4', color:'white', border:'none', borderRadius:6, cursor:'pointer' }
};