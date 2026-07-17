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
    <div className="min-h-screen bg-neu flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">

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

        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          {/* キューの状態インジケーター */}
          <div className="flex items-center gap-2 bg-neu shadow-neu-inner px-5 py-3 rounded-2xl text-sm font-bold">
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

          <label className="flex items-center gap-3 cursor-pointer bg-neu px-6 py-3 rounded-full shadow-neu active:shadow-neu-inner transition-all select-none">
            <span className={`text-sm font-black tracking-wide ${autoMode ? 'text-indigo-600' : 'text-slate-500'}`}>
              🤖 AI自動検知モード
            </span>
            <div className="relative">
              <input type="checkbox" className="peer sr-only" checked={autoMode} onChange={(e) => setAutoMode(e.target.checked)} />
              <div className="block bg-neu shadow-neu-inner w-14 h-8 rounded-full transition-colors"></div>
              <div className="absolute left-1 top-1 bg-neu shadow-neu w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6 flex items-center justify-center">
                {autoMode && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>}
              </div>
            </div>
          </label>
        </div>

        <div className="bg-neu shadow-neu rounded-[2rem] p-6 sm:p-8 mb-8">
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-[4/3] shadow-neu-inner mb-8">
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
            className={`group relative w-full flex justify-center py-4 px-4 rounded-2xl text-lg font-black transition-all ${
              autoMode 
                ? 'bg-neu shadow-neu-inner text-slate-400 cursor-not-allowed' 
                : 'bg-neu shadow-neu active:shadow-neu-inner text-indigo-600'
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
          <div className="mt-8 bg-neu shadow-neu rounded-[2rem] overflow-hidden transition-all">
            <div className="px-6 py-5 border-b border-white/20 bg-neu flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-700 flex items-center gap-2">
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
            <div className="p-8">
              <div className="relative w-full max-w-sm mx-auto rounded-[2rem] overflow-hidden shadow-neu-inner p-2 mb-6">
                <img src={capturedImg} alt="キャプチャ画像" className={`w-full rounded-xl object-cover aspect-[16/9] ${isApiProcessing ? 'opacity-70 blur-sm transition-all' : 'opacity-100 transition-all'}`} />
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
                    <div className={`inline-flex px-8 py-3 rounded-2xl font-black text-xl tracking-wide shadow-neu-inner ${
                      result.isOk ? 'text-emerald-600' : 'text-rose-600'
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
                    <div className={`mt-10 rounded-[2rem] p-8 shadow-neu relative overflow-hidden bg-neu`}>
                      <p className={`${result.isOk ? 'text-indigo-600' : 'text-rose-600'} font-black mb-3 tracking-wider text-sm`}>👇 駐車場所のご案内 👇</p>
                      <div className={`text-5xl sm:text-6xl font-black tracking-widest ${result.isOk ? 'text-slate-800' : 'text-slate-800'}`}>
                        {result.assignedSpot}
                      </div>
                      <p className={`${result.isOk ? 'text-indigo-500' : 'text-rose-500'} mt-6 font-bold text-xl animate-pulse flex items-center justify-center gap-2`}>
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