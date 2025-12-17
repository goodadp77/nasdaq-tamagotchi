"use client";

import { useState, useEffect } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

// --- 1. 파이어베이스 설정 (이미 하셨던 것) ---
const firebaseConfig = {
  apiKey: "AIzaSyB2XWlFWOpQGTCv0g0yz8gd-GVNlaZyqxM",
  authDomain: "nasdaq-tamagotchi.firebaseapp.com",
  projectId: "nasdaq-tamagotchi",
  storageBucket: "nasdaq-tamagotchi.firebasestorage.app",
  messagingSenderId: "856810350280",
  appId: "1:856810350280:web:1961ce32f343b6fabaa7fd",
  measurementId: "G-4Y25D30HXP"
};

// 파이어베이스 초기화 (중복 방지)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export default function Home() {
  const [user, setUser] = useState(null); // 로그인한 유저 정보
  const [loading, setLoading] = useState(true); // 로딩 중인지 확인

  // --- 계산기 관련 상태변수 ---
  const [currentPrice, setCurrentPrice] = useState(""); // 현재 나스닥 지수
  const [highPrice, setHighPrice] = useState("");       // 나스닥 전고점 (최고점)
  const [result, setResult] = useState(null);           // 계산 결과 메시지

  // 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 로그인 함수
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("로그인 에러:", error);
      alert("로그인에 실패했습니다.");
    }
  };

  // 로그아웃 함수
  const handleLogout = () => {
    signOut(auth);
    setResult(null); // 로그아웃 시 계산 결과 초기화
  };

  // --- ★ 핵심: 나스닥 4구간 계산 로직 ★ ---
  const calculateZone = () => {
    if (!currentPrice || !highPrice) {
      alert("숫자를 모두 입력해주세요!");
      return;
    }

    const current = parseFloat(currentPrice);
    const high = parseFloat(highPrice);
    
    // 하락률 계산: (고점 - 현재) / 고점 * 100
    const dropRate = ((high - current) / high) * 100;
    
    let zoneMessage = "";
    let actionGuide = "";
    let colorClass = "";

    // 구간 판단 로직 (일반적인 4구간 분할매수 기준)
    if (dropRate < 0) {
      zoneMessage = "📈 신고가 돌파!";
      actionGuide = "축하합니다! 즐기세요.";
      colorClass = "text-red-500"; // 빨강
    } else if (dropRate <= 10) {
      zoneMessage = "🟢 1구간 (안정권)";
      actionGuide = "아직은 관망하거나 소액만 적립하세요. (-10% 이내)";
      colorClass = "text-green-600";
    } else if (dropRate <= 20) {
      zoneMessage = "🟡 2구간 (조정장)";
      actionGuide = "본격적인 분할매수 시작! 쫄지 말고 모아가세요. (-10% ~ -20%)";
      colorClass = "text-yellow-600";
    } else if (dropRate <= 30) {
      zoneMessage = "🟠 3구간 (하락장)";
      actionGuide = "적극 매수 구간입니다. 수량을 확 늘리세요! (-20% ~ -30%)";
      colorClass = "text-orange-600";
    } else {
      zoneMessage = "🔴 4구간 (폭락장/기회)";
      actionGuide = "인생 역전 기회입니다. 팬티까지 팔아서 사야 할 때! (-30% 이상)";
      colorClass = "text-red-600 font-bold";
    }

    // 결과 저장
    setResult({
      dropRate: dropRate.toFixed(2), // 소수점 2자리까지
      message: zoneMessage,
      guide: actionGuide,
      color: colorClass
    });
  };

  if (loading) return <div className="flex justify-center items-center h-screen">로딩중...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold text-blue-900 mb-8">🐣 나스닥 다마고치</h1>

      {user ? (
        // --- 로그인 성공 후 보여줄 화면 (계산기) ---
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-900 font-medium">반가워요, <strong>{user.displayName}</strong>님!</span>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-500 underline">로그아웃</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">나스닥 전고점 (최고점)</label>
              <input 
                type="number" 
                value={highPrice}
                onChange={(e) => setHighPrice(e.target.value)}
                placeholder="예: 18000"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black bg-white placeholder-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">현재 나스닥 지수</label>
              <input 
                type="number" 
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="예: 16500"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black bg-white placeholder-gray-400"
              />
            </div>

            <button 
              onClick={calculateZone}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
            >
              🚀 지금 상태 확인하기
            </button>
          </div>

          {/* 결과 보여주는 창 */}
          {result && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-pulse-once">
              <p className="text-center text-gray-700 mb-2">현재 하락률: <span className="font-bold text-black">{result.dropRate}%</span></p>
              <h3 className={`text-2xl text-center font-bold mb-2 ${result.color}`}>{result.message}</h3>
              <p className="text-center text-gray-800 text-sm break-keep font-medium">{result.guide}</p>
            </div>
          )}

        </div>
      ) : (
        // --- 로그인 안 했을 때 보여줄 화면 ---
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <p className="mb-6 text-gray-800 font-medium">투자의 감을 잃지 않도록<br/>다마고치가 도와줍니다.</p>
          <button
            onClick={handleGoogleLogin}
            className="flex items-center justify-center w-full bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition"
          >
            🔵 구글로 시작하기
          </button>
        </div>
      )}
    </div>
  );
}