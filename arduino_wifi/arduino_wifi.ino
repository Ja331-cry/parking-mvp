#include <WiFiS3.h>
#include <Arduino_Modulino.h>

// --- Wi-Fi設定 ---
char ssid[] = "高市早苗のiPhone";
char pass[] = "abcdefgh";
char server[] = "parking-mvp-one.vercel.app";

int status = WL_IDLE_STATUS;
WiFiSSLClient client;
WiFiServer localServer(80);

// --- Modulino Distance センサー ---
ModulinoDistance distanceSensor;
const int THRESHOLD_MM = 300; 

// --- カウントダウン設定 ---
const int PARK_REQUIRED_SECONDS = 10;
const int EMPTY_REQUIRED_SECONDS = 20;
const int GRACE_SECONDS = 3;

int parkProgress = 0;
int parkGrace = 0;
int emptyProgress = 0;
int emptyGrace = 0;

boolean isCurrentlyParked = false;
String zone = "A";
int spotNumber = 1;

// --- Webサーバー表示用の変数 ---
int currentDist = 9999;
String currentStatusMsg = "待機中...";
String currentGraceMsg = "";
unsigned long lastMeasureTime = 0;

void setup() {
  Serial.begin(9600);

  Modulino.begin();
  if (!distanceSensor.begin()) {
    Serial.println("エラー: Modulino Distance センサーが見つかりません！");
    while (1);
  }

  if (WiFi.status() == WL_NO_MODULE) {
    Serial.println("WiFiモジュールが見つかりません！");
    while (true);
  }

  while (status != WL_CONNECTED) {
    Serial.print("Wi-Fiに接続中: ");
    Serial.println(ssid);
    status = WiFi.begin(ssid, pass);
    delay(5000);
  }
  Serial.println("Wi-Fi接続成功！");
  
  localServer.begin();
  Serial.println("========================================");
  Serial.println("★スマホのブラウザで以下のURLを開いてください★");
  Serial.print("http://");
  Serial.println(WiFi.localIP());
  Serial.println("========================================");
}

