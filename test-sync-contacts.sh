#!/bin/bash

# Skrypt do testowania synchronizacji kontaktów z emaili

echo "🔄 Testowanie synchronizacji kontaktów..."
echo ""

# Test połączenia z backendem
echo "1. Sprawdzanie połączenia z backendem..."
curl -s http://localhost:8080/api/contacts > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Backend działa"
else
    echo "❌ Backend nie odpowiada. Upewnij się, że aplikacja jest uruchomiona."
    exit 1
fi

echo ""
echo "2. Pobieranie maili z serwera..."
FETCH_RESULT=$(curl -s -X POST http://localhost:8080/api/email-fetch/fetch)
echo "$FETCH_RESULT" | jq '.'

echo ""
echo "3. Synchronizacja kontaktów z emaili..."
SYNC_RESULT=$(curl -s -X POST http://localhost:8080/api/contacts/sync-from-emails)
echo "$SYNC_RESULT" | jq '.'

echo ""
echo "4. Wyświetlanie kontaktów..."
CONTACTS=$(curl -s http://localhost:8080/api/contacts)
CONTACT_COUNT=$(echo "$CONTACTS" | jq 'length')
echo "📊 Liczba kontaktów w bazie: $CONTACT_COUNT"

if [ "$CONTACT_COUNT" -gt 0 ]; then
    echo ""
    echo "Lista kontaktów:"
    echo "$CONTACTS" | jq -r '.[] | "  • \(.name) (\(.email)) - \(.company)"'
fi

echo ""
echo "✅ Test zakończony!"

