#include <WiFi.h>
#include "arduino_secrets.h"
#include <Adafruit_Thermal.h>

const char *ssid = SECRET_SSID;
const char *password = SECRET_PASS;
const char *server_ip = SERVER_IP_ADDRESS;  // Change to your server's IP
const int server_port = 4000;

WiFiClient client;
Adafruit_Thermal printer(&Serial1);

const int buttonPin = 12;  // D12
bool lastButtonState = HIGH;
const bool DEBUG_FORCE_HARDCODED_TICKET = false;

struct TicketData {
  String number;
  String counter;
  String barcode;
  String time;
  int bitmapWidth;
  int bitmapHeight;
  String bitmapBase64;
  bool valid;
};

String extractField(const String &payload, const String &label) {
  int start = payload.indexOf(label);
  if (start < 0)
    return "";
  start += label.length();
  int end = payload.indexOf('\n', start);
  if (end < 0)
    end = payload.length();
  String value = payload.substring(start, end);
  value.trim();
  return value;
}

TicketData parseTicketPayload(const String &payload) {
  TicketData data;
  data.number = extractField(payload, "Ticket:");
  data.counter = extractField(payload, "Counter:");
  data.barcode = extractField(payload, "Barcode:");
  data.time = extractField(payload, "Time:");
  data.bitmapWidth = extractField(payload, "BitmapWidth:").toInt();
  data.bitmapHeight = extractField(payload, "BitmapHeight:").toInt();
  data.bitmapBase64 = extractField(payload, "BitmapBase64:");
  data.valid = data.number.length() > 0;
  return data;
}

String readTicketPayload() {
  String payload = "";
  unsigned long lastByteAt = millis();
  // Keep reading until no bytes arrive for 500ms.
  while (millis() - lastByteAt < 500) {
    while (client.available()) {
      payload += (char)client.read();
      lastByteAt = millis();
    }
    delay(2);
  }
  payload.trim();
  return payload;
}

bool decodeBase64(const String &source, uint8_t **outBuffer, size_t *outLength) {
  *outBuffer = nullptr;
  *outLength = 0;
  if (source.length() == 0)
    return false;

  auto b64Index = [](char c) -> int {
    if (c >= 'A' && c <= 'Z')
      return c - 'A';
    if (c >= 'a' && c <= 'z')
      return c - 'a' + 26;
    if (c >= '0' && c <= '9')
      return c - '0' + 52;
    if (c == '+')
      return 62;
    if (c == '/')
      return 63;
    if (c == '=')
      return -2;  // Padding marker
    return -1;    // Invalid character
  };

  // Remove whitespace to tolerate wrapped payloads.
  String clean;
  clean.reserve(source.length());
  for (size_t i = 0; i < source.length(); i++) {
    char c = source[i];
    if (c == '\r' || c == '\n' || c == ' ' || c == '\t')
      continue;
    clean += c;
  }
  if (clean.length() == 0)
    return false;

  size_t maxOut = ((clean.length() + 3) / 4) * 3;
  uint8_t *buffer = static_cast<uint8_t *>(malloc(maxOut));
  if (!buffer)
    return false;

  size_t outPos = 0;
  char q[4];
  int qi = 0;

  for (size_t i = 0; i < clean.length(); i++) {
    char c = clean[i];
    int idx = b64Index(c);
    if (idx == -1) {  // Invalid char
      free(buffer);
      return false;
    }

    q[qi++] = c;
    if (qi != 4)
      continue;

    int a = b64Index(q[0]);
    int b = b64Index(q[1]);
    int c2 = b64Index(q[2]);
    int d = b64Index(q[3]);

    if (a < 0 || b < 0 || c2 == -1 || d == -1) {
      free(buffer);
      return false;
    }

    buffer[outPos++] = static_cast<uint8_t>((a << 2) | (b >> 4));

    if (q[2] != '=') {
      buffer[outPos++] = static_cast<uint8_t>(((b & 0x0F) << 4) | (c2 >> 2));
    }
    if (q[3] != '=') {
      buffer[outPos++] = static_cast<uint8_t>(((c2 & 0x03) << 6) | d);
    }

    qi = 0;
  }
  if (qi != 0) {  // Base64 must be in complete quartets
    free(buffer);
    return false;
  }

  *outBuffer = buffer;
  *outLength = outPos;
  return true;
}

void printTicket(const TicketData &ticket) {
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
  printer.println("Ticket No: " + ticket.number);
  printer.println("Counter  : " + ticket.counter);
  if (ticket.time.length() > 0) {
    printer.println("Time     : " + ticket.time);
  }
  printer.feed(1);

  printer.justify('C');
  if (ticket.barcode.length() > 0) {
    printer.setBarcodeHeight(80);
    printer.printBarcode(ticket.barcode.c_str(), CODE128);
    printer.println(ticket.barcode);
  } else {
    printer.println(F("Ask for MatchFit assistance."));
  }
  printer.println(ticket.barcode);

  printer.feed(3);
  printer.sleep();
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial1.begin(9600);  // Change to 19200 if your printer test page says so
  pinMode(buttonPin, INPUT_PULLUP);
  setup_wifi();
  printer.begin();
}

void loop() {
  if (!client.connected()) {
    Serial.print("Connecting to TCP server...");
    if (client.connect(server_ip, server_port)) {
      Serial.println("connected");
    } else {
      Serial.println("failed");
      delay(5000);
      return;
    }
  }

  bool buttonState = digitalRead(buttonPin);
  if (buttonState == LOW && lastButtonState == HIGH) {
    Serial.println("Button pressed, requesting ticket info...");
    client.println("request_ticket");
  }
  lastButtonState = buttonState;

  if (client.available()) {
    String payload = readTicketPayload();
    if (payload.length() == 0)
      return;

    Serial.println("Received payload:");
    Serial.println(payload);

    if (payload.indexOf("No frontend connected") >= 0) {
      Serial.println("Server has no frontend connected; skipping print.");
      return;
    }

    TicketData ticket = parseTicketPayload(payload);
    if (!ticket.valid && !DEBUG_FORCE_HARDCODED_TICKET) {
      Serial.println("Unable to parse ticket payload, skipping print.");
      return;
    }

    client.println("printing_ticket");

    if (DEBUG_FORCE_HARDCODED_TICKET) {
      TicketData debugTicket;
      debugTicket.number = "9999";
      debugTicket.counter = "A1";
      debugTicket.barcode = "MATCHFIT-9999";
      debugTicket.time = "12:34";
      debugTicket.bitmapWidth = 0;
      debugTicket.bitmapHeight = 0;
      debugTicket.bitmapBase64 = "";
      debugTicket.valid = true;
      Serial.println("DEBUG: forcing hardcoded ticket for print test.");
      printTicket(debugTicket);
    } else {
      printTicket(ticket);
    }
  }
}