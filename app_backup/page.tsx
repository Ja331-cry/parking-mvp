'use client';
import { useEffect, useRef, useState } from 'react';
import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import ParkingMap from './components/ParkingMap';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const [capturedImg, setCapturedImg] = useState<string | null>(null);
  const [result, setResult] = useState<{ detectedPlate?: string, status?: string, error?: string, isOk?: boolean, assignedSpot?: string | null } | null>(null);

  // 自動検知用のステートとRef
  const [autoMode, setAutoMode] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const lastCaptureTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // --- 非同期キュー（待ち行列）用のステートとRef ---
  const [imageQueue, setImageQueue] = useState<string[]>([]);
  const [isApiProcessing, setIsApiProcessing] = useState(false);
  // requestAnimationFrame内で最新状態を参照するためのRef
  const queueRef = useRef<string[]>([]);
  const isApiProcessingRef = useRef<boolean>(false);

  // ステートとRefを同期
  useEffect(() => {
    queueRef.current = imageQueue;
  }, [imageQueue]);
  useEffect(() => {
    isApiProcessingRef.current = isApiProcessing;
  }, [isApiProcessing]);

  // カメラ起動
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('カメラの起動に失敗しました。');
      }
    };
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // AIモデルの読み込み
  useEffect(() => {
    if (autoMode && !modelRef.current && !isModelLoading) {
      setIsModelLoading(true);
      cocoSsd.load().then(model => {
        modelRef.current = model;
        setIsModelLoading(false);
      }).catch(err => {
        console.error(err);
        setIsModelLoading(false);
      });
    }
  }, [autoMode]);

  // 【撮影係】写真を撮ってキューに追加する（APIは呼ばない）
  const captureToQueue = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // フルHD設定
    const maxWidth = 1920;
    const scale = Math.min(maxWidth / video.videoWidth, 1);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    
    // キューに追加
    setImageQueue(prev => [...prev, dataUrl]);
    lastCaptureTimeRef.current = Date.now();
  };

  // 【自動検知ループ】
  useEffect(() => {
    if (!autoMode || !modelRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const detectLoop = async () => {
      // videoが準備完了なら
      if (videoRef.current && videoRef.current.readyState === 4 && modelRef.current) {
        const now = Date.now();
        // 5秒間（5000ms）のクールダウン (API処理中かどうかは関係なく撮る)
        if (now - lastCaptureTimeRef.current > 5000) {
          const predictions = await modelRef.current!.detect(videoRef.current);
          const hasVehicle = predictions.some(p => 
            (p.class === 'car' || p.class === 'truck' || p.class === 'bus') && p.score > 0.3
          );

          if (hasVehicle) {
            captureToQueue();
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(detectLoop);
    };

    detectLoop();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [autoMode, isModelLoading]);

  // 【判定係】キューを監視して順番にAPIへ送信するワーカー
  useEffect(() => {
    const processQueue = async () => {
      // キューに写真があり、かつ現在API処理中でなければ
      if (imageQueue.length > 0 && !isApiProcessing) {
        setIsApiProcessing(true);
        setResult(null);

        // キューの先頭（一番古い写真）を取り出す
        const targetImage = imageQueue[0];
        setCapturedImg(targetImage); // 画面に判定中の写真を表示

        try {
          const res = await fetch(targetImage);
          const blob = await res.blob();
          const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

          const formData = new FormData();
          formData.append('image', file);

          const response = await fetch('/api/check', {
            method: 'POST',
            body: formData,
          });
          
          const data = await response.json();
          setResult(data);

          // 案内表示を10秒後に自動クリア（新しい判定が始まっていなければ）
          setTimeout(() => {
            setResult(prev => prev === data ? null : prev);
            setCapturedImg(prev => prev === targetImage ? null : prev);
          }, 10000);
        } catch (error) {
          console.error("クライアント側エラー:", error);
          setResult({ error: "処理中にエラーが発生しました。" });
        } finally {
          // 処理が終わったら、キューから先頭を削除
          setImageQueue(prev => prev.slice(1));
          setIsApiProcessing(false);
        }
      }
    };

    // 0.5秒ごとにキューをチェック（Reactのステート更新と競合しないように）
    const intervalId = setInterval(processQueue, 500);
    return () => clearInterval(intervalId);
  }, [imageQueue, isApiProcessing]);


  // キューを強制クリアする関数
  const clearQueue = () => {
    setImageQueue([]);
    // API処理中のものは途中で止められないが、後続は全て消える
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl mb-3">
            不正車両検知システム
          </h1>
          <p className="text-slate-500 font-medium">大学駐車場向け・AIナンバー認識</p>
        </div>
        
        {errorMsg && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md shadow-sm">
            <p className="text-red-700 font-medium">{errorMsg}</p>
          </div>
        )}

        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          {/* キューの状態インジケーター */}
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 text-sm font-bold">
            <div className={`w-3 h-3 rounded-full ${imageQueue.length > 0 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
            <span className="text-slate-700">AI判定待ち:</span>
            <span className="text-indigo-600 text-base">{imageQueue.length} 枚</span>
            
            {imageQueue.length > 0 && (
              <button 
                onClick={clearQueue}
                className="ml-3 px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs transition-colors border border-red-100 flex items-center gap-1"
                title="待機中の写真をすべて破棄します"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                クリア
              </button>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-2.5 rounded-full shadow-md shadow-slate-200/50 border border-slate-100 hover:bg-slate-50 transition-colors">
            <span className={`text-sm font-bold ${autoMode ? 'text-indigo-600' : 'text-slate-500'}`}>
              🤖 AI自動検知モード
            </span>
            <div className="relative">
              <input type="checkbox" className="peer sr-only" checked={autoMode} onChange={(e) => setAutoMode(e.target.checked)} />
              <div className="block bg-slate-200 w-12 h-7 rounded-full peer-checked:bg-indigo-500 transition-colors"></div>
              <div className="absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
            </div>
          </label>
        </div>

        <div className="bg-white/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-3xl p-6 sm:p-8 border border-white">
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-[4/3] shadow-inner mb-8 ring-1 ring-slate-900/5">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 border-2 border-white/10 rounded-2xl pointer-events-none"></div>
            
            {/* 自動検知がONのときのスキャンエフェクト（枠線なし、テキストのみ） */}
            {autoMode && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                {isModelLoading ? (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold text-white bg-indigo-600 px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
                    モデル読込中...
                  </div>
                ) : (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold text-white bg-indigo-500 px-3 py-1 rounded-full whitespace-nowrap flex items-center gap-2 shadow-lg">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    車両を監視中
                  </div>
                )}
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <button 
            onClick={() => {
              // 手動撮影ボタンは即座にキューへ入れる
              captureToQueue();
            }} 
            disabled={autoMode}
            className={`group relative w-full flex justify-center py-4 px-4 rounded-2xl text-lg font-bold text-white transition-all shadow-lg active:scale-[0.98] ${
              autoMode 
                ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 shadow-indigo-600/30'
            }`}
          >
            {autoMode ? (
              <span className="flex items-center gap-2 text-slate-500">
                自動検知モード稼働中
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                手動で撮影・キューに追加
              </span>
            )}
          </button>
        </div>

        {/* Result Area */}
        {capturedImg && (
          <div className="mt-8 bg-white shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden border border-slate-100 transition-all">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
                判定結果
              </h3>
              {isApiProcessing && (
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  AI解析中...
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-md border border-slate-200 mb-6">
                <img src={capturedImg} alt="キャプチャ画像" className={`w-full object-cover aspect-[16/9] ${isApiProcessing ? 'opacity-70 blur-sm transition-all' : 'opacity-100 transition-all'}`} />
              </div>
              
              {!isApiProcessing && result?.error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl text-center font-medium border border-red-100">
                  エラー: {result.error}
                </div>
              )}
              
              {!isApiProcessing && result && !result.error && (
                <div className="text-center space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <p className="text-slate-500 font-medium">
                    認識ナンバー: <strong className="text-slate-900 text-2xl ml-2 font-mono tracking-wider">{result?.detectedPlate}</strong>
                  </p>
                  
                  {result?.status && (
                    <div className={`inline-flex px-8 py-3 rounded-full font-bold text-xl tracking-wide shadow-sm border-2 ${
                      result.isOk 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-500/10' 
                        : 'bg-rose-50 text-rose-700 border-rose-200 shadow-rose-500/10'
                    }`}>
                      <div className="flex items-center gap-2">
                        {result.isOk ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                        )}
                        {result.status}
                      </div>
                    </div>
                  )}

                  {/* 駐車場所のデジタル案内板 */}
                  {result.assignedSpot && (
                    <div className={`mt-8 text-white rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-500 relative overflow-hidden border-4 ${result.isOk ? 'bg-gradient-to-br from-indigo-600 to-blue-700 border-indigo-400/50' : 'bg-gradient-to-br from-rose-600 to-orange-600 border-rose-400/50'}`}>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none"></div>
                      <p className={`${result.isOk ? 'text-indigo-200' : 'text-rose-200'} font-bold mb-3 tracking-wider text-sm`}>👇 駐車場所のご案内 👇</p>
                      <div className="text-4xl sm:text-5xl font-black tracking-widest drop-shadow-xl text-yellow-300">
                        {result.assignedSpot}
                      </div>
                      <p className={`${result.isOk ? 'text-indigo-100' : 'text-rose-100'} mt-6 font-bold text-xl animate-pulse flex items-center justify-center gap-2`}>
                        こちらへお進みください
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 駐車場マップ UI */}
      <div className="w-full max-w-6xl mt-12 relative z-10">
        <ParkingMap />
      </div>
    </div>
  );
}