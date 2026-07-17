# プロジェクト構成まとめ（ハードウェア仕様書）

* **使用マイコン (Microcontroller):**
  * **Arduino** (※UNO R4 WiFi や Plug and Make Kit など、Qwiic/Stemma QTコネクタ対応ボードを推奨)

* **使用センサ (Sensor):**
  * **Modulino Distance** (光学式 ToF / レーザー距離センサ)

* **接続方法:**
  * 付属の専用Qwiicケーブルで、ArduinoとModulinoを**1本で直接接続** (ジャンパーワイヤー不要)

* **使用ライブラリ:**
  * `Arduino_Modulino` (Arduino IDEのライブラリマネージャーからインストール)

* **シリアル通信速度:**
  * `115200 bps` (シリアルモニタの右下で合わせる)

* **動作仕様:**
  * センサが100mm (10cm) 以内の障害物を検知した場合、シリアルに `1` を出力。それ以外（10cmより遠い、または測定範囲外）の場合は `0` を出力する**非接触スイッチ**として動作。

---

### プログラムコード

```cpp
#include <Arduino_Modulino.h>

ModulinoDistance distanceSensor;

const int THRESHOLD = 300;             // 300mm（30cm）以内で検知
const unsigned long PARK_TIME = 10000; // 駐車とみなすまでの時間 (10秒)
const unsigned long PARK_TOLERANCE = 3000; // 駐車判定中の見失い許容時間 (3秒)
const unsigned long HOLD_TIME = 20000; // 駐車確定後、空車とみなすまでの時間 (20秒)

unsigned long lastSeenTime = 0;    // 最後に車を検知した時間
bool parking = false;              // 現在の駐車状態

// ストップウォッチ用の変数
unsigned long accumulatedTime = 0; // 蓄積された検知時間
unsigned long sessionStartTime = 0; // 現在の連続検知の開始時間

void setup() {
  Serial.begin(115200);
  Modulino.begin();

  if (!distanceSensor.begin()) {
    Serial.println("Error: センサーの初期化に失敗しました");
    while (1);
  }
  Serial.println("System: センサー初期化成功");
}

void loop() {
  unsigned long now = millis();
  bool hasNewData = distanceSensor.available();
  int distance = -1;
  bool rawDetected = false;

  // 1. センサーからのデータ取得
  if (hasNewData) {
    distance = distanceSensor.get();
    rawDetected = (distance > 0 && distance <= THRESHOLD);

    if (rawDetected) {
      lastSeenTime = now;
      if (sessionStartTime == 0) {
        sessionStartTime = now; 
      }
    }
  }

  // センサーからのデータがない場合、または検知範囲外の場合
  if (!rawDetected) {
    if (sessionStartTime != 0) {
      accumulatedTime += (now - sessionStartTime);
      sessionStartTime = 0;
    }
  }

  unsigned long timeSinceLastSeen = now - lastSeenTime;

  // 2. ターミナルへのログ出力（データが来なくても、0.5秒おきに状態を出力してフリーズを防ぐ）
  static unsigned long lastPrintTime = 0;
  bool shouldPrint = hasNewData || (now - lastPrintTime >= 500);

  if (shouldPrint) {
    lastPrintTime = now;

    if (hasNewData) {
      Serial.print("距離: ");
      Serial.print(distance);
      Serial.print(" mm | 状態: ");
    } else {
      Serial.print("距離: --- mm (測定中) | 状態: ");
    }

    if (!parking) {
      // --- まだ駐車確定していない状態（入庫判定中） ---
      if (lastSeenTime > 0 && timeSinceLastSeen <= PARK_TOLERANCE) {
        unsigned long currentSessionTime = (sessionStartTime != 0) ? (now - sessionStartTime) : 0;
        unsigned long totalElapsed = accumulatedTime + currentSessionTime;

        if (totalElapsed >= PARK_TIME) {
          parking = true;
          Serial.println("[EVENT] PARKED"); 
        } else {
          Serial.print("駐車判定中... 確定まであと ");
          Serial.print((PARK_TIME - totalElapsed) / 1000 + 1);
          if (rawDetected) {
            Serial.println(" 秒 (検知中)");
          } else {
            Serial.print(" 秒 (一時停止中... あと ");
            Serial.print((PARK_TOLERANCE - timeSinceLastSeen) / 1000 + 1);
            Serial.println(" 秒でリセット)");
          }
        }
      } else {
        // リセット処理
        if (accumulatedTime != 0 || sessionStartTime != 0) {
          accumulatedTime = 0;
          sessionStartTime = 0;
          Serial.println("待機中（車なし - 判定リセット）");
        } else if (!rawDetected) {
          Serial.println("待機中（車なし）");
        }
      }
    } else {
      // --- すでに駐車確定済みの状態 ---
      if (timeSinceLastSeen >= HOLD_TIME) {
        parking = false;
        accumulatedTime = 0;
        sessionStartTime = 0;
        lastSeenTime = 0;
        Serial.println("車が離れました。次の車の認識を待機します...");
      } else {
        if (rawDetected) {
          Serial.println("★★★ 駐車中 ★★★");
        } else {
          Serial.print("★★★ 駐車中 ★★★ (一時見失い中... あと ");
          Serial.print((HOLD_TIME - timeSinceLastSeen) / 1000 + 1);
          Serial.println(" 秒で出庫判定)");
        }
      }
    }
  }

  delay(100);
}
```
