"use client";
import { useState, useEffect } from "react";
import { auth, db } from "../../firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from "firebase/firestore";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [csvUrl, setCsvUrl] = useState("");
  const [marketStatus, setMarketStatus] = useState("공포 (Fear)");
  const [isSaving, setIsSaving] = useState(false);
  
  // 🔥 회원 관리 전용 상태값
  const [userList, setUserList] = useState([]);
  const [isUserLoading, setIsUserLoading] = useState(false);

  const theme = { bg: "#F2F2F7", card: "#FFFFFF", text: "#000000", subText: "#6e6e73", border: "#d1d1d6", primary: "#0a84ff" };

  useEffect(() => {
    document.body.style.backgroundColor = theme.bg;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists() && userSnap.data().tier === "ADMIN") {
          setIsAdmin(true);
          // 설정값 로드
          const docRef = doc(db, "settings", "global");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setCsvUrl(docSnap.data().csvUrl || "");
            setMarketStatus(docSnap.data().marketStatus || "공포 (Fear)");
          }
          // 🔥 관리자 인증 성공 시 유저 리스트도 불러옴
          fetchUserList();
        } else {
          setIsAdmin(false);
          alert("관리자 권한이 없습니다.");
          window.location.href = "/";
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 🔥 모든 유저 목록 불러오기 함수
  const fetchUserList = async () => {
    setIsUserLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const users = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      setUserList(users);
    } catch (error) {
      console.error("유저 목록 로드 실패:", error);
    }
    setIsUserLoading(false);
  };

  // 🔥 특정 유저 등급 변경 함수 (즉시 반영)
  const handleUpdateTier = async (uid, newTier) => {
    if (!confirm(`해당 유저의 등급을 ${newTier}(으)로 변경하시겠습니까?`)) return;
    
    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { tier: newTier });
      alert("✅ 등급 변경이 완료되었습니다.");
      fetchUserList(); // 리스트 새로고침
    } catch (error) {
      alert("❌ 변경 중 오류 발생: " + error.message);
    }
  };

  const handleSaveSettings = async () => {
    if (!csvUrl.includes("pub?output=csv") && csvUrl !== "") {
      alert("❌ 올바른 구글 시트 CSV 링크가 아닙니다.");
      return;
    }
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "global"), {
        csvUrl: csvUrl,
        marketStatus: marketStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert("✅ 관리자 설정이 저장되었습니다!");
    } catch (error) {
      alert("❌ 저장 오류: " + error.message);
    }
    setIsSaving(false);
  };

  if (loading) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', color: theme.text}}>⏳ 인증 확인 중...</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.bg, color: theme.text, width: '100vw', margin: 0, padding: 0 }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: '-apple-system, sans-serif' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <div>
            <h1 style={{ color: theme.text, margin: 0, fontSize: 24 }}>⚙️ InvestLogic 어드민 센터</h1>
            <p style={{ color: theme.subText, fontSize: 13, marginTop: 5 }}>전역 설정 및 회원 권한 관리</p>
          </div>
          <button onClick={() => window.location.href = '/'} style={{ padding: '8px 16px', backgroundColor: theme.card, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 6, cursor: 'pointer' }}>
            돌아가기
          </button>
        </div>

        {/* 1. 시장 상황 컨트롤러 */}
        <div style={{ backgroundColor: theme.card, padding: 25, borderRadius: 12, border: `1px solid ${theme.border}`, marginBottom: 20 }}>
          <h3 style={{ color: theme.text, marginTop: 0, marginBottom: 15, borderBottom: `1px solid ${theme.border}`, paddingBottom: 10 }}>📊 시장 구간 설정</h3>
          <select 
            value={marketStatus} 
            onChange={(e) => setMarketStatus(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: 8, backgroundColor: theme.bg, color: theme.text, border: `1px solid ${theme.border}`, fontSize: 16 }}
          >
            <option value="극단적 공포 (Extreme Fear)">극단적 공포 - Z1</option>
            <option value="공포 (Fear)">공포 - Z2</option>
            <option value="주의 (Caution)">주의 - Z3</option>
            <option value="탐욕 (Greed)">탐욕 - Z4</option>
          </select>
          <button 
            onClick={handleSaveSettings} 
            disabled={isSaving}
            style={{ width: '100%', padding: '12px', backgroundColor: '#30d158', color: '#000', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 'bold', marginTop: 15, cursor: 'pointer' }}
          >
            {isSaving ? "저장 중..." : "설정 저장"}
          </button>
        </div>

        {/* 2. 🔥 신규: 회원 등급 관리 탭 (이제 여기서 바로 등업!) */}
        <div style={{ backgroundColor: theme.card, padding: 25, borderRadius: 12, border: `1px solid ${theme.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottom: `1px solid ${theme.border}`, paddingBottom: 10 }}>
            <h3 style={{ color: theme.text, margin: 0 }}>👥 회원 등급 관리</h3>
            <button onClick={fetchUserList} style={{ fontSize: 12, color: theme.primary, border: 'none', background: 'none', cursor: 'pointer' }}>🔄 새로고침</button>
          </div>
          
          {isUserLoading ? <p>불러오는 중...</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: `1px solid ${theme.border}`, color: theme.subText }}>
                    <th style={{ padding: '10px 5px' }}>이메일</th>
                    <th style={{ padding: '10px 5px' }}>현재 등급</th>
                    <th style={{ padding: '10px 5px', textAlign: 'right' }}>등급 변경</th>
                  </tr>
                </thead>
                <tbody>
                  {userList.map((u) => (
                    <tr key={u.uid} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '12px 5px', color: theme.text }}>
                        {u.email || <span style={{color: theme.subText, fontSize: 11}}>{u.uid.substring(0,8)}...</span>}
                      </td>
                      <td style={{ padding: '12px 5px' }}>
                        <span style={{ 
                          padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 'bold',
                          backgroundColor: u.tier === 'PRO' ? '#f5f3ff' : u.tier === 'ADMIN' ? '#eff6ff' : '#f3f4f6',
                          color: u.tier === 'PRO' ? '#6d28d9' : u.tier === 'ADMIN' ? '#1d4ed8' : '#374151'
                        }}>
                          {u.tier || "FREE"}
                        </span>
                      </td>
                      <td style={{ padding: '12px 5px', textAlign: 'right' }}>
                        <select 
                          value={u.tier || "FREE"}
                          onChange={(e) => handleUpdateTier(u.uid, e.target.value)}
                          style={{ padding: '4px', borderRadius: 4, border: `1px solid ${theme.border}`, fontSize: 12 }}
                        >
                          <option value="FREE">FREE</option>
                          <option value="PRO">PRO</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}