void loop() {
  // --- 1. スマホからのアクセス対応（非同期で画面更新） ---
  WiFiClient webClient = localServer.available();
  if (webClient) {
    String requestLine = "";
    boolean currentLineIsBlank = true;
    boolean isFirstLine = true;
    
    while (webClient.connected()) {
      if (webClient.available()) {
        char c = webClient.read();
        
        if (isFirstLine && c != '\n' && c != '\r') {
           requestLine += c;
        }

        if (c == '\n' && currentLineIsBlank) {
          // HTTPリクエストの解析完了
          if (requestLine.indexOf("GET /data") >= 0) {
            // ▼データだけを要求された場合（JSONを返す）
            webClient.println("HTTP/1.1 200 OK");
            webClient.println("Content-Type: application/json; charset=UTF-8");
            webClient.println("Access-Control-Allow-Origin: *");
            webClient.println("Connection: close");
            webClient.println();
            
            String json = "{";
            json += "\"dist\":" + String(currentDist) + ",";
            json += "\"msg\":\"" + currentStatusMsg + "\",";
            json += "\"grace\":\"" + currentGraceMsg + "\",";
            json += "\"parked\":" + String(isCurrentlyParked ? "true" : "false");
            json += "}";
            webClient.println(json);
            
          } else {
            // ▼最初のアクセスの場合（JavaScript入りのHTMLを返す）
            webClient.println("HTTP/1.1 200 OK");
            webClient.println("Content-Type: text/html; charset=UTF-8");
            webClient.println("Connection: close");
            webClient.println();
            
            webClient.println("<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>");
            webClient.println("<title>センサー監視</title>");
            webClient.println("<style>");
            webClient.println("body{font-family:'Helvetica Neue',sans-serif; background:#f1f5f9; padding:20px; text-align:center; margin:0;}");
            webClient.println(".card{background:white; padding:40px 20px; border-radius:24px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); max-width:400px; margin:20px auto;}");
            webClient.println("h2{color:#334155; margin-top:0;}");
            webClient.println(".dist{font-size:56px; font-weight:900; color:#6366f1; margin:20px 0; transition: color 0.3s;}");
            webClient.println(".msg{font-size:18px; color:#64748b; font-weight:bold; min-height:28px;}");
            webClient.println(".grace{color:#f59e0b; margin-top:8px;}");
            webClient.println(".status{margin-top:30px; font-size:24px; font-weight:bold; padding-top:20px; border-top:2px dashed #e2e8f0;}");
            webClient.println(".parked{color:#ef4444;} .empty{color:#10b981;}");
            webClient.println("</style>");
            webClient.println("</head><body><div class='card'>");
            webClient.println("<h2>駐車場センサー (A-1)</h2>");
            webClient.println("<div id='dist' class='dist'>読込中...</div>");
            webClient.println("<div id='msg' class='msg'>接続しています...</div>");
            webClient.println("<div id='grace' class='msg grace'></div>");
            webClient.println("<div class='status'>現在の状態: <span id='state'>--</span></div>");
            webClient.println("</div>");
            
            // 画面を再読み込みせずに、裏側でデータだけを取ってくる魔法のスクリプト（Ajax）
            webClient.println("<script>");
            webClient.println("setInterval(async () => {");
            webClient.println("  try {");
            webClient.println("    let res = await fetch('/data');");
            webClient.println("    let data = await res.json();");
            webClient.println("    if(data.dist == 9999) {");
            webClient.println("      document.getElementById('dist').innerHTML = '測定不能';");
            webClient.println("    } else {");
            webClient.println("      document.getElementById('dist').innerHTML = (data.dist / 10.0).toFixed(1) + ' <span style=\"font-size:24px\">cm</span>';");
            webClient.println("    }");
            webClient.println("    document.getElementById('msg').innerText = data.msg;");
            webClient.println("    document.getElementById('grace').innerText = data.grace;");
            webClient.println("    let stateEl = document.getElementById('state');");
            webClient.println("    if(data.parked) {");
            webClient.println("      stateEl.innerText = '満車'; stateEl.className = 'parked';");
            webClient.println("    } else {");
            webClient.println("      stateEl.innerText = '空車'; stateEl.className = 'empty';");
            webClient.println("    }");
            webClient.println("  } catch(e) {}");
            webClient.println("}, 500);"); // 0.5秒ごとに超なめらかに更新
            webClient.println("</script>");
            
            webClient.println("</body></html>");
          }
          break;
        }
        if (c == '\n') {
          currentLineIsBlank = true;
          isFirstLine = false;
        } else if (c != '\r') {
          currentLineIsBlank = false;
        }
      }
    }
    delay(1);
    webClient.stop();
  }

  // --- 2. センサー計測とカウントダウン処理（1秒に1回だけ実行） ---
  unsigned long currentMillis = millis();
  if (currentMillis - lastMeasureTime >= 1000) {
    lastMeasureTime = currentMillis;
    currentGraceMsg = ""; // 毎秒リセット

    if (distanceSensor.available()) {
      currentDist = distanceSensor.get();
      Serial.print("現在の距離: ");
      Serial.print(currentDist / 10.0);
      Serial.println(" cm");
    } else {
      currentDist = 9999;
      Serial.println("センサーからの応答がありません...");
    }

    if (currentDist > 0 && currentDist <= THRESHOLD_MM) {
      if (!isCurrentlyParked) {
        parkProgress++;
        parkGrace = 0;
        currentStatusMsg = "入庫検知中... 満車確定まであと " + String(PARK_REQUIRED_SECONDS - parkProgress) + " 秒";
        Serial.println(currentStatusMsg);
      } else {
        if (emptyProgress > 0) {
          emptyGrace++;
          currentGraceMsg = "※出庫中に障害物を検知（猶予 " + String(emptyGrace) + " 秒）";
          Serial.println(currentGraceMsg);
          if (emptyGrace > GRACE_SECONDS) {
            emptyProgress = 0;
            emptyGrace = 0;
            currentGraceMsg = ">> 障害物が長いため出庫カウントをリセットしました";
            Serial.println(currentGraceMsg);
          }
        } else {
          currentStatusMsg = "車が安定して駐車されています";
        }
      }
    } else {
      if (!isCurrentlyParked) {
        if (parkProgress > 0) {
          parkGrace++;
          currentGraceMsg = "※入庫中に一時的な見失い（猶予 " + String(parkGrace) + " 秒）";
          Serial.println(currentGraceMsg);
          if (parkGrace > GRACE_SECONDS) {
            parkProgress = 0;
            parkGrace = 0;
            currentGraceMsg = ">> 見失い時間が長いため入庫カウントをリセットしました";
            Serial.println(currentGraceMsg);
          }
        } else {
          currentStatusMsg = "車がいません（空車を維持）";
        }
      } else {
        emptyProgress++;
        emptyGrace = 0;
        currentStatusMsg = "出庫検知中... 空車確定まであと " + String(EMPTY_REQUIRED_SECONDS - emptyProgress) + " 秒";
        Serial.println(currentStatusMsg);
      }
    }

    if (!isCurrentlyParked && parkProgress >= PARK_REQUIRED_SECONDS) {
      isCurrentlyParked = true;
      parkProgress = 0;
      parkGrace = 0;
      currentStatusMsg = "【確定】満車になりました！サーバーへ送信済";
      Serial.println(currentStatusMsg);
      sendData("PARKED");
    } 
    else if (isCurrentlyParked && emptyProgress >= EMPTY_REQUIRED_SECONDS) {
      isCurrentlyParked = false;
      emptyProgress = 0;
      emptyGrace = 0;
      currentStatusMsg = "【確定】空車になりました！サーバーへ送信済";
      Serial.println(currentStatusMsg);
      sendData("EMPTY");
    }
  }
}

void sendData(String action) {
  if (client.connect(server, 443)) {
    String jsonData = "{\"zone\":\"" + zone + "\",\"spotNumber\":" + String(spotNumber) + ",\"action\":\"" + action + "\",\"apiKey\":\"himitunokagi123\"}";
    client.println("POST /api/sensor HTTP/1.1");
    client.print("Host: ");
    client.println(server);
    client.println("Content-Type: application/json");
    client.print("Content-Length: ");
    client.println(jsonData.length());
    client.println("Connection: close");
    client.println();
    client.println(jsonData);
    
    while (client.connected()) {
      String line = client.readStringUntil('\n');
      if (line == "\r") break;
    }
    client.stop();
    Serial.println(">>> Vercelへの送信完了！");
  } else {
    Serial.println(">>> Vercelへの送信エラー...");
  }
}