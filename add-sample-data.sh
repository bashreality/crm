#!/bin/bash

echo "📊 Dodawanie przykładowych danych do CRM..."
echo ""

API_URL="http://localhost:8080/api"

# Sprawdź czy backend działa
if ! curl -s "$API_URL/emails" > /dev/null 2>&1; then
    echo "❌ Backend nie jest dostępny na $API_URL"
    echo "Upewnij się, że aplikacja jest uruchomiona: docker-compose up"
    exit 1
fi

echo "✅ Backend jest dostępny"
echo ""

# Dodaj przykładowe emaile
echo "📧 Dodawanie przykładowych emaili..."

curl -s -X POST "$API_URL/emails" \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "Anna Nowak",
    "company": "Apple Inc.",
    "subject": "Re: Propozycja współpracy - zainteresowani!",
    "preview": "Dzień dobry! Dziękujemy za propozycję. Jesteśmy bardzo zainteresowani współpracą...",
    "status": "positive"
  }' > /dev/null && echo "  ✓ Email 1 dodany"

curl -s -X POST "$API_URL/emails" \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "Marek Wiśniewski",
    "company": "Microsoft",
    "subject": "Pytanie o szczegóły oferty",
    "preview": "Witam, otrzymałem Państwa ofertę. Mam kilka pytań technicznych...",
    "status": "neutral"
  }' > /dev/null && echo "  ✓ Email 2 dodany"

curl -s -X POST "$API_URL/emails" \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "Katarzyna Zielińska",
    "company": "Google",
    "subject": "Re: Nie jesteśmy zainteresowani",
    "preview": "Dziękujemy za ofertę, jednak w tej chwili nie poszukujemy...",
    "status": "negative"
  }' > /dev/null && echo "  ✓ Email 3 dodany"

curl -s -X POST "$API_URL/emails" \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "Tomasz Kowalczyk",
    "company": "Amazon",
    "subject": "Chcemy dowiedzieć się więcej!",
    "preview": "Bardzo interesująca propozycja! Możemy umówić się na prezentację?",
    "status": "positive"
  }' > /dev/null && echo "  ✓ Email 4 dodany"

echo ""
echo "👥 Dodawanie przykładowych kontaktów..."

curl -s -X POST "$API_URL/contacts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Anna Kowalska",
    "company": "TechCorp",
    "email": "anna@techcorp.pl",
    "phone": "+48 123 456 789",
    "emailCount": 15,
    "meetingCount": 3,
    "dealCount": 2
  }' > /dev/null && echo "  ✓ Kontakt 1 dodany"

curl -s -X POST "$API_URL/contacts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marek Wiśniewski",
    "company": "InnovateLab",
    "email": "marek@innovatelab.com",
    "phone": "+48 987 654 321",
    "emailCount": 8,
    "meetingCount": 1,
    "dealCount": 1
  }' > /dev/null && echo "  ✓ Kontakt 2 dodany"

curl -s -X POST "$API_URL/contacts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Katarzyna Zielińska",
    "company": "Digital Solutions",
    "email": "k.zielinska@digitalsol.pl",
    "phone": "+48 555 123 456",
    "emailCount": 22,
    "meetingCount": 5,
    "dealCount": 4
  }' > /dev/null && echo "  ✓ Kontakt 3 dodany"

curl -s -X POST "$API_URL/contacts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tomasz Kowalczyk",
    "company": "StartupHub",
    "email": "tomasz@startuphub.io",
    "phone": "+48 111 222 333",
    "emailCount": 12,
    "meetingCount": 2,
    "dealCount": 1
  }' > /dev/null && echo "  ✓ Kontakt 4 dodany"

echo ""
echo "📢 Dodawanie przykładowych kampanii..."

curl -s -X POST "$API_URL/campaigns" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kampania Q4 2025",
    "description": "Kampania marketingowa na czwarty kwartał",
    "status": "active",
    "totalContacts": 200,
    "sentCount": 156
  }' > /dev/null && echo "  ✓ Kampania 1 dodana"

curl -s -X POST "$API_URL/campaigns" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Newsletter Grudzień",
    "description": "Comiesięczny newsletter",
    "status": "draft",
    "totalContacts": 450,
    "sentCount": 0
  }' > /dev/null && echo "  ✓ Kampania 2 dodana"

curl -s -X POST "$API_URL/campaigns" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Black Friday 2025",
    "description": "Specjalna oferta Black Friday",
    "status": "completed",
    "totalContacts": 380,
    "sentCount": 380
  }' > /dev/null && echo "  ✓ Kampania 3 dodana"

echo ""
echo "✅ Wszystkie przykładowe dane zostały dodane!"
echo ""
echo "🌐 Otwórz aplikację: http://localhost:3000"
echo ""
