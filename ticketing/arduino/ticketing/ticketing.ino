#include <WiFi.h>
#include "arduino_secrets.h"
#include <Adafruit_Thermal.h>

const char *ssid = SECRET_SSID;
const char *password = SECRET_PASS;
const char *server_ip = SERVER_IP_ADDRESS;
const int server_port = 4000;

WiFiClient client;
Adafruit_Thermal printer(&Serial1);

// ── Read one line from TCP (blocking until \n or timeout) ──────────────────
String readLine() {
  String line = "";
  unsigned long start = millis();
  while (millis() - start < 2000) {
    while (client.available()) {
      char c = client.read();
      if (c == '\n') return line;
      if (c != '\r') line += c;
    }
    delay(1);
  }
  return line;
}

// ── Print ticket with pre-parsed fields ────────────────────────────────────
void printTicket(const String &code, const String &counter,
                 const String &barcode, const String &time) {
  printer.wake();
  printer.setDefault();
  printer.justify('C');
  printer.boldOn();
  printer.setSize('L');
  printer.println(F("YOUR LOVE"));
  printer.println(F("IS WAITING"));
  printer.boldOff();
  printer.setSize('S');
  printer.println(F("----------------"));
  printer.println(F("MATCHFIT INC."));
  printer.println(F("----------------"));
  printer.feed(1);

  printer.justify('L');
  printer.setSize('M');
  printer.println("Ticket No: " + code);
  printer.println("Counter  : " + counter);
  printer.println("Time     : " + time);
  printer.feed(1);

  printer.justify('C');
  if (barcode.length() > 0) {
    printer.setBarcodeHeight(80);
    printer.printBarcode(barcode.c_str(), CODE128);
    printer.println(barcode);
  }

  printer.feed(3);
  printer.sleep();
}

// ── WiFi setup ─────────────────────────────────────────────────────────────
void setup_wifi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected: " + WiFi.localIP().toString());
}

void setup() {
  Serial.begin(115200);
  Serial1.begin(9600);
  setup_wifi();
  printer.begin();
}

void loop() {
  // Reconnect if dropped
  if (!client.connected()) {
    Serial.print("Connecting to server...");
    if (client.connect(server_ip, server_port)) {
      Serial.println("connected");
    } else {
      Serial.println("failed, retrying in 5s");
      delay(5000);
      return;
    }
  }

  // Wait for a complete ticket (blank line = end of message)
  if (client.available()) {
    String code = readLine();
    String counter = readLine();
    String barcode = readLine();
    String time = readLine();
    readLine();  // consume blank terminator

    if (code.length() == 0) return;  // empty / stale data

    Serial.println("Printing: " + code + " / " + counter);
    printTicket(code, counter, barcode, time);
  }
}
