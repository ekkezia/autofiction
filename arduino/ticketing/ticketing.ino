// Printer MOTOULAX EM5822H
#include <WiFiNINA.h>
#include "arduino_secrets.h"
#include "Adafruit_Thermal.h"

const char *ssid = SECRET_SSID;
const char *password = SECRET_PASS;
const char *server_ip = SERVER_IP_ADDRESS;
const int server_port = 4000;

WiFiClient client;
Adafruit_Thermal printer(&Serial1);

struct TicketData {
  String number;
  String counter;
  String barcode;
  String time;
  String name;
  bool valid;
};

String readTCPLine() {
  String line = "";
  unsigned long timeout = millis();

  while (millis() - timeout < 2000) {
    while (client.available()) {
      char c = client.read();
      if (c == '\n') return line;
      if (c != '\r') line += c;
      timeout = millis();
    }
  }
  return line;
}

void rawPrinterInit() {
  // Reset printer
  uint8_t initCmd[] = {0x1B, 0x40};   // ESC @ // change printer setting to English
  Serial1.write(initCmd, sizeof(initCmd));
  delay(100);

  // Try selecting code page 0
  uint8_t cpCmd[] = {0x1B, 0x74, 0x00}; // ESC t 0
  Serial1.write(cpCmd, sizeof(cpCmd));
  delay(50);

  // Some printers support FS . to exit Chinese character mode
  uint8_t exitChinese[] = {0x1C, 0x2E}; // FS .
  Serial1.write(exitChinese, sizeof(exitChinese));
  delay(50);
}

void printTicket(const TicketData &ticket) {
  rawPrinterInit();

  printer.wake();
  printer.setDefault();
  delay(50);

  printer.justify('C');
  printer.boldOn();
  printer.setSize('L');
  printer.println(F("SERVICE"));
  printer.boldOff();

  printer.setSize('S');
  printer.println(F("----------------"));
  printer.println(F("THE RECOGNITION OFFICE"));
  printer.println(F("----------------"));
  printer.feed(1);

  printer.justify('L');
  printer.setSize('M');
  printer.println("Ticket No: " + ticket.number);
  printer.println("Customer: " + ticket.name);
  printer.println("Counter  : " + ticket.counter);
  printer.println("Time     : " + ticket.time);
  printer.feed(1);

  printer.justify('C');
  printer.setSize('S');

  if (ticket.barcode.length() > 0) {
    printer.setBarcodeHeight(80);
    printer.printBarcode(ticket.barcode.c_str(), CODE128);
    printer.println(ticket.barcode);
  }

  printer.feed(3);
  printer.sleep();
}

void setup_wifi() {
  Serial.print("Connecting to WiFi");
  while (WiFi.begin(ssid, password) != WL_CONNECTED) {
    Serial.print(".");
    delay(1000);
  }
  Serial.println();
  Serial.print("WiFi connected. IP: ");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  // while (!Serial) {}

  Serial.println("Booting...");

  // Printer UART
  Serial1.begin(115200);
  delay(500);

  rawPrinterInit();

  // Library init
  printer.begin();
  delay(100);

  // Very simple test
  // printer.println(F("BOOT TEST"));
  // printer.feed(2);

  setup_wifi();
}

void loop() {
  if (!client.connected()) {
    Serial.println("Connecting to queue server...");
    if (client.connect(server_ip, server_port)) {
      Serial.println("Connected to Queue Server");
    } else {
      Serial.println("Queue server connect failed");
      delay(5000);
      return;
    }
  }

  if (client.available()) {
    TicketData newTicket;
    newTicket.valid = false;

    newTicket.number = readTCPLine();
    newTicket.counter = readTCPLine();
    newTicket.barcode = readTCPLine();
    newTicket.time = readTCPLine();
    newTicket.name = readTCPLine();
    readTCPLine();

    newTicket.number.trim();
    newTicket.counter.trim();
    newTicket.barcode.trim();
    newTicket.time.trim();

    if (newTicket.number.length() > 0) {
      newTicket.valid = true;
      Serial.print("New Ticket Received: ");
      Serial.println(newTicket.number);

      printTicket(newTicket);
    } else {
      Serial.println("Received empty/invalid ticket");
    }
  }
}