/**
 * 距離センサー（Arduino）とNext.jsアプリを連携させるスクリプト
 * 使い方: node sensor-bridge.js
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const fs = require('fs');
const path = require('path');

// ==========================================
// 設定項目（環境に合わせて変更してください）
// ==========================================

// Arduinoが接続されているポート名（Windowsの場合は 'COM3' など, Macの場合は '/dev/tty.usbmodem...' など）
const ARDUINO_PORT = 'COM9'; 

// 通信速度（ArduinoのSerial.begin()と合わせる）
const BAUD_RATE = 115200;

// このセンサーが担当する駐車枠（例: A1）
const TARGET_ZONE = 'A';
const TARGET_SPOT_NUMBER = 1;

// WebアプリのURL
const API_URL = 'http://localhost:3000/api/sensor';

// 状態保存用のファイルパス（Next.jsの公開フォルダ）
const STATE_FILE_PATH = path.join(__dirname, 'public', 'sensor-state.json');

// ==========================================

console.log('====================================');
console.log(`🅿️  センサー連携プログラムを起動しました`);
console.log(`📍 担当枠: ${TARGET_ZONE}ブロック ${TARGET_SPOT_NUMBER}番`);
console.log(`🔌 接続ポート: ${ARDUINO_PORT}`);
console.log('====================================');

// シリアルポートを開く
const port = new SerialPort({ path: ARDUINO_PORT, baudRate: BAUD_RATE }, function (err) {
  if (err) {
    return console.log('❌ ポートを開けません: ', err.message);
  }
});

// 行単位でデータを読み取るパーサーを設定
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

// 最後にデータを受信した時間
let lastDataTime = Date.now();

// センサーフリーズ・切断対策（20秒間データが来なければ強制的に空車にする）
setInterval(async () => {
  if (Date.now() - lastDataTime > 20000) {
    console.log(`\n⚠️ [${new Date().toLocaleTimeString()}] センサーからの応答が20秒以上ありません。強制的に空車シグナルを送信します。`);
    lastDataTime = Date.now(); // 連続送信を防ぐために一度リセット
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone: TARGET_ZONE,
          spotNumber: TARGET_SPOT_NUMBER,
          action: 'EMPTY'
        })
      });
      const result = await response.json();
      if (response.ok) {
        console.log(`✅ 強制空車化に成功: ${result.message}`);
      }
    } catch (err) {
      console.log(`❌ アプリへの強制空車送信に失敗しました`);
    }
  }
}, 5000); // 5秒おきにチェック

// Arduinoからデータを受信した時の処理
parser.on('data', async (line) => {
  // データが来たのでタイムアウトをリセット
  lastDataTime = Date.now();

  const data = line.trim();
  
  // 人間用のログ表示は無視して、システムイベントだけを処理する
  const isParkedEvent = data.includes('[EVENT] PARKED');
  const isEmptyEvent = data.includes('[EVENT] EMPTY') || data.includes('車が離れました。次の車の認識を待機します');

  if (isParkedEvent || isEmptyEvent) {
    const action = isParkedEvent ? 'PARKED' : 'EMPTY';
    console.log(`\n📡 [${new Date().toLocaleTimeString()}] シグナル受信: ${action}`);
    
    // WebアプリのAPIに送信
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zone: TARGET_ZONE,
          spotNumber: TARGET_SPOT_NUMBER,
          action: action
        })
      });

      const result = await response.json();
      if (response.ok) {
        console.log(`✅ アプリに状態を送信しました: ${result.message}`);
      } else {
        console.log(`⚠️ アプリからのエラー: ${result.error}`);
      }
    } catch (err) {
      console.log(`❌ アプリへの送信に失敗しました (サーバーが起動していない可能性があります)`);
    }
  } else {
    // 距離などの通常のログは薄暗く表示する（見栄え用）
    process.stdout.write(`\x1b[90m${data}\x1b[0m\r`);

    // Webアプリで表示できるように最新状態をファイルに書き出す
    try {
      fs.writeFileSync(STATE_FILE_PATH, JSON.stringify({ 
        message: data, 
        timestamp: Date.now(),
        zone: TARGET_ZONE,
        spotNumber: TARGET_SPOT_NUMBER
      }));
    } catch (err) {
      // ログ書き込みエラーは無視
    }
  }
});

// エラーハンドリング
port.on('error', function(err) {
  console.log('❌ シリアル通信エラー: ', err.message);
});

// 切断された時の処理
port.on('close', function() {
  console.log('⚠️ Arduinoとの接続が切断されました');
});
